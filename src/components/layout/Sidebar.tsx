import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import type { NavTab } from '../../types';
import {
  Home,
  Sparkles,
  BookOpen,
  Calendar,
  Compass,
  TrendingUp,
  Settings,
  LogIn,
  LogOut,
  User,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    profile,
    setIsSettingsOpen,
    setIsAuthModalOpen,
    currentUser,
    isSyncingCloud,
    logout,
    tasks,
    opportunities,
  } = useApp();

  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

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

  const navItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'home', label: 'Espace Personnel', icon: <Home size={19} /> },
    { id: 'ai', label: 'Intelligence ELORA', icon: <Sparkles size={19} /> },
    { id: 'knowledge', label: 'Bibliothèque', icon: <BookOpen size={19} /> },
    {
      id: 'planner',
      label: 'Organisation & Focus',
      icon: <Calendar size={19} />,
      badge: tasks.filter((t) => !t.completed).length,
    },
    {
      id: 'opportunities',
      label: 'Opportunités',
      icon: <Compass size={19} />,
      badge: opportunities.filter((o) => o.saved).length,
    },
    { id: 'progress', label: 'Évolution & Bilan', icon: <TrendingUp size={19} /> },
  ];

  return (
    <aside className="elora-sidebar">
      {/* Marque & Symbole ELORA */}
      <div className="sidebar-brand-container">
        <div className="brand-gem">
          <Sparkles size={18} className="text-white" />
        </div>
        <div className="brand-text-block">
          <span className="brand-main-title">ELORA</span>
          <span className="brand-tagline">Intelligence Personnelle</span>
        </div>
      </div>

      {/* Navigation des 6 Espaces */}
      <nav className="sidebar-navigation">
        <div className="nav-group-label">Espaces de travail</div>
        <div className="nav-items-stack">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                className={`sidebar-nav-link ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTab(item.id)}
              >
                <span className="nav-link-icon">{item.icon}</span>
                <span className="nav-link-text">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="nav-counter-pill">{item.badge}</span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Carte Utilisateur & Actions en bas */}
      <div className="sidebar-bottom-card">
        <div
          className="user-profile-row"
          role="button"
          tabIndex={0}
          aria-label={currentUser ? 'Ouvrir les paramètres du profil' : 'Se connecter ou créer un compte'}
          onClick={() => (currentUser ? setIsSettingsOpen(true) : setIsAuthModalOpen(true))}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              if (currentUser) {
                setIsSettingsOpen(true);
              } else {
                setIsAuthModalOpen(true);
              }
            }
          }}
        >
          <div className="user-avatar-circle">
            <User size={16} />
          </div>
          <div className="user-info-text">
            <span className="user-display-name">{currentUser?.displayName || profile.name}</span>
            <span className="user-status-text">
              {currentUser
                ? !isOnline
                  ? 'Hors ligne'
                  : isSyncingCloud
                  ? 'Synchronisation...'
                  : 'Synchronisé Cloud'
                : 'Mode Local'}
            </span>
          </div>
        </div>

        <div className="sidebar-quick-actions">
          <button
            className="quick-action-btn"
            onClick={() => setIsSettingsOpen(true)}
            title="Paramètres et Mémoire"
            aria-label="Paramètres et Mémoire"
          >
            <Settings size={16} />
          </button>

          {currentUser ? (
            <button
              className="quick-action-btn hover:text-red-500"
              onClick={() => logout()}
              title="Déconnexion"
              aria-label="Déconnexion"
            >
              <LogOut size={16} />
            </button>
          ) : (
            <button
              className="quick-action-btn text-[var(--color-accent)]"
              onClick={() => setIsAuthModalOpen(true)}
              title="Connexion"
              aria-label="Connexion"
            >
              <LogIn size={16} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
