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
    const isWebSearch = this.isWebSearchRequest(promptLower) && !activeEntityId;
    const isIdentityQuery = this.isIdentityOrMemoryQuery(promptLower);
    const isMetaQuestion = this.isMetaQuestionAboutContext(promptLower);
    const asksGoalsOrTasks = this.asksAboutTasksOrGoals(promptLower);
    const asksDocs = this.asksAboutDocuments(promptLower);
    const isPersonalQuery =
      this.isPersonalizationRequest(promptLower) || Boolean(activeEntityId) || isIdentityQuery;

    // Sur une recherche Web pure, une question d'identité ("Tu me connais ?") ou une question méta ("Pourquoi me parles-tu d'ECOGEN ?"),
    // on n'injecte PAS automatiquement les tâches, objectifs ou documents Knowledge locaux.
    const allowLocalTasksAndGoals =
      Boolean(activeEntityId) || (!isWebSearch && !isIdentityQuery && !isMetaQuestion);
    const allowLocalDocs =
      Boolean(activeEntityId) || (!isWebSearch && !isIdentityQuery && !isMetaQuestion);

    const referencedSources: ReferencedSource[] = [];
    const proposedActions: ProposedAction[] = [];

    // 1. Objectifs pertinents (uniquement si pertinents et autorisés pour cette intention)
    const scoredGoals = allowLocalTasksAndGoals
      ? dataset.goals.map((g) => {
          let keywordHits = 0;
          const text = this.normalizeSearchText(`${g.title} ${g.category}`);
          for (const kw of keywords) {
            if (text.includes(kw)) keywordHits += 1;
          }
          const score =
            keywordHits * 3 +
            (activeEntityId === g.id ? 10 : 0) +
            (keywordHits > 0 || asksGoalsOrTasks ? (!g.completed ? 2 : 0) : 0);
          return { goal: g, score, keywordHits };
        })
      : [];
    scoredGoals.sort((a, b) => b.score - a.score);
    const relevantGoals = scoredGoals
      .filter((sg) => sg.keywordHits > 0 || activeEntityId === sg.goal.id || asksGoalsOrTasks)
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

    // 2. Tâches pertinentes (jamais injectées sans lien direct ou demande de planning/tâches)
    const scoredTasks = allowLocalTasksAndGoals
      ? dataset.tasks.map((t) => {
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
            (keywordHits > 0 || linkedToGoal || asksGoalsOrTasks
              ? (!t.completed ? 2 : 0) + (t.priority === 'high' ? 2 : 0)
              : 0);
          return { task: t, score, keywordHits, linkedToGoal };
        })
      : [];
    scoredTasks.sort((a, b) => b.score - a.score);
    const relevantTasks = scoredTasks
      .filter(
        (st) =>
          st.keywordHits > 0 || st.linkedToGoal || activeEntityId === st.task.id || asksGoalsOrTasks
      )
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
    const scoredDocs = allowLocalDocs
      ? dataset.docs.map((doc) => {
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
        })
      : [];
    scoredDocs.sort((a, b) => b.score - a.score);

    const relevantDocs = scoredDocs
      .filter((sd) => sd.score >= 4 || activeEntityId === sd.doc.id || (asksDocs && scoredDocs.indexOf(sd) === 0 && sd.score > 0))
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

    // 4. Mémoires actives filtrées (incluses si demande personnelle/identité, ou si correspondance réelle hors recherche Web)
    const serviceMemories = MemoryService.getAll(userId);
    const memoryPool = serviceMemories.length > 0 ? serviceMemories : (dataset.memories as any[]);
    const activeMemPool = memoryPool.filter(
      (m) => (m.status === 'active' || m.status === 'temporary') && m.enabledForAI
    );
    const hasMemoryKeywordMatch = activeMemPool.some((m) => {
      const mText = this.normalizeSearchText(`${m.key} ${m.value} ${m.category}`);
      return keywords.some((kw) => mText.includes(kw));
    });
    const shouldIncludeMemories =
      isPersonalQuery ||
      isIdentityQuery ||
      (!isWebSearch &&
        !isMetaQuestion &&
        (hasMemoryKeywordMatch ||
          relevantGoals.length > 0 ||
          relevantTasks.length > 0 ||
          relevantDocs.length > 0));

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
      includePersonalProfile: isPersonalQuery || isIdentityQuery,
      isWebSearch,
      isIdentityQuery,
      isMetaQuestion,
    });

    // 6. Détection de propositions d'actions proactives fiabilisées (tâches + candidats mémoire)
    if (query.allowProposedActions) {
      const proactiveAction = ActionEngine.extractProactiveAction(prompt, {
        goals: relevantGoals,
      });
      if (proactiveAction) {
        proposedActions.push(proactiveAction);
      }

      const candidateFacts = MemoryService.extractCandidateFacts(prompt);
      for (const cand of candidateFacts) {
        const persistedCandidate = MemoryService.proposeCandidate(userId, cand);
        if (persistedCandidate && persistedCandidate.status === 'candidate') {
          proposedActions.push({
            id: `act_mem_${persistedCandidate.id}`,
            type: 'validate_memory',
            title: persistedCandidate.isTemporary
              ? `Mémoriser temporairement : ${persistedCandidate.key}`
              : `Mémoriser : ${persistedCandidate.key}`,
            description: `${persistedCandidate.value} (${cand.justification})`,
            payload: {
              memoryId: persistedCandidate.id,
              category: persistedCandidate.category,
              key: persistedCandidate.key,
              value: persistedCandidate.value,
              targetStatus: persistedCandidate.isTemporary ? 'temporary' : 'active',
            },
            status: 'pending',
          });
        }
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
      isWebSearch,
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
    return /\b(mon profil|mes objectifs|mon objectif|mes taches|ma tache|mon planning|mon agenda|mes documents|ma bibliotheque|mes memoires|mes preferences|mes competences|ma progression|mon bilan|mes opportunites|mon projet|a partir de mes|selon mon|adapte a mon|personnalise|dans mon contexte)\b/i.test(
      normalized
    );
  }

  private static isWebSearchRequest(promptLower: string): boolean {
    const normalized = this.normalizeSearchText(promptLower);
    if (/\b(mes documents|ma bibliotheque|mes taches|mon planning|mes objectifs)\b/i.test(normalized)) {
      return false;
    }
    return /\b(hackathon|hackathons|concours|bourse|bourses|appel a projets|competition|competitions|opportunite|opportunites|trouve-moi|trouve moi|cherche sur internet|cherche sur le web|recherche web|google|ouverts actuellement|en ce moment|actualite|actualites|recemment|cette annee|en ligne)\b/i.test(
      normalized
    );
  }

  private static isIdentityOrMemoryQuery(promptLower: string): boolean {
    const normalized = this.normalizeSearchText(promptLower);
    return /\b(tu me connais|que sais-tu de moi|que sais tu de moi|qui suis-je|qui suis je|tu te souviens de moi|qu est-ce que tu sais sur moi|tu connais mon nom|mon prenom|tu sais qui je suis)\b/i.test(
      normalized
    );
  }

  private static isMetaQuestionAboutContext(promptLower: string): boolean {
    const normalized = this.normalizeSearchText(promptLower);
    return /\b(pourquoi me parles-tu|pourquoi me parles tu|pourquoi tu me parles|pourquoi mentionnes-tu|pourquoi parles-tu)\b/i.test(
      normalized
    );
  }

  private static asksAboutTasksOrGoals(promptLower: string): boolean {
    const normalized = this.normalizeSearchText(promptLower);
    return /\b(mes taches|ma tache|mon planning|mon agenda|mes objectifs|mon objectif|ma progression|mon bilan)\b/i.test(
      normalized
    );
  }

  private static asksAboutDocuments(promptLower: string): boolean {
    const normalized = this.normalizeSearchText(promptLower);
    return /\b(mes documents|mon document|ma bibliotheque|mes fiches|mes notes|dans mon pdf|dans mon fichier)\b/i.test(
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
    isWebSearch?: boolean;
    isIdentityQuery?: boolean;
    isMetaQuestion?: boolean;
  }): string {
    const todayIso = new Date().toISOString().split('T')[0];
    const hasCustomName =
      Boolean(data.profile.name?.trim()) &&
      data.profile.name.trim().toLowerCase() !== 'étudiant';
    const hasPersonalContext = Boolean(
      data.includePersonalProfile ||
      data.activeMemoriesBlock ||
      data.goals.length > 0 ||
      data.tasks.length > 0 ||
      data.docs.length > 0
    );

    const sections: string[] = [
      `### [CONSIGNES CONVERSATIONNELLES - ELORA]`,
      `- **Date du jour** : ${todayIso}.`,
      `- **Réponse directe** : Réponds immédiatement et naturellement à la demande dès la première phrase. Adapte ton ton avec justesse et respect au style de l'utilisateur sans familiarité artificielle.`,
      `- **Continuité conversationnelle** : Si l'utilisateur fait référence à un élément précédent (ex: « le deuxième »), appuie-toi uniquement sur la liste produite au tour précédent dans l'historique récent sans inventer.`,
      `- **Pas de format rigide** : Réponds de façon fluide et naturelle, sans rubriques mécaniques ni listes stéréotypées sur l'état de tes sources, et ne renvoie jamais vers une ancienne tâche non demandée.`,
      `- **Honnêteté stricte** : N'invente jamais de souvenirs, de résultats web, d'URLs ou de dates. Explique honnêtement toute limite technique le cas échéant.`,
    ];

    if (data.isWebSearch) {
      sections.push(
        `\n### [RECHERCHE INTERNET RÉELLE]`,
        `- Utilise la recherche Web (Google Search Grounding) pour trouver des résultats réels et vérifiables.`,
        `- Pour chaque résultat pertinent : indique le **titre**, une **courte description**, la **source**, l'**URL complète** et la **date / date limite** si elle est disponible.`,
        `- Vérifie chaque date limite par rapport à aujourd'hui (${todayIso}) et signale explicitement si une opportunité est expirée ou si la date n'est pas confirmée.`,
        `- Si aucun résultat vérifiable n'est trouvé, dis-le clairement sans rien inventer.`
      );
    }

    if (data.isIdentityQuery) {
      sections.push(
        `\n### [IDENTITÉ & MÉMOIRE PERSONNELLE]`,
        `- Réponds directement à la question sur ce que tu sais de l'utilisateur en t'appuyant uniquement sur le profil et les souvenirs confirmés ci-dessous.`,
        `- Si aucun souvenir personnel n'est encore enregistré et que son prénom n'est pas connu, dis-le simplement et propose-lui de se présenter.`
      );
    }

    if (data.isMetaQuestion) {
      sections.push(
        `\n### [QUESTION MÉTA]`,
        `- Réponds directement et honnêtement à la remarque de l'utilisateur sans injecter de tâches ni de documents non demandés.`
      );
    }

    if (!hasPersonalContext) {
      if (!data.isWebSearch && !data.isIdentityQuery && !data.isMetaQuestion) {
        sections.push(
          `- **Question générale** : Aucun document, tâche ou profil personnel n'est nécessaire ici. Réponds de manière fluide et directe.`
        );
      }
      return sections.join('\n');
    }

    sections.push(`\n### [CONTEXTE UTILISATEUR PERTINENT]`);
    if (data.includePersonalProfile) {
      if (hasCustomName) {
        sections.push(
          `* **Prénom / Profil** : ${data.profile.name} (${data.profile.roleTitle})`
        );
      } else {
        sections.push(
          `* **Profil** : ${data.profile.name?.trim() || 'Étudiant'} (${data.profile.roleTitle}) — prénom personnel non encore renseigné`
        );
      }
      if (data.profile.currentObjective?.trim()) {
        sections.push(`* **Objectif déclaré** : ${data.profile.currentObjective}`);
      }
    }

    if (data.activeMemoriesBlock) {
      sections.push(`\n${data.activeMemoriesBlock}`);
    }

    if (data.goals.length > 0) {
      sections.push(`\n* **Objectifs associés** :`);
      data.goals.forEach((g) => {
        sections.push(
          `  - [Objectif #${g.id}] "${g.title}" (${g.progressPercentage}% complété)`
        );
      });
    }

    if (data.tasks.length > 0) {
      sections.push(`\n* **Tâches associées** :`);
      data.tasks.forEach((t) => {
        sections.push(
          `  - [Tâche #${t.id}] "${t.title}" | Échéance: ${t.dueDate} | Priorité: ${t.priority} | ${t.completed ? 'Fait' : 'À faire'}`
        );
      });
    }

    if (data.docs.length > 0) {
      sections.push(`\n* **Documents Knowledge** :`);
      data.docs.forEach((d) => {
        const excerpt = d.content ? d.content.trim().slice(0, 1200) : '';
        sections.push(
          `  - [Doc #${d.id}] "${d.title}" (${d.collection}) : ${d.summary}${excerpt ? `\n    Extrait : ${excerpt}` : ''}`
        );
      });
    }

    if (data.docs.length > 0 || data.tasks.length > 0 || data.goals.length > 0) {
      sections.push(
        `- **Faits établis** : Appuie-toi rigoureusement sur les éléments ci-dessus uniquement s'ils servent la question.`,
        `- **Déductions & Hypothèses** : Distingue clairement ce qui vient d'un document ou d'une tâche de ce qui relève d'une déduction.`,
        `- **Informations manquantes** : Si une donnée importante fait défaut, signale-le simplement sans extrapoler.`,
        `- **Traçabilité** : Cite expressément les identifiants de source (ex: [Doc #${data.docs[0]?.id || '...'}], [Tâche #${data.tasks[0]?.id || '...'}], [Objectif #${data.goals[0]?.id || '...'}]) uniquement lorsque tu utilises une information qui en provient.`
      );
    }

    return sections.join('\n');
  }

  private static getGreeting(name: string): string {
    const hour = new Date().getHours();
    const cleanName = name?.trim() || 'Étudiant';
    if (hour < 12) return `Bonjour ${cleanName}`;
    if (hour < 18) return `Bon après-midi ${cleanName}`;
    return `Bonsoir ${cleanName}`;
  }
}
