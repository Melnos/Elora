import type {
  UserProfile,
  MemoryItem,
  TaskItem,
  GoalItem,
  FocusSession,
  KnowledgeDoc,
  OpportunityItem,
  Conversation,
} from '../types';

export const initialProfile: UserProfile = {
  name: 'Étudiant',
  email: '',
  roleTitle: 'Étudiant(e)',
  currentObjective: '',
  learningFocus: [],
};

export const initialMemories: MemoryItem[] = [];

export const initialTasks: TaskItem[] = [];

export const initialGoals: GoalItem[] = [];

export const initialFocusSessions: FocusSession[] = [];

export const initialKnowledge: KnowledgeDoc[] = [];

export const initialOpportunities: OpportunityItem[] = [];

export const initialConversations: Conversation[] = [];
