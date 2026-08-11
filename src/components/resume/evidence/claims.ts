import { workHistory } from '../../../content/workHistory';

/**
 * hire_me.md's claim → evidence map: which workspace file backs each of the
 * five Recent Highlights, and where inside it.
 *
 * Deliberately a static table, not a graph engine. The portfolio's evidence
 * relationships are authored facts about five sentences — there is nothing to
 * traverse, query, or infer, and a resolver would be more code than the data.
 *
 * Two rules hold everything here honest:
 *
 * 1. **No prose is written in this file.** Every `description` is read out of
 *    `src/content/workHistory.ts` — the same canonical model americanchase.yaml
 *    itself is generated from — by looking up the stage/spanning id named in
 *    `locator`. So a reference can never describe the work differently from the
 *    file it points at, and editing the contribution in one place updates both.
 *
 * 2. **No line ranges.** An earlier mockup showed `L45–L67`, `L1–L120`; the real
 *    files are 18 and 28 lines. Locators name a real addressable region of the
 *    canonical model (`stage · extract`) instead, which is both truthful and
 *    more useful than a line number that would drift the moment the generator
 *    changed.
 *
 * `bulletIndex` is the claim's position among the `kind === 'bullet'` lines that
 * `parseTerminalLines.ts` already produces from HIRE_ME_REPORT — `•` appears in
 * exactly one section of that report (Recent Highlights; Strengths uses `✓`,
 * Learn More uses `→`), so the index is a stable identity that required no new
 * parser, no markup in the content, and no second copy of the claim text.
 */

const AMERICAN_CHASE = workHistory[0];

/** Canonical contribution sentence for a pipeline stage, by its model id. */
function stageDescription(stageId: string): string | undefined {
  return AMERICAN_CHASE.visualization.stages.find((s) => s.id === stageId)?.contribution;
}

/** Canonical contribution sentence for a spanning contribution, by its model id. */
function spanningDescription(spanningId: string): string | undefined {
  return AMERICAN_CHASE.visualization.spanning?.find((s) => s.id === spanningId)?.contribution;
}

export interface EvidenceReference {
  /** A real VFS file id — passed straight to the store's `openFile`. */
  fileId: string;
  fileName: string;
  /** Where inside the file, in the canonical model's own terms. Omitted when
   * the referenced document has no addressable sub-structure. */
  locator?: string;
  /** Canonical prose, never authored here. Omitted when none exists. */
  description?: string;
}

export interface Claim {
  id: string;
  /** Index among HIRE_ME_REPORT's `kind === 'bullet'` lines. */
  bulletIndex: number;
  /**
   * The claim's identity colour, worn by its bullet on the left, its rail dot
   * and locator on the right, and the connector between them. Giving each claim
   * its own hue is what lets five relationships share one screen without a
   * legend: the line you are following is the colour you started from.
   *
   * All five are values the workspace already uses — the success green, the
   * prompt blue, the tradeoff amber, `--tok-concept` purple, and the shared
   * MUTED_PALETTE teal. No new hue enters the palette for this feature.
   */
  color: string;
  references: EvidenceReference[];
}

/**
 * Claim 5's three references carry a different *kind* of description from
 * claims 1–4, and the distinction is deliberate.
 *
 * Claims 1–4 quote `workHistory.ts` — canonical sentences about work that was
 * done. Cortexa's documents have no equivalent of `sourceHighlights`, so there
 * is no such sentence to quote here, and writing one would be inventing
 * evidence. What these three say instead is what each artifact *is* — a fact
 * anyone can check by clicking the reference and looking. `architecture.mmd`
 * really is the architecture diagram; `constellation.explore` really is the
 * technology inventory (its own model's `description` field says exactly that).
 *
 * So: never a claim about performance, only a label for the artifact. That is
 * the line this file will not cross.
 */
export const CLAIMS: Claim[] = [
  {
    id: 'llm-workflow',
    bulletIndex: 0,
    color: '#4CD964',
    references: [
      {
        fileId: 'american_chase',
        fileName: 'americanchase.yaml',
        locator: 'stage · extract',
        description: stageDescription('extract'),
      },
    ],
  },
  {
    id: 'rag-pipeline',
    bulletIndex: 1,
    color: '#569cd6',
    references: [
      {
        fileId: 'american_chase',
        fileName: 'americanchase.yaml',
        locator: 'stage · index',
        description: stageDescription('index'),
      },
    ],
  },
  {
    id: 'search-time',
    bulletIndex: 2,
    color: '#e2c08d',
    references: [
      {
        fileId: 'american_chase',
        fileName: 'americanchase.yaml',
        locator: 'stage · retrieve',
        description: stageDescription('retrieve'),
      },
    ],
  },
  {
    id: 'defect-reduction',
    bulletIndex: 3,
    color: '#c586c0',
    references: [
      {
        fileId: 'american_chase',
        fileName: 'americanchase.yaml',
        locator: 'spanning · reliability',
        description: spanningDescription('reliability'),
      },
    ],
  },
  {
    id: 'interview-platform',
    bulletIndex: 4,
    color: '#4ec9b0',
    references: [
      { fileId: 'cortexa_readme', fileName: 'cortexa.md', description: 'System design, architecture & decisions' },
      { fileId: 'cortexa_arch', fileName: 'architecture.mmd', description: 'High-level system architecture' },
      { fileId: 'cortexa_manifest', fileName: 'constellation.explore', description: 'Tech stack & infrastructure' },
    ],
  },
];

/** Total references across every claim — rendered literally in the rail header
 * ("5 claims · 7 references") so the count can never drift from the data. */
export const REFERENCE_COUNT = CLAIMS.reduce((n, c) => n + c.references.length, 0);

export const CLAIM_BY_BULLET_INDEX = new Map(CLAIMS.map((c) => [c.bulletIndex, c]));
