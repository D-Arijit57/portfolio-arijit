import React, { useId, useRef } from 'react';
import { ChevronRight, ArrowUpRight } from 'lucide-react';
import type { Artifact, MetricReading, ShippedGroup } from '../../../experience/workspace';
import type { VirtualFile } from '../../../types';
import { prefersReducedMotion } from '../../../lib/typingReveal';
import { useFileRevealSequence } from '../../../hooks/useFileRevealSequence';
import { ExperienceTerminalPanel, PROMPT_ACCENT } from '../pipeline/terminal/ExperienceTerminalPanel';
import { ComparisonBar } from '../pipeline/StageDiff';
import { TechnologyRow } from '../pipeline/StageMetrics';
import { WorkHistoryYamlBlock } from '../WorkHistoryYamlBlock';
import { ArchitectureDiagram } from './ArchitectureDiagram';
import {
  CONTENT_DIM,
  DIFF_ADDED,
  DIFF_REMOVED,
  DIM,
  METRIC,
  RULE,
  STRONG,
  TEXT,
} from '../pipeline/tokens';

/**
 * One artifact, in the workspace's own terminal shell.
 *
 * A thin switch on `Artifact.kind`, not a plugin system: four known kinds,
 * each delegating to a renderer that is either an existing component
 * (`ArchitectureDiagram`, `ComparisonBar`, `TechnologyRow`,
 * `WorkHistoryYamlBlock`) or a few rows of markup over data the derivation
 * layer already shaped. Nothing here reads `workHistory.ts`; everything comes
 * in through `artifact`.
 *
 * The shell is `ExperienceTerminalPanel` unchanged — same chrome, same traffic
 * lights, same header — so all four artifacts and the pipeline read as
 * sessions in one workspace rather than as four cards.
 */
export function ArtifactPanel({
  artifact,
  file,
  expanded,
  onToggleExpanded,
  onOpenFile,
  onActiveChange,
  dimmed = false,
  anchorRef,
}: {
  artifact: Artifact;
  /** Only needed by the `source` artifact — it renders the genuine VFS content. */
  file: VirtualFile;
  expanded?: boolean;
  onToggleExpanded?: () => void;
  onOpenFile?: () => void;
  /** Hover/focus enter and leave — drives connector emphasis (Phase 5). */
  onActiveChange?: (active: boolean) => void;
  dimmed?: boolean;
  anchorRef?: (node: HTMLDivElement | null) => void;
}) {
  return (
    <div
      ref={anchorRef}
      onMouseEnter={() => onActiveChange?.(true)}
      onMouseLeave={() => onActiveChange?.(false)}
      onFocus={() => onActiveChange?.(true)}
      onBlur={() => onActiveChange?.(false)}
      style={{
        opacity: dimmed ? 0.55 : 1,
        transition: 'opacity 200ms ease-out',
      }}
    >
      <ExperienceTerminalPanel title={artifact.title}>
        <CommandLine command={artifact.command} />

        <div className="mt-3">
          {artifact.kind === 'architecture' && <ArchitectureDiagram blocks={artifact.payload.blocks} />}
          {artifact.kind === 'metrics' && <MetricsLog readings={artifact.payload.readings} />}
          {artifact.kind === 'shipped' && <ShippedTree groups={artifact.payload.groups} />}
          {artifact.kind === 'source' && (
            <SourceView
              file={file}
              expanded={expanded ?? false}
              onToggleExpanded={onToggleExpanded}
              onOpenFile={onOpenFile}
            />
          )}
        </div>
      </ExperienceTerminalPanel>
    </div>
  );
}

/** The `$ command` row every artifact opens with — the same short prompt form
 * the pipeline's own "view source" trigger already uses, not the full
 * `user@host:cwd$` line, which at four repetitions would be chrome rather
 * than information. */
function CommandLine({ command }: { command: string }) {
  return (
    <div className="font-mono text-[12px]" style={{ color: TEXT }}>
      <span style={{ color: PROMPT_ACCENT }}>$</span> {command}
    </div>
  );
}

/* ─────────────────────────── metrics.log ────────────────────────── */

/**
 * Measurements, split by what the data will bear.
 *
 * A reading carrying `geometry` — which only `comparisonGeometry()` can grant
 * — gets the full before/after treatment with proportional bars. Everything
 * else is a label and a value string in a compact list. That split is the
 * page's honesty rule made visible: the one metric with two commensurable
 * numbers looks different because it *is* different, and no amount of layout
 * pressure can turn "−35%" into a bar, because this component has no branch
 * that would draw one.
 */
function MetricsLog({ readings }: { readings: MetricReading[] }) {
  const reduceMotion = useRef(prefersReducedMotion()).current;
  const compared = readings.filter((reading) => reading.geometry);
  const plain = readings.filter((reading) => !reading.geometry);

  return (
    // The comparison and the plain list sit side by side once there is room.
    // Stacked in a wide panel they left the right half empty, which is the
    // dead space this composition is judged on.
    <div
      className="grid items-start gap-x-8 gap-y-4"
      style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}
    >
      {compared.map((reading) => {
        const geometry = reading.geometry!;
        return (
          <div key={`${reading.ownerId}-${reading.id}`}>
            <ReadingHeading reading={reading} />
            {/* The track is capped well short of the panel so both bars keep
                their value label on the same line. At beforeRatio 1.0 the
                longer bar fills this width exactly, which is what makes the
                pair readable as a ratio rather than as two loose lines. */}
            <div className="mt-2 flex w-full max-w-[190px] flex-col gap-1.5">
              <ComparisonBar
                ratio={geometry.beforeRatio}
                color={DIFF_REMOVED}
                label={`${geometry.from} ${geometry.unit}`}
                reduceMotion={reduceMotion}
              />
              <ComparisonBar
                ratio={geometry.afterRatio}
                color={DIFF_ADDED}
                label={`under ${geometry.to} ${geometry.unit}`}
                reduceMotion={reduceMotion}
              />
            </div>
            {reading.improvement && (
              <div className="mt-2 flex items-baseline gap-2 font-mono text-[12px]">
                <span style={{ color: CONTENT_DIM }}>improvement</span>
                <span className="tabular-nums" style={{ color: DIFF_ADDED }}>
                  {reading.improvement}
                </span>
              </div>
            )}
          </div>
        );
      })}

      {/* Label, value, provenance as three real columns — the provenance was
          inline with the label first, which pushed every row to two lines and
          made five short measurements read as a paragraph. */}
      {plain.length > 0 && (
        <dl className="grid grid-cols-[1fr_auto_auto] items-baseline gap-x-4 gap-y-1.5 font-mono text-[11.5px]">
          {plain.map((reading) => (
            <React.Fragment key={`${reading.ownerId}-${reading.id}`}>
              <dt className="min-w-0" style={{ color: CONTENT_DIM }}>
                {reading.label}
              </dt>
              <dd className="m-0 tabular-nums text-right" style={{ color: METRIC }}>
                {reading.value}
              </dd>
              {/* Highlight tags only. The owner's name lived here too and cost
                  enough width to truncate every label in the column; the
                  measurement's own label already says what it is, and the tag
                  is the part that's actually traceable. */}
              <dd className="m-0 whitespace-nowrap text-right" style={{ color: DIM }}>
                {highlightTags(reading.sourceHighlights)}
              </dd>
            </React.Fragment>
          ))}
        </dl>
      )}
    </div>
  );
}

function ReadingHeading({ reading }: { reading: MetricReading }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4">
      <span
        className="font-mono text-[11px] uppercase tracking-[0.1em]"
        style={{ color: STRONG }}
      >
        {reading.label}
      </span>
      <span className="font-mono text-[11px]" style={{ color: DIM }}>
        {provenanceOf(reading)}
      </span>
    </div>
  );
}

/** "h0", "h2 h3" — the highlight indices the derivation layer carried through,
 * in the same shorthand the pipeline column uses. */
function highlightTags(sourceHighlights: number[]): string {
  return sourceHighlights.map((index) => `h${index}`).join(' ');
}

/** "retrieve · h2" — the owner's own label plus its highlight tags. Used where
 * there is room for both: the comparison heading, which sits on its own line. */
function provenanceOf(reading: MetricReading): string {
  const tags = highlightTags(reading.sourceHighlights);
  return tags ? `${reading.ownerLabel} · ${tags}` : reading.ownerLabel;
}

/* ──────────────────────────── shipped/ ──────────────────────────── */

/**
 * Cross-cutting work — the contributions that aren't stages because nothing
 * flows through them.
 *
 * Groups render in the order the derivation layer emitted them, which puts a
 * group with generated deliverables first. The generated names carry an
 * explicit disclosure directly beneath them: the model states how many
 * features were delivered and never names them, and a listing that looked
 * like real filenames without saying so would be the one dishonest thing on
 * the page.
 */
function ShippedTree({ groups }: { groups: ShippedGroup[] }) {
  return (
    // Side by side once there is room, stacked when there isn't. The artifact
    // spans the full canvas width, and two short contributions stacked in a
    // wide panel is precisely the dead space this layout is judged on.
    <div
      className="grid gap-x-8 gap-y-5"
      style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))' }}
    >
      {groups.map((group) => (
        <section key={group.id}>
          <h3
            className="font-mono text-[11px] uppercase tracking-[0.1em]"
            style={{ color: STRONG }}
          >
            {group.label}
          </h3>

          {group.deliverables && (
            <div className="mt-1.5">
              <ul className="m-0 list-none p-0 font-mono text-[12px]" style={{ color: TEXT }}>
                {group.deliverables.map((name, index) => (
                  <li key={name}>
                    <span aria-hidden="true" style={{ color: DIM }}>
                      {index === group.deliverables!.length - 1 ? '└─ ' : '├─ '}
                    </span>
                    {name}/
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-[11px] leading-[1.45]" style={{ color: DIM }}>
                placeholder names, generated from the delivered count — the source does not name them
              </p>
            </div>
          )}

          <p className="mt-2 text-[12px] leading-[1.55]" style={{ color: TEXT }}>
            {group.contribution}
          </p>

          {group.technologies.length > 0 && (
            <div className="mt-1.5">
              <TechnologyRow technologies={group.technologies} />
            </div>
          )}

          {group.metrics.length > 0 && (
            <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-5 gap-y-1 font-mono text-[12px]">
              {group.metrics.map((metric) => (
                <React.Fragment key={metric.id}>
                  <dt style={{ color: CONTENT_DIM }}>{metric.label}</dt>
                  <dd className="m-0 tabular-nums text-right" style={{ color: METRIC }}>
                    {metric.value}
                  </dd>
                </React.Fragment>
              ))}
            </dl>
          )}
        </section>
      ))}
    </div>
  );
}

/* ───────────────────────── americanchase.yaml ───────────────────── */

/**
 * The source artifact — collapsed by default so ~28 lines of YAML can't
 * dominate the canvas, and mounted lazily so it costs nothing until opened.
 *
 * Both behaviours are `PipelineVisualization`'s own: the `0fr ↔ 1fr`
 * grid-template-rows transition (the measurement-free way to animate an
 * unknown height) and the `hasOpened` latch. `WorkHistoryYamlBlock` renders
 * the genuine VFS content with a disabled reveal sequence, so opening it is
 * instant every time.
 */
function SourceView({
  file,
  expanded,
  onToggleExpanded,
  onOpenFile,
}: {
  file: VirtualFile;
  expanded: boolean;
  onToggleExpanded?: () => void;
  onOpenFile?: () => void;
}) {
  const panelId = useId();
  const reduceMotion = useRef(prefersReducedMotion()).current;
  const openedRef = useRef(false);
  if (expanded) openedRef.current = true;

  const sequence = useFileRevealSequence({
    fileId: `${file.id}-canvas-source`,
    unitCount: 1,
    enabled: false,
  });

  const lineCount = file.content.split('\n').length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <button
          type="button"
          onClick={onToggleExpanded}
          aria-expanded={expanded}
          aria-controls={panelId}
          className="flex items-center gap-1.5 font-mono text-[12px] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#569cd6]"
          style={{ color: CONTENT_DIM }}
        >
          <ChevronRight
            size={12}
            aria-hidden="true"
            style={{
              transform: expanded ? 'rotate(90deg)' : 'none',
              transition: reduceMotion ? 'none' : 'transform 150ms ease-out',
            }}
          />
          {expanded ? 'hide' : 'show'} source
          <span style={{ color: DIM }}>· {lineCount} lines</span>
        </button>

        <button
          type="button"
          onClick={onOpenFile}
          className="inline-flex items-center gap-1 font-mono text-[12px] transition-colors hover:text-[#cccccc] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#569cd6]"
          style={{ color: PROMPT_ACCENT }}
        >
          open in editor
          <ArrowUpRight size={11} aria-hidden="true" />
        </button>
      </div>

      <div
        id={panelId}
        style={{
          display: 'grid',
          gridTemplateRows: expanded ? '1fr' : '0fr',
          transition: reduceMotion ? 'none' : 'grid-template-rows 220ms ease-out',
        }}
      >
        <div className="overflow-hidden">
          {openedRef.current && (
            <div className="mt-3">
              <WorkHistoryYamlBlock
                code={file.content}
                lang={file.type === 'typescript' ? 'ts' : file.type}
                sequence={sequence}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
