import type { WorkExperience } from '../experience/types';

/**
 * The canonical structured source for americanchase.yaml. The displayed YAML
 * (src/experience/renderers/yamlRenderer.ts) is generated from `highlights`
 * here — the same "model in, source text out" relationship
 * CORTEXA_ARCHITECTURE_MERMAID has with src/content/architecture/cortexa.ts.
 *
 * `visualization` is an interpretation layer over those same sentences and
 * never reaches the YAML, so the generated text remains byte-identical to
 * the two hand-maintained copies (src/content/workspaceSeed.ts and
 * server/repositories/seed/workspaceSeed.ts). Every stage below records the
 * `highlights` index it was read from; nothing in it asserts a fact those
 * four sentences don't already contain.
 *
 * Synced to the November 2026 résumé: the outage is now stated as 8 hours
 * on a customer-data API; a shared-middleware bullet (10 APIs, failures
 * logged by request ID) is new, so the pipeline gained a `handle` stage and
 * the highlight indices after it shifted; the assistant bullet now states a
 * 20+ member team; and the résumé no longer says "serverless", so neither
 * does anything here.
 *
 * Stage labels use the résumé's own vocabulary (module resolution, async
 * refresh, schema validation, error handling) rather than generic pipeline
 * verbs.
 *
 * Earlier, synced to the October 2026 résumé revision: the "5+ backend issues"
 * bullet is gone, replaced by a schema-validation diagnosis (3 failing unit
 * tests, a 16-test suite); the `serve` stage became `validate` and the only
 * quantities that remain are 37 modules and the 3/16 test counts.
 *
 * Rewritten against the 2026 résumé. The previous version described an
 * LLM document workflow with a RAG pipeline — key-field extraction, 200+
 * indexed documents, a 5 min → under 2 min lookup, 2 delivered features, a
 * 35% reduction in recurring issues. The current résumé makes none of those
 * claims for this role, so none of them survive here: what it documents
 * instead is production debugging on a serverless Node.js/Express backend
 * plus a contribution to an AI assistant built with senior engineers. The
 * only quantities are the ones the résumé actually states.
 */
export const workHistory: WorkExperience[] = [
  {
    id: 'american-chase',
    company: 'American Chase',
    companyUrl: 'https://americanchase.com/',
    role: 'Software Engineer',
    location: 'Indore, MP',
    startDate: '2026-03',
    endDate: 'Present',
    description: 'Node.js/Express REST APIs for customer data and product metadata, plus an AI assistant for the client-side operations team.',
    // Only what this role's own bullets evidence. The résumé's wider skills
    // list (AWS, Docker, PostgreSQL…) belongs to skills.graph, not
    // here: none of it is attributed to American Chase by any bullet, and the
    // assistant bullet names no stack at all.
    tech: ['Node.js', 'Express.js', 'REST APIs'],

    highlights: [
      {
        text: "Restored a customer-data API, down for 8 hours, by fixing imports in 37 modules that Node's ESM loader rejected.",
        metric: '37 modules',
      },
      {
        text: 'Ensured product responses consistently returned complete metadata by making routes await a shared refresh promise.',
      },
      {
        text: 'Traced a schema-validation defect from 3 failing tests to a reversed set-difference; verified the fix with 16 tests.',
        metric: '3 failing → 16 tests',
      },
      {
        text: 'Implemented shared middleware to unify error handling across 10 APIs and log failures by request ID.',
        metric: '10 APIs',
      },
      {
        text: 'Collaborated with senior engineers in a 20+ member team on an AI assistant for the client-side operations team.',
        metric: '20+ member team',
      },
    ],

    visualization: {
      type: 'pipeline',
      // What moves through the system. A request, not a document — the
      // résumé's production fixes are all about what happens between a
      // request arriving and a route answering it.
      title: 'a request, end to end',
      derivedFrom: 'reconstructed from americanchase.yaml · not live instrumentation',

      stages: [
        {
          id: 'request',
          label: 'routing',
          description: 'a request reaches an Express route',
          // No `claim`: nothing was changed here. The stage exists so the
          // pipeline reads as a real system rather than as a list of fixes
          // with connectors drawn between them — and the model has to be able
          // to say "he didn't touch this" without inventing something.
          sourceHighlights: [1],
        },
        {
          id: 'hydrate',
          label: 'async refresh',
          description: 'product metadata is refreshed before routes respond',
          claim: 'complete metadata, every response',
          contribution:
            'Ensured product responses consistently returned complete metadata by making routes await a shared refresh promise.',
          technologies: ['Node.js'],
          // A described state change with no number attached — the résumé
          // quantifies neither the failure rate before nor after, so nothing
          // here can be drawn as proportional geometry.
          before: { summary: 'responses could come back without complete metadata' },
          after: { summary: 'routes await a shared refresh promise' },
          sourceHighlights: [1],
        },
        {
          id: 'validate',
          label: 'schema validation',
          description: 'request payloads are checked against a schema',
          claim: 'error fields reported correctly',
          contribution:
            'Traced a schema-validation defect from 3 failing tests to a reversed set-difference; verified the fix with 16 tests.',
          technologies: ['Node.js'],
          before: { summary: '3 tests failed on a schema-validation defect' },
          after: { summary: 'set difference corrected; fix verified with 16 tests' },
          metrics: [
            // Counts, not a comparable pair: no `comparison`, so never drawn as a ratio.
            { id: 'failing-tests', label: 'failing tests traced', value: '3' },
            { id: 'suite', label: 'tests verifying the fix', value: '16' },
          ],
          sourceHighlights: [2],
        },
        {
          id: 'handle',
          label: 'error handling',
          description: 'failures are caught and reported',
          claim: 'one error path, logged by request ID',
          contribution:
            'Implemented shared middleware to unify error handling across 10 APIs and log failures by request ID.',
          technologies: ['Node.js', 'Express.js'],
          before: { summary: 'error handling was handled per API' },
          after: { summary: 'shared middleware handles errors and logs failures by request ID' },
          metrics: [{ id: 'apis', label: 'APIs sharing one error path', value: '10' }],
          sourceHighlights: [3],
        },
      ],

      spanning: [
        {
          id: 'deploy',
          label: 'module resolution',
          contribution:
            "Restored a customer-data API, down for 8 hours, by fixing imports in 37 modules that Node's ESM loader rejected.",
          technologies: ['Node.js'],
          metrics: [
            { id: 'modules', label: 'modules with imports fixed', value: '37' },
            // "8 hours" rather than "8": workspace.ts turns any bare whole
            // number from 1 to 12 into that many placeholder entries in the
            // contributions/ terminal, and a duration isn't a list of things.
            { id: 'downtime', label: 'API down fixed', value: '8 hours' },
          ],
          sourceHighlights: [0],
        },
        {
          id: 'assistant',
          label: 'ai assistant',
          contribution:
            'Collaborated with senior engineers in a 20+ member team on an AI assistant for the client-side operations team.',
          // Deliberately no `technologies`: the résumé names no stack for the
          // assistant. Its only quantity is the team size.
          metrics: [{ id: 'team', label: 'engineers on the team', value: '20+' }],
          sourceHighlights: [4],
        },
      ],
    },
  },
];
