/**
 * ELORA - Système de Base de Données Locale & Hybride (Client Database)
 * Gère le stockage persistant, fiable et réactif de toutes les entités :
 * - Profils & Authentification
 * - Tâches & Projets (Planner)
 * - Sessions Deep Work (Focus)
 * - Bibliothèque de Savoirs (Knowledge)
 * - Opportunités Vérifiées
 * - Conversations IA & Mémoire Personnelle
 */

import type {
  UserProfile,
  TaskItem,
  GoalItem,
  FocusSession,
  KnowledgeDoc,
  OpportunityItem,
  Conversation,
  MemoryItem,
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

export class EloraDB {
  private static PREFIX = 'elora_db_v2_';

  // Utilitaires de stockage persistant
  private static getItem<T>(key: string, defaultValue: T): T {
    if (typeof localStorage === 'undefined') return defaultValue;
    try {
      const data = localStorage.getItem(this.PREFIX + key);
      return data ? JSON.parse(data) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private static setItem<T>(key: string, value: T): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(this.PREFIX + key, JSON.stringify(value));
    } catch (err) {
      console.error('[EloraDB] Erreur écriture :', key, err);
    }
  }

  // --- PROFIL ---
  public static getProfile(): UserProfile {
    return this.getItem<UserProfile>('profile', initialProfile);
  }

  public static saveProfile(profile: UserProfile): void {
    this.setItem('profile', profile);
  }

  // --- TÂCHES (PLANNER) ---
  public static getTasks(): TaskItem[] {
    return this.getItem<TaskItem[]>('tasks', initialTasks);
  }

  public static saveTasks(tasks: TaskItem[]): void {
    this.setItem('tasks', tasks);
  }

  public static addTask(task: Omit<TaskItem, 'id'>): TaskItem {
    const tasks = this.getTasks();
    const newTask: TaskItem = {
      ...task,
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };
    const updated = [newTask, ...tasks];
    this.saveTasks(updated);
    return newTask;
  }

  public static toggleTask(id: string): TaskItem[] {
    const tasks = this.getTasks();
    const updated = tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
    this.saveTasks(updated);
    return updated;
  }

  public static deleteTask(id: string): TaskItem[] {
    const tasks = this.getTasks();
    const updated = tasks.filter((t) => t.id !== id);
    this.saveTasks(updated);
    return updated;
  }

  // --- OBJECTIFS & JALONS ---
  public static getGoals(): GoalItem[] {
    return this.getItem<GoalItem[]>('goals', initialGoals);
  }

  public static saveGoals(goals: GoalItem[]): void {
    this.setItem('goals', goals);
  }

  public static toggleMilestone(goalId: string, milestoneId: string): GoalItem[] {
    const goals = this.getGoals();
    const updated = goals.map((g) => {
      if (g.id === goalId) {
        const milestones = g.milestones.map((m) =>
          m.id === milestoneId ? { ...m, completed: !m.completed } : m
        );
        const completed = milestones.filter((m) => m.completed).length;
        const progressPercentage = Math.round((completed / milestones.length) * 100);
        return { ...g, milestones, progressPercentage };
      }
      return g;
    });
    this.saveGoals(updated);
    return updated;
  }

  // --- SESSIONS FOCUS (DEEP WORK) ---
  public static getFocusSessions(): FocusSession[] {
    return this.getItem<FocusSession[]>('focus_sessions', initialFocusSessions);
  }

  public static addFocusSession(session: Omit<FocusSession, 'id' | 'completedAt'>): FocusSession {
    const sessions = this.getFocusSessions();
    const newSession: FocusSession = {
      ...session,
      id: `focus_${Date.now()}`,
      completedAt: new Date().toISOString(),
    };
    const updated = [newSession, ...sessions];
    this.setItem('focus_sessions', updated);
    return newSession;
  }

  // --- CONNAISSANCES & SAVOIR ---
  public static getKnowledge(): KnowledgeDoc[] {
    return this.getItem<KnowledgeDoc[]>('knowledge', initialKnowledge);
  }

  public static addKnowledge(doc: Omit<KnowledgeDoc, 'id' | 'addedAt'>): KnowledgeDoc {
    const docs = this.getKnowledge();
    const newDoc: KnowledgeDoc = {
      ...doc,
      id: `doc_${Date.now()}`,
      addedAt: new Date().toISOString().split('T')[0],
    };
    const updated = [newDoc, ...docs];
    this.setItem('knowledge', updated);
    return newDoc;
  }

  public static deleteKnowledge(id: string): KnowledgeDoc[] {
    const docs = this.getKnowledge();
    const updated = docs.filter((d) => d.id !== id);
    this.setItem('knowledge', updated);
    return updated;
  }

  // --- OPPORTUNITÉS ---
  public static getOpportunities(): OpportunityItem[] {
    return this.getItem<OpportunityItem[]>('opportunities', initialOpportunities);
  }

  public static toggleSaveOpportunity(id: string): OpportunityItem[] {
    const opps = this.getOpportunities();
    const updated = opps.map((o) => (o.id === id ? { ...o, saved: !o.saved } : o));
    this.setItem('opportunities', updated);
    return updated;
  }

  // --- MÉMOIRE PERSONNELLE ---
  public static getMemories(): MemoryItem[] {
    return this.getItem<MemoryItem[]>('memories', initialMemories);
  }

  public static addMemory(item: Omit<MemoryItem, 'id' | 'dateAdded'>): MemoryItem {
    const memories = this.getMemories();
    const newMem: MemoryItem = {
      ...item,
      id: `mem_${Date.now()}`,
      dateAdded: new Date().toISOString().split('T')[0],
    };
    const updated = [newMem, ...memories];
    this.setItem('memories', updated);
    return newMem;
  }

  public static toggleMemory(id: string): MemoryItem[] {
    const memories = this.getMemories();
    const updated = memories.map((m) =>
      m.id === id ? { ...m, enabledForAI: !m.enabledForAI } : m
    );
    this.setItem('memories', updated);
    return updated;
  }

  public static deleteMemory(id: string): MemoryItem[] {
    const memories = this.getMemories();
    const updated = memories.filter((m) => m.id !== id);
    this.setItem('memories', updated);
    return updated;
  }

  // --- CONVERSATIONS IA ---
  public static getConversations(): Conversation[] {
    return this.getItem<Conversation[]>('conversations', initialConversations);
  }

  public static saveConversations(convs: Conversation[]): void {
    this.setItem('conversations', convs);
  }
}
