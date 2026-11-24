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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <div className="bento-tag mb-2">
            <BookOpen size={13} className="text-[var(--color-accent)]" />
            <span>Bibliothèque Numérique</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text-main)] tracking-tight">
            Savoir & Ressources
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-1 max-w-xl">
            Vos documents, synthèses techniques et fiches connectés à votre mémoire personnelle.
          </p>
        </div>

        <button
          className="bento-btn-primary self-start md:self-auto"
          onClick={() => setShowAddModal(true)}
        >
          <Plus size={15} />
          <span>Ajouter une ressource</span>
        </button>
      </div>

      {/* Barre de Recherche et Sélecteurs de Collection */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
        <div className="relative w-full sm:w-96 shrink-0">
          <Search size={15} className="absolute left-3.5 top-3 text-[var(--color-text-muted)]" />
          <input
            type="text"
            placeholder="Rechercher une note, un sujet, un tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:border-[var(--color-border-strong)]"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full pb-1 sm:pb-0 no-scrollbar">
          {collections.map((col) => (
            <button
              key={col}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCollection === col
                  ? 'bg-[var(--color-text-main)] text-[var(--color-bg-base)] border border-transparent shadow-sm'
                  : 'bg-[var(--color-bg-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] border border-[var(--color-border-subtle)]'
              }`}
              onClick={() => setSelectedCollection(col)}
            >
              {col === 'all' ? 'Toutes les collections' : col}
            </button>
          ))}
        </div>
      </div>

      {/* Grille des Documents */}
      {filteredDocs.length === 0 ? (
        <div className="p-10 text-center rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] my-6">
          <BookOpen size={36} className="mx-auto text-[var(--color-text-muted)] opacity-40 mb-3" />
          <h3 className="text-sm font-bold text-[var(--color-text-main)]">Aucun document trouvé</h3>
          <p className="text-xs text-[var(--color-text-muted)] mt-1 max-w-sm mx-auto">
            Essayez d'ajuster votre recherche ou ajoutez un nouveau document pour enrichir votre savoir.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDocs.map((doc, idx) => {
            const isFeatured = idx === 0;
            return (
              <div
                key={doc.id}
                className={`p-5 rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] hover:border-[var(--color-border-strong)] transition-all flex flex-col justify-between group cursor-pointer ${
                  isFeatured ? 'md:col-span-2 lg:col-span-2 border-l-4 border-l-[var(--color-accent)]' : ''
                }`}
                onClick={() => setSelectedDoc(doc)}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[var(--color-bg-surface-elevated)] text-[var(--color-accent)]">
                      {doc.collection}
                    </span>
                    <span className="text-[11px] text-[var(--color-text-muted)] flex items-center gap-1">
                      <Clock size={11} />
                      <span>{doc.addedAt}</span>
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-[var(--color-text-main)] group-hover:text-[var(--color-accent)] transition-colors line-clamp-2">
                    {doc.title}
                  </h3>

                  <p className="text-xs text-[var(--color-text-muted)] mt-2 line-clamp-3 leading-relaxed">
                    {doc.summary}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-[var(--color-border-subtle)] flex items-center justify-between">
                  <div className="flex items-center gap-1.5 overflow-hidden flex-wrap">
                    {doc.tags.slice(0, 2).map((t, tIdx) => (
                      <span
                        key={tIdx}
                        className="text-[10px] text-[var(--color-text-muted)] px-2 py-0.5 rounded-md bg-[var(--color-bg-surface-elevated)]"
                      >
                        #{t}
                      </span>
                    ))}
                    {doc.tags.length > 2 && (
                      <span className="text-[10px] text-[var(--color-text-muted)] px-1.5 py-0.5">
                        +{doc.tags.length - 2}
                      </span>
                    )}
                  </div>

                  <span className="text-xs font-semibold text-[var(--color-accent)] group-hover:translate-x-1 transition-transform flex items-center gap-1 shrink-0 ml-2">
                    <span>Consulter</span>
                    <ArrowRight size={13} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modale d'aperçu du document */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-2xl max-h-[92vh] rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-strong)] shadow-2xl p-4 sm:p-6 md:p-8 flex flex-col overflow-hidden">
            <button
              onClick={() => setSelectedDoc(null)}
              className="absolute top-4 right-4 p-2 rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] bg-[var(--color-bg-surface-elevated)] transition-colors"
            >
              <X size={16} />
            </button>

            <div className="mb-4 pr-10">
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[var(--color-accent-bg)] text-[var(--color-accent)] border border-[var(--color-accent)]/20 inline-block mb-2">
                {selectedDoc.collection}
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-[var(--color-text-main)] leading-snug">
                {selectedDoc.title}
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 my-3 pr-1 sm:pr-2 text-xs sm:text-sm text-[var(--color-text-main)] leading-relaxed">
              <div className="p-3.5 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)]">
                <h4 className="text-[11px] font-semibold text-[var(--color-accent)] uppercase tracking-wider mb-1">Synthèse</h4>
                <p className="text-xs text-[var(--color-text-muted)]">{selectedDoc.summary}</p>
              </div>

              <div>
                <h4 className="text-[11px] font-semibold text-[var(--color-text-main)] uppercase tracking-wider mb-1.5">Points Clés</h4>
                <ul className="list-disc pl-5 space-y-1 text-xs text-[var(--color-text-muted)]">
                  {selectedDoc.keyInsights.map((insight, idx) => (
                    <li key={idx}>{insight}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-[11px] font-semibold text-[var(--color-text-main)] uppercase tracking-wider mb-1.5">Contenu</h4>
                <div className="p-3.5 rounded-xl bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] whitespace-pre-wrap font-sans text-xs">
                  {selectedDoc.content}
                </div>
              </div>
            </div>

            {/* Actions IA sur le document */}
            <div className="pt-3 border-t border-[var(--color-border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                <button
                  className="bento-btn-primary py-2 px-3.5 text-xs w-full sm:w-auto justify-center"
                  onClick={() => handleAskAboutDoc(selectedDoc)}
                >
                  <Sparkles size={13} />
                  <span>Analyser avec ELORA</span>
                </button>
                <button
                  className="px-3.5 py-2 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-xs font-semibold text-[var(--color-text-main)] hover:border-[var(--color-border-strong)] flex items-center justify-center gap-1.5 transition-all w-full sm:w-auto"
                  onClick={() => handleGenerateQuiz(selectedDoc)}
                >
                  <HelpCircle size={13} className="text-[var(--color-accent)]" />
                  <span>Générer un quiz</span>
                </button>
              </div>

              <button
                className="p-2 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors self-end sm:self-auto"
                onClick={() => {
                  deleteKnowledgeDoc(selectedDoc.id);
                  setSelectedDoc(null);
                }}
                title="Supprimer ce document"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale d'ajout de ressource */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-strong)] shadow-2xl p-5 sm:p-7">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors"
            >
              <X size={16} />
            </button>

            <h3 className="text-lg font-bold text-[var(--color-text-main)] mb-1">
              Ajouter une ressource
            </h3>
            <p className="text-xs text-[var(--color-text-muted)] mb-4">
              Enrichissez la mémoire documentaire d'ELORA avec vos fiches et notes.
            </p>

            <form onSubmit={handleAddSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-main)] mb-1">Titre</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Guide Firebase AI Logic"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-border-strong)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-main)] mb-1">Collection</label>
                  <input
                    type="text"
                    placeholder="ex: Hackathon"
                    value={newCollection}
                    onChange={(e) => setNewCollection(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-border-strong)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-main)] mb-1">Tags (virgules)</label>
                  <input
                    type="text"
                    placeholder="Firebase, AI"
                    value={newTags}
                    onChange={(e) => setNewTags(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-border-strong)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-main)] mb-1">Résumé court</label>
                <input
                  type="text"
                  placeholder="Brève description..."
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-border-strong)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-main)] mb-1">Contenu complet</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Notes, extrait d'article, code ou documentation..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-border-strong)] resize-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="bento-btn-primary py-2 px-4 text-xs"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
