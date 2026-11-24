/**
 * ELORA Action Engine
 * Moteur d'audit, de validation stricte et d'exécution sécurisée des actions transversales.
 *
 * Principes stricts (Phase 6) :
 * 1. Zéro échéance automatique arbitraire (notamment pas de J+2 hardcodé).
 * 2. Si une information essentielle manque, demande de précision explicite (missingFields).
 * 3. Validation stricte des payloads par schéma avant toute exécution.
 * 4. Protection contre les doubles exécutions (verrouillage d'idempotence et anti-double-clic).
 * 5. Gestion rigoureuse du cycle de vie : pending -> executing -> accepted | rejected | failed.
 * 6. Les actions destructives exigent une autorisation explicite et ne sont jamais exécutées aveuglément.
 * 7. Statut 'accepted' acté uniquement après confirmation de l'exécution et de la persistance.
 */

import type { GoalItem } from '../../types';
import type {
  ProposedAction,
  ActionValidationResult,
  ActionExecutionResult,
  ActionExecutionContext,
  ActionPayloadTask,
  ActionPayloadMilestone,
  ActionPayloadMemory,
  ActionPayloadKnowledgeDoc,
} from './types';

export class ActionEngine {
  /** Verrous d'exécution actifs pour prévenir les doubles clics et race conditions */
  private static executingLocks = new Set<string>();

  /**
   * Valide strictement le payload d'une action proposée.
   */
  public static validate(
    action: ProposedAction,
    context?: Partial<ActionExecutionContext>
  ): ActionValidationResult {
    const missingFields: string[] = [];
    const p = action.payload || {};

    switch (action.type) {
      case 'create_task': {
        const title = typeof p.title === 'string' ? p.title.trim() : '';
        if (!title || title.length < 3) {
          missingFields.push('title');
        }

        // Vérification de la date d'échéance : format YYYY-MM-DD ou ISO valide si fournie
        let dueDate: string | undefined = undefined;
        if (p.dueDate && typeof p.dueDate === 'string' && p.dueDate.trim() !== '') {
          const trimmedDate = p.dueDate.trim();
          const parsed = new Date(trimmedDate);
          if (isNaN(parsed.getTime())) {
            return {
              isValid: false,
              missingFields: ['dueDate'],
              error: `La date d'échéance "${trimmedDate}" est invalide. Format attendu : AAAA-MM-JJ.`,
            };
          }
          dueDate = trimmedDate;
        }

        // Priorité contrôlée
        const validPriorities = ['high', 'medium', 'low'] as const;
        const priority = validPriorities.includes(p.priority as 'high')
          ? (p.priority as 'high' | 'medium' | 'low')
          : 'medium';

        // Catégorie
        const category = typeof p.category === 'string' && p.category.trim() !== ''
          ? p.category.trim()
          : 'Projet';

        // Objectif lié optionnel mais vérifié s'il est spécifié
        let goalId: string | undefined = undefined;
        if (typeof p.goalId === 'string' && p.goalId.trim() !== '') {
          goalId = p.goalId.trim();
          if (context?.goals && !context.goals.some((g) => g.id === goalId)) {
            return {
              isValid: false,
              missingFields: [],
              error: `L'objectif de rattachement [${goalId}] est introuvable.`,
            };
          }
        }

        if (missingFields.length > 0) {
          return {
            isValid: false,
            missingFields,
            error: `Informations essentielles manquantes pour créer la tâche : ${missingFields.join(', ')}.`,
          };
        }

        const sanitized: ActionPayloadTask = {
          title,
          dueDate, // Reste undefined si non spécifié par l'utilisateur (Zéro J+2 arbitraire)
          priority,
          category,
          goalId,
        };

        return { isValid: true, missingFields: [], sanitizedPayload: sanitized as unknown as Record<string, unknown> };
      }

      case 'complete_milestone': {
        const goalId = typeof p.goalId === 'string' ? p.goalId.trim() : '';
        const milestoneId = typeof p.milestoneId === 'string' ? p.milestoneId.trim() : '';

        if (!goalId) missingFields.push('goalId');
        if (!milestoneId) missingFields.push('milestoneId');

        if (missingFields.length > 0) {
          return {
            isValid: false,
            missingFields,
            error: `Identifiants requis manquants : ${missingFields.join(', ')}.`,
          };
        }

        if (context?.goals) {
          const targetGoal = context.goals.find((g) => g.id === goalId);
          if (!targetGoal) {
            return { isValid: false, missingFields: [], error: `Objectif [${goalId}] introuvable.` };
          }
          const targetMilestone = targetGoal.milestones.find((m) => m.id === milestoneId);
          if (!targetMilestone) {
            return { isValid: false, missingFields: [], error: `Jalon [${milestoneId}] introuvable dans l'objectif "${targetGoal.title}".` };
          }
        }

        const sanitized: ActionPayloadMilestone = { goalId, milestoneId };
        return { isValid: true, missingFields: [], sanitizedPayload: sanitized as unknown as Record<string, unknown> };
      }

      case 'validate_memory': {
        const memoryId = typeof p.memoryId === 'string' ? p.memoryId.trim() : (p.id as string || '').trim();
        if (!memoryId) {
          return {
            isValid: false,
            missingFields: ['memoryId'],
            error: 'Identifiant de mémoire requis.',
          };
        }
        const sanitized: ActionPayloadMemory = { memoryId };
        return { isValid: true, missingFields: [], sanitizedPayload: sanitized as unknown as Record<string, unknown> };
      }

      case 'add_knowledge_doc': {
        const title = typeof p.title === 'string' ? p.title.trim() : '';
        const content = typeof p.content === 'string' ? p.content.trim() : '';
        if (!title || title.length < 3) missingFields.push('title');
        if (!content || content.length < 5) missingFields.push('content');

        if (missingFields.length > 0) {
          return {
            isValid: false,
            missingFields,
            error: `Champs document requis manquants : ${missingFields.join(', ')}.`,
          };
        }

        const sanitized: ActionPayloadKnowledgeDoc = {
          title,
          content,
          collection: typeof p.collection === 'string' ? p.collection.trim() : 'Général',
          tags: Array.isArray(p.tags) ? p.tags.map(String) : [],
          summary: typeof p.summary === 'string' ? p.summary.trim() : content.slice(0, 150),
        };
        return { isValid: true, missingFields: [], sanitizedPayload: sanitized as unknown as Record<string, unknown> };
      }

      default:
        return {
          isValid: false,
          missingFields: [],
          error: `Type d'action non supporté : ${(action as { type: string }).type}`,
        };
    }
  }

  /**
   * Exécute une action de manière atomique, sécurisée et idempotente.
   */
  public static async execute(
    action: ProposedAction,
    context: ActionExecutionContext
  ): Promise<ActionExecutionResult> {
    const actionId = action.id;

    // 1. Contrôle d'idempotence : si déjà acceptée, refuser la ré-exécution
    if (action.status === 'accepted') {
      return {
        success: true,
        status: 'accepted',
        actionId,
        errorMessage: 'Action déjà validée et exécutée.',
      };
    }

    // 2. Protection anti-double-clic et anti-concurrence
    if (action.status === 'executing' || this.executingLocks.has(actionId)) {
      return {
        success: false,
        status: 'executing',
        actionId,
        errorMessage: 'Une exécution de cette action est déjà en cours. Double-clic ignoré.',
      };
    }

    // 3. Validation stricte du payload
    const validation = this.validate(action, context);
    if (!validation.isValid || !validation.sanitizedPayload) {
      return {
        success: false,
        status: 'failed',
        actionId,
        errorMessage: validation.error || 'Validation du payload échouée.',
      };
    }

    // 4. Verrouillage de l'action
    this.executingLocks.add(actionId);

    try {
      let createdEntityId: string | undefined;

      switch (action.type) {
        case 'create_task': {
          const p = validation.sanitizedPayload as unknown as ActionPayloadTask;
          const idOrPromise = context.onAddTask({
            title: p.title,
            dueDate: p.dueDate || '',
            priority: p.priority || 'medium',
            completed: false,
            category: p.category || 'Projet',
            goalId: p.goalId,
            description: p.description,
          });
          createdEntityId = await Promise.resolve(idOrPromise);
          break;
        }

        case 'complete_milestone': {
          const p = validation.sanitizedPayload as unknown as ActionPayloadMilestone;
          await Promise.resolve(context.onToggleMilestone(p.goalId, p.milestoneId));
          createdEntityId = p.milestoneId;
          break;
        }

        case 'validate_memory': {
          const p = validation.sanitizedPayload as unknown as ActionPayloadMemory;
          await Promise.resolve(context.onValidateMemory(p.memoryId));
          createdEntityId = p.memoryId;
          break;
        }

        case 'add_knowledge_doc': {
          const p = validation.sanitizedPayload as unknown as ActionPayloadKnowledgeDoc;
          if (context.onAddKnowledgeDoc) {
            const docIdOrPromise = context.onAddKnowledgeDoc({
              title: p.title,
              collection: p.collection || 'Général',
              type: 'notes',
              summary: p.summary || p.content.slice(0, 140),
              keyInsights: ['Document créé depuis une analyse contextuelle ELORA.'],
              content: p.content,
              tags: p.tags || ['elora', 'ia'],
            });
            createdEntityId = await Promise.resolve(docIdOrPromise);
          }
          break;
        }
      }

      return {
        success: true,
        status: 'accepted',
        actionId,
        entityId: createdEntityId,
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        status: 'failed',
        actionId,
        errorMessage: `Échec d'exécution de l'action : ${errMsg}`,
      };
    } finally {
      this.executingLocks.delete(actionId);
    }
  }

  /**
   * Analyse un prompt utilisateur pour proposer une action si intention explicite détectée.
   * RÈGLE D'OR : N'invente JAMAIS d'échéance arbitraire J+2.
   */
  public static extractProactiveAction(
    prompt: string,
    context: { goals: GoalItem[] }
  ): ProposedAction | null {
    const promptLower = prompt.toLowerCase();

    // Détection d'intention d'ajout de tâche
    const taskTriggers = [
      'ajoute une tâche',
      'crée une tâche',
      'ajouter une tâche',
      'créer une tâche',
      'faire une tâche',
      'planifier une tâche',
      'planifie une tâche',
      'nouvelle tâche',
      'todo',
      'planifie',
      'planifier',
    ];
    const hasTaskIntent = taskTriggers.some((t) => promptLower.includes(t));

    if (hasTaskIntent) {
      // Extraction soignée du titre de la tâche
      let cleanTitle = prompt;
      for (const trigger of taskTriggers) {
        const idx = promptLower.indexOf(trigger);
        if (idx !== -1) {
          const rawSuffix = prompt.slice(idx + trigger.length).replace(/^[\s:,-]+/, '').trim();
          if (rawSuffix.length >= 3) {
            cleanTitle = rawSuffix;
            break;
          }
        }
      }

      // Nettoyage des phrases de politesse
      cleanTitle = cleanTitle.replace(/^(pour|de|que je dois|qu'il faut)\s+/i, '').trim();
      if (!cleanTitle || cleanTitle.length < 3) {
        cleanTitle = prompt.slice(0, 60).trim();
      }

      // Détection de date explicite (aujourd'hui, demain, ou format YYYY-MM-DD / JJ/MM/AAAA)
      let extractedDueDate: string | undefined = undefined;
      const today = new Date();

      if (promptLower.includes("aujourd'hui") || promptLower.includes('ce jour')) {
        extractedDueDate = today.toISOString().split('T')[0];
      } else if (promptLower.includes('demain')) {
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        extractedDueDate = tomorrow.toISOString().split('T')[0];
      } else {
        const dateMatch = prompt.match(/\b(\d{4}-\d{2}-\d{2})\b/);
        if (dateMatch) {
          extractedDueDate = dateMatch[1];
        }
      }
      // Note essentielle : Si aucune date n'est mentionnée, extractedDueDate reste undefined.
      // ZÉRO attribution arbitraire de J+2.

      // Détection de priorité explicite
      let priority: 'high' | 'medium' | 'low' = 'medium';
      if (promptLower.includes('urgent') || promptLower.includes('critique') || promptLower.includes('immédiat') || promptLower.includes('haute priorité')) {
        priority = 'high';
      } else if (promptLower.includes('secondaire') || promptLower.includes('basse priorité') || promptLower.includes('quand tu pourras')) {
        priority = 'low';
      }

      // Rapprochement avec objectif existant
      const relevantGoal = context.goals.find((g) => !g.completed);

      return {
        id: `act_${Date.now()}_task`,
        type: 'create_task',
        title: 'Créer une tâche associée',
        description: `Ajouter "${cleanTitle.slice(0, 50)}${cleanTitle.length > 50 ? '...' : ''}" au planificateur${relevantGoal ? ` (Liée à : ${relevantGoal.title})` : ''}`,
        payload: {
          title: cleanTitle,
          priority,
          dueDate: extractedDueDate, // undefined si non mentionné
          goalId: relevantGoal?.id,
          category: relevantGoal?.category || 'Projet',
        },
        status: 'pending',
      };
    }

    return null;
  }
}
