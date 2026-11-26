import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Moon,
  Sun,
  Settings,
  LogIn,
  Sparkles,
} from 'lucide-react';

interface HeaderProps {
  isScrolled?: boolean;
  isCompact?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  isScrolled: propIsScrolled,
  isCompact: propIsCompact,
}) => {
  const {
    theme,
    setTheme,
    setIsSettingsOpen,
    setIsAuthModalOpen,
    currentUser,
    isSyncingCloud,
    profile,
    activeTab,
  } = useApp();

  const [internalIsScrolled, setInternalIsScrolled] = useState(false);
  const [internalIsCompact, setInternalIsCompact] = useState(false);
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const isScrolled = propIsScrolled !== undefined ? propIsScrolled : internalIsScrolled;
  const isCompact = propIsCompact !== undefined ? propIsCompact : internalIsCompact;

  useEffect(() => {
    // Si contrôlé par props, pas besoin d'écouteurs internes
    if (propIsScrolled !== undefined) return;

    const getScrollContainer = () => {
      return document.querySelector('.elora-content-viewport') as HTMLElement | null;
    };

    const handleScroll = () => {
      const container = getScrollContainer();
      const currentScrollY = container ? container.scrollTop : window.scrollY;

      if (currentScrollY > 15) {
        setInternalIsScrolled(true);
      } else {
        setInternalIsScrolled(false);
        setInternalIsCompact(false);
      }

      if (currentScrollY > 50) {
        if (currentScrollY > lastScrollY.current + 3) {
          setInternalIsCompact(true);
        } else if (currentScrollY < lastScrollY.current - 4) {
          setInternalIsCompact(false);
        }
      }

      lastScrollY.current = currentScrollY;
    };

    const container = getScrollContainer();
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
    }
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
      window.removeEventListener('scroll', handleScroll);
    };
  }, [activeTab, propIsScrolled]);

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
    <header className={`elora-topbar ${isScrolled ? 'scrolled' : ''} ${isCompact ? 'compact' : ''}`}>
      <div className="topbar-inner">
        {/* Titre et Espace actif */}
        <div className="topbar-branding min-w-0 flex-1 mr-2">
          <div className="topbar-logo-badge shrink-0">
            <Sparkles size={isCompact ? 14 : 16} className="text-[var(--color-bg-base)]" />
          </div>
          <div className="topbar-title-group min-w-0">
            <span className="topbar-app-name shrink-0">ELORA</span>
            <span className="topbar-separator shrink-0">/</span>
            <span className="topbar-space-name truncate max-w-[110px] sm:max-w-none">{getPageTitle()}</span>
          </div>
        </div>

        {/* Contrôles utilisateur épurés */}
        <div className="topbar-actions shrink-0">
          {/* Thème clair / sombre */}
          <button
            className="topbar-btn"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title={`Basculer en thème ${theme === 'dark' ? 'clair' : 'sombre'}`}
            aria-label={`Basculer en thème ${theme === 'dark' ? 'clair' : 'sombre'}`}
          >
            {theme === 'dark' ? <Sun size={isCompact ? 15 : 17} /> : <Moon size={isCompact ? 15 : 17} />}
          </button>

          {/* Paramètres & Mémoire Personnelle */}
          <button
            className="topbar-btn"
            onClick={() => setIsSettingsOpen(true)}
            title="Paramètres et Mémoire Personnelle"
            aria-label="Paramètres et Mémoire Personnelle"
          >
            <Settings size={isCompact ? 15 : 17} />
          </button>

          {/* Profil / Connexion */}
          {currentUser ? (
            <button
              className="topbar-user-pill"
              onClick={() => setIsSettingsOpen(true)}
              title={
                !isOnline
                  ? `Hors ligne (${currentUser.displayName || profile.name})`
                  : isSyncingCloud
                  ? 'Synchronisation Cloud en cours...'
                  : `Synchronisé Cloud : ${currentUser.displayName || profile.name}`
              }
              aria-label={
                !isOnline
                  ? 'Profil utilisateur — Hors ligne'
                  : isSyncingCloud
                  ? 'Profil utilisateur — Synchronisation en cours'
                  : `Profil utilisateur — ${currentUser.displayName || profile.name}`
              }
            >
              <div
                className={`user-dot ${
                  !isOnline ? 'offline' : isSyncingCloud ? 'syncing' : 'active'
                }`}
              />
              <span className="user-label truncate max-w-[80px] sm:max-w-none">
                {!isOnline
                  ? 'Hors ligne'
                  : isSyncingCloud
                  ? 'Sync...'
                  : currentUser.displayName || profile.name.split(' ')[0]}
              </span>
            </button>
          ) : (
            <button
              className="topbar-auth-btn"
              onClick={() => setIsAuthModalOpen(true)}
              title="Connexion ou synchronisation Cloud"
              aria-label="Connexion ou synchronisation Cloud"
            >
              <LogIn size={isCompact ? 13 : 15} />
              <span className="hidden sm:inline">Connexion</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
