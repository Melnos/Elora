/**
 * ELORA - AI Orchestrator & Hybrid Inference Test Suite
 *
 * Vérifie rigoureusement les 6 scénarios clés de l'IA hybride :
 * 1. Inférence Cloud réelle avec réseau actif
 * 2. Inférence Locale sur le terminal (Gemini Nano)
 * 3. Indisponibilité du modèle local (rejet honnête sans simulation)
 * 4. Mode ONLY_ON_DEVICE / localOnly (refus strict de basculer vers le Cloud)
 * 5. Comportement Hors-ligne (rejet Cloud quand navigator.onLine === false)
 * 6. Routage dynamique selon capacités et charge
 */

import { describe, it } from 'node:test';
import { ok, strictEqual, rejects } from 'node:assert';
import { TaskRouter } from '../../src/lib/ai/TaskRouter';
import { LocalAIProvider } from '../../src/lib/ai/LocalAIProvider';
import { CloudAIProvider } from '../../src/lib/ai/CloudAIProvider';
import type { CapabilityReport } from '../../src/lib/ai/types';

describe('AIOrchestrator & Moteur Hybride - Les 6 Preuves Hybrides', () => {

  // Scénario 1 : Inférence Cloud avec connectivité active
  it('Scénario 1 : Route vers le Cloud lorsque le réseau est actif et le modèle local absent', async () => {
    const caps: CapabilityReport = {
      onDeviceStatus: 'unsupported',
      networkOnline: true,
      canRunLocal: false,
      canRunCloud: true,
      recommendedMode: 'only_in_cloud',
      details: 'Chrome Desktop sans Gemini Nano',
      recommendations: [],
    };

    const decision = await TaskRouter.route({ prompt: 'Bonjour ELORA' }, caps);
    strictEqual(decision.target, 'cloud');
    strictEqual(decision.effectiveMode, 'prefer_in_cloud');
    ok(decision.reason.includes('Cloud'));
  });

  // Scénario 2 : Inférence Locale sur le terminal (Gemini Nano actif)
  it('Scénario 2 : Route vers le terminal local (Gemini Nano) lorsque disponible', async () => {
    const caps: CapabilityReport = {
      onDeviceStatus: 'readily',
      networkOnline: true,
      canRunLocal: true,
      canRunCloud: true,
      recommendedMode: 'prefer_on_device',
      details: 'Gemini Nano opérationnel',
      recommendations: [],
    };

    const decision = await TaskRouter.route({
      prompt: 'Résume ce court paragraphe',
      taskType: 'lightweight',
    }, caps);

    strictEqual(decision.target, 'local');
    strictEqual(decision.effectiveMode, 'prefer_on_device');
    strictEqual(decision.fallbackToCloudAllowed, true);
  });

  // Scénario 3 : Indisponibilité du modèle local (Zéro simulation factice)
  it('Scénario 3 : En l\'absence de Gemini Nano local, LocalAIProvider lève une erreur explicite sans fausse réponse', async () => {
    const localProvider = new LocalAIProvider();

    // En environnement Node/sans Chrome AI activé, l'appel doit échouer honnêtement
    await rejects(
      async () => {
        await localProvider.generate({ prompt: 'Test sans Gemini Nano' });
      },
      (err: Error) => {
        ok(err.message.includes('[LocalAIProvider]'));
        ok(err.message.includes('impossible') || err.message.includes('Échec') || err.message.includes('indisponible'));
        return true;
      }
    );
  });

  // Scénario 4 : Mode ONLY_ON_DEVICE / localOnly (Interdiction absolue de repli vers le Cloud)
  it('Scénario 4 : Le mode localOnly / ONLY_ON_DEVICE interdit strictement tout repli vers le Cloud', async () => {
    const caps: CapabilityReport = {
      onDeviceStatus: 'readily',
      networkOnline: true,
      canRunLocal: true,
      canRunCloud: true,
      recommendedMode: 'prefer_on_device',
      details: 'Prêt',
      recommendations: [],
    };

    const decision = await TaskRouter.route({
      prompt: 'Données ultra-sensibles médicales',
      localOnly: true,
      mode: 'only_on_device',
    }, caps);

    strictEqual(decision.target, 'local');
    strictEqual(decision.effectiveMode, 'only_on_device');
    // Le repli Cloud DOIT être strictement désactivé
    strictEqual(decision.fallbackToCloudAllowed, false);
    ok(decision.reason.includes('confidentialité') || decision.reason.includes('local'));
  });

  // Scénario 5 : Comportement Hors-ligne (Rejet Cloud immédiat)
  it('Scénario 5 : Lorsque le réseau est hors-ligne, le CloudAIProvider rejette la requête immédiatement', async () => {
    const cloudProvider = new CloudAIProvider();

    // Simulation de l'état hors-ligne
    const originalNavigator = globalThis.navigator;
    Object.defineProperty(globalThis, 'navigator', {
      value: { onLine: false, userAgent: 'Chrome' },
      configurable: true,
      writable: true,
    });

    try {
      await rejects(
        async () => {
          await cloudProvider.generate({ prompt: 'Recherche distante hors-ligne' });
        },
        (err: Error) => {
          ok(err.message.includes('hors ligne'));
          return true;
        }
      );
    } finally {
      // Restauration du navigator
      Object.defineProperty(globalThis, 'navigator', {
        value: originalNavigator,
        configurable: true,
        writable: true,
      });
    }
  });

  // Scénario 6 : Routage dynamique selon les capacités et le profil de tâche
  it('Scénario 6 : Routage dynamique vers le Cloud pour les tâches d\'analyse complexe même si le local est présent', async () => {
    const caps: CapabilityReport = {
      onDeviceStatus: 'readily',
      networkOnline: true,
      canRunLocal: true,
      canRunCloud: true,
      recommendedMode: 'prefer_on_device',
      details: 'Prêt',
      recommendations: [],
    };

    // Tâche complexe (documents lourds, code complexe, raisonnement étendu)
    const decision = await TaskRouter.route({
      prompt: 'Analyse comparative globale de 50 pages de bilan comptable',
      taskType: 'heavy_reasoning',
    }, caps);

    strictEqual(decision.target, 'cloud');
    strictEqual(decision.effectiveMode, 'prefer_in_cloud');
    ok(decision.reason.includes('complexe'));
  });
});
