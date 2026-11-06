import type { ResumeData } from '../../../content/resume';

/**
 * Sprint 10F.5: the FullStack+AI resume variant — the portfolio's default,
 * canonical public resume (see ../variants/resumeRegistry.ts). Adding
 * another variant (AI Engineer, Backend, Software Engineer, ...) means
 * adding a sibling file here in the same shape, then one entry in the
 * registry — nothing in this file's shape is FullStack+AI-specific.
 *
 * This data's only live consumer is `ResumeVariant.downloadFilename` (the
 * static PDF the right panel previews/downloads). The rich fields below —
 * summary, skills, experience, projects, achievements — used to also drive
 * the left panel's generated markdown and its resume overview component;
 * both were removed when the left panel became the hire_me.md CLI-report
 * artifact instead (see ../HireMeDocumentView.tsx). Left in place as the
 * resume's structured source of record rather than deleted with those
 * renderers.
 *
 * Content verified verbatim against the October 2026 resume
 * (public/resume/Arijit_Das_Resume.pdf) — wording, dates, and numbers are
 * not paraphrased.
 */
export const fullstackAiResumeData: ResumeData = {
  basics: {
    name: 'Arijit Das',
    title: 'Software Engineer',
    contact: {
      phone: '+91-9475101535',
      email: 'dasarijit5704@gmail.com',
      linkedin: { label: 'linkedin.com/in/arijit-das-66b5b5248', url: 'https://linkedin.com/in/arijit-das-66b5b5248' },
      github: { label: 'github.com/D-Arijit57', url: 'https://github.com/D-Arijit57' },
      location: 'Indore, MP',
    },
  },

  // Sprint 17: prose is now plain text — emphasis is applied at render time
  // by ../tokens/tokenRegistry.ts, not marked up here.
  summary:
    'Backend-focused Software Engineer building REST APIs with Node.js/Express and Django REST Framework ' +
    'on PostgreSQL. Experienced in debugging production issues in serverless deployments, designing ' +
    'multi-tenant APIs, and shipping tested code through Docker and CI',

  highlights: [
    'Production debugging',
    'Multi-tenant API design',
    'PostgreSQL performance',
    'Tested code via Docker and CI',
  ],

  skills: [
    { category: 'Programming Languages', items: ['C++', 'Python', 'JavaScript', 'SQL'] },
    { category: 'Backend & Databases', items: ['Node.js', 'Django', 'Django REST Framework', 'PostgreSQL', 'REST APIs'] },
    { category: 'Frontend', items: ['React.js', 'HTML5', 'Tailwind CSS'] },
    { category: 'DevOps & Cloud', items: ['AWS', 'Docker', 'GitHub Actions'] },
    { category: 'Testing & Tools', items: ['pytest', 'Postman', 'Git', 'GitHub', 'JIRA'] },
  ],

  experience: [
    {
      company: 'American Chase',
      role: 'Software Engineer - Full time',
      location: 'Indore, MP',
      startDate: 'Mar 2026',
      endDate: 'Present',
      highlights: [
        "Restored a failing serverless production deploy by adding .js extensions to imports across 37 backend modules, after tracing the failure to Node's native ESM loader rejecting extensionless paths that local tooling accepted.",
        'Eliminated intermittent missing data in production by making a provider refresh a shared promise that data routes await, after tracing it to an un-awaited call that let serverless invocations return before data loaded.',
        'Diagnosed a schema-validation defect by tracing 3 failing unit tests to a reversed set-difference operation, identifying the incorrect error-field reporting and verifying the fix across a 16-test suite.',
        'Worked on an AI assistant for the client-side operations team with senior engineers, contributing to implementation and testing across the feature.',
      ],
      impact: ['37 modules restored', '3 failing tests traced', '16-test suite'],
    },
  ],

  projects: [
    {
      name: 'Lattice - Multi-Tenant Content Engine',
      techStack: ['Python', 'Django (DRF)', 'PostgreSQL', 'Docker'],
      link: { label: 'GitHub', url: 'https://github.com/D-Arijit57/Lattice' },
      dateRange: 'Sep – Oct 2026',
      oneLiner: 'Multi-tenant headless content engine with runtime-defined content types, JSONB entries and versioned JSON Schemas.',
      highlights: [
        'Built a multi-tenant headless content engine where organizations define content types at runtime. Entries are stored as JSONB and validated against immutable, versioned JSON Schemas, so new content types need no code changes or migrations. Deployed the Dockerized backend on Render behind a Vercel proxy.',
        'Enforced tenant isolation with membership checks on every organization-scoped route and database-level unique constraints. Implemented JWT auth in httpOnly cookies, hashed and revocable API keys, and rate limiting, covered by 50+ pytest tests run in GitHub Actions CI against Postgres on every push.',
        'Load-tested locally with k6 on 100k entries, then made list queries 150x faster (46 to 0.3 ms) with a PostgreSQL composite index and cut queries per page from 54 to 4 by fixing an N+1 query problem. One worker now serves 150 req/s error-free.',
      ],
      impact: ['150x faster list queries', '54 → 4 queries per page', '150 req/s'],
    },
    {
      name: 'RakshaChakra - Behaviour-Based Authentication',
      techStack: ['Python', 'Flask', 'REST APIs', 'AWS'],
      link: { label: 'GitHub', url: 'https://github.com/D-Arijit57/Rakshachakra' },
      dateRange: 'Jun – Jul 2025',
      oneLiner: 'Flask behavioral analytics backend scoring 25+ features per session, taken from 27 to 101 req/s.',
      highlights: [
        'Implemented a behavioral analytics backend using Python Flask and AWS EC2, exposing APIs for risk prediction, user onboarding and model retraining, with a pipeline scoring 25+ behavioral features per session.',
        'Load-tested locally with Locust and added a per-user cache with ETag-based invalidation in place of per-request S3 downloads, raising throughput from 27 to 101 req/s and cutting p50 latency from 3.5 s to 140 ms.',
        'Fixed a race condition causing intermittent HTTP 500s during retraining with per-user file locks, and moved 8–18 s training jobs to background processes, cutting predict latency under mixed load from 2 s to 38 ms.',
      ],
      impact: ['27 → 101 req/s', 'p50 3.5 s → 140 ms', 'predict 2 s → 38 ms'],
    },
  ],

  education: [
    {
      institution: 'Vellore Institute of Technology',
      degree: 'Bachelor of Technology (B.Tech), Computer Science and Engineering',
      dateRange: 'Oct 2022 – Oct 2026',
      detail: 'CGPA: 8.80/10.0',
    },
  ],

  achievements: [
    { title: 'TCS CodeVita 2025', description: 'Top 5% of 100,000+ participants (Rank 4,811).' },
    { title: 'Canara Bank Suraksha Hackathon 2025', description: 'Top 3% (Top 105 of 4,000+ teams).' },
    { title: 'LeetCode', description: 'Published 90+ solution write-ups with 50K+ views from the community.' },
    { title: 'Gen AI Using IBM watsonx', description: 'IBM Career Education Program (Apr 2025).' },
  ],
};
