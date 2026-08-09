import { fullstackAiResumeData } from '../components/resume/data/fullstack-ai';

/**
 * The Handoff's canonical contact data — a presentation-level projection
 * over ResumeContact (src/content/resume.ts), not a second contact model.
 * Every literal value below (`.value`) is read from
 * fullstackAiResumeData.basics.contact — the same object the résumé's
 * right-panel preview reads its own contact block from — so there is
 * exactly one place email/LinkedIn/GitHub actually live. This file adds
 * only presentation facts (label, action, shortcut, whether a channel
 * belongs in the exported vCard) that ResumeContact has no business
 * knowing about.
 *
 * Phone is deliberately excluded: ResumeContact.phone exists (it's already
 * shipped in the client bundle via fullstack-ai.ts, since the résumé
 * preview needs it) but never becomes a ContactChannel, so it can't reach
 * contact.sh, the Handoff UI, or the vCard — see this file's own README-
 * style note in workspaceSeed.ts's contact.sh entry for the "excluded from
 * the UI, not actually private" caveat.
 */

export type ContactAction = 'copy' | 'open' | 'download';

export interface ContactChannel {
  id: string;
  label: string;
  /** Display value — always the short/human form (e.g. "github.com/D-Arijit57"), never the bare URL. */
  value: string;
  href: string;
  action: ContactAction;
  /** Single uppercase letter, bound as a keyboard shortcut by ContactHandoff. */
  shortcut: string;
  /** Included in the generated vCard's export. */
  exportable: boolean;
}

const { contact } = fullstackAiResumeData.basics;

export const CONTACT_NAME = fullstackAiResumeData.basics.name;

/** The one canonical geographic fact ResumeContact states — no invented timezone or availability phrase alongside it. */
export const CONTACT_LOCATION = contact.location;

export const CONTACT_CHANNELS: ContactChannel[] = [
  {
    id: 'email',
    label: 'Email',
    value: contact.email,
    href: `mailto:${contact.email}`,
    action: 'copy',
    shortcut: 'E',
    exportable: true,
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    value: contact.linkedin.label,
    href: contact.linkedin.url ?? `https://${contact.linkedin.label}`,
    action: 'open',
    shortcut: 'L',
    exportable: true,
  },
  {
    id: 'github',
    label: 'GitHub',
    value: contact.github.label,
    href: contact.github.url ?? `https://${contact.github.label}`,
    action: 'open',
    shortcut: 'G',
    exportable: true,
  },
];
