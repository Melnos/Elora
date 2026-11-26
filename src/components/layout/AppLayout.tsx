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
  const {
    activeTab,
    setActiveTab,
    isAuthModalOpen,
    setIsAuthModalOpen,
    setIsSettingsOpen,
    setIsDiagnosticOpen,
  } = useApp();

  const [headerState, setHeaderState] = React.useState<{ isScrolled: boolean; isCompact: boolean }>({
    isScrolled: false,
    isCompact: false,
  });
  const lastScrollY = React.useRef(0);

  // Réinitialiser l'état du header au changement d'onglet
  React.useEffect(() => {
    setHeaderState({ isScrolled: false, isCompact: false });
    lastScrollY.current = 0;
  }, [activeTab]);

  const handleViewportScroll = (e: React.UIEvent<HTMLElement>) => {
    const currentScrollY = e.currentTarget.scrollTop;
    const isScrolled = currentScrollY > 15;
    let isCompact = headerState.isCompact;
    const delta = currentScrollY - lastScrollY.current;

    if (currentScrollY > 50) {
      if (delta > 3) {
        // Défilement vers le bas : passer en mode compact
        isCompact = true;
      } else if (delta < -4) {
        // Défilement vers le haut : redéployer l'en-tête complet
        isCompact = false;
      }
    } else {
      // Haut de page : toujours complet
      isCompact = false;
    }

    if (Math.abs(delta) > 3) {
      lastScrollY.current = currentScrollY;
    }
    if (headerState.isScrolled !== isScrolled || headerState.isCompact !== isCompact) {
      setHeaderState({ isScrolled, isCompact });
    }
  };

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab && ['home', 'ai', 'knowledge', 'planner', 'opportunities', 'progress'].includes(tab)) {
      setActiveTab(tab as any);
    }
    const modal = params.get('modal');
    if (modal === 'auth') setIsAuthModalOpen(true);
    if (modal === 'settings') setIsSettingsOpen(true);
    if (modal === 'diagnostic') setIsDiagnosticOpen(true);
  }, [setActiveTab, setIsAuthModalOpen, setIsSettingsOpen, setIsDiagnosticOpen]);

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
        <Header isScrolled={headerState.isScrolled} isCompact={headerState.isCompact} />

        <main
          onScroll={handleViewportScroll}
          className={`elora-content-viewport ${activeTab === 'ai' ? 'ai-viewport' : ''}`}
        >
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
