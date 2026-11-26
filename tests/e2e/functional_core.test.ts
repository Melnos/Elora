import { describe, it, beforeEach } from 'node:test';
import { ok, strictEqual } from 'node:assert';

const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => {
    store.set(k, v);
  },
  removeItem: (k: string) => {
    store.delete(k);
  },
  clear: () => {
    store.clear();
  },
};
(globalThis as any).window = { localStorage: (globalThis as any).localStorage };

import {
  buildOpportunitySearchPrompt,
  extractOpportunitiesFromWebResponse,
  deduplicateOpportunities,
  isOpportunityExpired,
} from '../../src/lib/opportunities/opportunityExtractor';
import { EloraDB } from '../../src/lib/db/database';
import { ActionEngine } from '../../src/lib/actions/ActionEngine';

describe('Cœur Fonctionnel ELORA — Connexion des 6 Espaces', () => {
  beforeEach(() => {
    store.clear();
  });

  it('1. Opportunités : recherche adaptée sans profil complet, anti-expiration, anti-doublon et persistance', () => {
    const prompt = buildOpportunitySearchPrompt(
      'hackathons robotique et web',
      { name: 'Étudiant', roleTitle: 'Étudiant(e)', currentObjective: '', learningFocus: [] },
      [],
      []
    );
    ok(prompt.includes('hackathons robotique et web'));
    ok(prompt.includes('Google Search Grounding'));

    const today = '2026-11-26';
    strictEqual(isOpportunityExpired('2026-10-01', today), true);
    strictEqual(isOpportunityExpired('2026-12-15', today), false);

    const modelText = [
      'Voici les résultats :',
      '```json',
      JSON.stringify([
        {
          title: 'Hackathon Robotique Afrique',
          organization: 'Tech Benin',
          type: 'hackathon',
          deadline: '2026-12-20',
          location: 'Cotonou / Hybride',
          eligibility: ['Étudiants'],
          skillsRequired: ['Robotique', 'Web'],
          matchReason: 'Correspond à votre recherche',
          officialUrl: 'https://example.org/hackathon-benin?utm_source=test',
        },
        {
          title: 'Ancien Concours Expiré',
          organization: 'Old Org',
          type: 'competition',
          deadline: '2025-01-10',
          officialUrl: 'https://example.org/expired',
        },
        {
          title: 'URL Inventée Hors Grounding',
          organization: 'Fake',
          type: 'program',
          deadline: '2026-12-30',
          officialUrl: 'https://invented-domain.test/fake',
        },
      ]),
      '```',
    ].join('\n');

    const extracted = extractOpportunitiesFromWebResponse(
      modelText,
      [
        { title: 'Hackathon Robotique Afrique', url: 'https://example.org/hackathon-benin' },
        { title: 'Ancien Concours Expiré', url: 'https://example.org/expired' },
      ],
      today
    );

    strictEqual(extracted.length, 1, 'Seule l’opportunité valide non expirée et issue du grounding doit être retenue');
    strictEqual(extracted[0].title, 'Hackathon Robotique Afrique');

    // Persistance + déduplication
    const firstAdd = EloraDB.addOpportunities(extracted);
    strictEqual(firstAdd.added.length, 1);
    strictEqual(EloraDB.getOpportunities().length, 1);

    const secondAdd = EloraDB.addOpportunities(extracted);
    strictEqual(secondAdd.added.length, 0, 'Aucun doublon ne doit être ajouté');
    strictEqual(EloraDB.getOpportunities().length, 1);

    const dedup = deduplicateOpportunities(EloraDB.getOpportunities(), [
      { ...firstAdd.added[0], id: 'other_id', officialUrl: 'https://example.org/hackathon-benin/' },
    ]);
    strictEqual(dedup.added.length, 0);
  });

  it('2. ActionEngine : update_task, delete_task, update_goal et save_opportunity après confirmation explicite', async () => {
    const task = EloraDB.addTask({
      title: 'Préparer dossier bourse',
      dueDate: '2026-12-10',
      priority: 'medium',
      completed: false,
      category: 'Projet',
    });

    const goal = {
      id: 'goal_1',
      title: 'Obtenir une bourse',
      category: 'Carrière',
      targetDate: '2027-01-15',
      progressPercentage: 20,
      milestones: [],
      completed: false,
    };
    EloraDB.saveGoals([goal]);

    let updatedTaskCalled = false;
    let deletedTaskCalled = false;
    let updatedGoalCalled = false;
    let savedOppCalled = false;

    const ctx = {
      tasks: EloraDB.getTasks(),
      goals: EloraDB.getGoals(),
      docs: [],
      memories: [],
      onAddTask: async () => 't_new',
      onUpdateTask: async (taskId: string, updates: any) => {
        updatedTaskCalled = true;
        EloraDB.updateTask(taskId, updates);
      },
      onDeleteTask: async (taskId: string) => {
        deletedTaskCalled = true;
        EloraDB.deleteTask(taskId);
      },
      onToggleMilestone: async () => {},
      onUpdateGoal: async (goalId: string, updates: any) => {
        updatedGoalCalled = true;
        EloraDB.updateGoal(goalId, updates);
      },
      onValidateMemory: async () => {},
      onSaveOpportunity: async (opp: any) => {
        savedOppCalled = true;
        const res = EloraDB.addOpportunities([opp], true);
        return res.added[0]?.id || 'dup';
      },
    };

    const resUpdateTask = await ActionEngine.execute(
      {
        id: 'act_ut',
        type: 'update_task',
        title: 'Terminer tâche',
        description: 'Valider',
        payload: { taskId: task.id, completed: true },
        status: 'pending',
      },
      ctx
    );
    strictEqual(resUpdateTask.success, true);
    strictEqual(updatedTaskCalled, true);
    strictEqual(EloraDB.getTasks()[0].completed, true);

    const resUpdateGoal = await ActionEngine.execute(
      {
        id: 'act_ug',
        type: 'update_goal',
        title: 'Mettre à jour objectif',
        description: 'MAJ',
        payload: { goalId: goal.id, title: 'Obtenir bourse excellence' },
        status: 'pending',
      },
      ctx
    );
    strictEqual(resUpdateGoal.success, true);
    strictEqual(updatedGoalCalled, true);
    strictEqual(EloraDB.getGoals()[0].title, 'Obtenir bourse excellence');

    const resSaveOpp = await ActionEngine.execute(
      {
        id: 'act_opp',
        type: 'save_opportunity',
        title: 'Enregistrer opportunité',
        description: 'Web',
        payload: {
          title: 'Bourse Tech 2026',
          organization: 'Fondation',
          type: 'scholarship',
          deadline: '2026-12-30',
          officialUrl: 'https://example.org/bourse',
        },
        status: 'pending',
      },
      ctx
    );
    strictEqual(resSaveOpp.success, true);
    strictEqual(savedOppCalled, true);
    strictEqual(EloraDB.getOpportunities().length, 1);

    const proactiveDelete = ActionEngine.extractProactiveAction(
      'Supprime la tâche Préparer dossier bourse',
      { goals: EloraDB.getGoals(), tasks: EloraDB.getTasks() }
    );
    ok(proactiveDelete);
    strictEqual(proactiveDelete!.type, 'delete_task');
    strictEqual(proactiveDelete!.isDestructive, true);

    const resDeleteTask = await ActionEngine.execute(proactiveDelete!, ctx);
    strictEqual(resDeleteTask.success, true);
    strictEqual(deletedTaskCalled, true);
    strictEqual(EloraDB.getTasks().length, 0);
  });
});
