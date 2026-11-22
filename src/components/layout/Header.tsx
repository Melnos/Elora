import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Cpu,
  Cloud,
  Moon,
  Sun,
  Settings,
  Activity,
  WifiOff,
  LogIn,
  RefreshCw,
  UserCheck,
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    theme,
    setTheme,
    setIsSettingsOpen,
    setIsDiagnosticOpen,
    setIsAuthModalOpen,
    currentUser,
    isSyncingCloud,
    triggerCloudSync,
    caps,
    activeTab,
  } = useApp();

  const getPageTitle = () => {
    switch (activeTab) {
      case 'home':
        return 'Espace Personnel';
      case 'ai':
        return 'Intelligence Centrale';
      case 'knowledge':
        return 'Connaissances & Bibliothèque';
      case 'planner':
        return 'Organisation & Focus';
      case 'opportunities':
        return 'Opportunités Vérifiées';
      case 'progress':
        return 'Évolution & Progrès';
      default:
        return 'ELORA';
    }
  };

  const isLocalReady = caps?.onDeviceStatus === 'readily';
  const isOnline = caps?.networkOnline ?? true;

  return (
    <header className="elora-header">
      <div className="header-left">
        <div className="logo-group">
          <span className="brand-name">ELORA</span>
          <span className="brand-dot">•</span>
          <span className="page-breadcrumb">{getPageTitle()}</span>
        </div>
      </div>

      <div className="header-right">
        {/* Badge d'état IA temps réel */}
        <button
          className="engine-badge-btn"
          onClick={() => setIsDiagnosticOpen(true)}
          title="Ouvrir le banc de test et diagnostic technique IA"
        >
          {isLocalReady ? (
            <span className="badge-pill local">
              <Cpu size={13} />
              <span>Gemini Nano Prêt</span>
            </span>
          ) : isOnline ? (
            <span className="badge-pill cloud">
              <Cloud size={13} />
              <span>Firebase Cloud</span>
            </span>
          ) : (
            <span className="badge-pill offline">
              <WifiOff size={13} />
              <span>Hors Ligne</span>
            </span>
          )}
        </button>

        {/* État Authentification / Cloud Sync */}
        {currentUser ? (
          <button
            className="engine-badge-btn"
            onClick={() => triggerCloudSync()}
            title={isSyncingCloud ? 'Synchronisation Cloud en cours...' : `Connecté en tant que ${currentUser.email || currentUser.displayName} (cliquez pour synchroniser)`}
          >
            <span className="badge-pill cloud">
              {isSyncingCloud ? (
                <RefreshCw size={13} className="animate-spin" />
              ) : (
                <UserCheck size={13} />
              )}
              <span className="desktop-only-text">
                {isSyncingCloud ? 'Synchro...' : 'Cloud Actif'}
              </span>
            </span>
          </button>
        ) : (
          <button
            className="header-icon-btn auth-btn"
            onClick={() => setIsAuthModalOpen(true)}
            title="Se connecter pour synchroniser vos données dans Firestore"
          >
            <LogIn size={17} />
            <span className="desktop-only-text">Connexion</span>
          </button>
        )}

        {/* Bouton Diagnostic Hackathon */}
        <button
          className="header-icon-btn diagnostic-btn"
          onClick={() => setIsDiagnosticOpen(true)}
          title="Banc de test technique Phase 0 (#BuildHybridAI)"
        >
          <Activity size={18} />
          <span className="desktop-only-text">Preuve IA</span>
        </button>

        {/* Bouton Thème */}
        <button
          className="header-icon-btn"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title={`Passer en mode ${theme === 'dark' ? 'clair (Ivoire)' : 'sombre (Noir profond)'}`}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Bouton Paramètres & Mémoire */}
        <button
          className="header-icon-btn"
          onClick={() => setIsSettingsOpen(true)}
          title="Paramètres & Mémoire Personnelle"
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
};
