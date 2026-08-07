/**
 * The single source of truth for cortexa.md's three-terminal narrative.
 *
 * The page's whole premise is that the terminals genuinely depend on each
 * other rather than animating in sequence: problem.sh derives CONSTRAINT,
 * cortexa.sh justifies every DECISION against that same constraint, and
 * run-cortexa's REPLAY_EVENTS are the observed evidence each decision
 * produced. That last relationship is why decisions and events live in one
 * module — every event names the decision it came from (`decision`), so the
 * hover-linking between the two terminals can never drift out of sync with
 * the copy.
 */

export type DecisionId = 'scheduling' | 'identity' | 'video' | 'state' | 'exec';

/** Emitted by problem.sh, consumed by cortexa.sh, reported against by the
 * replay's closing line — the value the connectors actually carry. */
export const CONSTRAINT = 'one session, one source of truth';

export interface Decision {
  id: DecisionId;
  /** The concern being decided — deliberately lowercase, log-style. */
  concern: string;
  chosen: string;
  rejected: string;
  /** Why the alternative lost. Kept to one or two words so the five rows
   * align into a scannable column at the left panel's real width (~51
   * characters at 13px) — the depth lives in the pairing itself, not in
   * prose. */
  reason: string;
}

export const DECISIONS: Decision[] = [
  { id: 'scheduling', concern: 'scheduling', chosen: 'Convex', rejected: 'cron+Postgres', reason: 'realtime' },
  { id: 'identity', concern: 'identity', chosen: 'Clerk', rejected: 'custom auth', reason: 'roles' },
  { id: 'video', concern: 'video', chosen: 'Stream', rejected: 'raw WebRTC', reason: 'recording' },
  { id: 'state', concern: 'shared state', chosen: 'Convex', rejected: 'REST polling', reason: 'one store' },
  { id: 'exec', concern: 'code exec', chosen: 'judge worker', rejected: 'browser eval', reason: 'sandbox' },
];

/**
 * The page's one piece of honest engineering hindsight, sitting with the
 * decisions it qualifies. Deliberately an accepted architectural tradeoff
 * rather than an unfinished feature — the point is to show that the
 * managed-service choices above were a conscious cost/velocity call, not
 * to imply anything is missing.
 *
 * Pre-wrapped rather than free-flowing so the `#` prefix survives on every
 * line, the way a real comment block reads in a terminal.
 */
export const TRADEOFF_NOTE = [
  'tradeoff: managed services were preferred over',
  'self-hosted infrastructure to optimize',
  'development speed and reduce operational',
  'complexity during early product iterations.',
];

export interface ReplayEvent {
  time: string;
  event: string;
  detail: string;
  /** Right-aligned measurement — the thing that makes a log read as a real
   * trace rather than a scripted status line. */
  meta?: string;
  /** Which decision produced this observation. Drives the hover link. */
  decision: DecisionId;
}

// A recorded session replayed, not a server booting — so timestamps advance
// unevenly across ~47 real minutes, which is what a genuine trace looks
// like and what makes the compression at the end mean something.
export const REPLAY_EVENTS: ReplayEvent[] = [
  { time: '08:55:12', event: 'session.scheduled', detail: 'slot confirmed, both parties notified', decision: 'scheduling' },
  { time: '09:00:00', event: 'session.created', detail: 'candidate + interviewer paired', meta: 'roles applied', decision: 'identity' },
  { time: '09:00:04', event: 'room.opened', detail: 'video ready', meta: '412ms', decision: 'video' },
  { time: '09:02:31', event: 'editor.sync', detail: '2 clients, shared buffer', meta: 'realtime', decision: 'state' },
  { time: '09:14:09', event: 'judge.verdict', detail: 'passed 11 / 12 tests', meta: '1.4s', decision: 'exec' },
  { time: '09:41:55', event: 'session.closed', detail: 'recording persisted', meta: '38 MB', decision: 'video' },
];

export const REPLAY_SUMMARY = '46m 43s replayed in 3s';

/**
 * Names only, rendered as a single wrapped metadata row beside `stack`.
 * The replay above already demonstrated each of these end to end, so
 * spelling out what they *do* a second time would be the restatement this
 * page spent several passes removing — they earn their place here as
 * scannable keywords in the file's metadata, nothing more.
 */
export const CAPABILITIES = [
  'scheduling',
  'live interview',
  'coding workspace',
  'evaluation',
  'recording',
  'access control',
];
