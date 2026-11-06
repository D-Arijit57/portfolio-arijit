import React, { useEffect, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import type { WorkspaceIdentity } from '../../../experience/workspace';
import { formatDuration } from '../../../experience/pipeline';
import { resolveCompanyLogo } from '../companyLogos';
import { ACCENT, CONTENT_DIM, DIM, STRONG, TEXT } from '../pipeline/tokens';

/**
 * The canvas header — who, where, when, in as little height as possible.
 *
 * A migration rather than new work: the logo lookup (`resolveCompanyLogo`),
 * the external-link treatment on `companyUrl`, and the
 * `startDate → endDate · duration` row are `ExperienceTerminalOne`'s own
 * identity block, moved here largely unchanged. That component stays mounted
 * and untouched until the cleanup phase confirms nothing else reads it.
 *
 * The right-hand metadata column is `key: value` in plain mono rather than
 * the reference image's icon rail. Two reasons: the workspace has no icon
 * vocabulary to draw from, and `role:`/`location:` reads as terminal output,
 * which is the language this page already speaks. The one icon is the
 * external-link arrow, which this feature already used.
 *
 * Every field is read off `WorkspaceIdentity`, which is read off
 * `workHistory.ts`. Nothing here is authored — in particular there is no
 * status badge, no domain and no environment, because the model states none
 * of them.
 */
/**
 * Whole calendar months from `start` ("YYYY-MM") to `end` ("YYYY-MM" or
 * "Present", meaning now). Same month arithmetic as `formatDuration`.
 */
function monthsBetween(start: string, end: string, now: Date): number {
  const [sy, sm] = start.split('-').map(Number);
  const [ey, em] = end === 'Present' ? [now.getFullYear(), now.getMonth() + 1] : end.split('-').map(Number);
  return Math.max(0, (ey - sy) * 12 + (em - sm));
}

/**
 * Re-renders the caller on a timer, so a role marked "Present" keeps counting
 * on a page that stays open — and, because the value is always derived from the
 * start date and the clock rather than stored, nobody has to edit a number as
 * the months go by. Hourly is plenty for a month-granularity figure; the
 * visibility handler catches a tab that slept through a month boundary.
 */
function useNow(intervalMs = 60 * 60 * 1000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const timer = window.setInterval(tick, intervalMs);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [intervalMs]);
  return now;
}

export function WorkspaceHeader({ identity }: { identity: WorkspaceIdentity }) {
  const logo = resolveCompanyLogo(identity.company);
  const end = identity.endDate === 'Present' ? 'present' : identity.endDate;
  const now = useNow();
  const months = monthsBetween(identity.startDate, identity.endDate, now);
  // `formatDuration` reads the clock itself for a "Present" role, so calling it
  // here (rather than using `identity.duration`, computed once when the
  // workspace was built) is what lets the subtitle keep up too.
  const duration = formatDuration(identity.startDate, identity.endDate);

  return (
    <header className="flex flex-wrap items-start justify-between gap-x-10 gap-y-3">
      <div className="flex min-w-0 items-start gap-3.5">
        {logo && (
          <img
            src={logo}
            alt=""
            className="h-[28px] w-auto max-w-[110px] shrink-0 translate-y-[2px] object-contain"
          />
        )}

        <div className="min-w-0">
          <h1
            className="font-mono text-[22px] font-semibold leading-[1.15] tracking-[-0.01em]"
            style={{ color: STRONG }}
          >
            {identity.company}
          </h1>
          {/* Role and dates share a line: two stacked rows under the company
              name cost the composition a row it needs elsewhere. */}
          <p className="mt-1 flex flex-wrap items-baseline gap-x-3 font-mono text-[12px]">
            <span className="uppercase tracking-[0.14em]" style={{ color: CONTENT_DIM }}>
              {identity.role}
            </span>
            <span className="tabular-nums" style={{ color: TEXT }}>
              {identity.startDate} <span style={{ color: DIM }}>→</span> {end}
              <span style={{ color: CONTENT_DIM }}> · {duration}</span>
            </span>
          </p>
        </div>
      </div>

      {/* Aligned as a key/value block so the values line up in one column —
          `tabular-nums` on the month count keeps it on the same grid. */}
      {/* No `role` row: it is the subtitle directly under the company name,
          and stating it twice on one screen is the kind of filler this page
          exists to avoid. */}
      <dl className="grid shrink-0 grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-[12px]">
        <MetaRow label="location" value={identity.location} />
        <dt style={{ color: DIM }}>website</dt>
        <dd className="m-0">
          <a
            href={identity.companyUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${identity.company}'s website`}
            className="inline-flex items-center gap-1 transition-colors hover:text-[#cccccc] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#569cd6]"
            style={{ color: ACCENT }}
          >
            {hostOf(identity.companyUrl)}
            <ArrowUpRight size={11} aria-hidden="true" />
          </a>
        </dd>
        <MetaRow label="experience" value={`${months} ${months === 1 ? 'month' : 'months'}`} numeric />
      </dl>
    </header>
  );
}

function MetaRow({ label, value, numeric = false }: { label: string; value: string; numeric?: boolean }) {
  return (
    <>
      <dt style={{ color: DIM }}>{label}</dt>
      <dd className={`m-0 ${numeric ? 'tabular-nums' : ''}`} style={{ color: TEXT }}>
        {value}
      </dd>
    </>
  );
}

/** "https://americanchase.com/" → "americanchase.com". Display only; the href
 * stays the canonical URL exactly as the model states it. */
function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch {
    return url;
  }
}
