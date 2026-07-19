/**
 * Notification model — frozen shape per ARCHITECTURE.md's "Notification
 * Service" §4. Pure TypeScript; no React, no Zustand.
 */

export type NotificationSeverity = 'success' | 'info' | 'warning' | 'error';

export interface NotificationAction {
  label: string;
  onSelect: () => void;
}

export interface Notification {
  id: string;
  title: string;
  message?: string;
  severity: NotificationSeverity;
  timestamp: number;
  /** ms until auto-dismiss; null = sticky, dismissed only by user action or clear(). */
  duration: number | null;
  /** Whether a manual close (✕) button renders. */
  dismissible: boolean;
  /** Free-form producer label ('Save Pipeline', 'Hydration', 'GitHub', ...) — not a fixed union, same reasoning SearchResult.namespace uses. */
  source: string;
  /** Optional coalescing key — a new notify() call reusing an active id's dedupeKey refreshes it instead of stacking a duplicate. */
  dedupeKey?: string;
  /** Reserved, not implemented this sprint — buttons like Undo/Retry/Open File render from this once a future sprint adds it. */
  actions?: NotificationAction[];
}

export interface NotifyInput
  extends Partial<Pick<Notification, 'message' | 'duration' | 'dismissible' | 'dedupeKey' | 'actions'>>,
    Pick<Notification, 'title' | 'severity' | 'source'> {}
