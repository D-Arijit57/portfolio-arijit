import { useEffect, useRef, useState } from 'react';
import {
  BOOT_SEQUENCE,
  BOOT_HOLD_RANGE,
  hasBooted,
  markBooted,
  prefersReducedMotion,
  randomBetween,
  chunkBreakpoints,
} from '../lib/bootSequence';

interface RenderLine {
  text: string;
  success?: boolean;
}

interface BootSequenceState {
  visibleLines: RenderLine[];
  isBooting: boolean;
}

function doneState(): BootSequenceState {
  return { visibleLines: [], isBooting: false };
}

/**
 * Drives the boot terminal's progressive reveal. Two layers of timing, both
 * re-rolled from a range every run so no two page loads look identical
 * (see lib/bootSequence.ts): a per-line "wait" (the step's own work taking
 * however long it takes) followed by a burst of 3-8 character chunks (a
 * buffered flush, not a per-character typewriter) that print the line.
 * Nothing is marked "booted" until the sequence actually finishes firing,
 * so a React 18 StrictMode dev double-mount that gets torn down before that
 * leaves zero trace (same discipline as useTypingReveal.ts).
 */
export function useBootSequence(): BootSequenceState {
  const [state, setState] = useState<BootSequenceState>(() => {
    if (hasBooted() || prefersReducedMotion()) {
      return doneState();
    }
    return { visibleLines: [], isBooting: true };
  });

  const timeoutsRef = useRef<number[]>([]);

  useEffect(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    if (hasBooted() || prefersReducedMotion()) {
      setState(doneState());
      return;
    }

    setState({ visibleLines: [], isBooting: true });

    const schedule = (fn: () => void, ms: number) => {
      timeoutsRef.current.push(window.setTimeout(fn, ms));
    };

    function printLine(index: number) {
      if (index >= BOOT_SEQUENCE.length) {
        const holdMs = randomBetween(BOOT_HOLD_RANGE[0], BOOT_HOLD_RANGE[1]);
        schedule(() => {
          markBooted();
          setState((prev) => ({ ...prev, isBooting: false }));
        }, holdMs);
        return;
      }

      const line = BOOT_SEQUENCE[index];
      const waitMs = randomBetween(line.waitRange[0], line.waitRange[1]);

      schedule(() => {
        setState((prev) => ({
          ...prev,
          visibleLines: [...prev.visibleLines, { text: '', success: line.success }],
        }));

        const breakpoints = chunkBreakpoints(line.text.length);
        let bi = 0;

        function printChunk() {
          const partial = line.text.slice(0, breakpoints[bi]);
          setState((prev) => {
            const next = prev.visibleLines.slice();
            next[next.length - 1] = { text: partial, success: line.success };
            return { ...prev, visibleLines: next };
          });
          bi++;
          if (bi < breakpoints.length) {
            schedule(printChunk, randomBetween(10, 22));
          } else {
            printLine(index + 1);
          }
        }

        printChunk();
      }, waitMs);
    }

    printLine(0);

    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
    };
  }, []);

  return state;
}
