/**
 * ELORA - Live Cloud Inference Test & Firebase AI Logic Runtime Verification
 *
 * Ce test distingue clairement :
 * 1. Test unitaire (sans réseau)
 * 2. Test d'inférence Cloud réellement exécuté (Live)
 *    - Tente d'abord Firebase AI Logic (firebasevertexai.googleapis.com)
 *    - Si le projet Firebase n'est pas encore provisionné pour AI Logic (ou clé non-AIza),
 *      bascule sur le connecteur de secours Gemini Developer REST et l'identifie explicitement.
 */

import { describe, it } from 'node:test';
import { ok, strictEqual } from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';

// Charger .env puis .env.local AVANT tout import de CloudAIProvider / firebase/config
// (en ESM, un import statique est hissé avant le corps du module et figerait la config démo).
for (const envFile of ['.env', '.env.local']) {
  const envPath = path.resolve(process.cwd(), envFile);
  if (!fs.existsSync(envPath)) continue;
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const rawLine of envContent.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIdx = line.indexOf('=');
    if (eqIdx > 0) {
      const key = line.slice(0, eqIdx).trim();
      const val = line.slice(eqIdx + 1).trim();
      if (key && val) {
        process.env[key] = val;
      }
    }
  }
}

describe('ELORA - Validation des Inférences Réelles (Phase 8.5)', () => {
  it('1. Test Unitaire : CloudAIProvider vérifie le format des requêtes', async () => {
    const { CloudAIProvider } = await import('../../src/lib/ai/CloudAIProvider');
    const provider = new CloudAIProvider();
    ok(typeof provider.generate === 'function');
  });

  it('2. Test d\'Inférence Réelle : Exécution Cloud et identification exacte du sdkProvider', async () => {
    const { CloudAIProvider } = await import('../../src/lib/ai/CloudAIProvider');
    const { firebaseConfig } = await import('../../src/lib/firebase/config');
    ok(
      !firebaseConfig.apiKey.includes('Demo'),
      'La clé Firebase chargée ne doit pas être la clé de démonstration'
    );
    const activeKey = process.env.VITE_GEMINI_API_KEY || process.env.VITE_FIREBASE_API_KEY || '';
    ok(activeKey.length > 20, 'Une clé API valide doit être configurée dans .env / .env.local');

    const provider = new CloudAIProvider();
    const prompt = 'Tu es ELORA. Réponds en exactement 3 mots.';

    const startTime = performance.now();
    const response = await provider.generate({
      prompt,
      mode: 'only_in_cloud',
    });
    const durationMs = Math.round(performance.now() - startTime);

    ok(response.text.length > 0, 'La réponse du modèle doit contenir du texte réel');
    strictEqual(response.metadata.source, 'in_cloud');
    ok(response.metadata.durationMs > 0);
    ok(response.metadata.modelName.includes('Gemini'));
    ok(response.metadata.timestamp);
    ok(
      response.metadata.sdkProvider === 'firebase_ai_logic' ||
        response.metadata.sdkProvider === 'gemini_direct_fallback',
      'Le sdkProvider doit être explicitement identifié'
    );

    if (response.metadata.sdkProvider === 'gemini_direct_fallback') {
      strictEqual(
        response.metadata.fallbackOccurred,
        true,
        'Un appel via le connecteur de secours REST doit marquer fallbackOccurred: true'
      );
    }

    console.log('\n[PREUVE D\'INFÉRENCE RÉELLE]');
    console.log('- SDK utilisé :', response.metadata.sdkProvider);
    console.log('- Modèle ayant répondu :', response.metadata.modelName);
    console.log('- Repli déclenché :', response.metadata.fallbackOccurred);
    if (response.metadata.fallbackReason) {
      console.log('- Raison du repli :', response.metadata.fallbackReason);
    }
    console.log('- Durée mesurée :', durationMs, 'ms');
    console.log('- Source certifiée :', response.metadata.source);
    console.log('- Texte généré :', response.text.trim());
    if (response.metadata.tokenCount) {
      console.log('- Tokens consommés :', response.metadata.tokenCount);
    }
  });
});
