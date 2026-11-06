import React from 'react';
import { ProjectTerminalPanel, ACCENT, MUTED, SUCCESS, TEXT } from './ProjectTerminalPanel';
import { useStagedReveal } from './useStagedReveal';

const ERROR = '#F87171';

interface Line {
  kind: 'cmd' | 'out' | 'gap';
  text?: string;
  parts?: Array<{ t: string; c?: string }>;
}

// Illustrative request/response flow. Every figure (150x, 46 → 0.3 ms,
// 54 → 4 queries, 150 req/s, 100k entries) is from LATTICE_DOC_MARKDOWN's
// "Measured performance" bullet; the route and field names are examples.
const LINES: Line[] = [
  { kind: 'cmd', text: 'POST /entries   type=product  { price: "free" }' },
  {
    kind: 'out',
    parts: [
      { t: '← 422  ', c: ERROR },
      { t: 'price: expected number · sku: required', c: TEXT },
    ],
  },
  { kind: 'gap' },
  { kind: 'cmd', text: 'POST /entries   type=product  { sku: "A-1", price: 19 }' },
  {
    kind: 'out',
    parts: [
      { t: '← 201  ', c: SUCCESS },
      { t: 'created · pinned to product v3', c: TEXT },
    ],
  },
  { kind: 'gap' },
  { kind: 'cmd', text: 'GET  /delivery/product   x-api-key: ••••' },
  {
    kind: 'out',
    parts: [
      { t: '← 200  ', c: SUCCESS },
      { t: 'read-only key · rate-limited per key', c: TEXT },
    ],
  },
  { kind: 'gap' },
  { kind: 'cmd', text: 'k6 run load.js   # 100k entries' },
  {
    kind: 'out',
    parts: [
      { t: 'list query   ', c: MUTED },
      { t: '46 → 0.3 ms', c: ACCENT },
      { t: '  (150x, composite index)', c: MUTED },
    ],
  },
  {
    kind: 'out',
    parts: [
      { t: 'queries/page ', c: MUTED },
      { t: '54 → 4', c: ACCENT },
      { t: '  (N+1 removed)', c: MUTED },
    ],
  },
  {
    kind: 'out',
    parts: [
      { t: 'throughput   ', c: MUTED },
      { t: '150 req/s', c: ACCENT },
      { t: '  0 errors · one worker', c: MUTED },
    ],
  },
];

/** ./request.sh — a live-looking request cycle, ending in the measured numbers. */
export function LatticeRequestTerminal({
  requestRef,
  active,
  skip,
}: {
  requestRef: React.RefObject<HTMLDivElement | null>;
  active: boolean;
  skip: boolean;
}) {
  const { revealed } = useStagedReveal({ count: LINES.length, active, skip, nodeRef: requestRef, stepMs: 170 });

  return (
    <div ref={requestRef} className="mt-10">
      <ProjectTerminalPanel fileName="./request.sh" dormant={!active} bodyPadding="p-5">
        <div className="flex flex-col text-[13px] leading-[1.6]">
          {LINES.map((line, index) => {
            const style = {
              opacity: skip || index < revealed ? 1 : 0,
              transition: skip ? 'none' : 'opacity 180ms ease-out',
            };
            if (line.kind === 'gap') return <div key={index} className="h-2" style={style} />;
            if (line.kind === 'cmd') {
              return (
                <p key={index} style={style}>
                  <span style={{ color: ACCENT }}>$ </span>
                  {line.text}
                </p>
              );
            }
            return (
              <p key={index} className="pl-4" style={style}>
                {line.parts?.map((p, i) => (
                  <span key={i} style={{ color: p.c }}>
                    {p.t}
                  </span>
                ))}
              </p>
            );
          })}
          <p style={{ opacity: skip || revealed >= LINES.length ? 1 : 0, transition: 'opacity 200ms ease-out' }}>
            <span style={{ color: ACCENT }}>$ </span>
            <span className="inline-block h-[14px] w-[7px] translate-y-[2px]" style={{ backgroundColor: MUTED }} />
          </p>
        </div>
      </ProjectTerminalPanel>
    </div>
  );
}
