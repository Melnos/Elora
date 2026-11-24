import test from 'node:test';
import assert from 'node:assert';
import { ActionEngine } from '../../src/lib/actions/ActionEngine';
import type { ProposedAction, ActionExecutionContext } from '../../src/lib/actions/types';
import type { GoalItem, TaskItem, KnowledgeDoc, MemoryItem } from '../../src/types';

test('ActionEngine - Validation Stricte, Idempotence & Cycle de Vie (Phase 6)', async (t) => {
  const mockGoals: GoalItem[] = [
    {
      id: 'goal_prod',
      title: 'Lancement Production ELORA',
      category: 'Projet',
      targetDate: '2026-12-15',
      progressPercentage: 40,
      completed: false,
      milestones: [
        { id: 'm_auth', title: 'Auth & Firestore', completed: true },
        { id: 'm_engine', title: 'Context & Action Engine', completed: false },
      ],
    },
  ];

  const mockTasks: TaskItem[] = [];
  const mockDocs: KnowledgeDoc[] = [];
  const mockMemories: MemoryItem[] = [];

  const createContext = (overrides?: Partial<ActionExecutionContext>): ActionExecutionContext => ({
    userId: 'user_test_42',
    tasks: mockTasks,
    goals: mockGoals,
    docs: mockDocs,
    memories: mockMemories,
    onAddTask: (task) => {
      const id = `task_${Date.now()}`;
      mockTasks.push({ id, ...task });
      return id;
    },
    onToggleMilestone: (goalId, milestoneId) => {
      const g = mockGoals.find((goal) => goal.id === goalId);
      const m = g?.milestones.find((milestone) => milestone.id === milestoneId);
      if (m) m.completed = !m.completed;
    },
    onValidateMemory: (memoryId) => {
      const mem = mockMemories.find((m) => m.id === memoryId);
      if (mem) mem.status = 'active';
    },
    ...overrides,
  });

  await t.test('1. Validation stricte create_task : rejette les titres vides ou trop courts', () => {
    const invalidAction: ProposedAction = {
      id: 'act_invalid_1',
      type: 'create_task',
      title: 'Tâche vide',
      description: 'Test sans titre',
      payload: { title: '  ' },
      status: 'pending',
    };

    const res = ActionEngine.validate(invalidAction, { goals: mockGoals });
    assert.strictEqual(res.isValid, false);
    assert.ok(res.missingFields.includes('title'));
  });

  await t.test('2. Règle d\'or : Zéro échéance arbitraire J+2 hardcodée', () => {
    // Si l'utilisateur ne spécifie aucune date, dueDate reste undefined (pas de J+2 inventé)
    const actionWithoutDate: ProposedAction = {
      id: 'act_valid_nodate',
      type: 'create_task',
      title: 'Créer tâche sans date',
      description: 'Test sans date',
      payload: { title: 'Rédiger la documentation technique' },
      status: 'pending',
    };

    const res = ActionEngine.validate(actionWithoutDate, { goals: mockGoals });
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.sanitizedPayload?.dueDate, undefined, 'La date doit rester undefined et non J+2');

    // Test de l'extracteur : prompt sans date ne génère pas de J+2
    const extracted = ActionEngine.extractProactiveAction(
      'Ajoute une tâche pour tester les règles de sécurité',
      { goals: mockGoals }
    );
    assert.ok(extracted);
    assert.strictEqual(extracted?.payload.dueDate, undefined, 'L\'extracteur ne doit pas inventer de date');
  });

  await t.test('3. Rejet si goalId inexistant dans le contexte', () => {
    const actionBadGoal: ProposedAction = {
      id: 'act_bad_goal',
      type: 'create_task',
      title: 'Tâche avec mauvais goal',
      description: 'Liaison erronée',
      payload: {
        title: 'Tâche orpheline',
        goalId: 'goal_inexistant_999',
      },
      status: 'pending',
    };

    const res = ActionEngine.validate(actionBadGoal, { goals: mockGoals });
    assert.strictEqual(res.isValid, false);
    assert.ok(res.error?.includes('introuvable'));
  });

  await t.test('4. Exécution réussie et persistance vérifiée (statut accepted)', async () => {
    const validAction: ProposedAction = {
      id: 'act_exec_ok',
      type: 'create_task',
      title: 'Créer tâche valide',
      description: 'Ajout au planner',
      payload: {
        title: 'Mettre en place la surveillance des erreurs',
        priority: 'high',
        goalId: 'goal_prod',
      },
      status: 'pending',
    };

    const context = createContext();
    const result = await ActionEngine.execute(validAction, context);

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.status, 'accepted');
    assert.ok(mockTasks.some((t) => t.title === 'Mettre en place la surveillance des erreurs'));
  });

  await t.test('5. Protection anti-double-clic : deuxième appel refusé pendant l\'exécution', async () => {
    const slowAction: ProposedAction = {
      id: 'act_slow_1',
      type: 'create_task',
      title: 'Tâche concurrente',
      description: 'Simulation latence',
      payload: { title: 'Tâche asynchrone concurrente' },
      status: 'pending',
    };

    let executionStarted = false;
    const slowContext = createContext({
      onAddTask: async (task) => {
        executionStarted = true;
        // Pause simulée pour tester l'accès concurrent
        await new Promise((resolve) => setTimeout(resolve, 50));
        const id = `task_slow_${Date.now()}`;
        mockTasks.push({ id, ...task });
        return id;
      },
    });

    // Lancer la première exécution (asynchrone)
    const firstCallPromise = ActionEngine.execute(slowAction, slowContext);

    // Immédiatement lancer un second appel avec la même action
    const secondCall = await ActionEngine.execute(slowAction, slowContext);

    // Le second appel doit être bloqué par le verrou d'anti-double-clic
    assert.strictEqual(secondCall.success, false);
    assert.strictEqual(secondCall.status, 'executing');
    assert.ok(secondCall.errorMessage?.includes('déjà en cours'));

    // Attendre la fin du premier appel
    const firstResult = await firstCallPromise;
    assert.strictEqual(firstResult.success, true);
    assert.strictEqual(firstResult.status, 'accepted');
  });

  await t.test('6. Idempotence : action déjà accepted ne ré-exécute pas de mutation', async () => {
    const acceptedAction: ProposedAction = {
      id: 'act_already_done',
      type: 'create_task',
      title: 'Tâche déjà faite',
      description: 'Test idempotence',
      payload: { title: 'Ne pas dupliquer cette tâche' },
      status: 'accepted',
    };

    const initialTaskCount = mockTasks.length;
    const result = await ActionEngine.execute(acceptedAction, createContext());

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.status, 'accepted');
    assert.strictEqual(mockTasks.length, initialTaskCount, 'Aucune nouvelle tâche ne doit être créée');
  });

  await t.test('7. Gestion d\'échec de persistance : statut failed et message explicite sans altération fausse', async () => {
    const failingAction: ProposedAction = {
      id: 'act_failing',
      type: 'create_task',
      title: 'Tâche avec échec Firestore',
      description: 'Simulation Firestore unavailable',
      payload: { title: 'Tâche qui échoue' },
      status: 'pending',
    };

    const failingContext = createContext({
      onAddTask: () => {
        throw new Error('Firestore UNAVAILABLE: Quota dépassé ou réseau coupé');
      },
    });

    const result = await ActionEngine.execute(failingAction, failingContext);
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.status, 'failed');
    assert.ok(result.errorMessage?.includes('Firestore UNAVAILABLE'));
  });
});
