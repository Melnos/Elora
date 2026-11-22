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
      {/* Grille Bento Asymétrique Haute Fidélité */}
      <div className="bento-layout-grid">
        {/* CARTE 1 : BENTO HERO - Briefing Quotidien (7 cols sur desktop) */}
        <div className="bento-item bento-hero-span relative overflow-hidden">
          <div className="bento-card-bg-glow" />
          <div className="bento-card-content flex flex-col justify-between h-full">
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FF6A00]/15 text-[#FF6A00] border border-[#FF6A00]/25 text-xs font-black mb-4 shadow-sm">
                <Sparkles size={14} className="text-[#FF6A00] animate-pulse" />
                <span>Briefing Quotidien • Système Hybride Prêt</span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-[var(--color-text-main)] tracking-tight">
                Bonjour, {profile.name}.
              </h1>
              <p className="text-sm sm:text-base text-[var(--color-text-muted)] mt-3 leading-relaxed max-w-xl">
                Cap stratégique : <span className="text-[var(--color-text-main)] font-bold">« {profile.currentObjective} »</span>.
                {pendingHighTasks.length > 0 ? (
                  <span className="block mt-1 text-[#FF6A00] font-semibold">
                    ⚡ {pendingHighTasks.length} action(s) prioritaire(s) requièrent votre focus aujourd'hui.
                  </span>
                ) : (
                  <span className="block mt-1 text-emerald-500 font-semibold">
                    ✨ Toutes vos priorités immédiates sont à jour.
                  </span>
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-6 mt-auto">
              <button
                className="bento-btn-primary shadow-lg hover:shadow-orange-500/25 transition-all"
                onClick={() => setActiveTab('ai')}
              >
                <Sparkles size={16} />
                <span>Consulter ELORA (IA)</span>
              </button>
              <button
                className="bento-link-action px-4 py-2.5 rounded-2xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-xs font-bold text-[var(--color-text-main)] hover:border-[#FF6A00] transition-all flex items-center gap-2"
                onClick={() => setActiveTab('planner')}
              >
                <span>Accéder au Planner</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* CARTE 2 : BENTO FOCUS - Quick Deep Work Launch (5 cols sur desktop) */}
        <div className="bento-item bento-focus-span relative overflow-hidden">
          <div className="bento-card-content flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/25 text-xs font-bold shadow-sm">
                <Flame size={14} className="text-amber-500" />
                <span>Deep Work Studio</span>
              </div>
              <span className="text-xs font-black text-[var(--color-text-muted)] bg-[var(--color-bg-surface-elevated)] px-2.5 py-1 rounded-lg">
                25 min
              </span>
            </div>

            <div className="my-auto text-center py-6">
              <div className="relative inline-flex items-center justify-center w-28 h-28 rounded-full border-4 border-amber-500/30 bg-[var(--color-bg-base)] shadow-inner">
                <span className="text-3xl font-black text-[var(--color-text-main)] font-mono tracking-tight">25:00</span>
              </div>
              <h3 className="text-base font-bold text-[var(--color-text-main)] mt-4">Session de Concentration</h3>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">Éliminez les distractions et avancez sur votre cap</p>
            </div>

            <button
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg hover:shadow-amber-500/25 transition-all cursor-pointer"
              onClick={() => setActiveTab('planner')}
            >
              <Play size={16} fill="currentColor" />
              <span>Démarrer le Focus</span>
            </button>
          </div>
        </div>

        {/* CARTE 3 : BENTO PRIORITÉS - Tâches immédiates (6 cols) */}
        <div className="bento-item bento-half-span">
          <div className="bento-card-content flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-[#FF6A00] shadow-sm">
                    <Clock size={18} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[var(--color-text-main)]">Priorités Immédiates</h2>
                    <p className="text-[11px] text-[var(--color-text-muted)]">Actions directes recommandées</p>
                  </div>
                </div>
                <button
                  className="px-3 py-1.5 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-xs font-bold text-[#FF6A00] hover:border-[#FF6A00] flex items-center gap-1.5 transition-all cursor-pointer"
                  onClick={() => setActiveTab('planner')}
                >
                  <span>Planner</span>
                  <ArrowRight size={13} />
                </button>
              </div>

              {pendingHighTasks.length === 0 ? (
                <div className="py-10 text-center">
                  <CheckCircle2 size={36} className="text-emerald-500 mx-auto mb-2 opacity-90" />
                  <p className="text-xs text-[var(--color-text-muted)]">Toutes vos priorités sont à jour pour le moment.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingHighTasks.map((t) => (
                    <div
                      key={t.id}
                      className="p-3.5 rounded-2xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] flex items-center justify-between gap-3 hover:border-[var(--color-border-strong)] transition-all shadow-sm"
                    >
                      <button
                        className="w-6 h-6 rounded-lg border-2 border-[var(--color-border-strong)] flex items-center justify-center shrink-0 hover:border-emerald-500 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                        onClick={() => toggleTaskCompleted(t.id)}
                        title="Marquer comme terminée"
                      >
                        {t.completed && <Check size={14} className="text-emerald-500 stroke-[3]" />}
                      </button>
                      <div className="flex-1 min-w-0 pr-2">
                        <span className="text-xs font-bold text-[var(--color-text-main)] block leading-snug">
                          {t.title}
                        </span>
                        <span className="text-[10px] text-[var(--color-text-muted)] mt-0.5 inline-block">
                          {t.category}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-xl bg-[#FF6A00]/15 text-[#FF6A00] border border-[#FF6A00]/25 shrink-0 flex items-center gap-1">
                        <Calendar size={11} />
                        {t.dueDate}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 mt-auto">
              <button
                className="w-full py-2.5 rounded-xl border border-dashed border-[var(--color-border-strong)] text-xs font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:border-[var(--color-text-main)] transition-all flex items-center justify-center gap-1.5"
                onClick={() => setActiveTab('planner')}
              >
                <span>+ Ajouter une nouvelle priorité</span>
              </button>
            </div>
          </div>
        </div>

        {/* CARTE 4 : BENTO OBJECTIFS - Trajectoire de progression (6 cols) */}
        <div className="bento-item bento-half-span">
          <div className="bento-card-content flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-400 shadow-sm">
                    <Target size={18} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[var(--color-text-main)]">Trajectoire & Objectif</h2>
                    <p className="text-[11px] text-[var(--color-text-muted)]">Avancement stratégique mesuré</p>
                  </div>
                </div>
                <button
                  className="px-3 py-1.5 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-xs font-bold text-violet-400 hover:border-violet-500 flex items-center gap-1.5 transition-all cursor-pointer"
                  onClick={() => setActiveTab('progress')}
                >
                  <span>Bilan</span>
                  <ArrowRight size={13} />
                </button>
              </div>

              {primaryGoal ? (
                <div className="p-5 rounded-2xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] space-y-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-violet-500/20 text-violet-400 inline-block mb-1.5">
                        {primaryGoal.category}
                      </span>
                      <h3 className="text-sm sm:text-base font-bold text-[var(--color-text-main)] leading-snug">
                        {primaryGoal.title}
                      </h3>
                      <p className="text-xs text-[var(--color-text-muted)] mt-1 flex items-center gap-1.5">
                        <Calendar size={12} />
                        Échéance : {primaryGoal.targetDate}
                      </p>
                    </div>
                    <span className="text-2xl font-black text-[#FF6A00] font-mono">
                      {primaryGoal.progressPercentage}%
                    </span>
                  </div>

                  {/* Barre de progression Apple */}
                  <div className="w-full h-3 rounded-full bg-[var(--color-bg-base)] overflow-hidden p-0.5 border border-[var(--color-border-subtle)]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#FF6A00] to-amber-400 transition-all duration-700 shadow-sm"
                      style={{ width: `${primaryGoal.progressPercentage}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] font-medium pt-1">
                    <span>Jalons complétés</span>
                    <span className="font-bold text-[var(--color-text-main)]">
                      {primaryGoal.milestones.filter((m) => m.completed).length} sur {primaryGoal.milestones.length}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="py-10 text-center">
                  <p className="text-xs text-[var(--color-text-muted)]">Aucun objectif actif défini.</p>
                </div>
              )}
            </div>

            <div className="pt-4 mt-auto flex justify-end">
              <button
                className="text-xs font-bold text-[#FF6A00] hover:underline flex items-center gap-1.5 cursor-pointer"
                onClick={() => setActiveTab('progress')}
              >
                <span>Consulter le bilan détaillé</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* CARTE 5 : BENTO OPPORTUNITÉ - Mise en avant vérifiée (12 cols) */}
        {featuredOpportunity && (
          <div className="bento-item bento-full-span p-6 sm:p-8 bg-gradient-to-br from-[var(--color-bg-surface)] via-[var(--color-bg-surface)] to-orange-500/10 border-2 border-[#FF6A00]/30 shadow-xl">
            <div className="bento-card-content">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#FF6A00]/20 text-[#FF6A00] border border-[#FF6A00]/30 text-xs font-black shadow-sm">
                      <Award size={13} />
                      <span>Opportunité en Vedette</span>
                    </span>
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                      {featuredOpportunity.matchScore}% de compatibilité
                    </span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-black text-[var(--color-text-main)]">
                    {featuredOpportunity.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[var(--color-text-muted)] leading-relaxed max-w-2xl">
                    Organisé par <span className="font-bold text-[var(--color-text-main)]">{featuredOpportunity.organization}</span> • {featuredOpportunity.matchReason}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <button
                    className="px-5 py-3 rounded-2xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-xs font-bold text-[var(--color-text-main)] hover:border-[#FF6A00] transition-all flex items-center gap-2 shadow-sm cursor-pointer"
                    onClick={() => {
                      addOpportunityToPlanner(featuredOpportunity);
                      setActiveTab('planner');
                    }}
                  >
                    <Calendar size={15} />
                    <span>Ajouter au Planner</span>
                  </button>
                  <button
                    className="px-5 py-3 rounded-2xl bg-gradient-to-r from-[#FF6A00] to-[#EE5A24] text-white text-xs font-black flex items-center gap-2 shadow-lg hover:shadow-orange-500/25 transition-all cursor-pointer"
                    onClick={() => setActiveTab('ai')}
                  >
                    <Sparkles size={15} />
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
