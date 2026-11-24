import React, { useState, useEffect, useRef } from 'react';
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

  const [isScrolled, setIsScrolled] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    // Écouter le scroll sur le conteneur principal de défilement ainsi que window
    const getScrollContainer = () => {
      return document.querySelector('.elora-content-viewport') as HTMLElement | null;
    };

    const handleScroll = () => {
      const container = getScrollContainer();
      const currentScrollY = container ? container.scrollTop : window.scrollY;

      // Détection de l'état défilé (dépassement du haut de page)
      if (currentScrollY > 15) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
        setIsCompact(false);
      }

      // Détection direction : descente vs montée
      if (currentScrollY > 50) {
        if (currentScrollY > lastScrollY.current + 3) {
          // Descente : passer en version compacte
          setIsCompact(true);
        } else if (currentScrollY < lastScrollY.current - 4) {
          // Montée : redéployer l'en-tête complet
          setIsCompact(false);
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
  }, [activeTab]);

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
            <Sparkles size={isCompact ? 14 : 16} className="text-[var(--color-accent)]" />
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
            {theme === 'dark' ? <Sun size={isCompact ? 15 : 17} /> : <Moon size={isCompact ? 15 : 17} />}
          </button>

          {/* Paramètres & Mémoire Personnelle */}
          <button
            className="topbar-btn"
            onClick={() => setIsSettingsOpen(true)}
            title="Paramètres et Mémoire Personnelle"
          >
            <Settings size={isCompact ? 15 : 17} />
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
              <LogIn size={isCompact ? 13 : 15} />
              <span className="hidden xs:inline">Connexion</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
