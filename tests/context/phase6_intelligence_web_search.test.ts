import { describe, it, beforeEach } from 'node:test';
import { ok, strictEqual } from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';

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

import { ContextEngine } from '../../src/lib/context/ContextEngine';
import { MemoryService } from '../../src/lib/memory/MemoryService';
import { TaskRouter } from '../../src/lib/ai/TaskRouter';
import type { CapabilityReport } from '../../src/lib/ai/types';

const ROOT = process.cwd();

const ECOGEN_DATASET = {
  profile: {
    name: 'Étudiant',
    roleTitle: 'Étudiant',
    currentObjective: '',
    learningFocus: [],
  },
  memories: [],
  goals: [
    {
      id: 'goal_ecogen',
      title: 'Lancer le prototype ECOGEN au hackathon',
      category: 'Projet',
      targetDate: '2026-06-01',
      progressPercentage: 40,
      milestones: [],
      completed: false,
    },
  ],
  tasks: [
    {
      id: 'task_ecogen',
      title: 'Préparer la démo ECOGEN concours web et robotique',
      dueDate: '2026-05-15',
      priority: 'high' as const,
      completed: false,
      category: 'Projet',
    },
  ],
  docs: [
    {
      id: 'doc_ecogen',
      title: 'Dossier ECOGEN Hackathon & Développement Web',
      collection: 'Projets',
      type: 'notes' as const,
      summary: 'Architecture écologique ECOGEN pour concours et hackathon.',
      keyInsights: ['ECOGEN'],
      content: 'ECOGEN est un ancien projet de concours web et hackathon.',
      tags: ['ecogen', 'hackathon', 'web'],
      addedAt: '2026-01-10',
    },
  ],
};

describe('Phase 6 — Intelligence, Recherche Web Réelle & Contexte Pertinent', () => {
  beforeEach(() => {
    store.clear();
  });

  it('Scénario 1 : « Salut gros » -> échange général direct, zéro tâche/doc/ECOGEN, zéro rubrique rigide', () => {
    const ctx = ContextEngine.buildContext(
      { prompt: 'Salut gros', userId: 'mel_uid' },
      ECOGEN_DATASET
    );

    strictEqual(ctx.isWebSearch, false);
    strictEqual(ctx.tasks.length, 0);
    strictEqual(ctx.docs.length, 0);
    strictEqual(ctx.goals.length, 0);
    ok(!ctx.systemPromptBlock.includes('ECOGEN'));
    ok(!ctx.systemPromptBlock.includes('Ce qui est avéré'));
    ok(ctx.systemPromptBlock.includes('Réponse directe'));
  });

  it('Scénario 2 & 3 : « Tu me connais ? » et « Je m’appelle Mel » -> proposition candidate, confirmation explicite, persistance et isolation', () => {
    // Avant présentation : aucune identité inventée
    const beforeCtx = ContextEngine.buildContext(
      { prompt: 'Tu me connais ?', userId: 'mel_uid' },
      ECOGEN_DATASET
    );
    strictEqual(beforeCtx.tasks.length, 0);
    strictEqual(beforeCtx.docs.length, 0);
    ok(!beforeCtx.systemPromptBlock.includes('ECOGEN'));
    ok(beforeCtx.systemPromptBlock.includes('IDENTITÉ & MÉMOIRE PERSONNELLE'));

    // Présentation explicite : doit proposer un candidat sans l'enregistrer silencieusement comme confirmé
    const proposeCtx = ContextEngine.buildContext(
      { prompt: "Je m'appelle Mel", userId: 'mel_uid', allowProposedActions: true },
      ECOGEN_DATASET
    );
    const validateNameAction = proposeCtx.proposedActions.find((a) => a.type === 'validate_memory');
    ok(validateNameAction, 'Une action validate_memory doit être proposée pour le prénom');

    const pendingMems = MemoryService.getMemories('mel_uid', { status: 'candidate' });
    strictEqual(pendingMems.length, 1);
    strictEqual(pendingMems[0].value, 'Mel');
    strictEqual(pendingMems[0].enabledForAI, false, 'Ne doit pas être activé silencieusement avant confirmation');

    // Confirmation explicite
    const confirmed = MemoryService.confirmCandidate('mel_uid', pendingMems[0].id);
    ok(confirmed);
    strictEqual(confirmed!.status, 'active');
    strictEqual(confirmed!.enabledForAI, true);

    // Après rechargement simulé : connu pour mel_uid, inconnu pour other_uid
    const reloadedMems = MemoryService.getMemories('mel_uid', { status: 'active' });
    strictEqual(reloadedMems.length, 1);
    strictEqual(reloadedMems[0].value, 'Mel');

    const afterMel = ContextEngine.buildContext(
      { prompt: 'Que sais-tu de moi ?', userId: 'mel_uid' },
      {
        ...ECOGEN_DATASET,
        profile: { ...ECOGEN_DATASET.profile, name: 'Mel' },
      }
    );
    ok(afterMel.systemPromptBlock.includes('Mel'));
    strictEqual(afterMel.tasks.length, 0);

    const otherCtx = ContextEngine.buildContext(
      { prompt: 'Que sais-tu de moi ?', userId: 'other_uid' },
      ECOGEN_DATASET
    );
    ok(!otherCtx.systemPromptBlock.includes('Mel'));
  });

  it('Scénario 4 : « Trouve-moi des hackathons et concours de robotique ou de développement web ouverts actuellement. » -> Web Search Cloud sans ECOGEN', async () => {
    const prompt =
      'Trouve-moi des hackathons et concours de robotique ou de développement web ouverts actuellement.';
    const ctx = ContextEngine.buildContext(
      { prompt, userId: 'mel_uid' },
      ECOGEN_DATASET
    );

    strictEqual(ctx.isWebSearch, true, 'Doit activer la recherche Web');
    strictEqual(ctx.tasks.length, 0, 'Ne doit pas injecter une ancienne tâche ECOGEN');
    strictEqual(ctx.docs.length, 0, 'Ne doit pas injecter le document ECOGEN');
    strictEqual(ctx.goals.length, 0, 'Ne doit pas injecter un ancien objectif');
    ok(!ctx.systemPromptBlock.includes('ECOGEN'), 'Zéro contamination ECOGEN');
    ok(ctx.systemPromptBlock.includes('Google Search Grounding'));
    ok(ctx.systemPromptBlock.includes('expirée'));

    // TaskRouter doit router vers Cloud même si local disponible (local n'a pas accès Internet)
    const capsWithLocal: CapabilityReport = {
      browserSupported: true,
      browserDetails: 'Chrome',
      onDeviceStatus: 'readily',
      onDeviceDetails: 'Prêt',
      networkOnline: true,
      canRunLocal: true,
      canRunCloud: true,
      recommendations: [],
    };
    const decision = await TaskRouter.route(
      { prompt, userQuestion: prompt, enableWebSearch: true },
      capsWithLocal
    );
    strictEqual(decision.target, 'cloud');

    // localOnly doit rester strictement local même si enableWebSearch=true
    const localOnlyDecision = await TaskRouter.route(
      { prompt, userQuestion: prompt, enableWebSearch: true, localOnly: true },
      capsWithLocal
    );
    strictEqual(localOnlyDecision.target, 'local');
    strictEqual(localOnlyDecision.fallbackToCloudAllowed, false);

    // Hors ligne sans moteur local : rejet explicite (aucune recherche Web simulée)
    const offlineNoLocal: CapabilityReport = {
      ...capsWithLocal,
      onDeviceStatus: 'no',
      canRunLocal: false,
      networkOnline: false,
      canRunCloud: false,
    };
    let offlineRejected = false;
    try {
      await TaskRouter.route({ prompt, userQuestion: prompt, enableWebSearch: true }, offlineNoLocal);
    } catch {
      offlineRejected = true;
    }
    strictEqual(offlineRejected, true);
  });

  it('Scénario 5 : « Pourquoi me parles-tu d’ECOGEN ? » -> question méta sans ré-injecter ECOGEN', () => {
    const ctx = ContextEngine.buildContext(
      { prompt: "Pourquoi me parles-tu d'ECOGEN ?", userId: 'mel_uid' },
      ECOGEN_DATASET
    );

    strictEqual(ctx.tasks.length, 0);
    strictEqual(ctx.docs.length, 0);
    strictEqual(ctx.goals.length, 0);
    ok(!ctx.systemPromptBlock.includes('Dossier ECOGEN'));
    ok(ctx.systemPromptBlock.includes('QUESTION MÉTA'));
  });

  it('Scénario 6 : Vérification technique du grounding Google Search dans CloudAIProvider et affichage Web dans AIScreen', () => {
    const cloudSrc = fs.readFileSync(path.join(ROOT, 'src/lib/ai/CloudAIProvider.ts'), 'utf-8');
    const aiScreenSrc = fs.readFileSync(path.join(ROOT, 'src/features/ai/AIScreen.tsx'), 'utf-8');

    ok(cloudSrc.includes('googleSearch: {}'), 'CloudAIProvider doit activer googleSearch dans inCloudParams');
    ok(cloudSrc.includes('groundingMetadata'), 'CloudAIProvider doit extraire groundingMetadata');
    ok(aiScreenSrc.includes("s.type === 'web'"), 'AIScreen doit distinguer les sources Web');
  });
});
