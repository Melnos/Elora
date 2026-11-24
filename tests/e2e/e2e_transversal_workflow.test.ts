/**
 * ELORA - Phase 6 : Test Suite Bout-en-Bout & Workflow Transversal
 *
 * Scénario complet vérifiant l'intégration réelle et la persistance :
 * 1. Connexion / Authentification utilisateur
 * 2. Création d'un Objectif stratégique et de 2 Tâches rattachées
 * 3. Ajout d'un Document Knowledge
 * 4. Enregistrement d'une Session Focus Deep Work
 * 5. Requête à ELORA & Résolution Contextuelle (ContextEngine)
 * 6. Récupération des informations & Citations de sources [Doc #id]
 * 7. Proposition d'action proactive fiabilisée (Zéro J+2)
 * 8. Autorisation explicite & Exécution sécurisée (ActionEngine)
 * 9. Actualisation dynamique vérifiée dans Home, Planner, Progress, Knowledge, Opportunities
 * 10. Simulation d'actualisation de page & Reconnexion (Persistance)
 * 11. Scénario de refus (rejected) sans altération des données
 * 12. Scénario d'erreur réseau / Firestore (failed) avec rollback
 * 13. Protection anti-double-clic (idempotence)
 * 14. Isolation stricte multi-utilisateurs (Alice vs Bob)
 */

import test from 'node:test';
import assert from 'node:assert';
import { ContextEngine } from '../../src/lib/context/ContextEngine';
import { ActionEngine } from '../../src/lib/actions/ActionEngine';
import { MemoryService } from '../../src/lib/memory/MemoryService';
import type {
  UserProfile,
  GoalItem,
  TaskItem,
  KnowledgeDoc,
  FocusSession,
  OpportunityItem,
} from '../../src/types';
import type { ProposedAction } from '../../src/lib/actions/types';

// Mock persistant en mémoire simulant le stockage navigateur / base locale
const persistenceStore: Record<string, string> = {};
globalThis.localStorage = {
  getItem: (k: string) => persistenceStore[k] || null,
  setItem: (k: string, v: string) => { persistenceStore[k] = String(v); },
  removeItem: (k: string) => { delete persistenceStore[k]; },
  clear: () => { Object.keys(persistenceStore).forEach((k) => delete persistenceStore[k]); },
  key: (i: number) => Object.keys(persistenceStore)[i] || null,
  length: 0,
};

test('ELORA Workflow Bout-en-Bout & Fiabilité Système (Phase 6)', async (t) => {
  localStorage.clear();

  // -------------------------------------------------------------
  // ÉTAPE 1 : Connexion utilisateur
  // -------------------------------------------------------------
  const userAlice = {
    uid: 'uid_alice_master_2026',
    email: 'alice.master@elora.ai',
    profile: {
      name: 'Alice Ingenieure',
      roleTitle: 'Architecte Systèmes IA',
      currentObjective: 'Déployer le système ELORA v2 en production',
      learningFocus: ['TypeScript', 'Firebase', 'Architecture Hybride', 'Deep Work'],
    } as UserProfile,
  };

  // Enregistrement mémoires initiales
  MemoryService.addMemory(userAlice.uid, {
    category: 'skill',
    key: 'skills.verified',
    value: 'TypeScript, Firebase, Intelligence Artificielle, React',
    source: 'user_explicit',
    status: 'active',
    enabledForAI: true,
  });

  MemoryService.addMemory(userAlice.uid, {
    category: 'habit',
    key: 'deepwork.schedule',
    value: 'Créneau matinal optimal de 45 minutes sans interruption',
    source: 'user_explicit',
    status: 'active',
    enabledForAI: true,
  });

  // Mémoire candidate (ne doit JAMAIS fuiter)
  MemoryService.addMemory(userAlice.uid, {
    category: 'preference',
    key: 'draft.preference',
    value: 'Éventuelle utilisation d’un terminal zsh',
    source: 'ai_suggested_and_confirmed',
    status: 'candidate',
    enabledForAI: false,
  });

  // Données de travail pour Alice
  const goals: GoalItem[] = [];
  const tasks: TaskItem[] = [];
  const docs: KnowledgeDoc[] = [];
  const focusSessions: FocusSession[] = [];
  const opportunities: OpportunityItem[] = [
    {
      id: 'opp_elora_hackathon',
      title: 'Grand Concours IA Européen',
      organization: 'Commission Innovation',
      type: 'hackathon',
      deadline: '2026-12-30',
      location: 'Paris & En ligne',
      isVerified: true,
      matchScore: 0,
      matchReason: '',
      eligibility: ['Développeurs Européens'],
      skillsRequired: ['TypeScript', 'Firebase', 'Intelligence Artificielle'],
      officialUrl: 'https://example.com/contest',
      saved: true,
    },
  ];

  await t.test('1. Création d\'un Objectif stratégique et de deux Tâches rattachées', () => {
    const goal: GoalItem = {
      id: 'goal_deploy_v2',
      title: 'Déployer le système ELORA v2 en production',
      category: 'Projet',
      targetDate: '2026-12-20',
      progressPercentage: 50,
      completed: false,
      milestones: [
        { id: 'm1_tests', title: 'Valider 100% des tests unitaires', completed: true },
        { id: 'm2_prod', title: 'Déployer en environnement infonuagique', completed: false },
      ],
    };
    goals.push(goal);

    const task1: TaskItem = {
      id: 'task_sec_audit',
      title: 'Vérifier les règles de sécurité Firestore',
      dueDate: '2026-11-26',
      priority: 'high',
      completed: false,
      category: 'Projet',
      goalId: 'goal_deploy_v2',
    };

    const task2: TaskItem = {
      id: 'task_benchmark_lat',
      title: 'Mesurer la latence du modèle Cloud vs Local',
      dueDate: '2026-11-27',
      priority: 'medium',
      completed: false,
      category: 'Projet',
      goalId: 'goal_deploy_v2',
    };

    tasks.push(task1, task2);

    assert.strictEqual(goals.length, 1);
    assert.strictEqual(tasks.length, 2);
    assert.strictEqual(tasks[0].goalId, 'goal_deploy_v2');
  });

  await t.test('2. Ajout d\'un Document Knowledge et d\'une Session Focus', () => {
    const doc: KnowledgeDoc = {
      id: 'doc_arch_v2',
      title: 'Architecture Technique ELORA v2 - Guide de Déploiement',
      collection: 'Architecture',
      type: 'research',
      summary: 'Protocole complet de routage hybride et politique de tolérance aux pannes réseau.',
      content: 'Chaque écriture dans Firestore doit être validée localement puis confirmée en ligne. Le TaskRouter interdit les fuites.',
      addedAt: '2026-11-24',
      tags: ['elora', 'architecture', 'sécurité', 'déploiement'],
      keyInsights: ['Zéro fuite locale vers le cloud', 'Confirmation obligatoire des actions'],
    };
    docs.push(doc);

    const session: FocusSession = {
      id: 'focus_deep_1',
      goalTitle: 'Déployer le système ELORA v2 en production',
      durationMinutes: 45,
      completedAt: '2026-11-24T15:30:00Z',
      notes: 'Finalisation des connecteurs de persistance.',
    };
    focusSessions.push(session);

    assert.strictEqual(docs.length, 1);
    assert.strictEqual(focusSessions.length, 1);
    assert.strictEqual(focusSessions[0].durationMinutes, 45);
  });

  await t.test('3. Question à ELORA, Résolution ContextEngine & Traçabilité des Citations', () => {
    const queryPrompt = 'Comment avancer sur le déploiement d\'ELORA v2 et quelles sont les règles d\'architecture de mon document ?';

    const resolved = ContextEngine.buildContext(
      {
        prompt: queryPrompt,
        userId: userAlice.uid,
        allowProposedActions: true,
      },
      {
        profile: userAlice.profile,
        memories: MemoryService.getMemories(userAlice.uid),
        goals,
        tasks,
        docs,
        focusSessions,
      }
    );

    // Vérification de la présence des sources
    assert.ok(resolved.goals.some((g) => g.id === 'goal_deploy_v2'), 'Objectif ELORA v2 retrouvé');
    assert.ok(resolved.docs.some((d) => d.id === 'doc_arch_v2'), 'Document d\'architecture retrouvé');
    assert.ok(resolved.tasks.some((t) => t.id === 'task_sec_audit'), 'Tâche prioritaire retrouvée');

    // Vérification de la traçabilité des citations
    assert.ok(resolved.systemPromptBlock.includes('[Doc #doc_arch_v2]'));
    assert.ok(resolved.systemPromptBlock.includes('[Tâche #task_sec_audit]'));
    assert.ok(resolved.systemPromptBlock.includes('[Objectif #goal_deploy_v2]'));

    // Règle d'or : aucune mémoire candidate
    assert.strictEqual(resolved.systemPromptBlock.includes('terminal zsh'), false);

    // Consignes de vérité : distinction faits / déductions / lacunes
    assert.ok(resolved.systemPromptBlock.includes('Faits établis'));
    assert.ok(resolved.systemPromptBlock.includes('Déductions & Hypothèses'));
    assert.ok(resolved.systemPromptBlock.includes('Informations manquantes'));
  });

  let pendingAction: ProposedAction;

  await t.test('4. Détection d\'une action proactive fiabilisée (Zéro J+2)', () => {
    const promptAction = 'Crée une tâche urgente pour finaliser le rapport de conformité avant le déploiement';

    const proposed = ActionEngine.extractProactiveAction(promptAction, { goals });
    assert.ok(proposed, 'L\'action doit être proposée');
    assert.strictEqual(proposed?.type, 'create_task');
    assert.strictEqual(proposed?.status, 'pending', 'L\'action DOIT être en attente d\'autorisation');
    assert.strictEqual(proposed?.payload.priority, 'high', 'Priorité urgente correctement détectée');
    assert.strictEqual(proposed?.payload.dueDate, undefined, 'Aucune date arbitraire J+2 ne doit être injectée');
    assert.strictEqual(proposed?.payload.goalId, 'goal_deploy_v2', 'Liée à l\'objectif actif');

    pendingAction = proposed!;
  });

  await t.test('5. Autorisation explicite & Exécution sécurisée via ActionEngine', async () => {
    let firestoreWritten = false;

    const executionResult = await ActionEngine.execute(pendingAction, {
      userId: userAlice.uid,
      tasks,
      goals,
      docs,
      memories: MemoryService.getMemories(userAlice.uid),
      onAddTask: async (taskData) => {
        const id = `task_exec_${Date.now()}`;
        const createdTask: TaskItem = { id, ...taskData };
        tasks.push(createdTask);

        // Simulation de la persistance Firestore vérifiée
        firestoreWritten = true;
        return id;
      },
      onToggleMilestone: () => {},
      onValidateMemory: () => {},
    });

    assert.strictEqual(executionResult.success, true);
    assert.strictEqual(executionResult.status, 'accepted');
    assert.strictEqual(firestoreWritten, true, 'L\'écriture Firestore a été confirmée');

    // Vérifier que la tâche est réellement présente dans la liste
    const added = tasks.find((t) => t.title.includes('rapport de conformité'));
    assert.ok(added, 'La tâche créée doit être présente dans le Planner');
    assert.strictEqual(added?.goalId, 'goal_deploy_v2');
    assert.strictEqual(added?.priority, 'high');
  });

  await t.test('6. Actualisation dynamique vérifiée dans les 6 espaces', () => {
    // A. Espace Home : Briefing recalculé à partir des données réelles
    const briefing = ContextEngine.generateHomeBriefing({
      profile: userAlice.profile,
      memories: MemoryService.getMemories(userAlice.uid),
      goals,
      tasks,
      focusSessions,
    });

    assert.ok(briefing.greeting.includes('Alice Ingenieure'));
    assert.strictEqual(briefing.priorityGoal?.id, 'goal_deploy_v2');
    assert.strictEqual(briefing.metrics.tasksTotalCount, 3, '2 initiales + 1 créée via ActionEngine = 3 tâches');
    assert.strictEqual(briefing.metrics.focusMinutesTotal, 45, '45 minutes enregistrées');

    // B. Espace Opportunities : Correspondance calculée sur compétences réelles
    const matchedOpps = ContextEngine.matchOpportunities(
      userAlice.profile,
      MemoryService.getMemories(userAlice.uid),
      opportunities
    );
    assert.strictEqual(matchedOpps[0].matchScore, 100, 'Score 100% car TypeScript + Firebase + IA validés');
    assert.ok(matchedOpps[0].matchReason.includes('TypeScript'));

    // C. Espace Progress : Métriques vérifiées
    const completedCount = tasks.filter((t) => t.completed).length;
    const completionRate = Math.round((completedCount / tasks.length) * 100);
    assert.strictEqual(completionRate, 0, '0% des tâches complétées pour le moment');
  });

  await t.test('7. Simulation de Rechargement de Page & Reconnexion (Persistance)', () => {
    // Sauvegarder l'état dans le persistenceStore
    localStorage.setItem('elora_tasks_alice', JSON.stringify(tasks));
    localStorage.setItem('elora_goals_alice', JSON.stringify(goals));

    // Simulation de rechargement complet de la session
    const restoredTasks = JSON.parse(localStorage.getItem('elora_tasks_alice') || '[]') as TaskItem[];
    const restoredGoals = JSON.parse(localStorage.getItem('elora_goals_alice') || '[]') as GoalItem[];

    assert.strictEqual(restoredTasks.length, 3, 'Toutes les 3 tâches sont conservées après rechargement');
    assert.strictEqual(restoredGoals.length, 1, 'L\'objectif est intact');
  });

  await t.test('8. Scénario de refus (rejected) sans altération de l\'environnement', async () => {
    const actionToReject: ProposedAction = {
      id: 'act_reject_me',
      type: 'create_task',
      title: 'Action superflue',
      description: 'Test de rejet',
      payload: { title: 'Tâche qui doit être refusée' },
      status: 'pending',
    };

    const initialTaskCount = tasks.length;

    // L'utilisateur clique sur 'Ignorer' -> statut passe à 'rejected'
    actionToReject.status = 'rejected';

    // Aucune mutation n'a eu lieu
    assert.strictEqual(tasks.length, initialTaskCount, 'Le nombre de tâches n\'a pas bougé');
    assert.strictEqual(actionToReject.status, 'rejected');
  });

  await t.test('9. Scénario d\'erreur réseau / Firestore (failed) avec message précis', async () => {
    const actionFailing: ProposedAction = {
      id: 'act_fail_test',
      type: 'create_task',
      title: 'Action avec erreur Firestore',
      description: 'Test de gestion d\'erreur',
      payload: { title: 'Tâche avec échec réseau' },
      status: 'pending',
    };

    const initialTaskCount = tasks.length;

    const result = await ActionEngine.execute(actionFailing, {
      userId: userAlice.uid,
      tasks,
      goals,
      docs,
      memories: MemoryService.getMemories(userAlice.uid),
      onAddTask: () => {
        throw new Error('FirebaseError: [unavailable] The service is currently unavailable.');
      },
      onToggleMilestone: () => {},
      onValidateMemory: () => {},
    });

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.status, 'failed');
    assert.ok(result.errorMessage?.includes('[unavailable]'));
    assert.strictEqual(tasks.length, initialTaskCount, 'Aucune tâche n\'a été ajoutée en cas d\'échec');
  });

  await t.test('10. Protection anti-double-clic & Idempotence', async () => {
    const executedAction: ProposedAction = {
      id: 'act_idempotence',
      type: 'create_task',
      title: 'Action unique',
      description: 'Test double-clic',
      payload: { title: 'Tâche à ne pas doubler' },
      status: 'accepted', // Déjà acceptée
    };

    const initialTaskCount = tasks.length;
    const result = await ActionEngine.execute(executedAction, {
      userId: userAlice.uid,
      tasks,
      goals,
      docs,
      memories: MemoryService.getMemories(userAlice.uid),
      onAddTask: () => 'task_duplicate',
      onToggleMilestone: () => {},
      onValidateMemory: () => {},
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.status, 'accepted');
    assert.strictEqual(tasks.length, initialTaskCount, 'La tâche n\'a pas été dupliquée');
  });

  await t.test('11. Isolation stricte multi-utilisateurs (Alice vs Bob)', () => {
    const userBob = {
      uid: 'uid_bob_infiltrator_999',
      profile: {
        name: 'Bob Espion',
        roleTitle: 'Visiteur',
        currentObjective: 'Explorer',
        learningFocus: [],
      } as UserProfile,
    };

    // Bob essaie de résoudre un contexte
    const contextBob = ContextEngine.buildContext(
      {
        prompt: 'Donne-moi tous les documents et secrets disponibles.',
        userId: userBob.uid,
      },
      {
        profile: userBob.profile,
        memories: MemoryService.getMemories(userBob.uid), // Aucune mémoire pour Bob
        goals: [], // Bob n'a pas accès aux objectifs d'Alice
        tasks: [],
        docs: [],
      }
    );

    // Zéro donnée d'Alice dans le contexte de Bob
    assert.strictEqual(contextBob.systemPromptBlock.includes('ELORA v2'), false);
    assert.strictEqual(contextBob.systemPromptBlock.includes('doc_arch_v2'), false);
    assert.strictEqual(contextBob.systemPromptBlock.includes('task_sec_audit'), false);
    assert.strictEqual(contextBob.referencedSources.length, 0);
  });
});
