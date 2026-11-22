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
          <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--color-text-main)] tracking-tight">
            Savoir & Ressources
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Vos documents, synthèses et fiches connectés à votre mémoire personnelle.
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
      <div className="flex flex-col sm:flex-row items-center gap-3 mb-6">
        <div className="relative w-full sm:w-80">
          <Search size={15} className="absolute left-3.5 top-3 text-[var(--color-text-muted)]" />
          <input
            type="text"
            placeholder="Rechercher une note, un sujet, un tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] shadow-sm"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full pb-1 sm:pb-0">
          {collections.map((col) => (
            <button
              key={col}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCollection === col
                  ? 'bg-[var(--color-text-main)] text-[var(--color-bg-base)]'
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
        <div className="p-12 text-center rounded-3xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] my-6">
          <BookOpen size={36} className="mx-auto text-[var(--color-text-muted)] opacity-50 mb-3" />
          <h3 className="text-sm font-bold text-[var(--color-text-main)]">Aucun document trouvé</h3>
          <p className="text-xs text-[var(--color-text-muted)] mt-1 max-w-sm mx-auto">
            Essayez d'ajuster votre recherche ou ajoutez un nouveau document pour enrichir votre savoir.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDocs.map((doc, idx) => (
            <div
              key={doc.id}
              className={`p-6 rounded-3xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] hover:border-[var(--color-border-strong)] transition-all duration-300 flex flex-col justify-between shadow-sm cursor-pointer group ${
                idx === 0 ? 'md:col-span-2 lg:col-span-2 bg-gradient-to-br from-[var(--color-bg-surface)] to-[var(--color-bg-base)]' : ''
              }`}
              onClick={() => setSelectedDoc(doc)}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-[var(--color-bg-base)] text-[var(--color-accent)] border border-[var(--color-border-subtle)]">
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
                <div className="flex items-center gap-1.5 overflow-hidden">
                  {doc.tags.slice(0, 2).map((t, tIdx) => (
                    <span key={tIdx} className="text-[10px] text-[var(--color-text-muted)] px-1.5 py-0.5 rounded bg-[var(--color-bg-base)] truncate">
                      #{t}
                    </span>
                  ))}
                </div>

                <span className="text-xs font-semibold text-[var(--color-accent)] group-hover:translate-x-1 transition-transform flex items-center gap-1">
                  <span>Lire</span>
                  <ArrowRight size={13} />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modale d'aperçu du document */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-2xl max-h-[85vh] rounded-3xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] shadow-2xl p-6 md:p-8 flex flex-col overflow-hidden">
            <button
              onClick={() => setSelectedDoc(null)}
              className="absolute top-5 right-5 p-2 rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-base)] transition-colors"
            >
              <X size={18} />
            </button>

            <div className="mb-4 pr-8">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
                {selectedDoc.collection}
              </span>
              <h2 className="text-xl font-bold text-[var(--color-text-main)] mt-2">
                {selectedDoc.title}
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-sm text-[var(--color-text-main)] leading-relaxed">
              <div className="p-4 rounded-2xl bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)]">
                <h4 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
                  Synthèse & Points Clés
                </h4>
                <p className="text-xs text-[var(--color-text-muted)] mb-3">{selectedDoc.summary}</p>
                <ul className="space-y-1.5 text-xs">
                  {selectedDoc.keyInsights.map((ki, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-[var(--color-accent)] font-bold">•</span>
                      <span>{ki}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
                  Contenu Intégral
                </h4>
                <div className="p-4 rounded-2xl bg-[var(--color-bg-base)] text-xs whitespace-pre-wrap font-mono border border-[var(--color-border-subtle)]">
                  {selectedDoc.content}
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-[var(--color-border-subtle)] flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                className="text-xs text-red-500 hover:underline flex items-center gap-1"
                onClick={() => {
                  deleteKnowledgeDoc(selectedDoc.id);
                  setSelectedDoc(null);
                }}
              >
                <Trash2 size={13} />
                <span>Supprimer</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  className="bento-btn-secondary"
                  onClick={() => handleGenerateQuiz(selectedDoc)}
                >
                  <HelpCircle size={14} />
                  <span>Quiz d'apprentissage</span>
                </button>
                <button
                  className="bento-btn-primary"
                  onClick={() => handleAskAboutDoc(selectedDoc)}
                >
                  <Sparkles size={14} />
                  <span>Analyser avec ELORA</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modale d'ajout d'une ressource */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg rounded-3xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] shadow-2xl p-6 md:p-8">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-base)] transition-colors"
            >
              <X size={18} />
            </button>

            <h2 className="text-lg font-bold text-[var(--color-text-main)] mb-1">
              Nouvelle Ressource
            </h2>
            <p className="text-xs text-[var(--color-text-muted)] mb-5">
              Ajoutez un cours, des notes ou un document technique dans votre bibliothèque.
            </p>

            <form onSubmit={handleAddSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-main)] mb-1">
                  Titre du document
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Architecture IA Hybride avec Gemini Nano"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-main)] mb-1">
                    Collection
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ex: Hackathon"
                    value={newCollection}
                    onChange={(e) => setNewCollection(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-main)] mb-1">
                    Tags (séparés par des virgules)
                  </label>
                  <input
                    type="text"
                    placeholder="gemini, nano, web"
                    value={newTags}
                    onChange={(e) => setNewTags(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--color-text-main)] mb-1">
                  Résumé ou objet principal
                </label>
                <input
                  type="text"
                  placeholder="En quelques mots..."
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--color-text-main)] mb-1">
                  Contenu ou notes détaillées
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Collez ici le texte, les points clés ou les extraits de code..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="bento-btn-secondary"
                >
                  Annuler
                </button>
                <button type="submit" className="bento-btn-primary">
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
