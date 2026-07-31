import { hashStringToIndex } from '../../manifest/colorHash';
import type { GraphBuildResult } from '../builder/types';
import type {
  CategoryRing,
  LayoutBounds,
  LayoutStrategy,
  Point,
  PositionedEdge,
  PositionedGraph,
  PositionedNode,
  RadialLayoutMetadata,
} from './types';

/**
 * Radial Layout — a deterministic, force-relaxed knowledge graph. Two
 * rejected passes preceded this one (a uniform wheel, then a jittered but
 * still purely polar-formula layout — see ARCHITECTURE.md §10 for the full
 * history); both still read as "generated," because every node's position
 * was a direct r(θ) computation. This version instead SEEDS a reasonable
 * starting guess, then runs a small, fixed number of classic
 * force-directed relaxation steps to let final positions emerge from
 * pairwise interaction — computed once, at layout time, never per frame,
 * never with Math.random. "No runtime physics" and "fully deterministic"
 * both hold: the relaxation is pure arithmetic over a fixed iteration
 * count, and every seed value is hashed from a node's own id.
 *
 * Two independent relaxations, at two different scales:
 * - Macro: the category nodes repel each other and are tethered to the hub
 *   by a weak spring toward a per-category target distance. Letting this
 *   settle is what breaks the "invisible ring" — final radius and angle
 *   are a byproduct of every category pushing against its neighbors, not
 *   a formula any single category evaluates on its own.
 * - Micro: each category's own leaves relax in the category's OWN local
 *   coordinate space — seeded at scattered (not angularly-ordered) points,
 *   repelling each other, tethered by a weak spring to the local origin.
 *   The result has no fan structure because nothing here ever assigns a
 *   leaf an angle by its index. A per-category anisotropic stretch +
 *   rotation (both hashed from the category's own id) then gives every
 *   category its own silhouette instead of a uniform blob.
 *
 * Nothing here references "skills," a category name, or any specific
 * domain — every shape decision is a function of leaf counts and ids.
 *
 * Frozen for Sprint 11 (2026-07-31): this is the approved Milestone 3
 * baseline. A later artistic pass (weight-driven silhouette size + a
 * walk-seeded leaf placement for declaration-order visual flow) was tried
 * and then deliberately reverted per explicit sprint direction — "good
 * enough for this sprint," further tuning judged to be diminishing
 * returns relative to starting the renderer (Milestone 4). See
 * ARCHITECTURE.md §10 for that pass's details if it's revisited later.
 */

const ANGLE_OFFSET_RADIANS = -Math.PI / 2;
const MIN_DISTANCE = 1;

// Hub <-> category relaxation (primary hierarchy). Base radius brought in
// ~26% from the previous revision's 340 per explicit "compress the
// composition" feedback — categories now sit close enough that neighboring
// clusters' own leaves can interleave slightly, reading as one connected
// graph rather than six isolated islands linked by long bare spokes.
//
// MACRO_SPRING_K is deliberately much stronger than a first attempt at this
// used: N bodies that mutually repel while only weakly tethered to a shared
// center will settle toward a near-regular polygon almost regardless of
// their individual target distances — repulsion alone is a homogenizing
// force. A strong spring is what lets each category actually hold its OWN
// target radius instead of being smoothed toward its neighbors' average.
const HUB_CATEGORY_BASE_RADIUS = 250;
/** How much a category's own weight (leaf count + floor) shifts its target radius — denser categories are seeded to want more room, sparser ones less. */
const HUB_CATEGORY_WEIGHT_RADIUS_RANGE = 0.6;
const HUB_CATEGORY_RADIUS_SEED_JITTER = 0.3;
const CATEGORY_WEIGHT_FLOOR = 2;
const MACRO_REPULSION_K = 16_000;
const MACRO_SPRING_K = 0.2;
const MACRO_ITERATIONS = 90;
const MACRO_INITIAL_STEP = 14;

// Category <-> leaf relaxation (secondary hierarchy), entirely in the
// category's own local space. Same "strong spring, modest repulsion"
// balance as the macro pass, for the same reason: individual leaves need
// to keep their own jittered target distance rather than being smoothed
// into one shared inner ring, which is what still read as "a fan."
const LOCAL_CLUSTER_BASE_RADIUS = 92;
const LOCAL_RADIUS_SEED_JITTER = 0.45;
/** Radius of the scattered (non-angular) disk leaves are seeded within, before relaxation pulls/pushes them into their final arrangement. */
const LOCAL_SEED_RADIUS = 50;
const MICRO_REPULSION_K = 2_600;
const MICRO_SPRING_K = 0.14;
const MICRO_ITERATIONS = 70;
const MICRO_INITIAL_STEP = 9;

/** Independent per-axis stretch range applied to each category's settled local cluster — the source of each category's own silhouette (tall, wide, or irregular). */
const ANISOTROPY_MIN = 0.65;
const ANISOTROPY_MAX = 1.55;

/** Assumed node footprint, for bounds math only — not a rendering directive. Plays the same role TIER_RADIUS plays in manifest/constellationLayout.ts. */
const NODE_FOOTPRINT: Record<PositionedNode['kind'], number> = {
  root: 36,
  category: 28,
  leaf: 20,
};

const VIEWPORT_PADDING = 72;

function vAdd(a: Point, b: Point): Point {
  return { x: a.x + b.x, y: a.y + b.y };
}
function vSub(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y };
}
function vScale(a: Point, s: number): Point {
  return { x: a.x * s, y: a.y * s };
}
function vLen(a: Point): number {
  return Math.hypot(a.x, a.y);
}
function vNorm(a: Point): Point {
  const len = vLen(a);
  return len > 1e-6 ? { x: a.x / len, y: a.y / len } : { x: 1, y: 0 };
}
function polarPoint(center: Point, angle: number, radius: number): Point {
  return { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius };
}

/** Deterministic pseudo-random value in [-1, 1), seeded by an id — same hashing approach constellationLayout.ts already uses for its own fallback jitter. Never Math.random. */
function signedJitter(seed: string): number {
  return (hashStringToIndex(seed, 100_000) / 100_000) * 2 - 1;
}
/** Deterministic pseudo-random value in [0, 1), seeded by an id. */
function unitJitter(seed: string): number {
  return hashStringToIndex(seed, 100_000) / 100_000;
}

interface RelaxOptions {
  repulsionK: number;
  springK: number;
  iterations: number;
  initialStep: number;
}

/**
 * Fixed-iteration Fruchterman-Reingold-style relaxation: every pair of
 * points repels, every point is tethered to `anchor` by a spring toward
 * its own rest length, and per-iteration movement is capped by a linearly
 * cooling step size so the system settles instead of oscillating. Pure
 * arithmetic, no randomness — the only non-determinism a caller could
 * introduce would be in how `initial` was seeded, which this function
 * never touches.
 */
function relax(initial: Point[], anchor: Point, restLengths: number[], options: RelaxOptions): Point[] {
  const positions = initial.map((p) => ({ ...p }));
  const n = positions.length;
  const { repulsionK, springK, iterations, initialStep } = options;

  for (let iter = 0; iter < iterations; iter++) {
    const disp: Point[] = positions.map(() => ({ x: 0, y: 0 }));

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const delta = vSub(positions[i], positions[j]);
        const dist = Math.max(vLen(delta), MIN_DISTANCE);
        const force = repulsionK / (dist * dist);
        const dir = vNorm(delta);
        disp[i] = vAdd(disp[i], vScale(dir, force));
        disp[j] = vAdd(disp[j], vScale(dir, -force));
      }
    }

    for (let i = 0; i < n; i++) {
      const toAnchor = vSub(positions[i], anchor);
      const dist = Math.max(vLen(toAnchor), MIN_DISTANCE);
      const stretch = dist - restLengths[i];
      const dir = vNorm(toAnchor);
      disp[i] = vAdd(disp[i], vScale(dir, -springK * stretch));
    }

    const step = initialStep * (1 - iter / iterations);
    for (let i = 0; i < n; i++) {
      const cappedLen = Math.min(vLen(disp[i]), step);
      positions[i] = vAdd(positions[i], vScale(vNorm(disp[i]), cappedLen));
    }
  }

  return positions;
}

function layout(result: GraphBuildResult): PositionedGraph {
  const origin: Point = { x: 0, y: 0 };
  const categories = result.categoryNodes;

  const weights = categories.map((category) => (result.childrenById.get(category.id)?.length ?? 0) + CATEGORY_WEIGHT_FLOOR);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  const minWeight = weights.length > 0 ? Math.min(...weights) : 0;
  const maxWeight = weights.length > 0 ? Math.max(...weights) : 0;
  const weightSpan = maxWeight - minWeight || 1;

  // Seed: a reasonable, non-degenerate starting guess (weighted wedge angle
  // + a target radius that already varies by weight and jitter) — NOT the
  // final layout. Relaxation below is what actually determines where
  // categories end up, but the spring in that relaxation is strong enough
  // (MACRO_SPRING_K) to hold each category near ITS OWN target radius
  // rather than letting mutual repulsion average everyone toward a shared
  // ring, which is what a weak-spring version of this did.
  let cursor = ANGLE_OFFSET_RADIANS;
  const categorySeeds: Point[] = [];
  const categoryRestLengths: number[] = [];
  categories.forEach((category, index) => {
    const wedge = (weights[index] / totalWeight) * 2 * Math.PI;
    const seedAngle = cursor + wedge / 2;
    cursor += wedge;
    const normalizedWeight = (weights[index] - minWeight) / weightSpan;
    const weightFactor = 1 - HUB_CATEGORY_WEIGHT_RADIUS_RANGE / 2 + HUB_CATEGORY_WEIGHT_RADIUS_RANGE * normalizedWeight;
    const jitter = 1 + signedJitter(`radius:${category.id}`) * HUB_CATEGORY_RADIUS_SEED_JITTER;
    const restLength = HUB_CATEGORY_BASE_RADIUS * weightFactor * jitter;
    categoryRestLengths.push(restLength);
    categorySeeds.push(polarPoint(origin, seedAngle, restLength));
  });

  const relaxedCategoryPositions =
    categories.length > 0
      ? relax(categorySeeds, origin, categoryRestLengths, {
          repulsionK: MACRO_REPULSION_K,
          springK: MACRO_SPRING_K,
          iterations: MACRO_ITERATIONS,
          initialStep: MACRO_INITIAL_STEP,
        })
      : [];

  const rawPositions = new Map<string, Point>();
  rawPositions.set(result.rootNode.id, origin);

  const categoryRings: CategoryRing[] = [];

  categories.forEach((category, index) => {
    const categoryPos = relaxedCategoryPositions[index];
    rawPositions.set(category.id, categoryPos);

    const leafIds = result.childrenById.get(category.id) ?? [];
    if (leafIds.length === 0) {
      categoryRings.push({
        categoryId: category.id,
        categoryKey: category.key,
        angle: Math.atan2(categoryPos.y - origin.y, categoryPos.x - origin.x),
        categoryRadius: vLen(vSub(categoryPos, origin)),
        leafRadius: 0,
        localAspect: { x: 1, y: 1 },
        localRotation: 0,
        nodeCount: 0,
      });
      return;
    }

    // Seed leaves at scattered points (2D hash jitter, no angle-by-index)
    // so nothing here ever produces a fan.
    const leafSeeds: Point[] = leafIds.map((leafId) => ({
      x: signedJitter(`seedx:${leafId}`) * LOCAL_SEED_RADIUS,
      y: signedJitter(`seedy:${leafId}`) * LOCAL_SEED_RADIUS,
    }));
    const leafRestLengths: number[] = leafIds.map(
      (leafId) => LOCAL_CLUSTER_BASE_RADIUS * (1 + signedJitter(`${leafId}:restlen`) * LOCAL_RADIUS_SEED_JITTER),
    );

    const relaxedLocalLeaves = relax(leafSeeds, { x: 0, y: 0 }, leafRestLengths, {
      repulsionK: MICRO_REPULSION_K,
      springK: MICRO_SPRING_K,
      iterations: MICRO_ITERATIONS,
      initialStep: MICRO_INITIAL_STEP,
    });

    // Per-category silhouette: an independent stretch on each axis (so a
    // category can end up tall, wide, or irregular, never a uniform blob)
    // plus a rotation, both hashed from the category's own id — never
    // hardcoded per category name.
    const aspectX = ANISOTROPY_MIN + unitJitter(`aspectx:${category.id}`) * (ANISOTROPY_MAX - ANISOTROPY_MIN);
    const aspectY = ANISOTROPY_MIN + unitJitter(`aspecty:${category.id}`) * (ANISOTROPY_MAX - ANISOTROPY_MIN);
    const rotation = unitJitter(`${category.id}:rotation`) * 2 * Math.PI;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);

    let leafRadiusSum = 0;
    leafIds.forEach((leafId, leafIndex) => {
      const local = relaxedLocalLeaves[leafIndex];
      const stretched: Point = { x: local.x * aspectX, y: local.y * aspectY };
      const rotated: Point = {
        x: stretched.x * cos - stretched.y * sin,
        y: stretched.x * sin + stretched.y * cos,
      };
      const worldPos = vAdd(categoryPos, rotated);
      rawPositions.set(leafId, worldPos);
      leafRadiusSum += vLen(rotated);
    });

    categoryRings.push({
      categoryId: category.id,
      categoryKey: category.key,
      angle: Math.atan2(categoryPos.y - origin.y, categoryPos.x - origin.x),
      categoryRadius: vLen(vSub(categoryPos, origin)),
      leafRadius: leafRadiusSum / leafIds.length,
      localAspect: { x: aspectX, y: aspectY },
      localRotation: rotation,
      nodeCount: leafIds.length,
    });
  });

  // Bounds in raw (pre-shift) space, padded by each node's assumed footprint.
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const node of result.nodes) {
    const pos = rawPositions.get(node.id);
    if (!pos) continue;
    const footprint = NODE_FOOTPRINT[node.kind];
    minX = Math.min(minX, pos.x - footprint);
    minY = Math.min(minY, pos.y - footprint);
    maxX = Math.max(maxX, pos.x + footprint);
    maxY = Math.max(maxY, pos.y + footprint);
  }
  if (!Number.isFinite(minX)) {
    minX = minY = maxX = maxY = 0;
  }

  const shiftX = VIEWPORT_PADDING - minX;
  const shiftY = VIEWPORT_PADDING - minY;
  const shift = (point: Point): Point => ({ x: point.x + shiftX, y: point.y + shiftY });

  const positions = new Map<string, Point>();
  for (const [id, pos] of rawPositions) positions.set(id, shift(pos));

  const nodes = result.nodes.map((node) => {
    const position = positions.get(node.id) ?? origin;
    return { ...node, x: position.x, y: position.y };
  }) as PositionedNode[];

  const edges: PositionedEdge[] = result.edges.map((edge) => ({
    from: edge.from,
    to: edge.to,
    fromPoint: positions.get(edge.from) ?? origin,
    toPoint: positions.get(edge.to) ?? origin,
  }));

  const bounds: LayoutBounds = {
    minX: minX + shiftX,
    minY: minY + shiftY,
    maxX: maxX + shiftX,
    maxY: maxY + shiftY,
    width: maxX - minX + VIEWPORT_PADDING * 2,
    height: maxY - minY + VIEWPORT_PADDING * 2,
  };

  let radius = 0;
  for (const [id, pos] of rawPositions) {
    if (id === result.rootNode.id) continue;
    radius = Math.max(radius, vLen(vSub(pos, origin)));
  }

  const layoutMetadata: RadialLayoutMetadata = {
    strategy: 'radial',
    hubCategoryBaseRadius: HUB_CATEGORY_BASE_RADIUS,
    localClusterBaseRadius: LOCAL_CLUSTER_BASE_RADIUS,
    angleOffsetRadians: ANGLE_OFFSET_RADIANS,
    categoryRelaxationIterations: MACRO_ITERATIONS,
    leafRelaxationIterations: MICRO_ITERATIONS,
  };

  return {
    nodes,
    edges,
    bounds,
    center: positions.get(result.rootNode.id) ?? shift(origin),
    radius,
    categoryRings,
    viewportPadding: VIEWPORT_PADDING,
    statistics: result.statistics,
    layoutMetadata,
  };
}

export const RadialLayout: LayoutStrategy = {
  id: 'radial',
  layout,
};
