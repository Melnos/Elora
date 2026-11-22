import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  BookOpen,
  Search,
  Plus,
  ArrowRight,
  Sparkles,
  Trash2,
  X,
  Clock,
  HelpCircle,
} from 'lucide-react';
import type { KnowledgeDoc } from '../../types';

export const KnowledgeScreen: React.FC = () => {
  const { knowledgeDocs, addKnowledgeDoc, deleteKnowledgeDoc, setActiveTab, sendMessage } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCollection, setSelectedCollection] = useState<string>('all');
  const [selectedDoc, setSelectedDoc] = useState<KnowledgeDoc | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Nouveaux champs pour ajouter un document
  const [newTitle, setNewTitle] = useState('');
  const [newCollection, setNewCollection] = useState('Intelligence Artificielle');
  const [newSummary, setNewSummary] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newTags, setNewTags] = useState('');

  // Collections uniques
  const collections = ['all', ...Array.from(new Set(knowledgeDocs.map((d) => d.collection)))];

  // Filtrage
  const filteredDocs = knowledgeDocs.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCollection = selectedCollection === 'all' || doc.collection === selectedCollection;
    return matchesSearch && matchesCollection;
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    addKnowledgeDoc({
      title: newTitle.trim(),
      collection: newCollection.trim() || 'Général',
      type: 'notes',
      summary: newSummary.trim() || newContent.substring(0, 140) + '...',
      keyInsights: [
        'Document importé dans la bibliothèque personnelle.',
        `Classé dans la collection ${newCollection}.`,
      ],
      content: newContent.trim(),
      tags: newTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    });

    setNewTitle('');
    setNewSummary('');
    setNewContent('');
    setNewTags('');
    setShowAddModal(false);
  };

  const handleAskAboutDoc = async (doc: KnowledgeDoc) => {
    setSelectedDoc(null);
    setActiveTab('ai');
    await sendMessage(`Peux-tu analyser et synthétiser les concepts clés de ce document enregistré : "${doc.title}" ?\n\nContenu :\n${doc.content}`);
  };

  const handleGenerateQuiz = async (doc: KnowledgeDoc) => {
    setSelectedDoc(null);
    setActiveTab('ai');
    await sendMessage(`Génère un quiz interactif de 3 questions avec explications à partir du document suivant : "${doc.title}" :\n\n${doc.content}`);
  };

  return (
    <div className="bento-viewport">
      {/* En-tête de la Bibliothèque */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <div className="bento-tag mb-2">
            <BookOpen size={13} className="text-[#FF6A00]" />
            <span>Bibliothèque Numérique</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[var(--color-text-main)] tracking-tight">
            Savoir & Ressources
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-1 max-w-xl">
            Vos documents, synthèses techniques et fiches connectés à votre mémoire personnelle.
          </p>
        </div>

        <button
          className="bento-btn-primary self-start md:self-auto shadow-lg"
          onClick={() => setShowAddModal(true)}
        >
          <Plus size={16} />
          <span>Ajouter une ressource</span>
        </button>
      </div>

      {/* Barre de Recherche et Sélecteurs de Collection */}
      <div className="flex flex-col sm:flex-row items-center gap-3.5 mb-8">
        <div className="relative w-full sm:w-96">
          <Search size={16} className="absolute left-4 top-3.5 text-[var(--color-text-muted)]" />
          <input
            type="text"
            placeholder="Rechercher une note, un sujet, un tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-strong)] text-xs font-medium text-[var(--color-text-main)] focus:outline-none focus:border-[#FF6A00] shadow-sm"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full pb-2 sm:pb-0">
          {collections.map((col) => (
            <button
              key={col}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer shadow-sm ${
                selectedCollection === col
                  ? 'bg-gradient-to-r from-[#FF6A00] to-[#EE5A24] text-white shadow-md'
                  : 'bg-[var(--color-bg-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] border border-[var(--color-border-subtle)]'
              }`}
              onClick={() => setSelectedCollection(col)}
            >
              {col === 'all' ? 'Toutes les collections' : col}
            </button>
          ))}
        </div>
      </div>

      {/* Grille Bento des Documents */}
      {filteredDocs.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] my-6 shadow-sm">
          <BookOpen size={40} className="mx-auto text-[var(--color-text-muted)] opacity-40 mb-3" />
          <h3 className="text-base font-bold text-[var(--color-text-main)]">Aucun document trouvé</h3>
          <p className="text-xs text-[var(--color-text-muted)] mt-1 max-w-sm mx-auto">
            Essayez d'ajuster votre recherche ou ajoutez un nouveau document pour enrichir votre savoir.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocs.map((doc, idx) => {
            const isFeatured = idx === 0;
            return (
              <div
                key={doc.id}
                className={`p-7 rounded-3xl bg-[var(--color-bg-surface)] border transition-all duration-300 flex flex-col justify-between shadow-xl cursor-pointer group hover:shadow-2xl hover:translate-y-[-2px] ${
                  isFeatured
                    ? 'md:col-span-2 lg:col-span-2 bg-gradient-to-br from-[var(--color-bg-surface)] via-[var(--color-bg-surface)] to-orange-500/15 border-2 border-[#FF6A00]/40'
                    : 'border-[var(--color-border-subtle)] hover:border-[#FF6A00]/50'
                }`}
                onClick={() => setSelectedDoc(doc)}
              >
                <div>
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-xl bg-[var(--color-bg-surface-elevated)] text-[#FF6A00] border border-[#FF6A00]/25 shadow-sm">
                      {doc.collection}
                    </span>
                    <span className="text-xs text-[var(--color-text-muted)] flex items-center gap-1.5 font-medium">
                      <Clock size={12} />
                      <span>{doc.addedAt}</span>
                    </span>
                  </div>

                  <h3 className="text-lg sm:text-xl font-bold text-[var(--color-text-main)] group-hover:text-[#FF6A00] transition-colors line-clamp-2 leading-snug">
                    {doc.title}
                  </h3>

                  <p className="text-xs text-[var(--color-text-muted)] mt-2.5 line-clamp-3 leading-relaxed">
                    {doc.summary}
                  </p>
                </div>

                <div className="pt-5 mt-5 border-t border-[var(--color-border-subtle)] flex items-center justify-between">
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    {doc.tags.slice(0, 3).map((t, tIdx) => (
                      <span
                        key={tIdx}
                        className="text-[10px] font-semibold text-[var(--color-text-muted)] px-2.5 py-1 rounded-lg bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] truncate"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>

                  <span className="text-xs font-bold text-[#FF6A00] group-hover:translate-x-1 transition-transform flex items-center gap-1 shrink-0 ml-2">
                    <span>Consulter</span>
                    <ArrowRight size={14} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modale d'aperçu du document */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-2xl max-h-[85vh] rounded-3xl bg-[var(--color-bg-surface)] border border-[var(--color-border-strong)] shadow-2xl p-6 md:p-8 flex flex-col overflow-hidden">
            <button
              onClick={() => setSelectedDoc(null)}
              className="absolute top-5 right-5 p-2.5 rounded-2xl text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="mb-4 pr-10">
              <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-[#FF6A00]/20 text-[#FF6A00] border border-[#FF6A00]/30 inline-block mb-2">
                {selectedDoc.collection}
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-[var(--color-text-main)] leading-snug">
                {selectedDoc.title}
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 my-4 pr-2 text-xs sm:text-sm text-[var(--color-text-main)] leading-relaxed">
              <div className="p-4 rounded-2xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)]">
                <h4 className="text-xs font-bold text-[#FF6A00] uppercase tracking-wider mb-2">Synthèse</h4>
                <p className="text-xs text-[var(--color-text-muted)]">{selectedDoc.summary}</p>
              </div>

              <div>
                <h4 className="text-xs font-bold text-[var(--color-text-main)] uppercase tracking-wider mb-2">Points Clés</h4>
                <ul className="list-disc pl-5 space-y-1 text-xs text-[var(--color-text-muted)]">
                  {selectedDoc.keyInsights.map((insight, idx) => (
                    <li key={idx}>{insight}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-bold text-[var(--color-text-main)] uppercase tracking-wider mb-2">Contenu</h4>
                <div className="p-4 rounded-2xl bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] whitespace-pre-wrap font-sans text-xs">
                  {selectedDoc.content}
                </div>
              </div>
            </div>

            {/* Actions IA sur le document */}
            <div className="pt-4 border-t border-[var(--color-border-subtle)] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6A00] to-[#EE5A24] text-white text-xs font-black flex items-center gap-2 shadow-md cursor-pointer"
                  onClick={() => handleAskAboutDoc(selectedDoc)}
                >
                  <Sparkles size={14} />
                  <span>Analyser avec ELORA</span>
                </button>
                <button
                  className="px-4 py-2.5 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-xs font-bold text-[var(--color-text-main)] hover:border-[#FF6A00] flex items-center gap-2 transition-all cursor-pointer"
                  onClick={() => handleGenerateQuiz(selectedDoc)}
                >
                  <HelpCircle size={14} className="text-[#FF6A00]" />
                  <span>Générer un quiz</span>
                </button>
              </div>

              <button
                className="p-2.5 rounded-xl text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                onClick={() => {
                  deleteKnowledgeDoc(selectedDoc.id);
                  setSelectedDoc(null);
                }}
                title="Supprimer ce document"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale d'ajout de ressource */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-lg rounded-3xl bg-[var(--color-bg-surface)] border border-[var(--color-border-strong)] shadow-2xl p-6 sm:p-8 overflow-hidden">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <h3 className="text-xl font-black text-[var(--color-text-main)] mb-1">
              Ajouter une ressource
            </h3>
            <p className="text-xs text-[var(--color-text-muted)] mb-5">
              Enrichissez la mémoire documentaire d'ELORA avec vos fiches et notes.
            </p>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--color-text-main)] mb-1">Titre</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Guide Firebase AI Logic"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-main)] focus:outline-none focus:border-[#FF6A00]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[var(--color-text-main)] mb-1">Collection</label>
                  <input
                    type="text"
                    placeholder="ex: Hackathon"
                    value={newCollection}
                    onChange={(e) => setNewCollection(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-main)] focus:outline-none focus:border-[#FF6A00]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--color-text-main)] mb-1">Tags (séparés par virgule)</label>
                  <input
                    type="text"
                    placeholder="Firebase, AI, React"
                    value={newTags}
                    onChange={(e) => setNewTags(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-main)] focus:outline-none focus:border-[#FF6A00]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--color-text-main)] mb-1">Résumé court</label>
                <input
                  type="text"
                  placeholder="Brève description de la note..."
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-main)] focus:outline-none focus:border-[#FF6A00]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--color-text-main)] mb-1">Contenu complet</label>
                <textarea
                  required
                  rows={5}
                  placeholder="Collez ici vos notes, extrait d'article, code ou documentation..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-main)] focus:outline-none focus:border-[#FF6A00] resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6A00] to-[#EE5A24] text-white text-xs font-black shadow-md hover:shadow-orange-500/25 transition-all cursor-pointer"
                >
                  Enregistrer la ressource
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
