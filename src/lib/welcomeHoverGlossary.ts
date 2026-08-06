export interface HoverGlossaryEntry {
  title: string;
  lines: string[];
  bulleted?: boolean;
}

/**
 * VS Code hover-documentation content for welcome.md's interactive phrases
 * (WelcomeIntro.tsx). Keyed by the exact phrase text as it appears in
 * WelcomeIntro's PARAGRAPHS — only phrases that actually occur in the
 * current copy are listed; the brief's original six-phrase list included
 * three ("reverse engineering", "explorer", "commands") written against an
 * earlier draft of welcome.md that no longer contains them.
 */
export const WELCOME_HOVER_GLOSSARY: Record<string, HoverGlossaryEntry> = {
  'complex systems': {
    title: 'Favorite Problems',
    lines: ['Distributed systems', 'Backend architecture', 'AI workflows', 'Developer tooling'],
    bulleted: true,
  },
  rebuilding: {
    title: 'Philosophy',
    lines: ["Complexity isn't removed.", "It's reorganized until it becomes obvious."],
  },
  simpler: {
    title: 'Guiding Principle',
    lines: ['Fewer moving parts.', 'Easier to reason about, easier to trust.'],
  },
};
