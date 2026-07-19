import type { NotificationSeverity, NotifyInput } from './types';
import * as notificationQueue from './notificationQueue';
import type { EnqueueInput } from './notificationQueue';

/**
 * The public API every producer calls (ARCHITECTURE.md's "Notification
 * Service" §1/§2/§3). Thin — validates/defaults the input, then delegates
 * to the queue. Holds no state itself and never imports React or Zustand.
 * Deliberately does not re-export the queue module or getQueued() —
 * consumers (including the store) go through this service, not the queue
 * directly.
 */

const DEFAULT_DURATION_MS: Record<NotificationSeverity, number | null> = {
  success: 3000,
  info: 2500,
  warning: 6000,
  error: null,
};

function resolveInput(input: NotifyInput): EnqueueInput {
  return {
    title: input.title,
    message: input.message,
    severity: input.severity,
    duration: input.duration !== undefined ? input.duration : DEFAULT_DURATION_MS[input.severity],
    dismissible: input.dismissible ?? true,
    source: input.source,
    dedupeKey: input.dedupeKey,
    actions: input.actions,
  };
}

function notify(input: NotifyInput): string {
  return notificationQueue.enqueue(resolveInput(input));
}

type SeverityOmittedInput = Omit<NotifyInput, 'severity'>;

function success(input: SeverityOmittedInput): string {
  return notify({ ...input, severity: 'success' });
}

function error(input: SeverityOmittedInput): string {
  return notify({ ...input, severity: 'error' });
}

function warning(input: SeverityOmittedInput): string {
  return notify({ ...input, severity: 'warning' });
}

function info(input: SeverityOmittedInput): string {
  return notify({ ...input, severity: 'info' });
}

export const notificationService = {
  notify,
  success,
  error,
  warning,
  info,
  dismiss: notificationQueue.dismiss,
  clear: notificationQueue.clear,
  pause: notificationQueue.pause,
  resume: notificationQueue.resume,
  subscribe: notificationQueue.subscribe,
  getVisible: notificationQueue.getVisible,
};
