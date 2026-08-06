import React, { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '../../lib/typingReveal';
import { WHITE, GREEN, GRAY } from './palette';
import { STATUS_PAUSE_MS, PROGRESS_BAR_STEP_MS, BAR_STAGGER_MS } from './timing';

const SEPARATOR = '─'.repeat(46);
const FIELD_COLUMN_WIDTH = 12;
const TRAIT_COLUMN_WIDTH = 20;

const FIELDS: { label: string; value: string }[] = [
  { label: 'Name', value: 'Arijit Das' },
  { label: 'Role', value: 'Software Engineer' },
  { label: 'Location', value: 'Indore, India' },
];

const FOCUS = ['Backend Systems', 'AI Engineering', 'Reverse Engineering'];
const STACK = ['Node.js', 'Express', 'React', 'Next.js', 'TypeScript', 'OpenAI', 'LangChain'];
const TRAITS: { label: string; target: number }[] = [
  { label: 'Curiosity', target: 12 },
  { label: 'Architecture', target: 11 },
  { label: 'Problem Solving', target: 12 },
  { label: 'Learning', target: 13 },
];

export interface EngineeringProfileProps {
  instant?: boolean;
  onComplete?: () => void;
}

/**
 * Phase 3 — the written engineering profile beneath the banner: identity
 * fields, focus, stack, and a set of independently-animated trait bars.
 * Everything but the bars prints as one immediate block once the brief's
 * "brief pause" after the banner elapses — the brief calls out bar
 * animation specifically ("do not instantly render the bars"), not the
 * surrounding text, so only TraitBar below owns any reveal timing.
 */
export function EngineeringProfile({ instant, onComplete }: EngineeringProfileProps) {
  const skip = instant || prefersReducedMotion();
  const [started, setStarted] = useState(skip);
  const completedRef = useRef(0);

  useEffect(() => {
    if (skip || started) return undefined;
    const timer = window.setTimeout(() => setStarted(true), STATUS_PAUSE_MS);
    return () => window.clearTimeout(timer);
  }, [skip, started]);

  const handleBarComplete = () => {
    completedRef.current += 1;
    if (completedRef.current >= TRAITS.length) onComplete?.();
  };

  if (!started) return null;

  return (
    <div style={{ color: WHITE }}>
      <div style={{ color: GRAY }}>{SEPARATOR}</div>

      <div className="mt-2">
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

      <div className="mt-2">
        <div style={{ color: GRAY }}>Focus</div>
        {FOCUS.map((item) => (
          <div key={item}>
            <span style={{ color: GRAY }}>{'• '}</span>
            {item}
          </div>
        ))}
      </div>

      <div className="mt-2">
        <div style={{ color: GRAY }}>Stack</div>
        {STACK.map((item) => (
          <div key={item}>{item}</div>
        ))}
      </div>

      <div className="mt-2" style={{ color: GRAY }}>
        {SEPARATOR}
      </div>

      <div className="mt-2">
        <div style={{ color: GRAY }}>Traits</div>
        {TRAITS.map((trait, i) => (
          <TraitBar
            key={trait.label}
            label={trait.label}
            target={trait.target}
            startDelayMs={i * BAR_STAGGER_MS}
            instant={skip}
            onComplete={handleBarComplete}
          />
        ))}
      </div>

      <div className="mt-2" style={{ color: GRAY }}>
        {SEPARATOR}
      </div>
    </div>
  );
}

function TraitBar({
  label,
  target,
  startDelayMs,
  instant,
  onComplete,
}: {
  label: string;
  target: number;
  startDelayMs: number;
  instant?: boolean;
  onComplete?: () => void;
}) {
  const [filled, setFilled] = useState(instant ? target : 0);
  const firedRef = useRef(false);

  const fireOnce = () => {
    if (firedRef.current) return;
    firedRef.current = true;
    onComplete?.();
  };

  useEffect(() => {
    if (instant) {
      fireOnce();
      return undefined;
    }
    if (filled >= target) {
      fireOnce();
      return undefined;
    }
    const delay = filled === 0 ? startDelayMs : PROGRESS_BAR_STEP_MS;
    const timer = window.setTimeout(() => setFilled((count) => count + 1), delay);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instant, filled]);

  return (
    <div>
      <span style={{ color: GRAY }}>{label.padEnd(TRAIT_COLUMN_WIDTH)}</span>
      {'█'.repeat(filled)}
    </div>
  );
}
