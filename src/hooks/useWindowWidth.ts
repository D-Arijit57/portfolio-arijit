import { useEffect, useState } from 'react';

/**
 * Phase 4 (Layout, Responsive & Workspace Geometry): the one live
 * `window.innerWidth` subscription the responsive workspace shell needs —
 * VSCodeShell derives its Explorer auto-collapse breakpoint from it,
 * EditorArea its single-active-pane breakpoint. A plain `resize` listener
 * rather than a ResizeObserver: this tracks the *browser viewport*, not a
 * measured element, and window resizes are infrequent enough (unlike a
 * dragged split handle) that no debouncing is worth the complexity.
 */
export function useWindowWidth(): number {
  const [width, setWidth] = useState(() => window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return width;
}
