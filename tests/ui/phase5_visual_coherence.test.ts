import { describe, it } from 'node:test';
import { ok } from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT = process.cwd();

describe('Phase 5 — Identité Visuelle, Design System & Cohérence Globale', () => {
  it('1. Logo SVG original ELORA présent et intégré dans Sidebar, Header et favicon', () => {
    const logoPath = path.join(ROOT, 'src/components/ui/EloraLogo.tsx');
    ok(fs.existsSync(logoPath), 'EloraLogo.tsx doit exister');
    const logoSrc = fs.readFileSync(logoPath, 'utf-8');
    ok(logoSrc.includes('<svg') && logoSrc.includes('viewBox="0 0 32 32"'), 'Logo SVG vectoriel requis');

    const sidebar = fs.readFileSync(path.join(ROOT, 'src/components/layout/Sidebar.tsx'), 'utf-8');
    const header = fs.readFileSync(path.join(ROOT, 'src/components/layout/Header.tsx'), 'utf-8');
    ok(sidebar.includes('<EloraLogo'), 'Sidebar doit utiliser EloraLogo');
    ok(header.includes('<EloraLogo'), 'Header doit utiliser EloraLogo');

    const favicon = fs.readFileSync(path.join(ROOT, 'public/favicon.svg'), 'utf-8');
    ok(favicon.includes('#8B5E1A') && favicon.includes('#FAF8F5'), 'Favicon harmonisé avec la palette ELORA');
    ok(!favicon.includes('#863bff'), 'Ancien favicon violet générique supprimé');
  });

  it('2. Palette WCAG AA, zones tactiles >= 44px et nettoyage CSS sans casser Tailwind', () => {
    const css = fs.readFileSync(path.join(ROOT, 'src/index.css'), 'utf-8');

    ok(css.includes('@import "tailwindcss";'), 'Tailwind CSS préservé');
    ok(css.includes('--color-accent: #8B5E1A;'), 'Couleur accent WCAG AA définie');
    ok(css.includes('--color-text-muted: #5E584F;'), 'Couleur texte secondaire WCAG AA définie');
    ok(css.includes('min-height: 44px;'), 'Zone tactile mobile >= 44px sur la navigation inférieure');

    ok(!css.includes('.elora-page-shell'), 'Classes CSS inutilisées nettoyées');
    ok(!css.includes('.floating-composer-shell'), 'Ancien composer CSS inutilisé nettoyé');
    ok(!css.includes('.diag-flags-banner'), 'Ancienne bannière diagnostic CSS inutilisée nettoyée');
  });

  it('3. Métadonnées HTML et manifeste PWA harmonisés', () => {
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf-8');
    const manifest = fs.readFileSync(path.join(ROOT, 'public/manifest.webmanifest'), 'utf-8');

    ok(!html.includes('#BuildHybridAI'), 'Tag hackathon retiré de la description HTML');
    ok(manifest.includes('"background_color": "#FAF8F5"'), 'Manifeste aligné sur le fond clair ivoire');
    ok(manifest.includes('"theme_color": "#8B5E1A"'), 'Manifeste aligné sur la couleur accent ELORA');
  });
});
