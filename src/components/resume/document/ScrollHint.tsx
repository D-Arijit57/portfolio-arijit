import { useEffect, useState, type RefObject } from 'react';

/**
 * Sprint 17 (RESUME.md spec §4.5): the sticky "more below" affordance.
 *
 * Sticky rather than fixed, so it rides the bottom of the scroll container
 * instead of the viewport, and `pointer-events-none` so it never eats a
 * click meant for the document underneath. The gradient above the rule is
 * what makes text dissolve into the hint rather than collide with it — a
 * bare dashed rule over live text reads as a rendering bug.
 *
 * Hidden once the document is scrolled to within SCROLL_END_EPSILON_PX of
 * the end (spec acceptance §7.9), and also when the content isn't tall
 * enough to scroll at all — a "scroll for more" prompt on a document with
 * no more is worse than no prompt.
 */

const SCROLL_END_EPSILON_PX = 24;

export function ScrollHint({ scrollRef }: { scrollRef: RefObject<HTMLDivElement | null> }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const update = () => {
      const scrollable = el.scrollHeight > el.clientHeight + SCROLL_END_EPSILON_PX;
      const atEnd = el.scrollTop + el.clientHeight >= el.scrollHeight - SCROLL_END_EPSILON_PX;
      setVisible(scrollable && !atEnd);
    };

    update();
    el.addEventListener('scroll', update, { passive: true });
    // Sections collapse/expand, so the document's height changes without a
    // scroll event ever firing — observe the element itself too.
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      observer.disconnect();
    };
  }, [scrollRef]);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none sticky bottom-0 -mx-7 transition-opacity duration-200 motion-reduce:transition-none ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="h-12 bg-gradient-to-t from-[var(--resume-editor-bg)] to-transparent" />
      <div className="border-t border-dashed border-[var(--resume-rule-dashed)] bg-[var(--resume-editor-bg)] px-7 py-2.5 text-center text-[12px] text-[var(--resume-fg-faint)]">
        ↓ Scroll for more sections
      </div>
    </div>
  );
}
