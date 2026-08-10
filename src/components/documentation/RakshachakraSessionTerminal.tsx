import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ProjectTerminalPanel, ACCENT, BORDER, MUTED, SUCCESS, TEXT } from './ProjectTerminalPanel';

const EVENT_STEP_MS = 170;
const POST_SESSION_PAUSE_MS = 320;
const MANIFEST_EXPAND_MS = 320;
const ROW_STAGGER_MS = 70;
const WIDE_BREAKPOINT_PX = 480;

type Phase = 'session' | 'manifest';

interface SessionLine {
  id: string;
  kind: 'kv' | 'signal';
  label: string;
  value?: string;
  valueColor?: string;
}

/**
 * The real signal categories `sensor_capture.responsibilities` names
 * (`content/architecture/rakshachakra.ts`) — same three signals
 * `RakshachakraSignalsTerminal` used to list, now rendered as live status
 * indicators instead of a labeled list (that component is retired; its
 * content lives here now, per the Session Terminal brief). `identity`/
 * `behavior` echo `problem.sh`'s own two premise lines ("Login establishes
 * identity. Behavior provides another signal."), and `baseline`/`risk`/
 * `response` trace to `profile_initialization`, `risk_scoring`, and
 * `adaptive_response` respectively — `LOW` and `ALLOW` are real values from
 * those domains' own described tiers (adaptive_response.description: "the
 * security response tier (allow/step-up/lock)"; Core Features' own "low
 * risk continues normally"), not invented telemetry. No session ID, no
 * timestamps, no confidence score — none of that has a canonical source.
 */
const SESSION_LINES: SessionLine[] = [
  { id: 'identity', kind: 'kv', label: 'identity', value: 'verified', valueColor: SUCCESS },
  { id: 'behavior', kind: 'kv', label: 'behavior', value: 'monitoring', valueColor: ACCENT },
  { id: 'touch', kind: 'signal', label: 'touch' },
  { id: 'motion', kind: 'signal', label: 'motion' },
  { id: 'device', kind: 'signal', label: 'device' },
  { id: 'baseline', kind: 'kv', label: 'baseline', value: 'matched', valueColor: SUCCESS },
  { id: 'risk', kind: 'kv', label: 'risk', value: 'LOW', valueColor: SUCCESS },
  { id: 'response', kind: 'kv', label: 'response', value: 'ALLOW', valueColor: SUCCESS },
];

/** `frontmatter.badges`, verbatim order — `content/workspaceSeed.ts`'s own
 * `RAKSHACHAKRA_DOC_MARKDOWN`. Kept as a local literal rather than threaded
 * in as a prop: every other terminal in this chain (`RakshachakraPipelineTerminal`
 * before it, `RakshachakraSignalsTerminal`) already hardcodes its own traced
 * subset of the canonical data rather than accepting it from the caller. */
const CORE = ['Flutter', 'Dart', 'Firebase', 'Cloud Firestore', 'Python', 'Provider', 'local_auth'];

/** One short label per `## Core Features` bullet (`RAKSHACHAKRA_DOC_MARKDOWN`),
 * same order, same paraphrase-for-caption-length convention `RakshachakraPipelineTerminal`'s
 * own `STAGES` used — six bullets, six labels, nothing added or merged. */
const CAPABILITIES = [
  'continuous behavioral authentication',
  'behavioral feature extraction',
  'real-time risk inference',
  'adaptive security response',
  'biometric authentication',
  'model retraining',
];

function SessionRow({ line, revealed }: { line: SessionLine; revealed: boolean }) {
  return (
    <div
      className="flex items-baseline gap-3 py-[1px]"
      style={{ opacity: revealed ? 1 : 0, transition: 'opacity 180ms ease-out' }}
    >
      <span className="w-[72px] shrink-0" style={{ color: MUTED }}>
        {line.label}
      </span>
      {line.kind === 'signal' ? (
        <span style={{ color: ACCENT }}>●</span>
      ) : (
        <span style={{ color: line.valueColor ?? TEXT }}>{line.value}</span>
      )}
    </div>
  );
}

/**
 * ./session.sh — Rakshachakra's own execution terminal, replacing the
 * horizontal `[01] signals → [02] extraction → [03] risk → [04] response`
 * pipeline (americanchase.yaml's own metaphor, not this project's: that page
 * is a workflow moving through stages, Rakshachakra is a session being
 * continuously re-checked while it stays open). One long-running process,
 * not four sequential ones — so the panel now shows the *state* of a
 * verification session rather than a hand-off chain.
 *
 * ONE terminal, two command contexts in the same shell — modeled directly
 * on `ExecutionReplayTerminal`'s own `run-cortexa` → `cat cortexa.md`
 * structure (a live process's output, then the same session prints the rest
 * of the file): `./session.sh`'s output resolves, then — no new panel —
 * `$ cat rakshachakra.md` prints CORE and CAPABILITIES before handing back
 * an idle prompt. Reuses that component's technique (a stepped `index` for
 * line-by-line output, a measured-height growth for the block that mounts
 * after), not its code — the two files have no shared data shape to unify
 * behind a common component.
 *
 * CORE/CAPABILITIES render as two parallel registers in one `cat` block
 * (a two-column grid, `RakshachakraSignalsTerminal`'s own row-stagger
 * technique applied per column) rather than one list after another — CORE
 * has 7 entries, CAPABILITIES 6 (`## Core Features` has six bullets; the
 * ragged bottom row is real, not an error). Collapses to a single stacked
 * column below `WIDE_BREAKPOINT_PX`, measured against this panel's own
 * container width via `ResizeObserver` — the same "measure the actual
 * document-pane width, not the viewport" technique
 * `RakshachakraPipelineTerminal` used for its own horizontal/vertical
 * switch, since the Explorer/split-pane workspace can make that pane
 * considerably narrower than the window.
 *
 * `active`/`skip` and the self-managed `IntersectionObserver` visibility
 * gate are the same dual-gate pattern `RakshachakraPipelineTerminal` used
 * before it, and `RakshachakraSignalsTerminal` uses too: `active` is the
 * upstream wire having landed, the in-view gate is the reader actually
 * having scrolled here. `skip` is decided once at the top of
 * `RakshachakraDocFlow`'s whole chain and threaded down, never recomputed
 * here.
 */
export function RakshachakraSessionTerminal({
  sessionRef,
  active,
  skip,
}: {
  sessionRef: React.RefObject<HTMLDivElement | null>;
  active: boolean;
  skip: boolean;
}) {
  const instant = skip;

  const [phase, setPhase] = useState<Phase>(instant ? 'manifest' : 'session');
  const [lineIndex, setLineIndex] = useState(instant ? SESSION_LINES.length : 0);
  const [inView, setInView] = useState(false);
  const [wide, setWide] = useState(true);
  const startedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const running = instant || inView;
  const sessionDone = instant || lineIndex >= SESSION_LINES.length;

  // Latches once visible, same reasoning as RakshachakraPipelineTerminal's
  // own observer: a reader who scrolls away afterward shouldn't rewind an
  // already-started session.
  useEffect(() => {
    if (instant || inView) return undefined;
    const node = sessionRef.current;
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
  }, [instant, inView, sessionRef]);

  // Session lines step in one at a time once the wire has landed and the
  // panel is on screen.
  useEffect(() => {
    if (instant || !active || !running || startedRef.current) return undefined;
    startedRef.current = true;
    let timer = 0;
    let index = 0;
    const step = () => {
      index += 1;
      setLineIndex(index);
      if (index < SESSION_LINES.length) {
        timer = window.setTimeout(step, EVENT_STEP_MS);
      } else {
        timer = window.setTimeout(() => setPhase('manifest'), POST_SESSION_PAUSE_MS);
      }
    };
    timer = window.setTimeout(step, EVENT_STEP_MS);
    return () => window.clearTimeout(timer);
  }, [instant, active, running]);

  const showManifest = phase === 'manifest';
  const manifestRef = useRef<HTMLDivElement>(null);
  const [manifestHeight, setManifestHeight] = useState<number | 'auto'>(instant ? 'auto' : 0);
  // CORE/CAPABILITIES rows mount at opacity 0 with a per-row transition-delay
  // (below) and flip to visible on the next frame — same one-rAF-after-mount
  // trick ExecutionReplayTerminal's own recordHeight uses, needed so the
  // browser actually paints the opacity-0 state before the transition starts
  // (flipping in the same pass as mounting would just paint opacity 1 with
  // no visible transition at all).
  const [manifestRowsVisible, setManifestRowsVisible] = useState(instant);

  useLayoutEffect(() => {
    if (instant || !showManifest) return undefined;
    const node = manifestRef.current;
    if (!node) return undefined;
    const target = node.scrollHeight;
    const frame = requestAnimationFrame(() => setManifestHeight(target));
    return () => cancelAnimationFrame(frame);
  }, [instant, showManifest]);

  useEffect(() => {
    if (instant || !showManifest) return undefined;
    const frame = requestAnimationFrame(() => setManifestRowsVisible(true));
    return () => cancelAnimationFrame(frame);
  }, [instant, showManifest]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const width = entry?.contentRect.width ?? 0;
      if (width === 0) return;
      setWide(width >= WIDE_BREAKPOINT_PX);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={sessionRef} className="mt-6">
      <ProjectTerminalPanel fileName="./session.sh" dormant={!active}>
        <div ref={containerRef}>
          {!active ? (
            <span className="typing-reveal-cursor inline-block h-[13px] w-[7px]" style={{ backgroundColor: TEXT }} />
          ) : (
            <div className="flex flex-col text-[13px] leading-[1.7]">
              <div style={{ color: MUTED }}>SESSION</div>
              <div className="my-1 h-px" style={{ backgroundColor: BORDER }} />

              {SESSION_LINES.slice(0, 2).map((line, i) => (
                <SessionRow key={line.id} line={line} revealed={instant || i < lineIndex} />
              ))}

              <div className="mt-2 flex flex-col">
                {SESSION_LINES.slice(2, 5).map((line, i) => (
                  <SessionRow key={line.id} line={line} revealed={instant || i + 2 < lineIndex} />
                ))}
              </div>

              <div className="mt-2 flex flex-col">
                {SESSION_LINES.slice(5, 8).map((line, i) => (
                  <SessionRow key={line.id} line={line} revealed={instant || i + 5 < lineIndex} />
                ))}
              </div>

              <div
                style={{
                  opacity: sessionDone ? 1 : 0,
                  transition: 'opacity 220ms ease-out',
                }}
              >
                <div className="my-2 h-px" style={{ backgroundColor: BORDER }} />
                <p style={{ color: SUCCESS }}>continuous verification active</p>
              </div>

              {/* Same shell session, no new panel — mirrors
                  ExecutionReplayTerminal's own `$ cat cortexa.md` beat. */}
              <div
                ref={manifestRef}
                style={{
                  height: manifestHeight,
                  overflow: 'hidden',
                  transition: instant ? 'none' : `height ${MANIFEST_EXPAND_MS}ms cubic-bezier(.22,1,.36,1)`,
                }}
                onTransitionEnd={(event) => {
                  if (event.propertyName === 'height') setManifestHeight('auto');
                }}
              >
                {showManifest && (
                  <div className="mt-4">
                    <p className="flex items-center gap-2">
                      <span style={{ color: ACCENT }}>$</span>
                      <span style={{ color: TEXT }}>cat rakshachakra.md</span>
                    </p>

                    <div className={`mt-3 ${wide ? 'grid grid-cols-2 gap-x-6' : 'flex flex-col gap-4'}`}>
                      <div>
                        <div style={{ color: MUTED }}>CORE</div>
                        <div className="my-1 h-px" style={{ backgroundColor: BORDER }} />
                        {CORE.map((item, i) => (
                          <p
                            key={item}
                            style={{
                              color: TEXT,
                              opacity: manifestRowsVisible ? 1 : 0,
                              transition: instant ? 'none' : `opacity 200ms ease-out ${i * ROW_STAGGER_MS}ms`,
                            }}
                          >
                            {item}
                          </p>
                        ))}
                      </div>
                      <div>
                        <div style={{ color: MUTED }}>CAPABILITIES</div>
                        <div className="my-1 h-px" style={{ backgroundColor: BORDER }} />
                        {CAPABILITIES.map((item, i) => (
                          <p
                            key={item}
                            style={{
                              color: TEXT,
                              opacity: manifestRowsVisible ? 1 : 0,
                              transition: instant ? 'none' : `opacity 200ms ease-out ${i * ROW_STAGGER_MS}ms`,
                            }}
                          >
                            {item}
                          </p>
                        ))}
                      </div>
                    </div>

                    <p className="mt-4 flex items-center gap-2">
                      <span style={{ color: ACCENT }}>$</span>
                      <span className="typing-reveal-cursor inline-block h-[15px] w-[7px]" style={{ backgroundColor: TEXT }} />
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </ProjectTerminalPanel>
    </div>
  );
}
