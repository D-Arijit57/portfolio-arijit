import React, { useState } from 'react';
import { ChevronDown, type LucideIcon } from 'lucide-react';

/**
 * Sprint 17 (RESUME.md spec §4.2): a collapsible resume section — icon,
 * label, hairline rule, chevron.
 *
 * The open/closed transition uses the `grid-rows-[0fr]` -> `grid-rows-[1fr]`
 * technique rather than animating max-height: it eases to the content's
 * true auto height with no measurement, no ResizeObserver, and no
 * "max-height guessed too small" clipping when a section grows. The inner
 * wrapper's `overflow-hidden` is what makes the 0fr row actually clip.
 *
 * `motion-reduce:transition-none` on both the chevron and the grid honors
 * prefers-reduced-motion (spec acceptance §7.8) — collapsing still works,
 * it just resolves instantly.
 */
export function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);

  return (
    <section className="mt-8">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="group flex w-full items-center gap-2 text-left outline-none focus-visible:ring-1 focus-visible:ring-[var(--resume-accent)]"
      >
        <Icon size={16} className="shrink-0 text-[var(--resume-section-head)]" />
        <span className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[var(--resume-section-head)]">
          {title}
        </span>
        <span className="ml-2 h-px flex-1 bg-[var(--resume-rule)]" />
        <ChevronDown
          size={14}
          className={`shrink-0 text-[var(--resume-fg-faint)] transition-transform duration-200 motion-reduce:transition-none ${
            open ? '' : '-rotate-90'
          }`}
        />
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-200 motion-reduce:transition-none ${
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <div className="pt-3">{children}</div>
        </div>
      </div>
    </section>
  );
}
