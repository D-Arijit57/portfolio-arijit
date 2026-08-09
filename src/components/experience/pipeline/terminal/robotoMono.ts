/**
 * The three American Chase terminal surfaces' one shared typography
 * constant. Same literal font stack every other Roboto-Mono terminal
 * surface in the workspace already uses (TerminalInfoCard.tsx,
 * TerminalPromptLine.tsx, TerminalWindowSvg.tsx, FeatureOutputTerminal.tsx,
 * ...) — those each redeclare their own local copy rather than import a
 * shared one, and this file follows that established convention, just
 * exported once since all three terminals here need the identical value.
 *
 * Deliberately not `--font-mono` (Geist Mono, index.css's Tailwind token):
 * that's this workspace's *source-code* typeface (Shiki, ShikiEditor,
 * WorkHistoryYamlBlock's own raw text). Roboto Mono is reserved for
 * terminal chrome — prompts, commands, printed output — everywhere else
 * in the app, and this feature keeps that split rather than introducing a
 * third convention.
 */
export const ROBOTO_MONO = "'Roboto Mono', ui-monospace, SFMono-Regular, monospace";
