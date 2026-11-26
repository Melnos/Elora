import { describe, it, beforeEach } from 'node:test';
import { ok, strictEqual } from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';

const store = new Map<string, string>();
let failWrites = false;

(globalThis as any).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => {
    if (failWrites) {
      throw new Error('QuotaExceededError');
    }
    store.set(k, v);
  },
  removeItem: (k: string) => {
    store.delete(k);
  },
  clear: () => {
    store.clear();
  },
};
(globalThis as any).window = {
  localStorage: (globalThis as any).localStorage,
};

import { MemoryService } from '../../src/lib/memory/MemoryService';
import { ContextEngine } from '../../src/lib/context/ContextEngine';
import { ActionEngine } from '../../src/lib/actions/ActionEngine';
import { EloraDB } from '../../src/lib/db/database';

const ROOT = process.cwd();

describe('Phase 4 — Mémoire Personnelle Fiable & Isolée', () => {
  beforeEach(() => {
    failWrites = false;
    store.clear();
  });

  it('1. Isolation stricte entre deux utilisateurs (user_A vs user_B)', () => {
    const memA = MemoryService.addMemory('user_A', {
      category: 'project',
      key: 'Projet de fin d’études',
      value: 'Application de révision de droit',
    });
    ok(memA, 'Mémoire user_A créée');

    const memB = MemoryService.addMemory('user_B', {
      category: 'objective',
      key: 'Objectif',
      value: 'Réussir le concours médecine',
    });
    ok(memB, 'Mémoire user_B créée');

    const listA = MemoryService.getMemories('user_A');
    const listB = MemoryService.getMemories('user_B');

    strictEqual(listA.length, 1);
    strictEqual(listB.length, 1);
    strictEqual(listA[0].value, 'Application de révision de droit');
    strictEqual(listB[0].value, 'Réussir le concours médecine');

    const ctxB = MemoryService.getActiveContextForAI('user_B', 'Parle-moi de mon projet');
    ok(!ctxB.systemContextBlock.includes('droit'), 'Le contexte de user_B ne doit jamais contenir les souvenirs de user_A');
  });

  it('2. Cycle complet : proposition (hypothèse), confirmation, modification, suppression et persistance', () => {
    const cand = MemoryService.proposeCandidate('user_1', {
      category: 'preference',
      key: "Préférence d'apprentissage",
      value: 'Exemples concrets et fiches synthétiques',
      justification: 'Préférence exprimée par l’étudiant.',
    });
    ok(cand, 'Candidat proposé');
    strictEqual(cand!.status, 'candidate');
    strictEqual(cand!.enabledForAI, false);

    // Une hypothèse non confirmée ne doit PAS être injectée dans le prompt IA
    const beforeConfirm = MemoryService.getActiveContextForAI('user_1');
    strictEqual(beforeConfirm.itemCount, 0);

    // Confirmation explicite
    const confirmed = MemoryService.confirmCandidate('user_1', cand!.id);
    ok(confirmed, 'Candidat confirmé');
    strictEqual(confirmed!.status, 'active');
    strictEqual(confirmed!.enabledForAI, true);

    const afterConfirm = MemoryService.getActiveContextForAI('user_1');
    strictEqual(afterConfirm.itemCount, 1);
    ok(afterConfirm.systemContextBlock.includes('fiches synthétiques'));

    // Modification / correction
    const updated = MemoryService.updateMemory('user_1', cand!.id, {
      value: 'Fiches synthétiques avec schémas',
      status: 'temporary',
    });
    ok(updated);
    strictEqual(updated!.status, 'temporary');
    strictEqual(updated!.value, 'Fiches synthétiques avec schémas');

    // Persistance après "rechargement" (nouvelle lecture depuis localStorage)
    const reloaded = MemoryService.getMemories('user_1');
    strictEqual(reloaded.length, 1);
    strictEqual(reloaded[0].value, 'Fiches synthétiques avec schémas');
    strictEqual(reloaded[0].status, 'temporary');

    // Suppression
    const deleted = MemoryService.deleteMemory('user_1', cand!.id);
    strictEqual(deleted, true);
    strictEqual(MemoryService.getMemories('user_1').length, 0);
  });

  it('3. Connexion réelle à ContextEngine : extraction étudiante, proposition validate_memory et zéro contamination', () => {
    const ctx = ContextEngine.buildContext(
      {
        prompt: "Je suis en L3 informatique et je préfère des explications avec des schémas simples.",
        userId: 'student_42',
        allowProposedActions: true,
      },
      {
        profile: {
          name: 'Camille',
          roleTitle: 'Étudiante',
          currentObjective: 'Valider le semestre',
          learningFocus: ['Algorithmique'],
        },
        memories: [],
        goals: [],
        tasks: [],
        docs: [],
      }
    );

    const memActions = ctx.proposedActions.filter((a) => a.type === 'validate_memory');
    ok(memActions.length >= 1, 'ContextEngine doit proposer une action validate_memory');

    // Le candidat est en statut 'candidate' tant qu'il n'est pas confirmé
    const candidates = MemoryService.getMemories('student_42', { status: 'candidate' });
    ok(candidates.length >= 1);
    strictEqual(candidates[0].enabledForAI, false);

    // Vérifier qu'une question générique n'active pas de personnalisation via hackathon/elora/ecogen
    const genericCtx = ContextEngine.buildContext(
      {
        prompt: 'Explique-moi ce que signifie hackathon ou ecogen dans un texte général.',
        userId: 'student_42',
      },
      {
        profile: {
          name: 'Camille',
          roleTitle: 'Étudiante',
          currentObjective: 'Valider le semestre',
          learningFocus: [],
        },
        memories: [],
        goals: [],
        tasks: [],
        docs: [],
      }
    );
    ok(!genericCtx.systemPromptBlock.includes('### [CONTEXTE UTILISATEUR PERTINENT'));

    const contextEngineSrc = fs.readFileSync(
      path.join(ROOT, 'src/lib/context/ContextEngine.ts'),
      'utf-8'
    );
    ok(!contextEngineSrc.includes('hackathon|elora|ecogen'), 'Plus de règle résiduelle hackathon|elora|ecogen');
    ok(!contextEngineSrc.includes('le hackathon'), 'Plus de mention résiduelle du hackathon dans le prompt générique');
  });

  it('4. Migration non destructive des anciennes mémoires et honnêteté en cas d’échec de persistance', async () => {
    // Simuler d'anciennes données dans elora_db_memories
    store.set(
      'elora_db_memories',
      JSON.stringify([
        {
          id: 'legacy_1',
          category: 'habit',
          key: 'Créneau',
          value: 'Travail le matin',
          source: 'user_explicit',
          enabledForAI: true,
        },
      ])
    );

    const migrated = EloraDB.getMemories('user_legacy');
    strictEqual(migrated.length, 1);
    strictEqual(migrated[0].id, 'legacy_1');
    strictEqual(migrated[0].userId, 'user_legacy');

    // Échec de persistance simulé : ne jamais annoncer que c'est enregistré
    failWrites = true;
    const failedAdd = MemoryService.addMemory('user_legacy', {
      category: 'context',
      key: 'Test échec',
      value: 'Ne doit pas prétendre réussir',
    });
    strictEqual(failedAdd, null);

    const execResult = await ActionEngine.execute(
      {
        id: 'act_fail',
        type: 'validate_memory',
        title: 'Mémoriser',
        description: 'Test',
        payload: { memoryId: 'missing_id' },
        status: 'pending',
      },
      {
        userId: 'user_legacy',
        tasks: [],
        goals: [],
        docs: [],
        memories: [],
        onAddTask: async () => 't1',
        onToggleMilestone: async () => {},
        onValidateMemory: async () => {
          throw new Error('Échec écriture stockage');
        },
      }
    );
    strictEqual(execResult.success, false);
    strictEqual(execResult.status, 'failed');
  });
});
