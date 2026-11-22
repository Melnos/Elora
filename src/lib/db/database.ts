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

  // Mémoire Personnelle
  getMemories(): MemoryItem[] {
    return safeGet<MemoryItem[]>(KEYS.MEMORIES, initialMemories);
  },
  saveMemories(memories: MemoryItem[]): void {
    safeSet(KEYS.MEMORIES, memories);
  },
  addMemory(item: Omit<MemoryItem, 'id' | 'dateAdded'>): MemoryItem {
    const memories = this.getMemories();
    const newMem: MemoryItem = {
      ...item,
      id: `mem_${Date.now()}`,
      dateAdded: new Date().toISOString().split('T')[0],
    };
    const next = [newMem, ...memories];
    this.saveMemories(next);
    return newMem;
  },
  toggleMemory(id: string): MemoryItem[] {
    const memories = this.getMemories();
    const next = memories.map((m) =>
      m.id === id ? { ...m, enabledForAI: !m.enabledForAI } : m
    );
    this.saveMemories(next);
    return next;
  },
  deleteMemory(id: string): MemoryItem[] {
    const memories = this.getMemories();
    const next = memories.filter((m) => m.id !== id);
    this.saveMemories(next);
    return next;
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
  toggleMilestone(goalId: string, milestoneId: string): GoalItem[] {
    const goals = this.getGoals();
    const next = goals.map((g) => {
      if (g.id !== goalId) return g;
      const updatedMilestones = g.milestones.map((m) =>
        m.id === milestoneId ? { ...m, completed: !m.completed } : m
      );
      const completedCount = updatedMilestones.filter((m) => m.completed).length;
      const newPercentage = Math.round((completedCount / updatedMilestones.length) * 100);
      return {
        ...g,
        milestones: updatedMilestones,
        progressPercentage: newPercentage,
        completed: newPercentage === 100,
      };
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
