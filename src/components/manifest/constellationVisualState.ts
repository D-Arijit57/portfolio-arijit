/**
 * Shared visual-state vocabulary for the Tech Stack Constellation's
 * hover/select dependency-chain highlight — used by both
 * ConstellationStar and ConstellationEdge so their dimming/highlighting
 * always agree with each other.
 */
export type ConstellationVisualState = 'default' | 'active' | 'connected' | 'dimmed';
