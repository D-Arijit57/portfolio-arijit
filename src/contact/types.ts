/**
 * The Review's verdict type — client-side copy of server/types/feedback.types.ts's
 * FeedbackVerdict, duplicated rather than shared for the same reason
 * VirtualFile is duplicated between src/types/index.ts and
 * server/types/vfs.types.ts: this backend is decoupled from the frontend
 * by design (BACKEND_BOOTSTRAP.md), so no type crosses that boundary by
 * import, only by the wire contract both sides agree to.
 *
 * Named `verdict`, not `sentiment` — sentiment is a word for something
 * inferred (from text, from behavior); a verdict is something a person
 * explicitly declares. Nothing about this feature infers anything.
 */
export type FeedbackVerdict = 'positive' | 'neutral' | 'negative';

export const VERDICT_LABEL: Record<FeedbackVerdict, string> = {
  positive: 'Loved it',
  neutral: 'Good',
  negative: 'Could be better',
};

export interface FeedbackSubmissionInput {
  verdict: FeedbackVerdict;
  message?: string;
  /** Honeypot — always sent empty by a real visitor; never read as legitimate data. */
  hp?: string;
}
