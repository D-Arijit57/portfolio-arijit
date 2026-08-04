import { useEffect, useRef, useState } from 'react';

/**
 * Fires once, the first time the returned ref's element intersects the
 * viewport, then disconnects — for scroll-triggered entrance animations
 * that must never replay on re-scroll (see RecentActivityLog.tsx's commit
 * timeline). `root: null` (the browser viewport) still correctly respects
 * clipping by scrollable ancestors (e.g. MarkdownFileView's own
 * `overflow-y-auto` pane) — IntersectionObserver computes the target's
 * actual visible rect through the whole clipping chain, not just against
 * the raw viewport, so no explicit scroll-root lookup is needed here.
 */
export function useInViewOnce<T extends Element>(threshold = 0.2) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (inView) return;
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [inView, threshold]);

  return { ref, inView };
}
