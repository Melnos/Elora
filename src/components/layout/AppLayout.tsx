import React from 'react';
import { useApp } from '../../context/AppContext';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { SettingsModal } from './SettingsModal';
import { DiagnosticModal } from './DiagnosticModal';
import { AuthModal } from '../auth/AuthModal';

import { HomeScreen } from '../../features/home/HomeScreen';
import { AIScreen } from '../../features/ai/AIScreen';
import { KnowledgeScreen } from '../../features/knowledge/KnowledgeScreen';
import { PlannerScreen } from '../../features/planner/PlannerScreen';
import { OpportunitiesScreen } from '../../features/opportunities/OpportunitiesScreen';
import { ProgressScreen } from '../../features/progress/ProgressScreen';

export const AppLayout: React.FC = () => {
  const { activeTab, isAuthModalOpen, setIsAuthModalOpen } = useApp();

  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'home':
        return <HomeScreen />;
      case 'ai':
        return <AIScreen />;
      case 'knowledge':
        return <KnowledgeScreen />;
      case 'planner':
        return <PlannerScreen />;
      case 'opportunities':
        return <OpportunitiesScreen />;
      case 'progress':
        return <ProgressScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <div className="elora-app-shell">
      {/* Barre latérale desktop */}
      <Sidebar />

      {/* Conteneur principal */}
      <div className="elora-main-wrapper">
        <Header />

        <main className="elora-content-viewport">
          {renderActiveScreen()}
        </main>
      </div>

      {/* Barre de navigation inférieure mobile */}
      <BottomNav />

      {/* Modale d'Authentification Firebase */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Modale de Paramètres & Mémoire */}
      <SettingsModal />

      {/* Modale de Diagnostic IA (#BuildHybridAI) */}
      <DiagnosticModal />
    </div>
  );
};
