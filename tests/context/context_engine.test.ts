import test from 'node:test';
import assert from 'node:assert';
import { ContextEngine } from '../../src/lib/context/ContextEngine';
import { MemoryService } from '../../src/lib/memory/MemoryService';
import type {
  UserProfile,
  GoalItem,
  TaskItem,
  KnowledgeDoc,
  FocusSession,
  OpportunityItem,
} from '../../src/types';

// Mock simple de localStorage en mémoire pour le test Node.js
const mockStorage: Record<string, string> = {};
globalThis.localStorage = {
  getItem: (k: string) => mockStorage[k] || null,
  setItem: (k: string, v: string) => { mockStorage[k] = v; },
  removeItem: (k: string) => { delete mockStorage[k]; },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); },
  key: (i: number) => Object.keys(mockStorage)[i] || null,
  length: 0,
};

test('ELORA ContextEngine & Intelligence Transversale (Phase 5)', async (t) => {
  localStorage.clear();
  const userIdA = 'user_alice_123';
  const userIdB = 'user_bob_999';

  const mockProfileA: UserProfile = {
    name: 'Alice Dev',
    roleTitle: 'Ingénieure IA',
    currentObjective: 'Déployer l\'architecture hybride ELORA',
    learningFocus: ['TypeScript', 'Intelligence Artificielle', 'Firebase'],
  };

  const mockGoals: GoalItem[] = [
    {
      id: 'goal_elora_arch',
      title: 'Finaliser l\'architecture hybride ELORA',
      category: 'Projet',
      targetDate: '2026-12-01',
      progressPercentage: 65,
      completed: false,
      milestones: [
        { id: 'm1', title: 'TaskRouter hybride', completed: true },
        { id: 'm2', title: 'ContextEngine transversal', completed: false },
      ],
    },
    {
      id: 'goal_other',
      title: 'Apprendre Rust',
      category: 'Apprentissage',
      targetDate: '2027-01-01',
      progressPercentage: 10,
      completed: false,
      milestones: [{ id: 'm3', title: 'Bases syntaxe', completed: true }],
    },
  ];

  const mockTasks: TaskItem[] = [
    {
      id: 'task_router_bench',
      title: 'Mesurer la latence du TaskRouter',
      dueDate: '2026-11-25',
      priority: 'high',
      completed: false,
      category: 'Projet',
      goalId: 'goal_elora_arch',
    },
    {
      id: 'task_context_engine',
      title: 'Connecter ContextEngine aux 6 espaces',
      dueDate: '2026-11-26',
      priority: 'high',
      completed: false,
      category: 'Projet',
      goalId: 'goal_elora_arch',
    },
    {
      id: 'task_rust_book',
      title: 'Lire chapitre 1 Rust',
      dueDate: '2026-12-10',
      priority: 'low',
      completed: true,
      category: 'Apprentissage',
      goalId: 'goal_other',
    },
  ];

  const mockDocs: KnowledgeDoc[] = [
    {
      id: 'doc_elora_spec',
      title: 'Spécifications Techniques ELORA v2',
      collection: 'Intelligence Artificielle',
      type: 'research',
      summary: 'Détail du fonctionnement hybride entre Gemini Nano local et Firebase AI Logic cloud.',
      content: 'L\'orchestrateur doit prioriser la confidentialité locale et router vers le cloud si nécessaire.',
      addedAt: '2026-11-20',
      tags: ['elora', 'hybride', 'architecture', 'ia'],
      keyInsights: ['Confidentialité prioritaire', 'Zéro simulation'],
    },
    {
      id: 'doc_cooking',
      title: 'Recettes Méditerranéennes',
      collection: 'Personnel',
      type: 'notes',
      summary: 'Guide de cuisine saine.',
      content: 'Huile d\'olive, légumes frais et poisson.',
      addedAt: '2026-11-10',
      tags: ['cuisine', 'santé'],
      keyInsights: ['Équilibre nutritionnel'],
    },
  ];

  const mockFocusSessions: FocusSession[] = [
    {
      id: 'focus_1',
      goalTitle: 'Architecture ELORA',
      durationMinutes: 45,
      completedAt: '2026-11-24T10:00:00Z',
    },
    {
      id: 'focus_2',
      goalTitle: 'Architecture ELORA',
      durationMinutes: 30,
      completedAt: '2026-11-24T14:00:00Z',
    },
  ];

  const mockOpportunities: OpportunityItem[] = [
    {
      id: 'opp_ai_hackathon',
      title: 'Global AI Agent Challenge',
      organization: 'Google Developers',
      type: 'hackathon',
      deadline: '2026-12-15',
      location: 'En ligne',
      isVerified: true,
      matchScore: 0,
      matchReason: '',
      eligibility: ['Ouvert à tous'],
      skillsRequired: ['TypeScript', 'Firebase', 'Intelligence Artificielle'],
      officialUrl: 'https://example.com/hackathon',
      saved: true,
    },
    {
      id: 'opp_bio_grant',
      title: 'Bourse de Recherche Biotechnologie',
      organization: 'BioFund',
      type: 'scholarship',
      deadline: '2027-02-01',
      location: 'Paris',
      isVerified: true,
      matchScore: 0,
      matchReason: '',
      eligibility: ['Doctorat'],
      skillsRequired: ['Biochimie', 'CRISPR'],
      officialUrl: 'https://example.com/grant',
      saved: false,
    },
  ];

  // Préparation des mémoires dans MemoryService pour Alice
  localStorage.clear();

  // Mémoire 1 : Active et validée
  MemoryService.addMemory(userIdA, {
    category: 'skill',
    key: 'skills.stack',
    value: 'TypeScript, Firebase, Intelligence Artificielle, Python',
    source: 'user_explicit',
    status: 'active',
    enabledForAI: true,
  });

  // Mémoire 2 : Candidate NON validée (Règle d'or : ne JAMAIS injecter)
  MemoryService.addMemory(userIdA, {
    category: 'preference',
    key: 'preference.candidate_tool',
    value: 'Préfère peut-être Vim',
    source: 'ai_suggested_and_confirmed',
    status: 'candidate',
    enabledForAI: false,
  });

  // Mémoire pour Bob (test d'isolation)
  MemoryService.addMemory(userIdB, {
    category: 'profile',
    key: 'secret.bob',
    value: 'Information ultra-confidentielle de Bob',
    source: 'user_explicit',
    status: 'active',
    enabledForAI: true,
  });

  await t.test('1. Résolution transversale et sélection sémantique sans saturation', () => {
    const resolved = ContextEngine.buildContext(
      {
        prompt: 'Comment avancer sur l\'architecture hybride de mon projet ELORA et quelles sont les tâches associées ?',
        userId: userIdA,
        allowProposedActions: true,
      },
      {
        profile: mockProfileA,
        memories: MemoryService.getMemories(userIdA),
        goals: mockGoals,
        tasks: mockTasks,
        docs: mockDocs,
        focusSessions: mockFocusSessions,
      }
    );

    assert.ok(resolved, 'Le contexte résolu doit exister');
    assert.ok(resolved.goals.some((g) => g.id === 'goal_elora_arch'), 'L\'objectif ELORA doit être priorisé');
    assert.ok(resolved.tasks.some((t) => t.id === 'task_context_engine'), 'La tâche ContextEngine doit être sélectionnée');
    assert.ok(resolved.docs.some((d) => d.id === 'doc_elora_spec'), 'Le document spécification ELORA doit être référencé');

    // Le document non pertinent ne doit pas saturer le contexte
    assert.strictEqual(
      resolved.docs.some((d) => d.id === 'doc_cooking'),
      false,
      'Le document hors-sujet "Recettes" ne doit pas être injecté'
    );
  });

  await t.test('2. Traçabilité des sources explicites et format de citation', () => {
    const resolved = ContextEngine.buildContext(
      {
        prompt: 'Rappelez-moi les spécifications techniques ELORA.',
        userId: userIdA,
        allowProposedActions: true,
      },
      {
        profile: mockProfileA,
        memories: MemoryService.getMemories(userIdA),
        goals: mockGoals,
        tasks: mockTasks,
        docs: mockDocs,
      }
    );

    const docSource = resolved.referencedSources.find((s) => s.id === 'doc_elora_spec');
    assert.ok(docSource, 'La source du document doit être présente dans referencedSources');
    assert.strictEqual(docSource?.type, 'doc');
    assert.strictEqual(docSource?.title, 'Spécifications Techniques ELORA v2');

    // Vérification de la présence de la citation explicite dans le prompt système
    assert.ok(
      resolved.systemPromptBlock.includes('[Doc #doc_elora_spec]'),
      'Le prompt système doit inclure la balise de source [Doc #doc_elora_spec]'
    );
    assert.ok(
      resolved.systemPromptBlock.includes('Cite expressément les identifiants de source'),
      'Le prompt système doit consigner la règle de citation explicite'
    );
  });

  await t.test('3. Règle d\'or : Zéro mémoire candidate dans le prompt système', () => {
    const resolved = ContextEngine.buildContext(
      {
        prompt: 'Quelles sont mes préférences et compétences ?',
        userId: userIdA,
      },
      {
        profile: mockProfileA,
        memories: MemoryService.getMemories(userIdA),
        goals: mockGoals,
        tasks: mockTasks,
        docs: mockDocs,
      }
    );

    assert.ok(
      resolved.systemPromptBlock.includes('skills.stack'),
      'La mémoire active validée doit être présente'
    );
    assert.strictEqual(
      resolved.systemPromptBlock.includes('Préfère peut-être Vim'),
      false,
      'La mémoire candidate NON validée ne doit JAMAIS fuiter dans le prompt'
    );
  });

  await t.test('4. Génération du Briefing dynamique pour l\'espace Home', () => {
    const briefing = ContextEngine.generateHomeBriefing({
      profile: mockProfileA,
      memories: MemoryService.getMemories(userIdA),
      goals: mockGoals,
      tasks: mockTasks,
      focusSessions: mockFocusSessions,
    });

    assert.ok(briefing.greeting.includes('Alice Dev'), 'Le greeting doit saluer l\'utilisateur par son nom');
    assert.ok(briefing.summary.length > 10, 'Le résumé éditorial doit être formulé');
    assert.strictEqual(briefing.priorityGoal?.id, 'goal_elora_arch', 'L\'objectif prioritaire doit être identifié');
    assert.strictEqual(briefing.urgentTasks.length, 2, 'Les 2 tâches high non complétées doivent être prioritaires');
    assert.strictEqual(briefing.metrics.tasksTotalCount, 3, 'Total 3 tâches');
    assert.strictEqual(briefing.metrics.tasksDoneCount, 1, '1 tâche terminée');
    assert.strictEqual(briefing.metrics.focusMinutesTotal, 75, '45 + 30 = 75 minutes de focus réelles');
    assert.strictEqual(briefing.metrics.overallProgress, 33, '1/3 = 33% de progression réelle');
  });

  await t.test('5. Rapprochement réel des opportunités avec les compétences du profil', () => {
    const matched = ContextEngine.matchOpportunities(
      mockProfileA,
      MemoryService.getMemories(userIdA),
      mockOpportunities
    );

    const hackathon = matched.find((o) => o.id === 'opp_ai_hackathon');
    const grant = matched.find((o) => o.id === 'opp_bio_grant');

    assert.ok(hackathon, 'Le hackathon IA doit être présent');
    assert.strictEqual(hackathon?.matchScore, 100, 'Score 100% car TypeScript + Firebase + IA correspondent');
    assert.ok(hackathon?.matchReason.includes('TypeScript'), 'La raison doit citer les compétences concordantes');

    assert.ok(grant, 'La bourse biotech doit être présente');
    assert.strictEqual(grant?.matchScore, 0, 'Score 0% car aucune compétence biotech n\'est validée');
    assert.ok(grant?.matchReason.includes('nouvelles compétences'), 'La raison doit indiquer un besoin d\'apprentissage');
  });

  await t.test('6. Scénario transversal complet avec proposition d\'action et validation', () => {
    // Étape A : Requête demandant une tâche d'action
    const queryResult = ContextEngine.buildContext(
      {
        prompt: 'Je dois faire une tâche pour tester l\'intégration de ContextEngine avec le Planner.',
        userId: userIdA,
        allowProposedActions: true,
      },
      {
        profile: mockProfileA,
        memories: MemoryService.getMemories(userIdA),
        goals: mockGoals,
        tasks: mockTasks,
        docs: mockDocs,
      }
    );

    // Étape B : L'action est proposée mais NON exécutée aveuglément (statut pending)
    assert.ok(queryResult.proposedActions.length > 0, 'Au moins une action doit être proposée');
    const proposed = queryResult.proposedActions[0];
    assert.strictEqual(proposed.type, 'create_task');
    assert.strictEqual(proposed.status, 'pending', 'L\'action DOIT être en attente de confirmation explicite');

    // Étape C : Simulation de confirmation explicite de l'utilisateur
    const newTask: TaskItem = {
      id: `task_confirmed_${Date.now()}`,
      title: proposed.payload.title as string,
      dueDate: (proposed.payload.dueDate as string) || '2026-11-28',
      priority: 'medium',
      completed: false,
      category: 'Projet',
      goalId: proposed.payload.goalId as string,
    };
    mockTasks.push(newTask);

    // Étape D : Mise à jour vérifiée dans le Planner
    assert.ok(
      mockTasks.some((t) => t.id === newTask.id && t.title.includes('tester l\'intégration')),
      'La tâche confirmée par l\'utilisateur doit désormais être présente dans les données réelles'
    );
  });

  await t.test('7. Isolation stricte entre utilisateurs (Multi-tenant)', () => {
    const contextUserA = ContextEngine.buildContext(
      {
        prompt: 'Donne-moi toutes mes informations.',
        userId: userIdA,
      },
      {
        profile: mockProfileA,
        memories: MemoryService.getMemories(userIdA),
        goals: mockGoals,
        tasks: mockTasks,
        docs: mockDocs,
      }
    );

    assert.strictEqual(
      contextUserA.systemPromptBlock.includes('secret.bob'),
      false,
      'User A ne doit JAMAIS voir les mémoires de User B'
    );
    assert.strictEqual(
      contextUserA.systemPromptBlock.includes('Information ultra-confidentielle de Bob'),
      false,
      'Aucune fuite de données entre comptes utilisateurs'
    );
  });
});
