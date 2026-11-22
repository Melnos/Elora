import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
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
import { orchestrator } from '../lib/ai/AIOrchestrator';
import { CapabilityDetector } from '../lib/ai/CapabilityDetector';
import type { CapabilityReport, InferenceMode, AIResponse, AIRequestAttachment } from '../lib/ai/types';
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
  saveUserConversation,
  processOfflineQueue,
} from '../lib/firebase/firestore';

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
  addKnowledgeDoc: (doc: Omit<KnowledgeDoc, 'id' | 'addedAt'>) => void;
  deleteKnowledgeDoc: (id: string) => void;

  // Opportunités
  opportunities: OpportunityItem[];
  toggleSaveOpportunity: (id: string) => void;
  addOpportunityToPlanner: (opp: OpportunityItem) => void;

  // Conversations IA
  conversations: Conversation[];
  currentConversationId: string;
  setCurrentConversationId: (id: string) => void;
  createConversation: (initialTitle?: string) => string;
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
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [theme, setThemeState] = useState<ThemeMode>(() => {
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
        }
        if (cloudData.tasks.length > 0) {
          setTasks(cloudData.tasks);
          EloraDB.saveTasks(cloudData.tasks);
        }
        if (cloudData.goals.length > 0) {
          setGoals(cloudData.goals);
          EloraDB.saveGoals(cloudData.goals);
        }
        if (cloudData.focusSessions.length > 0) {
          setFocusSessions(cloudData.focusSessions);
        }
        if (cloudData.memories.length > 0) {
          setMemories(cloudData.memories);
        }
        if (cloudData.knowledgeDocs.length > 0) {
          setKnowledgeDocs(cloudData.knowledgeDocs);
        }
        if (cloudData.conversations.length > 0) {
          setConversations(cloudData.conversations);
          EloraDB.saveConversations(cloudData.conversations);
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
    setMemories(EloraDB.getMemories());
    if (currentUser) {
      saveUserMemory(currentUser.uid, newMem);
    }
  };

  const toggleMemoryAI = (id: string) => {
    const updated = EloraDB.toggleMemory(id);
    setMemories(updated);
    if (currentUser) {
      const target = updated.find((m) => m.id === id);
      if (target) saveUserMemory(currentUser.uid, target);
    }
  };

  const deleteMemory = (id: string) => {
    const updated = EloraDB.deleteMemory(id);
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
  const addKnowledgeDoc = (docData: Omit<KnowledgeDoc, 'id' | 'addedAt'>) => {
    const newDoc = EloraDB.addKnowledge(docData);
    setKnowledgeDocs(EloraDB.getKnowledge());
    if (currentUser) {
      saveUserKnowledgeDoc(currentUser.uid, newDoc);
    }
  };

  const deleteKnowledgeDoc = (id: string) => {
    const updated = EloraDB.deleteKnowledge(id);
    setKnowledgeDocs(updated);
    if (currentUser) {
      deleteUserKnowledgeDoc(currentUser.uid, id);
    }
  };

  // Actions Opportunités
  const toggleSaveOpportunity = (id: string) => {
    const updated = EloraDB.toggleSaveOpportunity(id);
    setOpportunities(updated);
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

  // Déconnexion
  const logout = async () => {
    await logoutUser();
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

  // Envoi de message IA avec streaming temps réel
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
      const activeMemoriesContext = memories
        .filter((m) => m.enabledForAI)
        .map((m) => `- ${m.key} : ${m.value}`)
        .join('\n');

      const systemContext = `Tu es ELORA, un environnement d'intelligence personnelle hybride conçu pour accompagner ${profile.name}.
Contexte mémorisé de l'utilisateur :
${activeMemoriesContext || 'Aucune mémoire active pour le moment.'}
Objectifs principaux :
${goals.map((g) => `- ${g.title} (${g.progressPercentage}% complété)`).join('\n')}

Instructions :
- Réponds avec clarté, pertinence, élégance et proactivité.
- Formate tes réponses en Markdown soigné avec titres clairs, puces et blocs de code si utile.
- Sois direct et concis sans bavardage superflu.`;

      const aiResponse: AIResponse = await orchestrator.process({
        prompt: `${systemContext}\n\nDemande de l'utilisateur : ${text}`,
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
        deleteKnowledgeDoc,
        opportunities,
        toggleSaveOpportunity,
        addOpportunityToPlanner,
        conversations,
        currentConversationId,
        setCurrentConversationId,
        createConversation,
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
