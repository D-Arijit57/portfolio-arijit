import { Resend } from 'resend';
import type { FeedbackSubmission } from '../types';

const VERDICT_LABEL: Record<FeedbackSubmission['verdict'], string> = {
  positive: 'Loved it',
  neutral: 'Good',
  negative: 'Could be better',
};

/**
 * Thrown for any failure this client can produce — network, non-2xx,
 * Resend's own reported error. feedbackService.ts is what decides how
 * that affects the HTTP response (BadGatewayError); this client only
 * classifies and reports, same split as githubApiClient.ts's
 * GitHubApiClientError.
 */
export class ResendClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ResendClientError';
  }
}

/**
 * Sends one Review submission as a notification email. `from` uses
 * Resend's shared test sender (onboarding@resend.dev), which is
 * account-restricted to sending only to the account owner's own verified
 * address — correct here since `to` (FEEDBACK_TO_EMAIL) is that same
 * address, and it avoids requiring a verified custom domain for a feature
 * that only ever notifies one person. Move to a verified domain sender if
 * that restriction changes or a different `to` is ever needed. This
 * restriction is also exactly why the visitor's own email can never become
 * `from` — it isn't just a policy choice, Resend's shared sender wouldn't
 * accept it as one.
 *
 * `submission.name`/`submission.email` are plain-text `text` body content
 * only — never interpolated into `subject` (still derived from `verdict`
 * alone) or any header. `submission.email`, once feedback.routes.ts has
 * validated it, becomes Resend's own structured `replyTo` field (never
 * string-concatenated into a raw header), spread in only when present so an
 * anonymous submission's request carries no `replyTo` key at all rather
 * than `replyTo: undefined` (Identity + Reply requirements iteration §11).
 *
 * No IP, no analytics, no inferred information — the email states exactly
 * what was submitted (and by whom, if they said) and when the server
 * received it (contact.sh spec §13/§17), nothing else.
 */
export async function sendFeedbackEmail(
  submission: FeedbackSubmission,
  opts: { apiKey: string; to: string },
): Promise<void> {
  const resend = new Resend(opts.apiKey);
  const label = VERDICT_LABEL[submission.verdict];

  const lines = [`Verdict: ${label}`];
  if (submission.name) lines.push(`Reviewer: ${submission.name}`);
  if (submission.email) lines.push(`Email: ${submission.email}`);
  if (submission.message) lines.push(`Message: ${submission.message}`);
  lines.push(`Submitted: ${submission.submittedAt}`);

  const { error } = await resend.emails.send({
    from: 'Portfolio Feedback <onboarding@resend.dev>',
    to: opts.to,
    subject: `[portfolio] ${label}`,
    text: lines.join('\n'),
    ...(submission.email ? { replyTo: submission.email } : {}),
  });

  if (error) {
    throw new ResendClientError(error.message ?? 'Resend returned an error');
  }
}
