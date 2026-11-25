import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  initialProfile,
  initialMemories,
  initialTasks,
  initialGoals,
  initialFocusSessions,
  initialKnowledge,
  initialOpportunities,
  initialConversations,
} from '../../src/lib/mockData';
import { ContextEngine } from '../../src/lib/context/ContextEngine';

const ROOT = process.cwd();

function runTests() {
  console.log('=== Tests Phase 18 : Production Readiness ===');

  // 1. Neutralisation des données personnelles du développeur
  assert.strictEqual(initialProfile.name, 'Étudiant');
  assert.strictEqual(initialProfile.email, '');
  assert.strictEqual(initialProfile.currentObjective, '');
  assert.deepStrictEqual(initialProfile.learningFocus, []);
  const serializedProfile = JSON.stringify(initialProfile).toLowerCase();
  assert.ok(!serializedProfile.includes('djima'), 'initialProfile ne doit pas contenir Djima');
  assert.ok(!serializedProfile.includes('hackathon'), 'initialProfile ne doit pas contenir hackathon');

  assert.strictEqual(initialMemories.length, 0, 'initialMemories doit être vide');
  assert.strictEqual(initialTasks.length, 0, 'initialTasks doit être vide');
  assert.strictEqual(initialGoals.length, 0, 'initialGoals doit être vide');
  assert.strictEqual(initialFocusSessions.length, 0, 'initialFocusSessions doit être vide');
  assert.strictEqual(initialKnowledge.length, 0, 'initialKnowledge doit être vide');
  assert.strictEqual(initialConversations.length, 0, 'initialConversations doit être vide');
  assert.strictEqual(
    initialOpportunities.length,
    0,
    'initialOpportunities doit être vide (aucun hackathon ni bourse fictive)'
  );
  console.log('✓ Neutralisation mockData.ts validée');

  // 2. Fallback ContextEngine sans 'Djima'
  const ctx = ContextEngine.buildContext(
    { prompt: 'Rappelle-moi mon profil' },
    {
      profile: { ...initialProfile, name: '' },
      memories: [],
      tasks: [],
      goals: [],
      focusSessions: [],
      docs: [],
    }
  );
  assert.ok(
    ctx.systemPromptBlock.includes('Étudiant'),
    `System prompt attendu avec Étudiant, reçu: ${ctx.systemPromptBlock}`
  );
  assert.ok(
    !ctx.systemPromptBlock.includes('Djima'),
    'ContextEngine ne doit plus jamais utiliser Djima par défaut'
  );
  console.log('✓ Fallback ContextEngine neutre validé');

  // 3. Protection de VITE_GEMINI_API_KEY contre l'exposition dans dist/
  const cloudProviderSrc = fs.readFileSync(
    path.join(ROOT, 'src/lib/ai/CloudAIProvider.ts'),
    'utf-8'
  );
  assert.ok(
    !cloudProviderSrc.includes('import.meta.env.VITE_GEMINI_API_KEY'),
    'CloudAIProvider.ts ne doit pas référencer import.meta.env.VITE_GEMINI_API_KEY'
  );
  assert.ok(
    cloudProviderSrc.includes('proc?.env?.VITE_GEMINI_API_KEY'),
    'CloudAIProvider.ts doit conserver le support process.env.VITE_GEMINI_API_KEY pour Node/test:live'
  );
  const firebaseConfigSrc = fs.readFileSync(
    path.join(ROOT, 'src/lib/firebase/config.ts'),
    'utf-8'
  );
  assert.ok(
    !firebaseConfigSrc.includes('import.meta.env['),
    'firebase/config.ts ne doit pas indexer dynamiquement import.meta.env[...], sinon Vite embarque toutes les variables VITE_* dans dist/'
  );
  console.log('✓ Protection VITE_GEMINI_API_KEY validée');

  // 4. Rafraîchissement automatique des dates relatives dans AIScreen.tsx
  const aiScreenSrc = fs.readFileSync(
    path.join(ROOT, 'src/features/ai/AIScreen.tsx'),
    'utf-8'
  );
  assert.ok(
    aiScreenSrc.includes('setInterval') && aiScreenSrc.includes('30_000'),
    'AIScreen.tsx doit rafraîchir les dates relatives toutes les 30s'
  );
  assert.ok(
    aiScreenSrc.includes('clearInterval'),
    'AIScreen.tsx doit nettoyer son timer avec clearInterval'
  );
  console.log('✓ Timer 30s AIScreen.tsx validé');

  // 5. Mention honnête sur OpportunitiesScreen.tsx
  const oppScreenSrc = fs.readFileSync(
    path.join(ROOT, 'src/features/opportunities/OpportunitiesScreen.tsx'),
    'utf-8'
  );
  assert.ok(
    oppScreenSrc.includes('Sélection curatée'),
    'OpportunitiesScreen.tsx doit afficher "Sélection curatée"'
  );
  assert.ok(
    !oppScreenSrc.includes('Informations 100% Vérifiées'),
    'OpportunitiesScreen.tsx ne doit plus afficher "Informations 100% Vérifiées"'
  );
  console.log('✓ Mention honnête OpportunitiesScreen.tsx validée');

  // 6. Phase 18C : Première conversation (aucun repli conv_1), suggestions étudiantes, inscription prénom, dev caché
  const appContextSrc = fs.readFileSync(
    path.join(ROOT, 'src/context/AppContext.tsx'),
    'utf-8'
  );
  assert.ok(
    !appContextSrc.includes("'conv_1'"),
    'AppContext.tsx ne doit plus contenir aucun repli vers conv_1'
  );
  assert.ok(
    appContextSrc.includes('effectiveConvId') && appContextSrc.includes('getPendingSignupDisplayName'),
    'AppContext.tsx doit créer la première conversation dans sendMessage et préserver le prénom à l\'inscription'
  );

  assert.ok(
    !aiScreenSrc.includes('#BuildHybridAI') && !aiScreenSrc.includes('Guide Firebase AI Logic'),
    'AIScreen.tsx ne doit plus exposer de suggestions Hackathon ou Firebase AI Logic'
  );
  assert.ok(
    aiScreenSrc.includes('Planifier ma semaine') &&
      aiScreenSrc.includes('Synthétiser un cours') &&
      aiScreenSrc.includes('Préparer un examen'),
    'AIScreen.tsx doit proposer des raccourcis adaptés aux étudiants'
  );

  const knowledgeSrc = fs.readFileSync(
    path.join(ROOT, 'src/features/knowledge/KnowledgeScreen.tsx'),
    'utf-8'
  );
  assert.ok(
    knowledgeSrc.includes("Cours d'algorithmique"),
    'KnowledgeScreen.tsx doit utiliser un placeholder étudiant neutre'
  );

  const settingsSrc = fs.readFileSync(
    path.join(ROOT, 'src/components/layout/SettingsModal.tsx'),
    'utf-8'
  );
  assert.ok(
    settingsSrc.includes('isDeveloperMode') && !settingsSrc.includes('#BuildHybridAI'),
    'SettingsModal.tsx doit masquer les outils développeur aux étudiants et ne pas mentionner #BuildHybridAI'
  );
  assert.ok(
    settingsSrc.includes("Domaines d'étude"),
    'SettingsModal.tsx doit permettre de modifier les domaines d\'étude'
  );
  console.log('✓ Correctifs Phase 18C validés');

  console.log('=== Tous les tests Phase 18 ont réussi ===');
}

runTests();
