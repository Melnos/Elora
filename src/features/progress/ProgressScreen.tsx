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
    await sendMessage(
      `Fais un bilan synthétique et constructif de mon évolution actuelle sur ELORA :\n- Objectifs en cours : ${goals
        .map((g) => `${g.title} (${g.progressPercentage}%)`)
        .join(', ')}\n- Tâches accomplies : ${completedTasks.length} sur ${totalTasks}\n- Minutes de Focus enregistrées : ${totalFocusMinutes} min\n- Connaissances indexées : ${knowledgeDocs.length} documents\n\nIdentifie mes points forts, mes éventuels retards et les prochaines étapes concrètes à franchir.`
    );
  };

  return (
    <div className="bento-viewport">
      {/* En-tête de la Page */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <div className="bento-tag mb-2">
            <TrendingUp size={13} className="text-[#FF6A00]" />
            <span>Mesure & Évolution</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[var(--color-text-main)] tracking-tight">
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

      {/* Grille Bento des 4 Métriques Apple (4 Couleurs Vibrantes Distinctes) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {/* Métrique 1 : Tâches (Émeraude Vibrant) */}
        <div className="p-7 rounded-3xl bg-gradient-to-br from-[var(--color-bg-surface)] via-[var(--color-bg-surface)] to-emerald-500/10 border border-emerald-500/30 flex flex-col justify-between shadow-md hover:shadow-xl hover:translate-y-[-2px] transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Tâches Concrétisées
            </span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center shadow-inner">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-[var(--color-text-main)] font-mono">
              {completedTasks.length} <span className="text-sm font-medium text-[var(--color-text-muted)]">/ {totalTasks}</span>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-1.5">
              Taux de complétion : <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{taskCompletionRate}%</strong>
            </p>
          </div>
        </div>

        {/* Métrique 2 : Focus (Sunset Orange Électrique) */}
        <div className="p-7 rounded-3xl bg-gradient-to-br from-[var(--color-bg-surface)] via-[var(--color-bg-surface)] to-orange-500/10 border border-orange-500/30 flex flex-col justify-between shadow-md hover:shadow-xl hover:translate-y-[-2px] transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-black uppercase tracking-wider text-[#FF6A00]">
              Deep Work
            </span>
            <div className="w-10 h-10 rounded-2xl bg-[#FF6A00]/15 text-[#FF6A00] flex items-center justify-center shadow-inner">
              <Flame size={18} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-[var(--color-text-main)] font-mono">
              {totalFocusMinutes} <span className="text-sm font-medium text-[var(--color-text-muted)]">min</span>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-1.5">
              {focusSessions.length} session(s) de concentration
            </p>
          </div>
        </div>

        {/* Métrique 3 : Connaissances (Bleu Cyber Saphir) */}
        <div className="p-7 rounded-3xl bg-gradient-to-br from-[var(--color-bg-surface)] via-[var(--color-bg-surface)] to-blue-500/10 border border-blue-500/30 flex flex-col justify-between shadow-md hover:shadow-xl hover:translate-y-[-2px] transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Bibliothèque
            </span>
            <div className="w-10 h-10 rounded-2xl bg-blue-500/15 text-blue-500 flex items-center justify-center shadow-inner">
              <BookOpen size={18} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-[var(--color-text-main)] font-mono">
              {knowledgeDocs.length}
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-1.5">
              Ressources et fiches indexées
            </p>
          </div>
        </div>

        {/* Métrique 4 : Objectifs (Violet Royal Cosmique) */}
        <div className="p-7 rounded-3xl bg-gradient-to-br from-[var(--color-bg-surface)] via-[var(--color-bg-surface)] to-violet-500/10 border border-violet-500/30 flex flex-col justify-between shadow-md hover:shadow-xl hover:translate-y-[-2px] transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-black uppercase tracking-wider text-violet-600 dark:text-violet-400">
              Trajectoire
            </span>
            <div className="w-10 h-10 rounded-2xl bg-violet-500/15 text-violet-500 flex items-center justify-center shadow-inner">
              <Target size={18} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-[var(--color-text-main)] font-mono">
              {goals.length}
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-1.5">
              Objectif(s) stratégique(s) actif(s)
            </p>
          </div>
        </div>
      </div>

      {/* Grille Asymétrique : Jalons & Objectifs + Historique Deep Work */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Colonne Gauche : Objectifs et Jalons (8 colonnes) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="p-7 md:p-8 rounded-3xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] shadow-md">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg md:text-xl font-bold text-[var(--color-text-main)]">
                  Jalons & Réalisations Clés
                </h2>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  Cochez les jalons pour actualiser la trajectoire de progression en temps réel.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {goals.map((goal) => (
                <div
                  key={goal.id}
                  className="p-6 rounded-3xl bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-500">
                        {goal.category}
                      </span>
                      <h3 className="text-base font-bold text-[var(--color-text-main)] mt-0.5">
                        {goal.title}
                      </h3>
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                        Échéance : {goal.targetDate}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-2xl font-black text-[#FF6A00] font-mono">
                        {goal.progressPercentage}%
                      </span>
                    </div>
                  </div>

                  {/* Barre de progression Apple multicolore */}
                  <div className="w-full h-3 rounded-full bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-[#FF6A00] transition-all duration-500"
                      style={{ width: `${goal.progressPercentage}%` }}
                    />
                  </div>

                  {/* Liste des jalons interactifs */}
                  <div className="space-y-2 pt-2">
                    {goal.milestones.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => toggleMilestone(goal.id, m.id)}
                        className={`w-full p-3 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                          m.completed
                            ? 'bg-emerald-500/10 border-emerald-500/25 text-[var(--color-text-main)]'
                            : 'bg-[var(--color-bg-surface)] border-[var(--color-border-subtle)] text-[var(--color-text-muted)] hover:border-[#FF6A00]'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                            m.completed
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'border-[var(--color-border-strong)]'
                          }`}
                        >
                          {m.completed && <Check size={12} className="stroke-[3]" />}
                        </div>
                        <span className={`text-xs font-semibold flex-1 ${m.completed ? 'line-through opacity-80' : ''}`}>
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
        <div className="lg:col-span-4 space-y-6">
          <div className="p-7 md:p-8 rounded-3xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] shadow-md flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Flame size={16} className="text-[#FF6A00]" />
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
                  {focusSessions.map((s) => (
                    <div
                      key={s.id}
                      className="p-4 rounded-2xl bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] space-y-1"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-black text-[#FF6A00]">{s.durationMinutes} min</span>
                        <span className="text-[10px] text-[var(--color-text-muted)] font-mono">{s.completedAt}</span>
                      </div>
                      <p className="text-xs font-bold text-[var(--color-text-main)] line-clamp-1">{s.goalTitle}</p>
                      {s.notes && (
                        <p className="text-[11px] text-[var(--color-text-muted)] line-clamp-2">{s.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-6 mt-6 border-t border-[var(--color-border-subtle)]">
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
