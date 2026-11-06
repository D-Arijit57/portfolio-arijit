import { useEffect, useRef, useState } from 'react';

/**
 * Row-by-row reveal shared by the Lattice terminals: starts once the
 * upstream wire has landed (`active`) AND the panel has been scrolled into
 * view — the same dual gate the Rakshachakra terminals use — then steps one
 * row at a time and reports completion once, after a short closing pause.
 */
export function useStagedReveal({
  count,
  active,
  skip,
  nodeRef,
  stepMs = 70,
  endPauseMs = 260,
  onComplete,
}: {
  count: number;
  active: boolean;
  skip: boolean;
  nodeRef: React.RefObject<HTMLElement | null>;
  stepMs?: number;
  endPauseMs?: number;
  onComplete?: () => void;
}) {
  const [revealed, setRevealed] = useState(skip ? count : 0);
  const [inView, setInView] = useState(false);
  const started = useRef(false);
  const fired = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const fire = () => {
    if (fired.current) return;
    fired.current = true;
    onCompleteRef.current?.();
  };

  useEffect(() => {
    if (skip || inView) return undefined;
    const node = nodeRef.current;
    if (!node) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [skip, inView, nodeRef]);

  useEffect(() => {
    if (skip) fire();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skip]);

  useEffect(() => {
    if (skip || !active || !inView || started.current) return undefined;
    started.current = true;
    let timer = 0;
    let index = 0;
    const step = () => {
      index += 1;
      setRevealed(index);
      timer = window.setTimeout(index < count ? step : fire, index < count ? stepMs : endPauseMs);
    };
    timer = window.setTimeout(step, stepMs);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skip, active, inView]);

  return { revealed, all: skip || revealed >= count };
}
