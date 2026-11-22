import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Clock,
  Compass,
  Target,
  Bot,
  Play,
  BookOpen,
  Calendar,
} from 'lucide-react';

export const HomeScreen: React.FC = () => {
  const {
    profile,
    tasks,
    goals,
    opportunities,
    setActiveTab,
    toggleTaskCompleted,
  } = useApp();

  // Filtrer les priorités réelles (tâches prioritaires non complétées, max 3)
  const pendingHighTasks = tasks
    .filter((t) => !t.completed && (t.priority === 'high' || t.priority === 'medium'))
    .slice(0, 3);

  // Objectifs en cours
  const activeGoals = goals.filter((g) => !g.completed).slice(0, 2);

  // Une opportunité pertinente à découvrir (mise en avant vérifiée)
  const featuredOpportunity = opportunities.find((o) => o.saved) || opportunities[0];

  return (
    <div className="page-container home-page">
      {/* 1. Accueil & Briefing Quotidien */}
      <section className="home-hero-card">
        <div className="hero-text-content">
          <div className="greeting-badge">
            <Sparkles size={14} />
            <span>Briefing Quotidien</span>
          </div>
          <h1 className="hero-headline">
            Bonjour, {profile.name}.
          </h1>
          <p className="hero-description">
            Votre objectif actuel : <strong className="text-highlight">"{profile.currentObjective}"</strong>.
            {pendingHighTasks.length > 0 ? (
              <> Vous avez <strong>{pendingHighTasks.length} action(s) prioritaire(s)</strong> à concrétiser aujourd'hui.</>
            ) : (
              <> Toutes vos priorités d'aujourd'hui sont à jour.</>
            )}
          </p>

          <div className="hero-actions-row">
            <button
              className="btn-primary-hero"
              onClick={() => setActiveTab('ai')}
            >
              <Bot size={18} />
              <span>Consulter ELORA</span>
            </button>
            <button
              className="btn-secondary-hero"
              onClick={() => setActiveTab('planner')}
            >
              <Play size={16} />
              <span>Lancer un Focus</span>
            </button>
          </div>
        </div>
      </section>

      {/* Grille 2 colonnes : Priorités & Objectifs */}
      <div className="home-grid">
        {/* Colonne Gauche : Les Priorités d'Aujourd'hui */}
        <section className="home-card">
          <div className="card-header-between">
            <div className="flex-align-center gap-2">
              <Clock size={18} className="icon-gold" />
              <h2 className="card-heading">Priorités du jour</h2>
            </div>
            <button className="btn-link" onClick={() => setActiveTab('planner')}>
              Voir tout le Planner <ArrowRight size={14} />
            </button>
          </div>

          {pendingHighTasks.length === 0 ? (
            <div className="empty-state-box">
              <CheckCircle2 size={32} className="icon-green mb-2" />
              <p>Aucune tâche urgente en attente. Votre journée est parfaitement sous contrôle !</p>
            </div>
          ) : (
            <div className="priorities-list">
              {pendingHighTasks.map((task) => (
                <div key={task.id} className="priority-task-item">
                  <button
                    className={`task-checkbox ${task.completed ? 'checked' : ''}`}
                    onClick={() => toggleTaskCompleted(task.id)}
                    title="Marquer comme terminée"
                  >
                    {task.completed && <CheckCircle2 size={16} />}
                  </button>
                  <div className="task-content">
                    <span className="task-title">{task.title}</span>
                    <div className="task-meta">
                      <span className="task-category">{task.category}</span>
                      <span className="task-date">Échéance : {task.dueDate}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Colonne Droite : Objectifs Actifs */}
        <section className="home-card">
          <div className="card-header-between">
            <div className="flex-align-center gap-2">
              <Target size={18} className="icon-gold" />
              <h2 className="card-heading">Objectifs en cours</h2>
            </div>
            <button className="btn-link" onClick={() => setActiveTab('progress')}>
              Bilan & Évolution <ArrowRight size={14} />
            </button>
          </div>

          <div className="goals-mini-list">
            {activeGoals.map((goal) => (
              <div key={goal.id} className="goal-mini-item">
                <div className="goal-top-row">
                  <span className="goal-title">{goal.title}</span>
                  <span className="goal-percent">{goal.progressPercentage}%</span>
                </div>
                <div className="progress-bar-bg">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${goal.progressPercentage}%` }}
                  />
                </div>
                <div className="goal-meta-row">
                  <span>{goal.category}</span>
                  <span>Cible : {goal.targetDate}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Opportunité du moment mise en lumière */}
      {featuredOpportunity && (
        <section className="featured-opportunity-card">
          <div className="opportunity-badge-row">
            <span className="opp-tag">Opportunité Recommandée</span>
            <span className="opp-match">Pertinence : {featuredOpportunity.matchScore}%</span>
          </div>

          <div className="opp-main-content">
            <div>
              <h3 className="opp-title">{featuredOpportunity.title}</h3>
              <p className="opp-org">Organisé par {featuredOpportunity.organization} • {featuredOpportunity.location}</p>
              <p className="opp-reason">{featuredOpportunity.matchReason}</p>
            </div>

            <button
              className="btn-accent-opp"
              onClick={() => setActiveTab('opportunities')}
            >
              <span>Explorer la sélection</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </section>
      )}

      {/* Raccourcis d'actions immédiates */}
      <section className="quick-actions-bar">
        <span className="quick-actions-title">Accès directs :</span>
        <div className="quick-actions-list">
          <button className="quick-pill" onClick={() => setActiveTab('ai')}>
            <Bot size={15} />
            <span>Poser une question à ELORA</span>
          </button>
          <button className="quick-pill" onClick={() => setActiveTab('knowledge')}>
            <BookOpen size={15} />
            <span>Bibliothèque Savoirs</span>
          </button>
          <button className="quick-pill" onClick={() => setActiveTab('planner')}>
            <Calendar size={15} />
            <span>Planning & Échéances</span>
          </button>
          <button className="quick-pill" onClick={() => setActiveTab('opportunities')}>
            <Compass size={15} />
            <span>Stages & Bourses</span>
          </button>
        </div>
      </section>
    </div>
  );
};
