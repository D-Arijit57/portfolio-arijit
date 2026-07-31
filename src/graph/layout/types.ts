import type {
  GraphBuildResult,
  GraphCategoryBuildNode,
  GraphLeafBuildNode,
  GraphRootBuildNode,
  GraphStatistics,
} from '../builder/types';

/**
 * Output shape of the Layout Engine — geometry only. The Graph Builder
 * (../builder) owns relationships; nothing here revisits those, it only
 * assigns coordinates to what buildGraph() already produced. Same
 * "world-space, independent of viewport" contract as
 * manifest/constellationLayout.ts: positions are stable numbers in an
 * arbitrary but fixed coordinate space, never regenerated per render and
 * never dependent on the container size that eventually displays them.
 */

export interface Point {
  x: number;
  y: number;
}

/** A GraphBuildNode plus its assigned coordinate — same three-kind union, position bolted on rather than folded into a new generic node type, so every field the Graph Builder already computed (source, categoryKey, key, ...) survives untouched into the renderer. */
export type PositionedNode =
  | (GraphRootBuildNode & Point)
  | (GraphCategoryBuildNode & Point)
  | (GraphLeafBuildNode & Point);

/** Endpoints embedded directly so a renderer can draw a line without looking anything up — "the renderer should consume this object directly, not infer layout information itself." */
export interface PositionedEdge {
  from: string;
  to: string;
  fromPoint: Point;
  toPoint: Point;
}

export interface LayoutBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

/** Per-category geometry — descriptive stats about where a category settled, not a formula that generated it. Every value here is measured from the final, force-relaxed positions rather than being the thing that produced them. */
export interface CategoryRing {
  categoryId: string;
  categoryKey: string;
  /** Radians. The category node's final angle from `center`, as measured (`atan2`), not as assigned. */
  angle: number;
  /** Distance from the hub (`center`) to this category's own settled node. */
  categoryRadius: number;
  /** Mean distance from THIS category's own node to its own leaves, post-relaxation — a local, per-category figure, not measured from `center`. */
  leafRadius: number;
  /** Per-axis stretch applied to this category's local leaf cluster before rotation — what gives each category its own silhouette (elongated, wide, or irregular) instead of a uniform blob. */
  localAspect: Point;
  /** Radians. Rotation applied to this category's local cluster after stretching. */
  localRotation: number;
  nodeCount: number;
}

export interface RadialLayoutMetadata {
  strategy: 'radial';
  /** Target hub->category spring rest length before relaxation and jitter. */
  hubCategoryBaseRadius: number;
  /** Target category->leaf local-cluster spring rest length before relaxation and jitter. */
  localClusterBaseRadius: number;
  angleOffsetRadians: number;
  /** Fixed iteration count the category-vs-category relaxation ran for — always the same for a given build, never adaptive. */
  categoryRelaxationIterations: number;
  /** Fixed iteration count each category's own leaf relaxation ran for. */
  leafRelaxationIterations: number;
}

/** A union of one member today — extend with a second strategy's own metadata shape when one exists, rather than widening this into a bag. */
export type LayoutMetadata = RadialLayoutMetadata;

export interface PositionedGraph {
  nodes: PositionedNode[];
  edges: PositionedEdge[];
  bounds: LayoutBounds;
  /** The root node's own final coordinate — the composition's hub, not merely the midpoint of `bounds`. */
  center: Point;
  /** Outward reach from `center` to the outermost ring in use. */
  radius: number;
  categoryRings: CategoryRing[];
  /** World-space margin already baked into `bounds` on every side — exposed so a viewport-fit step can reuse the same figure instead of guessing one. */
  viewportPadding: number;
  statistics: GraphStatistics;
  layoutMetadata: LayoutMetadata;
}

export interface LayoutStrategy {
  id: string;
  layout(result: GraphBuildResult): PositionedGraph;
}
