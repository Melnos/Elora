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
    setFocusSuccessNotice(`Félicitations ! Votre session de ${focusDurationMinutes} min a été ajoutée à vos progrès.`);
    setTimeout(() => setFocusSuccessNotice(null), 4000);
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Ajout rapide en 1 ligne
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
      {/* En-tête & Bascule de Mode */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="bento-tag mb-1.5">
            <Calendar size={13} className="text-[var(--color-accent)]" />
            <span>Organisation & Rythme</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--color-text-main)] tracking-tight">
            Planner & Deep Work
          </h1>
        </div>

        {/* Switcher élégant en capsule */}
        <div className="inline-flex p-1 rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] shadow-sm self-start sm:self-auto">
          <button
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTabMode === 'tasks'
                ? 'bg-[var(--color-text-main)] text-[var(--color-bg-base)] shadow'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
            }`}
            onClick={() => setActiveTabMode('tasks')}
          >
            Tâches & Projets ({tasks.filter((t) => !t.completed).length})
          </button>
          <button
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTabMode === 'focus'
                ? 'bg-[var(--color-text-main)] text-[var(--color-bg-base)] shadow'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
            }`}
            onClick={() => setActiveTabMode('focus')}
          >
            <Flame size={13} className="text-amber-500" />
            <span>Mode Focus</span>
          </button>
        </div>
      </div>

      {/* VUE 1 : ORGANISATION ET TÂCHES */}
      {activeTabMode === 'tasks' && (
        <div className="space-y-6">
          {/* Carte Hero Synthèse Planner */}
          <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-br from-[var(--color-bg-surface)] to-[var(--color-bg-base)] border border-[var(--color-border-subtle)] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
                Optimisation Quotidienne
              </span>
              <h2 className="text-xl md:text-2xl font-black text-[var(--color-text-main)]">
                {pendingTasks.length} action(s) à accomplir
              </h2>
              <p className="text-xs text-[var(--color-text-muted)] max-w-lg leading-relaxed">
                Priorisez les tâches à fort impact avant d'engager vos sessions Deep Work.
              </p>
            </div>

            <button
              className="bento-btn-primary self-start md:self-auto shrink-0"
              onClick={async () => {
                setActiveTab('ai');
                await sendMessage('Analyse l\'ensemble de mes tâches et échéances actuelles dans le Planner et propose-moi un ordre d\'exécution optimisé pour maximiser mon impact aujourd\'hui.');
              }}
            >
              <Sparkles size={15} />
              <span>Optimiser mon planning avec ELORA</span>
            </button>
          </div>

          {/* Formulaire d'ajout rapide (1 ligne) */}
          <form
            onSubmit={handleQuickAdd}
            className="p-2 rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] flex items-center gap-2 shadow-sm focus-within:border-[var(--color-accent)] transition-colors"
          >
            <input
              type="text"
              placeholder="Ajouter une action rapide (ex: Finaliser la soumission du hackathon)..."
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              className="flex-1 bg-transparent px-3 py-2 text-xs text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:outline-none"
            />

            <select
              value={quickPriority}
              onChange={(e) => setQuickPriority(e.target.value as 'high' | 'medium' | 'low')}
              className="bg-[var(--color-bg-base)] text-[var(--color-text-main)] text-xs rounded-xl px-2.5 py-1.5 border border-[var(--color-border-subtle)] focus:outline-none"
            >
              <option value="high">Urgent</option>
              <option value="medium">Normal</option>
              <option value="low">Secondaire</option>
            </select>

            <button
              type="submit"
              disabled={!quickTitle.trim()}
              className="p-2 rounded-xl bg-[var(--color-text-main)] text-[var(--color-bg-base)] hover:opacity-90 disabled:opacity-40 transition-opacity"
              title="Ajouter la tâche"
            >
              <Plus size={16} />
            </button>
          </form>

          {/* Filtres de catégorie */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  filterCategory === cat
                    ? 'bg-[var(--color-text-main)] text-[var(--color-bg-base)]'
                    : 'bg-[var(--color-bg-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] border border-[var(--color-border-subtle)]'
                }`}
                onClick={() => setFilterCategory(cat)}
              >
                {cat === 'all' ? 'Toutes les catégories' : cat}
              </button>
            ))}
          </div>

          {/* Liste asymétrique des tâches */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Colonne Tâches en cours */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                  En cours ({pendingTasks.length})
                </span>
              </div>

              {pendingTasks.length === 0 ? (
                <div className="p-8 text-center rounded-3xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)]">
                  <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-2 opacity-80" />
                  <p className="text-xs text-[var(--color-text-muted)]">Aucune tâche en attente dans cette catégorie.</p>
                </div>
              ) : (
                pendingTasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-4 rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] hover:border-[var(--color-border-strong)] transition-all flex items-center justify-between gap-3 shadow-sm group"
                  >
                    <button
                      className="w-5 h-5 rounded-md border border-[var(--color-border-strong)] flex items-center justify-center shrink-0 hover:border-[var(--color-accent)] transition-colors"
                      onClick={() => toggleTaskCompleted(t.id)}
                      title="Marquer comme terminée"
                    >
                      {t.completed && <Check size={13} className="text-emerald-500" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-semibold text-[var(--color-text-main)] truncate">
                        {t.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-1">
                          <Clock size={10} />
                          <span>{t.dueDate}</span>
                        </span>
                        <span className="text-[10px] text-[var(--color-text-muted)] px-1.5 py-0.2 rounded bg-[var(--color-bg-base)]">
                          {t.category}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          t.priority === 'high'
                            ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                            : t.priority === 'medium'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                        }`}
                      >
                        {t.priority === 'high' ? 'Urgent' : t.priority === 'medium' ? 'Normal' : 'Secondaire'}
                      </span>
                      <button
                        className="opacity-0 group-hover:opacity-100 text-[var(--color-text-muted)] hover:text-red-500 transition-opacity p-1"
                        onClick={() => deleteTask(t.id)}
                        title="Supprimer la tâche"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Colonne Tâches complétées */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                  Terminées ({completedTasks.length})
                </span>
              </div>

              {completedTasks.length === 0 ? (
                <div className="p-8 text-center rounded-3xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)]">
                  <p className="text-xs text-[var(--color-text-muted)]">Les tâches terminées s'afficheront ici.</p>
                </div>
              ) : (
                completedTasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-4 rounded-2xl bg-[var(--color-bg-surface)]/60 border border-[var(--color-border-subtle)] flex items-center justify-between gap-3 opacity-70 group"
                  >
                    <button
                      className="w-5 h-5 rounded-md bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0"
                      onClick={() => toggleTaskCompleted(t.id)}
                      title="Rouvrir la tâche"
                    >
                      <Check size={13} className="text-emerald-500" />
                    </button>

                    <div className="flex-1 min-w-0 line-through text-xs text-[var(--color-text-muted)] truncate">
                      {t.title}
                    </div>

                    <button
                      className="opacity-0 group-hover:opacity-100 text-[var(--color-text-muted)] hover:text-red-500 transition-opacity p-1"
                      onClick={() => deleteTask(t.id)}
                      title="Supprimer"
                    >
                      <Trash2 size={13} />
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
        <div className="max-w-xl mx-auto py-6">
          <div className="p-8 md:p-12 rounded-3xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] text-center shadow-lg relative overflow-hidden">
            {/* Notification de succès */}
            {focusSuccessNotice && (
              <div className="mb-6 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center justify-center gap-2">
                <CheckCircle2 size={16} />
                <span>{focusSuccessNotice}</span>
              </div>
            )}

            <div className="bento-tag mx-auto mb-4">
              <Flame size={13} className="text-amber-500" />
              <span>Studio de Concentration</span>
            </div>

            {/* Objectif de focus modifiable */}
            <div className="mb-8">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
                Objectif de cette session :
              </label>
              <input
                type="text"
                value={focusGoal}
                onChange={(e) => setFocusGoal(e.target.value)}
                placeholder="Sur quoi vous concentrez-vous ?"
                className="w-full text-center text-sm font-bold text-[var(--color-text-main)] bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] rounded-xl py-2 px-4 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              />
            </div>

            {/* Cadran Apple-style du Chronomètre */}
            <div className="relative inline-flex items-center justify-center w-52 h-52 rounded-full border-4 border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] shadow-inner mb-8">
              <span className="text-5xl font-black text-[var(--color-text-main)] font-mono tracking-tight">
                {formatTimer(focusSecondsLeft)}
              </span>
            </div>

            {/* Présélections de durée */}
            <div className="flex items-center justify-center gap-2 mb-8">
              {[15, 25, 45, 60].map((mins) => (
                <button
                  key={mins}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    focusDurationMinutes === mins && !isFocusRunning
                      ? 'bg-[var(--color-text-main)] text-[var(--color-bg-base)] shadow'
                      : 'bg-[var(--color-bg-base)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] border border-[var(--color-border-subtle)]'
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
                  className="px-6 py-3 rounded-2xl bg-amber-500 text-white font-bold text-xs flex items-center gap-2 hover:opacity-90 shadow"
                >
                  <Pause size={16} />
                  <span>Mettre en pause</span>
                </button>
              ) : (
                <button
                  onClick={handleStartFocus}
                  className="px-8 py-3 rounded-2xl bg-[var(--color-accent)] text-white font-bold text-xs flex items-center gap-2 hover:opacity-95 shadow-md"
                >
                  <Play size={16} />
                  <span>Démarrer le Focus</span>
                </button>
              )}

              <button
                onClick={handleResetFocus}
                className="p-3 rounded-2xl bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors"
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
