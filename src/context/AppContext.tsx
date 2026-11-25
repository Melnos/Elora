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
import { OfflineQueue } from '../lib/offline/OfflineQueue';
import { MemoryService } from '../lib/memory/MemoryService';
import { orchestrator } from '../lib/ai/AIOrchestrator';
import { CapabilityDetector } from '../lib/ai/CapabilityDetector';
import type { CapabilityReport, InferenceMode, AIResponse, AIRequestAttachment } from '../lib/ai/types';
import { ContextEngine } from '../lib/context/ContextEngine';
import type { HomeBriefing, ProposedAction } from '../lib/context/types';
import { ActionEngine } from '../lib/actions/ActionEngine';
import { subscribeToAuthState, logoutUser, getSavedAuthSession } from '../lib/firebase/auth';
import {
  syncUserProfile,
  fetchUserData,
  saveUserTask,
  deleteUserTask,
  saveUserGoal,
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
  addMemory: (item: Omit<MemoryItem, 'id' | 'dateAdded'>) => void;
  toggleMemoryAI: (id: string) => void;
  deleteMemory: (id: string) => void;

  // Planner & Tâches
  tasks: TaskItem[];
  addTask: (task: Omit<TaskItem, 'id'>) => void;
  toggleTaskCompleted: (id: string) => void;
  deleteTask: (id: string) => void;

  // Objectifs
  goals: GoalItem[];
  addGoal: (goal: Omit<GoalItem, 'id'>) => void;
  toggleMilestone: (goalId: string, milestoneId: string) => void;

  // Sessions Focus
  focusSessions: FocusSession[];
  addFocusSession: (session: Omit<FocusSession, 'id' | 'completedAt'>) => void;

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
  const [memories, setMemories] = useState<MemoryItem[]>(() => EloraDB.getMemories());
  const [tasks, setTasks] = useState<TaskItem[]>(() => EloraDB.getTasks());
  const [goals, setGoals] = useState<GoalItem[]>(() => EloraDB.getGoals());
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>(() => EloraDB.getFocusSessions());
  const [knowledgeDocs, setKnowledgeDocs] = useState<KnowledgeDoc[]>(() => EloraDB.getKnowledge());
  const [opportunities, setOpportunities] = useState<OpportunityItem[]>(() => EloraDB.getOpportunities());
  const [conversations, setConversations] = useState<Conversation[]>(() => EloraDB.getConversations());

  const [currentConversationId, setCurrentConversationId] = useState<string>(() => {
    return conversations[0]?.id || 'conv_1';
  });

  const [isGenerating, setIsGenerating] = useState(false);
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
        } else {
          const baseProfile = EloraDB.getProfile();
          const initialProfile: UserProfile = {
            ...baseProfile,
            name: currentUser.displayName || baseProfile.name,
            email: currentUser.email || baseProfile.email,
          };
          EloraDB.saveProfile(initialProfile);
          setProfile(initialProfile);
          await syncUserProfile(currentUser.uid, initialProfile);
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
          const merged = mergeCollectionById(EloraDB.getMemories(), cloudData.memories);
          setMemories(merged);
          EloraDB.saveMemories(merged);
          MemoryService.syncFromFirestore(currentUser.uid, merged as any);
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
        if (cloudData.conversations.length > 0) {
          const merged = mergeCollectionById(EloraDB.getConversations(), cloudData.conversations);
          setConversations(merged);
          EloraDB.saveConversations(merged);
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
        if (user.displayName || user.email) {
          setProfile((prev) => {
            const updated = {
              ...prev,
              name: user.displayName || prev.name,
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

  // Actions Mémoire
  const addMemory = (item: Omit<MemoryItem, 'id' | 'dateAdded'>) => {
    const newMem = EloraDB.addMemory(item);
    MemoryService.addMemory(currentUser?.uid || 'local_user', {
      category: item.category as any,
      key: item.key,
      value: item.value,
      enabledForAI: item.enabledForAI,
      source: (item.source as any) || 'user_explicit',
    });
    setMemories(EloraDB.getMemories());
    if (currentUser) {
      saveUserMemory(currentUser.uid, {
        ...newMem,
        userId: currentUser.uid,
        status: 'active',
      });
    }
  };

  const toggleMemoryAI = (id: string) => {
    const updated = EloraDB.toggleMemory(id);
    setMemories(updated);
    const target = updated.find((m) => m.id === id);
    if (target) {
      MemoryService.updateMemory(currentUser?.uid || 'local_user', id, {
        enabledForAI: target.enabledForAI,
      });
      if (currentUser) {
        saveUserMemory(currentUser.uid, target);
      }
    }
  };

  const deleteMemory = (id: string) => {
    const updated = EloraDB.deleteMemory(id);
    MemoryService.deleteMemory(currentUser?.uid || 'local_user', id);
    setMemories(updated);
    if (currentUser) {
      deleteUserMemory(currentUser.uid, id);
    }
  };

  // Actions Tâches (Planner)
  const addTask = (task: Omit<TaskItem, 'id'>) => {
    const newTask = EloraDB.addTask(task);
    setTasks(EloraDB.getTasks());
    if (currentUser) {
      saveUserTask(currentUser.uid, newTask);
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
    const newGoal: GoalItem = {
      ...goal,
      id: `goal_${Date.now()}`,
    };
    const goalsList = [...goals, newGoal];
    EloraDB.saveGoals(goalsList);
    setGoals(goalsList);
    if (currentUser) {
      saveUserGoal(currentUser.uid, newGoal);
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

  // Actions Sessions Focus
  const addFocusSession = (session: Omit<FocusSession, 'id' | 'completedAt'>) => {
    const newSession = EloraDB.addFocusSession(session);
    setFocusSessions(EloraDB.getFocusSessions());
    if (currentUser) {
      saveUserFocusSession(currentUser.uid, newSession);
    }
  };

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

  // Déconnexion : nettoie les données locales privées pour garantir l'isolation multi-comptes
  const logout = async () => {
    await logoutUser();
    EloraDB.resetAll();
    OfflineQueue.clear();
    setProfile(EloraDB.getProfile());
    setMemories(EloraDB.getMemories());
    setTasks(EloraDB.getTasks());
    setGoals(EloraDB.getGoals());
    setFocusSessions(EloraDB.getFocusSessions());
    setKnowledgeDocs(EloraDB.getKnowledge());
    setOpportunities(EloraDB.getOpportunities());
    const resetConvs = EloraDB.getConversations();
    setConversations(resetConvs);
    setCurrentConversationId(resetConvs[0]?.id || 'conv_1');
    setCurrentUser(null);
  };

  // Conversations IA
  const createConversation = (initialTitle: string = 'Nouvelle conversation'): string => {
    const newId = `conv_${Date.now()}`;
    const newConv: Conversation = {
      id: newId,
      title: initialTitle,
      lastActive: 'À l\'instant',
      messages: [],
    };
    const updated = [newConv, ...conversations];
    EloraDB.saveConversations(updated);
    setConversations(updated);
    setCurrentConversationId(newId);
    if (currentUser) {
      saveUserConversation(currentUser.uid, newConv);
    }
    return newId;
  };

  const deleteConversation = (id: string) => {
    setConversations((prev) => {
      const filtered = prev.filter((c) => c.id !== id);
      const nextConvs = filtered.length > 0 ? filtered : [{
        id: `conv_${Date.now()}`,
        title: 'Nouvelle conversation',
        lastActive: 'À l\'instant',
        messages: [],
      }];
      EloraDB.saveConversations(nextConvs);
      if (currentConversationId === id) {
        setCurrentConversationId(nextConvs[0].id);
      }
      return nextConvs;
    });
    if (currentUser) {
      deleteUserConversation(currentUser.uid, id);
    }
  };

  const renameConversation = (id: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    setConversations((prev) => {
      const updated = prev.map((c) => (c.id === id ? { ...c, title: newTitle.trim() } : c));
      EloraDB.saveConversations(updated);
      const conv = updated.find((c) => c.id === id);
      if (currentUser && conv) {
        saveUserConversation(currentUser.uid, conv);
      }
      return updated;
    });
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
      onValidateMemory: async (memoryId) => {
        if (currentUser) {
          MemoryService.updateMemory(currentUser.uid, memoryId, { status: 'active', enabledForAI: true });
          const mems = MemoryService.getMemories(currentUser.uid);
          setMemories(mems);
          const validated = mems.find((m) => m.id === memoryId);
          if (validated) await saveUserMemory(currentUser.uid, validated);
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

  // Envoi de message IA avec streaming temps réel et résolution transversale ContextEngine
  const sendMessage = async (
    text: string,
    options?: {
      mode?: InferenceMode;
      localOnly?: boolean;
      attachments?: AIRequestAttachment[];
    }
  ) => {
    if (!text.trim() && (!options?.attachments || options.attachments.length === 0)) return;

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}_u`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    };

    const assistantMsgId = `msg_${Date.now()}_a`;
    const initialAssistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    };

    setConversations((prev) =>
      prev.map((c) =>
        c.id === currentConversationId
          ? {
            ...c,
            messages: [...c.messages, userMsg, initialAssistantMsg],
            lastActive: 'À l\'instant',
          }
          : c
      )
    );

    setIsGenerating(true);

    try {
      // Résolution du contexte par le moteur transversal ContextEngine
      const resolvedContext = ContextEngine.buildContext(
        {
          prompt: text,
          userId: currentUser?.uid || 'local_user',
          allowProposedActions: true,
        },
        {
          profile,
          memories,
          goals,
          tasks,
          docs: knowledgeDocs,
          focusSessions,
          conversations,
        }
      );

      const aiResponse: AIResponse = await orchestrator.process({
        prompt: `${resolvedContext.systemPromptBlock}\n\nDemande de l'utilisateur : ${text}`,
        mode: options?.mode,
        localOnly: options?.localOnly,
        attachments: options?.attachments,
        onStreamChunk: (_chunk: string, accumulated: string) => {
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id !== currentConversationId) return c;
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

      setConversations((prev) => {
        const nextConvs = prev.map((c) => {
          if (c.id !== currentConversationId) return c;
          return {
            ...c,
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
                  sources: resolvedContext.referencedSources,
                  proposedActions: resolvedContext.proposedActions,
                  fallbackOccurred: aiResponse.metadata.fallbackOccurred,
                  fallbackReason: aiResponse.metadata.fallbackReason,
                }
                : m
            ),
          };
        });

        EloraDB.saveConversations(nextConvs);

        if (currentUser) {
          const currentConv = nextConvs.find((c) => c.id === currentConversationId);
          if (currentConv) saveUserConversation(currentUser.uid, currentConv);
        }

        return nextConvs;
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setConversations((prev) => {
        const nextConvs = prev.map((c) => {
          if (c.id !== currentConversationId) return c;
          return {
            ...c,
            messages: c.messages.map((m) =>
              m.id === assistantMsgId
                ? {
                  ...m,
                  content: `⚠️ **Information ELORA :**\n\n${errMsg}`,
                }
                : m
            ),
          };
        });
        EloraDB.saveConversations(nextConvs);
        return nextConvs;
      });
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
        toggleMemoryAI,
        deleteMemory,
        tasks,
        addTask,
        toggleTaskCompleted,
        deleteTask,
        goals,
        addGoal,
        toggleMilestone,
        focusSessions,
        addFocusSession,
        knowledgeDocs,
        addKnowledgeDoc,
        updateKnowledgeDoc,
        deleteKnowledgeDoc,
        opportunities,
        matchedOpportunities,
        toggleSaveOpportunity,
        addOpportunityToPlanner,
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
