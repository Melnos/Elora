import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  TrendingUp,
  Target,
  Sparkles,
  Flame,
  CheckCircle2,
  BookOpen,
  Calendar,
  Check,
  Plus,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';

export const ProgressScreen: React.FC = () => {
  const {
    tasks,
    goals,
    focusSessions,
    knowledgeDocs,
    addGoal,
    updateGoal,
    deleteGoal,
    addMilestone,
    updateMilestone,
    deleteMilestone,
    toggleMilestone,
    setActiveTab,
    sendMessage,
  } = useApp();

  const [showNewGoalForm, setShowNewGoalForm] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalCategory, setNewGoalCategory] = useState('Projet');
  const [newGoalTargetDate, setNewGoalTargetDate] = useState(
    () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [newGoalMilestone, setNewGoalMilestone] = useState('');

  // Édition / suppression d'objectif
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editGoalTitle, setEditGoalTitle] = useState('');
  const [editGoalCategory, setEditGoalCategory] = useState('');
  const [editGoalTargetDate, setEditGoalTargetDate] = useState('');
  const [confirmDeleteGoalId, setConfirmDeleteGoalId] = useState<string | null>(null);

  // Ajout / édition de jalons
  const [milestoneInputs, setMilestoneInputs] = useState<Record<string, string>>({});
  const [editingMilestone, setEditingMilestone] = useState<{ goalId: string; milestoneId: string; title: string } | null>(null);

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim()) return;

    addGoal({
      title: newGoalTitle.trim(),
      category: newGoalCategory.trim() || 'Projet',
      targetDate: newGoalTargetDate || new Date().toISOString().split('T')[0],
      progressPercentage: 0,
      milestones: newGoalMilestone.trim()
        ? [{ id: `m-${Date.now()}`, title: newGoalMilestone.trim(), completed: false }]
        : [],
      completed: false,
    });

    setNewGoalTitle('');
    setNewGoalMilestone('');
    setShowNewGoalForm(false);
  };

  const startEditingGoal = (goal: typeof goals[number]) => {
    setEditingGoalId(goal.id);
    setEditGoalTitle(goal.title);
    setEditGoalCategory(goal.category);
    setEditGoalTargetDate(goal.targetDate);
    setConfirmDeleteGoalId(null);
  };

  const handleSaveGoalEdit = (e: React.FormEvent, goalId: string) => {
    e.preventDefault();
    if (!editGoalTitle.trim()) return;
    updateGoal(goalId, {
      title: editGoalTitle.trim(),
      category: editGoalCategory.trim() || 'Projet',
      targetDate: editGoalTargetDate,
    });
    setEditingGoalId(null);
  };

  const handleAddMilestoneSubmit = (e: React.FormEvent, goalId: string) => {
    e.preventDefault();
    const title = (milestoneInputs[goalId] || '').trim();
    if (!title) return;
    addMilestone(goalId, title);
    setMilestoneInputs((prev) => ({ ...prev, [goalId]: '' }));
  };

  const handleSaveMilestoneEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMilestone || !editingMilestone.title.trim()) return;
    updateMilestone(editingMilestone.goalId, editingMilestone.milestoneId, editingMilestone.title.trim());
    setEditingMilestone(null);
  };

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed);
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

  const totalFocusMinutes = focusSessions.reduce((acc, s) => acc + s.durationMinutes, 0);

  const handleAskProgressReview = async () => {
    setActiveTab('ai');
    await sendMessage(
      'Analyse ma progression globale : taux de complétion des tâches, sessions Deep Work, objectifs en cours et documents enregistrés. Propose-moi une synthèse stratégique de mes accomplissements et mes 3 prochains axes d\'amélioration.'
    );
  };

  return (
    <div className="bento-viewport">
      {/* En-tête de la Page */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <div className="bento-tag mb-2">
            <TrendingUp size={13} className="text-[var(--color-accent)]" />
            <span>Mesure & Évolution</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text-main)] tracking-tight">
            Bilan Réel & Progression
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-1 max-w-xl">
            Indicateurs concrets calculés à partir de vos activités réelles. Aucune statistique artificielle.
          </p>
        </div>

        <button
          className="bento-btn-primary w-full md:w-auto justify-center self-start md:self-auto"
          onClick={handleAskProgressReview}
        >
          <Sparkles size={14} />
          <span>Bilan personnalisé ELORA</span>
        </button>
      </div>

      {/* Grille des 4 Grandes Métriques (Grille 2x2 intelligente sur mobile) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {/* Métrique 1 : Tâches */}
        <div className="p-3.5 sm:p-5 rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] flex flex-col justify-between min-h-[115px] sm:min-h-[140px]">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-[10px] sm:text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider truncate">
              Tâches Concrétisées
            </span>
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-[var(--color-bg-surface-elevated)] text-[var(--color-accent)] flex items-center justify-center shrink-0">
              <CheckCircle2 size={15} />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-3xl font-extrabold text-[var(--color-text-main)] font-mono">
              {completedTasks.length} <span className="text-xs sm:text-sm font-normal text-[var(--color-text-muted)]">/ {totalTasks}</span>
            </div>
            <p className="text-[10px] sm:text-xs text-[var(--color-text-muted)] mt-0.5 sm:mt-1 truncate">
              Complétion : <strong className="text-[var(--color-text-main)]">{taskCompletionRate}%</strong>
            </p>
          </div>
        </div>

        {/* Métrique 2 : Focus */}
        <div className="p-3.5 sm:p-5 rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] flex flex-col justify-between min-h-[115px] sm:min-h-[140px]">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-[10px] sm:text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider truncate">
              Deep Work
            </span>
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-[var(--color-bg-surface-elevated)] text-[var(--color-accent)] flex items-center justify-center shrink-0">
              <Flame size={15} />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-3xl font-extrabold text-[var(--color-text-main)] font-mono">
              {totalFocusMinutes} <span className="text-xs sm:text-sm font-normal text-[var(--color-text-muted)]">min</span>
            </div>
            <p className="text-[10px] sm:text-xs text-[var(--color-text-muted)] mt-0.5 sm:mt-1 truncate">
              {focusSessions.length} session(s)
            </p>
          </div>
        </div>

        {/* Métrique 3 : Connaissances */}
        <div className="p-3.5 sm:p-5 rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] flex flex-col justify-between min-h-[115px] sm:min-h-[140px]">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-[10px] sm:text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider truncate">
              Bibliothèque
            </span>
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-[var(--color-bg-surface-elevated)] text-[var(--color-accent)] flex items-center justify-center shrink-0">
              <BookOpen size={15} />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-3xl font-extrabold text-[var(--color-text-main)] font-mono">
              {knowledgeDocs.length}
            </div>
            <p className="text-[10px] sm:text-xs text-[var(--color-text-muted)] mt-0.5 sm:mt-1 truncate">
              Ressources indexées
            </p>
          </div>
        </div>

        {/* Métrique 4 : Objectifs */}
        <div className="p-3.5 sm:p-5 rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] flex flex-col justify-between min-h-[115px] sm:min-h-[140px]">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-[10px] sm:text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider truncate">
              Trajectoire
            </span>
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-[var(--color-bg-surface-elevated)] text-[var(--color-accent)] flex items-center justify-center shrink-0">
              <Target size={15} />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-3xl font-extrabold text-[var(--color-text-main)] font-mono">
              {goals.length}
            </div>
            <p className="text-[10px] sm:text-xs text-[var(--color-text-muted)] mt-0.5 sm:mt-1 truncate">
              Objectif(s) actif(s)
            </p>
          </div>
        </div>
      </div>

      {/* Grille : Jalons & Objectifs + Historique Deep Work */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Colonne Gauche : Objectifs et Jalons (8 colonnes) */}
        <div className="lg:col-span-8 space-y-5">
          <div className="p-6 rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h2 className="text-lg font-bold text-[var(--color-text-main)]">
                  Jalons & Réalisations Clés
                </h2>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  Cochez les jalons pour actualiser la trajectoire en temps réel.
                </p>
              </div>
              {goals.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowNewGoalForm((v) => !v)}
                  className="bento-btn-secondary text-xs py-1.5 px-3 self-start sm:self-auto"
                >
                  {showNewGoalForm ? <X size={13} /> : <Plus size={13} />}
                  <span>{showNewGoalForm ? 'Fermer' : 'Nouvel objectif'}</span>
                </button>
              )}
            </div>

            {goals.length > 0 && showNewGoalForm && (
              <form
                onSubmit={handleCreateGoal}
                className="mb-6 p-4 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-strong)] space-y-3"
              >
                <div className="text-xs font-bold text-[var(--color-text-main)]">
                  Ajouter un nouvel objectif
                </div>
                <input
                  type="text"
                  required
                  placeholder="Titre de l'objectif (ex: Maîtriser TypeScript)"
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-border-strong)]"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    placeholder="Catégorie (ex: Projet)"
                    value={newGoalCategory}
                    onChange={(e) => setNewGoalCategory(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-border-strong)]"
                  />
                  <input
                    type="date"
                    value={newGoalTargetDate}
                    onChange={(e) => setNewGoalTargetDate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-border-strong)]"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Premier jalon optionnel (ex: Lire la documentation)"
                  value={newGoalMilestone}
                  onChange={(e) => setNewGoalMilestone(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-border-strong)]"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNewGoalForm(false)}
                    className="px-3 py-1.5 rounded-lg text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={!newGoalTitle.trim()}
                    className="bento-btn-primary py-1.5 px-4 text-xs disabled:opacity-40"
                  >
                    <Plus size={13} />
                    <span>Créer</span>
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-6">
              {goals.length === 0 ? (
                <div className="p-6 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-center space-y-4">
                  <div>
                    <Target size={32} className="text-[var(--color-accent)] mx-auto mb-2 opacity-80" />
                    <h3 className="text-sm font-bold text-[var(--color-text-main)]">
                      Aucun objectif actif pour le moment
                    </h3>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1 max-w-md mx-auto">
                      Définissez votre premier objectif et un jalon initial pour suivre votre progression réelle.
                    </p>
                  </div>

                  <form onSubmit={handleCreateGoal} className="max-w-md mx-auto text-left space-y-3 pt-2">
                    <input
                      type="text"
                      required
                      placeholder="Titre de l'objectif (ex: Maîtriser TypeScript)"
                      value={newGoalTitle}
                      onChange={(e) => setNewGoalTitle(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-border-strong)]"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <input
                        type="text"
                        placeholder="Catégorie (ex: Projet)"
                        value={newGoalCategory}
                        onChange={(e) => setNewGoalCategory(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-border-strong)]"
                      />
                      <input
                        type="date"
                        value={newGoalTargetDate}
                        onChange={(e) => setNewGoalTargetDate(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-border-strong)]"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Premier jalon optionnel (ex: Lire la documentation)"
                      value={newGoalMilestone}
                      onChange={(e) => setNewGoalMilestone(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-border-strong)]"
                    />
                    <button
                      type="submit"
                      disabled={!newGoalTitle.trim()}
                      className="bento-btn-primary w-full justify-center py-2 text-xs disabled:opacity-40"
                    >
                      <Plus size={14} />
                      <span>Créer un objectif</span>
                    </button>
                  </form>
                </div>
              ) : (
                goals.map((goal) => {
                  const linkedTasks = tasks.filter((t) => t.goalId === goal.id);
                  const linkedDone = linkedTasks.filter((t) => t.completed).length;
                  const isEditingThisGoal = editingGoalId === goal.id;
                  const isConfirmingDelete = confirmDeleteGoalId === goal.id;

                  return (
                <div
                  key={goal.id}
                  className="p-5 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] space-y-4"
                >
                  {isEditingThisGoal ? (
                    <form onSubmit={(e) => handleSaveGoalEdit(e, goal.id)} className="space-y-2.5">
                      <input
                        type="text"
                        required
                        value={editGoalTitle}
                        onChange={(e) => setEditGoalTitle(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border-strong)] text-xs font-semibold text-[var(--color-text-main)] focus:outline-none"
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={editGoalCategory}
                          onChange={(e) => setEditGoalCategory(e.target.value)}
                          placeholder="Catégorie"
                          className="w-full px-3 py-1.5 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-main)] focus:outline-none"
                        />
                        <input
                          type="date"
                          value={editGoalTargetDate}
                          onChange={(e) => setEditGoalTargetDate(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-main)] focus:outline-none"
                        />
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingGoalId(null)}
                          className="px-2.5 py-1 rounded-lg text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"
                        >
                          Annuler
                        </button>
                        <button
                          type="submit"
                          className="bento-btn-primary py-1 px-3 text-xs"
                        >
                          Enregistrer
                        </button>
                      </div>
                    </form>
                  ) : (
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-semibold text-[var(--color-accent)] uppercase tracking-wider block">
                        {goal.category}
                      </span>
                      <h3 className="text-sm font-bold text-[var(--color-text-main)] mt-0.5 break-words">
                        {goal.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 mt-0.5">
                        <p className="text-xs text-[var(--color-text-muted)]">
                          Échéance : <span className="font-semibold text-[var(--color-text-main)]">{goal.targetDate}</span>
                        </p>
                        {linkedTasks.length > 0 && (
                          <span className="text-[11px] text-[var(--color-text-muted)]">
                            Tâches liées : <strong className="text-[var(--color-text-main)]">{linkedDone}/{linkedTasks.length}</strong>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
                      <span className="text-2xl font-bold text-[var(--color-accent)] font-mono mr-1">
                        {goal.progressPercentage}%
                      </span>
                      <button
                        type="button"
                        onClick={() => startEditingGoal(goal)}
                        title="Modifier l'objectif"
                        className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-surface)] transition-colors"
                      >
                        <Pencil size={13} />
                      </button>
                      {isConfirmingDelete ? (
                        <div className="flex items-center gap-1 bg-rose-500/10 border border-rose-500/20 rounded-lg px-2 py-1">
                          <button
                            type="button"
                            onClick={() => {
                              deleteGoal(goal.id);
                              setConfirmDeleteGoalId(null);
                            }}
                            className="text-[11px] font-semibold text-rose-500 hover:underline"
                          >
                            Supprimer
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteGoalId(null)}
                            className="text-[11px] text-[var(--color-text-muted)] ml-1"
                          >
                            Annuler
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteGoalId(goal.id)}
                          title="Supprimer l'objectif"
                          className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-rose-500 hover:bg-[var(--color-bg-surface)] transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                  )}

                  {/* Barre de progression sobre */}
                  <div className="w-full h-2 rounded-full bg-[var(--color-bg-base)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--color-accent)] transition-all duration-500"
                      style={{ width: `${goal.progressPercentage}%` }}
                    />
                  </div>

                  {/* Liste des jalons */}
                  <div className="space-y-2 pt-1">
                    {goal.milestones.map((m) => {
                      const isEditingThisMilestone =
                        editingMilestone?.goalId === goal.id && editingMilestone?.milestoneId === m.id;
                      return isEditingThisMilestone ? (
                        <form
                          key={m.id}
                          onSubmit={handleSaveMilestoneEdit}
                          className="flex items-center gap-2 p-2 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border-strong)]"
                        >
                          <input
                            type="text"
                            required
                            value={editingMilestone.title}
                            onChange={(e) =>
                              setEditingMilestone({ ...editingMilestone, title: e.target.value })
                            }
                            className="flex-1 text-xs text-[var(--color-text-main)] bg-transparent focus:outline-none px-1"
                          />
                          <button
                            type="submit"
                            className="px-2.5 py-1 rounded-lg bg-[var(--color-accent)] text-white text-[11px] font-semibold"
                          >
                            OK
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingMilestone(null)}
                            className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"
                          >
                            <X size={13} />
                          </button>
                        </form>
                      ) : (
                      <div
                        key={m.id}
                        className={`w-full p-2.5 sm:p-3 rounded-xl border flex items-center gap-2.5 transition-all group ${
                          m.completed
                            ? 'bg-[var(--color-bg-surface)] border-[var(--color-border-subtle)] text-[var(--color-text-main)]'
                            : 'bg-[var(--color-bg-surface)] border-[var(--color-border-subtle)] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)]'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleMilestone(goal.id, m.id)}
                          className="flex items-center gap-3 flex-1 text-left min-w-0"
                        >
                          <div
                            className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                              m.completed
                                ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white'
                                : 'border-[var(--color-border-strong)] bg-[var(--color-bg-base)]'
                            }`}
                          >
                            {m.completed && <Check size={12} />}
                          </div>
                          <span className={`text-xs font-medium flex-1 truncate ${m.completed ? 'text-[var(--color-text-main)] font-semibold' : ''}`}>
                            {m.title}
                          </span>
                        </button>
                        <div className="flex items-center gap-1 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() =>
                              setEditingMilestone({ goalId: goal.id, milestoneId: m.id, title: m.title })
                            }
                            title="Modifier l'étape"
                            className="p-1 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteMilestone(goal.id, m.id)}
                            title="Supprimer l'étape"
                            className="p-1 rounded-md text-[var(--color-text-muted)] hover:text-rose-500"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                      );
                    })}

                    {/* Ajouter une étape à cet objectif */}
                    <form
                      onSubmit={(e) => handleAddMilestoneSubmit(e, goal.id)}
                      className="flex items-center gap-2 pt-1"
                    >
                      <input
                        type="text"
                        placeholder="Ajouter une étape..."
                        value={milestoneInputs[goal.id] || ''}
                        onChange={(e) =>
                          setMilestoneInputs((prev) => ({ ...prev, [goal.id]: e.target.value }))
                        }
                        className="flex-1 px-3 py-1.5 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-border-strong)]"
                      />
                      <button
                        type="submit"
                        disabled={!(milestoneInputs[goal.id] || '').trim()}
                        className="px-3 py-1.5 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] text-xs font-semibold text-[var(--color-text-main)] hover:border-[var(--color-border-strong)] disabled:opacity-40 flex items-center gap-1"
                      >
                        <Plus size={12} />
                        <span>Étape</span>
                      </button>
                    </form>
                  </div>
                </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Colonne Droite : Historique Deep Work (4 colonnes) */}
        <div className="lg:col-span-4 space-y-5">
          <div className="p-6 rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-bg-surface-elevated)] text-[var(--color-accent)] flex items-center justify-center">
                  <Flame size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--color-text-main)]">
                    Historique Deep Work
                  </h3>
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    Sessions récentes
                  </p>
                </div>
              </div>

              {focusSessions.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-xs text-[var(--color-text-muted)]">Aucune session enregistrée.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {focusSessions.map((s) => (
                    <div
                      key={s.id}
                      className="p-3.5 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] space-y-1"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[var(--color-accent)] flex items-center gap-1">
                          <Flame size={11} />
                          {s.durationMinutes} min
                        </span>
                        <span className="text-[10px] text-[var(--color-text-muted)] font-mono">{s.completedAt}</span>
                      </div>
                      <p className="text-xs font-medium text-[var(--color-text-main)] break-words">{s.goalTitle}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 mt-5 border-t border-[var(--color-border-subtle)]">
              <button
                className="bento-btn-secondary w-full"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    sessionStorage.setItem('elora_planner_mode', 'focus');
                  }
                  setActiveTab('planner');
                }}
              >
                <Calendar size={13} />
                <span>Lancer un Focus</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
