import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Clock,
  Target,
  Play,
  Calendar,
  Check,
  Flame,
  Award,
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

  // Filtrer les priorités réelles (tâches non complétées, max 3)
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
          <div className="bento-card-content flex flex-col justify-between h-full">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-accent-bg)] text-[var(--color-accent)] border border-[var(--color-accent)]/20 text-xs font-semibold mb-4">
                <Sparkles size={13} />
                <span>Briefing Quotidien</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[var(--color-text-main)] tracking-tight">
                Bonjour, {profile.name}.
              </h1>
              <p className="text-sm text-[var(--color-text-muted)] mt-2.5 leading-relaxed max-w-xl">
                Cap actuel : <span className="text-[var(--color-text-main)] font-semibold">« {profile.currentObjective} »</span>.
                {pendingHighTasks.length > 0 ? (
                  <span className="block mt-1 font-medium">
                    {pendingHighTasks.length} action(s) prioritaire(s) à accomplir aujourd'hui.
                  </span>
                ) : (
                  <span className="block mt-1 text-emerald-600 dark:text-emerald-400 font-medium">
                    Toutes vos priorités immédiates sont à jour.
                  </span>
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-6 mt-auto">
              <button
                className="bento-btn-primary"
                onClick={() => setActiveTab('ai')}
              >
                <Sparkles size={15} />
                <span>Consulter ELORA</span>
              </button>
              <button
                className="px-4 py-2.5 rounded-full bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-xs font-semibold text-[var(--color-text-main)] hover:border-[var(--color-border-strong)] transition-colors flex items-center gap-1.5"
                onClick={() => setActiveTab('planner')}
              >
                <span>Accéder au Planner</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* CARTE 2 : BENTO FOCUS - Quick Deep Work Launch (5 cols sur desktop) */}
        <div className="bento-item bento-focus-span">
          <div className="bento-card-content flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-bg-surface-elevated)] text-[var(--color-text-muted)] text-xs font-semibold border border-[var(--color-border-subtle)]">
                <Flame size={13} className="text-[var(--color-accent)]" />
                <span>Deep Work</span>
              </div>
              <span className="text-xs font-semibold text-[var(--color-text-muted)]">
                25 min
              </span>
            </div>

            <div className="my-auto text-center py-5">
              <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-full border-2 border-[var(--color-border-strong)] bg-[var(--color-bg-base)]">
                <span className="text-2xl font-extrabold text-[var(--color-text-main)] font-mono">25:00</span>
              </div>
              <h3 className="text-sm font-bold text-[var(--color-text-main)] mt-3">Session de Focus</h3>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Éliminez les distractions et avancez</p>
            </div>

            <button
              className="w-full py-2.5 px-4 rounded-xl bg-[var(--color-text-main)] text-[var(--color-bg-base)] font-bold text-xs flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              onClick={() => setActiveTab('planner')}
            >
              <Play size={14} fill="currentColor" />
              <span>Démarrer le Focus</span>
            </button>
          </div>
        </div>

        {/* CARTE 3 : BENTO PRIORITÉS - Tâches immédiates (6 cols) */}
        <div className="bento-item bento-half-span">
          <div className="bento-card-content flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] flex items-center justify-center text-[var(--color-accent)]">
                    <Clock size={16} />
                  </div>
                  <h2 className="text-base font-bold text-[var(--color-text-main)]">Priorités Immédiates</h2>
                </div>
                <button
                  className="text-xs font-semibold text-[var(--color-accent)] hover:underline flex items-center gap-1"
                  onClick={() => setActiveTab('planner')}
                >
                  <span>Planner</span>
                  <ArrowRight size={12} />
                </button>
              </div>

              {pendingHighTasks.length === 0 ? (
                <div className="py-8 text-center">
                  <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-2 opacity-80" />
                  <p className="text-xs text-[var(--color-text-muted)]">Toutes vos priorités sont à jour.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingHighTasks.map((t) => (
                    <div
                      key={t.id}
                      className="p-3 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] flex items-center justify-between gap-3 hover:border-[var(--color-border-strong)] transition-colors"
                    >
                      <button
                        className="w-5 h-5 rounded-md border border-[var(--color-border-strong)] flex items-center justify-center shrink-0 hover:border-emerald-500 transition-colors"
                        onClick={() => toggleTaskCompleted(t.id)}
                        title="Marquer comme terminée"
                      >
                        {t.completed && <Check size={13} className="text-emerald-600 dark:text-emerald-400" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium text-[var(--color-text-main)] block leading-snug">
                          {t.title}
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[var(--color-bg-base)] text-[var(--color-text-muted)] border border-[var(--color-border-subtle)] shrink-0 flex items-center gap-1">
                        <Calendar size={10} />
                        {t.dueDate}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 mt-3">
              <button
                className="w-full py-2 rounded-lg border border-dashed border-[var(--color-border-subtle)] text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:border-[var(--color-border-strong)] transition-colors"
                onClick={() => setActiveTab('planner')}
              >
                + Ajouter une priorité
              </button>
            </div>
          </div>
        </div>

        {/* CARTE 4 : BENTO OBJECTIFS - Trajectoire de progression (6 cols) */}
        <div className="bento-item bento-half-span">
          <div className="bento-card-content flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] flex items-center justify-center text-[var(--color-accent)]">
                    <Target size={16} />
                  </div>
                  <h2 className="text-base font-bold text-[var(--color-text-main)]">Trajectoire & Objectif</h2>
                </div>
                <button
                  className="text-xs font-semibold text-[var(--color-accent)] hover:underline flex items-center gap-1"
                  onClick={() => setActiveTab('progress')}
                >
                  <span>Bilan</span>
                  <ArrowRight size={12} />
                </button>
              </div>

              {primaryGoal ? (
                <div className="p-4 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-semibold text-[var(--color-accent)] uppercase tracking-wider block mb-1">
                        {primaryGoal.category}
                      </span>
                      <h3 className="text-sm font-bold text-[var(--color-text-main)]">
                        {primaryGoal.title}
                      </h3>
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                        Échéance : {primaryGoal.targetDate}
                      </p>
                    </div>
                    <span className="text-lg font-bold text-[var(--color-accent)] font-mono">
                      {primaryGoal.progressPercentage}%
                    </span>
                  </div>

                  {/* Barre de progression sobre */}
                  <div className="w-full h-2 rounded-full bg-[var(--color-bg-base)] overflow-hidden">
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
                <div className="py-8 text-center">
                  <p className="text-xs text-[var(--color-text-muted)]">Aucun objectif actif défini.</p>
                </div>
              )}
            </div>

            <div className="pt-3 mt-3 flex justify-end">
              <button
                className="text-xs font-semibold text-[var(--color-accent)] hover:underline flex items-center gap-1"
                onClick={() => setActiveTab('progress')}
              >
                <span>Détails de l'évolution</span>
                <ArrowRight size={12} />
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
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--color-accent-bg)] text-[var(--color-accent)] text-[11px] font-semibold border border-[var(--color-accent)]/20">
                      <Award size={12} />
                      <span>Opportunité en Vedette</span>
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      {featuredOpportunity.matchScore}% de compatibilité
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-[var(--color-text-main)]">
                    {featuredOpportunity.title}
                  </h3>
                  <p className="text-xs text-[var(--color-text-muted)] max-w-2xl leading-relaxed">
                    Organisé par <span className="font-semibold text-[var(--color-text-main)]">{featuredOpportunity.organization}</span> • {featuredOpportunity.matchReason}
                  </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    className="px-4 py-2 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-xs font-semibold text-[var(--color-text-main)] hover:border-[var(--color-border-strong)] transition-colors flex items-center gap-1.5"
                    onClick={() => {
                      addOpportunityToPlanner(featuredOpportunity);
                      setActiveTab('planner');
                    }}
                  >
                    <Calendar size={13} />
                    <span>Ajouter au Planner</span>
                  </button>
                  <button
                    className="bento-btn-primary"
                    onClick={() => setActiveTab('ai')}
                  >
                    <Sparkles size={13} />
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
