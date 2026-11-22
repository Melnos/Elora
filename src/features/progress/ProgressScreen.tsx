import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Target,
  CheckCircle2,
  Flame,
  ArrowRight,
  Bot,
  Brain,
} from 'lucide-react';

export const ProgressScreen: React.FC = () => {
  const {
    goals,
    tasks,
    focusSessions,
    knowledgeDocs,
    toggleMilestone,
    setActiveTab,
    sendMessage,
  } = useApp();

  const completedTasks = tasks.filter((t) => t.completed);
  const totalTasks = tasks.length;
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

  const totalFocusMinutes = focusSessions.reduce((acc, s) => acc + s.durationMinutes, 0);

  const handleAskProgressReview = async () => {
    setActiveTab('ai');
    await sendMessage(`Fais un bilan synthétique et constructif de mon évolution actuelle sur ELORA :\n- Objectifs en cours : ${goals.map((g) => `${g.title} (${g.progressPercentage}%)`).join(', ')}\n- Tâches accomplies : ${completedTasks.length} sur ${totalTasks}\n- Minutes de Focus enregistrées : ${totalFocusMinutes} min\n- Connaissances indexées : ${knowledgeDocs.length} documents\n\nIdentifie mes points forts, mes éventuels retards et les prochaines étapes concrètes à franchir.`);
  };

  return (
    <div className="page-container progress-page">
      {/* En-tête */}
      <div className="section-header-row">
        <div>
          <h1 className="page-main-title">Évolution & Bilan Réel</h1>
          <p className="page-main-desc">
            Indicateurs concrets calculés à partir de vos activités réelles. Aucun faux score ni compliment artificiel.
          </p>
        </div>

        <button className="btn-ai-assistant-planner" onClick={handleAskProgressReview}>
          <Bot size={16} />
          <span>Bilan personnalisé ELORA</span>
        </button>
      </div>

      {/* Cartes métriques réelles */}
      <div className="metrics-real-grid">
        <div className="metric-box">
          <div className="metric-icon-circle green">
            <CheckCircle2 size={20} />
          </div>
          <div className="metric-content">
            <span className="metric-number">{completedTasks.length} / {totalTasks}</span>
            <span className="metric-label">Tâches concrétisées ({taskCompletionRate}%)</span>
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-icon-circle orange">
            <Flame size={20} />
          </div>
          <div className="metric-content">
            <span className="metric-number">{totalFocusMinutes} min</span>
            <span className="metric-label">Concentration profonde cumulée</span>
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-icon-circle blue">
            <Brain size={20} />
          </div>
          <div className="metric-content">
            <span className="metric-number">{knowledgeDocs.length}</span>
            <span className="metric-label">Ressources & Savoirs indexés</span>
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-icon-circle gold">
            <Target size={20} />
          </div>
          <div className="metric-content">
            <span className="metric-number">{goals.length}</span>
            <span className="metric-label">Objectifs actifs en pilotage</span>
          </div>
        </div>
      </div>

      {/* Détail des objectifs et étapes franchies */}
      <section className="progress-section-card">
        <div className="card-header-between mb-3">
          <div className="flex-align-center gap-2">
            <Target size={18} className="icon-gold" />
            <h2 className="card-heading">Objectifs & Jalons Franchis</h2>
          </div>
        </div>

        <div className="goals-progress-list">
          {goals.map((goal) => (
            <div key={goal.id} className="goal-detail-card">
              <div className="goal-detail-header">
                <div>
                  <h3 className="goal-title-bold">{goal.title}</h3>
                  <span className="goal-subtitle-text">{goal.category} • Échéance : {goal.targetDate}</span>
                </div>
                <span className="goal-percent-pill">{goal.progressPercentage}%</span>
              </div>

              <div className="progress-bar-bg my-2">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${goal.progressPercentage}%` }}
                />
              </div>

              {/* Liste des jalons */}
              <div className="milestones-checklist">
                {goal.milestones.map((m) => (
                  <div
                    key={m.id}
                    className={`milestone-item ${m.completed ? 'completed' : ''}`}
                    onClick={() => toggleMilestone(goal.id, m.id)}
                  >
                    <button className={`milestone-check ${m.completed ? 'checked' : ''}`}>
                      {m.completed && <CheckCircle2 size={14} />}
                    </button>
                    <span className="milestone-title">{m.title}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Historique réel des sessions Focus */}
      <section className="progress-section-card mt-4">
        <div className="card-header-between mb-3">
          <div className="flex-align-center gap-2">
            <Flame size={18} className="icon-gold" />
            <h2 className="card-heading">Sessions Focus Enregistrées ({focusSessions.length})</h2>
          </div>
          <button className="btn-link" onClick={() => setActiveTab('planner')}>
            Lancer une nouvelle session <ArrowRight size={14} />
          </button>
        </div>

        {focusSessions.length === 0 ? (
          <p className="text-muted text-sm">Aucune session Focus enregistrée pour l'instant.</p>
        ) : (
          <div className="focus-sessions-history-list">
            {focusSessions.map((s) => (
              <div key={s.id} className="focus-session-history-item">
                <div className="flex-align-center gap-3">
                  <div className="focus-history-icon">
                    <Flame size={16} />
                  </div>
                  <div>
                    <strong className="focus-session-title">{s.goalTitle}</strong>
                    {s.notes && <p className="focus-session-notes">{s.notes}</p>}
                  </div>
                </div>

                <div className="focus-history-meta">
                  <span className="focus-duration-badge">{s.durationMinutes} min</span>
                  <span className="focus-date-text">{s.completedAt}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
