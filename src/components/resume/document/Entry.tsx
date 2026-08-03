import { Highlighted } from './Highlighted';

/**
 * Sprint 17 (RESUME.md spec §4.3): the justified two-row entry block —
 * organization/date on the first row, role/location on the second, bullets
 * below. Reused verbatim by EDUCATION, EXPERIENCE, and PROJECTS, which is
 * the point: those three sections differ only in what they put in each
 * slot, so they should not each grow their own layout.
 *
 * Two details are load-bearing rather than incidental:
 *   - `items-baseline` (not items-center) is what sits the date correctly
 *     against a larger org name; at these mixed sizes, centering reads as
 *     subtly misaligned.
 *   - `shrink-0` on each right-hand column stops the date from wrapping
 *     when the editor pane narrows.
 */
export interface EntryProps {
  org: string;
  meta: string;
  role: string;
  subMeta?: string;
  bullets?: string[];
}

export function Entry({ org, meta, role, subMeta, bullets }: EntryProps) {
  return (
    <div className="mb-5 last:mb-0">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-[15px] font-semibold text-[var(--resume-fg-strong)]">{org}</h3>
        <span className="shrink-0 text-[13px] text-[var(--resume-fg-muted)]">{meta}</span>
      </div>

      <div className="mt-0.5 flex items-baseline justify-between gap-4">
        <p className="text-[13.5px] italic text-[var(--resume-fg-muted)]">{role}</p>
        {subMeta && <span className="shrink-0 text-[13px] text-[var(--resume-fg-muted)]">{subMeta}</span>}
      </div>

      {bullets && bullets.length > 0 && (
        <ul className="mt-3 space-y-2">
          {bullets.map((bullet, i) => (
            <li key={i} className="flex gap-2.5 text-[14px] leading-[1.65] text-[var(--resume-fg)]">
              <span className="mt-[0.55em] h-1 w-1 shrink-0 rounded-full bg-[var(--tok-lang)]" />
              <span>
                <Highlighted text={bullet} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
