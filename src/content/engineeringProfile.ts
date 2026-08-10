/**
 * The right pane's engineering-profile identity block — the single source
 * for both its rendered typewriter sequence (EngineeringProfile.tsx, phase
 * 3 of TerminalRunner) and startup.log's raw VFS representation
 * (workspaceSeed.ts's `STARTUP_LOG_CONTENT`). Same "one source, two
 * consumers" relationship WELCOME_PARAGRAPHS (src/content/welcome.ts) has
 * with WelcomeIntro.tsx and welcome.md's own seed text.
 */
export const ENGINEERING_PROFILE_FIELD_COLUMN_WIDTH = 12;

export const ENGINEERING_PROFILE_FIELDS: { label: string; value: string }[] = [
  { label: 'Name', value: 'Arijit Das' },
  { label: 'Role', value: 'Software Engineer' },
  { label: 'Location', value: 'Indore, India' },
];

export const ENGINEERING_PROFILE_STATUS = 'Available';
