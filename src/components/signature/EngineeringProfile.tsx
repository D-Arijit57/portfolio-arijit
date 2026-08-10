import React, { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '../../lib/typingReveal';
import { WHITE, GREEN, GRAY } from './palette';
import { STATUS_PAUSE_MS, PROFILE_HOLD_MS } from './timing';

const FIELD_COLUMN_WIDTH = 12;

const FIELDS: { label: string; value: string }[] = [
  { label: 'Name', value: 'Arijit Das' },
  { label: 'Role', value: 'Software Engineer' },
  { label: 'Location', value: 'Indore, India' },
];

export interface EngineeringProfileProps {
  instant?: boolean;
  onComplete?: () => void;
}

/**
 * Phase 3 — the identity block, reduced to the four lines that actually
 * identify a person: name, role, location, availability. Focus, Stack and the
 * four animated trait bars were removed, along with the three 46-character
 * rules that framed them — at the pane widths this renders in, those bars sat
 * directly on top of the campfire, which is the one part of the artwork the
 * composition is built around. `whoami.md` already carries focus and stack
 * properly; repeating them here cost the scene its focal point to say the
 * same thing twice.
 *
 * The trait bars were also, incidentally, this phase's completion signal — the
 * last bar to fill called `onComplete`. With them gone the phase would resolve
 * the instant it mounted, collapsing the whole sequence to ~1.5s and firing
 * ignition before the reader has read anything. `PROFILE_HOLD_MS` replaces
 * them as an explicit, deliberate beat: the profile is readable, then the
 * workspace reports ready. Slower here is the point, not a regression.
 */
export function EngineeringProfile({ instant, onComplete }: EngineeringProfileProps) {
  const skip = instant || prefersReducedMotion();
  const [started, setStarted] = useState(skip);
  const firedRef = useRef(false);

  useEffect(() => {
    if (skip || started) return undefined;
    const timer = window.setTimeout(() => setStarted(true), STATUS_PAUSE_MS);
    return () => window.clearTimeout(timer);
  }, [skip, started]);

  // Held beat, then hand off. `skip` resolves immediately — a repeat visit or
  // reduced motion has no sequence left to pace.
  useEffect(() => {
    if (!started || firedRef.current) return undefined;
    if (skip) {
      firedRef.current = true;
      onComplete?.();
      return undefined;
    }
    const timer = window.setTimeout(() => {
      firedRef.current = true;
      onComplete?.();
    }, PROFILE_HOLD_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, skip]);

  if (!started) return null;

  return (
    <div className="mt-3" style={{ color: WHITE }}>
      {FIELDS.map((f) => (
        <div key={f.label}>
          <span style={{ color: GRAY }}>{f.label.padEnd(FIELD_COLUMN_WIDTH)}</span>
          {f.value}
        </div>
      ))}
      <div>
        <span style={{ color: GRAY }}>{'Status'.padEnd(FIELD_COLUMN_WIDTH)}</span>
        <span style={{ color: GREEN }}>●</span> Available
      </div>
    </div>
  );
}
