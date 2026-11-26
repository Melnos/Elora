import React, { useState } from 'react';
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
  Target,
} from 'lucide-react';

export const PlannerScreen: React.FC = () => {
  const {
    tasks,
    goals,
    addTask,
    toggleTaskCompleted,
    deleteTask,
    activeFocus,
    focusSecondsLeft,
    focusCompletedPendingSave,
    startFocusTimer,
    pauseFocusTimer,
    resetFocusTimer,
    setFocusConfig,
    saveCompletedFocusSession,
    dismissCompletedFocusSession,
    setActiveTab,
    sendMessage,
  } = useApp();

  const [activeTabMode, setActiveTabMode] = useState<'tasks' | 'focus'>(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('elora_planner_mode') === 'focus') {
      sessionStorage.removeItem('elora_planner_mode');
      return 'focus';
    }
    return 'tasks';
  });
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [quickTitle, setQuickTitle] = useState('');
  const [quickPriority, setQuickPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [quickDueDate, setQuickDueDate] = useState<string>(
    () => new Date().toISOString().split('T')[0]
  );
  const [quickGoalId, setQuickGoalId] = useState<string>('');
  const [focusSuccessNotice, setFocusSuccessNotice] = useState<string | null>(null);

  const isFocusRunning = activeFocus.status === 'running';
  const focusDurationMinutes = activeFocus.durationMinutes;
  const focusGoal = activeFocus.goalTitle;

  const handleSaveFocusSession = (useElapsedIfRunning = false) => {
    const saved = saveCompletedFocusSession({ useElapsedIfRunning });
    if (saved) {
      setFocusSuccessNotice('Session Deep Work enregistrée dans votre historique.');
      setTimeout(() => setFocusSuccessNotice(null), 4000);
    }
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
      dueDate: quickDueDate || new Date().toISOString().split('T')[0],
      priority: quickPriority,
      completed: false,
      category: filterCategory !== 'all' ? filterCategory : 'Projet',
      ...(quickGoalId ? { goalId: quickGoalId } : {}),
    });

    setQuickTitle('');
    setQuickGoalId('');
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
      {/* En-tête sobre et épuré */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="bento-tag mb-2">
            <Calendar size={13} className="text-[var(--color-accent)]" />
            <span>Organisation & Rythme</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text-main)] tracking-tight">
            Planner & Deep Work
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Gérez vos priorités, cadrez vos journées et déclenchez des sessions de concentration.
          </p>
        </div>

        {/* Switcher segmented discret */}
        <div className="inline-flex p-1 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] self-start sm:self-auto">
          <button
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTabMode === 'tasks'
                ? 'bg-[var(--color-bg-surface)] text-[var(--color-text-main)] shadow-sm border border-[var(--color-border-strong)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
            }`}
            onClick={() => setActiveTabMode('tasks')}
          >
            Tâches & Projets ({tasks.filter((t) => !t.completed).length})
          </button>
          <button
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTabMode === 'focus'
                ? 'bg-[var(--color-bg-surface)] text-[var(--color-text-main)] shadow-sm border border-[var(--color-border-strong)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
            }`}
            onClick={() => setActiveTabMode('focus')}
          >
            <Flame size={13} className={activeTabMode === 'focus' ? 'text-[var(--color-accent)]' : ''} />
            <span>Mode Focus</span>
          </button>
        </div>
      </div>

      {/* VUE 1 : ORGANISATION ET TÂCHES */}
      {activeTabMode === 'tasks' && (
        <div className="space-y-6">
          {/* Synthèse Quotidienne */}
          <div className="p-6 rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-accent)] block mb-1">
                Optimisation Quotidienne
              </span>
              <h2 className="text-lg font-bold text-[var(--color-text-main)]">
                {pendingTasks.length} action(s) prioritaire(s) à accomplir
              </h2>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                Priorisez vos tâches à fort impact avant d'engager vos sessions Deep Work.
              </p>
            </div>

            <button
              className="bento-btn-primary w-full md:w-auto justify-center shrink-0"
              onClick={async () => {
                setActiveTab('ai');
                await sendMessage(
                  'Analyse l\'ensemble de mes tâches et échéances actuelles dans le Planner et propose-moi un ordre d\'exécution optimisé pour maximiser mon impact aujourd\'hui.'
                );
              }}
            >
              <Sparkles size={14} />
              <span>Optimiser avec ELORA</span>
            </button>
          </div>

          {/* Formulaire d'ajout rapide */}
          <form
            onSubmit={handleQuickAdd}
            className="p-3 sm:p-3.5 rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] flex flex-col sm:flex-row items-stretch sm:items-center gap-3 focus-within:border-[var(--color-border-strong)] transition-all"
          >
            <div className="flex items-center gap-2.5 flex-1 px-1 sm:px-2">
              <Plus size={16} className="text-[var(--color-accent)] shrink-0" />
              <input
                type="text"
                placeholder="Ajouter une action rapide..."
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                className="w-full text-xs text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 justify-end shrink-0 w-full sm:w-auto">
              <input
                type="date"
                aria-label="Échéance"
                value={quickDueDate}
                onChange={(e) => setQuickDueDate(e.target.value)}
                className="bg-[var(--color-bg-surface-elevated)] text-[var(--color-text-main)] text-xs font-medium rounded-xl px-2.5 py-2 border border-[var(--color-border-subtle)] focus:outline-none"
              />

              {goals.length > 0 && (
                <select
                  aria-label="Objectif lié"
                  value={quickGoalId}
                  onChange={(e) => setQuickGoalId(e.target.value)}
                  className="bg-[var(--color-bg-surface-elevated)] text-[var(--color-text-main)] text-xs font-medium rounded-xl px-2.5 py-2 border border-[var(--color-border-subtle)] focus:outline-none cursor-pointer max-w-[160px]"
                >
                  <option value="">Aucun objectif</option>
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title}
                    </option>
                  ))}
                </select>
              )}

              <select
                value={quickPriority}
                onChange={(e) => setQuickPriority(e.target.value as 'high' | 'medium' | 'low')}
                className="bg-[var(--color-bg-surface-elevated)] text-[var(--color-text-main)] text-xs font-medium rounded-xl px-3 py-2 border border-[var(--color-border-subtle)] focus:outline-none cursor-pointer flex-1 sm:flex-initial"
              >
                <option value="high">Urgent</option>
                <option value="medium">Normal</option>
                <option value="low">Secondaire</option>
              </select>

              <button
                type="submit"
                disabled={!quickTitle.trim()}
                className="py-2 px-4 rounded-xl sm:rounded-full bg-[var(--color-accent)] text-white font-bold text-xs hover:opacity-90 disabled:opacity-40 transition-opacity flex-1 sm:flex-initial text-center justify-center flex items-center"
              >
                <span>Ajouter</span>
              </button>
            </div>
          </form>

          {/* Filtres de catégorie */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  filterCategory === cat
                    ? 'bg-[var(--color-text-main)] text-[var(--color-bg-base)] border border-transparent shadow-sm'
                    : 'bg-[var(--color-bg-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] border border-[var(--color-border-subtle)]'
                }`}
                onClick={() => setFilterCategory(cat)}
              >
                {cat === 'all' ? 'Toutes les catégories' : cat}
              </button>
            ))}
          </div>

          {/* Colonnes des Tâches */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Colonne En cours */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider flex items-center gap-2 px-1">
                <span className="w-2 h-2 rounded-full bg-[var(--color-accent)]" />
                En cours ({pendingTasks.length})
              </span>

              {pendingTasks.length === 0 ? (
                tasks.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)]">
                    <Calendar size={32} className="text-[var(--color-accent)] mx-auto mb-2 opacity-80" />
                    <p className="text-xs font-semibold text-[var(--color-text-main)] mb-1">
                      Aucune tâche pour le moment
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Utilisez le champ ci-dessus pour créer votre première tâche.
                    </p>
                  </div>
                ) : (
                  <div className="p-8 text-center rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)]">
                    <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-2 opacity-80" />
                    <p className="text-xs text-[var(--color-text-muted)]">Toutes les tâches de cette catégorie sont accomplies.</p>
                  </div>
                )
              ) : (
                pendingTasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-4 rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] hover:border-[var(--color-border-strong)] transition-all flex items-start justify-between gap-3 group"
                  >
                    <button
                      className="w-5 h-5 rounded-md border border-[var(--color-border-strong)] flex items-center justify-center shrink-0 hover:border-[var(--color-accent)] transition-colors mt-0.5"
                      onClick={() => toggleTaskCompleted(t.id)}
                      title="Marquer comme terminée"
                    >
                      {t.completed && <Check size={13} className="text-[var(--color-accent)]" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs sm:text-sm font-semibold text-[var(--color-text-main)] leading-snug break-words">
                        {t.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-1">
                          <Clock size={11} />
                          <span>{t.dueDate}</span>
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--color-bg-surface-elevated)] text-[var(--color-text-muted)]">
                          {t.category}
                        </span>
                        {t.goalId && goals.find((g) => g.id === t.goalId) && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--color-accent-bg)] text-[var(--color-accent)] border border-[var(--color-accent)]/20 flex items-center gap-1">
                            <Target size={10} />
                            <span className="truncate max-w-[120px]">
                              {goals.find((g) => g.id === t.goalId)?.title}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                          t.priority === 'high'
                            ? 'bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/20'
                            : t.priority === 'medium'
                            ? 'bg-[var(--color-accent-bg)] text-[var(--color-accent)] border border-[var(--color-accent)]/20'
                            : 'bg-[var(--color-bg-surface-elevated)] text-[var(--color-text-muted)] border border-[var(--color-border-subtle)]'
                        }`}
                      >
                        {t.priority === 'high' ? 'Urgent' : t.priority === 'medium' ? 'Normal' : 'Secondaire'}
                      </span>
                      <button
                        className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-[var(--color-text-muted)] hover:text-red-500 transition-opacity p-1 rounded-lg"
                        onClick={() => deleteTask(t.id)}
                        title="Supprimer la tâche"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Colonne Terminées */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider flex items-center gap-2 px-1">
                <span className="w-2 h-2 rounded-full bg-[var(--color-accent)]" />
                Terminées ({completedTasks.length})
              </span>

              {completedTasks.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)]">
                  <p className="text-xs text-[var(--color-text-muted)]">Les tâches accomplies s'afficheront ici.</p>
                </div>
              ) : (
                completedTasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-4 rounded-2xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] flex items-start justify-between gap-3 group transition-all"
                  >
                    <button
                      className="w-5 h-5 rounded-md bg-[var(--color-accent-bg)] border border-[var(--color-accent)] flex items-center justify-center shrink-0 mt-0.5"
                      onClick={() => toggleTaskCompleted(t.id)}
                      title="Rouvrir la tâche"
                    >
                      <Check size={13} className="text-[var(--color-accent)]" />
                    </button>

                    <div className="flex-1 min-w-0 text-xs text-[var(--color-text-main)] opacity-85 leading-snug break-words">
                      {t.title}
                    </div>

                    <button
                      className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-[var(--color-text-muted)] hover:text-red-500 transition-opacity p-1 rounded-lg"
                      onClick={() => deleteTask(t.id)}
                      title="Supprimer définitivement"
                    >
                      <Trash2 size={14} />
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
        <div className="max-w-xl mx-auto py-2 sm:py-4">
          <div className="p-5 sm:p-8 rounded-2xl sm:rounded-3xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] text-center shadow-sm">
            {focusSuccessNotice && (
              <div className="mb-6 p-3 rounded-xl bg-[var(--color-accent-bg)] border border-[var(--color-accent)]/20 text-[var(--color-accent)] text-xs font-semibold flex items-center justify-center gap-2">
                <CheckCircle2 size={16} />
                <span>{focusSuccessNotice}</span>
              </div>
            )}

            {focusCompletedPendingSave && (
              <div className="mb-6 p-4 rounded-2xl bg-[var(--color-accent-bg)] border border-[var(--color-accent)]/30 text-left space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-text-main)]">
                  <CheckCircle2 size={16} className="text-[var(--color-accent)] shrink-0" />
                  <span>Session terminée ({focusDurationMinutes} min) — enregistrer dans l&apos;historique ?</span>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={dismissCompletedFocusSession}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"
                  >
                    Ignorer
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveFocusSession(false)}
                    className="bento-btn-primary py-1.5 px-4 text-xs"
                  >
                    Enregistrer la session
                  </button>
                </div>
              </div>
            )}

            <div className="bento-tag mx-auto mb-4 sm:mb-5">
              <Flame size={13} className="text-[var(--color-accent)]" />
              <span>Studio de Concentration</span>
            </div>

            <div className="mb-5 sm:mb-6 max-w-sm mx-auto">
              <label className="block text-xs font-semibold text-[var(--color-text-muted)] mb-1.5 sm:mb-2">
                Objectif de cette session :
              </label>
              <input
                type="text"
                value={focusGoal}
                onChange={(e) => setFocusConfig({ goalTitle: e.target.value })}
                placeholder="Sur quoi vous concentrez-vous ?"
                className="w-full text-center text-xs font-semibold text-[var(--color-text-main)] bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] rounded-xl py-2 sm:py-2.5 px-3 focus:outline-none"
              />
            </div>

            {/* Cadran sobre du Chronomètre */}
            <div className="relative inline-flex items-center justify-center w-36 h-36 sm:w-48 sm:h-48 rounded-full border-2 border-[var(--color-border-strong)] bg-[var(--color-bg-base)] mb-5 sm:mb-6">
              <span className="text-3xl sm:text-4xl font-extrabold text-[var(--color-text-main)] font-mono tracking-tight">
                {formatTimer(focusSecondsLeft)}
              </span>
            </div>

            {/* Présélections de durée */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mb-5 sm:mb-6">
              {[15, 25, 45, 60].map((mins) => (
                <button
                  key={mins}
                  className={`px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    focusDurationMinutes === mins && !isFocusRunning
                      ? 'bg-[var(--color-accent)] text-white'
                      : 'bg-[var(--color-bg-surface-elevated)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] border border-[var(--color-border-subtle)]'
                  }`}
                  onClick={() => setFocusConfig({ durationMinutes: mins })}
                  disabled={isFocusRunning}
                >
                  {mins} min
                </button>
              ))}
            </div>

            {/* Contrôles du Focus */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              {isFocusRunning ? (
                <button
                  onClick={pauseFocusTimer}
                  className="px-6 py-2.5 rounded-full bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-strong)] text-[var(--color-text-main)] font-semibold text-xs flex items-center gap-2 hover:bg-[var(--color-bg-surface)] transition-all"
                >
                  <Pause size={15} />
                  <span>Mettre en pause</span>
                </button>
              ) : (
                <button
                  onClick={startFocusTimer}
                  className="bento-btn-primary px-6 py-2.5"
                >
                  <Play size={15} />
                  <span>{activeFocus.status === 'paused' ? 'Reprendre le Focus' : 'Démarrer le Focus'}</span>
                </button>
              )}

              {(activeFocus.status === 'running' || activeFocus.status === 'paused') && (
                <button
                  type="button"
                  onClick={() => handleSaveFocusSession(true)}
                  className="px-4 py-2.5 rounded-full bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-xs font-semibold text-[var(--color-text-main)] hover:border-[var(--color-border-strong)] transition-colors"
                >
                  Terminer &amp; enregistrer
                </button>
              )}

              <button
                onClick={() => resetFocusTimer()}
                className="p-2.5 rounded-full bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors"
                title="Réinitialiser le chronomètre"
              >
                <RotateCcw size={15} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
