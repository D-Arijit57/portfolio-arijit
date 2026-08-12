import React, { useEffect, useRef, useState } from 'react';
import type { ArchitectureBlock, ArchitectureBranch, ArchitectureRoot } from '../../../experience/workspace';
import { prefersReducedMotion } from '../../../lib/typingReveal';
import { CONTENT_DIM, DIM, STRONG, TEXT } from '../pipeline/tokens';

/** Edges are drawn a step brighter than `RULE`, the workspace's separator grey:
 * a line that divides content and a line that connects two modules should not
 * read at the same weight. */
const EDGE_RULE = '#4a4a4a';
const EDGE_STROKE = 1.6;

/** One full travel of a signal down a dotted branch. */
const FLOW_PERIOD_S = 2.8;

/** Height of the SVG bands carrying the turn and the dotted fan-out. */
const TURN_PX = 12;
const FAN_PX = 18;

/** Below this container width the diagram stacks — still the same nodes and the
 * same parent/child relationships, just one column. */
const GRAPH_MIN_PX = 300;

/**
 * architecture.ts — the system's structure, as a block diagram.
 *
 * The flow turns a corner rather than running straight down: entry and the
 * extraction subsystem across the top, the retrieval subsystem back across the
 * second row, and the outcomes fanned out beneath on dotted branches. That
 * two-dimensional reading is what separates this artifact from the pipeline
 * column, which answers "what happens first, second, third, fourth" in one
 * straight line.
 *
 * Every node is canonical:
 *
 *   entry        the context-only stage — `label` + `description`.
 *   subsystem    an `ArchitectureBranch`: the stages that share a source
 *                highlight. Identified by the union of its children's
 *                technologies and the highlight it came from, plus the labels
 *                of the stages inside it. It carries **no authored name** —
 *                the model names no subsystems, and writing "LLM Workflow" or
 *                "RAG Pipeline" here would be inventing architecture rather
 *                than reading it, even though both phrases happen to appear
 *                inside the highlight sentences.
 *   outcome      a contributed stage's `claim` and headline metric.
 *
 * The outcome row overlaps with what metrics.log and the pipeline already
 * state, and that is a deliberate, requested exception to this page's
 * otherwise strict one-fact-one-place rule: a structure diagram that never
 * shows what the structure produces reads as an inventory. The overlap is
 * bounded — claims and headline metrics only, never the full measurement set.
 *
 * There is no gateway, database, queue or service anywhere here, because the
 * canonical model contains none.
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

  const accentOf = (block?: ArchitectureBlock) =>
    (block && accents.get(block.id)) ?? EDGE_RULE;

  /** A subsystem wears the colour of its first contributing stage. */
  const branchAccent = (branch: ArchitectureBranch) =>
    accentOf(branch.blocks.find((block) => !block.boundary) ?? branch.blocks[0]);

  /**
   * Every subsystem becomes a row, and rows alternate direction so the flow
   * turns a corner instead of running straight down.
   *
   * Deliberately a map over `branches` rather than a destructured
   * `[first, second]`: the shape of this diagram follows the data, so adding a
   * fifth stage or a third source highlight to `workHistory.ts` grows the
   * diagram by a row instead of silently dropping the branch that has nowhere
   * to go. Nothing below assumes two of anything.
   *
   * Within a row: any context-only stage leads (it is the system's entry, not
   * his work), then the subsystem the branch represents, then each stage he
   * contributed, in model order.
   */
  const rows = branches.map((branch) => ({
    branch,
    nodes: [
      ...branch.blocks
        .filter((block) => block.boundary)
        .map((block) => ({ kind: 'entry' as const, block })),
      { kind: 'subsystem' as const, branch },
      ...branch.blocks
        .filter((block) => !block.boundary)
        .map((block) => ({ kind: 'stage' as const, block })),
    ],
  }));

  /** Every contributed stage that produced something — the dotted row. */
  const outcomes = branches
    .flatMap((branch) => branch.blocks)
    .filter((block) => block.claim || block.headlineMetric);

  return (
    <div ref={containerRef} className="w-full">
      <RootNode root={root} />

      {rows.map(({ branch, nodes }, rowIndex) => {
        const reversed = wide && rowIndex % 2 === 1;
        const ordered = reversed ? [...nodes].reverse() : nodes;

        return (
          <React.Fragment key={branch.id}>
            {rowIndex === 0 ? (
              <div className="h-1.5" />
            ) : (
              // The corner drops from whichever end the previous row finished
              // at, which alternates with the rows themselves.
              <Turn align={wide ? (rowIndex % 2 === 1 ? 'end' : 'start') : 'start'} />
            )}

            <div className={wide ? 'flex items-stretch' : 'flex flex-col gap-1.5'}>
              {ordered.map((node, index) => (
                <React.Fragment key={node.kind === 'subsystem' ? `sub-${branch.id}` : node.block.id}>
                  {node.kind === 'subsystem' ? (
                    <Node
                      title={
                        node.branch.technologies.length > 0
                          ? node.branch.technologies.join(' · ')
                          : 'no declared technology'
                      }
                      tag={`h${node.branch.sourceHighlight}`}
                      accent={branchAccent(node.branch)}
                      grow={wide}
                    />
                  ) : (
                    <Node
                      title={node.block.label}
                      body={node.block.description}
                      accent={node.kind === 'entry' ? EDGE_RULE : accentOf(node.block)}
                      muted={node.kind === 'entry'}
                      grow={wide}
                    />
                  )}
                  {index < ordered.length - 1 && (
                    <Arrow direction={wide ? (reversed ? 'left' : 'right') : 'down'} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </React.Fragment>
        );
      })}

      {/* The dotted fan-out, and the outcomes it feeds. */}
      {outcomes.length > 0 && (
        <>
          <DottedFan
            accents={outcomes.map((block) => accentOf(block))}
            reduceMotion={reduceMotion}
            vertical={!wide}
          />
          <div
            className={wide ? 'grid items-start' : 'flex flex-col gap-1.5'}
            style={
              wide
                ? { gridTemplateColumns: `repeat(${outcomes.length}, minmax(0, 1fr))`, gap: 8 }
                : undefined
            }
          >
            {outcomes.map((block) => (
              <Node
                key={`outcome-${block.id}`}
                title={block.claim ?? block.label}
                body={block.headlineMetric}
                accent={accentOf(block)}
                emphasis
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** The system every node belongs to. */
function RootNode({ root }: { root: ArchitectureRoot }) {
  return (
    <div className="flex justify-center">
      <div
        className="rounded-md px-3 py-0.5 text-center"
        style={{ border: `1px solid ${EDGE_RULE}`, maxWidth: '88%' }}
      >
        <div className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: STRONG }}>
          {root.label}
        </div>
        <p className="mt-0.5 text-[10px] leading-[1.3]" style={{ color: CONTENT_DIM }}>
          {root.description}
        </p>
      </div>
    </div>
  );
}

/** One block in the diagram. Squared, bordered, coloured by whatever it
 * represents — a stage, a subsystem, or an outcome. */
function Node({
  title,
  body,
  tag,
  accent,
  grow = false,
  muted = false,
  emphasis = false,
}: {
  title: string;
  body?: string;
  tag?: string;
  accent: string;
  grow?: boolean;
  /** The context-only entry node — present, but not his work. */
  muted?: boolean;
  /** An outcome. The measurement is the point, so it takes the accent. */
  emphasis?: boolean;
}) {
  return (
    <div
      className="rounded-md px-2 py-1"
      style={{
        border: `1px solid ${accent}`,
        ...(grow ? { flexGrow: 1, flexBasis: 0, minWidth: 0 } : {}),
      }}
    >
      <div className="flex flex-wrap items-baseline gap-x-1.5">
        <span
          className="font-mono text-[9.5px] uppercase tracking-[0.08em]"
          style={{ color: muted ? CONTENT_DIM : accent }}
        >
          {title}
        </span>
        {tag && (
          <span className="font-mono text-[9px]" style={{ color: DIM }}>
            {tag}
          </span>
        )}
      </div>
      {body && (
        <p
          className={`leading-[1.3] ${emphasis ? 'font-mono text-[10px] tabular-nums' : 'text-[10px]'}`}
          style={{ color: muted ? CONTENT_DIM : emphasis ? accent : TEXT }}
        >
          {body}
        </p>
      )}
    </div>
  );
}

/** A solid edge between two blocks on the same row, or between stacked ones. */
function Arrow({ direction }: { direction: 'right' | 'left' | 'down' }) {
  const HEAD = 5;

  if (direction === 'down') {
    return (
      <div aria-hidden="true" className="flex justify-center">
        <svg width={12} height={14}>
          <line x1={6} y1={0} x2={6} y2={14 - HEAD} stroke={EDGE_RULE} strokeWidth={EDGE_STROKE} />
          <polygon points={`6,14 ${6 - HEAD * 0.6},${14 - HEAD} ${6 + HEAD * 0.6},${14 - HEAD}`} fill={EDGE_RULE} />
        </svg>
      </div>
    );
  }

  const rightwards = direction === 'right';
  const W = 22;
  const tail = rightwards ? 1 : W - 1;
  const head = rightwards ? W - 1 : 1;
  const end = rightwards ? head - HEAD : head + HEAD;

  return (
    <div aria-hidden="true" className="flex shrink-0 items-center" style={{ width: W }}>
      <svg width={W} height={10}>
        <line x1={tail} y1={5} x2={end} y2={5} stroke={EDGE_RULE} strokeWidth={EDGE_STROKE} />
        <polygon points={`${head},5 ${end},${5 - HEAD * 0.6} ${end},${5 + HEAD * 0.6}`} fill={EDGE_RULE} />
      </svg>
    </div>
  );
}

/** The corner between row one and row two. */
function Turn({ align }: { align: 'start' | 'end' }) {
  const HEAD = 5;
  return (
    <div
      aria-hidden="true"
      className={`flex ${align === 'end' ? 'justify-end pr-[14%]' : 'justify-start pl-2'}`}
    >
      <svg width={12} height={TURN_PX}>
        <line x1={6} y1={0} x2={6} y2={TURN_PX - HEAD} stroke={EDGE_RULE} strokeWidth={EDGE_STROKE} />
        <polygon
          points={`6,${TURN_PX} ${6 - HEAD * 0.6},${TURN_PX - HEAD} ${6 + HEAD * 0.6},${TURN_PX - HEAD}`}
          fill={EDGE_RULE}
        />
      </svg>
    </div>
  );
}

/**
 * The dotted fan-out into the outcome row — and the one animated thing in this
 * diagram.
 *
 * These branches are dotted rather than solid because they carry a different
 * kind of relationship: the solid arrows above are the path a document takes
 * through the system, while these say "and this is what that produced". The
 * travelling pulse rides the dotted branches specifically, so the motion reads
 * as results being emitted rather than as another copy of the pipeline's
 * sequence.
 *
 * Drawn in a `0 0 100 100` viewBox with `preserveAspectRatio="none"`, so the
 * geometry is percentages and needs no measurement, and with
 * `vector-effect="non-scaling-stroke"` so that non-uniform scale can't smear
 * the stroke or the dash pattern.
 */
function DottedFan({
  accents,
  reduceMotion,
  vertical,
}: {
  accents: string[];
  reduceMotion: boolean;
  vertical: boolean;
}) {
  const count = accents.length;
  const centre = (index: number) => ((index + 0.5) / count) * 100;

  if (vertical) {
    return (
      <div aria-hidden="true" className="flex justify-start pl-2">
        <svg width={12} height={FAN_PX}>
          <line
            x1={6}
            y1={0}
            x2={6}
            y2={FAN_PX}
            stroke={EDGE_RULE}
            strokeWidth={EDGE_STROKE}
            strokeDasharray="2 3"
          />
        </svg>
      </div>
    );
  }

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="w-full"
      height={FAN_PX}
    >
      {accents.map((accent, index) => {
        const d = `M 50 0 V 44 H ${centre(index)} V 100`;
        return (
          <g key={index}>
            <path
              d={d}
              fill="none"
              stroke={EDGE_RULE}
              strokeWidth={EDGE_STROKE}
              strokeDasharray="2 3"
              vectorEffect="non-scaling-stroke"
            />
            {!reduceMotion && (
              <path
                d={d}
                fill="none"
                stroke={accent}
                strokeWidth={3}
                strokeLinecap="round"
                pathLength={100}
                strokeDasharray="3 97"
                vectorEffect="non-scaling-stroke"
                className="architecture-flow"
                style={{
                  animationDelay: `${(index * FLOW_PERIOD_S) / count}s`,
                  filter: `drop-shadow(0 0 2px ${accent})`,
                }}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}
