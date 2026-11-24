import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Moon,
  Sun,
  Settings,
  LogIn,
  Sparkles,
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    theme,
    setTheme,
    setIsSettingsOpen,
    setIsAuthModalOpen,
    currentUser,
    profile,
    activeTab,
  } = useApp();

  const getPageTitle = () => {
    switch (activeTab) {
      case 'home':
        return 'Espace Personnel';
      case 'ai':
        return 'Intelligence ELORA';
      case 'knowledge':
        return 'Bibliothèque & Savoir';
      case 'planner':
        return 'Organisation & Focus';
      case 'opportunities':
        return 'Opportunités Vérifiées';
      case 'progress':
        return 'Évolution & Bilan';
      default:
        return 'ELORA';
    }
  };

  return (
    <header className="elora-topbar">
      <div className="topbar-inner">
        {/* Titre et Espace actif */}
        <div className="topbar-branding min-w-0 flex-1 mr-2">
          <div className="topbar-logo-badge shrink-0">
            <Sparkles size={16} className="text-[var(--color-accent)]" />
          </div>
          <div className="topbar-title-group min-w-0">
            <span className="topbar-app-name shrink-0">ELORA</span>
            <span className="topbar-separator shrink-0">/</span>
            <span className="topbar-space-name truncate max-w-[110px] xs:max-w-[150px] sm:max-w-none">{getPageTitle()}</span>
          </div>
        </div>

        {/* Contrôles utilisateur épurés */}
        <div className="topbar-actions shrink-0">
          {/* Thème clair / sombre */}
          <button
            className="topbar-btn"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title={`Basculer en thème ${theme === 'dark' ? 'clair' : 'sombre'}`}
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          {/* Paramètres & Mémoire Personnelle */}
          <button
            className="topbar-btn"
            onClick={() => setIsSettingsOpen(true)}
            title="Paramètres et Mémoire Personnelle"
          >
            <Settings size={17} />
          </button>

          {/* Profil / Connexion */}
          {currentUser ? (
            <button
              className="topbar-user-pill"
              onClick={() => setIsSettingsOpen(true)}
              title={`Connecté : ${currentUser.displayName || profile.name}`}
            >
              <div className="user-dot active" />
              <span className="user-label truncate max-w-[80px] xs:max-w-none">{currentUser.displayName || profile.name.split(' ')[0]}</span>
            </button>
          ) : (
            <button
              className="topbar-auth-btn"
              onClick={() => setIsAuthModalOpen(true)}
              title="Connexion ou synchronisation Cloud"
            >
              <LogIn size={15} />
              <span className="hidden xs:inline">Connexion</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
