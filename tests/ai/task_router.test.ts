import { describe, it } from 'node:test';
import assert from 'node:assert';
import { TaskRouter } from '../../src/lib/ai/TaskRouter';
import { CapabilityDetector } from '../../src/lib/ai/CapabilityDetector';
import type { CapabilityReport } from '../../src/lib/ai/types';

describe('TaskRouter - Règles de Décision et Confidentialité Hybride', () => {
  // Sauvegarde de l'implémentation originale de detect
  const originalDetect = CapabilityDetector.detect;

  const mockCapabilities = (override: Partial<CapabilityReport>) => {
    CapabilityDetector.detect = async () => ({
      browserSupported: true,
      browserDetails: 'Chrome 131',
      onDeviceStatus: 'readily',
      onDeviceDetails: 'Gemini Nano prêt',
      networkOnline: true,
      canRunLocal: true,
      canRunCloud: true,
      recommendations: [],
      ...override,
    });
  };

  it('Règle 1 : ONLY_ON_DEVICE / localOnly lève une erreur explicite sans fuite Cloud si Gemini Nano est absent', async () => {
    mockCapabilities({
      canRunLocal: false,
      onDeviceStatus: 'no',
      networkOnline: true,
    });

    await assert.rejects(
      async () => {
        await TaskRouter.route({
          prompt: 'Résume ce document médical confidentiel',
          localOnly: true,
        });
      },
      (err: Error) => {
        assert.match(err.message, /confidentialité/i);
        assert.match(err.message, /Gemini Nano/i);
        return true;
      }
    );

    // Même comportement avec mode explicite 'only_on_device'
    await assert.rejects(
      async () => {
        await TaskRouter.route({
          prompt: 'Analyse locale',
          mode: 'only_on_device',
        });
      },
      (err: Error) => {
        assert.match(err.message, /confidentialité/i);
        return true;
      }
    );
  });

  it('Règle 2 : ONLY_ON_DEVICE route vers local et INTERDIT strictement le repli vers le Cloud', async () => {
    mockCapabilities({
      canRunLocal: true,
      networkOnline: true,
    });

    const decision = await TaskRouter.route({
      prompt: 'Analyse locale sécurisée',
      localOnly: true,
    });

    assert.strictEqual(decision.target, 'local');
    assert.strictEqual(decision.effectiveMode, 'only_on_device');
    assert.strictEqual(decision.fallbackToCloudAllowed, false, 'Le repli Cloud doit être strictement interdit');
  });

  it('Règle 3 : ONLY_IN_CLOUD hors ligne lève une erreur de connectivité immédiate', async () => {
    mockCapabilities({
      canRunLocal: true,
      networkOnline: false,
    });

    await assert.rejects(
      async () => {
        await TaskRouter.route({
          prompt: 'Génération complexe via grand modèle Cloud',
          mode: 'only_in_cloud',
        });
      },
      (err: Error) => {
        assert.match(err.message, /hors ligne/i);
        return true;
      }
    );
  });

  it('Règle 4 : Hors ligne SANS moteur local lève une notification d\'indisponibilité sans blocage faux', async () => {
    mockCapabilities({
      canRunLocal: false,
      onDeviceStatus: 'unsupported',
      networkOnline: false,
    });

    await assert.rejects(
      async () => {
        await TaskRouter.route({
          prompt: 'Consigne quelconque',
        });
      },
      (err: Error) => {
        assert.match(err.message, /hors ligne/i);
        assert.match(err.message, /moteur d'IA locale/i);
        return true;
      }
    );
  });

  it('Règle 5 : Hors ligne AVEC moteur local bascule automatiquement sur ONLY_ON_DEVICE sans erreur', async () => {
    mockCapabilities({
      canRunLocal: true,
      onDeviceStatus: 'readily',
      networkOnline: false,
    });

    const decision = await TaskRouter.route({
      prompt: 'Rédige un compte-rendu',
    });

    assert.strictEqual(decision.target, 'local');
    assert.strictEqual(decision.effectiveMode, 'only_on_device');
    assert.strictEqual(decision.fallbackToCloudAllowed, false);
    assert.match(decision.reason, /déconnecté/i);
  });

  it('Règle 6 : En ligne avec Gemini Nano disponible privilégie le local avec repli autorisé', async () => {
    mockCapabilities({
      canRunLocal: true,
      networkOnline: true,
    });

    const decision = await TaskRouter.route({
      prompt: 'Synthétise mes 3 notes',
      taskType: 'simple_summary',
    });

    assert.strictEqual(decision.target, 'local');
    assert.strictEqual(decision.effectiveMode, 'prefer_on_device');
    assert.strictEqual(decision.fallbackToCloudAllowed, true, 'Le repli vers le cloud est autorisé en cas d\'échec imprévu');
  });

  it('Règle 7 : En ligne sans modèle local route vers CloudAIProvider en toute transparence', async () => {
    mockCapabilities({
      canRunLocal: false,
      onDeviceStatus: 'no',
      networkOnline: true,
    });

    const decision = await TaskRouter.route({
      prompt: 'Donne-moi des conseils d\'organisation',
    });

    assert.strictEqual(decision.target, 'cloud');
    assert.strictEqual(decision.effectiveMode, 'prefer_in_cloud');
    assert.strictEqual(decision.fallbackToCloudAllowed, false);
    assert.match(decision.reason, /Moteur local indisponible/i);
  });
});
