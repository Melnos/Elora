import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Play,
  Square,
  Plus,
  Trash2,
  Sparkles,
  Flame,
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

  const [activeView, setActiveView] = useState<'tasks' | 'focus'>('tasks');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showAddTask, setShowAddTask] = useState(false);

  // Formulaire nouvelle tâche
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Développement');
  const [newPriority, setNewPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [newDueDate, setNewDueDate] = useState('2026-11-25');

  // Mode FOCUS
  const [focusGoal, setFocusGoal] = useState('Finaliser l\'architecture et les tests');
  const [focusDurationMinutes, setFocusDurationMinutes] = useState(25);
  const [focusSecondsLeft, setFocusSecondsLeft] = useState(25 * 60);
  const [isFocusRunning, setIsFocusRunning] = useState(false);
  const [focusNotes, setFocusNotes] = useState('');

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
    setFocusSecondsLeft(focusDurationMinutes * 60);
    setIsFocusRunning(true);
  };

  const handleFinishFocus = () => {
    setIsFocusRunning(false);
    addFocusSession({
      goalTitle: focusGoal,
      durationMinutes: focusDurationMinutes,
      notes: focusNotes || 'Session de concentration terminée avec succès.',
    });
    alert(`Bravo ! Votre session Focus de ${focusDurationMinutes} minutes a été enregistrée dans vos progrès.`);
    setFocusNotes('');
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleAddTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    addTask({
      title: newTitle.trim(),
      dueDate: newDueDate,
      priority: newPriority,
      completed: false,
      category: newCategory,
    });

    setNewTitle('');
    setShowAddTask(false);
  };

  const handleAskPlannerAdvice = async () => {
    setActiveTab('ai');
    await sendMessage('Analyse mes tâches et échéances actuelles dans le Planner et propose-moi un planning optimisé pour aujourd\'hui.');
  };

  const filteredTasks = tasks.filter(
    (t) => filterCategory === 'all' || t.category === filterCategory
  );

  const categories = ['all', ...Array.from(new Set(tasks.map((t) => t.category)))];

  return (
    <div className="page-container planner-page">
      {/* En-tête avec commutateur Tasks vs Focus */}
      <div className="section-header-row">
        <div>
          <h1 className="page-main-title">Organisation & Focus</h1>
          <p className="page-main-desc">
            Planifiez vos actions quotidiennes et entrez dans des sessions de concentration profonde.
          </p>
        </div>

        <div className="planner-tab-toggle">
          <button
            className={`toggle-pill ${activeView === 'tasks' ? 'active' : ''}`}
            onClick={() => setActiveView('tasks')}
          >
            <Calendar size={16} />
            <span>Tâches & Planning</span>
          </button>
          <button
            className={`toggle-pill ${activeView === 'focus' ? 'active' : ''}`}
            onClick={() => setActiveView('focus')}
          >
            <Flame size={16} />
            <span>Session Focus {isFocusRunning ? '• Actif' : ''}</span>
          </button>
        </div>
      </div>

      {activeView === 'tasks' ? (
        <>
          {/* Barre d'actions & Catégories */}
          <div className="planner-sub-bar">
            <div className="category-chips-list">
              {categories.map((cat) => (
                <button
                  key={cat}
                  className={`category-chip ${filterCategory === cat ? 'active' : ''}`}
                  onClick={() => setFilterCategory(cat)}
                >
                  {cat === 'all' ? 'Toutes les tâches' : cat}
                </button>
              ))}
            </div>

            <div className="flex-align-center gap-2">
              <button className="btn-ai-assistant-planner" onClick={handleAskPlannerAdvice}>
                <Sparkles size={15} />
                <span>Optimiser mon planning avec ELORA</span>
              </button>
              <button className="btn-primary-action" onClick={() => setShowAddTask(true)}>
                <Plus size={16} />
                <span>Nouvelle tâche</span>
              </button>
            </div>
          </div>

          {/* Formulaire modal d'ajout */}
          {showAddTask && (
            <form className="add-task-inline-card" onSubmit={handleAddTaskSubmit}>
              <h3 className="section-title">Ajouter une action</h3>
              <div className="form-group">
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="Intitulé de la tâche..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>

              <div className="form-row">
                <div className="form-group flex-1">
                  <label className="form-label">Catégorie</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                  />
                </div>
                <div className="form-group flex-1">
                  <label className="form-label">Priorité</label>
                  <select
                    className="form-select"
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                  >
                    <option value="high">Élevée</option>
                    <option value="medium">Moyenne</option>
                    <option value="low">Basse</option>
                  </select>
                </div>
                <div className="form-group flex-1">
                  <label className="form-label">Échéance</label>
                  <input
                    type="date"
                    className="form-input"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-actions mt-2">
                <button type="button" className="btn-secondary-sm" onClick={() => setShowAddTask(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn-primary-sm">
                  Enregistrer
                </button>
              </div>
            </form>
          )}

          {/* Liste des tâches */}
          <div className="tasks-full-list">
            {filteredTasks.map((t) => (
              <div key={t.id} className={`task-row-card ${t.completed ? 'completed' : ''}`}>
                <button
                  className={`task-row-check ${t.completed ? 'checked' : ''}`}
                  onClick={() => toggleTaskCompleted(t.id)}
                >
                  {t.completed && <CheckCircle2 size={16} />}
                </button>

                <div className="task-row-main">
                  <span className="task-row-title">{t.title}</span>
                  {t.description && <p className="task-row-desc">{t.description}</p>}
                </div>

                <div className="task-row-meta">
                  <span className={`priority-tag ${t.priority}`}>
                    {t.priority === 'high' ? 'Urgent' : t.priority === 'medium' ? 'Normal' : 'Secondaire'}
                  </span>
                  <span className="task-category-pill">{t.category}</span>
                  <span className="task-row-date">
                    <Clock size={13} /> {t.dueDate}
                  </span>
                  <button
                    className="btn-icon-delete"
                    onClick={() => deleteTask(t.id)}
                    title="Supprimer la tâche"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        /* VUE FOCUS INTÉGRÉE */
        <div className="focus-mode-container">
          <div className="focus-card-main">
            <div className="focus-header-center">
              <span className="focus-badge">
                <Flame size={15} />
                Mode Concentration Profonde
              </span>
              {!isFocusRunning ? (
                <div style={{ maxWidth: '400px', margin: '8px auto 0 auto' }}>
                  <label className="form-label">Objectif de la session Focus :</label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ textAlign: 'center', fontWeight: 600, marginTop: '4px' }}
                    value={focusGoal}
                    onChange={(e) => setFocusGoal(e.target.value)}
                    placeholder="Quel est votre objectif pour cette session ?"
                  />
                </div>
              ) : (
                <h2 className="focus-heading">{focusGoal}</h2>
              )}
            </div>

            {/* Cadran du chronomètre */}
            <div className="focus-timer-circle">
              <span className="timer-digits">{formatTimer(focusSecondsLeft)}</span>
              <span className="timer-status">
                {isFocusRunning ? 'Session en cours...' : 'Prêt à démarrer'}
              </span>
            </div>

            {/* Réglage de la durée si arrêté */}
            {!isFocusRunning && (
              <div className="focus-preset-durations">
                {[15, 25, 45, 60].map((d) => (
                  <button
                    key={d}
                    className={`preset-btn ${focusDurationMinutes === d ? 'active' : ''}`}
                    onClick={() => {
                      setFocusDurationMinutes(d);
                      setFocusSecondsLeft(d * 60);
                    }}
                  >
                    {d} min
                  </button>
                ))}
              </div>
            )}

            {/* Commandes Focus */}
            <div className="focus-controls-row">
              {!isFocusRunning ? (
                <button className="btn-start-focus" onClick={handleStartFocus}>
                  <Play size={18} />
                  <span>Démarrer le Focus ({focusDurationMinutes} min)</span>
                </button>
              ) : (
                <button className="btn-stop-focus" onClick={handleFinishFocus}>
                  <Square size={16} />
                  <span>Terminer et enregistrer le bilan</span>
                </button>
              )}
            </div>

            {/* Notes de session */}
            <div className="focus-notes-box">
              <label className="form-label">Notes de session / Bilan d'avancement</label>
              <textarea
                className="form-textarea"
                rows={2}
                placeholder="Notez ce que vous avez accompli durant cette session..."
                value={focusNotes}
                onChange={(e) => setFocusNotes(e.target.value)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
