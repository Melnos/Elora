import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Clock,
  Target,
  Calendar,
  Check,
  Flame,
  Award,
  ChevronRight,
} from 'lucide-react';

export const HomeScreen: React.FC = () => {
  const {
    currentUser,
    tasks,
    goals,
    opportunities,
    homeBriefing,
    setActiveTab,
    toggleTaskCompleted,
    addOpportunityToPlanner,
    sendMessage,
  } = useApp();

  // Tâches prioritaires réelles résolues par le moteur contextuel
  const pendingHighTasks = homeBriefing.urgentTasks.length > 0
    ? homeBriefing.urgentTasks
    : tasks.filter((t) => !t.completed).slice(0, 3);

  const pendingAllCount = homeBriefing.metrics.tasksTotalCount - homeBriefing.metrics.tasksDoneCount;

  // Objectif principal actif réel
  const primaryGoal = homeBriefing.priorityGoal || goals.find((g) => !g.completed) || goals[0];

  // Opportunité en vedette réelle
  const featuredOpportunity = opportunities.find((o) => o.saved) || opportunities[0];

  const handleAskAboutTask = async (taskTitle: string) => {
    setActiveTab('ai');
    await sendMessage(`Aide-moi à avancer efficacement sur cette priorité : "${taskTitle}". Quelles sont les étapes concrètes d'exécution et les pièges à éviter ?`);
  };

  return (
    <div className="bento-viewport space-y-6 pb-6">
      {/* 1. GRAND BRIEFING ÉDITORIAL & PERSONNEL (Cœur d'ELORA) */}
      <section className="relative rounded-2xl sm:rounded-3xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] p-4 sm:p-7 md:p-8 shadow-sm overflow-hidden min-w-0">
        {/* Accentuation sobre et élégante */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--color-accent)] via-[var(--color-accent)]/60 to-transparent opacity-80" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-6 min-w-0">
          <div className="space-y-3 max-w-2xl min-w-0">
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1 rounded-full bg-[var(--color-accent-bg)] text-[var(--color-accent)] text-xs font-semibold border border-[var(--color-accent)]/20">
              <Sparkles size={13} className="shrink-0" />
              <span>Point d'Alignement Quotidien</span>
            </div>

            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold text-[var(--color-text-main)] tracking-tight break-words">
              {homeBriefing.greeting}.
            </h1>

            <p className="text-xs sm:text-sm md:text-base text-[var(--color-text-muted)] leading-relaxed break-words">
              {homeBriefing.summary}
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-[var(--color-text-muted)]">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-[var(--color-accent)] shrink-0" />
                <span>{currentUser ? 'Mémoire synchronisée Cloud' : 'Mémoire locale active'}</span>
              </span>
              <span className="hidden sm:inline">•</span>
              <span>{pendingAllCount} tâche(s) au total dans le Planner</span>
            </div>
          </div>

          {/* Actions d'engagement rapide */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0 w-full sm:w-auto lg:w-56 min-w-0">
            <button
              className="bento-btn-primary w-full justify-center py-2.5 sm:py-3 px-4 text-xs font-bold shadow-xs transition-all cursor-pointer"
              onClick={() => setActiveTab('ai')}
            >
              <Sparkles size={14} className="shrink-0" />
              <span>Consulter ELORA</span>
            </button>

            <button
              className="w-full justify-center px-4 py-2 sm:py-2.5 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-xs font-semibold text-[var(--color-text-main)] hover:border-[var(--color-border-strong)] transition-colors flex items-center gap-2 cursor-pointer"
              onClick={() => setActiveTab('planner')}
            >
              <Flame size={14} className="text-[var(--color-accent)] shrink-0" />
              <span className="truncate">Démarrer un Focus (25 min)</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. COMPOSITION CENTRALE : PRIORITÉS CONTEXTUELLES & TRAJECTOIRE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 min-w-0">
        {/* Volet Gauche : Priorités Immédiates (7 colonnes) */}
        <section className="lg:col-span-7 rounded-2xl sm:rounded-3xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] p-4 sm:p-6 md:p-7 shadow-sm flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-[var(--color-border-subtle)] gap-2">
              <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] flex items-center justify-center text-[var(--color-accent)] shrink-0">
                  <Clock size={15} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm sm:text-base font-bold text-[var(--color-text-main)] truncate">
                    Priorités Immédiates
                  </h2>
                  <p className="text-[10px] sm:text-[11px] text-[var(--color-text-muted)] truncate">
                    Actions clés sélectionnées pour aujourd'hui
                  </p>
                </div>
              </div>

              <button
                className="text-xs font-semibold text-[var(--color-accent)] hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
                onClick={() => setActiveTab('planner')}
              >
                <span>Planner</span>
                <ChevronRight size={13} />
              </button>
            </div>

            {pendingHighTasks.length === 0 ? (
              <div className="py-8 sm:py-10 text-center">
                <CheckCircle2 size={32} className="text-[var(--color-accent)] mx-auto mb-2 opacity-80" />
                <h3 className="text-xs font-bold text-[var(--color-text-main)]">Toutes vos priorités sont à jour</h3>
                <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                  Prenez de l'avance en ajoutant une nouvelle action depuis le Planner.
                </p>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-2.5">
                {pendingHighTasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] hover:border-[var(--color-border-strong)] transition-all flex items-start sm:items-center justify-between gap-2.5 sm:gap-3 group min-w-0"
                  >
                    <button
                      className="w-5 h-5 rounded-lg border border-[var(--color-border-strong)] flex items-center justify-center shrink-0 hover:border-[var(--color-accent)] transition-colors cursor-pointer mt-0.5 sm:mt-0"
                      onClick={() => toggleTaskCompleted(t.id)}
                      title="Cocher comme terminée"
                    >
                      {t.completed && <Check size={12} className="text-[var(--color-accent)]" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-semibold text-[var(--color-text-main)] block break-words leading-snug">
                        {t.title}
                      </span>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-[10px] text-[var(--color-text-muted)]">
                        <span className="flex items-center gap-1 shrink-0">
                          <Calendar size={10} />
                          <span>{t.dueDate}</span>
                        </span>
                        <span>•</span>
                        <span className="font-medium text-[var(--color-accent)] shrink-0">{t.category}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-center">
                      <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md uppercase tracking-wider ${t.priority === 'high'
                        ? 'bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/20'
                        : 'bg-[var(--color-bg-surface)] text-[var(--color-text-muted)] border border-[var(--color-border-subtle)]'
                        }`}>
                        {t.priority === 'high' ? 'Urgent' : 'Normal'}
                      </span>

                      <button
                        onClick={() => handleAskAboutTask(t.title)}
                        className="p-1 sm:p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:bg-[var(--color-bg-surface)] transition-all cursor-pointer"
                        title="Préparer cette tâche avec ELORA"
                      >
                        <Sparkles size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3.5 mt-3.5 border-t border-[var(--color-border-subtle)] flex items-center justify-between text-xs gap-2">
            <span className="text-[var(--color-text-muted)] text-[11px] sm:text-xs">
              {pendingHighTasks.length} sur {pendingAllCount} active(s)
            </span>
            <button
              className="font-semibold text-[var(--color-accent)] hover:underline flex items-center gap-1 text-[11px] sm:text-xs shrink-0 cursor-pointer"
              onClick={() => setActiveTab('planner')}
            >
              <span>Gérer dans le Planner</span>
              <ArrowRight size={12} />
            </button>
          </div>
        </section>

        {/* Volet Droit : Trajectoire & Objectif Majeur (5 colonnes) */}
        <section className="lg:col-span-5 rounded-2xl sm:rounded-3xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] p-4 sm:p-6 md:p-7 shadow-sm flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-[var(--color-border-subtle)] gap-2">
              <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] flex items-center justify-center text-[var(--color-accent)] shrink-0">
                  <Target size={15} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm sm:text-base font-bold text-[var(--color-text-main)] truncate">
                    Trajectoire Stratégique
                  </h2>
                  <p className="text-[10px] sm:text-[11px] text-[var(--color-text-muted)] truncate">
                    Cap mesuré à partir de vos jalons
                  </p>
                </div>
              </div>

              <button
                className="text-xs font-semibold text-[var(--color-accent)] hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
                onClick={() => setActiveTab('progress')}
              >
                <span>Bilan</span>
                <ChevronRight size={13} />
              </button>
            </div>

            {primaryGoal ? (
              <div className="space-y-3.5 min-w-0">
                <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-accent)] block mb-0.5">
                        {primaryGoal.category}
                      </span>
                      <h3 className="text-xs sm:text-sm font-bold text-[var(--color-text-main)] leading-snug break-words">
                        {primaryGoal.title}
                      </h3>
                      <p className="text-[10px] sm:text-[11px] text-[var(--color-text-muted)] mt-0.5">
                        Échéance : <strong className="text-[var(--color-text-main)]">{primaryGoal.targetDate}</strong>
                      </p>
                    </div>
                    <span className="text-lg sm:text-xl font-extrabold text-[var(--color-accent)] font-mono shrink-0">
                      {primaryGoal.progressPercentage}%
                    </span>
                  </div>

                  {/* Barre de progression noble */}
                  <div className="w-full h-1.5 sm:h-2 rounded-full bg-[var(--color-bg-base)] overflow-hidden my-2.5">
                    <div
                      className="h-full rounded-full bg-[var(--color-accent)] transition-all duration-500"
                      style={{ width: `${primaryGoal.progressPercentage}%` }}
                    />
                  </div>

                  <div className="text-[10px] sm:text-[11px] text-[var(--color-text-muted)] flex items-center justify-between">
                    <span>Jalons accomplis :</span>
                    <strong className="text-[var(--color-text-main)]">
                      {primaryGoal.milestones.filter((m) => m.completed).length} / {primaryGoal.milestones.length}
                    </strong>
                  </div>
                </div>

                {/* Liste des jalons réels de cet objectif */}
                <div className="space-y-1.5 min-w-0">
                  <span className="text-[10px] sm:text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider block px-1">
                    Jalons Réels
                  </span>
                  {primaryGoal.milestones.slice(0, 3).map((m) => (
                    <div
                      key={m.id}
                      className="flex items-start gap-2 p-2 rounded-xl text-xs text-[var(--color-text-main)] bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] min-w-0"
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${m.completed ? 'bg-[var(--color-accent)]' : 'border border-[var(--color-border-strong)]'}`} />
                      <span className={`break-words flex-1 leading-snug ${m.completed ? 'line-through text-[var(--color-text-muted)]' : 'font-medium'}`}>
                        {m.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-[var(--color-text-muted)]">
                Aucun objectif actif configuré.
              </div>
            )}
          </div>

          <div className="pt-3.5 mt-3.5 border-t border-[var(--color-border-subtle)] flex justify-end">
            <button
              className="text-xs font-semibold text-[var(--color-accent)] hover:underline flex items-center gap-1 cursor-pointer"
              onClick={() => setActiveTab('progress')}
            >
              <span>Consulter l'évolution complète</span>
              <ArrowRight size={12} />
            </button>
          </div>
        </section>
      </div>

      {/* 3. SECTION VEILLE & OPPORTUNITÉ STRATÉGIQUE CONTEXTUALISÉE */}
      {featuredOpportunity && (
        <section className="rounded-2xl sm:rounded-3xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] p-4 sm:p-6 md:p-7 shadow-sm min-w-0">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-6 min-w-0">
            <div className="space-y-2 max-w-3xl min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-0.5 rounded-full bg-[var(--color-accent-bg)] text-[var(--color-accent)] text-[11px] sm:text-xs font-semibold border border-[var(--color-accent)]/20 shrink-0">
                  <Award size={12} />
                  <span>Veille Recommandée</span>
                </span>
                <span className="text-[11px] sm:text-xs font-semibold text-[var(--color-accent)] font-mono">
                  {featuredOpportunity.matchScore}% de compatibilité avec votre profil
                </span>
              </div>

              <h3 className="text-base sm:text-lg md:text-xl font-bold text-[var(--color-text-main)] break-words">
                {featuredOpportunity.title}
              </h3>

              <p className="text-xs sm:text-sm text-[var(--color-text-muted)] leading-relaxed break-words">
                Organisé par <strong className="text-[var(--color-text-main)] font-semibold">{featuredOpportunity.organization}</strong> • {featuredOpportunity.matchReason}
              </p>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {featuredOpportunity.skillsRequired.map((s, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[var(--color-bg-surface-elevated)] text-[var(--color-text-muted)] border border-[var(--color-border-subtle)]"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0 w-full lg:w-auto min-w-0">
              <button
                className="w-full sm:w-auto justify-center px-4 py-2 sm:py-2.5 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-xs font-semibold text-[var(--color-text-main)] hover:border-[var(--color-border-strong)] transition-colors flex items-center gap-1.5 cursor-pointer"
                onClick={() => {
                  addOpportunityToPlanner(featuredOpportunity);
                  setActiveTab('planner');
                }}
              >
                <Calendar size={13} />
                <span>Ajouter au Planner</span>
              </button>
              <button
                className="bento-btn-primary w-full sm:w-auto justify-center py-2 sm:py-2.5 px-4 text-xs font-bold cursor-pointer"
                onClick={() => setActiveTab('ai')}
              >
                <Sparkles size={13} />
                <span>Préparer avec ELORA</span>
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
