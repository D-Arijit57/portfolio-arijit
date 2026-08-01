/**
 * The Knowledge Graph's Interaction Layer vocabulary — Milestone 7. Every
 * node/edge resolves to exactly ONE of these per render; nothing
 * downstream (GraphNode, GraphEdgeLine, InspectorPanel, a future Search
 * or Filter panel) invents its own parallel notion of "is this active."
 *
 * `hidden` is reserved for a future filtering milestone — nothing in this
 * milestone's resolver ever produces it, but the renderer already knows
 * how to draw it (see `GraphNode`/`GraphEdgeLine`), so wiring a filter in
 * later never touches this file or the renderer's own drawing logic.
 */
export type NodeVisualState = 'default' | 'hovered' | 'selected' | 'related' | 'dimmed' | 'hidden';

export type EdgeVisualState = 'default' | 'highlighted' | 'dimmed';

/** Mirrors the DOM's own cursor keywords — `cursorForNode` in `useGraphInteraction` is the one place that decides which applies, so nothing else inline-computes a cursor value. */
export type NodeCursor = 'pointer' | 'grab' | 'grabbing';
