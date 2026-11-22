import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
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
import type { CapabilityReport, InferenceMode, AIResponse } from '../lib/ai/types';

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
  sendMessage: (text: string, options?: { mode?: InferenceMode; localOnly?: boolean }) => Promise<void>;
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

  // Données avec persistance LocalStorage
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

  // Sauvegardes locales automatiques
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
    setProfile((prev) => ({ ...prev, ...updated }));
  };

  // Actions Mémoire
  const addMemory = (item: Omit<MemoryItem, 'id' | 'dateAdded'>) => {
    const newMem: MemoryItem = {
      ...item,
      id: `mem_${Date.now()}`,
      dateAdded: new Date().toISOString().split('T')[0],
    };
    setMemories((prev) => [newMem, ...prev]);
  };

  const toggleMemoryAI = (id: string) => {
    setMemories((prev) =>
      prev.map((m) => (m.id === id ? { ...m, enabledForAI: !m.enabledForAI } : m))
    );
  };

  const deleteMemory = (id: string) => {
    setMemories((prev) => prev.filter((m) => m.id !== id));
  };

  // Actions Tâches
  const addTask = (task: Omit<TaskItem, 'id'>) => {
    const newTask: TaskItem = {
      ...task,
      id: `task_${Date.now()}`,
    };
    setTasks((prev) => [newTask, ...prev]);
  };

  const toggleTaskCompleted = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  // Actions Objectifs
  const addGoal = (goal: Omit<GoalItem, 'id'>) => {
    const newGoal: GoalItem = {
      ...goal,
      id: `goal_${Date.now()}`,
    };
    setGoals((prev) => [newGoal, ...prev]);
  };

  const toggleMilestone = (goalId: string, milestoneId: string) => {
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id !== goalId) return g;
        const updatedMilestones = g.milestones.map((m) =>
          m.id === milestoneId ? { ...m, completed: !m.completed } : m
        );
        const completedCount = updatedMilestones.filter((m) => m.completed).length;
        const newProgress = Math.round((completedCount / updatedMilestones.length) * 100);
        return {
          ...g,
          milestones: updatedMilestones,
          progressPercentage: newProgress,
          completed: newProgress === 100,
        };
      })
    );
  };

  // Actions Focus
  const addFocusSession = (session: Omit<FocusSession, 'id' | 'completedAt'>) => {
    const newSession: FocusSession = {
      ...session,
      id: `foc_${Date.now()}`,
      completedAt: new Date().toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
    setFocusSessions((prev) => [newSession, ...prev]);
  };

  // Actions Connaissances
  const addKnowledgeDoc = (doc: Omit<KnowledgeDoc, 'id' | 'addedAt'>) => {
    const newDoc: KnowledgeDoc = {
      ...doc,
      id: `doc_${Date.now()}`,
      addedAt: new Date().toISOString().split('T')[0],
    };
    setKnowledgeDocs((prev) => [newDoc, ...prev]);
  };

  const deleteKnowledgeDoc = (id: string) => {
    setKnowledgeDocs((prev) => prev.filter((d) => d.id !== id));
  };

  // Actions Opportunités
  const toggleSaveOpportunity = (id: string) => {
    setOpportunities((prev) =>
      prev.map((o) => (o.id === id ? { ...o, saved: !o.saved } : o))
    );
  };

  const addOpportunityToPlanner = (opp: OpportunityItem) => {
    addTask({
      title: `Candidature : ${opp.title}`,
      description: `Organisateur : ${opp.organization}. Lien officiel : ${opp.officialUrl}`,
      dueDate: opp.deadline,
      priority: 'high',
      completed: false,
      category: 'Opportunités',
    });
  };

  // Actions Conversations IA
  const createConversation = (initialTitle = 'Nouvelle discussion') => {
    const newConv: Conversation = {
      id: `conv_${Date.now()}`,
      title: initialTitle,
      lastActive: 'À l\'instant',
      messages: [],
    };
    setConversations((prev) => [newConv, ...prev]);
    setCurrentConversationId(newConv.id);
    return newConv.id;
  };

  const sendMessage = async (
    text: string,
    options?: { mode?: InferenceMode; localOnly?: boolean }
  ) => {
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}_u`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    };

    // Injecter immédiatement le message utilisateur
    setConversations((prev) =>
      prev.map((c) =>
        c.id === currentConversationId
          ? { ...c, messages: [...c.messages, userMsg], lastActive: 'À l\'instant' }
          : c
      )
    );

    setIsGenerating(true);

    try {
      // Préparation du prompt enrichi avec la mémoire active
      const activeMemoriesContext = memories
        .filter((m) => m.enabledForAI)
        .map((m) => `- ${m.key} : ${m.value}`)
        .join('\n');

      const systemContext = `Tu es ELORA, une intelligence personnelle hybride conçue pour aider l'utilisateur (${profile.name}) à comprendre, organiser ses projets, atteindre ses objectifs et saisir les meilleures opportunités.
Contexte mémorisé de l'utilisateur :
${activeMemoriesContext}
Réponds avec clarté, pertinence et élégance. Formate ta réponse en Markdown avec des sections lisibles lorsque nécessaire.`;

      const aiResponse: AIResponse = await orchestrator.process({
        prompt: `${systemContext}\n\nDemande de l'utilisateur : ${text}`,
        mode: options?.mode,
        localOnly: options?.localOnly,
      });

      const assistantMsg: ChatMessage = {
        id: `msg_${Date.now()}_a`,
        role: 'assistant',
        content: aiResponse.text,
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        inferenceSource: aiResponse.metadata.source === 'unavailable' ? undefined : aiResponse.metadata.source,
        modelName: aiResponse.metadata.modelName,
        durationMs: aiResponse.metadata.durationMs,
      };

      setConversations((prev) =>
        prev.map((c) =>
          c.id === currentConversationId
            ? { ...c, messages: [...c.messages, assistantMsg], lastActive: 'À l\'instant' }
            : c
        )
      );
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const errorAssistantMsg: ChatMessage = {
        id: `msg_${Date.now()}_err`,
        role: 'assistant',
        content: `⚠️ **Information ELORA :**\n\n${errMsg}`,
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      };

      setConversations((prev) =>
        prev.map((c) =>
          c.id === currentConversationId
            ? { ...c, messages: [...c.messages, errorAssistantMsg] }
            : c
        )
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
