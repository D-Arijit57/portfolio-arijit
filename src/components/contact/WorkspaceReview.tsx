import React, { useEffect, useId, useState } from 'react';
import { submitFeedback } from '../../lib/api/feedbackClient';
import { VERDICT_LABEL, type FeedbackVerdict } from '../../contact/types';

const SESSION_KEY = 'contact-review-submitted';
const MAX_MESSAGE_LENGTH = 1000;
const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 254;
const COUNTER_THRESHOLD = 800;
const VERDICTS: FeedbackVerdict[] = ['positive', 'neutral', 'negative'];

type SendState = 'idle' | 'sending' | 'error';

function alreadySubmittedThisSession(): boolean {
  try {
    return window.sessionStorage.getItem(SESSION_KEY) === '1';
  } catch {
    return false; // sessionStorage unavailable (private mode, etc.) — just re-ask, never crash the page over it.
  }
}

function markSubmitted(): void {
  try {
    window.sessionStorage.setItem(SESSION_KEY, '1');
  } catch {
    // Same tolerance as the read above — not persisting across a reload is a minor UX cost, not a bug worth surfacing.
  }
}

/**
 * The Review — "leave something behind," the optional inverse of the
 * Handoff's "take something with you." Deliberately not another card, not
 * another terminal pane, not a star rating: a single vertical accent rule
 * (the "review gutter") on the left of the content is its entire visual
 * identity, matching Phase 6B's brief precisely. At rest it is one
 * question and three buttons — the textarea below doesn't exist in the
 * DOM until a verdict is chosen (see `selected`), so an uninterested
 * visitor sees four short lines and nothing resembling a form.
 *
 * Identity (name/email, Identity + Reply requirements iteration) reveals in
 * that same step, not a second one — no checkbox gate, no extra screen.
 * Both stay fully optional; anonymous feedback (verdict, or verdict +
 * message) works exactly as it did before this existed. A visitor who adds
 * an email gets a direct reply channel (feedback.routes.ts validates it,
 * resendClient.ts uses it only as Resend's structured Reply-To, never as
 * From) — see those files' own comments for the server-side half.
 *
 * No optimistic success anywhere in this component: `success` is only
 * ever set inside the branch where feedbackClient.submitFeedback()
 * returned `{ status: 'success' }`, i.e. a real 2xx from the server.
 */
export function WorkspaceReview() {
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [verdict, setVerdict] = useState<FeedbackVerdict | null>(null);
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [sendState, setSendState] = useState<SendState>('idle');
  const [announcement, setAnnouncement] = useState('');
  const groupId = useId();
  const textareaId = useId();
  const nameId = useId();
  const emailId = useId();

  useEffect(() => {
    setAlreadySubmitted(alreadySubmittedThisSession());
  }, []);

  if (alreadySubmitted) {
    return (
      <div className="border-l-2 border-[#3fb950] pl-4">
        <p className="text-[13px] text-[#cccccc]">Review sent. Thank you — that's genuinely useful.</p>
      </div>
    );
  }

  const handleSelect = (next: FeedbackVerdict) => {
    setVerdict(next);
    setSendState('idle'); // changing verdict after a failed send clears the error state, not the typed message
  };

  const handleSend = async () => {
    if (!verdict || sendState === 'sending') return;
    setSendState('sending');
    const result = await submitFeedback({
      verdict,
      message: message.trim() || undefined,
      name: name.trim() || undefined,
      email: email.trim() || undefined,
      hp: honeypot,
    });

    if (result.status === 'success') {
      markSubmitted();
      setAlreadySubmitted(true);
      setAnnouncement('Review sent — thank you.');
      return;
    }

    // Every non-success outcome (network error, HTTP error, or 503
    // unconfigured) lands here — message and verdict are left exactly as
    // typed, per contact.sh's honesty requirement: never clear input on
    // failure.
    setSendState('error');
    setAnnouncement("Couldn't send review. Please try again.");
  };

  return (
    <div className="border-l-2 border-[#3c3c3c] pl-4">
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>

      <div className="flex items-baseline justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-[#858585]">Review</h2>
        <span className="text-[11px] text-[#6e7681]">optional</span>
      </div>

      <p className="mt-3 text-[13px] text-[#cccccc]">How was the workspace?</p>

      <div role="radiogroup" aria-label="How was the workspace?" className="mt-2.5 flex flex-wrap gap-2">
        {VERDICTS.map((v) => (
          <label
            key={v}
            className={`min-h-[44px] cursor-pointer select-none rounded border px-3 py-2 text-[12.5px] transition-colors focus-within:ring-2 focus-within:ring-[#569cd6] ${
              verdict === v
                ? 'border-[#569cd6] bg-[#569cd6]/10 text-white'
                : 'border-[#3c3c3c] text-[#cccccc] hover:border-[#4d4d4d]'
            }`}
          >
            <input
              type="radio"
              name={`review-verdict-${groupId}`}
              value={v}
              checked={verdict === v}
              onChange={() => handleSelect(v)}
              className="sr-only"
            />
            {VERDICT_LABEL[v]}
          </label>
        ))}
      </div>

      {verdict && (
        <div className="mt-3">
          <label htmlFor={textareaId} className="block text-[11px] text-[#858585]">
            Anything you'd change? (optional)
          </label>
          <textarea
            id={textareaId}
            rows={4}
            maxLength={MAX_MESSAGE_LENGTH}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            className="mt-1.5 w-full resize-none rounded border border-[#3c3c3c] bg-[#141414] px-2.5 py-2 text-[13px] text-[#cccccc] focus:border-[#569cd6] focus:outline-none"
          />
          {message.length > COUNTER_THRESHOLD && (
            <div className="mt-1 text-right text-[11px] text-[#6e7681]">
              {message.length} / {MAX_MESSAGE_LENGTH}
            </div>
          )}

          {/* Identity — both optional, same reveal step as message (not a
              second gate): anonymous feedback stays exactly as easy as
              before, this only lets a visitor identify themselves if they
              choose to. Side by side at sm: so two short optional rows
              don't add as much vertical weight as two full-width ones would
              — the same sm:flex-row pattern ContactRow/ResumeRow already use. */}
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor={nameId} className="block text-[11px] text-[#858585]">
                Name (optional)
              </label>
              <input
                id={nameId}
                type="text"
                maxLength={MAX_NAME_LENGTH}
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-1.5 w-full rounded border border-[#3c3c3c] bg-[#141414] px-2.5 py-2 text-[13px] text-[#cccccc] focus:border-[#569cd6] focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor={emailId} className="block text-[11px] text-[#858585]">
                Email (optional — if you'd like a reply)
              </label>
              {/* type="email" is a UX hint only (virtual keyboard, browser
                  autofill) — there's no <form> here for the browser to
                  gate submission on, and the server (feedback.routes.ts)
                  never trusts this either way. */}
              <input
                id={emailId}
                type="email"
                maxLength={MAX_EMAIL_LENGTH}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1.5 w-full rounded border border-[#3c3c3c] bg-[#141414] px-2.5 py-2 text-[13px] text-[#cccccc] focus:border-[#569cd6] focus:outline-none"
              />
            </div>
          </div>

          {/* Honeypot — real form control so a bot's generic autofill catches
              it, invisible and unreachable for a real visitor: off-screen
              rather than display:none (some bots skip hidden fields;
              screen readers handle true offscreen positioning correctly
              either way since it's also aria-hidden + not tabbable). */}
          <input
            type="text"
            name="hp"
            value={honeypot}
            onChange={(event) => setHoneypot(event.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute left-[-9999px] h-0 w-0 opacity-0"
          />

          <div className="mt-3 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={sendState === 'sending'}
              className="min-h-[36px] rounded border border-[#3c3c3c] px-3 py-1.5 text-[12.5px] text-[#cccccc] hover:border-[#4d4d4d] hover:text-white disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#569cd6]"
            >
              {sendState === 'sending' ? 'Sending…' : 'Send review'}
            </button>
            <p className="text-[11px] text-[#858585]">Sends your rating and message — plus name/email if you added them. Nothing else.</p>
          </div>

          {sendState === 'error' && (
            <p role="alert" className="mt-2 text-[12px] text-[#f14c4c]">
              Couldn't send review. Please try again.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
