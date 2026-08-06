// startup.log's content — a second, distinct boot layer from
// lib/bootSequence.ts's BOOT_SEQUENCE. That one is the machine/IDE
// launching ("Launching Visual Studio Code...", "Initializing Git...");
// this one is this workspace's own content loading (explorer, projects,
// experience, animations, git detection). Deliberately similar shape, not
// the same subject, so the two don't read as the same thing playing twice.
// Reveal timing/gating is entirely owned by useFileRevealSequence — this
// module is just the static data.

export const STARTUP_LOG_LINES: string[] = [
  'Initializing workspace...',
  'Loading explorer...',
  'Loading projects...',
  'Loading experience...',
  'Loading animations...',
  'Git repository detected...',
  'Workspace ready.',
];

// Compact, not decorative — initials boxed with a terminal prompt glyph.
export const STARTUP_LOG_ASCII = String.raw`
 ┌────────┐
 │  AD >_ │
 └────────┘`;

export const STARTUP_LOG_FINAL_MESSAGE = 'Terminal ready.';
