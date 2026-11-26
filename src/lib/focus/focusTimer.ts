export type FocusTimerStatus = 'idle' | 'running' | 'paused' | 'completed';

export interface ActiveFocusTimerState {
  sessionId: string;
  goalTitle: string;
  durationMinutes: number;
  status: FocusTimerStatus;
  endsAtMs: number | null;
  remainingSecondsWhenPaused: number;
  startedAtMs: number | null;
  recorded: boolean;
}

export const ACTIVE_FOCUS_STORAGE_KEY = 'elora_active_focus';
export const RECORDED_FOCUS_IDS_KEY = 'elora_recorded_focus_ids';

const DEFAULT_FOCUS_GOAL = "Finaliser l'architecture et les tests";

export function generateFocusSessionId(): string {
  return `focus_run_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function createInitialFocusState(
  durationMinutes = 25,
  goalTitle = DEFAULT_FOCUS_GOAL
): ActiveFocusTimerState {
  return {
    sessionId: generateFocusSessionId(),
    goalTitle,
    durationMinutes,
    status: 'idle',
    endsAtMs: null,
    remainingSecondsWhenPaused: durationMinutes * 60,
    startedAtMs: null,
    recorded: false,
  };
}

/**
 * Calcule les secondes restantes depuis l'horloge murale (Date.now())
 * pour éviter toute dérive liée aux intervalles JavaScript ou aux onglets inactifs.
 */
export function computeRemainingSeconds(
  state: ActiveFocusTimerState,
  nowMs: number = Date.now()
): number {
  if (state.status === 'completed') return 0;
  if (state.status === 'running' && state.endsAtMs !== null) {
    return Math.max(0, Math.ceil((state.endsAtMs - nowMs) / 1000));
  }
  return Math.max(0, Math.floor(state.remainingSecondsWhenPaused));
}

export function computeElapsedMinutes(
  state: ActiveFocusTimerState,
  nowMs: number = Date.now()
): number {
  if (state.status === 'completed') return state.durationMinutes;
  const totalSeconds = state.durationMinutes * 60;
  const remaining = computeRemainingSeconds(state, nowMs);
  const elapsedSeconds = Math.max(0, totalSeconds - remaining);
  return Math.max(1, Math.round(elapsedSeconds / 60));
}

export function loadActiveFocusTimer(nowMs: number = Date.now()): ActiveFocusTimerState {
  if (typeof window === 'undefined') {
    return createInitialFocusState();
  }
  try {
    const raw = window.localStorage.getItem(ACTIVE_FOCUS_STORAGE_KEY);
    if (!raw) return createInitialFocusState();
    const parsed = JSON.parse(raw) as Partial<ActiveFocusTimerState>;
    const durationMinutes =
      typeof parsed.durationMinutes === 'number' && parsed.durationMinutes > 0
        ? parsed.durationMinutes
        : 25;
    const base: ActiveFocusTimerState = {
      sessionId: typeof parsed.sessionId === 'string' && parsed.sessionId ? parsed.sessionId : generateFocusSessionId(),
      goalTitle: typeof parsed.goalTitle === 'string' ? parsed.goalTitle : DEFAULT_FOCUS_GOAL,
      durationMinutes,
      status:
        parsed.status === 'running' || parsed.status === 'paused' || parsed.status === 'completed'
          ? parsed.status
          : 'idle',
      endsAtMs: typeof parsed.endsAtMs === 'number' ? parsed.endsAtMs : null,
      remainingSecondsWhenPaused:
        typeof parsed.remainingSecondsWhenPaused === 'number'
          ? parsed.remainingSecondsWhenPaused
          : durationMinutes * 60,
      startedAtMs: typeof parsed.startedAtMs === 'number' ? parsed.startedAtMs : null,
      recorded: Boolean(parsed.recorded),
    };

    if (base.status === 'running' && computeRemainingSeconds(base, nowMs) === 0) {
      return {
        ...base,
        status: 'completed',
        endsAtMs: null,
        remainingSecondsWhenPaused: 0,
      };
    }

    return base;
  } catch {
    return createInitialFocusState();
  }
}

export function saveActiveFocusTimer(state: ActiveFocusTimerState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ACTIVE_FOCUS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}

export function clearActiveFocusTimer(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(ACTIVE_FOCUS_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

export function hasRecordedFocusSessionId(sessionId: string): boolean {
  if (typeof window === 'undefined' || !sessionId) return false;
  try {
    const raw = window.localStorage.getItem(RECORDED_FOCUS_IDS_KEY);
    if (!raw) return false;
    const ids = JSON.parse(raw) as string[];
    return Array.isArray(ids) && ids.includes(sessionId);
  } catch {
    return false;
  }
}

export function markFocusSessionIdRecorded(sessionId: string): void {
  if (typeof window === 'undefined' || !sessionId) return;
  try {
    const raw = window.localStorage.getItem(RECORDED_FOCUS_IDS_KEY);
    const existing = raw ? (JSON.parse(raw) as string[]) : [];
    const next = Array.isArray(existing) ? existing : [];
    if (!next.includes(sessionId)) {
      const trimmed = [sessionId, ...next].slice(0, 30);
      window.localStorage.setItem(RECORDED_FOCUS_IDS_KEY, JSON.stringify(trimmed));
    }
  } catch {
    // Ignore
  }
}
