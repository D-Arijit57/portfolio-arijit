import type { Notification } from './types';

/**
 * Module-level, not store state (ARCHITECTURE.md's "Notification Service"
 * §2) — the queue is authoritative; the Zustand store only mirrors it via
 * subscribe(). Owns ordering, the visible-window bound, overflow, dedupe,
 * and every auto-dismiss timer. Knows nothing about React or rendering.
 */

/** Internal handoff shape between NotificationService and the queue — Notification minus the fields the queue itself assigns. */
export type EnqueueInput = Omit<Notification, 'id' | 'timestamp'>;

const MAX_VISIBLE = 3;

let visible: Notification[] = [];
let backlog: Notification[] = [];

interface TimerState {
  remainingMs: number;
  timeoutId: ReturnType<typeof setTimeout> | null;
  startedAt: number | null;
}
const timerStates = new Map<string, TimerState>();

const listeners = new Set<() => void>();

function notifyListeners(): void {
  listeners.forEach((listener) => listener());
}

function generateId(): string {
  return `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function scheduleTimer(id: string, remainingMs: number): void {
  const timeoutId = setTimeout(() => {
    timerStates.delete(id);
    dismiss(id);
  }, remainingMs);
  timerStates.set(id, { remainingMs, timeoutId, startedAt: Date.now() });
}

function clearScheduledTimer(id: string): void {
  const state = timerStates.get(id);
  if (state?.timeoutId !== null && state?.timeoutId !== undefined) {
    clearTimeout(state.timeoutId);
  }
  timerStates.delete(id);
}

function findActiveByDedupeKey(dedupeKey: string): Notification | undefined {
  return visible.find((n) => n.dedupeKey === dedupeKey) ?? backlog.find((n) => n.dedupeKey === dedupeKey);
}

export function enqueue(input: EnqueueInput): string {
  if (input.dedupeKey) {
    const existing = findActiveByDedupeKey(input.dedupeKey);
    if (existing) {
      existing.timestamp = Date.now();
      if (visible.includes(existing) && existing.duration !== null) {
        scheduleTimer(existing.id, existing.duration);
      }
      notifyListeners();
      return existing.id;
    }
  }

  const notification: Notification = {
    id: generateId(),
    timestamp: Date.now(),
    ...input,
  };

  if (visible.length < MAX_VISIBLE) {
    visible.push(notification);
  } else {
    // Overflow: the new arrival always takes a visible slot immediately;
    // the least-recently-added visible notification is demoted to the
    // front of the backlog (it's still older than anything already
    // waiting there) rather than dismissed — nothing is ever silently
    // dropped.
    const demoted = visible.shift();
    if (demoted) {
      clearScheduledTimer(demoted.id);
      backlog.unshift(demoted);
    }
    visible.push(notification);
  }

  if (notification.duration !== null) {
    scheduleTimer(notification.id, notification.duration);
  }

  notifyListeners();
  return notification.id;
}

export function dismiss(id: string): void {
  clearScheduledTimer(id);

  const visibleIndex = visible.findIndex((n) => n.id === id);
  if (visibleIndex !== -1) {
    visible.splice(visibleIndex, 1);
    const promoted = backlog.shift();
    if (promoted) {
      visible.push(promoted);
      if (promoted.duration !== null) {
        scheduleTimer(promoted.id, promoted.duration);
      }
    }
    notifyListeners();
    return;
  }

  const backlogIndex = backlog.findIndex((n) => n.id === id);
  if (backlogIndex !== -1) {
    backlog.splice(backlogIndex, 1);
    notifyListeners();
  }
}

export function clear(): void {
  for (const n of [...visible, ...backlog]) {
    clearScheduledTimer(n.id);
  }
  visible = [];
  backlog = [];
  notifyListeners();
}

/** No-op for a sticky notification (no timer) or one that's already paused/not visible. */
export function pause(id: string): void {
  const state = timerStates.get(id);
  if (!state || state.timeoutId === null || state.startedAt === null) return;

  clearTimeout(state.timeoutId);
  const elapsed = Date.now() - state.startedAt;
  const remainingMs = Math.max(0, state.remainingMs - elapsed);
  timerStates.set(id, { remainingMs, timeoutId: null, startedAt: null });
  notifyListeners();
}

/** No-op if the notification isn't currently paused. */
export function resume(id: string): void {
  const state = timerStates.get(id);
  if (!state || state.timeoutId !== null) return;

  scheduleTimer(id, state.remainingMs);
  notifyListeners();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getVisible(): readonly Notification[] {
  return visible;
}

export function getQueued(): readonly Notification[] {
  return backlog;
}
