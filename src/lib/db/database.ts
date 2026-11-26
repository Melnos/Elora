/**
 * ELORA - Database Layer (EloraDB)
 * Persistance locale robuste avec initialisation depuis les données de cadrage (mockData).
 * Tolérant aux erreurs de sérialisation et compatible hors ligne / SSR.
 */

import type {
  UserProfile,
  MemoryItem,
  TaskItem,
  GoalItem,
  FocusSession,
  KnowledgeDoc,
  OpportunityItem,
  Conversation,
} from '../../types';

import {
  initialProfile,
  initialMemories,
  initialTasks,
  initialGoals,
  initialFocusSessions,
  initialKnowledge,
  initialOpportunities,
  initialConversations,
} from '../mockData';
import { MemoryService } from '../memory/MemoryService';
import type { MemoryItem as ServiceMemoryItem } from '../memory/types';
import { deduplicateOpportunities } from '../opportunities/opportunityExtractor';

const KEYS = {
  PROFILE: 'elora_db_profile',
  MEMORIES: 'elora_db_memories',
  TASKS: 'elora_db_tasks',
  GOALS: 'elora_db_goals',
  FOCUS: 'elora_db_focus',
  KNOWLEDGE: 'elora_db_knowledge',
  OPPORTUNITIES: 'elora_db_opportunities',
  CONVERSATIONS: 'elora_db_conversations',
} as const;

function safeGet<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return fallback;
  }
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`[EloraDB] Erreur lecture clé "${key}":`, err);
    return fallback;
  }
}

function safeSet<T>(key: string, data: T): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn(`[EloraDB] Erreur écriture clé "${key}":`, err);
  }
}

export const EloraDB = {
  // Profil Utilisateur
  getProfile(): UserProfile {
    return safeGet<UserProfile>(KEYS.PROFILE, initialProfile);
  },
  saveProfile(profile: UserProfile): void {
    safeSet(KEYS.PROFILE, profile);
  },

  // Mémoire Personnelle (délègue à la source unique MemoryService, isolée par userId)
  getLegacyMemories(): MemoryItem[] {
    return safeGet<MemoryItem[]>(KEYS.MEMORIES, initialMemories);
  },
  getMemories(userId = 'local_user'): MemoryItem[] {
    const legacy = this.getLegacyMemories();
    return MemoryService.migrateLegacyMemories(userId, legacy as unknown as ServiceMemoryItem[]) as unknown as MemoryItem[];
  },
  saveMemories(memories: MemoryItem[], userId = 'local_user'): void {
    MemoryService.syncFromFirestore(userId, memories as unknown as ServiceMemoryItem[]);
  },
  addMemory(item: Omit<MemoryItem, 'id' | 'dateAdded'>, userId = 'local_user'): MemoryItem | null {
    return MemoryService.addMemory(userId, {
      category: (item.category || 'context') as ServiceMemoryItem['category'],
      key: item.key,
      value: item.value,
      enabledForAI: item.enabledForAI,
      source: (item.source as ServiceMemoryItem['source']) || 'user_explicit',
      status: item.status === 'temporary' ? 'temporary' : 'active',
      expiresAt: item.expiresAt,
    }) as unknown as MemoryItem | null;
  },
  toggleMemory(id: string, userId = 'local_user'): MemoryItem[] {
    const current = this.getMemories(userId);
    const target = current.find((m) => m.id === id);
    if (target) {
      MemoryService.updateMemory(userId, id, { enabledForAI: !target.enabledForAI });
    }
    return MemoryService.getMemories(userId) as unknown as MemoryItem[];
  },
  deleteMemory(id: string, userId = 'local_user'): MemoryItem[] {
    MemoryService.deleteMemory(userId, id);
    return MemoryService.getMemories(userId) as unknown as MemoryItem[];
  },

  // Tâches Planner
  getTasks(): TaskItem[] {
    return safeGet<TaskItem[]>(KEYS.TASKS, initialTasks);
  },
  saveTasks(tasks: TaskItem[]): void {
    safeSet(KEYS.TASKS, tasks);
  },
  addTask(task: Omit<TaskItem, 'id'>): TaskItem {
    const tasks = this.getTasks();
    const newTask: TaskItem = {
      ...task,
      id: `task_${Date.now()}`,
    };
    const next = [newTask, ...tasks];
    this.saveTasks(next);
    return newTask;
  },
  toggleTask(id: string): TaskItem[] {
    const tasks = this.getTasks();
    const next = tasks.map((t) =>
      t.id === id ? { ...t, completed: !t.completed } : t
    );
    this.saveTasks(next);
    return next;
  },
  updateTask(
    id: string,
    updates: Partial<Pick<TaskItem, 'title' | 'description' | 'dueDate' | 'priority' | 'completed' | 'category' | 'goalId'>>
  ): TaskItem[] {
    const tasks = this.getTasks();
    const next = tasks.map((t) => (t.id === id ? { ...t, ...updates } : t));
    this.saveTasks(next);
    return next;
  },
  deleteTask(id: string): TaskItem[] {
    const tasks = this.getTasks();
    const next = tasks.filter((t) => t.id !== id);
    this.saveTasks(next);
    return next;
  },

  // Objectifs & Jalons Progress
  getGoals(): GoalItem[] {
    return safeGet<GoalItem[]>(KEYS.GOALS, initialGoals);
  },
  saveGoals(goals: GoalItem[]): void {
    safeSet(KEYS.GOALS, goals);
  },
  recomputeGoalProgress(goal: GoalItem): GoalItem {
    const total = goal.milestones.length;
    if (total === 0) {
      return {
        ...goal,
        progressPercentage: goal.completed ? 100 : 0,
      };
    }
    const completedCount = goal.milestones.filter((m) => m.completed).length;
    const newPercentage = Math.round((completedCount / total) * 100);
    return {
      ...goal,
      progressPercentage: newPercentage,
      completed: newPercentage === 100,
    };
  },
  updateGoal(
    goalId: string,
    updates: Partial<Pick<GoalItem, 'title' | 'category' | 'targetDate' | 'completed'>>
  ): GoalItem[] {
    const goals = this.getGoals();
    const next = goals.map((g) => {
      if (g.id !== goalId) return g;
      const merged: GoalItem = {
        ...g,
        ...updates,
      };
      return this.recomputeGoalProgress(merged);
    });
    this.saveGoals(next);
    return next;
  },
  deleteGoal(goalId: string): GoalItem[] {
    const next = this.getGoals().filter((g) => g.id !== goalId);
    this.saveGoals(next);
    return next;
  },
  addMilestone(goalId: string, title: string): GoalItem[] {
    const trimmed = title.trim();
    if (!trimmed) return this.getGoals();
    const goals = this.getGoals();
    const next = goals.map((g) => {
      if (g.id !== goalId) return g;
      const newMilestone = {
        id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: trimmed,
        completed: false,
      };
      return this.recomputeGoalProgress({
        ...g,
        milestones: [...g.milestones, newMilestone],
      });
    });
    this.saveGoals(next);
    return next;
  },
  updateMilestone(goalId: string, milestoneId: string, title: string): GoalItem[] {
    const trimmed = title.trim();
    if (!trimmed) return this.getGoals();
    const goals = this.getGoals();
    const next = goals.map((g) => {
      if (g.id !== goalId) return g;
      const updatedMilestones = g.milestones.map((m) =>
        m.id === milestoneId ? { ...m, title: trimmed } : m
      );
      return this.recomputeGoalProgress({
        ...g,
        milestones: updatedMilestones,
      });
    });
    this.saveGoals(next);
    return next;
  },
  deleteMilestone(goalId: string, milestoneId: string): GoalItem[] {
    const goals = this.getGoals();
    const next = goals.map((g) => {
      if (g.id !== goalId) return g;
      const updatedMilestones = g.milestones.filter((m) => m.id !== milestoneId);
      return this.recomputeGoalProgress({
        ...g,
        milestones: updatedMilestones,
        completed: updatedMilestones.length > 0 ? g.completed : false,
      });
    });
    this.saveGoals(next);
    return next;
  },
  toggleMilestone(goalId: string, milestoneId: string): GoalItem[] {
    const goals = this.getGoals();
    const next = goals.map((g) => {
      if (g.id !== goalId) return g;
      const updatedMilestones = g.milestones.map((m) =>
        m.id === milestoneId ? { ...m, completed: !m.completed } : m
      );
      return this.recomputeGoalProgress({
        ...g,
        milestones: updatedMilestones,
      });
    });
    this.saveGoals(next);
    return next;
  },

  // Sessions Focus Deep Work
  getFocusSessions(): FocusSession[] {
    return safeGet<FocusSession[]>(KEYS.FOCUS, initialFocusSessions);
  },
  saveFocusSessions(sessions: FocusSession[]): void {
    safeSet(KEYS.FOCUS, sessions);
  },
  addFocusSession(session: Omit<FocusSession, 'id' | 'completedAt'>): FocusSession {
    const sessions = this.getFocusSessions();
    const now = new Date();
    const formatted = `${now.toISOString().split('T')[0]} ${now.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
    const newSession: FocusSession = {
      ...session,
      id: `foc_${Date.now()}`,
      completedAt: formatted,
    };
    const next = [newSession, ...sessions];
    this.saveFocusSessions(next);
    return newSession;
  },

  // Bibliothèque de Savoir Knowledge
  getKnowledge(): KnowledgeDoc[] {
    return safeGet<KnowledgeDoc[]>(KEYS.KNOWLEDGE, initialKnowledge);
  },
  saveKnowledge(docs: KnowledgeDoc[]): void {
    safeSet(KEYS.KNOWLEDGE, docs);
  },
  addKnowledge(docData: Omit<KnowledgeDoc, 'id' | 'addedAt'>): KnowledgeDoc {
    const docs = this.getKnowledge();
    const newDoc: KnowledgeDoc = {
      ...docData,
      id: `doc_${Date.now()}`,
      addedAt: new Date().toISOString().split('T')[0],
    };
    const next = [newDoc, ...docs];
    this.saveKnowledge(next);
    return newDoc;
  },
  deleteKnowledge(id: string): KnowledgeDoc[] {
    const docs = this.getKnowledge();
    const next = docs.filter((d) => d.id !== id);
    this.saveKnowledge(next);
    return next;
  },

  // Opportunités
  getOpportunities(): OpportunityItem[] {
    return safeGet<OpportunityItem[]>(KEYS.OPPORTUNITIES, initialOpportunities);
  },
  saveOpportunities(opps: OpportunityItem[]): void {
    safeSet(KEYS.OPPORTUNITIES, opps);
  },
  addOpportunities(
    items: Omit<OpportunityItem, 'id' | 'saved'>[],
    savedByDefault = false
  ): { added: OpportunityItem[]; all: OpportunityItem[] } {
    const existing = this.getOpportunities();
    const incoming: OpportunityItem[] = items.map((item, idx) => ({
      ...item,
      id: `opp_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
      saved: savedByDefault,
    }));
    const { added, merged } = deduplicateOpportunities(existing, incoming);
    if (added.length > 0) {
      this.saveOpportunities(merged);
    }
    return { added, all: merged };
  },
  toggleSaveOpportunity(id: string): OpportunityItem[] {
    const opps = this.getOpportunities();
    const next = opps.map((o) =>
      o.id === id ? { ...o, saved: !o.saved } : o
    );
    this.saveOpportunities(next);
    return next;
  },

  // Discussions IA
  getConversations(): Conversation[] {
    return safeGet<Conversation[]>(KEYS.CONVERSATIONS, initialConversations);
  },
  saveConversations(convs: Conversation[]): void {
    safeSet(KEYS.CONVERSATIONS, convs);
  },

  // Réinitialisation d'usine
  resetAll(): void {
    if (typeof localStorage === 'undefined') return;
    Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
  },
};
