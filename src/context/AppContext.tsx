import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import type { User } from 'firebase/auth';
import type {
  NavTab,
  ThemeMode,
  UserProfile,
  MemoryItem,
  TaskItem,
  GoalItem,
  FocusSession,
  KnowledgeDoc,
  OpportunityItem,
  Conversation,
  ChatMessage,
} from '../types';
import { EloraDB } from '../lib/db/database';
import {
  type ActiveFocusTimerState,
  createInitialFocusState,
  loadActiveFocusTimer,
  saveActiveFocusTimer,
  clearActiveFocusTimer,
  computeRemainingSeconds,
  computeElapsedMinutes,
  hasRecordedFocusSessionId,
  markFocusSessionIdRecorded,
  generateFocusSessionId,
} from '../lib/focus/focusTimer';
import { OfflineQueue } from '../lib/offline/OfflineQueue';
import { MemoryService } from '../lib/memory/MemoryService';
import { orchestrator } from '../lib/ai/AIOrchestrator';
import { CapabilityDetector } from '../lib/ai/CapabilityDetector';
import type { CapabilityReport, InferenceMode, AIResponse, AIRequestAttachment } from '../lib/ai/types';
import { ContextEngine } from '../lib/context/ContextEngine';
import type { HomeBriefing, ProposedAction } from '../lib/context/types';
import { ActionEngine } from '../lib/actions/ActionEngine';
import {
  buildOpportunitySearchPrompt,
  extractOpportunitiesFromWebResponse,
  deduplicateOpportunities,
} from '../lib/opportunities/opportunityExtractor';
import {
  generateConversationTitle,
  sortConversationsByDate,
  DEFAULT_CONVERSATION_TITLE,
  MAX_CONVERSATION_TITLE_LENGTH,
} from '../lib/conversations/conversationUtils';
import {
  subscribeToAuthState,
  logoutUser,
  getSavedAuthSession,
  getPendingSignupDisplayName,
  clearPendingSignupDisplayName,
} from '../lib/firebase/auth';
import {
  syncUserProfile,
  fetchUserData,
  saveUserTask,
  deleteUserTask,
  saveUserGoal,
  deleteUserGoal,
  saveUserFocusSession,
  saveUserMemory,
  deleteUserMemory,
  saveUserKnowledgeDoc,
  deleteUserKnowledgeDoc,
  saveUserOpportunity,
  saveUserConversation,
  deleteUserConversation,
  processOfflineQueue,
  mergeCollectionById,
  mergeOpportunities,
} from '../lib/firebase/firestore';
import { deleteKnowledgeFile, extractStoragePathFromInsights } from '../lib/firebase/storage';

interface AppContextType {
  // Navigation & Vues
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;

  // Thème
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;

  // Modales
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  isDiagnosticOpen: boolean;
  setIsDiagnosticOpen: (open: boolean) => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;

  // Authentification & Cloud Sync
  currentUser: User | null;
  isAuthLoading: boolean;
  isSyncingCloud: boolean;
  logout: () => Promise<void>;
  triggerCloudSync: () => Promise<void>;

  // Données utilisateur & Mémoire
  profile: UserProfile;
  updateProfile: (updated: Partial<UserProfile>) => void;
  memories: MemoryItem[];
  addMemory: (item: Omit<MemoryItem, 'id' | 'dateAdded'>) => MemoryItem | null;
  updateMemory: (
    id: string,
    updates: Partial<Pick<MemoryItem, 'key' | 'value' | 'category' | 'status' | 'enabledForAI' | 'expiresAt'>>
  ) => MemoryItem | null;
  confirmMemory: (id: string, targetStatus?: 'active' | 'temporary') => MemoryItem | null;
  toggleMemoryAI: (id: string) => void;
  deleteMemory: (id: string) => boolean;

  // Planner & Tâches
  tasks: TaskItem[];
  addTask: (task: Omit<TaskItem, 'id'>) => void;
  updateTask: (
    id: string,
    updates: Partial<Pick<TaskItem, 'title' | 'description' | 'dueDate' | 'priority' | 'completed' | 'category' | 'goalId'>>
  ) => void;
  toggleTaskCompleted: (id: string) => void;
  deleteTask: (id: string) => void;

  // Objectifs
  goals: GoalItem[];
  addGoal: (goal: Omit<GoalItem, 'id'>) => void;
  updateGoal: (
    goalId: string,
    updates: Partial<Pick<GoalItem, 'title' | 'category' | 'targetDate' | 'completed'>>
  ) => void;
  deleteGoal: (goalId: string) => void;
  addMilestone: (goalId: string, title: string) => void;
  updateMilestone: (goalId: string, milestoneId: string, title: string) => void;
  deleteMilestone: (goalId: string, milestoneId: string) => void;
  toggleMilestone: (goalId: string, milestoneId: string) => void;

  // Sessions Focus & Minuteur persistant
  focusSessions: FocusSession[];
  addFocusSession: (session: Omit<FocusSession, 'id' | 'completedAt'>) => void;
  activeFocus: ActiveFocusTimerState;
  focusSecondsLeft: number;
  focusCompletedPendingSave: boolean;
  startFocusTimer: () => void;
  pauseFocusTimer: () => void;
  resetFocusTimer: (durationMinutes?: number) => void;
  setFocusConfig: (config: { goalTitle?: string; durationMinutes?: number }) => void;
  saveCompletedFocusSession: (options?: { notes?: string; useElapsedIfRunning?: boolean }) => boolean;
  dismissCompletedFocusSession: () => void;

  // Connaissances
  knowledgeDocs: KnowledgeDoc[];
  addKnowledgeDoc: (doc: Omit<KnowledgeDoc, 'id' | 'addedAt'>) => KnowledgeDoc;
  updateKnowledgeDoc: (
    id: string,
    updates: Partial<Pick<KnowledgeDoc, 'title' | 'collection' | 'summary' | 'tags' | 'keyInsights'>>
  ) => void;
  deleteKnowledgeDoc: (id: string) => void;

  // Opportunités
  opportunities: OpportunityItem[];
  matchedOpportunities: OpportunityItem[];
  toggleSaveOpportunity: (id: string) => void;
  addOpportunityToPlanner: (opp: OpportunityItem) => void;
  searchWebOpportunities: (customQuery?: string) => Promise<{ addedCount: number; error?: string }>;
  isSearchingOpportunities: boolean;

  // Intelligence Transversale & Briefing (ContextEngine & ActionEngine)
  homeBriefing: HomeBriefing;
  executeProposedAction: (action: ProposedAction, messageId?: string) => Promise<void>;
  rejectProposedAction: (actionId: string, messageId?: string) => void;

  // Conversations IA
  conversations: Conversation[];
  currentConversationId: string;
  setCurrentConversationId: (id: string) => void;
  createConversation: (initialTitle?: string) => string;
  deleteConversation: (id: string) => void;
  renameConversation: (id: string, newTitle: string) => void;
  sendMessage: (
    text: string,
    options?: {
      mode?: InferenceMode;
      localOnly?: boolean;
      attachments?: AIRequestAttachment[];
    }
  ) => Promise<void>;
  cancelGeneration: () => void;
  isGenerating: boolean;

  // Diagnostic IA
  caps: CapabilityReport | null;
  refreshCapabilities: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<NavTab>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab') as NavTab;
      if (tab && ['home', 'ai', 'knowledge', 'planner', 'opportunities', 'progress'].includes(tab)) {
        return tab;
      }
    }
    return 'home';
  });
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlTheme = params.get('theme') as ThemeMode;
      if (urlTheme && ['light', 'dark'].includes(urlTheme)) {
        return urlTheme;
      }
    }
    return (localStorage.getItem('elora_theme') as ThemeMode) || 'light';
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Authentification
  const [currentUser, setCurrentUser] = useState<User | null>(() => getSavedAuthSession());
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);

  // Données avec persistance base de données locale (EloraDB)
  const [profile, setProfile] = useState<UserProfile>(() => EloraDB.getProfile());
  const [memories, setMemories] = useState<MemoryItem[]>(() => {
    const uid = currentUser?.uid || 'local_user';
    return EloraDB.getMemories(uid);
  });
  const [tasks, setTasks] = useState<TaskItem[]>(() => EloraDB.getTasks());
  const [goals, setGoals] = useState<GoalItem[]>(() => EloraDB.getGoals());
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>(() => EloraDB.getFocusSessions());
  const [activeFocus, setActiveFocus] = useState<ActiveFocusTimerState>(() => loadActiveFocusTimer());
  const [focusSecondsLeft, setFocusSecondsLeft] = useState<number>(() =>
    computeRemainingSeconds(loadActiveFocusTimer())
  );
  const [knowledgeDocs, setKnowledgeDocs] = useState<KnowledgeDoc[]>(() => EloraDB.getKnowledge());
  const [opportunities, setOpportunities] = useState<OpportunityItem[]>(() => EloraDB.getOpportunities());
  const [conversations, setConversations] = useState<Conversation[]>(() => EloraDB.getConversations());

  const [currentConversationId, setCurrentConversationId] = useState<string>(() => {
    return conversations[0]?.id || '';
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSearchingOpportunities, setIsSearchingOpportunities] = useState(false);
  const [caps, setCaps] = useState<CapabilityReport | null>(null);

  // Synchronisation des thèmes
  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    localStorage.setItem('elora_theme', newTheme);
    applyThemeToDocument(newTheme);
  };

  const applyThemeToDocument = (t: ThemeMode) => {
    const root = document.documentElement;
    if (t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  };

  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  // Synchronisation Cloud manuelle ou automatique
  const triggerCloudSync = useCallback(async () => {
    if (!currentUser || !navigator.onLine) return;
    setIsSyncingCloud(true);
    try {
      await processOfflineQueue(currentUser.uid);
      const cloudData = await fetchUserData(currentUser.uid);
      if (cloudData) {
        if (cloudData.profile) {
          setProfile(cloudData.profile);
          EloraDB.saveProfile(cloudData.profile);
          clearPendingSignupDisplayName();
        } else {
          const baseProfile = EloraDB.getProfile();
          const resolvedName =
            currentUser.displayName || getPendingSignupDisplayName() || baseProfile.name;
          const initialProfile: UserProfile = {
            ...baseProfile,
            name: resolvedName,
            email: currentUser.email || baseProfile.email,
          };
          EloraDB.saveProfile(initialProfile);
          setProfile(initialProfile);
          await syncUserProfile(currentUser.uid, initialProfile);
          clearPendingSignupDisplayName();
        }

        if (cloudData.tasks.length > 0) {
          const merged = mergeCollectionById(EloraDB.getTasks(), cloudData.tasks);
          setTasks(merged);
          EloraDB.saveTasks(merged);
        }
        if (cloudData.goals.length > 0) {
          const merged = mergeCollectionById(EloraDB.getGoals(), cloudData.goals);
          setGoals(merged);
          EloraDB.saveGoals(merged);
        }
        if (cloudData.focusSessions.length > 0) {
          const merged = mergeCollectionById(EloraDB.getFocusSessions(), cloudData.focusSessions);
          setFocusSessions(merged);
          EloraDB.saveFocusSessions(merged);
        }
        if (cloudData.memories.length > 0) {
          const synced = MemoryService.syncFromFirestore(currentUser.uid, cloudData.memories as any);
          setMemories(synced as unknown as MemoryItem[]);
        } else {
          setMemories(MemoryService.getMemories(currentUser.uid) as unknown as MemoryItem[]);
        }
        if (cloudData.knowledgeDocs.length > 0) {
          const merged = mergeCollectionById(EloraDB.getKnowledge(), cloudData.knowledgeDocs);
          setKnowledgeDocs(merged);
          EloraDB.saveKnowledge(merged);
        }
        if (cloudData.opportunities.length > 0) {
          const merged = mergeOpportunities(EloraDB.getOpportunities(), cloudData.opportunities);
          setOpportunities(merged);
          EloraDB.saveOpportunities(merged);
        }
        const localConvs = EloraDB.getConversations();
        const cloudConvIds = new Set(cloudData.conversations.map((c) => c.id));
        const mergedConvs = sortConversationsByDate(
          mergeCollectionById(localConvs, cloudData.conversations)
        );
        if (cloudData.conversations.length > 0 || localConvs.some((c) => c.createdAt || c.updatedAt)) {
          setConversations(mergedConvs);
          EloraDB.saveConversations(mergedConvs);
          setCurrentConversationId((prevId) =>
            mergedConvs.some((c) => c.id === prevId) ? prevId : mergedConvs[0]?.id || ''
          );
        }
        // Pousser vers Firestore les conversations créées/modifiées localement non encore présentes sur le Cloud
        for (const lc of mergedConvs) {
          if (!cloudConvIds.has(lc.id) && (lc.createdAt || lc.updatedAt)) {
            void saveUserConversation(currentUser.uid, lc);
          }
        }
      }
    } catch (err) {
      console.warn('[Sync] Erreur lors de la synchronisation Firestore :', err);
    } finally {
      setIsSyncingCloud(false);
    }
  }, [currentUser]);

  // Écouteur de session Firebase Auth
  useEffect(() => {
    const unsubscribe = subscribeToAuthState(async (user) => {
      setCurrentUser(user);
      setIsAuthLoading(false);
      if (user) {
        const resolvedName = user.displayName || getPendingSignupDisplayName();
        if (resolvedName || user.email) {
          setProfile((prev) => {
            const updated = {
              ...prev,
              name: resolvedName || prev.name,
              email: user.email || prev.email,
            };
            EloraDB.saveProfile(updated);
            return updated;
          });
        }
        triggerCloudSync();
      }
    });

    return () => unsubscribe();
  }, [triggerCloudSync]);

  // Actualisation des capacités IA
  const refreshCapabilities = useCallback(async () => {
    const report = await CapabilityDetector.detect();
    setCaps(report);
  }, []);

  useEffect(() => {
    refreshCapabilities();
  }, [refreshCapabilities]);

  // Actions Profile
  const updateProfile = (updated: Partial<UserProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...updated };
      EloraDB.saveProfile(next);
      if (currentUser) {
        syncUserProfile(currentUser.uid, next);
      }
      return next;
    });
  };

  // Actions Mémoire (source de vérité unique : MemoryService, isolée par userId)
  const activeMemoryUid = currentUser?.uid || 'local_user';

  const addMemory = (item: Omit<MemoryItem, 'id' | 'dateAdded'>): MemoryItem | null => {
    const created = MemoryService.addMemory(activeMemoryUid, {
      category: (item.category || 'context') as any,
      key: item.key,
      value: item.value,
      enabledForAI: item.enabledForAI,
      source: (item.source as any) || 'user_explicit',
      status: item.status === 'temporary' ? 'temporary' : 'active',
      expiresAt: item.expiresAt,
    });
    if (!created) return null;
    setMemories(MemoryService.getMemories(activeMemoryUid) as unknown as MemoryItem[]);
    if (currentUser) {
      saveUserMemory(currentUser.uid, created as unknown as MemoryItem);
    }
    return created as unknown as MemoryItem;
  };

  const updateMemory = (
    id: string,
    updates: Partial<Pick<MemoryItem, 'key' | 'value' | 'category' | 'status' | 'enabledForAI' | 'expiresAt'>>
  ): MemoryItem | null => {
    const updatedItem = MemoryService.updateMemory(activeMemoryUid, id, updates as any);
    if (!updatedItem) return null;
    setMemories(MemoryService.getMemories(activeMemoryUid) as unknown as MemoryItem[]);
    if (currentUser) {
      saveUserMemory(currentUser.uid, updatedItem as unknown as MemoryItem);
    }
    return updatedItem as unknown as MemoryItem;
  };

  const confirmMemory = (id: string, targetStatus?: 'active' | 'temporary'): MemoryItem | null => {
    const confirmed = MemoryService.confirmCandidate(activeMemoryUid, id, targetStatus);
    if (!confirmed) return null;
    setMemories(MemoryService.getMemories(activeMemoryUid) as unknown as MemoryItem[]);
    if (currentUser) {
      saveUserMemory(currentUser.uid, confirmed as unknown as MemoryItem);
    }
    return confirmed as unknown as MemoryItem;
  };

  const toggleMemoryAI = (id: string) => {
    const current = MemoryService.getMemories(activeMemoryUid);
    const target = current.find((m) => m.id === id);
    if (!target) return;
    const updatedItem = MemoryService.updateMemory(activeMemoryUid, id, {
      enabledForAI: !target.enabledForAI,
    });
    if (!updatedItem) return;
    setMemories(MemoryService.getMemories(activeMemoryUid) as unknown as MemoryItem[]);
    if (currentUser) {
      saveUserMemory(currentUser.uid, updatedItem as unknown as MemoryItem);
    }
  };

  const deleteMemory = (id: string): boolean => {
    const deleted = MemoryService.deleteMemory(activeMemoryUid, id);
    if (!deleted) return false;
    setMemories(MemoryService.getMemories(activeMemoryUid) as unknown as MemoryItem[]);
    if (currentUser) {
      deleteUserMemory(currentUser.uid, id);
    }
    return true;
  };

  // Actions Tâches (Planner)
  const addTask = (task: Omit<TaskItem, 'id'>) => {
    const newTask = EloraDB.addTask(task);
    setTasks(EloraDB.getTasks());
    if (currentUser) {
      saveUserTask(currentUser.uid, newTask);
    }
  };

  const updateTask = (
    id: string,
    updates: Partial<Pick<TaskItem, 'title' | 'description' | 'dueDate' | 'priority' | 'completed' | 'category' | 'goalId'>>
  ) => {
    const updated = EloraDB.updateTask(id, updates);
    setTasks(updated);
    if (currentUser) {
      const target = updated.find((t) => t.id === id);
      if (target) saveUserTask(currentUser.uid, target);
    }
  };

  const toggleTaskCompleted = (id: string) => {
    const updated = EloraDB.toggleTask(id);
    setTasks(updated);
    if (currentUser) {
      const target = updated.find((t) => t.id === id);
      if (target) saveUserTask(currentUser.uid, target);
    }
  };

  const deleteTask = (id: string) => {
    const updated = EloraDB.deleteTask(id);
    setTasks(updated);
    if (currentUser) {
      deleteUserTask(currentUser.uid, id);
    }
  };

  // Actions Objectifs
  const addGoal = (goal: Omit<GoalItem, 'id'>) => {
    const baseGoal: GoalItem = {
      ...goal,
      id: `goal_${Date.now()}`,
    };
    const newGoal = EloraDB.recomputeGoalProgress(baseGoal);
    const goalsList = [...goals, newGoal];
    EloraDB.saveGoals(goalsList);
    setGoals(goalsList);
    if (currentUser) {
      saveUserGoal(currentUser.uid, newGoal);
    }
  };

  const updateGoal = (
    goalId: string,
    updates: Partial<Pick<GoalItem, 'title' | 'category' | 'targetDate' | 'completed'>>
  ) => {
    const updated = EloraDB.updateGoal(goalId, updates);
    setGoals(updated);
    if (currentUser) {
      const target = updated.find((g) => g.id === goalId);
      if (target) saveUserGoal(currentUser.uid, target);
    }
  };

  const deleteGoal = (goalId: string) => {
    const updatedGoals = EloraDB.deleteGoal(goalId);
    setGoals(updatedGoals);
    if (currentUser) {
      deleteUserGoal(currentUser.uid, goalId);
    }

    // Détacher proprement les tâches liées à l'objectif supprimé
    const affectedTasks = tasks.filter((t) => t.goalId === goalId);
    if (affectedTasks.length > 0) {
      const updatedTasks = tasks.map((t) => {
        if (t.goalId !== goalId) return t;
        const { goalId: _removed, ...rest } = t;
        return rest;
      });
      EloraDB.saveTasks(updatedTasks);
      setTasks(updatedTasks);
      if (currentUser) {
        updatedTasks
          .filter((t) => affectedTasks.some((at) => at.id === t.id))
          .forEach((t) => saveUserTask(currentUser.uid, t));
      }
    }
  };

  const addMilestone = (goalId: string, title: string) => {
    const updated = EloraDB.addMilestone(goalId, title);
    setGoals(updated);
    if (currentUser) {
      const target = updated.find((g) => g.id === goalId);
      if (target) saveUserGoal(currentUser.uid, target);
    }
  };

  const updateMilestone = (goalId: string, milestoneId: string, title: string) => {
    const updated = EloraDB.updateMilestone(goalId, milestoneId, title);
    setGoals(updated);
    if (currentUser) {
      const target = updated.find((g) => g.id === goalId);
      if (target) saveUserGoal(currentUser.uid, target);
    }
  };

  const deleteMilestone = (goalId: string, milestoneId: string) => {
    const updated = EloraDB.deleteMilestone(goalId, milestoneId);
    setGoals(updated);
    if (currentUser) {
      const target = updated.find((g) => g.id === goalId);
      if (target) saveUserGoal(currentUser.uid, target);
    }
  };

  const toggleMilestone = (goalId: string, milestoneId: string) => {
    const updated = EloraDB.toggleMilestone(goalId, milestoneId);
    setGoals(updated);
    if (currentUser) {
      const target = updated.find((g) => g.id === goalId);
      if (target) saveUserGoal(currentUser.uid, target);
    }
  };

  // Actions Sessions Focus & Minuteur persistant (horloge murale)
  const addFocusSession = useCallback(
    (session: Omit<FocusSession, 'id' | 'completedAt'>) => {
      const newSession = EloraDB.addFocusSession(session);
      setFocusSessions(EloraDB.getFocusSessions());
      if (currentUser) {
        saveUserFocusSession(currentUser.uid, newSession);
      }
    },
    [currentUser]
  );

  // Persister l'état du minuteur à chaque changement
  useEffect(() => {
    saveActiveFocusTimer(activeFocus);
    setFocusSecondsLeft(computeRemainingSeconds(activeFocus));
  }, [activeFocus]);

  // Horloge murale : recalcule le temps restant sans dérive et survit aux changements d'écran
  useEffect(() => {
    if (activeFocus.status !== 'running') return;

    const tick = () => {
      const remaining = computeRemainingSeconds(activeFocus, Date.now());
      setFocusSecondsLeft(remaining);
      if (remaining <= 0) {
        setActiveFocus((prev) =>
          prev.status === 'running'
            ? {
                ...prev,
                status: 'completed',
                endsAtMs: null,
                remainingSecondsWhenPaused: 0,
              }
            : prev
        );
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [activeFocus.status, activeFocus.endsAtMs]);

  const startFocusTimer = useCallback(() => {
    const now = Date.now();
    setActiveFocus((prev) => {
      const remaining =
        prev.status === 'completed' || prev.remainingSecondsWhenPaused <= 0
          ? prev.durationMinutes * 60
          : computeRemainingSeconds(prev, now);
      return {
        ...prev,
        sessionId: prev.status === 'completed' ? generateFocusSessionId() : prev.sessionId,
        status: 'running',
        startedAtMs: prev.startedAtMs ?? now,
        endsAtMs: now + remaining * 1000,
        remainingSecondsWhenPaused: remaining,
        recorded: prev.status === 'completed' ? false : prev.recorded,
      };
    });
  }, []);

  const pauseFocusTimer = useCallback(() => {
    const now = Date.now();
    setActiveFocus((prev) => {
      if (prev.status !== 'running') return prev;
      const remaining = computeRemainingSeconds(prev, now);
      return {
        ...prev,
        status: 'paused',
        endsAtMs: null,
        remainingSecondsWhenPaused: remaining,
      };
    });
  }, []);

  const resetFocusTimer = useCallback((durationMinutes?: number) => {
    setActiveFocus((prev) => {
      const mins = durationMinutes ?? prev.durationMinutes;
      return {
        ...createInitialFocusState(mins, prev.goalTitle),
      };
    });
  }, []);

  const setFocusConfig = useCallback(
    (config: { goalTitle?: string; durationMinutes?: number }) => {
      setActiveFocus((prev) => {
        const nextGoalTitle =
          config.goalTitle !== undefined ? config.goalTitle : prev.goalTitle;
        const canChangeDuration =
          config.durationMinutes !== undefined && prev.status !== 'running';
        const nextDuration = canChangeDuration
          ? config.durationMinutes!
          : prev.durationMinutes;
        return {
          ...prev,
          goalTitle: nextGoalTitle,
          durationMinutes: nextDuration,
          remainingSecondsWhenPaused: canChangeDuration
            ? nextDuration * 60
            : prev.remainingSecondsWhenPaused,
          status: canChangeDuration && prev.status === 'completed' ? 'idle' : prev.status,
          recorded: canChangeDuration ? false : prev.recorded,
          sessionId: canChangeDuration ? generateFocusSessionId() : prev.sessionId,
        };
      });
    },
    []
  );

  const saveCompletedFocusSession = useCallback(
    (options?: { notes?: string; useElapsedIfRunning?: boolean }): boolean => {
      if (activeFocus.recorded || hasRecordedFocusSessionId(activeFocus.sessionId)) {
        return false;
      }

      const durationMinutes = options?.useElapsedIfRunning
        ? computeElapsedMinutes(activeFocus, Date.now())
        : activeFocus.durationMinutes;

      markFocusSessionIdRecorded(activeFocus.sessionId);
      addFocusSession({
        goalTitle: activeFocus.goalTitle.trim() || 'Session Deep Work',
        durationMinutes,
        notes: options?.notes?.trim() || 'Session de concentration Deep Work validée.',
      });

      setActiveFocus((prev) => ({
        ...createInitialFocusState(prev.durationMinutes, prev.goalTitle),
        recorded: false,
      }));
      return true;
    },
    [activeFocus, addFocusSession]
  );

  const dismissCompletedFocusSession = useCallback(() => {
    setActiveFocus((prev) => createInitialFocusState(prev.durationMinutes, prev.goalTitle));
  }, []);

  const focusCompletedPendingSave =
    activeFocus.status === 'completed' &&
    !activeFocus.recorded &&
    !hasRecordedFocusSessionId(activeFocus.sessionId);

  // Actions Connaissances
  const addKnowledgeDoc = (docData: Omit<KnowledgeDoc, 'id' | 'addedAt'>): KnowledgeDoc => {
    const newDoc = EloraDB.addKnowledge(docData);
    setKnowledgeDocs(EloraDB.getKnowledge());
    if (currentUser) {
      saveUserKnowledgeDoc(currentUser.uid, newDoc);
    }
    return newDoc;
  };

  const updateKnowledgeDoc = (
    id: string,
    updates: Partial<Pick<KnowledgeDoc, 'title' | 'collection' | 'summary' | 'tags' | 'keyInsights'>>
  ) => {
    setKnowledgeDocs((prev) => {
      const next = prev.map((d) => (d.id === id ? { ...d, ...updates } : d));
      EloraDB.saveKnowledge(next);
      if (currentUser) {
        const target = next.find((d) => d.id === id);
        if (target) saveUserKnowledgeDoc(currentUser.uid, target);
      }
      return next;
    });
  };

  const deleteKnowledgeDoc = (id: string) => {
    const existing = knowledgeDocs.find((d) => d.id === id);
    const storagePath = extractStoragePathFromInsights(existing?.keyInsights);
    const updated = EloraDB.deleteKnowledge(id);
    setKnowledgeDocs(updated);
    if (currentUser) {
      deleteUserKnowledgeDoc(currentUser.uid, id);
      if (storagePath) {
        deleteKnowledgeFile(storagePath);
      }
    }
  };

  // Actions Opportunités
  const toggleSaveOpportunity = (id: string) => {
    const updated = EloraDB.toggleSaveOpportunity(id);
    setOpportunities(updated);
    if (currentUser) {
      const target = updated.find((o) => o.id === id);
      if (target) {
        saveUserOpportunity(currentUser.uid, target);
      }
    }
  };

  const addOpportunityToPlanner = (opp: OpportunityItem) => {
    addTask({
      title: `Candidature : ${opp.title}`,
      priority: 'high',
      dueDate: opp.deadline,
      completed: false,
      category: 'Projet',
    });
  };

  const searchWebOpportunities = async (
    customQuery = ''
  ): Promise<{ addedCount: number; error?: string }> => {
    if (isSearchingOpportunities) {
      return { addedCount: 0, error: 'Une recherche est déjà en cours.' };
    }
    setIsSearchingOpportunities(true);
    try {
      const activeMems = MemoryService.getMemories(activeMemoryUid) as unknown as MemoryItem[];
      const prompt = buildOpportunitySearchPrompt(customQuery, profile, activeMems, goals);
      const aiResponse = await orchestrator.process({
        prompt,
        userQuestion: customQuery.trim() || 'Trouve-moi des opportunités ouvertes actuellement',
        enableWebSearch: true,
      });

      const webSources = aiResponse.webSources || [];
      if (webSources.length === 0) {
        return {
          addedCount: 0,
          error:
            "Google Search Grounding n'a renvoyé aucune source Web vérifiable pour cette requête.",
        };
      }

      const extracted = extractOpportunitiesFromWebResponse(aiResponse.text, webSources);
      if (extracted.length === 0) {
        return {
          addedCount: 0,
          error: 'Aucune opportunité non expirée avec URL vérifiée n’a été trouvée.',
        };
      }

      const { added, all } = EloraDB.addOpportunities(extracted, false);
      setOpportunities(all);
      if (currentUser && added.length > 0) {
        await Promise.all(added.map((opp) => saveUserOpportunity(currentUser.uid, opp)));
      }
      return { addedCount: added.length };
    } catch (err: unknown) {
      return {
        addedCount: 0,
        error: err instanceof Error ? err.message : String(err),
      };
    } finally {
      setIsSearchingOpportunities(false);
    }
  };

  // Déconnexion : nettoie les données locales privées pour garantir l'isolation multi-comptes
  const logout = async () => {
    await logoutUser();
    EloraDB.resetAll();
    OfflineQueue.clear();
    clearActiveFocusTimer();
    const freshFocus = createInitialFocusState();
    setActiveFocus(freshFocus);
    setFocusSecondsLeft(computeRemainingSeconds(freshFocus));
    setProfile(EloraDB.getProfile());
    setMemories(MemoryService.getMemories('local_user') as unknown as MemoryItem[]);
    setTasks(EloraDB.getTasks());
    setGoals(EloraDB.getGoals());
    setFocusSessions(EloraDB.getFocusSessions());
    setKnowledgeDocs(EloraDB.getKnowledge());
    setOpportunities(EloraDB.getOpportunities());
    const resetConvs = EloraDB.getConversations();
    setConversations(resetConvs);
    setCurrentConversationId(resetConvs[0]?.id || '');
    setCurrentUser(null);
  };

  // Conversations IA
  const createConversation = (initialTitle: string = DEFAULT_CONVERSATION_TITLE): string => {
    const nowIso = new Date().toISOString();
    const newId = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newConv: Conversation = {
      id: newId,
      title: initialTitle.trim().slice(0, MAX_CONVERSATION_TITLE_LENGTH) || DEFAULT_CONVERSATION_TITLE,
      lastActive: "À l'instant",
      createdAt: nowIso,
      updatedAt: nowIso,
      messages: [],
    };
    setConversations((prev) => {
      const updated = sortConversationsByDate([newConv, ...prev]);
      EloraDB.saveConversations(updated);
      return updated;
    });
    setCurrentConversationId(newId);
    if (currentUser) {
      void saveUserConversation(currentUser.uid, newConv);
    }
    return newId;
  };

  const deleteConversation = (id: string) => {
    const currentList = EloraDB.getConversations();
    const filtered = currentList.filter((c) => c.id !== id);
    const nowIso = new Date().toISOString();
    const nextConvs =
      filtered.length > 0
        ? sortConversationsByDate(filtered)
        : [
            {
              id: `conv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              title: DEFAULT_CONVERSATION_TITLE,
              lastActive: "À l'instant",
              createdAt: nowIso,
              updatedAt: nowIso,
              messages: [],
            },
          ];

    EloraDB.saveConversations(nextConvs);
    setConversations(nextConvs);
    if (currentConversationId === id) {
      setCurrentConversationId(nextConvs[0].id);
    }
    if (currentUser) {
      void deleteUserConversation(currentUser.uid, id);
      if (filtered.length === 0) {
        void saveUserConversation(currentUser.uid, nextConvs[0]);
      }
    }
  };

  const renameConversation = (id: string, newTitle: string) => {
    const cleanTitle = newTitle.trim().slice(0, MAX_CONVERSATION_TITLE_LENGTH);
    if (!cleanTitle) return;
    const nowIso = new Date().toISOString();
    let renamedConv: Conversation | undefined;
    setConversations((prev) => {
      const updated = sortConversationsByDate(
        prev.map((c) => {
          if (c.id !== id) return c;
          renamedConv = {
            ...c,
            title: cleanTitle,
            updatedAt: nowIso,
            createdAt: c.createdAt || nowIso,
          };
          return renamedConv;
        })
      );
      EloraDB.saveConversations(updated);
      return updated;
    });
    if (currentUser && renamedConv) {
      void saveUserConversation(currentUser.uid, renamedConv);
    }
  };

  // Briefing transversal dynamique & Rapprochement des opportunités
  const homeBriefing = useMemo(
    () =>
      ContextEngine.generateHomeBriefing({
        profile,
        memories,
        goals,
        tasks,
        focusSessions,
      }),
    [profile, memories, goals, tasks, focusSessions]
  );

  const matchedOpportunities = useMemo(
    () => ContextEngine.matchOpportunities(profile, memories, opportunities),
    [profile, memories, opportunities]
  );

  // Exécution d'une action transversale fiabilisée par ActionEngine (Phase 6)
  const executeProposedAction = async (action: ProposedAction, messageId?: string) => {
    // 1. Verrouillage UI immédiat en statut 'executing' (anti-double-clic)
    setConversations((prev) => {
      const next = prev.map((c) => {
        if (c.id !== currentConversationId) return c;
        return {
          ...c,
          messages: c.messages.map((m) => {
            if (messageId && m.id !== messageId) return m;
            if (!m.proposedActions) return m;
            return {
              ...m,
              proposedActions: m.proposedActions.map((pa) =>
                pa.id === action.id ? { ...pa, status: 'executing' as const } : pa
              ),
            };
          }),
        };
      });
      return next;
    });

    // 2. Exécution sécurisée avec validation de schéma et persistance vérifiée
    const result = await ActionEngine.execute(action, {
      userId: currentUser?.uid,
      tasks,
      goals,
      docs: knowledgeDocs,
      memories,
      onAddTask: async (taskData) => {
        const id = `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const newTask: TaskItem = { id, ...taskData };
        setTasks((prev) => {
          const updated = [newTask, ...prev];
          EloraDB.saveTasks(updated);
          return updated;
        });
        if (currentUser) {
          await saveUserTask(currentUser.uid, newTask);
        }
        return id;
      },
      onToggleMilestone: async (goalId, milestoneId) => {
        toggleMilestone(goalId, milestoneId);
      },
      onUpdateTask: async (taskId, updates) => {
        updateTask(taskId, updates);
      },
      onDeleteTask: async (taskId) => {
        deleteTask(taskId);
      },
      onUpdateGoal: async (goalId, updates) => {
        updateGoal(goalId, updates);
      },
      onSaveOpportunity: async (oppData) => {
        const { added, all } = EloraDB.addOpportunities([oppData], true);
        setOpportunities(all);
        const saved = added[0];
        if (currentUser && saved) {
          await saveUserOpportunity(currentUser.uid, saved);
        }
        return saved?.id || 'existing_opportunity';
      },
      onValidateMemory: async (memoryId) => {
        const targetStatus =
          action.payload?.targetStatus === 'temporary' ? 'temporary' : 'active';
        const validated = MemoryService.confirmCandidate(activeMemoryUid, memoryId, targetStatus);
        if (!validated) {
          throw new Error('Impossible de persister ce souvenir localement.');
        }
        setMemories(MemoryService.getMemories(activeMemoryUid) as unknown as MemoryItem[]);
        if (validated.category === 'profile' && validated.key.toLowerCase() === 'prénom' && validated.value.trim()) {
          updateProfile({ name: validated.value.trim() });
        }
        if (currentUser) {
          await saveUserMemory(currentUser.uid, validated as unknown as MemoryItem);
        }
      },
      onAddKnowledgeDoc: async (docData) => {
        const id = `doc_${Date.now()}`;
        const newDoc: KnowledgeDoc = {
          id,
          addedAt: new Date().toISOString().split('T')[0],
          ...docData,
        };
        setKnowledgeDocs((prev) => {
          const updated = [newDoc, ...prev];
          EloraDB.saveKnowledge(updated);
          return updated;
        });
        if (currentUser) {
          await saveUserKnowledgeDoc(currentUser.uid, newDoc);
        }
        return id;
      },
    });

    // 3. Acter le statut final (accepted ou failed avec message d'erreur précis)
    setConversations((prev) => {
      const next = prev.map((c) => {
        if (c.id !== currentConversationId) return c;
        return {
          ...c,
          messages: c.messages.map((m) => {
            if (messageId && m.id !== messageId) return m;
            if (!m.proposedActions) return m;
            return {
              ...m,
              proposedActions: m.proposedActions.map((pa) =>
                pa.id === action.id
                  ? {
                      ...pa,
                      status: result.status,
                      errorMessage: result.errorMessage,
                      executedAt: result.success ? new Date().toISOString() : undefined,
                    }
                  : pa
              ),
            };
          }),
        };
      });
      EloraDB.saveConversations(next);
      if (currentUser) {
        const currentConv = next.find((c) => c.id === currentConversationId);
        if (currentConv) saveUserConversation(currentUser.uid, currentConv);
      }
      return next;
    });
  };

  const rejectProposedAction = (actionId: string, messageId?: string) => {
    // Nettoyer l'hypothèse candidate rejetée si l'action portait sur une validation mémoire
    const currentConv = conversations.find((c) => c.id === currentConversationId);
    const targetAction = currentConv?.messages
      .flatMap((m) => m.proposedActions || [])
      .find((pa) => pa.id === actionId);
    if (targetAction?.type === 'validate_memory' && typeof targetAction.payload?.memoryId === 'string') {
      MemoryService.deleteMemory(activeMemoryUid, targetAction.payload.memoryId);
      setMemories(MemoryService.getMemories(activeMemoryUid) as unknown as MemoryItem[]);
    }

    setConversations((prev) => {
      const next = prev.map((c) => {
        if (c.id !== currentConversationId) return c;
        return {
          ...c,
          messages: c.messages.map((m) => {
            if (messageId && m.id !== messageId) return m;
            if (!m.proposedActions) return m;
            return {
              ...m,
              proposedActions: m.proposedActions.map((pa) =>
                pa.id === actionId ? { ...pa, status: 'rejected' as const } : pa
              ),
            };
          }),
        };
      });
      EloraDB.saveConversations(next);
      if (currentUser) {
        const currentConv = next.find((c) => c.id === currentConversationId);
        if (currentConv) saveUserConversation(currentUser.uid, currentConv);
      }
      return next;
    });
  };

  const cancelGeneration = useCallback(() => {
    orchestrator.cancelCurrent();
  }, []);

  // Envoi de message IA avec streaming temps réel et résolution transversale ContextEngine
  const sendMessage = async (
    text: string,
    options?: {
      mode?: InferenceMode;
      localOnly?: boolean;
      attachments?: AIRequestAttachment[];
    }
  ) => {
    if (isGenerating) return;
    if (!text.trim() && (!options?.attachments || options.attachments.length === 0)) return;

    const existingTarget = currentConversationId
      ? conversations.find((c) => c.id === currentConversationId)
      : undefined;
    const effectiveConvId = existingTarget
      ? existingTarget.id
      : `conv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    if (!existingTarget) {
      setCurrentConversationId(effectiveConvId);
    }
    const nowIso = new Date().toISOString();

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}_u`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      attachments:
        options?.attachments && options.attachments.length > 0
          ? options.attachments.map((a) => ({ name: a.name, mimeType: a.mimeType }))
          : undefined,
    };

    const assistantMsgId = `msg_${Date.now()}_a`;
    const initialAssistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    };

    let convSnapshotOnSend: Conversation | undefined;
    setConversations((prev) => {
      const hasTarget = prev.some((c) => c.id === effectiveConvId);
      const mapped = hasTarget
        ? prev.map((c) => {
            if (c.id !== effectiveConvId) return c;
            const hasPriorUserMessages = c.messages.some((m) => m.role === 'user');
            const nextTitle =
              !hasPriorUserMessages && c.title === DEFAULT_CONVERSATION_TITLE
                ? generateConversationTitle(text)
                : c.title;
            convSnapshotOnSend = {
              ...c,
              title: nextTitle,
              messages: [...c.messages, userMsg, initialAssistantMsg],
              lastActive: "À l'instant",
              createdAt: c.createdAt || nowIso,
              updatedAt: nowIso,
            };
            return convSnapshotOnSend;
          })
        : [
            (convSnapshotOnSend = {
              id: effectiveConvId,
              title: generateConversationTitle(text),
              lastActive: "À l'instant",
              createdAt: nowIso,
              updatedAt: nowIso,
              messages: [userMsg, initialAssistantMsg],
            }),
            ...prev,
          ];
      const sorted = sortConversationsByDate(mapped);
      EloraDB.saveConversations(sorted);
      return sorted;
    });

    if (currentUser && convSnapshotOnSend) {
      void saveUserConversation(currentUser.uid, convSnapshotOnSend);
    }

    setIsGenerating(true);

    try {
      // Résolution du contexte par le moteur transversal ContextEngine
      const resolvedContext = ContextEngine.buildContext(
        {
          prompt: text,
          userId: activeMemoryUid,
          allowProposedActions: true,
        },
        {
          profile,
          memories: MemoryService.getMemories(activeMemoryUid) as unknown as MemoryItem[],
          goals,
          tasks,
          docs: knowledgeDocs,
          focusSessions,
          conversations,
        }
      );

      if (resolvedContext.proposedActions.some((a) => a.type === 'validate_memory')) {
        setMemories(MemoryService.getMemories(activeMemoryUid) as unknown as MemoryItem[]);
      }

      const activeConv = conversations.find((c) => c.id === effectiveConvId);
      const recentHistory = resolvedContext.isGreeting
        ? ''
        : (activeConv?.messages || [])
            .filter((m) => m.id !== 'msg_1' && m.id !== 'msg_2' && m.content && m.content.trim().length > 0)
            .slice(-6)
            .map((m) => `${m.role === 'user' ? 'Utilisateur' : 'ELORA'} : ${m.content.slice(0, 1200)}`)
            .join('\n');
      const historyBlock = recentHistory
        ? `\n\n### [HISTORIQUE RÉCENT DE LA CONVERSATION]\n${recentHistory}`
        : '';

      if (resolvedContext.isWebSearch) {
        console.info('[ELORA AI] Recherche Web détectée -> activation Google Search Grounding');
      }

      const aiResponse: AIResponse = await orchestrator.process({
        prompt: `${resolvedContext.systemPromptBlock}${historyBlock}\n\nDemande actuelle de l'utilisateur : ${text}`,
        userQuestion: text,
        mode: options?.mode,
        localOnly: options?.localOnly,
        enableWebSearch: resolvedContext.isWebSearch,
        attachments: options?.attachments,
        onStreamChunk: (_chunk: string, accumulated: string) => {
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id !== effectiveConvId) return c;
              return {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantMsgId ? { ...m, content: accumulated } : m
                ),
              };
            })
          );
        },
      });

      const webOpportunityActions: ProposedAction[] =
        resolvedContext.isWebSearch && aiResponse.webSources && aiResponse.webSources.length > 0
          ? deduplicateOpportunities(
              opportunities,
              extractOpportunitiesFromWebResponse(aiResponse.text, aiResponse.webSources).map(
                (o, idx) => ({ ...o, id: `preview_${idx}`, saved: false })
              )
            ).added
              .slice(0, 3)
              .map((opp, idx) => ({
                id: `act_opp_${Date.now()}_${idx}`,
                type: 'save_opportunity' as const,
                title: `Enregistrer l'opportunité : ${opp.title}`,
                description: `${opp.organization} • Échéance : ${opp.deadline}`,
                payload: {
                  title: opp.title,
                  organization: opp.organization,
                  type: opp.type,
                  deadline: opp.deadline,
                  location: opp.location,
                  eligibility: opp.eligibility,
                  skillsRequired: opp.skillsRequired,
                  matchReason: opp.matchReason,
                  officialUrl: opp.officialUrl,
                },
                status: 'pending' as const,
              }))
          : [];

      const completedIso = new Date().toISOString();
      let completedConv: Conversation | undefined;
      setConversations((prev) => {
        const mapped = prev.map((c) => {
          if (c.id !== effectiveConvId) return c;
          completedConv = {
            ...c,
            updatedAt: completedIso,
            createdAt: c.createdAt || nowIso,
            lastActive: "À l'instant",
            messages: c.messages.map((m) =>
              m.id === assistantMsgId
                ? {
                  ...m,
                  content: aiResponse.text,
                  inferenceSource:
                    aiResponse.metadata.source === 'unavailable'
                      ? undefined
                      : aiResponse.metadata.source,
                  modelName: aiResponse.metadata.modelName,
                  durationMs: aiResponse.metadata.durationMs,
                  sources: [
                    ...ContextEngine.filterUsedSources(
                      resolvedContext.referencedSources,
                      aiResponse.text,
                      text
                    ),
                    ...(aiResponse.webSources || []).map((ws, idx) => ({
                      id: `web_${Date.now()}_${idx}`,
                      type: 'web' as const,
                      title: ws.title,
                      category: 'Recherche Web',
                      url: ws.url,
                    })),
                  ],
                  proposedActions: [...resolvedContext.proposedActions, ...webOpportunityActions],
                  fallbackOccurred: aiResponse.metadata.fallbackOccurred,
                  fallbackReason: aiResponse.metadata.fallbackReason,
                }
                : m
            ),
          };
          return completedConv;
        });

        const sorted = sortConversationsByDate(mapped);
        EloraDB.saveConversations(sorted);
        return sorted;
      });

      if (currentUser && completedConv) {
        await saveUserConversation(currentUser.uid, completedConv);
      }
    } catch (err: unknown) {
      const isAborted = err instanceof Error && err.name === 'AbortError';
      const errMsg = err instanceof Error ? err.message : String(err);
      const errIso = new Date().toISOString();
      let erroredConv: Conversation | undefined;
      setConversations((prev) => {
        const mapped = prev.map((c) => {
          if (c.id !== effectiveConvId) return c;
          erroredConv = {
            ...c,
            updatedAt: errIso,
            messages: c.messages.map((m) =>
              m.id === assistantMsgId
                ? {
                  ...m,
                  content: isAborted
                    ? (m.content && m.content.trim().length > 0
                        ? `${m.content}\n\n_(Génération interrompue par l'utilisateur.)_`
                        : "_Génération interrompue par l'utilisateur._")
                    : `⚠️ **Information ELORA :**\n\n${errMsg}`,
                }
                : m
            ),
          };
          return erroredConv;
        });
        const sorted = sortConversationsByDate(mapped);
        EloraDB.saveConversations(sorted);
        return sorted;
      });
      if (currentUser && erroredConv) {
        await saveUserConversation(currentUser.uid, erroredConv);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        theme,
        setTheme,
        isSettingsOpen,
        setIsSettingsOpen,
        isDiagnosticOpen,
        setIsDiagnosticOpen,
        isAuthModalOpen,
        setIsAuthModalOpen,
        currentUser,
        isAuthLoading,
        isSyncingCloud,
        logout,
        triggerCloudSync,
        profile,
        updateProfile,
        memories,
        addMemory,
        updateMemory,
        confirmMemory,
        toggleMemoryAI,
        deleteMemory,
        tasks,
        addTask,
        updateTask,
        toggleTaskCompleted,
        deleteTask,
        goals,
        addGoal,
        updateGoal,
        deleteGoal,
        addMilestone,
        updateMilestone,
        deleteMilestone,
        toggleMilestone,
        focusSessions,
        addFocusSession,
        activeFocus,
        focusSecondsLeft,
        focusCompletedPendingSave,
        startFocusTimer,
        pauseFocusTimer,
        resetFocusTimer,
        setFocusConfig,
        saveCompletedFocusSession,
        dismissCompletedFocusSession,
        knowledgeDocs,
        addKnowledgeDoc,
        updateKnowledgeDoc,
        deleteKnowledgeDoc,
        opportunities,
        matchedOpportunities,
        toggleSaveOpportunity,
        addOpportunityToPlanner,
        searchWebOpportunities,
        isSearchingOpportunities,
        homeBriefing,
        executeProposedAction,
        rejectProposedAction,
        conversations,
        currentConversationId,
        setCurrentConversationId,
        createConversation,
        deleteConversation,
        renameConversation,
        sendMessage,
        cancelGeneration,
        isGenerating,
        caps,
        refreshCapabilities,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp doit être utilisé au sein d\'un AppProvider');
  }
  return context;
};
