import React, { useEffect, useRef, useState } from 'react';
import type { ArchitectureBlock } from '../../../experience/workspace';
import { TechnologyRow } from '../pipeline/StageMetrics';
import { PipelineArrow } from '../pipeline/terminal/PipelineArrow';
import { CONTENT_DIM, DIM, MUTED, RULE, STRONG, TEXT } from '../pipeline/tokens';

/** Below this the flow stacks. Measured on the diagram's own container, not
 * the window — the artifact's width is what decides whether four blocks fit
 * side by side, and that depends on the pane and the grid, not the viewport. */
const HORIZONTAL_MIN_PX = 560;

/**
 * architecture.ts — the system as *structure*: what it is made of, and with
 * what.
 *
 * This is the artifact most at risk of becoming a second copy of the pipeline,
 * since both are projections of the same four stages. Two things keep them
 * apart, and both are deliberate.
 *
 * **Different fields.** A block renders `stage.description` — "what this stage
 * *is* — true of the system with or without him" — and its declared
 * technologies. It never renders `claim` and never renders a metric. The
 * pipeline column does the opposite: `claim ?? description` plus the
 * measurement. One says what the system is; the other says what changed.
 *
 * **Different axis.** The flow runs left to right wherever it fits, against
 * the pipeline's vertical column. That is also what lets the diagram use a
 * wide panel densely instead of stacking four short boxes down one edge of it,
 * and it means the horizontal `PipelineArrow` — the same connector component
 * the pipeline uses vertically — is reused here rather than redrawn.
 *
 * A stage that declares no technology is the flow's boundary: the document
 * arriving, not a component of the system. Drawn with a dashed frame and no
 * technology row rather than as a block with an empty one.
 */
export function ArchitectureDiagram({ blocks }: { blocks: ArchitectureBlock[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [horizontal, setHorizontal] = useState(true);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const width = entry?.contentRect.width ?? 0;
      if (width === 0) return;
      setHorizontal(width >= HORIZONTAL_MIN_PX);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  if (blocks.length === 0) return null;

  return (
    <div
      ref={containerRef}
      // items-start, not items-stretch: a boundary block carries two lines
      // where a technology-bearing one carries four, and forcing them to a
      // shared height puts most of a box's area below its own last line.
      className={horizontal ? 'flex w-full items-start' : 'flex w-full flex-col'}
    >
      {blocks.map((block, index) => (
        <React.Fragment key={block.id}>
          <Block block={block} horizontal={horizontal} />
          {index < blocks.length - 1 &&
            (horizontal ? (
              // grow 0.12: the blocks carry the information, so the connector
              // takes only enough width to read as a link between them.
              <PipelineArrow direction="right" grow={0.12} lit />
            ) : (
              <Stem />
            ))}
        </React.Fragment>
      ))}
    </div>
  );
}

function Block({ block, horizontal }: { block: ArchitectureBlock; horizontal: boolean }) {
  return (
    <div
      className="rounded-md px-3 py-2"
      style={{
        border: `1px ${block.boundary ? 'dashed' : 'solid'} ${RULE}`,
        ...(horizontal ? { flexGrow: 1, flexBasis: 0, minWidth: 0 } : {}),
      }}
    >
      <div
        className="font-mono text-[10.5px] uppercase tracking-[0.12em]"
        style={{ color: block.boundary ? MUTED : STRONG }}
      >
        {block.label}
      </div>
      <p
        className="mt-1 text-[11.5px] leading-[1.4]"
        style={{ color: block.boundary ? CONTENT_DIM : TEXT }}
      >
        {block.description}
      </p>
      {block.technologies.length > 0 && (
        <div className="mt-1.5 text-[11px]">
          <TechnologyRow technologies={block.technologies} />
        </div>
      )}
    </div>
  );
}

/** The drop between two stacked blocks — a hairline and the same ▼ glyph the
 * pipeline connector uses, centred under a full-width box. `PipelineArrow`'s
 * own `down` mode insets its stem 15px to sit beneath the pipeline's `[0N]`
 * marker, which is right there and visibly off-centre here. */
function Stem() {
  return (
    <div aria-hidden="true" className="flex flex-col items-center py-0.5">
      <div className="w-px" style={{ height: 10, backgroundColor: RULE }} />
      <span className="-mt-[3px] text-[9px] leading-none" style={{ color: DIM }}>
        ▼
      </span>
    </div>
  );
}
