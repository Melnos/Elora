import React from 'react';
import { useApp } from '../../context/AppContext';
import { NAV_ITEMS } from '../../config/navigation';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab } = useApp();

  return (
    <nav className="elora-floating-bottom-bar" aria-label="Navigation principale mobile">
      <div className="bottom-bar-dock">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          const isAI = item.id === 'ai';
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              className={`dock-item ${isActive ? 'active' : ''} ${isAI ? 'dock-item-ai' : ''}`}
              onClick={() => setActiveTab(item.id)}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="dock-icon-wrapper">
                <Icon size={isAI ? 20 : 18} />
              </div>
              <span className="dock-label">{item.mobileLabel}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
