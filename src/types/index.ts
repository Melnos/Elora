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
  dateAdded: string;
  enabledForAI: boolean;
  status?: 'active' | 'candidate' | 'archived';
  userId?: string;
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

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  inferenceSource?: 'on_device' | 'in_cloud';
  modelName?: string;
  durationMs?: number;
  referencedDocIds?: string[];
}

export interface Conversation {
  id: string;
  title: string;
  lastActive: string;
  messages: ChatMessage[];
}
