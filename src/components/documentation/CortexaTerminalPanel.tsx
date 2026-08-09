/**
 * Rakshachakra Grammar Extraction (Phase 2): the actual shell implementation
 * moved to `ProjectTerminalPanel.tsx` — the generic name for the reusable
 * project-page terminal system this component originally established. This
 * file now just re-exports it under Cortexa's own name, so every existing
 * `import { CortexaTerminalPanel } from './CortexaTerminalPanel'` across
 * `CortexaProblemTerminal.tsx`, `CortexaDecisionTerminal.tsx`,
 * `CortexaExploreTerminal.tsx`, `ExecutionReplayTerminal.tsx` (via
 * `CortexaExecutionFlow.tsx`) keeps working with zero changes and zero
 * behavioral difference — this is the same component, not a copy.
 *
 * Regression requirement: Cortexa's own rendering must stay byte-identical
 * after this extraction. Don't add Cortexa-specific branching back into
 * this file — anything Cortexa-only belongs in the terminals that use this
 * shell, not the shell itself (it already had none).
 */
export { ProjectTerminalPanel as CortexaTerminalPanel } from './ProjectTerminalPanel';
