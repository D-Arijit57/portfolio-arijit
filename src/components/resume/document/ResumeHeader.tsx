import { Phone, Mail, Link2 } from 'lucide-react';
import type { ResumeContact } from '../../../content/resume';

/**
 * Sprint 17 (RESUME.md spec §4.4): name + exactly two pipe-separated
 * contact rows.
 *
 * Replaces the previous header's eyebrow (`SOFTWARE ENGINEER`), location
 * chip, and short `LinkedIn`/`GitHub` labels. Those were five separate
 * icon chips that wrapped to two ragged rows at default pane width; the
 * spec's fix is full URLs as the link text, split deliberately across two
 * rows — phone/email, then the two profile URLs — so the wrapping is
 * designed rather than emergent.
 *
 * The eyebrow is gone rather than relocated: above the contact block it
 * competed with the name for primary focus and pushed everything down a
 * row, which is what forced the chips to wrap in the first place.
 */

function Separator() {
  return (
    <span className="px-3 text-[var(--resume-rule)]" aria-hidden="true">
      |
    </span>
  );
}

const LINK_CLASS =
  'text-[var(--tok-lang)] underline-offset-2 hover:underline outline-none focus-visible:ring-1 focus-visible:ring-[var(--resume-accent)]';

export function ResumeHeader({ name, contact }: { name: string; contact: ResumeContact }) {
  return (
    <header>
      <h1 className="text-[34px] font-bold leading-tight tracking-tight text-[var(--resume-fg-strong)]">
        {name}
      </h1>

      <div className="mt-3 flex flex-wrap items-center text-[13.5px] text-[var(--resume-fg)]">
        <Phone size={14} className="mr-2 shrink-0 text-[var(--resume-fg-muted)]" />
        <a href={`tel:${contact.phone}`} className={LINK_CLASS}>
          {contact.phone}
        </a>
        <Separator />
        <Mail size={14} className="mr-2 shrink-0 text-[var(--resume-fg-muted)]" />
        <a href={`mailto:${contact.email}`} className={LINK_CLASS}>
          {contact.email}
        </a>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center text-[13.5px]">
        <Link2 size={14} className="mr-2 shrink-0 text-[var(--resume-fg-muted)]" />
        <a href={contact.linkedin.url} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
          {contact.linkedin.label}
        </a>
        <Separator />
        <Link2 size={14} className="mr-2 shrink-0 text-[var(--resume-fg-muted)]" />
        <a href={contact.github.url} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
          {contact.github.label}
        </a>
      </div>
    </header>
  );
}
