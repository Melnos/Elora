import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Clock,
  Compass,
  Target,
  Play,
  Calendar,
  Check,
  Flame,
} from 'lucide-react';

export const HomeScreen: React.FC = () => {
  const {
    profile,
    tasks,
    goals,
    opportunities,
    setActiveTab,
    toggleTaskCompleted,
    addOpportunityToPlanner,
  } = useApp();

  // Filtrer les priorités réelles (tâches prioritaires non complétées, max 3)
  const pendingHighTasks = tasks
    .filter((t) => !t.completed && (t.priority === 'high' || t.priority === 'medium'))
    .slice(0, 3);

  // Objectif principal actif
  const primaryGoal = goals.find((g) => !g.completed) || goals[0];

  // Opportunité en vedette
  const featuredOpportunity = opportunities.find((o) => o.saved) || opportunities[0];

  return (
    <div className="bento-viewport">
      {/* Grille Bento Asymétrique */}
      <div className="bento-layout-grid">
        {/* CARTE 1 : BENTO HERO - Briefing Quotidien (7 cols sur desktop) */}
        <div className="bento-item bento-hero-span">
          <div className="bento-card-bg-glow" />
          <div className="bento-card-content flex flex-col justify-between h-full">
            <div>
              <div className="bento-tag">
                <Sparkles size={13} className="text-[var(--color-accent)]" />
                <span>Briefing Quotidien</span>
              </div>
              <h1 className="bento-hero-title">
                Bonjour, {profile.name}.
              </h1>
              <p className="bento-hero-subtitle">
                Votre cap actuel : <span className="text-[var(--color-text-main)] font-semibold">« {profile.currentObjective} »</span>.
                {pendingHighTasks.length > 0 ? (
                  <span> {pendingHighTasks.length} action(s) prioritaire(s) attendent votre attention.</span>
                ) : (
                  <span> Toutes vos actions prioritaires sont accomplies.</span>
                )}
              </p>
            </div>

            <div className="bento-hero-footer">
              <button
                className="bento-btn-primary"
                onClick={() => setActiveTab('ai')}
              >
                <Sparkles size={16} />
                <span>Consulter ELORA</span>
              </button>
              <button
                className="bento-link-action"
                onClick={() => setActiveTab('planner')}
              >
                <span>Accéder au Planner</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* CARTE 2 : BENTO FOCUS - Quick Deep Work Launch (5 cols sur desktop) */}
        <div className="bento-item bento-focus-span">
          <div className="bento-card-content flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <div className="bento-tag">
                <Flame size={13} className="text-amber-500" />
                <span>Deep Work</span>
              </div>
              <span className="text-xs font-semibold text-[var(--color-text-muted)]">25 min</span>
            </div>

            <div className="my-auto text-center py-4">
              <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-full border-2 border-[var(--color-border-subtle)] bg-[var(--color-bg-base)]">
                <span className="text-2xl font-black text-[var(--color-text-main)] font-mono">25:00</span>
              </div>
              <h3 className="text-sm font-bold text-[var(--color-text-main)] mt-3">Session de Focus</h3>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Éliminez les distractions et avancez sur votre objectif</p>
            </div>

            <button
              className="bento-btn-secondary w-full"
              onClick={() => setActiveTab('planner')}
            >
              <Play size={15} />
              <span>Démarrer le Focus</span>
            </button>
          </div>
        </div>

        {/* CARTE 3 : BENTO PRIORITÉS - Tâches immédiates (6 cols) */}
        <div className="bento-item bento-half-span">
          <div className="bento-card-content flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] flex items-center justify-center text-[var(--color-accent)]">
                  <Clock size={15} />
                </div>
                <h2 className="text-base font-bold text-[var(--color-text-main)]">Priorités Immédiates</h2>
              </div>
              <button
                className="text-xs font-semibold text-[var(--color-accent)] hover:underline flex items-center gap-1"
                onClick={() => setActiveTab('planner')}
              >
                <span>Planner</span>
                <ArrowRight size={13} />
              </button>
            </div>

            {pendingHighTasks.length === 0 ? (
              <div className="my-auto py-8 text-center">
                <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="text-xs text-[var(--color-text-muted)]">Toutes vos priorités sont à jour pour le moment.</p>
              </div>
            ) : (
              <div className="space-y-2.5 my-auto">
                {pendingHighTasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 rounded-2xl bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] flex items-center justify-between gap-3 hover:border-[var(--color-border-strong)] transition-colors"
                  >
                    <button
                      className="w-5 h-5 rounded-md border border-[var(--color-border-strong)] flex items-center justify-center shrink-0 hover:border-[var(--color-accent)] transition-colors"
                      onClick={() => toggleTaskCompleted(t.id)}
                      title="Marquer comme terminée"
                    >
                      {t.completed && <Check size={13} className="text-emerald-500" />}
                    </button>
                    <span className="text-xs font-medium text-[var(--color-text-main)] flex-1 truncate">
                      {t.title}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                      {t.dueDate}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* CARTE 4 : BENTO OBJECTIFS - Trajectoire de progression (6 cols) */}
        <div className="bento-item bento-half-span">
          <div className="bento-card-content flex flex-col justify-between h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] flex items-center justify-center text-[var(--color-accent)]">
                  <Target size={15} />
                </div>
                <h2 className="text-base font-bold text-[var(--color-text-main)]">Trajectoire & Objectif</h2>
              </div>
              <button
                className="text-xs font-semibold text-[var(--color-accent)] hover:underline flex items-center gap-1"
                onClick={() => setActiveTab('progress')}
              >
                <span>Bilan</span>
                <ArrowRight size={13} />
              </button>
            </div>

            {primaryGoal ? (
              <div className="p-4 rounded-2xl bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] my-auto space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--color-text-main)]">{primaryGoal.title}</h3>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Échéance : {primaryGoal.targetDate}</p>
                  </div>
                  <span className="text-base font-black text-[var(--color-accent)] font-mono">
                    {primaryGoal.progressPercentage}%
                  </span>
                </div>

                {/* Barre de progression Apple */}
                <div className="w-full h-2 rounded-full bg-[var(--color-bg-surface-elevated)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--color-accent)] transition-all duration-500"
                    style={{ width: `${primaryGoal.progressPercentage}%` }}
                  />
                </div>

                <div className="text-[11px] text-[var(--color-text-muted)]">
                  Jalons complétés : {primaryGoal.milestones.filter((m) => m.completed).length} sur {primaryGoal.milestones.length}
                </div>
              </div>
            ) : (
              <div className="my-auto text-center py-6">
                <p className="text-xs text-[var(--color-text-muted)]">Aucun objectif actif défini.</p>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                className="bento-link-action"
                onClick={() => setActiveTab('progress')}
              >
                <span>Détails de l'évolution</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* CARTE 5 : BENTO OPPORTUNITÉ - Mise en avant vérifiée (12 cols) */}
        {featuredOpportunity && (
          <div className="bento-item bento-full-span">
            <div className="bento-card-content">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="bento-tag-spotlight">
                      <Compass size={13} />
                      <span>Opportunité en Vedette</span>
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      {featuredOpportunity.matchScore}% de compatibilité
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-[var(--color-text-main)]">
                    {featuredOpportunity.title}
                  </h3>
                  <p className="text-xs text-[var(--color-text-muted)] line-clamp-2">
                    Organisé par <span className="font-semibold text-[var(--color-text-main)]">{featuredOpportunity.organization}</span> • {featuredOpportunity.matchReason}
                  </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    className="bento-btn-secondary"
                    onClick={() => {
                      addOpportunityToPlanner(featuredOpportunity);
                      setActiveTab('planner');
                    }}
                  >
                    <Calendar size={14} />
                    <span>Ajouter au Planner</span>
                  </button>
                  <button
                    className="bento-btn-primary"
                    onClick={() => setActiveTab('ai')}
                  >
                    <Sparkles size={14} />
                    <span>Préparer avec ELORA</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
