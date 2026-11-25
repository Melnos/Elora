import { describe, it } from 'node:test';
import { ok, strictEqual } from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import { ContextEngine } from '../../src/lib/context/ContextEngine';
import { MemoryService } from '../../src/lib/memory/MemoryService';
import type { UserProfile, GoalItem, TaskItem, KnowledgeDoc, MemoryItem } from '../../src/types';

// Polyfill localStorage pour MemoryService en Node
const memStore = new Map<string, string>();
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => memStore.get(k) ?? null,
  setItem: (k: string, v: string) => { memStore.set(k, v); },
  removeItem: (k: string) => { memStore.delete(k); },
  clear: () => memStore.clear(),
  key: (i: number) => Array.from(memStore.keys())[i] ?? null,
  get length() { return memStore.size; },
};

const sampleProfile: UserProfile = {
  name: 'Djima',
  email: 'djima@example.com',
  roleTitle: 'Ingénieur',
  currentObjective: 'Finaliser ECOGEN et le Hackathon #BuildHybridAI',
  learningFocus: ['Firebase', 'Gemini Nano'],
};

const sampleGoals: GoalItem[] = [
  {
    id: 'goal_ecogen',
    title: 'Déployer ECOGEN pour le Hackathon',
    category: 'Projet',
    targetDate: '2026-11-30',
    progressPercentage: 70,
    milestones: [{ id: 'm1', title: 'Démo', completed: false }],
    completed: false,
  },
];

const sampleTasks: TaskItem[] = [
  {
    id: 'task_ecogen',
    title: 'Préparer la présentation ECOGEN',
    dueDate: '2026-11-26',
    priority: 'high',
    completed: false,
    category: 'Hackathon',
    goalId: 'goal_ecogen',
  },
];

const sampleDocs: KnowledgeDoc[] = [
  {
    id: 'doc_ecogen',
    title: 'Spécification ECOGEN',
    collection: 'Projets',
    type: 'pdf',
    summary: 'Architecture énergétique ECOGEN',
    keyInsights: ['Capteurs basse consommation'],
    content: 'ECOGEN optimise la consommation énergétique des bâtiments connectés.',
    addedAt: '2026-11-20',
    tags: ['ecogen', 'energie'],
  },
  {
    id: 'doc_rtos',
    title: 'Notes FreeRTOS',
    collection: 'Systèmes',
    type: 'notes',
    summary: 'Ordonnancement temps réel sur microcontrôleur',
    keyInsights: ['Tâches temps réel'],
    content: 'FreeRTOS est un noyau temps réel pour microcontrôleurs STM32 et ESP32.',
    addedAt: '2026-11-22',
    tags: ['freertos', 'microcontroleur'],
  },
];

describe('Phase 16 — Pertinence Contextuelle & Continuité Conversationnelle', () => {
  const userId = 'uid_phase16';

  it('A. Question générale sans injection de contexte personnel inutile', () => {
    memStore.clear();
    MemoryService.addMemory(userId, {
      category: 'project',
      key: 'projet.principal',
      value: 'ECOGEN Hackathon',
      enabledForAI: true,
      source: 'user_explicit',
    });

    const resolved = ContextEngine.buildContext(
      { prompt: 'Explique-moi ce qu\'est un système embarqué.', userId },
      {
        profile: sampleProfile,
        memories: MemoryService.getMemories(userId) as unknown as MemoryItem[],
        goals: sampleGoals,
        tasks: sampleTasks,
        docs: sampleDocs,
      }
    );

    strictEqual(resolved.goals.length, 0);
    strictEqual(resolved.tasks.length, 0);
    strictEqual(resolved.docs.length, 0);
    strictEqual(resolved.referencedSources.length, 0);
    ok(!resolved.systemPromptBlock.includes('ECOGEN'), 'ECOGEN ne doit pas être injecté sur une question générale');
    ok(!resolved.systemPromptBlock.includes('Hackathon'), 'Hackathon ne doit pas être injecté');
    ok(resolved.systemPromptBlock.includes('Question générale'));
  });

  it('B. Question liée à un document : récupération pertinente du document ciblé uniquement', () => {
    const resolved = ContextEngine.buildContext(
      { prompt: 'Que disent mes notes sur FreeRTOS et ESP32 ?', userId },
      {
        profile: sampleProfile,
        memories: [],
        goals: sampleGoals,
        tasks: sampleTasks,
        docs: sampleDocs,
      }
    );

    ok(resolved.docs.some((d) => d.id === 'doc_rtos'), 'doc_rtos doit être sélectionné');
    ok(!resolved.docs.some((d) => d.id === 'doc_ecogen'), 'doc_ecogen non pertinent doit être exclu');
    ok(resolved.systemPromptBlock.includes('FreeRTOS'));
    ok(resolved.referencedSources.some((s) => s.id === 'doc_rtos'));
  });

  it('C. Conversation en deux tours avec référence au deuxième élément d\'une liste', () => {
    const resolvedTurn2 = ContextEngine.buildContext(
      { prompt: 'Donne-moi trois exemples et explique le deuxième plus en détail.', userId },
      {
        profile: sampleProfile,
        memories: [],
        goals: sampleGoals,
        tasks: sampleTasks,
        docs: sampleDocs,
      }
    );

    strictEqual(resolvedTurn2.goals.length, 0);
    strictEqual(resolvedTurn2.tasks.length, 0);
    strictEqual(resolvedTurn2.docs.length, 0);
    ok(!resolvedTurn2.systemPromptBlock.includes('ECOGEN'));
    ok(resolvedTurn2.systemPromptBlock.includes('Continuité conversationnelle'));
    ok(resolvedTurn2.systemPromptBlock.includes('le deuxième'));

    const appCtx = fs.readFileSync(path.resolve(process.cwd(), 'src/context/AppContext.tsx'), 'utf-8');
    ok(appCtx.includes('HISTORIQUE RÉCENT DE LA CONVERSATION'), 'AppContext injecte l\'historique réel du tour 1');
    ok(appCtx.includes("m.id !== 'msg_1' && m.id !== 'msg_2'"), 'Les messages démo initiaux sont exclus');
  });

  it('D. Question générale alors que des documents et tâches personnels existent', () => {
    const resolved = ContextEngine.buildContext(
      { prompt: 'Quelle est la différence entre HTTP et WebSocket ?', userId },
      {
        profile: sampleProfile,
        memories: [],
        goals: sampleGoals,
        tasks: sampleTasks,
        docs: sampleDocs,
      }
    );

    strictEqual(resolved.referencedSources.length, 0);
    ok(!resolved.systemPromptBlock.includes('Spécification ECOGEN'));
    ok(!resolved.systemPromptBlock.includes('Préparer la présentation ECOGEN'));
  });

  it('E. Demande explicite de personnalisation : injecte le profil, objectifs et tâches', () => {
    const resolved = ContextEngine.buildContext(
      { prompt: 'Adapte ce plan d\'action à mon profil et mes objectifs actuels.', userId },
      {
        profile: sampleProfile,
        memories: [],
        goals: sampleGoals,
        tasks: sampleTasks,
        docs: sampleDocs,
      }
    );

    ok(resolved.goals.some((g) => g.id === 'goal_ecogen'));
    ok(resolved.tasks.some((t) => t.id === 'task_ecogen'));
    ok(resolved.systemPromptBlock.includes('Djima'));
    ok(resolved.systemPromptBlock.includes('ECOGEN'));
  });
});
