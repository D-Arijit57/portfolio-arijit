import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../../../store/useStore';
import { buildExperienceWorkspace, WORK_HISTORY_FILE_ID } from '../../../experience/workspace';
import type { WorkExperience } from '../../../experience/types';
import { WorkspaceHeader } from './WorkspaceHeader';
import { ArtifactPanel } from './ArtifactPanel';
import { SystemPipeline } from './SystemPipeline';
import { ArtifactConnectors, type ConnectorEdge } from '../../shared/ArtifactConnectors';
import { buildStageAccents } from './stageAccents';
import { CONTENT_DIM, DIM, SURFACE } from '../pipeline/tokens';

/** Gutter between the two artifact rows, taken from the reference's own rhythm. */
const ROW_GAP = 16;

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
 * Layout is one two-by-two CSS grid with a shared column template and `auto`
 * rows, items stretched: the two terminals in a row are always the same height
 * and both rows share one vertical gutter, so the frames line up on every
 * edge. (An earlier version top-aligned each item to its natural height and
 * gave the rows different column splits; the ragged edges read as misaligned.)
 * The source artifact shows a short YAML head and a link to open the file.
 */
export function ExperienceWorkspaceCanvas({
  experience,
}: {
  experience: WorkExperience;
}) {
  const openFile = useStore((state) => state.openFile);
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const relativeRef = useRef<HTMLDivElement>(null);
  const [tier, setTier] = useState<Tier>('wide');
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

  /** Stage id → identity colour, worn by the stage's rail dot, its
   * architecture node, its metric row and every connector that terminates on
   * it. Derived from the stage list, never keyed by literal ids. */
  const accents = useMemo(() => buildStageAccents(workspace.stages), [workspace.stages]);

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
        accents={accents}
        onOpenFile={artifact.id === 'source' ? handleOpenSource : undefined}
        onActiveChange={(active) => setActiveArtifactId(active ? artifact.id : null)}
        dimmed={activeArtifactId !== null && activeArtifactId !== artifact.id}
        anchorRef={(node) => registerAnchor(artifact.id, node)}
      />
    );
  };

  // Edges carry only what the connector layer needs: two anchor ids, a colour,
  // and whether they belong to the resting set.
  //
  // The colour is the *target stage's* identity colour, not the relationship
  // kind's. A wire is then visibly an extension of the stage it lands on — the
  // line leaving architecture.ts for `extract` is the same hue as `extract`'s
  // rail dot, its architecture node edge and its legend entry — so a reader
  // follows one colour across the page instead of decoding a second key for
  // "describes" versus "measures".
  const edges: ConnectorEdge[] = useMemo(
    () =>
      workspace.relationships
        // Two measurements of the same stage (e.g. failing tests / tests
        // verifying the fix) would draw two wires on top of each other between
        // the same two anchors. One wire per artifact → stage pair is enough;
        // hover emphasis is computed from `workspace.relationships`, so no
        // relationship is lost.
        .filter(
          (relationship, index, all) =>
            all.findIndex((other) => other.from === relationship.from && other.to === relationship.to) === index,
        )
        .map((relationship) => ({
          id: relationship.id,
          from: relationship.from,
          to: relationship.to,
          color: accents.get(relationship.to) ?? CONTENT_DIM,
          restingVisible: relationship.restingVisible,
          // The source file underwrites every stage, so its edges are ambient
          // context rather than one of the page's specific claims.
          ambient: relationship.kind === 'evidences',
        })),
    [workspace.relationships, accents],
  );

  /** Artifact panels the router must not route a wire through. */
  const obstacleIds = useMemo(
    () => workspace.artifacts.map((artifact) => artifact.id),
    [workspace.artifacts],
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

  // The pipeline — the system flow. `h-full` plus the rail's own `flex-1`
  // segments lets four stages span the bottom row's full height rather than
  // clustering at the top of a short box.
  const pipelineNode = (
    <div className="h-full min-w-0">
      <SystemPipeline
        stages={workspace.stages}
        accents={accents}
        activeStageId={activeStageId}
        onStageActiveChange={setActiveStageId}
        anchorRef={(node) => registerAnchor('pipeline', node)}
        stageAnchorRef={registerAnchor}
      />
    </div>
  );

  return (
    <div
      ref={scrollRef}
      // The panels' own padding is fixed (ExperienceTerminalPanel is shared
      // with the rest of the workspace and stays as it is), so the page's
      // gutter is what gives the artifacts their width back on a phone.
      className={`no-scrollbar h-full w-full overflow-y-auto overflow-x-hidden py-3 ${
        tier === 'narrow' ? 'px-3' : 'px-6'
      }`}
      style={{ backgroundColor: SURFACE }}
    >
      <div ref={containerRef} className="mx-auto flex w-full max-w-[1500px] flex-col gap-3">
        <WorkspaceHeader identity={workspace.identity} />

        {/* `relative` so the connector overlay shares this element's
            coordinate space — the same container-relative measurement every
            other connector in this app does.

            At the `wide` tier: a two-by-two of terminals beside the pipeline
            column. Each row is as tall as its content (terminals in a row
            match each other; the lower row is deliberately shorter than the
            upper one, so its few lines aren't spread thin); each carries only
            the points that aren't already said by the pipeline or the source
            (see ArtifactPanel). Below it the pipeline reflows beneath. The
            column gap is also the channel the connector lanes run through, so
            it is wider than a plain gutter. */}
        <div
          ref={relativeRef}
          className="relative grid items-stretch"
          style={{
            gridTemplateColumns: tier === 'wide' ? 'minmax(0, 1fr) minmax(300px, 340px)' : '1fr',
            rowGap: 24,
            columnGap: tier === 'wide' ? 64 : 24,
          }}
        >
          <ArtifactConnectors
            containerRef={relativeRef}
            scrollRef={scrollRef}
            edges={edges}
            getAnchor={getAnchor}
            boundaryId="pipeline"
            obstacleIds={obstacleIds}
            emphasisIds={emphasisIds}
            enabled={tier === 'wide'}
          />

          <div
            className="grid min-w-0"
            style={{
              gridTemplateColumns: tier === 'narrow' ? '1fr' : 'minmax(0, 1fr) minmax(0, 1fr)',
              gap: `${ROW_GAP}px 28px`,
            }}
          >
            {panelFor(architecture)}
            {panelFor(metrics)}
            {panelFor(shipped)}
            {panelFor(source)}
          </div>

          {pipelineNode}
        </div>

        <footer>
          <p className="font-mono text-[11px]" style={{ color: CONTENT_DIM }}>
            <span style={{ color: DIM }}>source of truth · </span>
            {workspace.provenance}
          </p>
        </footer>
      </div>
    </div>
  );
}
