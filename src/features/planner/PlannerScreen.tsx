import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Calendar,
  Clock,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Trash2,
  Sparkles,
  Flame,
  Check,
  CheckCircle2,
} from 'lucide-react';

export const PlannerScreen: React.FC = () => {
  const {
    tasks,
    addTask,
    toggleTaskCompleted,
    deleteTask,
    addFocusSession,
    setActiveTab,
    sendMessage,
  } = useApp();

  const [activeTabMode, setActiveTabMode] = useState<'tasks' | 'focus'>('tasks');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [quickTitle, setQuickTitle] = useState('');
  const [quickPriority, setQuickPriority] = useState<'high' | 'medium' | 'low'>('medium');

  // État Mode FOCUS
  const [focusGoal, setFocusGoal] = useState('Finaliser l\'architecture et les tests');
  const [focusDurationMinutes, setFocusDurationMinutes] = useState(25);
  const [focusSecondsLeft, setFocusSecondsLeft] = useState(25 * 60);
  const [isFocusRunning, setIsFocusRunning] = useState(false);
  const [focusSuccessNotice, setFocusSuccessNotice] = useState<string | null>(null);

  // Chronomètre de Focus
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isFocusRunning && focusSecondsLeft > 0) {
      interval = setInterval(() => {
        setFocusSecondsLeft((prev) => prev - 1);
      }, 1000);
    } else if (focusSecondsLeft === 0 && isFocusRunning) {
      setIsFocusRunning(false);
      handleFinishFocus();
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isFocusRunning, focusSecondsLeft]);

  const handleStartFocus = () => {
    setIsFocusRunning(true);
  };

  const handlePauseFocus = () => {
    setIsFocusRunning(false);
  };

  const handleResetFocus = () => {
    setIsFocusRunning(false);
    setFocusSecondsLeft(focusDurationMinutes * 60);
  };

  const handleSelectPreset = (mins: number) => {
    setFocusDurationMinutes(mins);
    setFocusSecondsLeft(mins * 60);
    setIsFocusRunning(false);
  };

  const handleFinishFocus = () => {
    setIsFocusRunning(false);
    addFocusSession({
      goalTitle: focusGoal,
      durationMinutes: focusDurationMinutes,
      notes: 'Session de concentration Deep Work validée.',
    });
    setFocusSuccessNotice(`Félicitations ! Votre session de ${focusDurationMinutes} min a été enregistrée.`);
    setTimeout(() => setFocusSuccessNotice(null), 4000);
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;

    addTask({
      title: quickTitle.trim(),
      dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
      priority: quickPriority,
      completed: false,
      category: filterCategory === 'all' ? 'Développement' : filterCategory,
    });

    setQuickTitle('');
  };

  const categories = ['all', 'Projet', 'Développement', 'Personnel', 'Apprentissage'];

  const filteredTasks = tasks.filter((t) => {
    if (filterCategory === 'all') return true;
    return t.category.toLowerCase() === filterCategory.toLowerCase();
  });

  const pendingTasks = filteredTasks.filter((t) => !t.completed);
  const completedTasks = filteredTasks.filter((t) => t.completed);

  return (
    <div className="bento-viewport">
      {/* En-tête de la Page & Sélecteur de Mode */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="bento-tag mb-2">
            <Calendar size={13} className="text-[#FF6A00]" />
            <span>Organisation & Rythme</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[var(--color-text-main)] tracking-tight">
            Planner & Deep Work
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-1 max-w-xl">
            Gérez vos priorités, cadrez vos journées et déclenchez des sessions de concentration intense.
          </p>
        </div>

        {/* Switcher élégant en capsule Bento Apple */}
        <div className="inline-flex p-1.5 rounded-2xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] shadow-md self-start sm:self-auto">
          <button
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTabMode === 'tasks'
                ? 'bg-gradient-to-r from-[#FF6A00] to-[#EE5A24] text-white shadow-lg'
                : 'text-[var(--color-text-muted)] hover:text-white'
            }`}
            onClick={() => setActiveTabMode('tasks')}
          >
            Tâches & Projets ({tasks.filter((t) => !t.completed).length})
          </button>
          <button
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTabMode === 'focus'
                ? 'bg-gradient-to-r from-[#FF6A00] to-[#EE5A24] text-white shadow-lg'
                : 'text-[var(--color-text-muted)] hover:text-white'
            }`}
            onClick={() => setActiveTabMode('focus')}
          >
            <Flame size={14} className={activeTabMode === 'focus' ? 'text-white' : 'text-amber-500'} />
            <span>Mode Focus</span>
          </button>
        </div>
      </div>

      {/* VUE 1 : ORGANISATION ET TÂCHES */}
      {activeTabMode === 'tasks' && (
        <div className="space-y-8">
          {/* Carte Hero Synthèse Bento */}
          <div className="p-8 md:p-10 rounded-3xl bg-gradient-to-br from-[var(--color-bg-surface)] via-[var(--color-bg-surface)] to-orange-500/15 border border-orange-500/30 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2.5">
              <span className="text-[10px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-full bg-[#FF6A00]/20 text-[#FF6A00] border border-[#FF6A00]/30 inline-block shadow-sm">
                Optimisation Quotidienne
              </span>
              <h2 className="text-2xl md:text-3xl font-black text-[var(--color-text-main)]">
                {pendingTasks.length} action(s) prioritaire(s) à accomplir
              </h2>
              <p className="text-xs text-[var(--color-text-muted)] max-w-lg leading-relaxed">
                Priorisez vos tâches à fort impact avant d'engager vos sessions Deep Work.
              </p>
            </div>

            <button
              className="bento-btn-primary self-start md:self-auto shrink-0 shadow-lg"
              onClick={async () => {
                setActiveTab('ai');
                await sendMessage(
                  'Analyse l\'ensemble de mes tâches et échéances actuelles dans le Planner et propose-moi un ordre d\'exécution optimisé pour maximiser mon impact aujourd\'hui.'
                );
              }}
            >
              <Sparkles size={16} />
              <span>Optimiser mon planning avec ELORA</span>
            </button>
          </div>

          {/* Formulaire d'ajout rapide (Véritable carte Bento bien visible) */}
          <form
            onSubmit={handleQuickAdd}
            className="p-4 sm:p-5 rounded-3xl bg-[var(--color-bg-surface)] border border-[var(--color-border-strong)] flex flex-col sm:flex-row items-stretch sm:items-center gap-4 shadow-xl focus-within:border-[#FF6A00] transition-all"
          >
            <div className="flex items-center gap-3 flex-1 px-3">
              <Plus size={18} className="text-[#FF6A00] shrink-0" />
              <input
                type="text"
                placeholder="Ajouter une action rapide (ex: Finaliser la soumission du hackathon)..."
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                className="w-full bg-transparent py-2.5 text-sm text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:outline-none font-medium"
              />
            </div>

            <div className="flex items-center gap-3 justify-end shrink-0">
              <select
                value={quickPriority}
                onChange={(e) => setQuickPriority(e.target.value as 'high' | 'medium' | 'low')}
                className="bg-[var(--color-bg-surface-elevated)] text-[var(--color-text-main)] text-xs font-bold rounded-2xl px-4 py-3 border border-[var(--color-border-subtle)] focus:outline-none cursor-pointer"
              >
                <option value="high">🔴 Urgent</option>
                <option value="medium">🟡 Normal</option>
                <option value="low">⚪ Secondaire</option>
              </select>

              <button
                type="submit"
                disabled={!quickTitle.trim()}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#FF6A00] to-[#EE5A24] text-white text-xs font-bold hover:opacity-90 disabled:opacity-40 transition-all shadow-md flex items-center gap-2 shrink-0 cursor-pointer"
                title="Ajouter la tâche"
              >
                <Plus size={16} />
                <span>Ajouter</span>
              </button>
            </div>
          </form>

          {/* Filtres de catégorie avec espacement garanti */}
          <div className="flex items-center gap-2.5 overflow-x-auto pt-1 pb-3">
            {categories.map((cat) => (
              <button
                key={cat}
                className={`px-5 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all shadow-sm ${
                  filterCategory === cat
                    ? 'bg-gradient-to-r from-[#FF6A00] to-[#EE5A24] text-white shadow-md'
                    : 'bg-[var(--color-bg-surface)] text-[var(--color-text-muted)] hover:text-white border border-[var(--color-border-subtle)]'
                }`}
                onClick={() => setFilterCategory(cat)}
              >
                {cat === 'all' ? 'Toutes les catégories' : cat}
              </button>
            ))}
          </div>

          {/* Grille Asymétrique des Tâches */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Colonne Tâches en cours */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-black text-[var(--color-text-muted)] uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm" />
                  En cours ({pendingTasks.length})
                </span>
              </div>

              {pendingTasks.length === 0 ? (
                <div className="p-10 text-center rounded-3xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] shadow-sm">
                  <CheckCircle2 size={40} className="text-emerald-500 mx-auto mb-3 opacity-80" />
                  <p className="text-xs font-semibold text-[var(--color-text-muted)]">Toutes les tâches de cette catégorie sont accomplies.</p>
                </div>
              ) : (
                pendingTasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-6 rounded-3xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] hover:border-[#FF6A00] transition-all flex items-start justify-between gap-4 shadow-md hover:shadow-xl group"
                  >
                    <button
                      className="w-7 h-7 rounded-xl border-2 border-[var(--color-border-strong)] flex items-center justify-center shrink-0 hover:border-[#FF6A00] transition-colors bg-[var(--color-bg-surface-elevated)] mt-0.5 cursor-pointer"
                      onClick={() => toggleTaskCompleted(t.id)}
                      title="Marquer comme terminée"
                    >
                      {t.completed && <Check size={16} className="text-emerald-500 stroke-[3]" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-[var(--color-text-main)] leading-snug">
                        {t.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2.5 mt-2.5">
                        <span className="text-[11px] font-semibold text-amber-500 bg-amber-500/15 px-2.5 py-1 rounded-lg flex items-center gap-1.5 border border-amber-500/20">
                          <Clock size={12} />
                          <span>{t.dueDate}</span>
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] px-2.5 py-1 rounded-lg bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)]">
                          {t.category}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span
                        className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider ${
                          t.priority === 'high'
                            ? 'bg-red-500/20 text-red-500 border border-red-500/30'
                            : t.priority === 'medium'
                            ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}
                      >
                        {t.priority === 'high' ? 'Urgent' : t.priority === 'medium' ? 'Normal' : 'Secondaire'}
                      </span>
                      <button
                        className="opacity-0 group-hover:opacity-100 text-[var(--color-text-muted)] hover:text-red-500 transition-opacity p-2 rounded-xl hover:bg-[var(--color-bg-surface-elevated)] cursor-pointer"
                        onClick={() => deleteTask(t.id)}
                        title="Supprimer la tâche"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Colonne Tâches complétées */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-black text-[var(--color-text-muted)] uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" />
                  Terminées ({completedTasks.length})
                </span>
              </div>

              {completedTasks.length === 0 ? (
                <div className="p-10 text-center rounded-3xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] shadow-sm">
                  <p className="text-xs font-semibold text-[var(--color-text-muted)]">Les tâches accomplies s'afficheront ici.</p>
                </div>
              ) : (
                completedTasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-6 rounded-3xl bg-[var(--color-bg-surface)]/70 border border-[var(--color-border-subtle)] flex items-start justify-between gap-4 opacity-70 group hover:opacity-100 transition-all shadow-sm"
                  >
                    <button
                      className="w-7 h-7 rounded-xl bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center shrink-0 mt-0.5 cursor-pointer"
                      onClick={() => toggleTaskCompleted(t.id)}
                      title="Rouvrir la tâche"
                    >
                      <Check size={16} className="text-emerald-500 stroke-[3]" />
                    </button>

                    <div className="flex-1 min-w-0 line-through text-xs font-semibold text-[var(--color-text-muted)] leading-relaxed">
                      {t.title}
                    </div>

                    <button
                      className="opacity-0 group-hover:opacity-100 text-[var(--color-text-muted)] hover:text-red-500 transition-opacity p-2 rounded-xl hover:bg-[var(--color-bg-surface-elevated)] cursor-pointer"
                      onClick={() => deleteTask(t.id)}
                      title="Supprimer définitivement"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* VUE 2 : STUDIO DEEP WORK (FOCUS MODE) */}
      {activeTabMode === 'focus' && (
        <div className="max-w-2xl mx-auto py-6">
          <div className="p-8 md:p-12 rounded-3xl bg-gradient-to-br from-[var(--color-bg-surface)] via-[var(--color-bg-surface)] to-violet-500/15 border border-violet-500/30 text-center shadow-2xl relative overflow-hidden">
            {focusSuccessNotice && (
              <div className="mb-6 p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/35 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center justify-center gap-2">
                <CheckCircle2 size={18} />
                <span>{focusSuccessNotice}</span>
              </div>
            )}

            <div className="bento-tag mx-auto mb-6">
              <Flame size={14} className="text-[#FF6A00]" />
              <span>Studio de Concentration</span>
            </div>

            <div className="mb-8 max-w-md mx-auto">
              <label className="block text-[11px] font-black uppercase tracking-wider text-[var(--color-text-muted)] mb-2.5">
                Objectif de cette session :
              </label>
              <input
                type="text"
                value={focusGoal}
                onChange={(e) => setFocusGoal(e.target.value)}
                placeholder="Sur quoi vous concentrez-vous ?"
                className="w-full text-center text-sm font-bold text-[var(--color-text-main)] bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] rounded-2xl py-3.5 px-4 focus:outline-none focus:ring-2 focus:ring-[#FF6A00] shadow-inner"
              />
            </div>

            {/* Cadran Apple-style du Chronomètre avec lueur néon */}
            <div className="relative inline-flex items-center justify-center w-56 h-56 rounded-full border-4 border-violet-500/35 bg-gradient-to-br from-[var(--color-bg-base)] to-violet-500/15 shadow-2xl mb-8">
              <span className="text-5xl font-black text-[var(--color-text-main)] font-mono tracking-tight">
                {formatTimer(focusSecondsLeft)}
              </span>
            </div>

            {/* Présélections de durée */}
            <div className="flex items-center justify-center gap-2.5 mb-8">
              {[15, 25, 45, 60].map((mins) => (
                <button
                  key={mins}
                  className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                    focusDurationMinutes === mins && !isFocusRunning
                      ? 'bg-gradient-to-r from-[#FF6A00] to-[#EE5A24] text-white shadow-md'
                      : 'bg-[var(--color-bg-surface-elevated)] text-[var(--color-text-muted)] hover:text-white border border-[var(--color-border-subtle)]'
                  }`}
                  onClick={() => handleSelectPreset(mins)}
                  disabled={isFocusRunning}
                >
                  {mins} min
                </button>
              ))}
            </div>

            {/* Contrôles du Focus */}
            <div className="flex items-center justify-center gap-3">
              {isFocusRunning ? (
                <button
                  onClick={handlePauseFocus}
                  className="px-8 py-3.5 rounded-2xl bg-amber-500 text-white font-bold text-xs flex items-center gap-2 hover:opacity-90 shadow-lg cursor-pointer"
                >
                  <Pause size={16} />
                  <span>Mettre en pause</span>
                </button>
              ) : (
                <button
                  onClick={handleStartFocus}
                  className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#FF6A00] to-[#EE5A24] text-white font-bold text-xs flex items-center gap-2 hover:opacity-95 shadow-lg cursor-pointer"
                >
                  <Play size={16} />
                  <span>Démarrer le Focus</span>
                </button>
              )}

              <button
                onClick={handleResetFocus}
                className="p-3.5 rounded-2xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-[var(--color-text-muted)] hover:text-white transition-colors cursor-pointer"
                title="Réinitialiser le chronomètre"
              >
                <RotateCcw size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
