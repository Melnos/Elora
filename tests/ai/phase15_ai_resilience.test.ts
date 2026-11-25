import { describe, it } from 'node:test';
import { ok, strictEqual, rejects } from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import { CloudAIProvider } from '../../src/lib/ai/CloudAIProvider';
import { LocalAIProvider } from '../../src/lib/ai/LocalAIProvider';

describe('Phase 15 — Résilience Firebase AI Logic (503, AI/parse-failed, Fallback & Local)', () => {
  it('1. Zéro Uncaught (in promise) lors d\'une erreur AI/parse-failed + HTTP 503 et fallback honnête', async () => {
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => unhandled.push(reason);
    process.on('unhandledRejection', onUnhandled);

    const origFetch = globalThis.fetch;
    // Simuler 503 sur firebasevertexai (si appelé) et succès sur generativelanguage (fallback)
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('generativelanguage.googleapis.com')) {
        return new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: 'Réponse via repli résilience.' }] } }],
            modelVersion: 'gemini-3.5-flash-lite',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('Service Unavailable', { status: 503 });
    }) as typeof fetch;

    const prevKey = process.env.VITE_GEMINI_API_KEY;
    process.env.VITE_GEMINI_API_KEY = 'TEST_KEY_FOR_UNIT_MOCK_ONLY_123456';

    try {
      const provider = new CloudAIProvider();
      const chunks: string[] = [];
      const resp = await provider.generate({
        prompt: 'Test résilience 503',
        mode: 'only_in_cloud',
        onStreamChunk: (c) => chunks.push(c),
      });

      // Laisser passer un tick microtask pour vérifier l'absence de rejet non géré
      await new Promise((r) => setTimeout(r, 20));
      strictEqual(unhandled.length, 0, 'Aucune promesse non gérée ne doit survenir');
      strictEqual(resp.metadata.sdkProvider, 'gemini_direct_fallback');
      strictEqual(resp.metadata.fallbackOccurred, true);
      ok(resp.metadata.fallbackReason && resp.metadata.fallbackReason.length > 0);
      ok(chunks.length > 0);
    } finally {
      process.off('unhandledRejection', onUnhandled);
      globalThis.fetch = origFetch;
      if (prevKey === undefined) delete process.env.VITE_GEMINI_API_KEY;
      else process.env.VITE_GEMINI_API_KEY = prevKey;
    }
  });

  it('2. Échec Cloud complet (Firebase AI Logic + fallback en 503) rejette sans faux succès', async () => {
    const origFetch = globalThis.fetch;
    globalThis.fetch = (async () => new Response('Service Unavailable', { status: 503 })) as typeof fetch;

    const prevKey = process.env.VITE_GEMINI_API_KEY;
    process.env.VITE_GEMINI_API_KEY = 'TEST_KEY_FOR_UNIT_MOCK_ONLY_123456';

    try {
      const provider = new CloudAIProvider();
      await rejects(
        () => provider.generate({ prompt: 'Test échec total', mode: 'only_in_cloud' }),
        /Échec de l'appel Cloud/
      );
    } finally {
      globalThis.fetch = origFetch;
      if (prevKey === undefined) delete process.env.VITE_GEMINI_API_KEY;
      else process.env.VITE_GEMINI_API_KEY = prevKey;
    }
  });

  it('3. LocalAIProvider rejette honnêtement lorsque LanguageModel.availability() vaut unavailable', async () => {
    const g = globalThis as unknown as { LanguageModel?: unknown };
    const prevLM = g.LanguageModel;
    g.LanguageModel = {
      availability: async () => 'unavailable',
      create: async () => {
        throw new Error('Should not be called');
      },
    };

    try {
      const local = new LocalAIProvider();
      await rejects(
        () => local.generate({ prompt: 'Test local impossible', localOnly: true }),
        /Gemini Nano indisponible sur ce matériel/
      );
    } finally {
      if (prevLM === undefined) delete g.LanguageModel;
      else g.LanguageModel = prevLM;
    }
  });

  it('4. Conservation de l\'historique multi-tours et garde Uncaught dans AppContext / CloudAIProvider', () => {
    const appCtx = fs.readFileSync(path.resolve(process.cwd(), 'src/context/AppContext.tsx'), 'utf-8');
    const cloudSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/lib/ai/CloudAIProvider.ts'), 'utf-8');
    ok(appCtx.includes('HISTORIQUE RÉCENT DE LA CONVERSATION'), 'Historique multi-tours injecté');
    ok(cloudSrc.includes('streamResult.response.catch'), 'Protection anti-Uncaught sur streamResult.response');
  });
});
