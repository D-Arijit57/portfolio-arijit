import React, { useEffect, useState } from 'react';

/**
 * A thin, subtle indicator of scroll position within the documentation
 * body — not an animated/decorative element, just a live read of
 * data-doc-scroll-root's scrollTop. Sits above the TOC in the sidebar.
 */
export function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>('[data-doc-scroll-root]');
    if (!root) return;

    const handleScroll = () => {
      const max = root.scrollHeight - root.clientHeight;
      setProgress(max > 0 ? Math.min(1, Math.max(0, root.scrollTop / max)) : 0);
    };

    handleScroll();
    root.addEventListener('scroll', handleScroll, { passive: true });
    return () => root.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="mb-4 h-[2px] w-full overflow-hidden rounded-full bg-[#3c3c3c]">
      <div
        className="h-full rounded-full bg-[#007acc] transition-[width] duration-150 ease-out"
        style={{ width: `${progress * 100}%` }}
      />
    </div>
  );
}
