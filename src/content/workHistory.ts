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
 * Rewritten against the 2026 résumé. The previous version described an
 * LLM document workflow with a RAG pipeline — key-field extraction, 200+
 * indexed documents, a 5 min → under 2 min lookup, 2 delivered features, a
 * 35% reduction in recurring issues. The current résumé makes none of those
 * claims for this role, so none of them survive here: what it documents
 * instead is production debugging on a serverless Node.js/Express backend
 * plus a contribution to an AI assistant built with senior engineers. The
 * only quantities that remain are the two the résumé actually states.
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
    description: 'A serverless Node.js/Express backend supporting a client operations team.',
    // Only what this role's own bullets evidence. The résumé's wider skills
    // list (RAG, vector DBs, Hugging Face, AWS…) belongs to skills.graph, not
    // here: none of it is attributed to American Chase by any bullet, and the
    // assistant bullet names no stack at all.
    tech: ['Node.js', 'Express.js', 'REST APIs'],

    highlights: [
      {
        text: "Fixed a serverless deploy failure caused by extensionless relative imports that local tooling resolved but Node's native ESM loader rejected. Added .js extensions across 37 backend modules and verified by reproducing the production runtime locally.",
        metric: '37 modules',
      },
      {
        text: 'Traced intermittent missing data in production to a provider refresh started at module scope but never awaited, letting the serverless invocation return before hydration finished. Made the refresh a shared promise that data routes await.',
      },
      {
        text: 'Resolved 5+ backend issues in a Node.js/Express application by debugging APIs and improving application logging for easier troubleshooting.',
        metric: '5+ issues',
      },
      {
        text: 'Worked on an AI assistant for the client side operations team with senior engineers, contributing to implementation and testing across the feature.',
      },
    ],

    visualization: {
      type: 'pipeline',
      // What moves through the system. A request, not a document — the
      // résumé's two production fixes are both about what happens between an
      // invocation arriving and a route answering it.
      title: 'a request, end to end',
      derivedFrom: 'reconstructed from americanchase.yaml · not live instrumentation',

      stages: [
        {
          id: 'request',
          label: 'request',
          description: 'a request reaches the serverless backend',
          // No `claim`: nothing was changed here. The stage exists so the
          // pipeline reads as a real system rather than as a list of fixes
          // with connectors drawn between them — and the model has to be able
          // to say "he didn't touch this" without inventing something.
          sourceHighlights: [1],
        },
        {
          id: 'hydrate',
          label: 'hydrate',
          description: 'provider data is loaded before routes read it',
          claim: 'hydration awaited, not raced',
          contribution:
            'Traced intermittent missing data to a provider refresh started at module scope but never awaited, and made it a shared promise that data routes await.',
          technologies: ['Node.js'],
          // A described state change with no number attached — the résumé
          // quantifies neither the failure rate before nor after, so nothing
          // here can be drawn as proportional geometry.
          before: { summary: 'an invocation could return before hydration finished' },
          after: { summary: 'data routes await a shared refresh promise' },
          sourceHighlights: [1],
        },
        {
          id: 'serve',
          label: 'serve',
          description: 'API routes answer the request',
          claim: 'failures traceable from the logs',
          contribution:
            'Resolved backend issues in a Node.js/Express application by debugging APIs and improving application logging.',
          technologies: ['Node.js', 'Express.js', 'REST APIs'],
          metrics: [
            {
              id: 'issues',
              label: 'backend issues resolved',
              // A count, and a lower-bounded one. No `comparison`, so it can
              // never be drawn as a ratio.
              value: '5+',
            },
          ],
          sourceHighlights: [2],
        },
      ],

      spanning: [
        {
          id: 'deploy',
          label: 'deploy',
          contribution:
            "Fixed a serverless deploy failure caused by extensionless relative imports that Node's native ESM loader rejected, adding .js extensions across the backend and verifying against the production runtime locally.",
          technologies: ['Node.js'],
          metrics: [{ id: 'modules', label: 'backend modules corrected', value: '37' }],
          sourceHighlights: [0],
        },
        {
          id: 'assistant',
          label: 'assistant',
          contribution:
            'Worked on an AI assistant for the client side operations team with senior engineers, contributing to implementation and testing across the feature.',
          // Deliberately no `technologies` and no `metrics`: the résumé names
          // no stack for the assistant and quantifies nothing about it. This
          // is the one place the old version reached hardest — "2 AI-assisted
          // workflow features … through production rollout" — and the current
          // résumé supports neither the count nor the ownership.
          sourceHighlights: [3],
        },
      ],
    },
  },
];
