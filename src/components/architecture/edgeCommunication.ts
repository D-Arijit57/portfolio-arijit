/**
 * Architecture Canvas 2.0 — per-edge communication-type classification and
 * motion styling. Deliberately canvas-local: the underlying
 * ArchitectureEdge already has an unused `kind?: 'sync'|'async'|'data'`
 * field, but this sprint's scope is "only modify the Architecture Canvas,"
 * so classification lives here as a lookup against the already-known,
 * stable edge list rather than as a data-model addition. `edgeKey()` is a
 * one-line duplicate of src/architecture/relationships.ts's own helper for
 * the same reason — not imported, to keep the scope boundary literal.
 */

export type CommType = 'http' | 'auth' | 'realtime' | 'invocation' | 'async' | 'notification';

export type PacketShape = 'circle' | 'diamond' | 'sparkle';

export type EdgeMotionConfig =
  | { mode: 'packets'; shape: PacketShape; color: string; size: number; packetCount: number; durationS: number }
  | { mode: 'flow'; color: string; dashLength: number; gapLength: number; durationS: number };

export function edgeKey(from: string, to: string): string {
  return `${from}->${to}`;
}

// Cortexa's real 16 edges (src/content/architecture/cortexa.ts, read-only
// reference). Client fan-out/converge (10 edges) isn't listed explicitly —
// it's the `http` fallback in commTypeForEdge() below, since it's the most
// common case and doesn't need its own table entries.
const EDGE_COMM_TYPES: Record<string, CommType> = {
  [edgeKey('next_js_app', 'clerk')]: 'auth',
  [edgeKey('next_js_app', 'convex')]: 'realtime',
  [edgeKey('next_js_app', 'stream_video')]: 'realtime',
  [edgeKey('convex', 'interview_scheduling')]: 'invocation',
  [edgeKey('convex', 'interview_lifecycle')]: 'invocation',
  [edgeKey('convex', 'coding_challenge')]: 'invocation',
  [edgeKey('convex', 'recording_management')]: 'invocation',
  [edgeKey('coding_challenge', 'judge_pipeline')]: 'async',
  [edgeKey('stream_video', 'recording_management')]: 'async',
};

export function commTypeForEdge(from: string, to: string): CommType {
  return EDGE_COMM_TYPES[edgeKey(from, to)] ?? 'http';
}

// Stream Video shares the `realtime` *type* with Convex (both are
// continuous-media streams, not request/response) but reads as visually
// distinct rather than identical — a color override on top of the shared
// base config rather than a 7th CommType for one edge.
const EDGE_COLOR_OVERRIDE: Record<string, string> = {
  [edgeKey('next_js_app', 'stream_video')]: '#ff79c6',
};

// VS Code syntax-theme-adjacent hues, matching the palette family
// src/architecture/categories.ts already establishes for this canvas.
export const EDGE_MOTION_CONFIG: Record<CommType, EdgeMotionConfig> = {
  http: { mode: 'packets', shape: 'circle', color: '#569cd6', size: 3, packetCount: 3, durationS: 3.2 },
  auth: { mode: 'packets', shape: 'circle', color: '#c586c0', size: 3.5, packetCount: 1, durationS: 2.4 },
  realtime: { mode: 'flow', color: '#4ec9b0', dashLength: 6, gapLength: 10, durationS: 1.1 },
  invocation: { mode: 'packets', shape: 'circle', color: '#d7ba7d', size: 3, packetCount: 3, durationS: 2.6 },
  async: { mode: 'packets', shape: 'diamond', color: '#ce9178', size: 4, packetCount: 1, durationS: 4.5 },
  notification: { mode: 'packets', shape: 'sparkle', color: '#dcdcaa', size: 3, packetCount: 1, durationS: 3 },
};

/** Demo Mode: denser, faster traffic — resolved once per mode change, never per-frame. */
function scaleForDemoMode(config: EdgeMotionConfig, demoMode: boolean): EdgeMotionConfig {
  if (!demoMode) return config;
  if (config.mode === 'flow') {
    return { ...config, durationS: config.durationS * 0.5 };
  }
  return { ...config, durationS: config.durationS * 0.5, packetCount: config.packetCount + 1 };
}

/** The one entry point ArchitectureCanvas.tsx calls per edge — classification, color override, and Demo Mode scaling composed in one place. */
export function motionConfigForEdge(from: string, to: string, demoMode: boolean): EdgeMotionConfig {
  const commType = commTypeForEdge(from, to);
  const base = EDGE_MOTION_CONFIG[commType];
  const override = EDGE_COLOR_OVERRIDE[edgeKey(from, to)];
  const colored = override ? { ...base, color: override } : base;
  return scaleForDemoMode(colored, demoMode);
}
