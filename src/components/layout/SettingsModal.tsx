import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  User,
  Brain,
  Shield,
  Palette,
  Check,
  Trash2,
  Plus,
  Eye,
  EyeOff,
  Download,
  Cloud,
  RefreshCw,
  LogIn,
  LogOut,
  Terminal,
  Pencil,
} from 'lucide-react';
import { CapabilityDetector } from '../../lib/ai/CapabilityDetector';
import { OfflineQueue } from '../../lib/offline/OfflineQueue';
import { useToast } from '../ui/ToastProvider';

export const SettingsModal: React.FC = () => {
  const {
    isSettingsOpen,
    setIsSettingsOpen,
    setIsDiagnosticOpen,
    profile,
    updateProfile,
    memories,
    addMemory,
    updateMemory,
    confirmMemory,
    toggleMemoryAI,
    deleteMemory,
    theme,
    setTheme,
    caps,
    refreshCapabilities,
    currentUser,
    isSyncingCloud,
    triggerCloudSync,
    logout,
    setIsAuthModalOpen,
  } = useApp();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'profile' | 'account' | 'memory' | 'privacy' | 'appearance' | 'dev'>('profile');
  const [confirmLogoutWithPending, setConfirmLogoutWithPending] = useState(false);
  const [newMemoryKey, setNewMemoryKey] = useState('');
  const [newMemoryValue, setNewMemoryValue] = useState('');
  const [newMemoryCategory, setNewMemoryCategory] = useState<'preference' | 'objective' | 'project' | 'habit' | 'knowledge' | 'profile' | 'constraint' | 'context'>('preference');
  const [newMemoryStatus, setNewMemoryStatus] = useState<'active' | 'temporary'>('active');
  const [showAddMemory, setShowAddMemory] = useState(false);
  const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null);
  const [editMemoryKey, setEditMemoryKey] = useState('');
  const [editMemoryValue, setEditMemoryValue] = useState('');
  const [editMemoryCategory, setEditMemoryCategory] = useState<'preference' | 'objective' | 'project' | 'habit' | 'knowledge' | 'profile' | 'constraint' | 'context'>('preference');
  const [editMemoryStatus, setEditMemoryStatus] = useState<'active' | 'temporary'>('active');
  const [memoryError, setMemoryError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadStatusNotice, setDownloadStatusNotice] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const isDeveloperMode =
    typeof window !== 'undefined' &&
    (new URLSearchParams(window.location.search).get('dev') === '1' ||
      localStorage.getItem('elora_dev_mode') === 'true');

  useEffect(() => {
    if (!isSettingsOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSettingsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSettingsOpen, setIsSettingsOpen]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  if (!isSettingsOpen) return null;

  const handleDownloadLocalModel = async () => {
    if (isDownloading) return;
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsDownloading(true);
    setDownloadProgress(0);
    setDownloadError(null);
    setDownloadStatusNotice(null);

    try {
      const report = await CapabilityDetector.downloadLocalModel(
        (percent) => setDownloadProgress(percent),
        controller.signal
      );
      await refreshCapabilities();

      if (report.onDeviceStatus === 'readily') {
        setDownloadStatusNotice('Gemini Nano est téléchargé et prêt pour une inférence locale privée.');
      } else {
        setDownloadError(
          `Téléchargement terminé, mais le statut réel reste '${report.onDeviceStatus}' (${report.onDeviceDetails}).`
        );
      }
    } catch (err: unknown) {
      if (
        (err instanceof DOMException && err.name === 'AbortError') ||
        (err instanceof Error && err.name === 'AbortError')
      ) {
        setDownloadStatusNotice('Téléchargement du modèle local annulé.');
      } else {
        setDownloadError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setIsDownloading(false);
    }
  };

  const handleCancelDownload = () => {
    abortControllerRef.current?.abort();
  };

  const handleAddMemorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemoryKey.trim() || !newMemoryValue.trim()) return;
    setMemoryError(null);
    const saved = addMemory({
      key: newMemoryKey.trim(),
      value: newMemoryValue.trim(),
      category: newMemoryCategory,
      source: 'user_explicit',
      status: newMemoryStatus,
      enabledForAI: true,
      ...(newMemoryStatus === 'temporary'
        ? { expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() }
        : {}),
    });
    if (!saved) {
      setMemoryError("Impossible d'enregistrer ce souvenir dans le stockage local.");
      return;
    }
    setNewMemoryKey('');
    setNewMemoryValue('');
    setNewMemoryStatus('active');
    setShowAddMemory(false);
    showToast('Souvenir enregistré.', 'success');
  };

  const startEditingMemory = (mem: typeof memories[number]) => {
    setEditingMemoryId(mem.id);
    setEditMemoryKey(mem.key);
    setEditMemoryValue(mem.value);
    setEditMemoryCategory((mem.category as any) || 'context');
    setEditMemoryStatus(mem.status === 'temporary' ? 'temporary' : 'active');
    setMemoryError(null);
  };

  const handleSaveMemoryEdit = (e: React.FormEvent, id: string) => {
    e.preventDefault();
    if (!editMemoryKey.trim() || !editMemoryValue.trim()) return;
    const updated = updateMemory(id, {
      key: editMemoryKey.trim(),
      value: editMemoryValue.trim(),
      category: editMemoryCategory,
      status: editMemoryStatus,
    });
    if (!updated) {
      setMemoryError('Impossible de sauvegarder la modification.');
      return;
    }
    setEditingMemoryId(null);
    showToast('Souvenir mis à jour.', 'success');
  };

  return (
    <div className="modal-backdrop" onClick={() => setIsSettingsOpen(false)}>
      <div
        className="modal-dialog settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header de la modale */}
        <div className="modal-header">
          <div className="modal-title-group">
            <h2 id="settings-modal-title" className="modal-title">Paramètres & Contrôle</h2>
            <p className="modal-subtitle">Gérez votre profil, votre mémoire personnelle et vos préférences IA.</p>
          </div>
          <button
            className="modal-close-btn"
            onClick={() => setIsSettingsOpen(false)}
            aria-label="Fermer les paramètres"
          >
            <X size={20} />
          </button>
        </div>

        {/* Onglets de configuration */}
        <div className="settings-tabs">
          <button
            className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <User size={16} />
            <span>Profil</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'account' ? 'active' : ''}`}
            onClick={() => setActiveTab('account')}
          >
            <Cloud size={16} />
            <span>Compte & Sync</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'memory' ? 'active' : ''}`}
            onClick={() => setActiveTab('memory')}
          >
            <Brain size={16} />
            <span>Mémoire ({memories.length})</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'privacy' ? 'active' : ''}`}
            onClick={() => setActiveTab('privacy')}
          >
            <Shield size={16} />
            <span>Confidentialité</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'appearance' ? 'active' : ''}`}
            onClick={() => setActiveTab('appearance')}
          >
            <Palette size={16} />
            <span>Apparence</span>
          </button>
          {isDeveloperMode && (
            <button
              className={`tab-btn ${activeTab === 'dev' ? 'active' : ''}`}
              onClick={() => setActiveTab('dev')}
            >
              <Terminal size={16} />
              <span>Développeur</span>
            </button>
          )}
        </div>

        {/* Corps des onglets */}
        <div className="settings-content">
          {/* ONGLET 1 : PROFIL */}
          {activeTab === 'profile' && (
            <div className="settings-section">
              <h3 className="section-title">Informations Personnelles</h3>
              <div className="form-group">
                <label className="form-label" htmlFor="settings-profile-name">Nom d'affichage</label>
                <input
                  id="settings-profile-name"
                  type="text"
                  className="form-input"
                  value={profile.name}
                  onChange={(e) => updateProfile({ name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="settings-profile-role">Titre / Activité actuelle</label>
                <input
                  id="settings-profile-role"
                  type="text"
                  className="form-input"
                  value={profile.roleTitle}
                  onChange={(e) => updateProfile({ roleTitle: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="settings-profile-objective">Objectif prioritaire communiqué à ELORA</label>
                <textarea
                  id="settings-profile-objective"
                  className="form-textarea"
                  rows={3}
                  placeholder="Ex. Valider mon semestre, préparer mon mémoire ou un concours"
                  value={profile.currentObjective}
                  onChange={(e) => updateProfile({ currentObjective: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="settings-profile-focus">Domaines d'étude (séparés par des virgules)</label>
                <input
                  id="settings-profile-focus"
                  type="text"
                  className="form-input"
                  placeholder="Ex. Mathématiques, Algorithmique, Droit, Biologie"
                  value={(profile.learningFocus || []).join(', ')}
                  onChange={(e) =>
                    updateProfile({
                      learningFocus: e.target.value
                        .split(',')
                        .map((item) => item.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </div>
            </div>
          )}

          {/* ONGLET 2 : COMPTE & SYNCHRONISATION */}
          {activeTab === 'account' && (
            <div className="settings-section">
              <h3 className="section-title">Compte & Synchronisation Cloud</h3>
              <p className="section-desc">
                Gérez votre session Firebase, la file hors ligne et la synchronisation multi-appareils.
              </p>

              <div className="p-4 rounded-2xl bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-[var(--color-text-main)]">
                      {currentUser ? (currentUser.displayName || profile.name) : 'Session locale (Invité)'}
                    </div>
                    <div className="text-xs text-[var(--color-text-muted)]">
                      {currentUser ? currentUser.email : 'Connectez-vous pour sauvegarder vos données dans le Cloud.'}
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[var(--color-accent-bg)] text-[var(--color-accent)] border border-[var(--color-accent)]/20">
                    {currentUser ? (navigator.onLine ? 'Connecté' : 'Hors ligne') : 'Mode Local'}
                  </span>
                </div>

                <div className="text-xs text-[var(--color-text-muted)] flex items-center justify-between pt-2 border-t border-[var(--color-border-subtle)]">
                  <span>Opérations locales en attente de sync :</span>
                  <strong className="text-[var(--color-text-main)]">{OfflineQueue.getPendingCount()}</strong>
                </div>
              </div>

              {currentUser ? (
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <button
                    type="button"
                    disabled={isSyncingCloud || !navigator.onLine}
                    onClick={async () => {
                      await triggerCloudSync();
                      showToast('Synchronisation Cloud terminée.', 'success');
                    }}
                    className="btn-accent-sm justify-center disabled:opacity-50"
                  >
                    <RefreshCw size={14} className={isSyncingCloud ? 'animate-spin' : ''} />
                    <span>{isSyncingCloud ? 'Synchronisation...' : 'Synchroniser maintenant'}</span>
                  </button>

                  {!confirmLogoutWithPending ? (
                    <button
                      type="button"
                      onClick={async () => {
                        if (OfflineQueue.getPendingCount() > 0) {
                          setConfirmLogoutWithPending(true);
                          return;
                        }
                        await logout();
                        setIsSettingsOpen(false);
                        showToast('Vous êtes déconnecté.', 'info');
                      }}
                      className="px-4 py-2 rounded-xl border border-[var(--color-border-strong)] text-xs font-semibold text-[var(--color-danger)] hover:bg-[var(--color-bg-base)] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <LogOut size={14} />
                      <span>Déconnexion</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
                      <span className="text-[var(--color-text-main)]">
                        {OfflineQueue.getPendingCount()} opération(s) non synchronisée(s). Confirmer ?
                      </span>
                      <button
                        type="button"
                        onClick={async () => {
                          setConfirmLogoutWithPending(false);
                          await logout();
                          setIsSettingsOpen(false);
                          showToast('Déconnexion effectuée.', 'info');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[var(--color-danger)] text-white font-semibold cursor-pointer"
                      >
                        Oui
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmLogoutWithPending(false)}
                        className="px-2.5 py-1 rounded-lg border border-[var(--color-border-subtle)] cursor-pointer"
                      >
                        Annuler
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsSettingsOpen(false);
                    setIsAuthModalOpen(true);
                  }}
                  className="btn-accent-sm self-start"
                >
                  <LogIn size={14} />
                  <span>Se connecter / Créer un compte</span>
                </button>
              )}
            </div>
          )}

          {/* ONGLET 3 : MÉMOIRE PERSONNELLE */}
          {activeTab === 'memory' && (
            <div className="settings-section">
              <div className="section-header-flex">
                <div>
                  <h3 className="section-title">Mémoire Active d'ELORA</h3>
                  <p className="section-desc">
                    ELORA mémorise uniquement ce que vous autorisez. Vous pouvez à tout moment désactiver ou supprimer une entrée.
                  </p>
                </div>
                <button
                  className="btn-accent-sm"
                  onClick={() => setShowAddMemory(!showAddMemory)}
                >
                  <Plus size={14} />
                  <span>Ajouter un fait</span>
                </button>
              </div>

              {memoryError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium">
                  {memoryError}
                </div>
              )}

              {showAddMemory && (
                <form className="add-memory-card" onSubmit={handleAddMemorySubmit}>
                  <div className="form-row">
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Intitulé (ex: Format préféré des fiches)"
                      value={newMemoryKey}
                      onChange={(e) => setNewMemoryKey(e.target.value)}
                    />
                    <select
                      className="form-select"
                      value={newMemoryCategory}
                      onChange={(e) => setNewMemoryCategory(e.target.value as any)}
                    >
                      <option value="preference">Préférence</option>
                      <option value="objective">Objectif</option>
                      <option value="project">Projet</option>
                      <option value="habit">Méthode / Habitude</option>
                      <option value="knowledge">Connaissance</option>
                      <option value="profile">Parcours / Profil</option>
                      <option value="constraint">Contrainte</option>
                      <option value="context">Contexte</option>
                    </select>
                  </div>
                  <div className="form-row">
                    <select
                      className="form-select"
                      aria-label="Durabilité du souvenir"
                      value={newMemoryStatus}
                      onChange={(e) => setNewMemoryStatus(e.target.value as 'active' | 'temporary')}
                    >
                      <option value="active">Confirmé (durable)</option>
                      <option value="temporary">Temporaire (7 jours)</option>
                    </select>
                  </div>
                  <textarea
                    className="form-textarea"
                    rows={2}
                    placeholder="Description du fait mémorisé..."
                    value={newMemoryValue}
                    onChange={(e) => setNewMemoryValue(e.target.value)}
                  />
                  <div className="form-actions">
                    <button type="button" className="btn-secondary-sm" onClick={() => setShowAddMemory(false)}>
                      Annuler
                    </button>
                    <button type="submit" className="btn-primary-sm">
                      Enregistrer dans la mémoire
                    </button>
                  </div>
                </form>
              )}

              <div className="memory-list">
                {memories.map((mem) => {
                  const statusLabel =
                    mem.status === 'candidate'
                      ? 'Hypothèse'
                      : mem.status === 'temporary'
                      ? 'Temporaire'
                      : 'Confirmé';
                  const statusClass =
                    mem.status === 'candidate'
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                      : mem.status === 'temporary'
                      ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20'
                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';

                  return (
                  <div key={mem.id} className="memory-item-card">
                    {editingMemoryId === mem.id ? (
                      <form onSubmit={(e) => handleSaveMemoryEdit(e, mem.id)} className="space-y-2.5">
                        <div className="form-row">
                          <input
                            type="text"
                            className="form-input"
                            value={editMemoryKey}
                            onChange={(e) => setEditMemoryKey(e.target.value)}
                            required
                          />
                          <select
                            className="form-select"
                            value={editMemoryCategory}
                            onChange={(e) => setEditMemoryCategory(e.target.value as any)}
                          >
                            <option value="preference">Préférence</option>
                            <option value="objective">Objectif</option>
                            <option value="project">Projet</option>
                            <option value="habit">Méthode / Habitude</option>
                            <option value="knowledge">Connaissance</option>
                            <option value="profile">Parcours / Profil</option>
                            <option value="constraint">Contrainte</option>
                            <option value="context">Contexte</option>
                          </select>
                        </div>
                        <select
                          className="form-select"
                          value={editMemoryStatus}
                          onChange={(e) => setEditMemoryStatus(e.target.value as 'active' | 'temporary')}
                        >
                          <option value="active">Confirmé (durable)</option>
                          <option value="temporary">Temporaire</option>
                        </select>
                        <textarea
                          className="form-textarea"
                          rows={2}
                          value={editMemoryValue}
                          onChange={(e) => setEditMemoryValue(e.target.value)}
                          required
                        />
                        <div className="form-actions">
                          <button
                            type="button"
                            className="btn-secondary-sm"
                            onClick={() => setEditingMemoryId(null)}
                          >
                            Annuler
                          </button>
                          <button type="submit" className="btn-primary-sm">
                            Enregistrer
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="memory-item-header">
                          <div className="memory-badge-group flex-wrap">
                            <span className="memory-cat-badge">{mem.category}</span>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusClass}`}>
                              {statusLabel}
                            </span>
                            <strong className="memory-key">{mem.key}</strong>
                          </div>
                          <div className="memory-item-actions">
                            {mem.status === 'candidate' && (
                              <button
                                type="button"
                                className="px-2 py-1 rounded-lg bg-[var(--color-accent)] text-white text-[11px] font-semibold hover:opacity-90"
                                onClick={() => {
                                  const ok = confirmMemory(mem.id);
                                  if (!ok) {
                                    setMemoryError('Impossible de confirmer ce souvenir.');
                                  } else {
                                    showToast('Souvenir confirmé.', 'success');
                                  }
                                }}
                                title="Confirmer ce souvenir"
                              >
                                Confirmer
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn-icon-toggle"
                              onClick={() => startEditingMemory(mem)}
                              title="Modifier / corriger ce souvenir"
                              aria-label="Modifier / corriger ce souvenir"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              className={`btn-icon-toggle ${mem.enabledForAI ? 'enabled' : 'disabled'}`}
                              onClick={() => toggleMemoryAI(mem.id)}
                              title={mem.enabledForAI ? "Désactiver pour l'IA" : "Activer pour l'IA"}
                              aria-label={mem.enabledForAI ? "Désactiver pour l'IA" : "Activer pour l'IA"}
                            >
                              {mem.enabledForAI ? <Eye size={15} /> : <EyeOff size={15} />}
                            </button>
                            <button
                              type="button"
                              className="btn-icon-delete"
                              onClick={() => deleteMemory(mem.id)}
                              title="Supprimer définitivement ce fait"
                              aria-label="Supprimer définitivement ce fait"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                        <p className="memory-val">{mem.value}</p>
                        <div className="memory-footer">
                          <span className="memory-source">Source : {mem.source}</span>
                          <span className="memory-date">{mem.dateAdded}</span>
                        </div>
                      </>
                    )}
                  </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ONGLET 3 : CONFIDENTIALITÉ */}
          {activeTab === 'privacy' && (
            <div className="settings-section">
              <h3 className="section-title">Politique d'Inférence & Vie Privée</h3>
              <p className="section-desc">
                Chez ELORA, vos données personnelles et vos réflexions restent vôtres.
              </p>

              <div className="privacy-card">
                <div className="privacy-item">
                  <div className="privacy-icon-box">
                    <Shield size={20} />
                  </div>
                  <div>
                    <h4>Règle du Local-First</h4>
                    <p>
                      Lorsque Gemini Nano est actif sur votre machine, les tâches compatibles sont résolues directement sur votre terminal. Aucun texte n'est transmis sur internet.
                    </p>
                  </div>
                </div>

                <div className="privacy-item">
                  <div className="privacy-icon-box">
                    <Check size={20} />
                  </div>
                  <div>
                    <h4>Contrôle des Appels Cloud</h4>
                    <p>
                      Une requête complexe nécessitant le Cloud Firebase AI Logic n'est exécutée que si vous n'avez pas activé le mode strictly local.
                    </p>
                  </div>
                </div>
              </div>

              {(caps?.onDeviceStatus === 'after-download' ||
                isDownloading ||
                downloadError ||
                downloadStatusNotice) && (
                  <div className="mt-4 p-4 rounded-2xl bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] space-y-3">
                    <div>
                      <h4 className="text-sm font-semibold text-[var(--color-text-main)]">
                        Modèle local Gemini Nano
                      </h4>
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                        {caps?.onDeviceDetails}
                      </p>
                    </div>

                    {!isDownloading && caps?.onDeviceStatus === 'after-download' && (
                      <button
                        type="button"
                        onClick={handleDownloadLocalModel}
                        className="btn-accent-sm"
                      >
                        <Download size={14} />
                        <span>Télécharger le modèle local (~4 Go)</span>
                      </button>
                    )}

                    {isDownloading && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-[var(--color-text-main)]">
                          <span>Téléchargement en cours...</span>
                          <strong>{downloadProgress}%</strong>
                        </div>
                        <div
                          className="w-full h-2 rounded-full overflow-hidden bg-[var(--color-border-subtle)]"
                          role="progressbar"
                          aria-valuenow={downloadProgress}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        >
                          <div
                            className="h-full bg-[var(--color-accent)] transition-all duration-200"
                            style={{ width: `${downloadProgress}%` }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleCancelDownload}
                          className="btn-secondary-sm"
                        >
                          Annuler
                        </button>
                      </div>
                    )}

                    {downloadError && (
                      <p className="text-xs text-[var(--color-danger)]">{downloadError}</p>
                    )}

                    {downloadStatusNotice && !downloadError && (
                      <p className="text-xs text-[var(--color-emerald)]">{downloadStatusNotice}</p>
                    )}
                  </div>
                )}
            </div>
          )}

          {/* ONGLET 4 : APPARENCE */}
          {activeTab === 'appearance' && (
            <div className="settings-section">
              <h3 className="section-title">Thème de l'Interface</h3>
              <p className="section-desc">Choisissez l'univers visuel adapté à votre confort de lecture.</p>

              <div className="theme-options-grid">
                <button
                  className={`theme-card ${theme === 'light' ? 'selected' : ''}`}
                  onClick={() => setTheme('light')}
                >
                  <div className="theme-preview light-preview">
                    <span className="preview-dot"></span>
                  </div>
                  <span className="theme-name">Ivoire & Beige Chaud</span>
                  <span className="theme-sub">Thème clair doux, sans éblouissement</span>
                </button>

                <button
                  className={`theme-card ${theme === 'dark' ? 'selected' : ''}`}
                  onClick={() => setTheme('dark')}
                >
                  <div className="theme-preview dark-preview">
                    <span className="preview-dot"></span>
                  </div>
                  <span className="theme-name">Noir Profond</span>
                  <span className="theme-sub">Contraste soigné pour sessions prolongées</span>
                </button>

                <button
                  className={`theme-card ${theme === 'system' ? 'selected' : ''}`}
                  onClick={() => setTheme('system')}
                >
                  <div className="theme-preview light-preview">
                    <span className="preview-dot"></span>
                  </div>
                  <span className="theme-name">Système</span>
                  <span className="theme-sub">Suit automatiquement votre appareil</span>
                </button>
              </div>
            </div>
          )}
          {/* ONGLET 5 : DÉVELOPPEUR & DIAGNOSTIC (accès explicite uniquement) */}
          {isDeveloperMode && activeTab === 'dev' && (
            <div className="settings-section">
              <h3 className="section-title">Outils Développeur & Diagnostic</h3>
              <p className="section-desc">Accès au banc d'essai technique et aux vérifications d'inférence hybride.</p>

              <div className="p-4 rounded-2xl bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-[var(--color-text-main)]">Banc de Test Hybride</h4>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Vérifie la disponibilité locale et l'inférence Cloud.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSettingsOpen(false);
                      setIsDiagnosticOpen(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-[var(--color-accent)] text-white text-xs font-semibold hover:opacity-90 transition-opacity"
                  >
                    Ouvrir le Diagnostic
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
