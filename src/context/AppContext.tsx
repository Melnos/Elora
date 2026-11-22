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
import {
  initialProfile,
  initialMemories,
  initialTasks,
  initialGoals,
  initialFocusSessions,
  initialKnowledge,
  initialOpportunities,
  initialConversations,
} from '../lib/mockData';
import { orchestrator } from '../lib/ai/AIOrchestrator';
import { CapabilityDetector } from '../lib/ai/CapabilityDetector';
import type { CapabilityReport, InferenceMode, AIResponse, AIRequestAttachment } from '../lib/ai/types';
import { subscribeToAuthState, logoutUser } from '../lib/firebase/auth';
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

  // Authentification Firebase
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);

  // Données avec persistance LocalStorage (offline-first)
  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('elora_profile');
    return saved ? JSON.parse(saved) : initialProfile;
  });

  const [memories, setMemories] = useState<MemoryItem[]>(() => {
    const saved = localStorage.getItem('elora_memories');
    return saved ? JSON.parse(saved) : initialMemories;
  });

  const [tasks, setTasks] = useState<TaskItem[]>(() => {
    const saved = localStorage.getItem('elora_tasks');
    return saved ? JSON.parse(saved) : initialTasks;
  });

  const [goals, setGoals] = useState<GoalItem[]>(() => {
    const saved = localStorage.getItem('elora_goals');
    return saved ? JSON.parse(saved) : initialGoals;
  });

  const [focusSessions, setFocusSessions] = useState<FocusSession[]>(() => {
    const saved = localStorage.getItem('elora_focus');
    return saved ? JSON.parse(saved) : initialFocusSessions;
  });

  const [knowledgeDocs, setKnowledgeDocs] = useState<KnowledgeDoc[]>(() => {
    const saved = localStorage.getItem('elora_knowledge');
    return saved ? JSON.parse(saved) : initialKnowledge;
  });

  const [opportunities, setOpportunities] = useState<OpportunityItem[]>(() => {
    const saved = localStorage.getItem('elora_opportunities');
    return saved ? JSON.parse(saved) : initialOpportunities;
  });

  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const saved = localStorage.getItem('elora_conversations');
    return saved ? JSON.parse(saved) : initialConversations;
  });

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

  // Sauvegardes locales automatiques (Offline-first)
  useEffect(() => {
    localStorage.setItem('elora_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('elora_goals', JSON.stringify(goals));
  }, [goals]);

  useEffect(() => {
    localStorage.setItem('elora_focus', JSON.stringify(focusSessions));
  }, [focusSessions]);

  useEffect(() => {
    localStorage.setItem('elora_memories', JSON.stringify(memories));
  }, [memories]);

  useEffect(() => {
    localStorage.setItem('elora_knowledge', JSON.stringify(knowledgeDocs));
  }, [knowledgeDocs]);

  useEffect(() => {
    localStorage.setItem('elora_opportunities', JSON.stringify(opportunities));
  }, [opportunities]);

  useEffect(() => {
    localStorage.setItem('elora_conversations', JSON.stringify(conversations));
  }, [conversations]);

  useEffect(() => {
    localStorage.setItem('elora_profile', JSON.stringify(profile));
  }, [profile]);

  // Synchronisation Cloud manuelle ou automatique
  const triggerCloudSync = useCallback(async () => {
    if (!currentUser || !navigator.onLine) return;
    setIsSyncingCloud(true);
    try {
      await processOfflineQueue(currentUser.uid);
      const cloudData = await fetchUserData(currentUser.uid);
      if (cloudData) {
        if (cloudData.profile) setProfile(cloudData.profile);
        if (cloudData.tasks.length > 0) setTasks(cloudData.tasks);
        if (cloudData.goals.length > 0) setGoals(cloudData.goals);
        if (cloudData.focusSessions.length > 0) setFocusSessions(cloudData.focusSessions);
        if (cloudData.memories.length > 0) setMemories(cloudData.memories);
        if (cloudData.knowledgeDocs.length > 0) setKnowledgeDocs(cloudData.knowledgeDocs);
        if (cloudData.conversations.length > 0) setConversations(cloudData.conversations);
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
        // Mettre à jour l'email et le nom si présents
        if (user.displayName || user.email) {
          setProfile((prev) => ({
            ...prev,
            name: user.displayName || prev.name,
            email: user.email || prev.email,
          }));
        }
        // Déclencher la synchronisation Cloud
        triggerCloudSync();
      }
    });

    return () => unsubscribe();
  }, [triggerCloudSync]);

  // Synchronisation au retour en ligne
  useEffect(() => {
    const handleOnline = () => {
      if (currentUser) {
        triggerCloudSync();
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [currentUser, triggerCloudSync]);

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
      if (currentUser) {
        syncUserProfile(currentUser.uid, next);
      }
      return next;
    });
  };

  // Actions Mémoire
  const addMemory = (item: Omit<MemoryItem, 'id' | 'dateAdded'>) => {
    const newMem: MemoryItem = {
      ...item,
      id: `mem_${Date.now()}`,
      dateAdded: new Date().toISOString().split('T')[0],
    };
    setMemories((prev) => [newMem, ...prev]);
    if (currentUser) {
      saveUserMemory(currentUser.uid, newMem);
    }
  };

  const toggleMemoryAI = (id: string) => {
    setMemories((prev) =>
      prev.map((m) => {
        if (m.id === id) {
          const updated = { ...m, enabledForAI: !m.enabledForAI };
          if (currentUser) saveUserMemory(currentUser.uid, updated);
          return updated;
        }
        return m;
      })
    );
  };

  const deleteMemory = (id: string) => {
    setMemories((prev) => prev.filter((m) => m.id !== id));
    if (currentUser) {
      deleteUserMemory(currentUser.uid, id);
    }
  };

  // Actions Tâches
  const addTask = (task: Omit<TaskItem, 'id'>) => {
    const newTask: TaskItem = {
      ...task,
      id: `task_${Date.now()}`,
    };
    setTasks((prev) => [newTask, ...prev]);
    if (currentUser) {
      saveUserTask(currentUser.uid, newTask);
    }
  };

  const toggleTaskCompleted = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const updated = { ...t, completed: !t.completed };
          if (currentUser) saveUserTask(currentUser.uid, updated);
          return updated;
        }
        return t;
      })
    );
  };

  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
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
    setGoals((prev) => [newGoal, ...prev]);
    if (currentUser) {
      saveUserGoal(currentUser.uid, newGoal);
    }
  };

  const toggleMilestone = (goalId: string, milestoneId: string) => {
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id === goalId) {
          const updatedMilestones = g.milestones.map((m) =>
            m.id === milestoneId ? { ...m, completed: !m.completed } : m
          );
          const completedCount = updatedMilestones.filter((m) => m.completed).length;
          const newProgress = Math.round((completedCount / updatedMilestones.length) * 100);
          const updatedGoal = { ...g, milestones: updatedMilestones, progressPercentage: newProgress };
          if (currentUser) saveUserGoal(currentUser.uid, updatedGoal);
          return updatedGoal;
        }
        return g;
      })
    );
  };

  // Actions Sessions Focus
  const addFocusSession = (session: Omit<FocusSession, 'id' | 'completedAt'>) => {
    const newSession: FocusSession = {
      ...session,
      id: `focus_${Date.now()}`,
      completedAt: new Date().toISOString(),
    };
    setFocusSessions((prev) => [newSession, ...prev]);
    if (currentUser) {
      saveUserFocusSession(currentUser.uid, newSession);
    }
  };

  // Actions Connaissances
  const addKnowledgeDoc = (docData: Omit<KnowledgeDoc, 'id' | 'addedAt'>) => {
    const newDoc: KnowledgeDoc = {
      ...docData,
      id: `doc_${Date.now()}`,
      addedAt: new Date().toISOString().split('T')[0],
    };
    setKnowledgeDocs((prev) => [newDoc, ...prev]);
    if (currentUser) {
      saveUserKnowledgeDoc(currentUser.uid, newDoc);
    }
  };

  const deleteKnowledgeDoc = (id: string) => {
    setKnowledgeDocs((prev) => prev.filter((d) => d.id !== id));
    if (currentUser) {
      deleteUserKnowledgeDoc(currentUser.uid, id);
    }
  };

  // Actions Opportunités
  const toggleSaveOpportunity = (id: string) => {
    setOpportunities((prev) =>
      prev.map((opp) => (opp.id === id ? { ...opp, saved: !opp.saved } : opp))
    );
  };

  const addOpportunityToPlanner = (opp: OpportunityItem) => {
    addTask({
      title: `Préparer candidature : ${opp.title}`,
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
    setConversations((prev) => [newConv, ...prev]);
    setCurrentConversationId(newId);
    if (currentUser) {
      saveUserConversation(currentUser.uid, newConv);
    }
    return newId;
  };

  // Envoi de message IA avec streaming temps réel et pièces jointes
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

    // Injecter immédiatement le message utilisateur et le placeholder assistant
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
      // Préparation du prompt enrichi avec la mémoire active et les connaissances clés
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
- Réponds avec clarté, pertinence, élégance et empathie intellectuelle.
- Formate tes réponses en Markdown soigné avec titres clairs, puces et blocs de code si utile.
- Ne fabrique jamais de fausses données ou de faux accomplissements.`;

      const aiResponse: AIResponse = await orchestrator.process({
        prompt: `${systemContext}\n\nDemande de l'utilisateur : ${text}`,
        mode: options?.mode,
        localOnly: options?.localOnly,
        attachments: options?.attachments,
        onStreamChunk: (_chunk: string, accumulated: string) => {
          // Mise à jour continue en streaming temps réel
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

      // Finalisation des métadonnées officielles de la réponse
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

        // Persistance Cloud de la conversation mise à jour
        if (currentUser) {
          const currentConv = nextConvs.find((c) => c.id === currentConversationId);
          if (currentConv) saveUserConversation(currentUser.uid, currentConv);
        }

        return nextConvs;
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setConversations((prev) =>
        prev.map((c) => {
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
        })
      );
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
