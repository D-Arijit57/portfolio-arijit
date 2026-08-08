import React, { useEffect, useId, useRef, useState } from 'react';
import { motion } from 'motion/react';
import type { PipelineVisualizationModel, WorkExperience } from '../../../experience/types';
import { defaultStageId } from '../../../experience/pipeline';
import { prefersReducedMotion } from '../../../lib/typingReveal';
import { WorkHistoryYamlBlock } from '../WorkHistoryYamlBlock';
import { useFileRevealSequence } from '../../../hooks/useFileRevealSequence';
import { PipelineHeader } from './PipelineHeader';
import { PipelineTrack } from './PipelineTrack';
import { StageDetail } from './StageDetail';
import { SpanningContributions } from './SpanningContributions';
import { CONTENT_DIM, RULE, SURFACE, TEXT } from './tokens';
import type { VirtualFile } from '../../../types';

/**
 * Container width below which the axis rotates from four columns to
 * stacked rows. Measured, not guessed: on the real shell the columns hold
 * up to a ~630px pane, begin overflowing vertically around ~500px as claims
 * wrap to three and four lines, and hit a hard ~80px column floor below
 * ~330px where the pane starts scrolling sideways. Same value and same
 * container-measured convention the retired WorkHistoryViewer used.
 */
const STACK_BREAKPOINT_PX = 640;

/**
 * work_history.yaml as a full-canvas engineering artifact: the system one
 * engineer worked on, with his contributions located in it.
 *
 * It replaced a 50/50 source|preview split whose right half was a rendered
 * résumé. Read as data, those four résumé sentences describe *one* internal
 * tool used by *one* operations team — he automated its intake, made its
 * contents findable, kept it stable, and shipped it with the people who use
 * it. The résumé format shredded that; this puts it back.
 *
 * Composition is sized to the editor's real canvas: header, axis, evidence
 * and the spanning band sit within one screen, so selecting a stage never
 * scrolls the pipeline out of view. That constraint is why the stages carry
 * their own claims — the workflow reads at rest, and interaction adds depth
 * rather than being the price of comprehension.
 *
 * Vertical rhythm is deliberately uneven. A flat gap between every band
 * made the evidence look like one more piece of chrome; the largest space
 * on the page is now the one between the axis and the evidence it produced,
 * because that gap is the page's only real hierarchy break.
 *
 * The source is never hidden: it's one toggle away, and the artifact labels
 * itself a reconstruction of it. Each stage names the highlight it came
 * from, so the interpretation is auditable rather than asserted.
 */
export function PipelineVisualization({
  experience,
  visualization,
  file,
}: {
  experience: WorkExperience;
  visualization: PipelineVisualizationModel;
  file: VirtualFile;
}) {
  const idPrefix = useId();
  const [selectedId, setSelectedId] = useState(() => defaultStageId(visualization));
  const [showSource, setShowSource] = useState(false);
  const [stacked, setStacked] = useState(false);
  const reduceMotion = useRef(prefersReducedMotion()).current;

  const selected = visualization.stages.find((stage) => stage.id === selectedId);

  // Four bands the eye lands on: header, axis, evidence, spanning.
  const sequence = useFileRevealSequence({ fileId: file.id, unitCount: 4 });

  // The source view is a reference, not a performance — it renders at its
  // final state with no typing, so toggling to it is instant every time.
  const sourceSequence = useFileRevealSequence({
    fileId: `${file.id}-source`,
    unitCount: 1,
    enabled: false,
  });

  // Measured against the *container*, not the viewport: this lives inside a
  // resizable editor pane, so viewport width says nothing useful about how
  // much room the axis actually has.
  useEffect(() => {
    const node = sequence.containerRef.current;
    if (!node) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const width = entry?.contentRect.width ?? 0;
      setStacked(width > 0 && width < STACK_BREAKPOINT_PX);
    });
    observer.observe(node);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={sequence.containerRef as React.RefObject<HTMLDivElement>}
      className="no-scrollbar h-full w-full overflow-y-auto overflow-x-hidden px-8 py-5"
      style={{ backgroundColor: SURFACE }}
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col">
        <motion.div initial="hidden" animate="visible" custom={0} variants={sequence.unitVariants}>
          <PipelineHeader experience={experience} visualization={visualization} />
        </motion.div>

        {/* Tight: the header is a caption to the axis, not a section of its own. */}
        <motion.div
          className="mt-4"
          initial="hidden"
          animate="visible"
          custom={1}
          variants={sequence.unitVariants}
        >
          <PipelineTrack
            stages={visualization.stages}
            selectedId={selectedId}
            idPrefix={idPrefix}
            stacked={stacked}
            onSelect={setSelectedId}
          />
        </motion.div>

        {selected && (
          <motion.div
            className="mt-7"
            initial="hidden"
            animate="visible"
            custom={2}
            variants={sequence.unitVariants}
          >
            {/* Keyed on the stage so switching crossfades the evidence
                while the accent rule slides along the axis above — the two
                together read as moving through one system rather than
                swapping panels. */}
            <motion.div
              key={selected.id}
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.12, ease: 'easeOut' }}
            >
              <StageDetail
                stage={selected}
                panelId={`${idPrefix}-panel`}
                tabId={`${idPrefix}-tab-${selected.id}`}
              />
            </motion.div>
          </motion.div>
        )}

        <motion.div
          className="mt-6"
          initial="hidden"
          animate="visible"
          custom={3}
          variants={sequence.unitVariants}
        >
          <SpanningContributions items={visualization.spanning} />
        </motion.div>

        <footer className="mt-3 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <span className="font-mono text-[11px]" style={{ color: CONTENT_DIM }}>
            {visualization.derivedFrom}
          </span>
          <button
            type="button"
            onClick={() => setShowSource((value) => !value)}
            aria-expanded={showSource}
            className="font-mono text-[11px] underline-offset-2 hover:underline focus:outline-none focus-visible:ring-1 focus-visible:ring-[#4fc1ff]"
            style={{ color: TEXT }}
          >
            {showSource ? 'hide source' : 'view source'}
          </button>

          {showSource && (
            <div className="mt-2 w-full border-t pt-4" style={{ borderColor: RULE }}>
              <WorkHistoryYamlBlock
                code={file.content}
                lang={file.type === 'typescript' ? 'ts' : file.type}
                sequence={sourceSequence}
              />
            </div>
          )}
        </footer>
      </div>
    </div>
  );
}
