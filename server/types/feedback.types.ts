/**
 * Named `verdict`, not `sentiment` — a verdict is something a visitor
 * explicitly declares; sentiment is a word for something inferred. Nothing
 * in this feature infers anything (VFS_DESIGN.md's privacy discipline,
 * applied to feedback: only explicit submissions ever count).
 */
export type FeedbackVerdict = 'positive' | 'neutral' | 'negative';

export const FEEDBACK_VERDICTS: readonly FeedbackVerdict[] = ['positive', 'neutral', 'negative'];

export function isFeedbackVerdict(value: unknown): value is FeedbackVerdict {
  return typeof value === 'string' && (FEEDBACK_VERDICTS as readonly string[]).includes(value);
}

export interface FeedbackSubmission {
  verdict: FeedbackVerdict;
  message?: string;
  /** Optional identity — validated in feedback.routes.ts, never trusted as-is. */
  name?: string;
  /** Optional — validated in feedback.routes.ts. Used only as Resend's
   * structured Reply-To (resendClient.ts); never becomes From. */
  email?: string;
  /** Server-generated ISO 8601 — never taken from the client (contact.sh spec §12). */
  submittedAt: string;
}
