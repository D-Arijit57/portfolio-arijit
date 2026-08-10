/**
 * welcome.md's approved prose — the single source for both its rendered
 * typewriter reveal (WelcomeIntro.tsx) and its raw VFS representation
 * (workspaceSeed.ts's `welcome-intro` fence body, read verbatim by `cat`
 * and indexed by search). Same "one source, two consumers" relationship
 * workHistory.ts/contact.ts already have with their own generated seed
 * text — the fence body was previously empty (the widget renderer ignores
 * it entirely, so nothing visual depended on that), which meant `cat
 * welcome.md` and search both saw an empty directive instead of the real
 * copy. Populating it from this same array fixes that without touching
 * WelcomeIntro's rendering at all.
 */
export const WELCOME_PARAGRAPHS: string[] = [
  'Welcome.',
  "There isn't a correct place to begin.",
  "Some files explain what I've built.\nOthers explain why.",
  "A few things only reveal themselves\nif you're curious enough to ask.",
  'I spend most of my time taking apart\ncomplex systems, understanding how\nthey work, and rebuilding them into\nsimpler, more reliable software.',
  'If something catches your attention,\nfollow it.',
  "That's usually how I work too.",
];
