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
 */
export const workHistory: WorkExperience[] = [
  {
    id: 'american-chase',
    company: 'American Chase',
    companyUrl: 'https://americanchase.com/',
    role: 'Software Engineer',
    location: 'Indore, MP',
    startDate: '2025-03',
    endDate: 'Present',
    description: 'An internal document tool used by a US operations team.',
    tech: ['OpenAI API', 'LangChain', 'RAG', 'Node.js', 'Express.js'],

    highlights: [
      {
        text: 'Developed an LLM-powered document workflow using OpenAI API and LangChain, automating key-field extraction and saving 2 hrs/week for a US operations team.',
        metric: '2 hrs/wk',
      },
      {
        text: 'Resolved 5+ production defects in a Node.js/Express backend, reducing recurring issues by 35% through root-cause analysis and improved logging.',
        metric: '−35% defects',
      },
      {
        text: 'Integrated a RAG pipeline into an internal business tool, enabling natural language search across 200+ documents and reducing lookup time from 5 mins to under 2 mins.',
        metric: '200+ docs',
      },
      {
        text: 'Contributed to the delivery of 2 AI-assisted workflow features, collaborating with US stakeholders from requirements gathering through production rollout.',
        metric: '2 features',
      },
    ],

    visualization: {
      type: 'pipeline',
      title: 'a document, end to end',
      derivedFrom: 'reconstructed from americanchase.yaml · not live instrumentation',

      stages: [
        {
          id: 'intake',
          label: 'intake',
          description: 'a document reaches the workflow',
          // No `claim`: nothing was changed here, so the column shows the
          // description instead of asserting an outcome.
          // No contribution on purpose. This stage exists so the pipeline
          // reads as a real system rather than as four accomplishments with
          // connectors drawn between them — and the model has to be able to
          // say "he didn't touch this" without inventing something.
          sourceHighlights: [0],
        },
        {
          id: 'extract',
          label: 'extract',
          description: 'key fields are read off the document',
          claim: 'key fields read off automatically',
          contribution:
            'Built an LLM-powered document workflow that extracts key fields automatically on upload.',
          technologies: ['OpenAI API', 'LangChain'],
          metrics: [
            {
              id: 'time-saved',
              label: 'operations time saved',
              // A rate, not a before/after pair — no `comparison`, so this
              // metric can never be drawn as proportional geometry.
              value: '2 hrs/week',
            },
          ],
          before: { summary: 'key fields extracted by hand' },
          after: { summary: 'extracted automatically on upload' },
          sourceHighlights: [0],
        },
        {
          id: 'index',
          label: 'index',
          description: 'document contents become searchable',
          claim: 'contents made searchable',
          contribution: 'Integrated a RAG pipeline into the internal business tool.',
          technologies: ['RAG', 'LangChain'],
          metrics: [
            {
              id: 'documents',
              label: 'documents indexed',
              // A count. No comparison, and deliberately no before/after
              // either: the source says a capability was added, not what
              // preceded it, and guessing would be the first fabricated
              // thing on this page.
              value: '200+',
            },
          ],
          sourceHighlights: [2],
        },
        {
          id: 'retrieve',
          label: 'retrieve',
          description: 'someone needs the document back',
          claim: 'found in natural language',
          contribution: 'Enabled natural-language search across the indexed documents.',
          technologies: ['RAG'],
          metrics: [
            {
              id: 'lookup-time',
              label: 'lookup time',
              value: '5 min → under 2 min',
              // The only genuinely commensurable pair in this dataset, and
              // therefore the only place proportional geometry is drawn.
              // `to: 2` is the stated upper bound ("under 2 mins"), so the
              // rendered bar is a conservative reading of the claim.
              comparison: { from: 5, to: 2, unit: 'min' },
            },
          ],
          before: { summary: 'finding a document took about 5 minutes' },
          after: { summary: 'found in under 2 minutes, in natural language' },
          sourceHighlights: [2],
        },
      ],

      spanning: [
        {
          id: 'reliability',
          label: 'reliability',
          contribution:
            'Resolved production defects in the Node.js/Express backend through root-cause analysis and improved logging.',
          technologies: ['Node.js', 'Express.js'],
          metrics: [
            { id: 'recurrence', label: 'recurring issues', value: '−35%' },
            { id: 'defects', label: 'defects resolved', value: '5+' },
          ],
          sourceHighlights: [1],
        },
        {
          id: 'delivery',
          label: 'delivery',
          contribution:
            'Collaborated with US stakeholders from requirements gathering through production rollout.',
          metrics: [{ id: 'features', label: 'AI-assisted features', value: '2' }],
          sourceHighlights: [3],
        },
      ],
    },
  },
];
