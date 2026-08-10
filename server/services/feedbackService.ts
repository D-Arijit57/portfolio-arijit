import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { sendFeedbackEmail } from '../email/resendClient.js';
import type { FeedbackSubmission } from '../types/index.js';

export type SubmitFeedbackResult =
  | { status: 'sent' }
  | { status: 'unconfigured' }
  | { status: 'delivery-failed' };

/**
 * Business logic for one Review submission — same "route layer stays thin,
 * this owns the decision" split FileSystemService has with fs.routes.ts.
 * The only policy here: an unconfigured Resend degrades to 'unconfigured'
 * rather than throwing, so feedback.routes.ts can return 503 without ever
 * touching backend boot — mirrors GitHubProvider's unconfigured-username
 * degrade (VFS_DESIGN.md §11.4), applied to an outbound side effect
 * instead of an inbound content source.
 */
export async function submitFeedback(submission: FeedbackSubmission): Promise<SubmitFeedbackResult> {
  if (!config.resendApiKey || !config.feedbackToEmail) {
    logger.warn('Feedback submitted but Resend is not configured — dropping', { verdict: submission.verdict });
    return { status: 'unconfigured' };
  }

  try {
    await sendFeedbackEmail(submission, { apiKey: config.resendApiKey, to: config.feedbackToEmail });
    return { status: 'sent' };
  } catch (err) {
    logger.error('Failed to send feedback email', { message: err instanceof Error ? err.message : String(err) });
    return { status: 'delivery-failed' };
  }
}
