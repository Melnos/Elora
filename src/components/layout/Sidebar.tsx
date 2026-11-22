import React from 'react';
import { useApp } from '../../context/AppContext';
import type { NavTab } from '../../types';
import {
  Home,
  Bot,
  BookOpen,
  Calendar,
  Compass,
  TrendingUp,
  Settings,
  Activity,
  User,
  LogIn,
  LogOut,
  CloudCheck,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    profile,
    setIsSettingsOpen,
    setIsDiagnosticOpen,
    setIsAuthModalOpen,
    currentUser,
    logout,
    tasks,
    opportunities,
  } = useApp();

  const navItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'home', label: 'Espace Personnel', icon: <Home size={20} /> },
    { id: 'ai', label: 'Intelligence ELORA', icon: <Bot size={20} /> },
    { id: 'knowledge', label: 'Connaissances', icon: <BookOpen size={20} /> },
    {
      id: 'planner',
      label: 'Organisation & Focus',
      icon: <Calendar size={20} />,
      badge: tasks.filter((t) => !t.completed).length,
    },
    {
      id: 'opportunities',
      label: 'Opportunités',
      icon: <Compass size={20} />,
      badge: opportunities.filter((o) => o.saved).length,
    },
    { id: 'progress', label: 'Évolution & Bilan', icon: <TrendingUp size={20} /> },
  ];

  return (
    <aside className="elora-sidebar">
      {/* En-tête Sidebar */}
      <div className="sidebar-brand">
        <div className="brand-badge">EL</div>
        <div className="brand-titles">
          <span className="brand-title">ELORA</span>
          <span className="brand-subtitle">Intelligence Hybride</span>
        </div>
      </div>

      {/* Profil rapide & Statut Auth */}
      <div className="sidebar-user" onClick={() => (currentUser ? setIsSettingsOpen(true) : setIsAuthModalOpen(true))}>
        <div className="user-avatar">
          <User size={16} />
        </div>
        <div className="user-details">
          <span className="user-name">{currentUser?.displayName || profile.name}</span>
          <span className="user-role flex items-center gap-1">
            {currentUser ? (
              <>
                <CloudCheck size={11} className="text-emerald-500" />
                <span>Synchronisé Cloud</span>
              </>
            ) : (
              <span>Local • Invité</span>
            )}
          </span>
        </div>
      </div>

      {/* Navigation principale des 6 espaces */}
      <nav className="sidebar-nav">
        <span className="nav-section-title">Espaces de travail</span>
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item-btn ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="nav-badge">{item.badge}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Actions secondaires en bas de sidebar */}
      <div className="sidebar-footer">
        {currentUser ? (
          <button
            className="footer-btn text-red-500/80 hover:text-red-500"
            onClick={() => logout()}
            title="Se déconnecter de la session Firebase"
          >
            <LogOut size={17} />
            <span>Déconnexion</span>
          </button>
        ) : (
          <button
            className="footer-btn text-[var(--color-accent)]"
            onClick={() => setIsAuthModalOpen(true)}
            title="Se connecter pour sauvegarder dans Firestore"
          >
            <LogIn size={17} />
            <span>Connexion / Inscription</span>
          </button>
        )}

        <button
          className="footer-btn"
          onClick={() => setIsDiagnosticOpen(true)}
          title="Consulter le banc de test technique IA Hybride"
        >
          <Activity size={18} />
          <span>Diagnostic IA (#BuildHybridAI)</span>
        </button>

        <button
          className="footer-btn"
          onClick={() => setIsSettingsOpen(true)}
          title="Paramètres, mémoire et préférences"
        >
          <Settings size={18} />
          <span>Paramètres & Mémoire</span>
        </button>
      </div>
    </aside>
  );
};
