import { describe, it, beforeEach } from 'node:test';
import { ok, strictEqual } from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';

// Mock localStorage / window for Node jiti execution
const store = new Map<string, string>();
(globalThis as any).window = {
  localStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => {
      store.clear();
    },
  },
};
(globalThis as any).localStorage = (globalThis as any).window.localStorage;

import { EloraDB } from '../../src/lib/db/database';
import {
  createInitialFocusState,
  computeRemainingSeconds,
  computeElapsedMinutes,
  saveActiveFocusTimer,
  loadActiveFocusTimer,
  clearActiveFocusTimer,
  hasRecordedFocusSessionId,
  markFocusSessionIdRecorded,
  ACTIVE_FOCUS_STORAGE_KEY,
} from '../../src/lib/focus/focusTimer';

const ROOT = process.cwd();

describe('Phase 3 — Fiabilité de Progress & Focus', () => {
  beforeEach(() => {
    store.clear();
  });

  it('1. Permet de créer plusieurs objectifs, modifier, supprimer et gérer les jalons sans NaN', () => {
    EloraDB.saveGoals([
      {
        id: 'goal_1',
        title: 'Premier objectif',
        category: 'Projet',
        targetDate: '2026-12-01',
        progressPercentage: 0,
        milestones: [],
        completed: false,
      },
      {
        id: 'goal_2',
        title: 'Deuxième objectif',
        category: 'Apprentissage',
        targetDate: '2026-12-15',
        progressPercentage: 0,
        milestones: [],
        completed: false,
      },
    ]);

    strictEqual(EloraDB.getGoals().length, 2, 'Deux objectifs doivent coexister');

    // Modifier un objectif
    const afterUpdate = EloraDB.updateGoal('goal_1', {
      title: 'Premier objectif révisé',
      category: 'Carrière',
      targetDate: '2026-12-20',
    });
    const g1 = afterUpdate.find((g) => g.id === 'goal_1')!;
    strictEqual(g1.title, 'Premier objectif révisé');
    strictEqual(g1.category, 'Carrière');
    strictEqual(g1.targetDate, '2026-12-20');

    // Ajouter 2 jalons
    EloraDB.addMilestone('goal_1', 'Étape A');
    let goals = EloraDB.addMilestone('goal_1', 'Étape B');
    const milestones = goals.find((g) => g.id === 'goal_1')!.milestones;
    strictEqual(milestones.length, 2);

    // Modifier un jalon
    goals = EloraDB.updateMilestone('goal_1', milestones[0].id, 'Étape A mise à jour');
    strictEqual(goals.find((g) => g.id === 'goal_1')!.milestones[0].title, 'Étape A mise à jour');

    // Cocher le 1er jalon -> 50%
    goals = EloraDB.toggleMilestone('goal_1', milestones[0].id);
    strictEqual(goals.find((g) => g.id === 'goal_1')!.progressPercentage, 50);
    strictEqual(goals.find((g) => g.id === 'goal_1')!.completed, false);

    // Supprimer le 2e jalon -> 1/1 coché -> 100%
    goals = EloraDB.deleteMilestone('goal_1', milestones[1].id);
    strictEqual(goals.find((g) => g.id === 'goal_1')!.progressPercentage, 100);
    strictEqual(goals.find((g) => g.id === 'goal_1')!.completed, true);

    // Supprimer le dernier jalon -> 0% (pas NaN)
    goals = EloraDB.deleteMilestone('goal_1', milestones[0].id);
    strictEqual(goals.find((g) => g.id === 'goal_1')!.progressPercentage, 0);
    strictEqual(goals.find((g) => g.id === 'goal_1')!.completed, false);

    // Supprimer l'objectif
    goals = EloraDB.deleteGoal('goal_1');
    strictEqual(goals.length, 1);
    strictEqual(goals[0].id, 'goal_2');
  });

  it('2. Minuteur Focus basé sur horloge murale, persistant au rechargement et sans doublon', () => {
    const startMs = 1_700_000_000_000;
    const initial = createInitialFocusState(25, 'Réviser architecture');
    const running = {
      ...initial,
      status: 'running' as const,
      startedAtMs: startMs,
      endsAtMs: startMs + 25 * 60 * 1000,
    };

    saveActiveFocusTimer(running);
    ok(store.has(ACTIVE_FOCUS_STORAGE_KEY), 'Le minuteur actif doit être persisté dans localStorage');

    // Après 10 minutes exactes (aucune dérive JS)
    const after10MinMs = startMs + 10 * 60 * 1000;
    const reloadedMid = loadActiveFocusTimer(after10MinMs);
    strictEqual(reloadedMid.status, 'running');
    strictEqual(computeRemainingSeconds(reloadedMid, after10MinMs), 15 * 60);
    strictEqual(computeElapsedMinutes(reloadedMid, after10MinMs), 10);

    // Après expiration pendant un rechargement
    const after30MinMs = startMs + 30 * 60 * 1000;
    const reloadedDone = loadActiveFocusTimer(after30MinMs);
    strictEqual(reloadedDone.status, 'completed');
    strictEqual(computeRemainingSeconds(reloadedDone, after30MinMs), 0);

    // Garde anti-doublon d'enregistrement de session
    strictEqual(hasRecordedFocusSessionId(reloadedDone.sessionId), false);
    markFocusSessionIdRecorded(reloadedDone.sessionId);
    strictEqual(hasRecordedFocusSessionId(reloadedDone.sessionId), true);
  });

  it('3. Vérification des écrans Progress, Planner et AppContext', () => {
    const progressScreen = fs.readFileSync(
      path.join(ROOT, 'src/features/progress/ProgressScreen.tsx'),
      'utf-8'
    );
    const plannerScreen = fs.readFileSync(
      path.join(ROOT, 'src/features/planner/PlannerScreen.tsx'),
      'utf-8'
    );
    const appContext = fs.readFileSync(
      path.join(ROOT, 'src/context/AppContext.tsx'),
      'utf-8'
    );

    ok(progressScreen.includes('Nouvel objectif'), 'Création multi-objectifs disponible');
    ok(progressScreen.includes('deleteGoal') && progressScreen.includes('updateGoal'), 'Édition/suppression objectif');
    ok(
      progressScreen.includes('addMilestone') &&
        progressScreen.includes('updateMilestone') &&
        progressScreen.includes('deleteMilestone'),
      'CRUD complet des étapes'
    );

    ok(plannerScreen.includes('quickGoalId') && plannerScreen.includes('quickDueDate'), 'Liaison tâche -> objectif et échéance');
    ok(plannerScreen.includes('focusCompletedPendingSave'), 'Proposition d’enregistrement en fin de session');
    ok(plannerScreen.includes('useElapsedIfRunning'), 'Possibilité de terminer et enregistrer sans perte');

    ok(appContext.includes('deleteUserGoal'), 'Suppression synchronisée avec Firestore');
    ok(appContext.includes('hasRecordedFocusSessionId'), 'Protection anti-doublon dans AppContext');
    ok(appContext.includes('clearActiveFocusTimer()'), 'logout() doit nettoyer elora_active_focus');
  });

  it('4. clearActiveFocusTimer() empêche la réapparition d’une session active après déconnexion sans supprimer l’historique enregistré', () => {
    // 1. Enregistrer une session Focus terminée dans l'historique
    EloraDB.addFocusSession({
      goalTitle: 'Session terminée User A',
      durationMinutes: 25,
      notes: 'Terminée',
    });
    const historyBefore = EloraDB.getFocusSessions();
    ok(historyBefore.some((s) => s.goalTitle === 'Session terminée User A'));

    // 2. Démarrer une session active pour User A
    const startMs = 1_700_000_000_000;
    const runningA = {
      ...createInitialFocusState(45, 'Session privée User A'),
      status: 'running' as const,
      startedAtMs: startMs,
      endsAtMs: startMs + 45 * 60 * 1000,
    };
    saveActiveFocusTimer(runningA);
    ok(store.has(ACTIVE_FOCUS_STORAGE_KEY));

    // 3. Déconnexion : clearActiveFocusTimer() supprime elora_active_focus sans effacer l'historique Focus déjà enregistré
    clearActiveFocusTimer();
    strictEqual(store.has(ACTIVE_FOCUS_STORAGE_KEY), false);

    // 4. Reconnexion d'un autre utilisateur : aucune session active résiduelle de User A ne réapparaît
    const reloadedForUserB = loadActiveFocusTimer(startMs + 60_000);
    strictEqual(reloadedForUserB.status, 'idle');
    strictEqual(reloadedForUserB.durationMinutes, 25);
    ok(!reloadedForUserB.goalTitle.includes('User A'));

    // 5. L'historique Focus enregistré avant clearActiveFocusTimer() reste intact
    const historyAfter = EloraDB.getFocusSessions();
    ok(historyAfter.some((s) => s.goalTitle === 'Session terminée User A'));
  });
});
