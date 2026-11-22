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
          <p className="text-xs text-[var(--color-text-muted)] mt-1 max-w-xl">
            Indicateurs concrets calculés à partir de vos activités réelles. Aucune statistique artificielle.
          </p>
        </div>

        <button
          className="bento-btn-primary self-start md:self-auto shadow-lg"
          onClick={handleAskProgressReview}
        >
          <Sparkles size={16} />
          <span>Bilan personnalisé ELORA</span>
        </button>
      </div>

      {/* Grille Bento des 4 Grandes Métriques Apple (Grand Format et Couleurs Vibrantes) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Métrique 1 : Tâches (Émeraude Vibrant) */}
        <div className="p-8 rounded-3xl bg-gradient-to-br from-[var(--color-bg-surface)] via-[var(--color-bg-surface)] to-emerald-500/15 border border-emerald-500/35 flex flex-col justify-between shadow-xl hover:shadow-2xl hover:translate-y-[-2px] transition-all min-h-[170px]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-500">
              Tâches Concrétisées
            </span>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center shadow-inner border border-emerald-500/30">
              <CheckCircle2 size={22} />
            </div>
          </div>
          <div>
            <div className="text-4xl sm:text-5xl font-black text-[var(--color-text-main)] font-mono tracking-tight">
              {completedTasks.length} <span className="text-base font-semibold text-[var(--color-text-muted)]">/ {totalTasks}</span>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-2 font-medium">
              Taux de complétion : <strong className="text-emerald-500 font-bold">{taskCompletionRate}%</strong>
            </p>
          </div>
        </div>

        {/* Métrique 2 : Focus (Sunset Orange Électrique) */}
        <div className="p-8 rounded-3xl bg-gradient-to-br from-[var(--color-bg-surface)] via-[var(--color-bg-surface)] to-orange-500/15 border border-orange-500/35 flex flex-col justify-between shadow-xl hover:shadow-2xl hover:translate-y-[-2px] transition-all min-h-[170px]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-black uppercase tracking-wider text-[#FF6A00]">
              Deep Work
            </span>
            <div className="w-12 h-12 rounded-2xl bg-[#FF6A00]/20 text-[#FF6A00] flex items-center justify-center shadow-inner border border-[#FF6A00]/30">
              <Flame size={22} />
            </div>
          </div>
          <div>
            <div className="text-4xl sm:text-5xl font-black text-[var(--color-text-main)] font-mono tracking-tight">
              {totalFocusMinutes} <span className="text-base font-semibold text-[var(--color-text-muted)]">min</span>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-2 font-medium">
              {focusSessions.length} session(s) de concentration
            </p>
          </div>
        </div>

        {/* Métrique 3 : Connaissances (Bleu Cyber Saphir) */}
        <div className="p-8 rounded-3xl bg-gradient-to-br from-[var(--color-bg-surface)] via-[var(--color-bg-surface)] to-blue-500/15 border border-blue-500/35 flex flex-col justify-between shadow-xl hover:shadow-2xl hover:translate-y-[-2px] transition-all min-h-[170px]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-black uppercase tracking-wider text-blue-400">
              Bibliothèque
            </span>
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center shadow-inner border border-blue-500/30">
              <BookOpen size={22} />
            </div>
          </div>
          <div>
            <div className="text-4xl sm:text-5xl font-black text-[var(--color-text-main)] font-mono tracking-tight">
              {knowledgeDocs.length}
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-2 font-medium">
              Ressources et fiches indexées
            </p>
          </div>
        </div>

        {/* Métrique 4 : Objectifs (Violet Royal Cosmique) */}
        <div className="p-8 rounded-3xl bg-gradient-to-br from-[var(--color-bg-surface)] via-[var(--color-bg-surface)] to-violet-500/15 border border-violet-500/35 flex flex-col justify-between shadow-xl hover:shadow-2xl hover:translate-y-[-2px] transition-all min-h-[170px]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-black uppercase tracking-wider text-violet-400">
              Trajectoire
            </span>
            <div className="w-12 h-12 rounded-2xl bg-violet-500/20 text-violet-400 flex items-center justify-center shadow-inner border border-violet-500/30">
              <Target size={22} />
            </div>
          </div>
          <div>
            <div className="text-4xl sm:text-5xl font-black text-[var(--color-text-main)] font-mono tracking-tight">
              {goals.length}
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-2 font-medium">
              Objectif(s) stratégique(s) actif(s)
            </p>
          </div>
        </div>
      </div>

      {/* Grille Asymétrique : Jalons & Objectifs + Historique Deep Work */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Colonne Gauche : Objectifs et Jalons (8 colonnes) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="p-8 md:p-10 rounded-3xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] shadow-xl">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-[var(--color-text-main)]">
                  Jalons & Réalisations Clés
                </h2>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  Cochez les jalons pour actualiser la trajectoire de progression en temps réel.
                </p>
              </div>
            </div>

            <div className="space-y-8">
              {goals.map((goal) => (
                <div
                  key={goal.id}
                  className="p-7 rounded-3xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] space-y-5 shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#FF6A00] bg-[#FF6A00]/15 px-3 py-1 rounded-full border border-[#FF6A00]/25 inline-block">
                        {goal.category}
                      </span>
                      <h3 className="text-lg font-bold text-[var(--color-text-main)] mt-2">
                        {goal.title}
                      </h3>
                      <p className="text-xs text-[var(--color-text-muted)] mt-1 font-medium">
                        Échéance : <span className="text-[var(--color-text-main)] font-bold">{goal.targetDate}</span>
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-3xl font-black text-[#FF6A00] font-mono">
                        {goal.progressPercentage}%
                      </span>
                    </div>
                  </div>

                  {/* Barre de progression Apple multicolore épaisse */}
                  <div className="w-full h-3.5 rounded-full bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] overflow-hidden shadow-inner">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-[#FF6A00] transition-all duration-500 shadow-sm"
                      style={{ width: `${goal.progressPercentage}%` }}
                    />
                  </div>

                  {/* Liste des jalons interactifs confortables */}
                  <div className="space-y-2.5 pt-2">
                    {goal.milestones.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => toggleMilestone(goal.id, m.id)}
                        className={`w-full p-4 rounded-2xl border text-left flex items-center gap-3.5 transition-all cursor-pointer ${
                          m.completed
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-[var(--color-text-main)] shadow-sm'
                            : 'bg-[var(--color-bg-surface)] border-[var(--color-border-subtle)] text-[var(--color-text-muted)] hover:text-white hover:border-[#FF6A00]'
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors ${
                            m.completed
                              ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm'
                              : 'border-[var(--color-border-strong)] bg-[var(--color-bg-base)]'
                          }`}
                        >
                          {m.completed && <Check size={14} className="stroke-[3]" />}
                        </div>
                        <span className={`text-xs font-bold flex-1 leading-snug ${m.completed ? 'text-emerald-500 line-through' : ''}`}>
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
          <div className="p-8 rounded-3xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-6">
                <div className="w-9 h-9 rounded-xl bg-orange-500/20 text-[#FF6A00] flex items-center justify-center">
                  <Flame size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--color-text-main)]">
                    Historique Deep Work
                  </h3>
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    Vos sessions récentes
                  </p>
                </div>
              </div>

              {focusSessions.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-xs text-[var(--color-text-muted)]">Aucune session enregistrée pour le moment.</p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {focusSessions.map((s) => (
                    <div
                      key={s.id}
                      className="p-5 rounded-2xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] space-y-1.5 shadow-sm"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-black text-[#FF6A00] flex items-center gap-1">
                          <Flame size={12} />
                          {s.durationMinutes} min
                        </span>
                        <span className="text-[10px] text-[var(--color-text-muted)] font-mono">{s.completedAt}</span>
                      </div>
                      <p className="text-xs font-bold text-[var(--color-text-main)] leading-snug">{s.goalTitle}</p>
                      {s.notes && (
                        <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">{s.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-6 mt-6 border-t border-[var(--color-border-subtle)]">
              <button
                className="bento-btn-secondary w-full shadow-sm"
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
