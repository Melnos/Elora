import { describe, it } from 'node:test';
import { ok, strictEqual } from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT = process.cwd();

describe('Phase 2 — Conversation UX & Fiabilité (AIScreen & Markdown)', () => {
  it('1. Scroll intelligent, composer flex sans chevauchement et support .docx', () => {
    const aiScreen = fs.readFileSync(path.join(ROOT, 'src/features/ai/AIScreen.tsx'), 'utf-8');
    const css = fs.readFileSync(path.join(ROOT, 'src/index.css'), 'utf-8');

    ok(aiScreen.includes('isUserNearBottomRef'), 'Scroll intelligent requis');
    ok(aiScreen.includes('Revenir en bas'), 'Bouton de retour en bas requis');
    ok(aiScreen.includes('.docx'), 'Support .docx requis dans le sélecteur');
    ok(aiScreen.includes('msg.attachments'), 'Affichage des fichiers joints dans les messages utilisateur');
    ok(!aiScreen.includes('pb-40 lg:pb-32'), 'Plus de padding-bottom absolu rigide');
    ok(css.includes('.elora-content-viewport.ai-viewport'), 'Conteneur AI viewport dédié');
  });

  it('2. Sources cliquables et séparation modèle / mode / actions sur les réponses', () => {
    const aiScreen = fs.readFileSync(path.join(ROOT, 'src/features/ai/AIScreen.tsx'), 'utf-8');
    const appContext = fs.readFileSync(path.join(ROOT, 'src/context/AppContext.tsx'), 'utf-8');

    ok(aiScreen.includes('hasExternalUrl') && aiScreen.includes('ExternalLink'), 'Sources cliquables avec URL réelle');
    ok(aiScreen.includes("Barre d'actions dédiée sur les réponses assistant"), 'Actions séparées des métadonnées');
    ok(appContext.includes('attachments:'), 'Persistance des métadonnées de pièces jointes sur userMsg');
  });

  it('3. Rendu Markdown étendu (tableaux, liens sécurisés, listes, emphase)', () => {
    const md = fs.readFileSync(path.join(ROOT, 'src/features/ai/markdownRenderer.tsx'), 'utf-8');
    ok(md.includes('<table'), 'Support des tableaux Markdown');
    ok(md.includes('isSafeHttpUrl'), 'Validation des URLs http/https uniquement');
    ok(md.includes('<em'), 'Support de l\'emphase *italique*');
    ok(md.includes('orderedMatch'), 'Support des listes numérotées');
    strictEqual(md.includes('dangerouslySetInnerHTML'), false, 'Aucun HTML brut non sécurisé');
  });
});
