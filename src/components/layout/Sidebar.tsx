import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { NAV_ITEMS } from '../../config/navigation';
import { OfflineQueue } from '../../lib/offline/OfflineQueue';
import {
  Settings,
  LogIn,
  LogOut,
  User,
} from 'lucide-react';
import { EloraLogo } from '../ui/EloraLogo';

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

  const getBadgeForTab = (id: string): number | undefined => {
    if (id === 'planner') return tasks.filter((t) => !t.completed).length;
    if (id === 'opportunities') return opportunities.filter((o) => o.saved).length;
    return undefined;
  };
  const pendingCount = OfflineQueue.getPendingCount();

  return (
    <aside className="elora-sidebar">
      {/* Marque & Symbole ELORA */}
      <div className="sidebar-brand-container">
        <div className="brand-gem">
          <EloraLogo size={20} />
        </div>
        <div className="brand-text-block">
          <span className="brand-main-title">ELORA</span>
          <span className="brand-tagline">Intelligence Personnelle</span>
        </div>
      </div>

      {/* Navigation des 6 Espaces */}
      <nav className="sidebar-navigation" aria-label="Navigation principale">
        <div className="nav-group-label">Espaces de travail</div>
        <div className="nav-items-stack">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            const badge = getBadgeForTab(item.id);
            return (
              <button
                key={item.id}
                type="button"
                className={`sidebar-nav-link ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTab(item.id)}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="nav-link-icon"><Icon size={19} /></span>
                <span className="nav-link-text">{item.label}</span>
                {badge !== undefined && badge > 0 && (
                  <span className="nav-counter-pill">{badge}</span>
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
                  ? `Hors ligne${pendingCount > 0 ? ` (${pendingCount})` : ''}`
                  : isSyncingCloud
                  ? 'Synchronisation...'
                  : pendingCount > 0
                  ? `${pendingCount} en attente`
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
