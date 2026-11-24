import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { MemoryService } from '../../src/lib/memory/MemoryService';

// Polyfill localStorage pour Node si absent
if (typeof localStorage === 'undefined') {
  const store = new Map<string, string>();
  global.localStorage = {
    getItem: (key: string) => store.get(key) || null,
    setItem: (key: string, value: string) => store.set(key, String(value)),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    key: (idx: number) => Array.from(store.keys())[idx] || null,
    length: 0,
  } as Storage;
}

describe('MemoryService - Isolation, Cycle de Vie et Contexte IA', () => {
  const userA = 'user_alpha_123';
  const userB = 'user_beta_456';

  beforeEach(() => {
    localStorage.clear();
  });

  it('Garantit une isolation stricte des mémoires entre utilisateurs différents', () => {
    MemoryService.addMemory(userA, {
      category: 'project',
      key: 'hackathon.target',
      value: 'Firebase #BuildHybridAI',
    });

    MemoryService.addMemory(userB, {
      category: 'project',
      key: 'secret.company',
      value: 'Projet Confidentiel Entreprise B',
    });

    const memoriesA = MemoryService.getAll(userA);
    const memoriesB = MemoryService.getAll(userB);

    assert.strictEqual(memoriesA.length, 1);
    assert.strictEqual(memoriesB.length, 1);
    assert.strictEqual(memoriesA[0].value, 'Firebase #BuildHybridAI');
    assert.strictEqual(memoriesB[0].value, 'Projet Confidentiel Entreprise B');

    // Vérification de non-contamination croisée
    assert.ok(!memoriesA.some((m) => m.value.includes('Entreprise B')));
    assert.ok(!memoriesB.some((m) => m.value.includes('BuildHybridAI')));
  });

  it('Une proposition de l\'IA a le statut "candidate" et n\'est JAMAIS injectée dans le contexte IA avant confirmation', () => {
    MemoryService.proposeCandidate(userA, {
      category: 'habit',
      key: 'focus.peak_hours',
      value: 'Préfère coder le matin entre 8h et 11h',
      justification: 'Mentionné dans la conversation sur le planning',
    });

    const allMemories = MemoryService.getAll(userA);
    assert.strictEqual(allMemories.length, 1);
    assert.strictEqual(allMemories[0].status, 'candidate');
    assert.strictEqual(allMemories[0].enabledForAI, false);

    // Vérification de l'absence dans le prompt système
    const context = MemoryService.getActiveContextForAI(userA);
    assert.strictEqual(context.itemCount, 0);
    assert.strictEqual(context.systemContextBlock, '', 'Les faits candidats non validés ne doivent pas polluer l\'IA');
  });

  it('La confirmation d\'une mémoire candidate l\'active et l\'injecte dans le contexte IA', () => {
    const candidate = MemoryService.proposeCandidate(userA, {
      category: 'preference',
      key: 'code.style',
      value: 'Préfère TypeScript strict et fonctions pures',
      justification: 'Observé dans les extraits de code joints',
    });

    const confirmed = MemoryService.confirmCandidate(userA, candidate.id);
    assert.ok(confirmed);
    assert.strictEqual(confirmed?.status, 'active');
    assert.strictEqual(confirmed?.enabledForAI, true);

    const context = MemoryService.getActiveContextForAI(userA);
    assert.strictEqual(context.itemCount, 1);
    assert.match(context.systemContextBlock, /TypeScript strict/);
    assert.match(context.systemContextBlock, /Préférences de Travail & Apprentissage/);
  });

  it('Permet à l\'utilisateur de modifier ou supprimer n\'importe quelle mémoire', () => {
    const mem = MemoryService.addMemory(userA, {
      category: 'objective',
      key: 'objective.current',
      value: 'Phase 1 MVP',
    });

    // Modification
    const updated = MemoryService.updateMemory(userA, mem.id, {
      value: 'Phase 2 Architecture Cœur Technique',
    });
    assert.strictEqual(updated?.value, 'Phase 2 Architecture Cœur Technique');

    // Suppression
    const deleted = MemoryService.deleteMemory(userA, mem.id);
    assert.strictEqual(deleted, true);
    assert.strictEqual(MemoryService.getAll(userA).length, 0);
  });
});
