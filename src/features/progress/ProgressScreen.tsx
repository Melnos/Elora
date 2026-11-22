import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Target,
  CheckCircle2,
  Flame,
  Sparkles,
  BookOpen,
  Calendar,
  Check,
  TrendingUp,
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
    <div className="bento-viewport">
      {/* En-tête */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <div className="bento-tag mb-2">
            <TrendingUp size={13} className="text-[var(--color-accent)]" />
            <span>Mesure & Évolution</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--color-text-main)] tracking-tight">
            Bilan Réel & Progression
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Indicateurs concrets calculés à partir de vos activités réelles. Aucune statistique artificielle.
          </p>
        </div>

        <button
          className="bento-btn-primary self-start md:self-auto"
          onClick={handleAskProgressReview}
        >
          <Sparkles size={15} />
          <span>Bilan personnalisé ELORA</span>
        </button>
      </div>

      {/* Grille Bento Asymétrique des Métriques Réelles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Métrique 1 : Tâches */}
        <div className="p-6 rounded-3xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
              Tâches Concrétisées
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-[var(--color-text-main)] font-mono">
              {completedTasks.length} <span className="text-sm font-medium text-[var(--color-text-muted)]">/ {totalTasks}</span>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              Taux de complétion : <strong className="text-[var(--color-text-main)]">{taskCompletionRate}%</strong>
            </p>
          </div>
        </div>

        {/* Métrique 2 : Focus */}
        <div className="p-6 rounded-3xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
              Deep Work
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Flame size={16} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-[var(--color-text-main)] font-mono">
              {totalFocusMinutes} <span className="text-sm font-medium text-[var(--color-text-muted)]">min</span>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              {focusSessions.length} session(s) de concentration
            </p>
          </div>
        </div>

        {/* Métrique 3 : Connaissances */}
        <div className="p-6 rounded-3xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
              Bibliothèque
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <BookOpen size={16} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-[var(--color-text-main)] font-mono">
              {knowledgeDocs.length}
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              Ressources et fiches indexées
            </p>
          </div>
        </div>

        {/* Métrique 4 : Objectifs */}
        <div className="p-6 rounded-3xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
              Trajectoire
            </span>
            <div className="w-8 h-8 rounded-xl bg-[var(--color-accent)]/10 text-[var(--color-accent)] flex items-center justify-center">
              <Target size={16} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-[var(--color-text-main)] font-mono">
              {goals.length}
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              Objectif(s) stratégique(s) actif(s)
            </p>
          </div>
        </div>
      </div>

      {/* Cartes Asymétriques : Jalons d'Objectifs & Historique Focus */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Colonne Gauche (2 cols) : Objectifs et Jalons */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-6 md:p-8 rounded-3xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-[var(--color-text-main)]">
                Jalons & Réalisations Clés
              </h2>
              <span className="text-xs text-[var(--color-text-muted)]">
                Cochez les jalons pour actualiser la trajectoire
              </span>
            </div>

            <div className="space-y-6">
              {goals.map((goal) => (
                <div key={goal.id} className="p-5 rounded-2xl bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--color-bg-surface)] text-[var(--color-accent)]">
                        {goal.category}
                      </span>
                      <h3 className="text-base font-bold text-[var(--color-text-main)] mt-1.5">
                        {goal.title}
                      </h3>
                      <p className="text-xs text-[var(--color-text-muted)]">Échéance : {goal.targetDate}</p>
                    </div>

                    <span className="text-lg font-black text-[var(--color-accent)] font-mono">
                      {goal.progressPercentage}%
                    </span>
                  </div>

                  {/* Barre Apple-style */}
                  <div className="w-full h-2 rounded-full bg-[var(--color-bg-surface-elevated)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--color-accent)] transition-all duration-500"
                      style={{ width: `${goal.progressPercentage}%` }}
                    />
                  </div>

                  {/* Jalons interactifs */}
                  <div className="space-y-2 pt-1">
                    {goal.milestones.map((milestone) => (
                      <div
                        key={milestone.id}
                        onClick={() => toggleMilestone(goal.id, milestone.id)}
                        className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                          milestone.completed
                            ? 'bg-[var(--color-bg-surface)]/80 border-[var(--color-border-subtle)] text-[var(--color-text-muted)] line-through'
                            : 'bg-[var(--color-bg-surface)] border-[var(--color-border-subtle)] text-[var(--color-text-main)] hover:border-[var(--color-accent)]'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                            milestone.completed
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'border-[var(--color-border-strong)]'
                          }`}
                        >
                          {milestone.completed && <Check size={11} strokeWidth={3} />}
                        </div>
                        <span className="text-xs font-medium flex-1">
                          {milestone.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Colonne Droite (1 col) : Dernières Sessions Deep Work */}
        <div className="space-y-4">
          <div className="p-6 md:p-8 rounded-3xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] shadow-sm h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Flame size={16} className="text-amber-500" />
                <h3 className="text-base font-bold text-[var(--color-text-main)]">
                  Historique Deep Work
                </h3>
              </div>

              {focusSessions.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-xs text-[var(--color-text-muted)]">Aucune session enregistrée pour le moment.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {focusSessions.slice(0, 5).map((session) => (
                    <div
                      key={session.id}
                      className="p-3.5 rounded-2xl bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)]"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-[var(--color-text-main)]">
                          {session.durationMinutes} min
                        </span>
                        <span className="text-[10px] text-[var(--color-text-muted)]">
                          {session.completedAt.split('T')[0]}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--color-text-muted)] truncate">
                        {session.goalTitle}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 mt-6 border-t border-[var(--color-border-subtle)]">
              <button
                className="bento-btn-secondary w-full"
                onClick={() => setActiveTab('planner')}
              >
                <Calendar size={14} />
                <span>Lancer un Focus</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
