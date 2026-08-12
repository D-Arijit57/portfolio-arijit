import React, { useId, useRef } from 'react';
import { ChevronRight, ArrowUpRight, Folder, Check } from 'lucide-react';
import type {
  Artifact,
  ContributedArea,
  MetricReading,
  ShippedGroup,
  SourceSummary,
  StateChange,
} from '../../../experience/workspace';
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
          {artifact.kind === 'metrics' && (
            <MetricsLog
              readings={artifact.payload.readings}
              changes={artifact.payload.changes}
              stack={artifact.payload.stack}
              coverage={artifact.payload.coverage}
              accents={accents}
            />
          )}
          {artifact.kind === 'shipped' && <ShippedTree groups={artifact.payload.groups} />}
          {artifact.kind === 'source' && (
            <SourceView
              file={file}
              summary={artifact.payload.summary}
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
function MetricsLog({
  readings,
  changes,
  stack,
  coverage,
  accents,
}: {
  readings: MetricReading[];
  changes: StateChange[];
  stack: string[];
  coverage: ContributedArea[];
  accents: Map<string, string>;
}) {
  /** A measurement owned by a stage wears that stage's colour; a spanning one
   * has no stage to borrow from and stays neutral. */
  const tick = (reading: MetricReading) =>
    reading.ownerIsStage ? accents.get(reading.ownerId) : undefined;

  return (
    <div className="flex flex-col gap-1.5">
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

      {/* DEBUGGING — the model's only qualitative evidence: a described state
          change with no number attached. Carried on the stage all along and
          previously unrendered. */}
      {changes.map((change) => (
        <section key={`change-${change.ownerId}`}>
          <SectionHeading
            label="debugging"
            tag={`${change.ownerLabel} · ${highlightTags(change.sourceHighlights)}`}
            accent={accents.get(change.ownerId)}
          />
          <dl className="mt-0.5 grid grid-cols-[auto_1fr] gap-x-2 font-mono text-[10.5px] leading-[1.35]">
            <Row label="before" value={change.before} color={DIFF_REMOVED} />
            <Row label="after" value={change.after} color={DIFF_ADDED} />
          </dl>
        </section>
      ))}

      {/* STACK — `experience.tech`, verbatim. One column per entry: three
          technologies in two columns left a half-empty second row, and the
          panel's height is what decides whether the composition fits a laptop
          viewport without scrolling. */}
      {stack.length > 0 && (
        <section>
          <SectionHeading label="stack" />
          <ul className="mt-0.5 m-0 grid list-none grid-cols-3 gap-x-3 p-0 font-mono text-[11px]" style={{ color: TEXT }}>
            {stack.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      )}

      {/* PRODUCTION — every area contributed to. A stage or a spanning group
          appears here if and only if the model records a contribution for it,
          so the list can never claim coverage the data doesn't have. */}
      {coverage.length > 0 && (
        <section>
          <SectionHeading label="production" />
          <ul className="m-0 mt-0.5 flex list-none flex-wrap gap-x-4 gap-y-0.5 p-0 font-mono text-[11px]">
            {coverage.map((area) => (
              <li key={`cov-${area.id}`} className="flex items-baseline gap-1.5">
                <span style={{ color: DIFF_ADDED }}>✓</span>
                <span style={{ color: CONTENT_DIM }}>{area.label}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** A titled band inside metrics.log — an optional identity dot, the section
 * name, and an optional right-aligned provenance tag. */
function SectionHeading({ label, tag, accent }: { label: string; tag?: string; accent?: string }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3">
      <span
        className="flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.08em]"
        style={{ color: STRONG }}
      >
        {accent && (
          <span
            aria-hidden="true"
            className="block h-[5px] w-[5px] shrink-0 rounded-full"
            style={{ backgroundColor: accent }}
          />
        )}
        {label}
      </span>
      {tag && (
        <span className="ml-auto font-mono text-[10px]" style={{ color: DIM }}>
          {tag}
        </span>
      )}
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
  /**
   * Each contribution renders as a directory with its own entries — the shape
   * `ls` actually produces, and the reason this panel stopped looking empty.
   *
   * Every entry is read off the group: its technologies, each of its metrics,
   * and any generated deliverable names. Nothing is authored here, so a group
   * the model gives one fact to shows one line rather than being padded out to
   * match its neighbour.
   */
  const entriesFor = (group: ShippedGroup) => {
    const entries: { key: string; text: string; tone: 'tech' | 'metric' | 'name' }[] = [];
    for (const name of group.deliverables ?? []) {
      entries.push({ key: `d-${name}`, text: `${name}/`, tone: 'name' });
    }
    if (group.technologies.length > 0) {
      entries.push({ key: 't', text: group.technologies.join(' · '), tone: 'tech' });
    }
    for (const metric of group.metrics) {
      entries.push({ key: `m-${metric.id}`, text: `${metric.value} ${metric.label}`, tone: 'metric' });
    }
    return entries;
  };

  const generated = groups.some((group) => group.deliverables);

  return (
    <div className="flex flex-col gap-2">
      {groups.map((group) => {
        const entries = entriesFor(group);
        return (
          <section key={group.id}>
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <Folder size={12} aria-hidden="true" style={{ color: METRIC }} className="shrink-0" />
              <span className="uppercase tracking-[0.08em]" style={{ color: STRONG }}>
                {group.label}
              </span>
              <span className="ml-auto" style={{ color: DIM }}>
                {group.sourceHighlights.map((i) => `h${i}`).join(' ')}
              </span>
            </div>

            <ul className="m-0 mt-0.5 list-none p-0 font-mono text-[11px]">
              {entries.map((entry, index) => (
                <li key={entry.key} className="flex gap-1.5">
                  <span aria-hidden="true" className="shrink-0" style={{ color: DIM }}>
                    {index === entries.length - 1 ? '└─' : '├─'}
                  </span>
                  <span
                    className={entry.tone === 'metric' ? 'tabular-nums' : undefined}
                    style={{
                      color: entry.tone === 'metric' ? METRIC : entry.tone === 'tech' ? CONTENT_DIM : TEXT,
                    }}
                  >
                    {entry.text}
                  </span>
                </li>
              ))}
            </ul>

            <p className="mt-0.5 text-[10px] leading-[1.35]" style={{ color: CONTENT_DIM }}>
              {group.contribution}
            </p>
          </section>
        );
      })}

      {generated && (
        <p className="text-[10px] leading-[1.4]" style={{ color: DIM }}>
          placeholder names, generated from the delivered count — the source does not name them
        </p>
      )}
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
  summary,
  expanded,
  onToggleExpanded,
  onOpenFile,
}: {
  file: VirtualFile;
  summary: SourceSummary;
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
      {/* A short YAML head of the file itself, so the panel says something at
          rest instead of being a bare toggle. Every value is read off the
          canonical model — the same fields the full source below prints. */}
      <pre className="m-0 font-mono text-[11px] leading-[1.5]" style={{ color: TEXT }}>
        <span style={{ color: PROMPT_ACCENT }}>experience</span>:{'\n'}
        {'  '}<span style={{ color: PROMPT_ACCENT }}>role</span>:{' '}
        <span style={{ color: CONTENT_DIM }}>{summary.role}</span>
        {'\n'}
        {'  '}<span style={{ color: PROMPT_ACCENT }}>stack</span>:{'\n'}
        {summary.stack.map((item) => (
          <span key={item}>
            {'    - '}
            <span style={{ color: CONTENT_DIM }}>{item}</span>
            {'\n'}
          </span>
        ))}
      </pre>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
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
