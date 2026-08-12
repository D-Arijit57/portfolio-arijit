import React, { useEffect, useRef, useState } from 'react';
import type { ArchitectureBranch, ArchitectureRoot } from '../../../experience/workspace';
import { prefersReducedMotion } from '../../../lib/typingReveal';
import { TechnologyRow } from '../pipeline/StageMetrics';
import { CONTENT_DIM, RULE, TEXT } from '../pipeline/tokens';

/** Edges are drawn a step brighter than `RULE`, the workspace's separator
 * grey: a line that divides content and a line that connects two modules
 * should not read at the same weight. */
const EDGE_RULE = '#4a4a4a';

/** One full travel of a signal along an edge. */
const FLOW_PERIOD_S = 2.6;

/** Below this container width the diagram gives up its second column and the
 * boxes stack — still a graph, just a single-file one. */
const GRAPH_MIN_PX = 300;

/**
 * architecture.ts — the system's structure, as a block diagram.
 *
 * Laid out as a real two-dimensional graph rather than a column: the branches
 * the model asserts occupy separate rows, and the stages inside each branch sit
 * side by side, so the flow turns a corner instead of running straight down.
 * That turn is the whole point — the pipeline column already answers "what
 * happens first, second, third, fourth", and a vertical list here would only
 * answer it again in a different panel. This answers "what belongs with what".
 *
 * The grouping comes from `ArchitectureBranch` (see `experience/workspace.ts`):
 * stages read from the same source highlight describe the same piece of the
 * system, so they are siblings on one row. Highlight 0 gave `intake` and
 * `extract`; highlight 2 gave `index` and `retrieve`. Nothing is renamed and
 * nothing is invented — in particular there is no gateway, database, queue or
 * service here, because the canonical model contains none.
 *
 * A box carries `stage.description` ("what this stage *is* — true of the system
 * with or without him") and its technologies. Never `claim`, never a metric:
 * those belong to the pipeline and to metrics.log respectively, and repeating
 * them here is what would collapse three artifacts into one.
 */
export function ArchitectureDiagram({
  root,
  branches,
  accents,
}: {
  root: ArchitectureRoot;
  branches: ArchitectureBranch[];
  /** Stage id → identity colour (see canvas/stageAccents.ts). */
  accents: Map<string, string>;
}) {
  const reduceMotion = prefersReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const [wide, setWide] = useState(true);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const width = entry?.contentRect.width ?? 0;
      if (width === 0) return;
      setWide(width >= GRAPH_MIN_PX);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  if (branches.length === 0) return null;

  return (
    <div ref={containerRef} className="w-full">
      <p className="mb-2 text-[11px] leading-[1.4]" style={{ color: CONTENT_DIM }}>
        {root.description}
      </p>

      <div className="flex flex-col">
        {branches.map((branch, branchIndex) => (
          <React.Fragment key={branch.id}>
            <BranchRow
              branch={branch}
              accents={accents}
              wide={wide}
              // Alternating direction is what makes the graph turn a corner:
              // the first row runs left→right, the next right→left, so the
              // whole diagram reads as a serpentine rather than a list.
              reversed={wide && branchIndex % 2 === 1}
              delay={(branchIndex * FLOW_PERIOD_S) / (branches.length * 2)}
              reduceMotion={reduceMotion}
            />
            {branchIndex < branches.length - 1 && (
              <RowLink
                accent={accents.get(branches[branchIndex + 1].blocks[0]?.id ?? '') ?? RULE}
                alignEnd={branchIndex % 2 === 0 && wide}
                delay={(branchIndex * FLOW_PERIOD_S) / (branches.length * 2) + 0.3}
                reduceMotion={reduceMotion}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

/** One subsystem: its stages side by side, joined left to right. */
function BranchRow({
  branch,
  accents,
  wide,
  reversed,
  delay,
  reduceMotion,
}: {
  branch: ArchitectureBranch;
  accents: Map<string, string>;
  wide: boolean;
  reversed: boolean;
  delay: number;
  reduceMotion: boolean;
}) {
  const blocks = reversed ? [...branch.blocks].reverse() : branch.blocks;

  return (
    <div className={wide ? 'flex items-stretch' : 'flex flex-col'}>
      {blocks.map((block, index) => (
        <React.Fragment key={block.id}>
          <BlockBox
            label={block.label}
            description={block.description}
            technologies={block.technologies}
            accent={accents.get(block.id) ?? RULE}
            hollow={block.boundary}
            wide={wide}
          />
          {index < blocks.length - 1 && (
            <EdgeLink
              direction={wide ? (reversed ? 'left' : 'right') : 'down'}
              accent={accents.get(blocks[index + 1].id) ?? RULE}
              delay={delay}
              reduceMotion={reduceMotion}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

/** A node in the graph. Bordered, compact, and coloured by its own stage. */
function BlockBox({
  label,
  description,
  technologies,
  accent,
  hollow,
  wide,
}: {
  label: string;
  description: string;
  technologies: string[];
  accent: string;
  hollow: boolean;
  wide: boolean;
}) {
  return (
    <div
      className="rounded-md px-2.5 py-1.5"
      style={{
        border: `1px solid ${hollow ? RULE : accent}`,
        ...(wide ? { flexGrow: 1, flexBasis: 0, minWidth: 0 } : {}),
      }}
    >
      <div
        className="font-mono text-[10px] uppercase tracking-[0.1em]"
        style={{ color: hollow ? CONTENT_DIM : accent }}
      >
        {label}
      </div>
      <p className="mt-1 text-[10.5px] leading-[1.35]" style={{ color: hollow ? CONTENT_DIM : TEXT }}>
        {description}
      </p>
      {technologies.length > 0 && (
        <div className="mt-1 text-[10px]">
          <TechnologyRow technologies={technologies} />
        </div>
      )}
    </div>
  );
}

/** Edge geometry, in real pixels — the containers are fixed-size, so the SVGs
 * need no viewBox and the arrowheads can never be distorted by a non-uniform
 * scale the way a percentage-based `preserveAspectRatio="none"` box would. */
const EDGE_W = 36;
const EDGE_H = 12;
const DROP_H = 22;
const HEAD = 6;
/** Static edge weight. Lifted from a 1px hairline — at that weight the edges
 * read as panel rules rather than as connections between modules — but held
 * well under the boxes' own 1px borders becoming secondary. */
const EDGE_STROKE = 1.6;

/** The travelling mark: a round dot on a `pathLength`-normalised track, so a
 * short edge and a tall drop pulse at the same apparent speed. */
function pulseProps(accent: string, delay: number) {
  return {
    stroke: accent,
    strokeWidth: 3,
    strokeLinecap: 'round' as const,
    pathLength: 100,
    strokeDasharray: '3 97',
    className: 'architecture-flow',
    style: { animationDelay: `${delay}s` },
  };
}

/**
 * An edge between two boxes on the same row.
 *
 * The arrowhead is a filled triangle drawn in the same SVG as its line rather
 * than a `▶` glyph positioned next to one — a text arrowhead sat on a
 * different baseline from the stroke it terminated and needed a hand-tuned
 * negative margin to look attached at all. Drawn together, the head lands
 * exactly on the line's end at any size.
 *
 * Under reduced motion the pulse is not rendered, leaving a static edge with
 * its arrowhead — direction is still unambiguous.
 */
function EdgeLink({
  direction,
  accent,
  delay,
  reduceMotion,
}: {
  direction: 'right' | 'left' | 'down';
  accent: string;
  delay: number;
  reduceMotion: boolean;
}) {
  if (direction !== 'down') {
    const rightwards = direction === 'right';
    // Tail-to-head along the travel direction, so the pulse always runs the
    // way the arrow points.
    const tailX = rightwards ? 1 : EDGE_W - 1;
    const headX = rightwards ? EDGE_W - 1 : 1;
    const lineEnd = rightwards ? headX - HEAD : headX + HEAD;
    const y = EDGE_H / 2;

    return (
      <div aria-hidden="true" className="flex shrink-0 items-center" style={{ width: EDGE_W }}>
        <svg width={EDGE_W} height={EDGE_H} className="overflow-visible">
          <line x1={tailX} y1={y} x2={lineEnd} y2={y} stroke={EDGE_RULE} strokeWidth={EDGE_STROKE} strokeLinecap="round" />
          <polygon
            points={`${headX},${y} ${lineEnd},${y - HEAD * 0.62} ${lineEnd},${y + HEAD * 0.62}`}
            fill={EDGE_RULE}
          />
          {!reduceMotion && (
            <line x1={tailX} y1={y} x2={lineEnd} y2={y} {...pulseProps(accent, delay)} />
          )}
        </svg>
      </div>
    );
  }

  return <Drop accent={accent} delay={delay} reduceMotion={reduceMotion} />;
}

/** A downward edge — between stacked boxes, or from one subsystem row to the
 * next. Same construction as the horizontal edge, turned through 90°. */
function Drop({
  accent,
  delay,
  reduceMotion,
}: {
  accent: string;
  delay: number;
  reduceMotion: boolean;
}) {
  const x = 6;
  const lineEnd = DROP_H - HEAD;

  return (
    <div aria-hidden="true" className="flex justify-center py-1">
      <svg width={12} height={DROP_H} className="overflow-visible">
        <line x1={x} y1={1} x2={x} y2={lineEnd} stroke={EDGE_RULE} strokeWidth={EDGE_STROKE} strokeLinecap="round" />
        <polygon
          points={`${x},${DROP_H - 1} ${x - HEAD * 0.62},${lineEnd} ${x + HEAD * 0.62},${lineEnd}`}
          fill={EDGE_RULE}
        />
        {!reduceMotion && (
          <line x1={x} y1={1} x2={x} y2={lineEnd} {...pulseProps(accent, delay)} />
        )}
      </svg>
    </div>
  );
}

/** The drop from one subsystem row to the next, aligned under whichever end of
 * the row the flow arrived at so the serpentine's corner is visible. */
function RowLink({
  accent,
  alignEnd,
  delay,
  reduceMotion,
}: {
  accent: string;
  alignEnd: boolean;
  delay: number;
  reduceMotion: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className={`flex ${alignEnd ? 'justify-end pr-[14%]' : 'justify-start pl-[14%]'}`}
    >
      <Drop accent={accent} delay={delay} reduceMotion={reduceMotion} />
    </div>
  );
}
