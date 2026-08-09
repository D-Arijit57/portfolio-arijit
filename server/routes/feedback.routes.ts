import { Router } from 'express';
import { submitFeedback } from '../services/feedbackService';
import { isFeedbackVerdict, type FeedbackVerdict } from '../types/feedback.types';
import { BadGatewayError, BadRequestError } from '../types';

export const feedbackRouter = Router();

const MAX_MESSAGE_LENGTH = 1000;

feedbackRouter.post('/feedback', async (req, res, next) => {
  try {
    const { verdict, message, hp } = req.body as { verdict?: unknown; message?: unknown; hp?: unknown };

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

    const trimmedMessage = typeof message === 'string' ? message.trim() : undefined;
    if (trimmedMessage && trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      throw new BadRequestError(`message must be ${MAX_MESSAGE_LENGTH} characters or fewer`);
    }

    const result = await submitFeedback({
      verdict: verdict as FeedbackVerdict,
      message: trimmedMessage || undefined,
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
