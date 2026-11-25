/**
 * ELORA - Modèles de données centraux du produit
 * Représente l'état partagé entre les six espaces :
 * Home, AI, Knowledge, Planner, Opportunities, Progress
 */

export type NavTab = 'home' | 'ai' | 'knowledge' | 'planner' | 'opportunities' | 'progress';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface UserProfile {
  name: string;
  email: string;
  roleTitle: string;
  currentObjective: string;
  learningFocus: string[];
}

export interface MemoryItem {
  id: string;
  category: 'preference' | 'objective' | 'skill' | 'habit' | 'context' | 'profile' | 'knowledge' | 'project' | 'constraint';
  key: string;
  value: string;
  source: string;
  dateAdded?: string;
  enabledForAI: boolean;
  status?: 'active' | 'candidate' | 'archived';
  userId?: string;
  confidence?: number;
  createdAt?: string;
  updatedAt?: string;
  relatedEntityIds?: string[];
}

export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
  category: string;
  goalId?: string;
}

export interface GoalItem {
  id: string;
  title: string;
  category: string;
  targetDate: string;
  progressPercentage: number;
  milestones: { id: string; title: string; completed: boolean }[];
  completed: boolean;
}

export interface FocusSession {
  id: string;
  goalTitle: string;
  durationMinutes: number;
  completedAt: string;
  notes?: string;
}

export interface KnowledgeDoc {
  id: string;
  title: string;
  collection: string;
  type: 'pdf' | 'notes' | 'course' | 'research';
  summary: string;
  keyInsights: string[];
  content: string;
  addedAt: string;
  tags: string[];
}

export interface OpportunityItem {
  id: string;
  title: string;
  organization: string;
  type: 'hackathon' | 'internship' | 'scholarship' | 'competition' | 'program';
  deadline: string;
  location: string;
  isVerified: boolean;
  matchScore: number;
  matchReason: string;
  eligibility: string[];
  skillsRequired: string[];
  officialUrl: string;
  saved: boolean;
}

export interface ChatMessageSource {
  id: string;
  type: 'doc' | 'task' | 'goal' | 'memory' | 'opportunity';
  title: string;
  category?: string;
  snippet?: string;
}

export interface ChatProposedAction {
  id: string;
  type: 'create_task' | 'complete_milestone' | 'validate_memory' | 'update_goal' | 'add_knowledge_doc';
  title: string;
  description: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'executing' | 'accepted' | 'rejected' | 'failed';
  errorMessage?: string;
  missingFields?: string[];
  isDestructive?: boolean;
  executedAt?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  inferenceSource?: 'on_device' | 'in_cloud';
  modelName?: string;
  durationMs?: number;
  referencedDocIds?: string[];
  sources?: ChatMessageSource[];
  proposedActions?: ChatProposedAction[];
  fallbackOccurred?: boolean;
  fallbackReason?: string;
}

export interface Conversation {
  id: string;
  title: string;
  lastActive: string;
  createdAt?: string;
  updatedAt?: string;
  messages: ChatMessage[];
}
