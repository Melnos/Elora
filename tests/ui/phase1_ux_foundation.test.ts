import { describe, it } from 'node:test';
import { ok, deepStrictEqual } from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { NAV_ITEMS, getNavHeaderTitle } from '../../src/config/navigation';

const ROOT = process.cwd();

describe('Phase 1 — UX Foundation & Responsive Architecture', () => {
  it('1. Source de vérité navigation unifiée (ordre, 6 espaces, aria-current)', () => {
    deepStrictEqual(
      NAV_ITEMS.map((i) => i.id),
      ['home', 'ai', 'knowledge', 'planner', 'opportunities', 'progress']
    );
    ok(getNavHeaderTitle('ai') === 'ELORA IA');

    const sidebar = fs.readFileSync(path.join(ROOT, 'src/components/layout/Sidebar.tsx'), 'utf-8');
    const bottomNav = fs.readFileSync(path.join(ROOT, 'src/components/layout/BottomNav.tsx'), 'utf-8');
    const header = fs.readFileSync(path.join(ROOT, 'src/components/layout/Header.tsx'), 'utf-8');

    ok(sidebar.includes('NAV_ITEMS') && sidebar.includes('aria-current'));
    ok(bottomNav.includes('NAV_ITEMS') && bottomNav.includes('aria-current'));
    ok(header.includes('getNavHeaderTitle'));
  });

  it('2. Compte & Sync + déconnexion mobile accessibles dans SettingsModal et ToastProvider monté', () => {
    const settings = fs.readFileSync(path.join(ROOT, 'src/components/layout/SettingsModal.tsx'), 'utf-8');
    const app = fs.readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf-8');

    ok(settings.includes('Compte & Sync') && settings.includes('logout') && settings.includes('OfflineQueue.getPendingCount()'));
    ok(settings.includes("setTheme('system')"));
    ok(app.includes('ToastProvider'));
  });

  it('3. Hauteurs 100dvh, safe areas et scroll unique des modales dans index.css', () => {
    const css = fs.readFileSync(path.join(ROOT, 'src/index.css'), 'utf-8');
    ok(css.includes('height: 100dvh;'), '.elora-main-wrapper doit utiliser 100dvh');
    ok(!css.includes('height: 100vh;'), 'Aucun height: 100vh ne doit subsister sur le wrapper');
    ok(css.includes('max-height: 90dvh;'), 'Modales bornées à 90dvh');
  });
});
