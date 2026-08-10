import { Router } from 'express';
import { submitFeedback } from '../services/feedbackService.js';
import { isFeedbackVerdict, type FeedbackVerdict } from '../types/feedback.types.js';
import { BadGatewayError, BadRequestError } from '../types/index.js';

export const feedbackRouter = Router();

const MAX_MESSAGE_LENGTH = 1000;
const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 254;
// Basic shape check, not a full RFC 5322 parser — "reject garbage," not
// "prove deliverability" (Identity + Reply requirements iteration §8/§10).
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CRLF = /[\r\n]/;

feedbackRouter.post('/feedback', async (req, res, next) => {
  try {
    const { verdict, message, name, email, hp } = req.body as {
      verdict?: unknown;
      message?: unknown;
      name?: unknown;
      email?: unknown;
      hp?: unknown;
    };

    // Honeypot: a real visitor never fills this in. Silently accept and
    // send nothing — the response is indistinguishable from a real
    // submission, so a bot never learns it was caught (contact.sh spec §16).
    if (typeof hp === 'string' && hp.trim().length > 0) {
      res.status(201).json({ ok: true });
      return;
    }

    if (!isFeedbackVerdict(verdict)) {
      throw new BadRequestError('verdict must be one of "positive", "neutral", "negative"');
    }
    if (message !== undefined && typeof message !== 'string') {
      throw new BadRequestError('message must be a string');
    }
    if (name !== undefined && typeof name !== 'string') {
      throw new BadRequestError('name must be a string');
    }
    if (email !== undefined && typeof email !== 'string') {
      throw new BadRequestError('email must be a string');
    }

    const trimmedMessage = typeof message === 'string' ? message.trim() : undefined;
    if (trimmedMessage && trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      throw new BadRequestError(`message must be ${MAX_MESSAGE_LENGTH} characters or fewer`);
    }

    const trimmedName = typeof name === 'string' ? name.trim() : undefined;
    if (trimmedName && trimmedName.length > MAX_NAME_LENGTH) {
      throw new BadRequestError(`name must be ${MAX_NAME_LENGTH} characters or fewer`);
    }

    // CRLF is checked on the trimmed value independently of the shape check
    // below — trim() only strips leading/trailing whitespace, so an embedded
    // "\r\n" in the middle of the string survives it and needs its own
    // rejection before this value ever reaches Resend's replyTo field
    // (defense in depth alongside that field already being structured, not
    // header-concatenated — Identity + Reply requirements iteration §9).
    const trimmedEmail = typeof email === 'string' ? email.trim() : undefined;
    if (trimmedEmail) {
      if (CRLF.test(trimmedEmail)) {
        throw new BadRequestError('email must not contain line breaks');
      }
      if (trimmedEmail.length > MAX_EMAIL_LENGTH) {
        throw new BadRequestError(`email must be ${MAX_EMAIL_LENGTH} characters or fewer`);
      }
      if (!EMAIL_SHAPE.test(trimmedEmail)) {
        throw new BadRequestError('email must be a valid email address');
      }
    }

    const result = await submitFeedback({
      verdict: verdict as FeedbackVerdict,
      message: trimmedMessage || undefined,
      name: trimmedName || undefined,
      email: trimmedEmail || undefined,
      // Server-generated — the client's clock/claim is never trusted (spec §12).
      submittedAt: new Date().toISOString(),
    });

    if (result.status === 'unconfigured') {
      res.status(503).json({ error: 'Feedback is not configured' });
      return;
    }
    if (result.status === 'delivery-failed') {
      throw new BadGatewayError('Failed to send feedback');
    }

    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});
