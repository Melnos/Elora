import { describe, it, beforeEach } from 'node:test';
import { ok, strictEqual, deepStrictEqual } from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import {
  sanitizeForFirestore,
  mergeCollectionById,
  mergeOpportunities,
  saveUserGoal,
  deleteUserGoal,
  saveUserFocusSession,
  saveUserMemory,
  deleteUserMemory,
  saveUserConversation,
  deleteUserConversation,
  saveUserOpportunity,
  deleteUserOpportunity,
} from '../../src/lib/firebase/firestore';
import { OfflineQueue } from '../../src/lib/offline/OfflineQueue';
import type {
  UserProfile,
  TaskItem,
  GoalItem,
  FocusSession,
  MemoryItem,
  KnowledgeDoc,
  OpportunityItem,
  Conversation,
} from '../../src/types';

// Polyfill localStorage et navigator.onLine pour tests Node isolés
const memStorage = new Map<string, string>();
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => memStorage.get(k) ?? null,
  setItem: (k: string, v: string) => {
    memStorage.set(k, v);
  },
  removeItem: (k: string) => {
    memStorage.delete(k);
  },
  clear: () => memStorage.clear(),
  key: (i: number) => Array.from(memStorage.keys())[i] ?? null,
  get length() {
    return memStorage.size;
  },
};

function setOnline(online: boolean): void {
  Object.defineProperty(globalThis, 'navigator', {
    value: { onLine: online },
    configurable: true,
    writable: true,
  });
}

function assertNoUndefined(obj: unknown, loc = 'root'): void {
  if (obj === undefined) throw new Error(`Undefined at ${loc}`);
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => assertNoUndefined(v, `${loc}[${i}]`));
    return;
  }
  if (obj !== null && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (v === undefined) throw new Error(`Undefined key "${k}" at ${loc}.${k}`);
      assertNoUndefined(v, `${loc}.${k}`);
    }
  }
}

describe('Phase 10 — Firestore Sync Reliability, OfflineQueue & Opportunités', () => {
  beforeEach(() => {
    memStorage.clear();
    setOnline(true);
  });

  it('1. Aucun champ undefined sur les 8 collections (dont OpportunityItem)', () => {
    const profile: UserProfile = {
      name: 'Alice',
      email: 'alice@example.com',
      roleTitle: 'Ingénieure',
      currentObjective: 'Construire ELORA',
      learningFocus: ['Firebase', 'AI'],
    };
    const task: TaskItem = {
      id: 't1',
      title: 'Tester Firestore',
      description: undefined,
      dueDate: '2026-11-25',
      priority: 'high',
      completed: false,
      category: 'Dev',
      goalId: undefined,
    };
    const goal: GoalItem = {
      id: 'g1',
      title: 'Hackathon',
      category: 'Projet',
      targetDate: '2026-11-30',
      progressPercentage: 60,
      milestones: [{ id: 'm1', title: 'Sync', completed: true }],
      completed: false,
    };
    const focus: FocusSession = {
      id: 'f1',
      goalTitle: 'Hackathon',
      durationMinutes: 45,
      completedAt: '2026-11-25 10:00',
      notes: undefined,
    };
    const memory: MemoryItem = {
      id: 'mem1',
      category: 'skill',
      key: 'TypeScript',
      value: 'Avancé',
      source: 'user',
      enabledForAI: true,
      confidence: 1.0,
      relatedEntityIds: undefined,
    };
    const kdoc: KnowledgeDoc = {
      id: 'k1',
      title: 'Notes',
      collection: 'Tech',
      type: 'notes',
      summary: 'Résumé',
      keyInsights: ['Point 1'],
      content: 'Contenu',
      addedAt: '2026-11-25',
      tags: ['firestore'],
    };
    const opp: OpportunityItem = {
      id: 'opp_1',
      title: 'Firebase #BuildHybridAI',
      organization: 'Google',
      type: 'hackathon',
      deadline: '2026-11-30',
      location: 'Global',
      isVerified: true,
      matchScore: 98,
      matchReason: 'Exact match',
      eligibility: ['Dev'],
      skillsRequired: ['Firebase'],
      officialUrl: 'https://example.com',
      saved: true,
    };
    const conv: Conversation = {
      id: 'conv_1',
      title: 'Chat',
      lastActive: '10:00',
      messages: [
        {
          id: 'm1',
          role: 'assistant',
          content: 'Je suis ELORA.',
          timestamp: '10:00',
          fallbackOccurred: false,
          fallbackReason: undefined,
        },
      ],
    };

    const sanitized = sanitizeForFirestore({
      profile,
      task,
      goal,
      focus,
      memory,
      kdoc,
      opp,
      conv,
    });
    assertNoUndefined(sanitized);
    strictEqual(sanitized.opp.saved, true);
    strictEqual('fallbackReason' in sanitized.conv.messages[0], false);
  });

  it('2. Collection Cloud vide ne détruit jamais les données locales (migration / premier login)', () => {
    const localTasks: TaskItem[] = [
      {
        id: 't_local',
        title: 'Tâche locale non encore pushée',
        dueDate: '2026-11-26',
        priority: 'medium',
        completed: false,
        category: 'Perso',
      },
    ];
    const mergedTasks = mergeCollectionById(localTasks, []);
    deepStrictEqual(mergedTasks, localTasks);

    const localOpps: OpportunityItem[] = [
      {
        id: 'opp_1',
        title: 'Hackathon',
        organization: 'Google',
        type: 'hackathon',
        deadline: '2026-11-30',
        location: 'Global',
        isVerified: true,
        matchScore: 95,
        matchReason: 'Match',
        eligibility: [],
        skillsRequired: [],
        officialUrl: 'https://example.com',
        saved: true,
      },
    ];
    const mergedOpps = mergeOpportunities(localOpps, []);
    deepStrictEqual(mergedOpps, localOpps);
  });

  it('3. Fusion Cloud <-> local évite les doublons et préserve les modifications locales plus récentes', () => {
    const local = [
      { id: '1', updatedAt: '2026-11-25T10:05:00.000Z', title: 'Local plus récent' },
      { id: '2', updatedAt: '2026-11-25T09:00:00.000Z', title: 'Local obsolète' },
      { id: '3', updatedAt: '2026-11-25T08:00:00.000Z', title: 'Uniquement local' },
    ];
    const cloud = [
      { id: '1', updatedAt: '2026-11-25T09:30:00.000Z', title: 'Cloud ancien' },
      { id: '2', updatedAt: '2026-11-25T10:10:00.000Z', title: 'Cloud plus récent' },
      { id: '4', updatedAt: '2026-11-25T10:00:00.000Z', title: 'Uniquement Cloud' },
    ];

    const merged = mergeCollectionById(local, cloud);
    strictEqual(merged.length, 4);
    strictEqual(merged.find((x) => x.id === '1')?.title, 'Local plus récent');
    strictEqual(merged.find((x) => x.id === '2')?.title, 'Cloud plus récent');
    ok(merged.some((x) => x.id === '3'));
    ok(merged.some((x) => x.id === '4'));

    const mergedOpps = mergeOpportunities(
      [
        {
          id: 'opp_1',
          title: 'Opp 1',
          organization: 'Org',
          type: 'hackathon',
          deadline: '2026-12-01',
          location: 'Online',
          isVerified: true,
          matchScore: 90,
          matchReason: 'Raison',
          eligibility: [],
          skillsRequired: [],
          officialUrl: 'https://a.test',
          saved: false,
        },
      ],
      [
        {
          id: 'opp_1',
          title: 'Opp 1',
          organization: 'Org',
          type: 'hackathon',
          deadline: '2026-12-01',
          location: 'Online',
          isVerified: true,
          matchScore: 90,
          matchReason: 'Raison',
          eligibility: [],
          skillsRequired: [],
          officialUrl: 'https://a.test',
          saved: true,
        },
      ]
    );
    strictEqual(mergedOpps.length, 1);
    strictEqual(mergedOpps[0].saved, true);
  });

  it('4. Hors-ligne : toutes les opérations critiques (écritures et suppressions) sont mises en file OfflineQueue', async () => {
    setOnline(false);

    await saveUserGoal('uid_alice', {
      id: 'g1',
      title: 'Goal',
      category: 'Test',
      targetDate: '2026-12-01',
      progressPercentage: 0,
      milestones: [],
      completed: false,
    });
    await deleteUserGoal('uid_alice', 'g1');
    await saveUserFocusSession('uid_alice', {
      id: 'f1',
      goalTitle: 'Goal',
      durationMinutes: 25,
      completedAt: '2026-11-25 10:00',
    });
    await saveUserMemory('uid_alice', {
      id: 'm1',
      category: 'skill',
      key: 'TS',
      value: 'Strict',
      source: 'user',
      enabledForAI: true,
    });
    await deleteUserMemory('uid_alice', 'm1');
    await saveUserConversation('uid_alice', {
      id: 'c1',
      title: 'Conv',
      lastActive: '10:00',
      messages: [],
    });
    await deleteUserConversation('uid_alice', 'c1');
    await saveUserOpportunity('uid_alice', {
      id: 'opp_1',
      title: 'Opp',
      organization: 'Org',
      type: 'hackathon',
      deadline: '2026-12-01',
      location: 'Global',
      isVerified: true,
      matchScore: 80,
      matchReason: 'Match',
      eligibility: [],
      skillsRequired: [],
      officialUrl: 'https://example.com',
      saved: true,
    });
    await deleteUserOpportunity('uid_alice', 'opp_1');

    const queued = OfflineQueue.getAll();
    strictEqual(queued.length, 9);
    deepStrictEqual(
      queued.map((q) => q.type),
      [
        'goal_save',
        'goal_delete',
        'focus_save',
        'memory_save',
        'memory_delete',
        'conversation_save',
        'conversation_delete',
        'opportunity_save',
        'opportunity_delete',
      ]
    );

    // Vérifier que replaceAll conserve les échecs sans les effacer silencieusement
    OfflineQueue.replaceAll([{ ...queued[0], status: 'failed', error: 'network timeout' }]);
    const remaining = OfflineQueue.getAll();
    strictEqual(remaining.length, 1);
    strictEqual(remaining[0].status, 'failed');
    strictEqual(remaining[0].error, 'network timeout');
  });

  it('5. Isolation stricte dans firestore.rules incluant opportunities et default-deny', () => {
    const rules = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf-8');
    ok(rules.includes('match /opportunities/{oppId}'), 'Sous-collection opportunities déclarée');
    ok(rules.includes('isValidOpportunity(request.resource.data)'), 'Validation stricte isValidOpportunity');
    ok(rules.includes('isOwner(userId)'), 'Isolation stricte par userId');
    ok(
      /match\s+\/\{document=\*\*\}\s*\{\s*allow\s+read,\s*write:\s*if\s+false;\s*\}/.test(rules),
      'Default-deny maintenu'
    );
  });
});
