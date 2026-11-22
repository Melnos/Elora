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
} from 'lucide-react';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab } = useApp();

  const navItems: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    { id: 'home', label: 'Home', icon: <Home size={20} /> },
    { id: 'ai', label: 'ELORA AI', icon: <Bot size={20} /> },
    { id: 'knowledge', label: 'Savoirs', icon: <BookOpen size={20} /> },
    { id: 'planner', label: 'Planner', icon: <Calendar size={20} /> },
    { id: 'opportunities', label: 'Opportunités', icon: <Compass size={20} /> },
    { id: 'progress', label: 'Progrès', icon: <TrendingUp size={20} /> },
  ];

  return (
    <nav className="elora-bottom-nav">
      {navItems.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            className={`bottom-nav-item ${isActive ? 'active' : ''} ${item.id === 'ai' ? 'ai-center-item' : ''}`}
            onClick={() => setActiveTab(item.id)}
            aria-label={item.label}
          >
            <div className="bottom-nav-icon">{item.icon}</div>
            <span className="bottom-nav-label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
