import { ArrowUpRight, Folder } from 'lucide-react';
import type {
  Artifact,
  ContributedArea,
  MetricReading,
  ShippedGroup,
  SourceSummary,
} from '../../../experience/workspace';
import { ExperienceTerminalPanel, PROMPT_ACCENT } from '../pipeline/terminal/ExperienceTerminalPanel';
import { ComparisonBar } from '../pipeline/StageDiff';
import { TechnologyRow } from '../pipeline/StageMetrics';
import { ArchitectureDiagram } from './ArchitectureDiagram';
import {
  CONTENT_DIM,
  DIFF_ADDED,
  DIM,
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
  accents,
  onOpenFile,
  onActiveChange,
  dimmed = false,
  anchorRef,
}: {
  artifact: Artifact;
  /** Stage id → identity colour, for the artifacts that render per-stage rows. */
  accents: Map<string, string>;
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
      // A flex wrapper with a flex-1 panel, so a grid cell that is taller than
      // this artifact's content stretches the terminal's frame rather than
      // leaving a gap beneath a short one.
      className="flex min-w-0"
      style={{
        opacity: dimmed ? 0.55 : 1,
        transition: 'opacity 200ms ease-out',
      }}
    >
      <ExperienceTerminalPanel title={artifact.title} dense fill className="min-w-0 flex-1">
        <CommandLine command={artifact.command} />

        <div className="mt-2 flex flex-1 flex-col">
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
              coverage={artifact.payload.coverage}
              accents={accents}
            />
          )}
          {artifact.kind === 'shipped' && <ShippedTree groups={artifact.payload.groups} />}
          {artifact.kind === 'source' && (
            <SourceView summary={artifact.payload.summary} onOpenFile={onOpenFile} />
          )}
        </div>

        {/* The session's resting prompt — the command has printed its output
            and the shell is waiting. Static, not blinking: four blinking
            carets across four panels would be four looping animations
            competing with the one on the architecture diagram. */}
        <div className="mt-3 font-mono text-[13px]" style={{ color: TEXT }}>
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
    <div className="font-mono text-[13px]" style={{ color: TEXT }}>
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
  coverage,
  accents,
}: {
  readings: MetricReading[];
  coverage: ContributedArea[];
  accents: Map<string, string>;
}) {
  /** A measurement owned by a stage wears that stage's colour; a spanning one
   * has no stage to borrow from and stays neutral. */
  const tick = (reading: MetricReading) =>
    reading.ownerIsStage ? accents.get(reading.ownerId) : undefined;

  return (
    <div className="flex flex-1 flex-col justify-between gap-1.5">
      {readings.map((reading) => (
        <section key={`${reading.ownerId}-${reading.id}`}>
          {/* A single-value metric states its value on the heading line rather
              than in a `total` row beneath it. Five of the six readings are
              single-valued, so folding them saves five rows — the difference
              between the composition fitting a laptop viewport and not. */}
          <div className="flex flex-wrap items-baseline gap-x-3">
            <span
              className="flex items-center gap-1.5 font-mono text-[12px] uppercase tracking-[0.08em]"
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
              <span className="font-mono text-[13px] tabular-nums" style={{ color: DIFF_ADDED }}>
                {reading.value}
              </span>
            )}
          </div>

          {/* A comparison states both ends; everything else states one value.
              The split is `comparisonGeometry()`'s, not this component's — and
              deliberately no bars: the reference reads as a log, and two
              numbers in the same unit are already legible as a pair without
              proportional marks. */}
          {reading.geometry && (
            <dl className="mt-0.5 grid grid-cols-[auto_1fr] gap-x-4 font-mono text-[12.5px]">
              <Row label="before" value={`${reading.geometry.from} ${reading.geometry.unit}`} />
              <Row label="after" value={`under ${reading.geometry.to} ${reading.geometry.unit}`} />
              {reading.improvement && (
                <Row label="improvement" value={reading.improvement} color={DIFF_ADDED} />
              )}
            </dl>
          )}
        </section>
      ))}

      {/* PRODUCTION — every area contributed to. A stage or a spanning group
          appears here if and only if the model records a contribution for it,
          so the list can never claim coverage the data doesn't have. */}
      {coverage.length > 0 && (
        <section>
          <SectionHeading label="production" />
          <ul className="m-0 mt-0.5 flex list-none flex-wrap gap-x-4 gap-y-0.5 p-0 font-mono text-[12.5px]">
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
        className="flex items-center gap-1.5 font-mono text-[12px] uppercase tracking-[0.08em]"
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
        <span className="ml-auto font-mono text-[11px]" style={{ color: DIM }}>
          {tag}
        </span>
      )}
    </div>
  );
}

function Row({ label, value, color = DIFF_ADDED }: { label: string; value: string; color?: string }) {
  return (
    <>
      <dt style={{ color: CONTENT_DIM }}>{label}</dt>
      <dd className="m-0 tabular-nums" style={{ color }}>
        {value}
      </dd>
    </>
  );
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
    <div className="flex flex-1 flex-col justify-evenly gap-2">
      {groups.map((group) => {
        const entries = entriesFor(group);
        return (
          <section key={group.id}>
            <div className="flex items-center gap-2 font-mono text-[13px]">
              <Folder size={14} aria-hidden="true" style={{ color: DIFF_ADDED }} className="shrink-0" />
              <span className="uppercase tracking-[0.08em]" style={{ color: STRONG }}>
                {group.label}
              </span>
            </div>

            <ul className="m-0 mt-0.5 list-none p-0 font-mono text-[13px]">
              {entries.map((entry, index) => (
                <li key={entry.key} className="flex gap-1.5">
                  <span aria-hidden="true" className="shrink-0" style={{ color: DIM }}>
                    {index === entries.length - 1 ? '└─' : '├─'}
                  </span>
                  <span
                    className={entry.tone === 'metric' ? 'tabular-nums' : undefined}
                    style={{
                      color: entry.tone === 'metric' ? DIFF_ADDED : entry.tone === 'tech' ? CONTENT_DIM : TEXT,
                    }}
                  >
                    {entry.text}
                  </span>
                </li>
              ))}
            </ul>

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
 * The source artifact — a short YAML head of the file itself, so the panel
 * says something at rest, and a link to open the whole file in the editor.
 *
 * It used to carry a "show source" toggle that expanded the full ~28-line YAML
 * inline; that is gone — the file is one click away in the editor, and the
 * expanded copy made this terminal several times taller than its neighbours.
 */
function SourceView({
  summary,
  onOpenFile,
}: {
  summary: SourceSummary;
  onOpenFile?: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col justify-evenly gap-2">
      {/* Every value is read off the canonical model — the same fields the
          full source prints. */}
      <pre className="m-0 font-mono text-[13px] leading-[1.5]" style={{ color: TEXT }}>
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

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onOpenFile}
          className="inline-flex items-center gap-1 font-mono text-[13px] transition-colors hover:text-[#cccccc] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#569cd6]"
          style={{ color: PROMPT_ACCENT }}
        >
          open in editor
          <ArrowUpRight size={11} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
