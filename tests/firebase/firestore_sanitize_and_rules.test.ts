import { describe, it } from 'node:test';
import { ok, strictEqual } from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import { sanitizeForFirestore } from '../../src/lib/firebase/firestore';
import type { Conversation, TaskItem, FocusSession, MemoryItem } from '../../src/types';

function assertNoUndefinedDeep(val: unknown, currentPath = 'root'): void {
  if (val === undefined) {
    throw new Error(`Found undefined at ${currentPath}`);
  }
  if (Array.isArray(val)) {
    val.forEach((item, idx) => assertNoUndefinedDeep(item, `${currentPath}[${idx}]`));
    return;
  }
  if (val !== null && typeof val === 'object') {
    const proto = Object.getPrototypeOf(val);
    if (proto === Object.prototype || proto === null) {
      for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
        if (v === undefined) {
          throw new Error(`Found undefined key "${k}" at ${currentPath}.${k}`);
        }
        assertNoUndefinedDeep(v, `${currentPath}.${k}`);
      }
    }
  }
}

describe('Firestore Sanitization & Security Rules', () => {
  it('1. sanitizeForFirestore supprime tous les champs undefined (racine, messages, sources, proposedActions)', () => {
    const conv: Conversation = {
      id: 'conv_1',
      title: 'Session ELORA',
      lastActive: '08:30',
      messages: [
        {
          id: 'msg_1',
          role: 'assistant',
          content: 'Je suis ELORA.',
          timestamp: '08:30',
          inferenceSource: undefined,
          modelName: 'Gemini 3.5 Flash Lite (Firebase AI Logic Cloud)',
          durationMs: 0,
          fallbackOccurred: false,
          fallbackReason: undefined,
          sources: [
            {
              id: 'doc_1',
              type: 'doc',
              title: 'Architecture',
              category: undefined,
              snippet: undefined,
            },
          ],
          proposedActions: [
            {
              id: 'act_1',
              type: 'create_task',
              title: 'Finaliser Firestore',
              description: 'Nettoyer undefined',
              payload: { title: 'Finaliser Firestore', goalId: undefined },
              status: 'pending',
              errorMessage: undefined,
              missingFields: undefined,
              isDestructive: false,
              executedAt: undefined,
            },
          ],
        },
      ],
    };

    const cleaned = sanitizeForFirestore(conv);
    assertNoUndefinedDeep(cleaned);

    const msg = cleaned.messages[0];
    strictEqual('fallbackReason' in msg, false);
    strictEqual('inferenceSource' in msg, false);
    strictEqual(msg.fallbackOccurred, false);
    strictEqual(msg.durationMs, 0);
    strictEqual(msg.content, 'Je suis ELORA.');

    strictEqual('snippet' in msg.sources![0], false);
    strictEqual('category' in msg.sources![0], false);
    strictEqual('errorMessage' in msg.proposedActions![0], false);
    strictEqual('goalId' in msg.proposedActions![0].payload, false);
    strictEqual(msg.proposedActions![0].isDestructive, false);
  });

  it('2. sanitizeForFirestore préserve null, false, 0, chaînes vides et instances Date sur Task/Focus/Memory', () => {
    const task: TaskItem = {
      id: 't_1',
      title: '',
      description: undefined,
      dueDate: '',
      priority: 'low',
      completed: false,
      category: 'Test',
      goalId: undefined,
    };
    const focus: FocusSession = {
      id: 'f_1',
      goalTitle: 'Objectif',
      durationMinutes: 0,
      completedAt: '2026-11-25T08:30:00Z',
      notes: undefined,
    };
    const memory: MemoryItem = {
      id: 'm_1',
      category: 'skill',
      key: 'TypeScript',
      value: 'Strict',
      source: 'user',
      enabledForAI: false,
      confidence: undefined,
      relatedEntityIds: undefined,
    };

    const cTask = sanitizeForFirestore(task);
    const cFocus = sanitizeForFirestore(focus);
    const cMem = sanitizeForFirestore(memory);

    const cExtra = sanitizeForFirestore({ nullable: null, created: new Date(0), arr: [1, undefined, 2] });

    assertNoUndefinedDeep({ cTask, cFocus, cMem, cExtra });
    strictEqual(cExtra.arr.length, 2);
    strictEqual(cExtra.nullable, null);
    strictEqual(cTask.completed, false);
    strictEqual(cTask.title, '');
    strictEqual('description' in cTask, false);
    strictEqual('goalId' in cTask, false);
    strictEqual(cFocus.durationMinutes, 0);
    strictEqual('notes' in cFocus, false);
    strictEqual(cMem.enabledForAI, false);
    strictEqual('confidence' in cMem, false);
  });

  it('3. Audit statique firestore.rules : isolation stricte isOwner(userId) et default-deny', () => {
    const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
    ok(fs.existsSync(rulesPath), 'firestore.rules doit exister');
    const rules = fs.readFileSync(rulesPath, 'utf-8');

    ok(rules.includes('request.auth != null && request.auth.uid != null'), 'isAuthenticated requis');
    ok(rules.includes('request.auth.uid == userId'), 'isOwner(userId) requis');
    ok(!/allow\s+read,\s*write:\s*if\s+true/.test(rules), 'Aucune règle publique permissive');
    ok(
      /match\s+\/\{document=\*\*\}\s*\{\s*allow\s+read,\s*write:\s*if\s+false;\s*\}/.test(rules),
      'Règle default-deny obligatoire'
    );

    const requiredCollections = [
      'profile',
      'memories',
      'tasks',
      'goals',
      'focusSessions',
      'knowledgeDocs',
      'knowledge',
      'conversations',
    ];
    for (const col of requiredCollections) {
      ok(rules.includes(`match /${col}/`), `Collection ${col} protégée dans firestore.rules`);
    }
  });
});
