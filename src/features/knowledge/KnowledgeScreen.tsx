import React, { useState, useRef } from 'react';
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
  Upload,
  FileText,
  FolderInput,
  Pencil,
  Check,
  AlertCircle,
  Loader2,
  FolderPlus,
} from 'lucide-react';
import type { KnowledgeDoc } from '../../types';
import {
  validateDocumentFile,
  extractDocumentText,
  formatFileSize,
  SUPPORTED_EXTENSIONS,
} from '../../lib/knowledge/documentExtractor';
import { uploadKnowledgeFile, STORAGE_PATH_PREFIX } from '../../lib/firebase/storage';

export const KnowledgeScreen: React.FC = () => {
  const {
    knowledgeDocs,
    addKnowledgeDoc,
    updateKnowledgeDoc,
    deleteKnowledgeDoc,
    currentUser,
    setActiveTab,
    sendMessage,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCollection, setSelectedCollection] = useState<string>('all');
  const [selectedDoc, setSelectedDoc] = useState<KnowledgeDoc | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // État d'édition dans la modale de consultation (Renommer / Déplacer)
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [isMoving, setIsMoving] = useState(false);
  const [moveCategoryValue, setMoveCategoryValue] = useState('');

  // Champs du formulaire d'importation
  const existingCategories = Array.from(
    new Set(knowledgeDocs.map((d) => d.collection).filter(Boolean))
  );
  const [selectedCategoryOption, setSelectedCategoryOption] = useState<string>(
    existingCategories[0] || 'Général'
  );
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState('');

  const [customTitle, setCustomTitle] = useState('');
  const [keepOriginalFileName, setKeepOriginalFileName] = useState(false);
  const [personalRef, setPersonalRef] = useState('');
  const [newSummary, setNewSummary] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newTags, setNewTags] = useState('');

  // État d'importation de fichier
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachedMeta, setAttachedMeta] = useState<{
    formatLabel: string;
    docType: KnowledgeDoc['type'];
    pageCount?: number;
    charCount: number;
    truncated: boolean;
  } | null>(null);
  const [importStatus, setImportStatus] = useState<
    'idle' | 'extracting' | 'ready' | 'saving' | 'error'
  >('idle');
  const [importError, setImportError] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const collections = ['all', ...existingCategories];

  const filteredDocs = knowledgeDocs.filter((doc) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      doc.title.toLowerCase().includes(q) ||
      doc.summary.toLowerCase().includes(q) ||
      doc.collection.toLowerCase().includes(q) ||
      doc.tags.some((t) => t.toLowerCase().includes(q));
    const matchesCollection =
      selectedCollection === 'all' || doc.collection === selectedCollection;
    return matchesSearch && matchesCollection;
  });

  // Regroupement par catégorie pour l'affichage structuré
  const groupedDocs = filteredDocs.reduce<Record<string, KnowledgeDoc[]>>((acc, doc) => {
    const cat = doc.collection || 'Général';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(doc);
    return acc;
  }, {});

  const resetModal = () => {
    setAttachedFile(null);
    setAttachedMeta(null);
    setCustomTitle('');
    setKeepOriginalFileName(false);
    setPersonalRef('');
    setNewSummary('');
    setNewContent('');
    setNewTags('');
    setIsCreatingCategory(false);
    setCustomCategoryName('');
    setSelectedCategoryOption(existingCategories[0] || 'Général');
    setImportStatus('idle');
    setImportError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileSelected = async (file: File) => {
    setImportError(null);
    const validation = validateDocumentFile(file);
    if (!validation.valid || !validation.formatLabel || !validation.docType) {
      setAttachedFile(null);
      setAttachedMeta(null);
      setImportStatus('error');
      setImportError(validation.error || 'Fichier invalide.');
      return;
    }

    setAttachedFile(file);
    if (keepOriginalFileName || !customTitle.trim()) {
      setCustomTitle(
        keepOriginalFileName ? file.name : file.name.replace(/\.[^.]+$/, '')
      );
    }
    setImportStatus('extracting');

    const extraction = await extractDocumentText(file);
    if (!extraction.success) {
      setAttachedMeta(null);
      setNewContent('');
      setImportStatus('error');
      setImportError(extraction.error || "Impossible d'extraire le texte.");
      return;
    }

    setNewContent(extraction.text);
    setAttachedMeta({
      formatLabel: validation.formatLabel,
      docType: validation.docType,
      pageCount: extraction.pageCount,
      charCount: extraction.charCount,
      truncated: extraction.truncated,
    });
    setImportStatus('ready');
  };

  const handleRemoveFile = () => {
    setAttachedFile(null);
    setAttachedMeta(null);
    setNewContent('');
    setImportStatus('idle');
    setImportError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportError(null);

    const targetCategory = isCreatingCategory
      ? customCategoryName.trim()
      : selectedCategoryOption.trim();

    if (!targetCategory) {
      setImportStatus('error');
      setImportError('La catégorie est obligatoire.');
      return;
    }

    const finalTitle =
      keepOriginalFileName && attachedFile
        ? attachedFile.name
        : customTitle.trim();

    if (!finalTitle) {
      setImportStatus('error');
      setImportError('Le nom du document est obligatoire.');
      return;
    }

    if (!newContent.trim()) {
      setImportStatus('error');
      setImportError(
        'Aucun contenu textuel disponible. Importez un fichier lisible ou saisissez du texte.'
      );
      return;
    }

    setImportStatus('saving');

    const refPrefix = personalRef.trim() ? `[Réf: ${personalRef.trim()}] ` : '';
    const rawSummary =
      newSummary.trim() || newContent.trim().slice(0, 160).replace(/\s+/g, ' ') + '...';
    const finalSummary = `${refPrefix}${rawSummary}`.slice(0, 4800);

    const insights: string[] = [];
    if (personalRef.trim()) insights.push(`Référence personnelle : ${personalRef.trim()}`);
    if (attachedFile && attachedMeta) {
      insights.push(
        `Fichier source : ${attachedFile.name} (${attachedMeta.formatLabel}, ${formatFileSize(attachedFile.size)})`
      );
      if (attachedMeta.pageCount) {
        insights.push(`Pages extraites : ${attachedMeta.pageCount}`);
      }
      insights.push(`Texte indexé : ${attachedMeta.charCount.toLocaleString('fr-FR')} caractères`);
    } else {
      insights.push(`Note ajoutée dans la catégorie ${targetCategory}.`);
    }

    const tagsList = Array.from(
      new Set([
        ...newTags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        ...(attachedMeta ? [attachedMeta.formatLabel.toLowerCase()] : []),
        ...(personalRef.trim() ? [personalRef.trim()] : []),
      ])
    ).slice(0, 30);

    const createdDoc = addKnowledgeDoc({
      title: finalTitle.slice(0, 300),
      collection: targetCategory.slice(0, 100),
      type: attachedMeta?.docType || 'notes',
      summary: finalSummary,
      keyInsights: insights.slice(0, 50),
      content: newContent.trim(),
      tags: tagsList,
    });

    // Tentative réelle d'upload vers Firebase Storage si connecté et fichier présent
    if (attachedFile && currentUser) {
      const storageRes = await uploadKnowledgeFile(currentUser.uid, createdDoc.id, attachedFile);
      const nextInsights = [
        ...insights,
        ...(storageRes.storagePath ? [`${STORAGE_PATH_PREFIX}${storageRes.storagePath}`] : []),
        `Stockage : ${storageRes.message}`,
      ].slice(0, 50);
      updateKnowledgeDoc(createdDoc.id, {
        keyInsights: nextInsights,
      });
      setStatusNotice(storageRes.message);
    } else if (attachedFile) {
      setStatusNotice(
        'Document enregistré localement (connectez-vous pour synchroniser vers Firestore/Storage).'
      );
    } else {
      setStatusNotice(`Document "${finalTitle}" enregistré dans ${targetCategory}.`);
    }

    resetModal();
    setShowAddModal(false);
  };

  const handleOpenDoc = (doc: KnowledgeDoc) => {
    setSelectedDoc(doc);
    setIsRenaming(false);
    setIsMoving(false);
    setRenameValue(doc.title);
    setMoveCategoryValue(doc.collection);
  };

  const handleSaveRename = () => {
    if (!selectedDoc || !renameValue.trim()) return;
    const nextTitle = renameValue.trim().slice(0, 300);
    updateKnowledgeDoc(selectedDoc.id, { title: nextTitle });
    setSelectedDoc({ ...selectedDoc, title: nextTitle });
    setIsRenaming(false);
  };

  const handleSaveMove = () => {
    if (!selectedDoc || !moveCategoryValue.trim()) return;
    const nextCat = moveCategoryValue.trim().slice(0, 100);
    updateKnowledgeDoc(selectedDoc.id, { collection: nextCat });
    setSelectedDoc({ ...selectedDoc, collection: nextCat });
    setIsMoving(false);
  };

  const handleAskAboutDoc = async (doc: KnowledgeDoc) => {
    setSelectedDoc(null);
    setActiveTab('ai');
    await sendMessage(
      `Peux-tu analyser et synthétiser les concepts clés du document "${doc.title}" (ID: ${doc.id}) ?\n\nContenu :\n${doc.content.slice(0, 6000)}`
    );
  };

  const handleGenerateQuiz = async (doc: KnowledgeDoc) => {
    setSelectedDoc(null);
    setActiveTab('ai');
    await sendMessage(
      `Génère un quiz interactif de 3 questions avec explications à partir du document "${doc.title}" :\n\n${doc.content.slice(0, 6000)}`
    );
  };

  return (
    <div className="bento-viewport">
      {/* En-tête de la Bibliothèque */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <div className="bento-tag mb-2">
            <BookOpen size={13} className="text-[var(--color-accent)]" />
            <span>Bibliothèque Documentaire</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text-main)] tracking-tight">
            Savoir & Ressources
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-1 max-w-xl">
            Importez vos fichiers PDF, DOCX ou notes texte : leur contenu est extrait et exploitable par ELORA.
          </p>
        </div>

        <button
          className="bento-btn-primary self-start md:self-auto"
          onClick={() => {
            resetModal();
            setShowAddModal(true);
          }}
        >
          <Plus size={15} />
          <span>Ajouter un document</span>
        </button>
      </div>

      {statusNotice && (
        <div className="mb-4 p-3 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border-strong)] flex items-center justify-between gap-3 text-xs text-[var(--color-text-main)]">
          <span>{statusNotice}</span>
          <button
            onClick={() => setStatusNotice(null)}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"
            aria-label="Fermer la notification"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Barre de Recherche et Sélecteurs de Catégorie */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
        <div className="relative w-full sm:w-96 shrink-0">
          <Search size={15} className="absolute left-3.5 top-3 text-[var(--color-text-muted)]" />
          <input
            type="text"
            placeholder="Rechercher un document, une référence, un tag..."
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
              {col === 'all' ? 'Toutes les catégories' : col}
            </button>
          ))}
        </div>
      </div>

      {/* Documents classés par catégorie */}
      {filteredDocs.length === 0 ? (
        <div className="p-10 text-center rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] my-6">
          <BookOpen size={36} className="mx-auto text-[var(--color-text-muted)] opacity-40 mb-3" />
          <h3 className="text-sm font-bold text-[var(--color-text-main)]">Aucun document trouvé</h3>
          <p className="text-xs text-[var(--color-text-muted)] mt-1 max-w-sm mx-auto">
            Ajoutez un PDF, DOCX ou fichier texte pour enrichir votre bibliothèque documentaire.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedDocs).map(([category, docs]) => (
            <section key={category}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-accent)] flex items-center gap-2">
                  <span>{category}</span>
                  <span className="px-2 py-0.5 rounded-full bg-[var(--color-bg-surface-elevated)] text-[var(--color-text-muted)] text-[10px]">
                    {docs.length}
                  </span>
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {docs.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-5 rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] hover:border-[var(--color-border-strong)] transition-all flex flex-col justify-between group cursor-pointer"
                    onClick={() => handleOpenDoc(doc)}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[var(--color-bg-surface-elevated)] text-[var(--color-accent)]">
                          {doc.type.toUpperCase()}
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
                      </div>

                      <span className="text-xs font-semibold text-[var(--color-accent)] group-hover:translate-x-1 transition-transform flex items-center gap-1 shrink-0 ml-2">
                        <span>Consulter</span>
                        <ArrowRight size={13} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Modale de consultation / renommage / déplacement / suppression */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-2xl max-h-[92vh] rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-strong)] shadow-2xl p-4 sm:p-6 md:p-8 flex flex-col overflow-hidden">
            <button
              onClick={() => setSelectedDoc(null)}
              className="absolute top-4 right-4 p-2 rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] bg-[var(--color-bg-surface-elevated)] transition-colors"
              aria-label="Fermer"
            >
              <X size={16} />
            </button>

            <div className="mb-4 pr-10 space-y-2">
              {/* Catégorie / Déplacement */}
              {isMoving ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="text"
                    value={moveCategoryValue}
                    onChange={(e) => setMoveCategoryValue(e.target.value)}
                    placeholder="Nouvelle catégorie"
                    className="px-2.5 py-1 rounded-lg bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-strong)] text-xs text-[var(--color-text-main)]"
                  />
                  <button
                    onClick={handleSaveMove}
                    className="px-2.5 py-1 rounded-lg bg-[var(--color-accent)] text-white text-xs font-semibold flex items-center gap-1"
                  >
                    <Check size={12} /> Déplacer
                  </button>
                  <button
                    onClick={() => setIsMoving(false)}
                    className="px-2 py-1 text-xs text-[var(--color-text-muted)]"
                  >
                    Annuler
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[var(--color-accent-bg)] text-[var(--color-accent)] border border-[var(--color-accent)]/20">
                    {selectedDoc.collection}
                  </span>
                  <button
                    onClick={() => {
                      setMoveCategoryValue(selectedDoc.collection);
                      setIsMoving(true);
                    }}
                    className="text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] flex items-center gap-1"
                    title="Déplacer vers une autre catégorie"
                  >
                    <FolderInput size={12} /> Déplacer
                  </button>
                </div>
              )}

              {/* Titre / Renommage */}
              {isRenaming ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-strong)] text-sm font-bold text-[var(--color-text-main)]"
                  />
                  <button
                    onClick={handleSaveRename}
                    className="px-3 py-1.5 rounded-lg bg-[var(--color-accent)] text-white text-xs font-semibold flex items-center gap-1"
                  >
                    <Check size={13} /> Valider
                  </button>
                  <button
                    onClick={() => setIsRenaming(false)}
                    className="px-2 py-1.5 text-xs text-[var(--color-text-muted)]"
                  >
                    Annuler
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-bold text-[var(--color-text-main)] leading-snug">
                    {selectedDoc.title}
                  </h2>
                  <button
                    onClick={() => {
                      setRenameValue(selectedDoc.title);
                      setIsRenaming(true);
                    }}
                    className="p-1 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"
                    title="Renommer le document"
                  >
                    <Pencil size={14} />
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 my-3 pr-1 sm:pr-2 text-xs sm:text-sm text-[var(--color-text-main)] leading-relaxed">
              <div className="p-3.5 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)]">
                <h4 className="text-[11px] font-semibold text-[var(--color-accent)] uppercase tracking-wider mb-1">
                  Synthèse & Référence
                </h4>
                <p className="text-xs text-[var(--color-text-muted)]">{selectedDoc.summary}</p>
              </div>

              <div>
                <h4 className="text-[11px] font-semibold text-[var(--color-text-main)] uppercase tracking-wider mb-1.5">
                  Métadonnées & Points Clés
                </h4>
                <ul className="list-disc pl-5 space-y-1 text-xs text-[var(--color-text-muted)]">
                  {selectedDoc.keyInsights.map((insight, idx) => (
                    <li key={idx}>{insight}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-[11px] font-semibold text-[var(--color-text-main)] uppercase tracking-wider mb-1.5">
                  Contenu extrait
                </h4>
                <div className="p-3.5 rounded-xl bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] whitespace-pre-wrap font-sans text-xs">
                  {selectedDoc.content}
                </div>
              </div>
            </div>

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

      {/* Modale d'importation de document */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-strong)] shadow-2xl p-5 sm:p-7">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors"
              aria-label="Fermer"
            >
              <X size={16} />
            </button>

            <h3 className="text-lg font-bold text-[var(--color-text-main)] mb-1">
              Ajouter un document
            </h3>
            <p className="text-xs text-[var(--color-text-muted)] mb-4">
              Importez un fichier ({SUPPORTED_EXTENSIONS.join(', ')}) ou saisissez une note structurée.
            </p>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              {/* C. Zone d'importation (Glisser-déposer + Parcourir) */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.txt,.md,.csv,.json"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileSelected(f);
                  }}
                />

                {!attachedFile ? (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      const f = e.dataTransfer.files?.[0];
                      if (f) handleFileSelected(f);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-5 rounded-xl border-2 border-dashed cursor-pointer text-center transition-colors ${
                      isDragging
                        ? 'border-[var(--color-accent)] bg-[var(--color-accent-bg)]'
                        : 'border-[var(--color-border-subtle)] bg-[var(--color-bg-surface-elevated)] hover:border-[var(--color-border-strong)]'
                    }`}
                  >
                    <Upload size={22} className="mx-auto text-[var(--color-accent)] mb-2" />
                    <p className="text-xs font-semibold text-[var(--color-text-main)]">
                      Glissez-déposez un fichier ici ou cliquez pour parcourir
                    </p>
                    <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
                      Formats supportés : PDF, DOCX, TXT, MD, CSV, JSON (max 15 Mo)
                    </p>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-strong)] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText size={20} className="text-[var(--color-accent)] shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[var(--color-text-main)] truncate">
                          {attachedFile.name}
                        </p>
                        <p className="text-[11px] text-[var(--color-text-muted)]">
                          {attachedMeta?.formatLabel || 'Fichier'} · {formatFileSize(attachedFile.size)}
                          {attachedMeta?.pageCount ? ` · ${attachedMeta.pageCount} page(s)` : ''}
                          {attachedMeta ? ` · ${attachedMeta.charCount.toLocaleString('fr-FR')} caractères extraits` : ''}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold text-red-500 hover:bg-red-500/10 shrink-0"
                    >
                      Retirer
                    </button>
                  </div>
                )}

                {importStatus === 'extracting' && (
                  <p className="text-xs text-[var(--color-accent)] mt-2 flex items-center gap-1.5">
                    <Loader2 size={13} className="animate-spin" />
                    Extraction réelle du texte en cours...
                  </p>
                )}

                {importStatus === 'error' && importError && (
                  <div className="mt-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <span>{importError}</span>
                  </div>
                )}
              </div>

              {/* A. Classement : Catégorie obligatoire */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-[var(--color-text-main)]">
                    Catégorie *
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCreatingCategory((v) => !v)}
                    className="text-[11px] font-semibold text-[var(--color-accent)] flex items-center gap-1"
                  >
                    <FolderPlus size={12} />
                    {isCreatingCategory ? 'Choisir existante' : 'Nouvelle catégorie'}
                  </button>
                </div>
                {isCreatingCategory ? (
                  <input
                    type="text"
                    required
                    placeholder="ex: Cours IA Hybride"
                    value={customCategoryName}
                    onChange={(e) => setCustomCategoryName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-main)]"
                  />
                ) : (
                  <select
                    value={selectedCategoryOption}
                    onChange={(e) => setSelectedCategoryOption(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-main)]"
                  >
                    {(existingCategories.length > 0 ? existingCategories : ['Général']).map(
                      (cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      )
                    )}
                  </select>
                )}
              </div>

              {/* B. Informations du document */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-[var(--color-text-main)]">
                    Nom du document *
                  </label>
                  {attachedFile && (
                    <label className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-muted)] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={keepOriginalFileName}
                        onChange={(e) => {
                          setKeepOriginalFileName(e.target.checked);
                          if (e.target.checked && attachedFile) {
                            setCustomTitle(attachedFile.name);
                          }
                        }}
                      />
                      <span>Conserver le nom original</span>
                    </label>
                  )}
                </div>
                <input
                  type="text"
                  required
                  disabled={keepOriginalFileName && Boolean(attachedFile)}
                  placeholder="ex. Cours d'algorithmique — Chapitre 3"
                  value={
                    keepOriginalFileName && attachedFile ? attachedFile.name : customTitle
                  }
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-main)] disabled:opacity-60"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-main)] mb-1">
                    Référence personnelle (optionnel)
                  </label>
                  <input
                    type="text"
                    placeholder="ex: REF-COURS-01"
                    value={personalRef}
                    onChange={(e) => setPersonalRef(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-main)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-main)] mb-1">
                    Tags (séparés par virgule)
                  </label>
                  <input
                    type="text"
                    placeholder="Firebase, AI"
                    value={newTags}
                    onChange={(e) => setNewTags(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-main)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-main)] mb-1">
                  Résumé court (optionnel)
                </label>
                <input
                  type="text"
                  placeholder="Brève description ou objectif du document..."
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-main)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-main)] mb-1">
                  Contenu textuel (extrait automatiquement ou saisi) *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Le texte extrait du fichier apparaîtra ici, ou saisissez vos notes..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-main)] resize-y"
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
                  disabled={importStatus === 'extracting' || importStatus === 'saving'}
                  className="bento-btn-primary py-2 px-4 text-xs disabled:opacity-50"
                >
                  {importStatus === 'saving' ? 'Enregistrement...' : 'Enregistrer le document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
