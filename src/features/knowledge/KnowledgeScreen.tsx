import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  BookOpen,
  Search,
  Plus,
  ArrowRight,
  Bot,
  Trash2,
  CheckCircle2,
  X,
  Sparkles,
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
  const [newCollection, setNewCollection] = useState('Personnel');
  const [newType, setNewType] = useState<'pdf' | 'notes' | 'course' | 'research'>('notes');
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
      type: newType,
      summary: newSummary.trim() || newContent.substring(0, 120) + '...',
      keyInsights: [
        'Document importé par l\'utilisateur.',
        `Enregistré dans la collection ${newCollection}.`,
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
    setActiveTab('ai');
    await sendMessage(`Peux-tu m'expliquer et synthétiser les concepts clés de ce document enregistré : "${doc.title}" ?\n\nContenu :\n${doc.content}`);
  };

  const handleGenerateQuiz = async (doc: KnowledgeDoc) => {
    setActiveTab('ai');
    await sendMessage(`Génère un quiz interactif de 3 questions avec explications à partir du document suivant : "${doc.title}" :\n\n${doc.content}`);
  };

  return (
    <div className="page-container knowledge-page">
      {/* En-tête de l'espace Knowledge */}
      <div className="section-header-row">
        <div>
          <h1 className="page-main-title">Connaissances & Bibliothèque</h1>
          <p className="page-main-desc">
            Centralisez vos cours, notes de recherche et fiches techniques. ELORA les relie à vos projets et objectifs.
          </p>
        </div>

        <button className="btn-primary-action" onClick={() => setShowAddModal(true)}>
          <Plus size={16} />
          <span>Ajouter une ressource</span>
        </button>
      </div>

      {/* Barre de recherche et filtres de collection */}
      <div className="knowledge-filter-bar">
        <div className="search-input-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-field"
            placeholder="Rechercher un document, concept ou mot-clé..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="collections-pill-list">
          {collections.map((col) => (
            <button
              key={col}
              className={`collection-pill ${selectedCollection === col ? 'active' : ''}`}
              onClick={() => setSelectedCollection(col)}
            >
              {col === 'all' ? 'Toutes les collections' : col}
            </button>
          ))}
        </div>
      </div>

      {/* Grille des documents */}
      <div className="knowledge-cards-grid">
        {filteredDocs.length === 0 ? (
          <div className="empty-state-card col-span-full">
            <BookOpen size={40} className="icon-gold mb-3" />
            <h3>Aucun document correspondant</h3>
            <p>Essayez un autre mot-clé ou ajoutez votre premier document de travail.</p>
          </div>
        ) : (
          filteredDocs.map((doc) => (
            <div key={doc.id} className="doc-card" onClick={() => setSelectedDoc(doc)}>
              <div className="doc-card-top">
                <span className="doc-type-badge">{doc.type.toUpperCase()}</span>
                <span className="doc-collection-tag">{doc.collection}</span>
              </div>

              <h3 className="doc-title">{doc.title}</h3>
              <p className="doc-summary">{doc.summary}</p>

              <div className="doc-tags-list">
                {doc.tags.map((tag) => (
                  <span key={tag} className="doc-tag-pill">
                    #{tag}
                  </span>
                ))}
              </div>

              <div className="doc-card-footer">
                <span className="doc-date">Ajouté le {doc.addedAt}</span>
                <button
                  className="btn-read-doc"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedDoc(doc);
                  }}
                >
                  Consulter <ArrowRight size={13} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modale de prévisualisation & exploitation par l'IA */}
      {selectedDoc && (
        <div className="modal-backdrop" onClick={() => setSelectedDoc(null)}>
          <div className="modal-dialog doc-preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="doc-type-badge">{selectedDoc.type.toUpperCase()}</span>
                <h2 className="modal-title mt-1">{selectedDoc.title}</h2>
                <span className="text-muted text-sm">Collection : {selectedDoc.collection} • {selectedDoc.addedAt}</span>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedDoc(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="doc-preview-body">
              <div className="preview-section">
                <h4 className="preview-subtitle">Points Clés Mémorisés</h4>
                <ul className="preview-insights-list">
                  {selectedDoc.keyInsights.map((insight, idx) => (
                    <li key={idx}>
                      <CheckCircle2 size={15} color="var(--local-green)" />
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="preview-section">
                <h4 className="preview-subtitle">Contenu de la Ressource</h4>
                <div className="preview-content-box">
                  <p>{selectedDoc.content}</p>
                </div>
              </div>

              <div className="doc-actions-ai-bar">
                <button className="btn-ai-action" onClick={() => handleAskAboutDoc(selectedDoc)}>
                  <Bot size={16} />
                  <span>Expliquer avec ELORA</span>
                </button>
                <button className="btn-ai-action" onClick={() => handleGenerateQuiz(selectedDoc)}>
                  <Sparkles size={16} />
                  <span>Générer un quiz de révision</span>
                </button>
                <button
                  className="btn-danger-action"
                  onClick={() => {
                    deleteKnowledgeDoc(selectedDoc.id);
                    setSelectedDoc(null);
                  }}
                  title="Supprimer définitivement"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modale d'ajout d'une ressource */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Ajouter une Ressource</h2>
              <button className="modal-close-btn" onClick={() => setShowAddModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="settings-section">
              <div className="form-group">
                <label className="form-label">Titre du document</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="Ex : Architecture Microservices & On-Device"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>

              <div className="form-row">
                <div className="form-group flex-1">
                  <label className="form-label">Collection</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ex: Architecture, Hackathon, Cours..."
                    value={newCollection}
                    onChange={(e) => setNewCollection(e.target.value)}
                  />
                </div>
                <div className="form-group flex-1">
                  <label className="form-label">Type</label>
                  <select
                    className="form-select"
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                  >
                    <option value="notes">Notes personnelles</option>
                    <option value="pdf">Document PDF</option>
                    <option value="course">Cours / Fiche</option>
                    <option value="research">Article de recherche</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Résumé court (1 à 2 phrases)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Bref aperçu du contenu..."
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Contenu textuel complet</label>
                <textarea
                  className="form-textarea"
                  rows={5}
                  required
                  placeholder="Collez ici le texte, les notes ou le contenu de votre ressource..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tags (séparés par des virgules)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: React, AI, Performance"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                />
              </div>

              <div className="form-actions mt-3">
                <button type="button" className="btn-secondary-sm" onClick={() => setShowAddModal(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn-primary-sm">
                  Enregistrer dans ma bibliothèque
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
