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
    const excludedTerms = this.extractExcludedTerms(promptLower);
    const isPersonalQuery = this.isPersonalizationRequest(promptLower) || Boolean(activeEntityId);

    const referencedSources: ReferencedSource[] = [];
    const proposedActions: ProposedAction[] = [];

    // 1. Objectifs pertinents (uniquement si correspondance lexicale, entité ciblée ou demande personnelle explicite)
    const scoredGoals = dataset.goals.map((g) => {
      let keywordHits = 0;
      const text = this.normalizeSearchText(`${g.title} ${g.category}`);
      for (const kw of keywords) {
        if (text.includes(kw)) keywordHits += 1;
      }
      const score =
        keywordHits * 3 +
        (activeEntityId === g.id ? 10 : 0) +
        (keywordHits > 0 || isPersonalQuery ? (!g.completed ? 2 : 0) : 0);
      return { goal: g, score, keywordHits };
    });
    scoredGoals.sort((a, b) => b.score - a.score);
    const relevantGoals = scoredGoals
      .filter((sg) => sg.keywordHits > 0 || activeEntityId === sg.goal.id || isPersonalQuery)
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

    // 2. Tâches pertinentes (uniquement si correspondance lexicale, objectif retenu ou demande personnelle explicite)
    const scoredTasks = dataset.tasks.map((t) => {
      let keywordHits = 0;
      const text = this.normalizeSearchText(`${t.title} ${t.description || ''} ${t.category}`);
      for (const kw of keywords) {
        if (text.includes(kw)) keywordHits += 1;
      }
      const linkedToGoal = Boolean(t.goalId && relevantGoalIds.has(t.goalId));
      const score =
        keywordHits * 3 +
        (linkedToGoal ? 4 : 0) +
        (activeEntityId === t.id ? 10 : 0) +
        (keywordHits > 0 || linkedToGoal || isPersonalQuery ? (!t.completed ? 2 : 0) + (t.priority === 'high' ? 2 : 0) : 0);
      return { task: t, score, keywordHits, linkedToGoal };
    });
    scoredTasks.sort((a, b) => b.score - a.score);
    const relevantTasks = scoredTasks
      .filter((st) => st.keywordHits > 0 || st.linkedToGoal || activeEntityId === st.task.id || isPersonalQuery)
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

    // 3. Documents Knowledge pertinents (avec extraits de contenu)
    const scoredDocs = dataset.docs.map((doc) => {
      const titleLower = this.normalizeSearchText(doc.title);
      const collectionLower = this.normalizeSearchText(doc.collection);
      const summaryLower = this.normalizeSearchText(doc.summary);
      const tagsLower = this.normalizeSearchText(doc.tags.join(' '));
      const contentLower = this.normalizeSearchText(doc.content);

      const isExcluded = excludedTerms.some(
        (term) => titleLower.includes(term) || tagsLower.includes(term)
      );
      if (isExcluded && activeEntityId !== doc.id) {
        return { doc, score: 0 };
      }

      let score = 0;
      if (activeEntityId === doc.id) score += 10;
      for (const kw of keywords) {
        if (titleLower.includes(kw)) score += 5;
        if (tagsLower.includes(kw)) score += 4;
        if (summaryLower.includes(kw)) score += 3;
        if (contentLower.includes(kw)) score += 2;
        if (collectionLower.includes(kw)) score += 1;
      }
      return { doc, score };
    });
    scoredDocs.sort((a, b) => b.score - a.score);

    const relevantDocs = scoredDocs
      .filter((sd) => sd.score >= 4 || activeEntityId === sd.doc.id || (isPersonalQuery && scoredDocs.indexOf(sd) === 0 && sd.score > 0))
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

    // 4. Mémoires actives filtrées (uniquement si demande personnelle ou correspondance réelle avec le contexte)
    const activeMemPool = dataset.memories.filter(
      (m) => m.status === 'active' && m.enabledForAI
    );
    const hasMemoryKeywordMatch = activeMemPool.some((m) => {
      const mText = this.normalizeSearchText(`${m.key} ${m.value} ${m.category}`);
      return keywords.some((kw) => mText.includes(kw));
    });
    const shouldIncludeMemories =
      isPersonalQuery ||
      hasMemoryKeywordMatch ||
      relevantGoals.length > 0 ||
      relevantTasks.length > 0 ||
      relevantDocs.length > 0;

    const activeMemories = shouldIncludeMemories
      ? MemoryService.getActiveContextForAI(userId, prompt, maxItemsPerScope)
      : { systemContextBlock: '', itemCount: 0, categoriesIncluded: [] };

    // 5. Génération du bloc d'instructions contextuelles pour l'IA
    const systemPromptBlock = this.formatSystemContext({
      profile: dataset.profile,
      activeMemoriesBlock: activeMemories.systemContextBlock,
      goals: relevantGoals,
      tasks: relevantTasks,
      docs: relevantDocs,
      includePersonalProfile: isPersonalQuery,
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

  /**
   * Ne retient que les sources qui ont effectivement contribué à la réponse générée
   * (citation explicite de l'ID ou mention réelle du titre / termes clés dans la réponse).
   */
  public static filterUsedSources(
    sources: ReferencedSource[],
    responseText: string,
    userPrompt: string = ''
  ): ReferencedSource[] {
    if (!sources.length || !responseText.trim()) return [];
    const respNorm = this.normalizeSearchText(responseText);
    const excluded = this.extractExcludedTerms(userPrompt);

    return sources.filter((s) => {
      const titleNorm = this.normalizeSearchText(s.title);
      if (excluded.some((term) => titleNorm.includes(term))) {
        return false;
      }
      const idNorm = this.normalizeSearchText(s.id);
      if (respNorm.includes(`#${idNorm}`) || respNorm.includes(idNorm)) {
        return true;
      }
      if (titleNorm.length >= 4 && respNorm.includes(titleNorm)) {
        return true;
      }
      const titleTokens = titleNorm
        .replace(/[^\w\s-]/g, ' ')
        .split(/[\s-]+/)
        .filter((w) => w.length >= 4);
      if (titleTokens.length === 0) return false;
      const matchedTokens = titleTokens.filter((t) => respNorm.includes(t));
      return matchedTokens.length >= Math.min(2, titleTokens.length);
    });
  }

  private static extractExcludedTerms(prompt: string): string[] {
    const norm = this.normalizeSearchText(prompt);
    const terms: string[] = [];
    const patterns = [
      /(?:mets|met|laisse|laisser)\s+([a-z0-9_-]{3,})\s+de\s+cote/g,
      /(?:sans|ignore|ignorer|oublie|oublier|pas\s+de|ne\s+parle\s+pas\s+de)\s+([a-z0-9_-]{3,})/g,
    ];
    for (const re of patterns) {
      let m: RegExpExecArray | null;
      while ((m = re.exec(norm)) !== null) {
        if (m[1]) terms.push(m[1]);
      }
    }
    return terms;
  }

  private static isPersonalizationRequest(promptLower: string): boolean {
    const normalized = this.normalizeSearchText(promptLower);
    return /\b(mon profil|mes objectifs|mon objectif|mes taches|ma tache|mon planning|mon agenda|mes documents|ma bibliotheque|mes memoires|mes preferences|mes competences|ma progression|mon bilan|mes opportunites|mon projet|a partir de mes|selon mon|adapte a mon|personnalise|dans mon contexte|hackathon|elora|ecogen)\b/i.test(
      normalized
    );
  }

  private static normalizeSearchText(text: string): string {
    return (text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private static extractKeywords(text: string): string[] {
    const stopWords = new Set([
      'les', 'des', 'une', 'que', 'qui', 'quoi', 'quel', 'quelle', 'quels', 'quelles',
      'dans', 'pour', 'avec', 'sur', 'sous', 'par', 'mon', 'mes', 'ton', 'tes', 'son',
      'ses', 'nos', 'vos', 'est', 'sont', 'dit', 'peux', 'fais', 'faire', 'comment',
      'pourquoi', 'quand', 'cette', 'ceci', 'cela', 'plus', 'moins', 'tout', 'tous',
      'the', 'and', 'for', 'with', 'what', 'how', 'about', 'this', 'that', 'from',
    ]);
    return Array.from(
      new Set(
        this.normalizeSearchText(text)
          .replace(/[^\w\s-]/g, ' ')
          .split(/[\s-]+/)
          .filter((w) => w.length > 2 && !stopWords.has(w))
      )
    ).slice(0, 14);
  }

  private static formatSystemContext(data: {
    profile: UserProfile;
    activeMemoriesBlock: string;
    goals: GoalItem[];
    tasks: TaskItem[];
    docs: KnowledgeDoc[];
    includePersonalProfile?: boolean;
  }): string {
    const hasPersonalContext = Boolean(
      data.includePersonalProfile ||
        data.activeMemoriesBlock ||
        data.goals.length > 0 ||
        data.tasks.length > 0 ||
        data.docs.length > 0
    );

    const sections: string[] = [
      `### [CONSIGNES PRINCIPALES - ELORA]`,
      `- **Priorité à la demande** : Réponds directement, clairement et complètement à la question actuelle de l'utilisateur.`,
      `- **Structure exacte** : Respecte strictement le format et le nombre d'éléments demandés (ex: exactement 3 exemples).`,
      `- **Continuité conversationnelle** : Si l'utilisateur fait référence à un élément précédent (ex: « le deuxième »), appuie-toi uniquement sur la liste réellement produite au tour précédent dans l'historique récent. Si le référent est absent ou ambigu, demande une précision sans inventer.`,
    ];

    if (!hasPersonalContext) {
      sections.push(
        `- **Question générale** : Aucun document, tâche, objectif ou profil personnel n'est requis ici. N'évoque pas les projets, le profil, le hackathon ou les documents personnels de l'utilisateur.`
      );
      return sections.join('\n');
    }

    sections.push(`\n### [CONTEXTE UTILISATEUR PERTINENT - ELORA CONTEXT ENGINE]`);
    if (data.includePersonalProfile) {
      sections.push(
        `* **Utilisateur** : ${data.profile.name} (${data.profile.roleTitle})`,
        `* **Objectif stratégique déclaré** : ${data.profile.currentObjective}`
      );
    }

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
        const excerpt = d.content ? d.content.trim().slice(0, 1200) : '';
        sections.push(
          `  - [Doc #${d.id}] "${d.title}" (${d.collection}) : ${d.summary}${excerpt ? `\n    Extrait : ${excerpt}` : ''}`
        );
      });
    }

    sections.push(
      `\n### [CONSIGNES DE RAISONNEMENT & EXIGENCES DE VÉRITÉ]`,
      `- **Faits établis** : Appuie-toi rigoureusement sur les faits avérés ci-dessus uniquement s'ils servent la question.`,
      `- **Déductions & Hypothèses** : Distingue expressément ce qui est prouvé de ce qui est déduit.`,
      `- **Informations manquantes** : Si un paramètre clé fait défaut, signale-le ouvertement sans extrapoler.`,
      `- **Traçabilité stricte** : Cite expressément les identifiants de source (ex: [Doc #${data.docs[0]?.id || '...'}], [Tâche #${data.tasks[0]?.id || '...'}], [Objectif #${data.goals[0]?.id || '...'}]) dès qu'une information en est issue.`,
      `- **Zéro hallucination de source** : Ne cite JAMAIS un document, une tâche ou un objectif absent de ce contexte.`
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
