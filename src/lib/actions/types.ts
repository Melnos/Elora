/**
 * ELORA Action Engine - Types et Définitions
 * Modèle formel pour l'audit, la validation et l'exécution fiabilisée des actions transversales.
 */

import type { TaskItem, GoalItem, KnowledgeDoc, MemoryItem } from '../../types';

export type ActionType =
  | 'create_task'
  | 'complete_milestone'
  | 'update_goal'
  | 'validate_memory'
  | 'add_knowledge_doc';

export type ActionStatus =
  | 'pending'    // En attente d'arbitrage utilisateur
  | 'executing'  // Verrouillé, en cours d'exécution (protection anti-double-clic)
  | 'accepted'   // Confirmé et persisté avec succès (Local + Firestore)
  | 'rejected'   // Refusé explicitement par l'utilisateur
  | 'failed';    // Échec de validation ou d'écriture (avec message d'erreur)

export interface ActionPayloadTask {
  title: string;
  dueDate?: string;
  priority?: 'high' | 'medium' | 'low';
  category?: string;
  goalId?: string;
  description?: string;
}

export interface ActionPayloadMilestone {
  goalId: string;
  milestoneId: string;
}

export interface ActionPayloadGoal {
  goalId: string;
  progressPercentage?: number;
  completed?: boolean;
}

export interface ActionPayloadMemory {
  memoryId: string;
}

export interface ActionPayloadKnowledgeDoc {
  title: string;
  content: string;
  collection?: string;
  tags?: string[];
  summary?: string;
}

export interface ProposedAction {
  id: string;
  type: ActionType;
  title: string;
  description: string;
  payload: Record<string, unknown>;
  status: ActionStatus;
  isDestructive?: boolean;
  missingFields?: string[];
  errorMessage?: string;
  executedAt?: string;
}

export interface ActionValidationResult {
  isValid: boolean;
  missingFields: string[];
  sanitizedPayload?: Record<string, unknown>;
  error?: string;
}

export interface ActionExecutionResult {
  success: boolean;
  status: ActionStatus;
  actionId: string;
  errorMessage?: string;
  entityId?: string;
}

export interface ActionExecutionContext {
  userId?: string;
  tasks: TaskItem[];
  goals: GoalItem[];
  docs: KnowledgeDoc[];
  memories: MemoryItem[];
  onAddTask: (task: Omit<TaskItem, 'id'>) => Promise<string> | string;
  onToggleMilestone: (goalId: string, milestoneId: string) => Promise<void> | void;
  onUpdateGoal?: (goalId: string, updates: Partial<GoalItem>) => Promise<void> | void;
  onValidateMemory: (memoryId: string) => Promise<void> | void;
  onAddKnowledgeDoc?: (doc: Omit<KnowledgeDoc, 'id' | 'addedAt'>) => Promise<string> | string;
}
