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
    profile,
    tasks,
    goals,
    opportunities,
    setActiveTab,
    toggleTaskCompleted,
    addOpportunityToPlanner,
    sendMessage,
  } = useApp();

  // Tâches prioritaires réelles (non complétées)
  const pendingHighTasks = tasks
    .filter((t) => !t.completed && (t.priority === 'high' || t.priority === 'medium'))
    .slice(0, 3);

  const pendingAllCount = tasks.filter((t) => !t.completed).length;

  // Objectif principal actif
  const primaryGoal = goals.find((g) => !g.completed) || goals[0];

  // Opportunité en vedette
  const featuredOpportunity = opportunities.find((o) => o.saved) || opportunities[0];

  const handleAskAboutTask = async (taskTitle: string) => {
    setActiveTab('ai');
    await sendMessage(`Aide-moi à avancer efficacement sur cette priorité : "${taskTitle}". Quelles sont les étapes concrètes d'exécution et les pièges à éviter ?`);
  };

  return (
    <div className="bento-viewport space-y-6">
      {/* 1. GRAND BRIEFING ÉDITORIAL & PERSONNEL (Cœur d'ELORA) */}
      <section className="relative rounded-3xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] p-6 sm:p-8 md:p-10 shadow-sm overflow-hidden">
        {/* Accentuation sobre et élégante */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--color-accent)] via-[var(--color-accent)]/60 to-transparent opacity-80" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-accent-bg)] text-[var(--color-accent)] text-xs font-semibold border border-[var(--color-accent)]/20">
              <Sparkles size={13} />
              <span>Point d'Alignement Quotidien</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[var(--color-text-main)] tracking-tight">
              Bonjour, {profile.name}.
            </h1>

            <p className="text-sm sm:text-base text-[var(--color-text-muted)] leading-relaxed">
              Votre cap actuel est orienté sur{' '}
              <strong className="text-[var(--color-text-main)] font-semibold">« {profile.currentObjective} »</strong>.
              {pendingHighTasks.length > 0 ? (
                <>
                  {' '}Vous avez <span className="text-[var(--color-accent)] font-bold">{pendingHighTasks.length} priorité(s) majeure(s)</span> à sécuriser aujourd'hui pour maintenir votre cadence d'avancement.
                </>
              ) : (
                <> Vos priorités immédiates sont à jour. Un temps propice pour consolider vos acquis ou approfondir votre veille.</>
              )}
            </p>

            <div className="flex items-center gap-3 pt-1 text-xs text-[var(--color-text-muted)]">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-[var(--color-accent)]" />
                Mémoire active & synchronisée
              </span>
              <span>•</span>
              <span>{pendingAllCount} tâche(s) au total dans le Planner</span>
            </div>
          </div>

          {/* Actions d'engagement rapide */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0 w-full sm:w-auto lg:w-64">
            <button
              className="bento-btn-primary w-full justify-center py-3 px-5 text-xs font-bold shadow-md hover:shadow-lg transition-all"
              onClick={() => setActiveTab('ai')}
            >
              <Sparkles size={15} />
              <span>Consulter ELORA</span>
            </button>

            <button
              className="w-full justify-center px-4 py-2.5 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-xs font-semibold text-[var(--color-text-main)] hover:border-[var(--color-border-strong)] transition-colors flex items-center gap-2"
              onClick={() => setActiveTab('planner')}
            >
              <Flame size={14} className="text-[var(--color-accent)]" />
              <span>Démarrer un Focus (25 min)</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. COMPOSITION CENTRALE : PRIORITÉS CONTEXTUELLES & TRAJECTOIRE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Volet Gauche : Priorités Immédiates (7 colonnes) */}
        <section className="lg:col-span-7 rounded-3xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] p-6 sm:p-7 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[var(--color-border-subtle)]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] flex items-center justify-center text-[var(--color-accent)]">
                  <Clock size={16} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[var(--color-text-main)]">
                    Priorités Immédiates
                  </h2>
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    Actions clés à haute valeur ajoutée sélectionnées pour aujourd'hui
                  </p>
                </div>
              </div>

              <button
                className="text-xs font-semibold text-[var(--color-accent)] hover:underline flex items-center gap-1 shrink-0"
                onClick={() => setActiveTab('planner')}
              >
                <span>Planner</span>
                <ChevronRight size={14} />
              </button>
            </div>

            {pendingHighTasks.length === 0 ? (
              <div className="py-10 text-center">
                <CheckCircle2 size={36} className="text-[var(--color-accent)] mx-auto mb-2 opacity-80" />
                <h3 className="text-xs font-bold text-[var(--color-text-main)]">Toutes vos priorités sont à jour</h3>
                <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                  Prenez de l'avance en ajoutant une nouvelle action depuis le Planner.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {pendingHighTasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-3.5 rounded-2xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] hover:border-[var(--color-border-strong)] transition-all flex items-center justify-between gap-3 group"
                  >
                    <button
                      className="w-5 h-5 rounded-lg border border-[var(--color-border-strong)] flex items-center justify-center shrink-0 hover:border-[var(--color-accent)] transition-colors cursor-pointer"
                      onClick={() => toggleTaskCompleted(t.id)}
                      title="Cocher comme terminée"
                    >
                      {t.completed && <Check size={13} className="text-[var(--color-accent)]" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-semibold text-[var(--color-text-main)] block truncate">
                        {t.title}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[var(--color-text-muted)]">
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />
                          {t.dueDate}
                        </span>
                        <span>•</span>
                        <span className="font-medium text-[var(--color-accent)]">{t.category}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                        t.priority === 'high'
                          ? 'bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/20'
                          : 'bg-[var(--color-bg-surface)] text-[var(--color-text-muted)] border border-[var(--color-border-subtle)]'
                      }`}>
                        {t.priority === 'high' ? 'Urgent' : 'Normal'}
                      </span>

                      <button
                        onClick={() => handleAskAboutTask(t.title)}
                        className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:bg-[var(--color-bg-surface)] transition-all"
                        title="Préparer cette tâche avec ELORA"
                      >
                        <Sparkles size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-[var(--color-border-subtle)] flex items-center justify-between text-xs">
            <span className="text-[var(--color-text-muted)]">
              {pendingHighTasks.length} sur {pendingAllCount} tâche(s) active(s)
            </span>
            <button
              className="font-semibold text-[var(--color-accent)] hover:underline flex items-center gap-1"
              onClick={() => setActiveTab('planner')}
            >
              <span>Gérer dans le Planner</span>
              <ArrowRight size={12} />
            </button>
          </div>
        </section>

        {/* Volet Droit : Trajectoire & Objectif Majeur (5 colonnes) */}
        <section className="lg:col-span-5 rounded-3xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] p-6 sm:p-7 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[var(--color-border-subtle)]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] flex items-center justify-center text-[var(--color-accent)]">
                  <Target size={16} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[var(--color-text-main)]">
                    Trajectoire Stratégique
                  </h2>
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    Grand cap mesuré à partir de vos jalons
                  </p>
                </div>
              </div>

              <button
                className="text-xs font-semibold text-[var(--color-accent)] hover:underline flex items-center gap-1 shrink-0"
                onClick={() => setActiveTab('progress')}
              >
                <span>Bilan</span>
                <ChevronRight size={14} />
              </button>
            </div>

            {primaryGoal ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)]">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-accent)] block mb-0.5">
                        {primaryGoal.category}
                      </span>
                      <h3 className="text-sm font-bold text-[var(--color-text-main)] leading-snug">
                        {primaryGoal.title}
                      </h3>
                      <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                        Échéance : <strong>{primaryGoal.targetDate}</strong>
                      </p>
                    </div>
                    <span className="text-xl font-extrabold text-[var(--color-accent)] font-mono shrink-0">
                      {primaryGoal.progressPercentage}%
                    </span>
                  </div>

                  {/* Barre de progression noble */}
                  <div className="w-full h-2 rounded-full bg-[var(--color-bg-base)] overflow-hidden my-3">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[var(--color-accent)] to-[#966723] transition-all duration-500"
                      style={{ width: `${primaryGoal.progressPercentage}%` }}
                    />
                  </div>

                  <div className="text-[11px] text-[var(--color-text-muted)] flex items-center justify-between">
                    <span>Jalons accomplis :</span>
                    <strong className="text-[var(--color-text-main)]">
                      {primaryGoal.milestones.filter((m) => m.completed).length} / {primaryGoal.milestones.length}
                    </strong>
                  </div>
                </div>

                {/* Liste des jalons réels de cet objectif */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider block px-1">
                    Jalons Réels
                  </span>
                  {primaryGoal.milestones.slice(0, 3).map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center gap-2.5 p-2 rounded-xl text-xs text-[var(--color-text-main)] bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)]"
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 ${m.completed ? 'bg-[var(--color-accent)]' : 'border border-[var(--color-border-strong)]'}`} />
                      <span className={`truncate flex-1 ${m.completed ? 'line-through text-[var(--color-text-muted)]' : 'font-medium'}`}>
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

          <div className="pt-4 mt-4 border-t border-[var(--color-border-subtle)] flex justify-end">
            <button
              className="text-xs font-semibold text-[var(--color-accent)] hover:underline flex items-center gap-1"
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
        <section className="rounded-3xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] p-6 sm:p-7 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-3xl">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[var(--color-accent-bg)] text-[var(--color-accent)] text-xs font-semibold border border-[var(--color-accent)]/20">
                  <Award size={13} />
                  <span>Veille Recommandée</span>
                </span>
                <span className="text-xs font-semibold text-[var(--color-accent)] font-mono">
                  {featuredOpportunity.matchScore}% de compatibilité avec votre profil
                </span>
              </div>

              <h3 className="text-lg sm:text-xl font-bold text-[var(--color-text-main)]">
                {featuredOpportunity.title}
              </h3>

              <p className="text-xs sm:text-sm text-[var(--color-text-muted)] leading-relaxed">
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

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0 w-full lg:w-auto">
              <button
                className="w-full sm:w-auto justify-center px-4 py-2.5 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-xs font-semibold text-[var(--color-text-main)] hover:border-[var(--color-border-strong)] transition-colors flex items-center gap-1.5"
                onClick={() => {
                  addOpportunityToPlanner(featuredOpportunity);
                  setActiveTab('planner');
                }}
              >
                <Calendar size={13} />
                <span>Ajouter au Planner</span>
              </button>
              <button
                className="bento-btn-primary w-full sm:w-auto justify-center py-2.5 px-4 text-xs font-bold"
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
