import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';

export const SettingsModal: React.FC = () => {
  const {
    isSettingsOpen,
    setIsSettingsOpen,
    setIsDiagnosticOpen,
    profile,
    updateProfile,
    memories,
    addMemory,
    toggleMemoryAI,
    deleteMemory,
    theme,
    setTheme,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'profile' | 'memory' | 'privacy' | 'appearance' | 'dev'>('profile');
  const [newMemoryKey, setNewMemoryKey] = useState('');
  const [newMemoryValue, setNewMemoryValue] = useState('');
  const [newMemoryCategory, setNewMemoryCategory] = useState<'preference' | 'objective' | 'skill' | 'habit' | 'context'>('preference');
  const [showAddMemory, setShowAddMemory] = useState(false);

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

  if (!isSettingsOpen) return null;

  const handleAddMemorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemoryKey.trim() || !newMemoryValue.trim()) return;
    addMemory({
      key: newMemoryKey.trim(),
      value: newMemoryValue.trim(),
      category: newMemoryCategory,
      source: 'Ajout manuel utilisateur',
      enabledForAI: true,
    });
    setNewMemoryKey('');
    setNewMemoryValue('');
    setShowAddMemory(false);
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
              <Shield size={16} />
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

          {/* ONGLET 2 : MÉMOIRE PERSONNELLE */}
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
                      <option value="skill">Compétence</option>
                      <option value="habit">Habitude</option>
                      <option value="context">Contexte</option>
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
                {memories.map((mem) => (
                  <div key={mem.id} className="memory-item-card">
                    <div className="memory-item-header">
                      <div className="memory-badge-group">
                        <span className="memory-cat-badge">{mem.category}</span>
                        <strong className="memory-key">{mem.key}</strong>
                      </div>
                      <div className="memory-item-actions">
                        <button
                          className={`btn-icon-toggle ${mem.enabledForAI ? 'enabled' : 'disabled'}`}
                          onClick={() => toggleMemoryAI(mem.id)}
                          title={mem.enabledForAI ? "Désactiver pour l'IA" : "Activer pour l'IA"}
                          aria-label={mem.enabledForAI ? "Désactiver pour l'IA" : "Activer pour l'IA"}
                        >
                          {mem.enabledForAI ? <Eye size={15} /> : <EyeOff size={15} />}
                        </button>
                        <button
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
                  </div>
                ))}
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
