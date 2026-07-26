import type { WorkExperience } from '../experience/types';

/**
 * This is the source of truth for the Career Roadmap; work_history.yaml's
 * displayed YAML source (src/experience/renderers/yamlRenderer.ts) is
 * generated from it, the same relationship CORTEXA_ARCHITECTURE_MERMAID
 * has with src/content/architecture/cortexa.ts. Update both by hand together
 * with server/repositories/seed/workspaceSeed.ts's own copy (that repository
 * deliberately doesn't import from src/ — see its own comment).
 */
export const workHistory: WorkExperience[] = [
  {
    company: 'American Chase',
    companyUrl: 'https://americanchase.com/',
    role: 'Software Engineer',
    location: 'Indore, MP',
    startDate: '2025-03',
    endDate: 'Present',
    tech: ['OpenAI API', 'LangChain', 'RAG', 'Node.js', 'Express.js'],
    highlights: [
      'Developed an LLM-powered document workflow using OpenAI API and LangChain, automating key-field extraction and saving 2 hrs/week for a US operations team.',
      'Resolved 5+ production defects in a Node.js/Express backend, reducing recurring issues by 35% through root-cause analysis and improved logging.',
      'Integrated a RAG pipeline into an internal business tool, enabling natural language search across 200+ documents and reducing lookup time from 5 mins to under 2 mins.',
      'Contributed to the delivery of 2 AI-assisted workflow features, collaborating with US stakeholders from requirements gathering through production rollout.',
    ],
    impact: [
      { icon: 'clock', value: '2 hrs/week', label: 'Time Saved', accent: 'green' },
      { icon: 'database', value: '200+', label: 'Documents Indexed', accent: 'green' },
      { icon: 'bug', value: '5+', label: 'Issues Resolved', accent: 'orange' },
      { icon: 'rocket', value: '2', label: 'AI Features Delivered', accent: 'purple' },
    ],
    skills: [
      { label: 'AI Engineering', percent: 85 },
      { label: 'Backend Development', percent: 70 },
      { label: 'Automation', percent: 90 },
      { label: 'Production Support', percent: 65 },
    ],
  },
];
