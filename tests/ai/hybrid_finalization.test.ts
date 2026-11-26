import { describe, it } from 'node:test';
import { ok, strictEqual, rejects } from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { CapabilityDetector } from '../../src/lib/ai/CapabilityDetector';
import { TaskRouter } from '../../src/lib/ai/TaskRouter';
import { AIOrchestrator } from '../../src/lib/ai/AIOrchestrator';
import type { CapabilityReport } from '../../src/lib/ai/types';

const READY_LOCAL_CAPS: CapabilityReport = {
  browserSupported: true,
  browserDetails: 'Chrome/140.0.0.0',
  onDeviceStatus: 'readily',
  onDeviceDetails: 'Prêt',
  networkOnline: true,
  canRunLocal: true,
  canRunCloud: true,
  recommendations: [],
};

describe('Finalisation Mode Hybride — Lots 1, 2, 3, 4', () => {
  it('LOT 1 : downloadLocalModel suit la progression réelle, détruit la session temporaire et re-vérifie detect()', async () => {
    const g = globalThis as unknown as {
      LanguageModel?: unknown;
      navigator?: { userAgent?: string; onLine?: boolean };
    };
    const prevLM = g.LanguageModel;
    let currentAvail = 'after-download';
    let destroyed = false;

    g.LanguageModel = {
      availability: async () => currentAvail,
      create: async (opts?: {
        signal?: AbortSignal;
        monitor?: (m: { addEventListener: (ev: string, cb: (e: { loaded: number; total: number }) => void) => void }) => void;
      }) => {
        if (opts?.signal?.aborted) {
          throw new DOMException('Aborted', 'AbortError');
        }
        opts?.monitor?.({
          addEventListener: (_ev, cb) => {
            cb({ loaded: 0.5, total: 1 });
            cb({ loaded: 1, total: 1 });
          },
        });
        currentAvail = 'readily';
        return {
          destroy: () => {
            destroyed = true;
          },
        };
      },
    };

    const progressValues: number[] = [];
    try {
      const report = await CapabilityDetector.downloadLocalModel((pct) => {
        progressValues.push(pct);
      });
      ok(progressValues.includes(50) && progressValues.includes(100), 'Progression réelle transmise');
      strictEqual(destroyed, true, 'Session temporaire détruite après téléchargement');
      ok(['readily', 'unsupported'].includes(report.onDeviceStatus));
    } finally {
      if (prevLM === undefined) delete g.LanguageModel;
      else g.LanguageModel = prevLM;
    }
  });

  it('LOT 2 : TaskRouter évalue la complexité sur userQuestion et non sur le contexte ContextEngine (>2000 chars)', async () => {
    const longContextPrompt = 'CONTEXTE_INJECTE '.repeat(200) + '\nDemande : Bonjour';
    const decision = await TaskRouter.route(
      {
        prompt: longContextPrompt,
        userQuestion: 'Explique-moi le théorème de Pythagore.',
        mode: 'auto',
      },
      READY_LOCAL_CAPS
    );
    strictEqual(decision.target, 'local', 'Un prompt enrichi >2000 chars avec question courte doit rester local');

    const heavyQuestionDecision = await TaskRouter.route(
      {
        prompt: 'x'.repeat(2100),
        userQuestion: 'x'.repeat(2100),
        mode: 'auto',
      },
      READY_LOCAL_CAPS
    );
    strictEqual(heavyQuestionDecision.target, 'cloud', 'Une question brute >2000 chars doit passer en Cloud');
  });

  it('LOT 3 : AIOrchestrator annule proprement via AbortSignal sans basculer vers le Cloud', async () => {
    const orchestrator = new AIOrchestrator();
    const ac = new AbortController();
    ac.abort();

    await rejects(
      () => orchestrator.process({ prompt: 'Test annulation', signal: ac.signal }),
      (err: unknown) => err instanceof Error && err.name === 'AbortError'
    );
  });

  it('LOT 4 : public/sw.js et vite.config.ts pré-cachent uniquement les ressources locales sans secrets', () => {
    const swSrc = fs.readFileSync(path.resolve(process.cwd(), 'public/sw.js'), 'utf-8');
    const viteSrc = fs.readFileSync(path.resolve(process.cwd(), 'vite.config.ts'), 'utf-8');

    ok(swSrc.includes("CACHE_NAME = 'elora-shell-v2'"), 'Service worker versionné v2');
    ok(swSrc.includes("url.origin !== self.location.origin"), 'Origines externes ignorées');
    ok(swSrc.includes("event.request.mode === 'navigate'"), 'Fallback navigation hors ligne présent');
    ok(viteSrc.includes('eloraPrecacheSw'), 'Plugin Vite de pré-cache des assets présent');
    ok(!swSrc.includes('VITE_GEMINI_API_KEY'), 'Aucun secret dans sw.js');
  });
});
