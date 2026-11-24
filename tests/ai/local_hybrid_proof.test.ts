/**
 * ELORA - Phase 7 : Real On-Device AI & Hybrid Proof Test Suite
 *
 * Vérifie rigoureusement :
 * 1. Détection des capacités locales (Chrome Prompt API & Gemini Nano)
 * 2. Inférence locale certifiée sur environnement compatible (source: 'on_device', libération mémoire session.destroy)
 * 3. Streaming local (gestion des flux ReadableStream / AsyncIterable)
 * 4. Interdiction absolue de fuite vers le Cloud en mode LOCAL_ONLY / only_on_device
 * 5. Isolation stricte du mode CLOUD_ONLY / only_in_cloud (aucune sollicitation locale)
 * 6. Repli honnête et traçabilité en mode PREFER_ON_DEVICE / auto (fallbackOccurred: true, source: 'in_cloud')
 * 7. Comportement hors-ligne avec et sans modèle local
 * 8. Non-simulation : refus authentique en cas d'indisponibilité totale
 */

import test from 'node:test';
import assert from 'node:assert';
import { CapabilityDetector } from '../../src/lib/ai/CapabilityDetector';
import { LocalAIProvider } from '../../src/lib/ai/LocalAIProvider';
import { TaskRouter } from '../../src/lib/ai/TaskRouter';
import { AIOrchestrator } from '../../src/lib/ai/AIOrchestrator';
import type { CapabilityReport } from '../../src/lib/ai/types';

test('ELORA - Phase 7 : Preuves d\'Inférence Locale & Moteur Hybride', async (t) => {

  await t.test('1. Détection honnête de l\'environnement d\'exécution actuel', async () => {
    const report = await CapabilityDetector.detect();

    assert.ok(report, 'Le rapport de capacités doit exister');
    assert.ok(typeof report.canRunLocal === 'boolean');
    assert.ok(typeof report.canRunCloud === 'boolean');
    assert.ok(Array.isArray(report.recommendations));

    // En environnement Node.js standard sans Chrome AI, l'état doit être transparent
    if (!report.canRunLocal) {
      assert.ok(
        ['no', 'unsupported', 'after-download'].includes(report.onDeviceStatus),
        'Le statut doit honnêtement refléter l\'absence de Gemini Nano'
      );
      assert.ok(
        report.recommendations.length > 0,
        'Des recommandations claires d\'activation des flags doivent être fournies'
      );
    }
  });

  await t.test('2. Inférence locale certifiée sur runtime compatible avec nettoyage mémoire', async () => {
    let sessionCreated = false;
    let sessionDestroyed = false;
    let promptReceived = '';

    // Mock du runtime Chrome Prompt API W3C
    const mockLanguageModel = {
      create: async (opts?: unknown) => {
        sessionCreated = true;
        return {
          prompt: async (text: string) => {
            promptReceived = text;
            return 'Réponse générée localement par Gemini Nano (On-Device).';
          },
          destroy: () => {
            sessionDestroyed = true;
          },
        };
      },
    };

    const originalGlobalAI = (globalThis as unknown as { ai?: unknown }).ai;
    (globalThis as unknown as { ai: unknown }).ai = { languageModel: mockLanguageModel };

    try {
      const provider = new LocalAIProvider();
      const response = await provider.generate({
        prompt: 'Bonjour depuis le terminal client',
        mode: 'only_on_device',
      });

      assert.strictEqual(sessionCreated, true, 'La session locale a été instanciée');
      assert.strictEqual(sessionDestroyed, true, 'session.destroy() a été appelé pour libérer la VRAM');
      assert.ok(promptReceived.includes('terminal client'));
      assert.strictEqual(response.metadata.source, 'on_device');
      assert.strictEqual(response.metadata.fallbackOccurred, false);
      assert.ok(response.metadata.modelName.includes('Gemini Nano'));
      assert.ok(response.metadata.durationMs >= 0);
    } finally {
      (globalThis as unknown as { ai: unknown }).ai = originalGlobalAI;
    }
  });

  await t.test('3. Streaming local : prise en charge du flux et émission de chunks', async () => {
    const streamedChunks: string[] = [];

    const mockStreamingModel = {
      create: async () => ({
        promptStreaming: async function* (text: string) {
          yield 'Anal';
          yield 'Analyse locale ';
          yield 'Analyse locale terminée.';
        },
        destroy: () => {},
      }),
    };

    const originalGlobalAI = (globalThis as unknown as { ai?: unknown }).ai;
    (globalThis as unknown as { ai: unknown }).ai = { languageModel: mockStreamingModel };

    try {
      const provider = new LocalAIProvider();
      const response = await provider.generate({
        prompt: 'Flux de test',
        onStreamChunk: (chunk, accumulated) => {
          streamedChunks.push(accumulated);
        },
      });

      assert.strictEqual(response.metadata.source, 'on_device');
      assert.strictEqual(response.text, 'Analyse locale terminée.');
      assert.ok(streamedChunks.length >= 2, 'Des chunks intermédiaires doivent être capturés');
    } finally {
      (globalThis as unknown as { ai: unknown }).ai = originalGlobalAI;
    }
  });

  await t.test('4. Règle absolue : ZÉRO fuite vers le Cloud en mode LOCAL_ONLY', async () => {
    const capsWithoutLocal: CapabilityReport = {
      browserSupported: true,
      browserDetails: 'Chrome',
      onDeviceStatus: 'no',
      onDeviceDetails: 'Modèle absent',
      networkOnline: true,
      canRunLocal: false,
      canRunCloud: true,
      recommendations: [],
    };

    // Si localOnly est activé et que le modèle est absent, le routeur doit lever une erreur
    await assert.rejects(
      async () => {
        await TaskRouter.route(
          {
            prompt: 'Données ultra-sensibles RH',
            localOnly: true,
          },
          capsWithoutLocal
        );
      },
      (err: Error) => {
        assert.ok(err.message.includes('confidentialité'));
        assert.ok(err.message.includes('Aucun transfert vers le cloud'));
        return true;
      }
    );
  });

  await t.test('5. Mode CLOUD_ONLY isolé : interdiction de repli local si hors-ligne', async () => {
    const capsOfflineWithLocal: CapabilityReport = {
      browserSupported: true,
      browserDetails: 'Chrome',
      onDeviceStatus: 'readily',
      onDeviceDetails: 'Gemini Nano prêt',
      networkOnline: false, // Déconnecté
      canRunLocal: true,
      canRunCloud: false,
      recommendations: [],
    };

    // Mode forcé Cloud hors-ligne doit échouer sans basculer sur le local en cachette
    await assert.rejects(
      async () => {
        await TaskRouter.route(
          {
            prompt: 'Consigne Cloud explicite',
            mode: 'only_in_cloud',
          },
          capsOfflineWithLocal
        );
      },
      (err: Error) => {
        assert.ok(err.message.includes('hors ligne'));
        return true;
      }
    );
  });

  await t.test('6. Mode PREFER_ON_DEVICE avec repli Cloud honnête et métadonnées certifiées', async () => {
    const orchestrator = new AIOrchestrator();

    // Remplacer temporairement CapabilityDetector pour simuler un modèle local prêt au départ
    // puis un échec d'exécution locale pour tester le repli
    const originalLocal = (orchestrator as unknown as { localProvider: { generate: unknown } }).localProvider;
    (orchestrator as unknown as { localProvider: { generate: () => Promise<never> } }).localProvider = {
      generate: async () => {
        throw new Error('Modèle local temporairement saturé en mémoire VRAM');
      },
    };

    // Remplacer CloudProvider pour tester la capture de l'événement de repli
    const originalCloud = (orchestrator as unknown as { cloudProvider: { generate: unknown } }).cloudProvider;
    (orchestrator as unknown as { cloudProvider: { generate: (opts: unknown) => Promise<unknown> } }).cloudProvider = {
      generate: async () => ({
        text: 'Réponse Cloud de secours.',
        metadata: {
          source: 'in_cloud',
          modeRequested: 'prefer_on_device',
          modelName: 'Google Gemini (gemini-3.5-flash-lite)',
          durationMs: 450,
          timestamp: new Date().toISOString(),
          fallbackOccurred: false,
        },
      }),
    };

    // Mock des capacités : Gemini Nano semble prêt dans le rapport
    const originalDetect = CapabilityDetector.detect;
    CapabilityDetector.detect = async () => ({
      browserSupported: true,
      browserDetails: 'Chrome',
      onDeviceStatus: 'readily',
      onDeviceDetails: 'Prêt',
      networkOnline: true,
      canRunLocal: true,
      canRunCloud: true,
      recommendations: [],
    });

    try {
      const resp = await orchestrator.process({
        prompt: 'Calcul et analyse',
        mode: 'prefer_on_device',
      });

      // Le repli Cloud DOIT être explicitement documenté dans les métadonnées
      assert.strictEqual(resp.metadata.source, 'in_cloud');
      assert.strictEqual(resp.metadata.fallbackOccurred, true);
      assert.ok(resp.metadata.fallbackReason?.includes('Moteur local indisponible'));
      assert.ok(resp.text.includes('secours'));
    } finally {
      (orchestrator as unknown as { localProvider: unknown }).localProvider = originalLocal;
      (orchestrator as unknown as { cloudProvider: unknown }).cloudProvider = originalCloud;
      CapabilityDetector.detect = originalDetect;
    }
  });

  await t.test('7. Comportement Hors-Ligne strict : exécution locale si disponible, rejet clair sinon', async () => {
    // Cas A : Hors-ligne avec modèle local disponible
    const capsOfflineReady: CapabilityReport = {
      browserSupported: true,
      browserDetails: 'Chrome',
      onDeviceStatus: 'readily',
      onDeviceDetails: 'Prêt',
      networkOnline: false,
      canRunLocal: true,
      canRunCloud: false,
      recommendations: [],
    };

    const decisionReady = await TaskRouter.route({ prompt: 'Note locale' }, capsOfflineReady);
    assert.strictEqual(decisionReady.target, 'local');
    assert.strictEqual(decisionReady.effectiveMode, 'only_on_device');
    assert.strictEqual(decisionReady.fallbackToCloudAllowed, false);

    // Cas B : Hors-ligne SANS modèle local
    const capsOfflineNoModel: CapabilityReport = {
      browserSupported: true,
      browserDetails: 'Chrome',
      onDeviceStatus: 'no',
      onDeviceDetails: 'Non disponible',
      networkOnline: false,
      canRunLocal: false,
      canRunCloud: false,
      recommendations: [],
    };

    await assert.rejects(
      async () => {
        await TaskRouter.route({ prompt: 'Note locale impossible' }, capsOfflineNoModel);
      },
      (err: Error) => {
        assert.ok(err.message.includes('hors ligne'));
        return true;
      }
    );
  });
});
