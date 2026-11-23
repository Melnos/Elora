import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  TrendingUp,
  Target,
  Sparkles,
  Flame,
  CheckCircle2,
  BookOpen,
  Calendar,
  Check,
} from 'lucide-react';

export const ProgressScreen: React.FC = () => {
  const {
    tasks,
    goals,
    focusSessions,
    knowledgeDocs,
    toggleMilestone,
    setActiveTab,
    sendMessage,
  } = useApp();

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed);
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

  const totalFocusMinutes = focusSessions.reduce((acc, s) => acc + s.durationMinutes, 0);

  const handleAskProgressReview = async () => {
    setActiveTab('ai');
    await sendMessage(
      'Analyse ma progression globale : taux de complétion des tâches, sessions Deep Work, objectifs en cours et documents enregistrés. Propose-moi une synthèse stratégique de mes accomplissements et mes 3 prochains axes d\'amélioration.'
    );
  };

  return (
    <div className="bento-viewport">
      {/* En-tête de la Page */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <div className="bento-tag mb-2">
            <TrendingUp size={13} className="text-[var(--color-accent)]" />
            <span>Mesure & Évolution</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text-main)] tracking-tight">
            Bilan Réel & Progression
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-1 max-w-xl">
            Indicateurs concrets calculés à partir de vos activités réelles. Aucune statistique artificielle.
          </p>
        </div>

        <button
          className="bento-btn-primary self-start md:self-auto"
          onClick={handleAskProgressReview}
        >
          <Sparkles size={14} />
          <span>Bilan personnalisé ELORA</span>
        </button>
      </div>

      {/* Grille des 4 Grandes Métriques (Sobres et Épurées) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Métrique 1 : Tâches */}
        <div className="p-5 rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
              Tâches Concrétisées
            </span>
            <div className="w-8 h-8 rounded-lg bg-[var(--color-bg-surface-elevated)] text-[var(--color-accent)] flex items-center justify-center">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-[var(--color-text-main)] font-mono">
              {completedTasks.length} <span className="text-sm font-normal text-[var(--color-text-muted)]">/ {totalTasks}</span>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              Taux de complétion : <strong className="text-[var(--color-text-main)]">{taskCompletionRate}%</strong>
            </p>
          </div>
        </div>

        {/* Métrique 2 : Focus */}
        <div className="p-5 rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
              Deep Work
            </span>
            <div className="w-8 h-8 rounded-lg bg-[var(--color-bg-surface-elevated)] text-[var(--color-accent)] flex items-center justify-center">
              <Flame size={16} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-[var(--color-text-main)] font-mono">
              {totalFocusMinutes} <span className="text-sm font-normal text-[var(--color-text-muted)]">min</span>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              {focusSessions.length} session(s) de concentration
            </p>
          </div>
        </div>

        {/* Métrique 3 : Connaissances */}
        <div className="p-5 rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
              Bibliothèque
            </span>
            <div className="w-8 h-8 rounded-lg bg-[var(--color-bg-surface-elevated)] text-[var(--color-accent)] flex items-center justify-center">
              <BookOpen size={16} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-[var(--color-text-main)] font-mono">
              {knowledgeDocs.length}
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              Ressources et fiches indexées
            </p>
          </div>
        </div>

        {/* Métrique 4 : Objectifs */}
        <div className="p-5 rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
              Trajectoire
            </span>
            <div className="w-8 h-8 rounded-lg bg-[var(--color-bg-surface-elevated)] text-[var(--color-accent)] flex items-center justify-center">
              <Target size={16} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-[var(--color-text-main)] font-mono">
              {goals.length}
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              Objectif(s) actif(s)
            </p>
          </div>
        </div>
      </div>

      {/* Grille : Jalons & Objectifs + Historique Deep Work */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Colonne Gauche : Objectifs et Jalons (8 colonnes) */}
        <div className="lg:col-span-8 space-y-5">
          <div className="p-6 rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)]">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-[var(--color-text-main)]">
                Jalons & Réalisations Clés
              </h2>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                Cochez les jalons pour actualiser la trajectoire en temps réel.
              </p>
            </div>

            <div className="space-y-6">
              {goals.map((goal) => (
                <div
                  key={goal.id}
                  className="p-5 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-semibold text-[var(--color-accent)] uppercase tracking-wider block">
                        {goal.category}
                      </span>
                      <h3 className="text-sm font-bold text-[var(--color-text-main)] mt-0.5">
                        {goal.title}
                      </h3>
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                        Échéance : <span className="font-semibold text-[var(--color-text-main)]">{goal.targetDate}</span>
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-2xl font-bold text-[var(--color-accent)] font-mono">
                        {goal.progressPercentage}%
                      </span>
                    </div>
                  </div>

                  {/* Barre de progression sobre */}
                  <div className="w-full h-2 rounded-full bg-[var(--color-bg-base)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--color-accent)] transition-all duration-500"
                      style={{ width: `${goal.progressPercentage}%` }}
                    />
                  </div>

                  {/* Liste des jalons */}
                  <div className="space-y-2 pt-1">
                    {goal.milestones.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => toggleMilestone(goal.id, m.id)}
                        className={`w-full p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                          m.completed
                            ? 'bg-[var(--color-bg-surface)] border-[var(--color-border-subtle)] text-[var(--color-text-main)]'
                            : 'bg-[var(--color-bg-surface)] border-[var(--color-border-subtle)] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)]'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                            m.completed
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'border-[var(--color-border-strong)] bg-[var(--color-bg-base)]'
                          }`}
                        >
                          {m.completed && <Check size={12} />}
                        </div>
                        <span className={`text-xs font-medium flex-1 ${m.completed ? 'text-[var(--color-text-main)] font-semibold' : ''}`}>
                          {m.title}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Colonne Droite : Historique Deep Work (4 colonnes) */}
        <div className="lg:col-span-4 space-y-5">
          <div className="p-6 rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-bg-surface-elevated)] text-[var(--color-accent)] flex items-center justify-center">
                  <Flame size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--color-text-main)]">
                    Historique Deep Work
                  </h3>
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    Sessions récentes
                  </p>
                </div>
              </div>

              {focusSessions.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-xs text-[var(--color-text-muted)]">Aucune session enregistrée.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {focusSessions.map((s) => (
                    <div
                      key={s.id}
                      className="p-3.5 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] space-y-1"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[var(--color-accent)] flex items-center gap-1">
                          <Flame size={11} />
                          {s.durationMinutes} min
                        </span>
                        <span className="text-[10px] text-[var(--color-text-muted)] font-mono">{s.completedAt}</span>
                      </div>
                      <p className="text-xs font-medium text-[var(--color-text-main)]">{s.goalTitle}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 mt-5 border-t border-[var(--color-border-subtle)]">
              <button
                className="bento-btn-secondary w-full"
                onClick={() => setActiveTab('planner')}
              >
                <Calendar size={13} />
                <span>Lancer un Focus</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
