/**
 * ELORA Context Engine - Types et Définitions
 * Modèles pour la résolution contextuelle transversale et les relations entre les 6 espaces.
 */

import type {
  UserProfile,
  MemoryItem,
  TaskItem,
  GoalItem,
  KnowledgeDoc,
} from '../../types';
import type { ProposedAction, ActionStatus, ActionType } from '../actions/types';
export type { ProposedAction, ActionStatus, ActionType };

export type ContextScope =
  | 'profile'
  | 'memories'
  | 'goals'
  | 'tasks'
  | 'docs'
  | 'conversations'
  | 'opportunities'
  | 'focus';

export interface ContextQuery {
  /** Requête textuelle ou consigne de l'utilisateur */
  prompt: string;
  /** Identifiant unique de l'utilisateur pour isolation stricte */
  userId: string;
  /** Périmètre optionnel de recherche */
  scopes?: ContextScope[];
  /** Limite d'éléments retournés pour éviter la saturation */
  maxItemsPerScope?: number;
  /** Entité courante ciblée si interaction depuis une page spécifique */
  activeEntityId?: string;
  /** Autorise l'extraction de suggestions d'actions */
  allowProposedActions?: boolean;
}

export interface ReferencedSource {
  id: string;
  type: 'doc' | 'task' | 'goal' | 'memory' | 'opportunity';
  title: string;
  category?: string;
  snippet?: string;
}

export interface ResolvedContext {
  /** Profil de l'utilisateur */
  profile: UserProfile;
  /** Mémoires actives pertinentes */
  memories: MemoryItem[];
  /** Objectifs stratégiques concernés */
  goals: GoalItem[];
  /** Tâches associées ou prioritaires */
  tasks: TaskItem[];
  /** Documents Knowledge pertinents avec extraits */
  docs: KnowledgeDoc[];
  /** Derniers échanges utiles */
  recentMessagesSnippet?: string;
  /** Bloc de texte formaté prêt à l'injection dans le system prompt */
  systemPromptBlock: string;
  /** Sources explicites référencées */
  referencedSources: ReferencedSource[];
  /** Actions suggérées par l'analyse transversale (en attente de confirmation) */
  proposedActions: ProposedAction[];
  /** Métriques transversales calculées */
  stats: {
    totalEntitiesFound: number;
    tokensEstimated: number;
  };
}

export interface HomeBriefing {
  greeting: string;
  summary: string;
  priorityGoal: GoalItem | null;
  urgentTasks: TaskItem[];
  focusProjects: Array<{ name: string; goalId?: string; remainingTasks: number }>;
  recommendedHabit: MemoryItem | null;
  metrics: {
    overallProgress: number;
    tasksDoneCount: number;
    tasksTotalCount: number;
    focusMinutesTotal: number;
  };
}

export interface TransversalRelation {
  sourceId: string;
  sourceType: 'goal' | 'task' | 'doc' | 'project' | 'memory';
  targetId: string;
  targetType: 'goal' | 'task' | 'doc' | 'project' | 'memory';
  relationType: 'belongs_to' | 'references' | 'supports' | 'verifies';
}
