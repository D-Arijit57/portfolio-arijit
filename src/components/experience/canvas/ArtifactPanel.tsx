import React, { useId, useRef } from 'react';
import { ChevronRight, ArrowUpRight, Folder, Check } from 'lucide-react';
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
  accents,
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
  /** Stage id → identity colour, for the artifacts that render per-stage rows. */
  accents: Map<string, string>;
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
      <ExperienceTerminalPanel title={artifact.title} dense>
        <CommandLine command={artifact.command} />

        <div className="mt-2">
          {artifact.kind === 'architecture' && (
            <ArchitectureDiagram
              root={artifact.payload.root}
              branches={artifact.payload.branches}
              accents={accents}
            />
          )}
          {artifact.kind === 'metrics' && <MetricsLog readings={artifact.payload.readings} accents={accents} />}
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

        {/* The session's resting prompt — the command has printed its output
            and the shell is waiting. Static, not blinking: four blinking
            carets across four panels would be four looping animations
            competing with the one on the architecture diagram. */}
        <div className="mt-1.5 font-mono text-[12px]" style={{ color: TEXT }}>
          <span style={{ color: PROMPT_ACCENT }}>$</span>{' '}
          <span aria-hidden="true" style={{ color: DIM }}>
            _
          </span>
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
 * Measurements, one titled group each — the reference's own log format.
 *
 * A reading carrying `geometry` states both ends and the derived change;
 * everything else states a single total. That split is `comparisonGeometry()`'s
 * and not this component's, which is the page's honesty rule made structural:
 * there is no branch here that could render "−35%" as anything other than the
 * string the model wrote, because the only branch that treats a metric as a
 * pair requires a `comparison` the model has to have granted first.
 *
 * Proportional bars were rendered here in an earlier pass and are gone: the
 * reference reads as a log, and two numbers in one unit are already legible as
 * a pair. `ComparisonBar` (StageDiff.tsx) is untouched and still exports.
 */
function MetricsLog({ readings, accents }: { readings: MetricReading[]; accents: Map<string, string> }) {
  /** A measurement owned by a stage wears that stage's colour; a spanning one
   * has no stage to borrow from and stays neutral. */
  const tick = (reading: MetricReading) =>
    reading.ownerIsStage ? accents.get(reading.ownerId) : undefined;

  return (
    <div className="flex flex-col gap-2">
      {readings.map((reading) => (
        <section key={`${reading.ownerId}-${reading.id}`}>
          {/* A single-value metric states its value on the heading line rather
              than in a `total` row beneath it. Five of the six readings are
              single-valued, so folding them saves five rows — the difference
              between the composition fitting a laptop viewport and not. */}
          <div className="flex flex-wrap items-baseline gap-x-3">
            <span
              className="flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.08em]"
              style={{ color: STRONG }}
            >
              {tick(reading) && (
                <span
                  aria-hidden="true"
                  className="block h-[5px] w-[5px] shrink-0 rounded-full"
                  style={{ backgroundColor: tick(reading) }}
                />
              )}
              {reading.label}
            </span>
            {!reading.geometry && (
              <span className="font-mono text-[11px] tabular-nums" style={{ color: METRIC }}>
                {reading.value}
              </span>
            )}
            <span className="ml-auto font-mono text-[10px]" style={{ color: DIM }}>
              {highlightTags(reading.sourceHighlights)}
            </span>
          </div>

          {/* A comparison states both ends; everything else states one value.
              The split is `comparisonGeometry()`'s, not this component's — and
              deliberately no bars: the reference reads as a log, and two
              numbers in the same unit are already legible as a pair without
              proportional marks. */}
          {reading.geometry && (
            <dl className="mt-0.5 grid grid-cols-[auto_1fr] gap-x-4 font-mono text-[11px]">
              <Row label="before" value={`${reading.geometry.from} ${reading.geometry.unit}`} />
              <Row label="after" value={`under ${reading.geometry.to} ${reading.geometry.unit}`} />
              {reading.improvement && (
                <Row label="improvement" value={reading.improvement} color={DIFF_ADDED} />
              )}
            </dl>
          )}
        </section>
      ))}
    </div>
  );
}

function Row({ label, value, color = METRIC }: { label: string; value: string; color?: string }) {
  return (
    <>
      <dt style={{ color: CONTENT_DIM }}>{label}</dt>
      <dd className="m-0 tabular-nums" style={{ color }}>
        {value}
      </dd>
    </>
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
  const deliverables = groups.flatMap((group) => group.deliverables ?? []);
  const generated = groups.some((group) => group.deliverables);

  return (
    <div>
      {/* The listing `ls shipped/` actually produced. */}
      {deliverables.length > 0 && (
        <ul className="m-0 list-none space-y-1 p-0 font-mono text-[11.5px]">
          {deliverables.map((name) => (
            <li key={name} className="flex items-center gap-2">
              <Folder size={12} aria-hidden="true" style={{ color: METRIC }} className="shrink-0" />
              <span style={{ color: TEXT }}>{name}/</span>
              <span className="ml-auto flex items-center gap-1" style={{ color: DIFF_ADDED }}>
                <Check size={11} aria-hidden="true" />
                delivered
              </span>
            </li>
          ))}
        </ul>
      )}

      {generated && (
        <p className="mt-1.5 text-[10px] leading-[1.4]" style={{ color: DIM }}>
          placeholder names, generated from the delivered count — the source does not name them
        </p>
      )}

      {/* The reference lists every cross-cutting measurement here as bullets.
          They are not repeated: all three already appear in metrics.log, which
          owns measurement for the whole page, and printing them twice within
          one screen is duplication rather than composition. shipped/ keeps what
          only it can say — what was delivered, and what was done. */}

      {/* The contribution sentences, verbatim but compact.
​
          The reference drops these entirely; they are kept because with
          `StageDetail` gone from the pipeline column this is the only place on
          the page the canonical contribution wording survives, and losing it
          would leave the bullets above asserting outcomes with nothing stating
          what was actually done. Held to one tight block per group — label and
          technologies inline, sentence beneath — so keeping them costs the
          composition a few lines rather than a fold. */}
      <div className="mt-2 space-y-1" style={{ borderTop: `1px solid ${RULE}`, paddingTop: 8 }}>
        {groups.map((group) => (
          <p key={group.id} className="text-[10.5px] leading-[1.35]" style={{ color: CONTENT_DIM }}>
            <span
              className="font-mono uppercase tracking-[0.08em]"
              style={{ color: STRONG }}
            >
              {group.label}
            </span>
            {group.technologies.length > 0 && (
              <span className="ml-1.5" style={{ color: DIM }}>
                {group.technologies.join(' · ')}
              </span>
            )}
            <span className="ml-1.5">{group.contribution}</span>
          </p>
        ))}
      </div>
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
