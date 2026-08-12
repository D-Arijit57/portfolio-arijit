import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../../../store/useStore';
import { buildExperienceWorkspace, WORK_HISTORY_FILE_ID } from '../../../experience/workspace';
import type { WorkExperience } from '../../../experience/types';
import type { VirtualFile } from '../../../types';
import { WorkspaceHeader } from './WorkspaceHeader';
import { ArtifactPanel } from './ArtifactPanel';
import { SystemPipeline } from './SystemPipeline';
import { ArtifactConnectors, type ConnectorEdge } from '../../shared/ArtifactConnectors';
import { ACCENT, CONTENT_DIM, DIM, METRIC, SURFACE } from '../pipeline/tokens';

/**
 * Relationship kind → the workspace's own palette. Colour lives here rather
 * than in the derivation layer: `experience/workspace.ts` is a pure model
 * module and has no business importing a component's tokens.
 *
 * `describes` takes the prompt blue the page already uses for structure and
 * selection; `measures` takes the metric amber every measurement on this page
 * is already printed in, so a wire and the number it points at are the same
 * colour. `evidences` is chrome grey and only ever appears on hover.
 */
const RELATIONSHIP_COLOR: Record<string, string> = {
  describes: ACCENT,
  measures: METRIC,
  evidences: CONTENT_DIM,
};

// Connectors are enabled at the `wide` tier only — below it the pipeline has
// reflowed beneath the artifacts and every wire would be a long vertical drop
// across the whole page. They are progressive enhancement, so they simply
// stop; nothing they carry is unavailable in text.

/** Below this container width the pipeline stops being a column and becomes a
 * full-width section beneath the artifacts. Measured on the canvas element,
 * not the window: Explorer auto-collapses at 1024px, so the editor pane is
 * meaningfully wider than the viewport around that breakpoint and window width
 * would place this boundary in the wrong place. */
const COLUMN_BREAKPOINT_PX = 900;

/** Below this the artifact grid drops to a single column. */
const SINGLE_COLUMN_BREAKPOINT_PX = 620;

type Tier = 'wide' | 'medium' | 'narrow';

/**
 * americanchase.yaml, as an engineering workspace.
 *
 * The page is a projection: `buildExperienceWorkspace()` turns the canonical
 * `WorkExperience` into artifacts, relationships and stages, and everything
 * below only reads that object. No component here knows a company name, a
 * metric or a technology — which is what makes the page a view of
 * `workHistory.ts` rather than a second copy of it.
 *
 * Layout is a real CSS grid with `auto` rows and `align-items: start`,
 * deliberately not `1fr` rows: a short artifact must never stretch to match a
 * tall one, because the resulting dead space inside a panel is exactly the
 * "meaningless whitespace" this composition is judged on. architecture.ts is
 * the tallest artifact and takes the left column across two rows; metrics.log
 * and shipped/ stack beside it at their natural heights; the source artifact
 * spans the full width but ships collapsed, so ~28 lines of YAML cannot
 * dominate the canvas until someone asks for it.
 */
export function ExperienceWorkspaceCanvas({
  experience,
  file,
}: {
  experience: WorkExperience;
  file: VirtualFile;
}) {
  const openFile = useStore((state) => state.openFile);
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const relativeRef = useRef<HTMLDivElement>(null);
  const [tier, setTier] = useState<Tier>('wide');
  const [sourceExpanded, setSourceExpanded] = useState(false);
  const [activeArtifactId, setActiveArtifactId] = useState<string | null>(null);
  const [activeStageId, setActiveStageId] = useState<string | null>(null);

  /**
   * Anchor elements by id — artifact ids and stage ids in one namespace, which
   * is safe because both are derived from the model and never collide.
   *
   * Deliberately a ref with a stable registrar and *no* state update: the
   * callback refs that populate it are created inline per render, so React
   * detaches and reattaches them on every render. A `setState` here would turn
   * that into an infinite loop. `ArtifactConnectors` instead reads through
   * `getAnchor` and retries across frames until every anchor it needs exists —
   * the same approach `EvidenceConnector` already uses for anchors that attach
   * late.
   */
  const anchorsRef = useRef(new Map<string, HTMLElement>());
  const registerAnchor = useCallback((id: string, node: HTMLElement | null) => {
    if (node) anchorsRef.current.set(id, node);
    else anchorsRef.current.delete(id);
  }, []);
  const getAnchor = useCallback((id: string) => anchorsRef.current.get(id) ?? null, []);

  // Pure and memoized on the experience alone — the derivation has no other
  // input, so it can never need to re-run for a render-only reason.
  const workspace = useMemo(() => buildExperienceWorkspace(experience), [experience]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const width = entry?.contentRect.width ?? 0;
      if (width === 0) return;
      setTier(
        width >= COLUMN_BREAKPOINT_PX
          ? 'wide'
          : width >= SINGLE_COLUMN_BREAKPOINT_PX
            ? 'medium'
            : 'narrow',
      );
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const handleOpenSource = useCallback(() => {
    openFile(WORK_HISTORY_FILE_ID);
  }, [openFile]);

  const artifactById = (id: string) => workspace.artifacts.find((artifact) => artifact.id === id);

  const architecture = artifactById('architecture');
  const metrics = artifactById('metrics');
  const shipped = artifactById('shipped');
  const source = artifactById('source');

  const panelFor = (artifact: ReturnType<typeof artifactById>): React.ReactNode => {
    if (!artifact) return null;
    return (
      <ArtifactPanel
        artifact={artifact}
        file={file}
        expanded={artifact.id === 'source' ? sourceExpanded : undefined}
        onToggleExpanded={
          artifact.id === 'source' ? () => setSourceExpanded((value) => !value) : undefined
        }
        onOpenFile={artifact.id === 'source' ? handleOpenSource : undefined}
        onActiveChange={(active) => setActiveArtifactId(active ? artifact.id : null)}
        dimmed={activeArtifactId !== null && activeArtifactId !== artifact.id}
        anchorRef={(node) => registerAnchor(artifact.id, node)}
      />
    );
  };

  // Edges carry only what the connector layer needs: two anchor ids, a colour
  // for the relationship's kind, and whether it belongs to the resting set.
  const edges: ConnectorEdge[] = useMemo(
    () =>
      workspace.relationships.map((relationship) => ({
        id: relationship.id,
        from: relationship.from,
        to: relationship.to,
        color: RELATIONSHIP_COLOR[relationship.kind] ?? CONTENT_DIM,
        restingVisible: relationship.restingVisible,
      })),
    [workspace.relationships],
  );

  /**
   * Which wires are emphasised, by wire id.
   *
   * Hovering an artifact lights every relationship it owns — including its
   * hover-only ones, which is how the source artifact's `evidences` set
   * appears at all. Hovering a stage lights every relationship pointing at it,
   * from whichever artifact. Both directions are computed from the same edge
   * list, so mouse and keyboard produce identical state.
   */
  const emphasisIds = useMemo(() => {
    const ids = new Set<string>();
    if (!activeArtifactId && !activeStageId) return ids;
    for (const relationship of workspace.relationships) {
      if (activeArtifactId && relationship.from === activeArtifactId) ids.add(relationship.id);
      if (activeStageId && relationship.to === activeStageId) ids.add(relationship.id);
    }
    return ids;
  }, [workspace.relationships, activeArtifactId, activeStageId]);

  return (
    <div
      ref={scrollRef}
      // The panels' own padding is fixed (ExperienceTerminalPanel is shared
      // with the rest of the workspace and stays as it is), so the page's
      // gutter is what gives the artifacts their width back on a phone.
      className={`no-scrollbar h-full w-full overflow-y-auto overflow-x-hidden py-6 ${
        tier === 'narrow' ? 'px-3' : 'px-8'
      }`}
      style={{ backgroundColor: SURFACE }}
    >
      <div ref={containerRef} className="mx-auto flex w-full max-w-[1500px] flex-col gap-6">
        <WorkspaceHeader identity={workspace.identity} />

        {/* `relative` so the connector overlay shares this element's
            coordinate space — the same container-relative measurement every
            other connector in this app does. */}
        <div
          ref={relativeRef}
          className="relative grid items-start"
          style={{
            gridTemplateColumns: tier === 'wide' ? 'minmax(0, 1fr) minmax(300px, 340px)' : '1fr',
            rowGap: 16,
            // A real channel between the artifacts and the pipeline, not the
            // 16px the rest of the grid uses: six connectors run vertically
            // through this gap, and without room for their lanes they collapse
            // into near-vertical squiggles hard against both panel borders.
            columnGap: tier === 'wide' ? 56 : 16,
          }}
        >
          <ArtifactConnectors
            containerRef={relativeRef}
            scrollRef={scrollRef}
            edges={edges}
            getAnchor={getAnchor}
            boundaryId="pipeline"
            emphasisIds={emphasisIds}
            enabled={tier === 'wide'}
          />
          {/* The artifact column.
​
              One column, not the two-by-two grid the reference image shows,
              and the reason is the connector layer rather than taste: with two
              artifact columns every wire from the left column has to cross the
              right column's panel to reach the pipeline, and a semantic
              connector that disappears behind an unrelated artifact stops
              communicating the thing it exists to communicate. Stacked, all
              four artifacts sit against the same edge as the pipeline, so
              every wire is a short horizontal run through open gutter.
​
              The width this frees is spent inside the artifacts instead —
              architecture.ts runs its flow left to right, metrics.log puts its
              comparison beside its list, shipped/ puts its two contributions
              side by side — which is why the page ends up denser this way, not
              sparser. */}
          <div className="flex min-w-0 flex-col gap-4">
            {panelFor(architecture)}
            {panelFor(metrics)}
            {panelFor(shipped)}
            {panelFor(source)}
          </div>

          {/* The pipeline. A column at wide widths, a full-width section
              beneath the artifacts below that — always vertical either way. */}
          <SystemPipeline
            stages={workspace.stages}
            activeStageId={activeStageId}
            onStageActiveChange={setActiveStageId}
            anchorRef={(node) => registerAnchor('pipeline', node)}
            stageAnchorRef={registerAnchor}
          />
        </div>

        <footer className="pb-2">
          <p className="font-mono text-[11px]" style={{ color: CONTENT_DIM }}>
            <span style={{ color: DIM }}>source of truth · </span>
            {workspace.provenance}
          </p>
        </footer>
      </div>
    </div>
  );
}
