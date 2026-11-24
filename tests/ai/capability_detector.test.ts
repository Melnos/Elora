import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CapabilityDetector } from '../../src/lib/ai/CapabilityDetector';

describe('CapabilityDetector - Détection des Capacités du Terminal', () => {
  it('Détecte les capacités du runtime actuel sans plantage', async () => {
    const report = await CapabilityDetector.detect();

    assert.ok(typeof report.browserSupported === 'boolean');
    assert.ok(typeof report.browserDetails === 'string');
    assert.ok(['readily', 'after-download', 'no', 'unsupported'].includes(report.onDeviceStatus));
    assert.ok(typeof report.onDeviceDetails === 'string');
    assert.ok(typeof report.networkOnline === 'boolean');
    assert.ok(typeof report.canRunLocal === 'boolean');
    assert.ok(typeof report.canRunCloud === 'boolean');
    assert.ok(Array.isArray(report.recommendations));
  });

  it('Exige le statut "readily" pour autoriser canRunLocal', async () => {
    const report = await CapabilityDetector.detect();

    if (report.onDeviceStatus === 'readily') {
      assert.strictEqual(report.canRunLocal, true);
    } else {
      assert.strictEqual(report.canRunLocal, false, 'canRunLocal doit être faux si le modèle n\'est pas téléchargé et prêt');
    }
  });

  it('Renseigne des recommandations précises lorsque le modèle n\'est pas disponible', async () => {
    const report = await CapabilityDetector.detect();

    if (!report.canRunLocal) {
      assert.ok(report.recommendations.length > 0, 'Des recommandations de configuration doivent être fournies à l\'utilisateur');
    }
  });
});
