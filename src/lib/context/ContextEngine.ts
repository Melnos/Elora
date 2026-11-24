/**
 * ELORA Context Engine
 * Service central d'intelligence transversale et de résolution contextuelle.
 *
 * Responsabilités & Précisions méthodologiques (Phase 6) :
 * 1. Rapprocher les entités des six espaces (Home, AI, Knowledge, Planner, Opportunities, Progress).
 * 2. Sélectionner les données strictement utiles et autorisées selon la requête.
 * 3. Filtrage par recherche lexicale tokenisée, pondération multicritère (titre, tags, collection, statut)
 *    et seuillage de pertinence pour éviter la saturation du contexte (sans prétendre à un embedding vectoriel dense).
 * 4. Identifier les relations explicites (Documents <-> Projets <-> Objectifs <-> Tâches).
 * 5. Conserver la traçabilité des sources, distinguer faits/déductions/lacunes, et proposer des actions contrôlées par l'utilisateur.
 */

import type {
  UserProfile,
  MemoryItem,
  TaskItem,
  GoalItem,
  FocusSession,
  KnowledgeDoc,
  OpportunityItem,
  Conversation,
} from '../../types';
import type {
  ContextQuery,
  ResolvedContext,
  HomeBriefing,
  ReferencedSource,
  ProposedAction,
} from './types';
import { MemoryService } from '../memory/MemoryService';
import { ActionEngine } from '../actions/ActionEngine';

export class ContextEngine {
  /**
   * Analyse et construit le contexte pertinent pour une requête utilisateur.
   */
  public static buildContext(
    query: ContextQuery,
    dataset: {
      profile: UserProfile;
      memories: MemoryItem[];
      goals: GoalItem[];
      tasks: TaskItem[];
      docs: KnowledgeDoc[];
      focusSessions?: FocusSession[];
      conversations?: Conversation[];
    }
  ): ResolvedContext {
    const { prompt, userId, activeEntityId, maxItemsPerScope = 4 } = query;
    const promptLower = (prompt || '').toLowerCase();
    const keywords = this.extractKeywords(promptLower);

    const referencedSources: ReferencedSource[] = [];
    const proposedActions: ProposedAction[] = [];

    // 1. Mémoires actives filtrées (Zero-candidate rule respectée)
    const activeMemories = MemoryService.getActiveContextForAI(
      userId,
      prompt,
      maxItemsPerScope
    );

    // 2. Objectifs pertinents (Score de matching lexical et statut)
    const scoredGoals = dataset.goals.map((g) => {
      let score = 0;
      if (!g.completed) score += 2; // Priorité aux objectifs actifs
      if (activeEntityId === g.id) score += 10;
      const text = `${g.title} ${g.category}`.toLowerCase();
      for (const kw of keywords) {
        if (text.includes(kw)) score += 3;
      }
      return { goal: g, score };
    });
    scoredGoals.sort((a, b) => b.score - a.score);
    const relevantGoals = scoredGoals
      .filter((sg) => sg.score > 0 || scoredGoals.indexOf(sg) === 0)
      .slice(0, Math.min(maxItemsPerScope, 3))
      .map((sg) => sg.goal);

    relevantGoals.forEach((g) => {
      referencedSources.push({
        id: g.id,
        type: 'goal',
        title: g.title,
        category: g.category,
      });
    });

    const relevantGoalIds = new Set(relevantGoals.map((g) => g.id));

    // 3. Tâches pertinentes (liées aux objectifs retenus ou aux mots-clés)
    const scoredTasks = dataset.tasks.map((t) => {
      let score = 0;
      if (!t.completed) score += 2;
      if (t.priority === 'high') score += 2;
      if (t.goalId && relevantGoalIds.has(t.goalId)) score += 4;
      if (activeEntityId === t.id) score += 10;

      const text = `${t.title} ${t.description || ''} ${t.category}`.toLowerCase();
      for (const kw of keywords) {
        if (text.includes(kw)) score += 3;
      }
      return { task: t, score };
    });
    scoredTasks.sort((a, b) => b.score - a.score);
    const relevantTasks = scoredTasks
      .filter((st) => st.score > 1 || scoredTasks.indexOf(st) === 0)
      .slice(0, maxItemsPerScope)
      .map((st) => st.task);

    relevantTasks.forEach((t) => {
      referencedSources.push({
        id: t.id,
        type: 'task',
        title: t.title,
        category: t.category,
      });
    });

    // 4. Documents Knowledge pertinents (avec extraits de contenu)
    const scoredDocs = dataset.docs.map((doc) => {
      let score = 0;
      if (activeEntityId === doc.id) score += 10;
      const titleLower = doc.title.toLowerCase();
      const summaryLower = doc.summary.toLowerCase();
      const tagsLower = doc.tags.join(' ').toLowerCase();
      const contentLower = doc.content.toLowerCase();

      for (const kw of keywords) {
        if (titleLower.includes(kw)) score += 5;
        if (tagsLower.includes(kw)) score += 4;
        if (summaryLower.includes(kw)) score += 3;
        if (contentLower.includes(kw)) score += 1;
      }
      return { doc, score };
    });
    scoredDocs.sort((a, b) => b.score - a.score);

    const relevantDocs = scoredDocs
      .filter((sd) => sd.score > 2)
      .slice(0, Math.min(maxItemsPerScope, 3))
      .map((sd) => sd.doc);

    relevantDocs.forEach((d) => {
      referencedSources.push({
        id: d.id,
        type: 'doc',
        title: d.title,
        category: d.collection,
        snippet: d.summary.slice(0, 150),
      });
    });

    // 5. Génération du bloc d'instructions contextuelles pour l'IA
    const systemPromptBlock = this.formatSystemContext({
      profile: dataset.profile,
      activeMemoriesBlock: activeMemories.systemContextBlock,
      goals: relevantGoals,
      tasks: relevantTasks,
      docs: relevantDocs,
    });

    // 6. Détection de propositions d'actions proactives fiabilisées (Zéro J+2 arbitraire)
    if (query.allowProposedActions) {
      const proactiveAction = ActionEngine.extractProactiveAction(prompt, {
        goals: relevantGoals,
      });
      if (proactiveAction) {
        proposedActions.push(proactiveAction);
      }
    }

    const totalEntitiesFound =
      activeMemories.itemCount + relevantGoals.length + relevantTasks.length + relevantDocs.length;

    return {
      profile: dataset.profile,
      memories: MemoryService.getMemories(userId, { status: 'active', enabledForAI: true }),
      goals: relevantGoals,
      tasks: relevantTasks,
      docs: relevantDocs,
      systemPromptBlock,
      referencedSources,
      proposedActions,
      stats: {
        totalEntitiesFound,
        tokensEstimated: Math.round(systemPromptBlock.length / 4),
      },
    };
  }

  /**
   * Génère un briefing dynamique et authentique pour l'espace HOME.
   */
  public static generateHomeBriefing(dataset: {
    profile: UserProfile;
    memories: MemoryItem[];
    goals: GoalItem[];
    tasks: TaskItem[];
    focusSessions?: FocusSession[];
  }): HomeBriefing {
    const { profile, goals, tasks, focusSessions = [], memories } = dataset;

    const uncompletedTasks = tasks.filter((t) => !t.completed);
    const completedTasksCount = tasks.filter((t) => t.completed).length;

    // Tâches urgentes triées par priorité puis par date
    const urgentTasks = [...uncompletedTasks]
      .sort((a, b) => {
        if (a.priority === 'high' && b.priority !== 'high') return -1;
        if (b.priority === 'high' && a.priority !== 'high') return 1;
        return (a.dueDate || '').localeCompare(b.dueDate || '');
      })
      .slice(0, 3);

    // Objectif prioritaire
    const activeGoals = goals.filter((g) => !g.completed);
    const priorityGoal = activeGoals[0] || goals[0] || null;

    // Projets / Catégories en cours
    const projectMap = new Map<string, { goalId?: string; count: number }>();
    tasks.forEach((t) => {
      const cat = t.category || 'Général';
      const cur = projectMap.get(cat) || { goalId: t.goalId, count: 0 };
      if (!t.completed) cur.count++;
      projectMap.set(cat, cur);
    });

    const focusProjects = Array.from(projectMap.entries())
      .filter(([_, v]) => v.count > 0)
      .slice(0, 3)
      .map(([name, v]) => ({
        name,
        goalId: v.goalId,
        remainingTasks: v.count,
      }));

    // Habitude ou recommandation retenue
    const activeHabits = memories.filter(
      (m) => (m.category === 'habit' || m.category === 'preference') && m.status === 'active' && m.enabledForAI
    );
    const recommendedHabit = activeHabits[0] || null;

    // Calcul de progression réel (non artificiel)
    const overallProgress =
      tasks.length > 0 ? Math.round((completedTasksCount / tasks.length) * 100) : 0;

    const totalFocusMinutes = focusSessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);

    const greeting = this.getGreeting(profile.name);
    const summary = uncompletedTasks.length > 0
      ? `Vous avez ${uncompletedTasks.length} tâche${uncompletedTasks.length > 1 ? 's' : ''} en attente, dont ${urgentTasks.length} prioritaire${urgentTasks.length > 1 ? 's' : ''}. Votre attention principale est portée sur "${priorityGoal?.title || 'vos projets actuels'}".`
      : 'Toutes vos priorités immédiates sont à jour. C\'est un moment idéal pour approfondir vos objectifs stratégiques.';

    return {
      greeting,
      summary,
      priorityGoal,
      urgentTasks,
      focusProjects,
      recommendedHabit,
      metrics: {
        overallProgress,
        tasksDoneCount: completedTasksCount,
        tasksTotalCount: tasks.length,
        focusMinutesTotal: totalFocusMinutes,
      },
    };
  }

  /**
   * Calcule le rapprochement réel entre compétences utilisateur et opportunités.
   */
  public static matchOpportunities(
    profile: UserProfile,
    memories: MemoryItem[],
    opportunities: OpportunityItem[]
  ): OpportunityItem[] {
    // Collecter les compétences validées depuis le profil et les mémoires actives
    const userSkills = new Set<string>();
    (profile.learningFocus || []).forEach((s) => userSkills.add(s.toLowerCase()));

    memories
      .filter((m) => m.category === 'skill' || m.category === 'knowledge')
      .forEach((m) => {
        m.value.split(/[,;\n]/).forEach((part) => {
          const trimmed = part.trim().toLowerCase();
          if (trimmed) userSkills.add(trimmed);
        });
      });

    return opportunities.map((opp) => {
      const reqSkills = opp.skillsRequired || [];
      if (reqSkills.length === 0) return opp;

      let matchCount = 0;
      const matchedNames: string[] = [];

      for (const req of reqSkills) {
        const reqLower = req.toLowerCase();
        let found = false;
        for (const uSkill of userSkills) {
          if (uSkill.includes(reqLower) || reqLower.includes(uSkill)) {
            found = true;
            matchedNames.push(req);
            break;
          }
        }
        if (found) matchCount++;
      }

      const matchScore = Math.round((matchCount / reqSkills.length) * 100);
      let matchReason = '';
      if (matchCount > 0) {
        matchReason = `Correspondance directe sur vos compétences : ${matchedNames.join(', ')}.`;
      } else {
        matchReason = 'Opportunité d\'apprentissage : requiert de nouvelles compétences à acquérir.';
      }

      return {
        ...opp,
        matchScore,
        matchReason,
      };
    });
  }

  // --- Utilitaires Internes ---

  private static extractKeywords(text: string): string[] {
    return text
      .replace(/[^\w\sàâäéèêëîïôöùûüç]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .slice(0, 10);
  }

  private static formatSystemContext(data: {
    profile: UserProfile;
    activeMemoriesBlock: string;
    goals: GoalItem[];
    tasks: TaskItem[];
    docs: KnowledgeDoc[];
  }): string {
    const sections: string[] = [
      `### [CONTEXTE UTILISATEUR TRANSVERSAL - ELORA CONTEXT ENGINE]`,
      `* **Utilisateur** : ${data.profile.name} (${data.profile.roleTitle})`,
      `* **Objectif stratégique déclaré** : ${data.profile.currentObjective}`,
    ];

    if (data.activeMemoriesBlock) {
      sections.push(`\n${data.activeMemoriesBlock}`);
    }

    if (data.goals.length > 0) {
      sections.push(`\n* **Objectifs pertinents associés** :`);
      data.goals.forEach((g) => {
        sections.push(
          `  - [Objectif #${g.id}] "${g.title}" (${g.progressPercentage}% complété)`
        );
      });
    }

    if (data.tasks.length > 0) {
      sections.push(`\n* **Tâches et échéances associées** :`);
      data.tasks.forEach((t) => {
        sections.push(
          `  - [Tâche #${t.id}] "${t.title}" | Échéance: ${t.dueDate} | Priorité: ${t.priority} | ${t.completed ? 'Fait' : 'À faire'}`
        );
      });
    }

    if (data.docs.length > 0) {
      sections.push(`\n* **Documents Knowledge référencés** :`);
      data.docs.forEach((d) => {
        sections.push(
          `  - [Doc #${d.id}] "${d.title}" (${d.collection}) : ${d.summary}`
        );
      });
    }

    sections.push(
      `\n### [CONSIGNES DE RAISONNEMENT & EXIGENCES DE VÉRITÉ (PHASE 6)]`,
      `- **Faits établis** : Appuie-toi rigoureusement sur les faits avérés ci-dessus (tâches, jalons d'objectifs, documents Knowledge et mémoires actives).`,
      `- **Déductions & Hypothèses** : Distingue expressément ce qui est prouvé de ce qui est déduit. Formule toute analyse déductive au conditionnel ou en tant qu'hypothèse.`,
      `- **Informations manquantes** : Si un paramètre clé fait défaut (ex: échéance précise, détail de mise en œuvre, identifiant manquant), signale-le ouvertement et demande une précision au lieu d'extrapoler ou d'inventer des contraintes arbitraires.`,
      `- **Traçabilité stricte** : Cite expressément les identifiants de source (ex: [Doc #${data.docs[0]?.id || '...'}], [Tâche #${data.tasks[0]?.id || '...'}], [Objectif #${data.goals[0]?.id || '...'}]) dès qu'une information en est issue.`,
      `- **Zéro hallucination de source** : Ne cite JAMAIS un document, une tâche ou un objectif qui n'apparaît pas explicitement dans ce contexte résolu.`,
      `- **Non-destructivité** : Ne propose et n'exécute aucune modification sans approbation formelle de l'utilisateur.`
    );

    return sections.join('\n');
  }

  private static getGreeting(name: string): string {
    const hour = new Date().getHours();
    const cleanName = name || 'Djima';
    if (hour < 12) return `Bonjour ${cleanName}`;
    if (hour < 18) return `Bon après-midi ${cleanName}`;
    return `Bonsoir ${cleanName}`;
  }
}
