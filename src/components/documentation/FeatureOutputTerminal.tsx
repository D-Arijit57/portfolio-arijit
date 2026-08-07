import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { TypingLine } from '../signature/TypingLine';
import { hasAnimated, markAnimated, prefersReducedMotion } from '../../lib/typingReveal';
import type { FeatureListItem } from '../../documentation/featureList';

const ROBOTO_MONO = "'Roboto Mono', ui-monospace, SFMono-Regular, monospace";
const SESSION_KEY = 'cortexa-feature-manifest';
const SUCCESS_GREEN = '#4ec9b0';
const PROMPT_BLUE = '#569cd6';
const DESCRIPTION_HOLD_MS = 260;

/** One line of generated output: `✔ Term` types in, then its description
 * fades in beneath, dimmer and smaller — "Name + dimmer description line"
 * per the brief's own answer, not the full "Term — description" single
 * line FeatureGrid.tsx still uses for every other project doc. `instant`
 * (already-typed past items, or the whole terminal on a repeat visit)
 * skips straight to both lines fully visible with no `onDone` call. */
function FeatureLine({ item, instant, onDone }: { item: FeatureListItem; instant: boolean; onDone?: () => void }) {
  const [nameDone, setNameDone] = useState(instant);

  return (
    <div className="py-3">
      <div className="flex items-baseline gap-2">
        <span style={{ color: SUCCESS_GREEN }}>✔</span>
        {instant ? (
          <span className="text-[14px] font-medium text-white" style={{ fontFamily: ROBOTO_MONO }}>
            {item.term}
          </span>
        ) : (
          <TypingLine
            text={item.term}
            className="text-[14px] font-medium text-white"
            onComplete={() => {
              setNameDone(true);
              window.setTimeout(() => onDone?.(), DESCRIPTION_HOLD_MS);
            }}
          />
        )}
      </div>
      {(instant || nameDone) && (
        <motion.p
          initial={instant ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="mt-1 pl-[22px] text-[12px] leading-relaxed text-[#6a6a6a]"
          style={{ fontFamily: ROBOTO_MONO }}
        >
          {item.description}
        </motion.p>
      )}
    </div>
  );
}

/**
 * Cortexa Workspace Refinement (Core Features & Connectors pass) — Core
 * Features rendered as an output terminal, `$ ./core-features.sh`, the
 * generated stdout of running `./cortexa.sh` — not "Feature Manifest," a
 * label the brief explicitly rejected as too documentation-flavored. Still
 * a real terminal window (border, rounded corners, a title-bar row) unlike
 * this component's own previous iteration (which dropped the box
 * entirely) — the brief now wants "another terminal window," just a
 * visually distinct *kind* of one from problem.sh/cortexa.sh's own
 * TerminalPanel: lower-contrast chrome (no separate header fill, just a
 * hairline divider — `border-[#2a2a2a]` throughout, dimmer than the other
 * two's `border-[#3c3c3c]`), `rounded-md` instead of their `rounded-lg`.
 * The distinction is real but subtle on purpose, exactly the brief's own
 * framing: "problem.sh and cortexa.sh represent command execution...
 * [this] represents generated output... It should immediately
 * communicate: this is generated output, not another executable."
 *
 * Reveals one feature at a time (`index`), each one's own name typing then
 * its description fading in before the next begins — "the feature
 * inventory is being generated in real time." Self-contained session gate
 * (hasAnimated/markAnimated) like every other typed surface in this
 * workspace: a repeat visit this session, or prefers-reduced-motion, skips
 * straight to every line fully visible.
 *
 * `onComplete` fires once the *last* item finishes (not merely once this
 * component mounts) — CortexaExecutionFlow uses it to gate the wire leading
 * to Continue Exploring, so that wire only starts pulsing once the manifest
 * has genuinely finished printing, matching every other "wait for real
 * completion, not just arrival" beat in this pipeline.
 */
export function FeatureOutputTerminal({ items, onComplete }: { items: FeatureListItem[]; onComplete?: () => void }) {
  const instant = useRef(hasAnimated(SESSION_KEY) || prefersReducedMotion()).current;
  const [index, setIndex] = useState(instant ? items.length : 0);
  const firedCompleteRef = useRef(false);

  const fireComplete = () => {
    if (firedCompleteRef.current) return;
    firedCompleteRef.current = true;
    onComplete?.();
  };

  useEffect(() => {
    if (instant) fireComplete();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instant]);

  useEffect(() => {
    if (!instant && index >= items.length) markAnimated(SESSION_KEY);
  }, [index, items.length, instant]);

  const advance = () => {
    setIndex((i) => {
      const next = i + 1;
      if (next >= items.length) fireComplete();
      return next;
    });
  };

  return (
    <div className="w-full overflow-hidden rounded-md border border-[#2a2a2a] bg-[#1a1a1a]">
      <motion.div
        initial={instant ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="flex items-center justify-between border-b border-[#2a2a2a] px-4 py-2"
      >
        <span className="text-[11px] text-[#858585]" style={{ fontFamily: ROBOTO_MONO }}>
          <span style={{ color: PROMPT_BLUE }}>$ </span>./core-features.sh
        </span>
        <span className="text-[10px] text-[#4a4a4a]" style={{ fontFamily: ROBOTO_MONO }}>
          {items.length} modules
        </span>
      </motion.div>
      <div className="flex flex-col divide-y divide-[#2a2a2a] px-4">
        {items.map((item, i) => {
          if (i > index) return null;
          const isActive = i === index && !instant;
          return <FeatureLine key={item.term} item={item} instant={!isActive} onDone={isActive ? advance : undefined} />;
        })}
      </div>
    </div>
  );
}
