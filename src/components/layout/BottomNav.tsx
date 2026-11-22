import React from 'react';
import { useApp } from '../../context/AppContext';
import type { NavTab } from '../../types';
import {
  Home,
  Sparkles,
  BookOpen,
  Calendar,
  Compass,
  TrendingUp,
} from 'lucide-react';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab } = useApp();

  const navItems: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    { id: 'home', label: 'Accueil', icon: <Home size={19} /> },
    { id: 'planner', label: 'Planner', icon: <Calendar size={19} /> },
    { id: 'ai', label: 'ELORA', icon: <Sparkles size={20} /> },
    { id: 'knowledge', label: 'Savoir', icon: <BookOpen size={19} /> },
    { id: 'opportunities', label: 'Opportunités', icon: <Compass size={19} /> },
    { id: 'progress', label: 'Bilan', icon: <TrendingUp size={19} /> },
  ];

  return (
    <nav className="elora-floating-bottom-bar">
      <div className="bottom-bar-dock">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const isAI = item.id === 'ai';
          return (
            <button
              key={item.id}
              className={`dock-item ${isActive ? 'active' : ''} ${isAI ? 'dock-item-ai' : ''}`}
              onClick={() => setActiveTab(item.id)}
              aria-label={item.label}
            >
              <div className="dock-icon-wrapper">
                {item.icon}
              </div>
              <span className="dock-label">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
