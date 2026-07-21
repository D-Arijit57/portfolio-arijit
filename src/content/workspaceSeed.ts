import { VirtualFolder, VirtualFile, ExplorerNode } from '../types';
import { resumeData, generateResumeMarkdown } from './resume';

// Sprint 10F.1: RESUME.md's content is now generated from the single
// structured source (content/resume.ts) rather than hand-typed here —
// verified byte-identical to the Sprint 10F hand-written version. Still
// duplicated as a literal string in server/repositories/seed/workspaceSeed.ts
// (that seed can't import from src/, same "no frontend imports" convention
// every backend seed file already follows) — update that copy by hand if
// content/resume.ts ever changes.
const RESUME_MARKDOWN = generateResumeMarkdown(resumeData);

/**
 * Pre-hydration seed for the workspace store. Schema-equivalent to the
 * backend's own seed (server/repositories/seed/workspaceSeed.ts) so the
 * app renders identically before and after hydrateVFS() replaces it with
 * real backend data (see VFS_DESIGN.md, BACKEND_BOOTSTRAP.md Milestone 4).
 */
export const workspaceSeed: VirtualFolder = {
  id: 'root',
  name: 'Journey',
  path: '/',
  children: [
    {
      id: 'readme',
      name: 'README.md',
      type: 'markdown',
      path: '/README.md',
      content: `# Welcome to my Journey

Hi, I'm a developer building modern web experiences.
Welcome to my interactive portfolio structured as a VS Code workspace.

## Getting Started

Feel free to explore the files and learn more about my background.

- Use the **Explorer** on the left to navigate between sections.
- Check out the **Terminal** below to interact via commands.

\`\`\`bash
# Try running this command below:
npm run about
\`\`\`
`,
    } as VirtualFile,
    {
      id: 'playground',
      name: 'playground.py',
      type: 'python',
      path: '/playground.py',
      content: `from dataclasses import dataclass

@dataclass
class Engineer:
    name: str
    focus: list[str]

me = Engineer(
    name="Arijit Das",
    focus=[
        "Full Stack",
        "AI",
        "System Design"
    ]
)

print(f"Welcome to {me.name}'s workspace.")
`,
    } as VirtualFile,
    {
      id: 'resume',
      name: 'RESUME.md',
      type: 'markdown',
      path: '/RESUME.md',
      content: RESUME_MARKDOWN,
    } as VirtualFile,
    {
      id: 'about',
      name: 'about',
      path: '/about',
      children: [
        {
          id: 'profile',
          name: 'profile.md',
          type: 'markdown',
          path: '/about/profile.md',
          content: `# Arijit Das

Full Stack Engineer | AI Enthusiast | Systems Architect

\`\`\`profile-sidebar
\`\`\`

Hello! I'm a software engineer passionate about building scalable, high-performance applications. I bridge the gap between complex backend architectures and intuitive, pixel-perfect frontend experiences.

\`\`\`tech-stack
\`\`\`

## Core Competencies

- **Frontend:** Advanced state management, Performance optimization, WebGL rendering.
- **Backend:** Microservices design, Distributed systems, RESTful API and GraphQL development.
- **DevOps:** CI/CD pipeline automation, Infrastructure as Code, Monitoring.
- **AI/ML:** Prompt engineering, RAG pipelines, fine-tuning open-source models for specific domains.

> Code is read far more often than it's written — I optimize for the person who inherits this next.

## Recent Activity

\`\`\`github-recent-activity
\`\`\`
`,
        } as VirtualFile,
      ],
    } as VirtualFolder,
    {
      id: 'experience',
      name: 'experience',
      path: '/experience',
      children: [
        {
          id: 'work_history',
          name: 'work_history.ts',
          type: 'typescript',
          path: '/experience/work_history.ts',
          content: `export interface WorkExperience {
  company: string;
  role: string;
  startDate: string;
  endDate: string | 'Present';
  highlights: string[];
}

export const workHistory: WorkExperience[] = [
  {
    company: 'TechNova Solutions',
    role: 'Senior Frontend Engineer',
    startDate: '2021-03',
    endDate: 'Present',
    highlights: [
      'Led migration of legacy monolithic app to React/TypeScript micro-frontends.',
      'Mentored 4 junior developers and established CI/CD best practices.'
    ]
  },
  {
    company: 'NextGen AI',
    role: 'Full Stack Developer',
    startDate: '2019-06',
    endDate: '2021-02',
    highlights: [
      'Developed real-time collaboration features using WebSockets.',
      'Optimized database queries reducing latency by 40%.'
    ]
  }
];
`,
        } as VirtualFile,
      ],
    } as VirtualFolder,
    {
      id: 'projects',
      name: 'projects',
      path: '/projects',
      children: [
        {
          id: 'cortexa',
          name: 'Cortexa',
          path: '/projects/Cortexa',
          children: [
            {
              id: 'cortexa_readme',
              name: 'README.md',
              type: 'markdown',
              path: '/projects/Cortexa/README.md',
              content: `# Cortexa
Core intelligence engine for distributed systems...

A modern approach to distributed task queuing and processing.
`,
            } as VirtualFile,
            {
              id: 'cortexa_arch',
              name: 'architecture.mmd',
              type: 'mermaid',
              path: '/projects/Cortexa/architecture.mmd',
              content: `graph TD
    A[Client] -->|HTTP| B(API Gateway)
    B --> C{Load Balancer}
    C -->|gRPC| D[Auth Service]
    C -->|gRPC| E[Cortexa Core]
    E --> F[(PostgreSQL)]
    E --> G[(Redis Cache)]
`,
            } as VirtualFile,
            {
              id: 'cortexa_metrics',
              name: 'metrics.json',
              type: 'json',
              path: '/projects/Cortexa/metrics.json',
              content: `{
  "performance": {
    "latency_ms": 42,
    "throughput_req_sec": 15000,
    "uptime": 99.99
  }
}`,
            } as VirtualFile,
            {
              id: 'cortexa_package',
              name: 'package.json',
              type: 'json',
              path: '/projects/Cortexa/package.json',
              content: `{
  "name": "cortexa",
  "version": "1.0.0",
  "dependencies": {
    "express": "^4.18.0",
    "redis": "^4.0.0",
    "pg": "^8.7.0"
  }
}`,
            } as VirtualFile,
          ],
        } as VirtualFolder,
      ],
    } as VirtualFolder,
    {
      id: 'skills',
      name: 'skills',
      path: '/skills',
      children: [
        {
          id: 'skills_frontend',
          name: 'frontend.yaml',
          type: 'yaml',
          path: '/skills/frontend.yaml',
          content: `frameworks:
  - React
  - Next.js
  - Vue
languages:
  - TypeScript
  - JavaScript
  - HTML/CSS
styling:
  - TailwindCSS
  - Framer Motion
  - Radix UI
`,
        } as VirtualFile,
        {
          id: 'skills_backend',
          name: 'backend.yaml',
          type: 'yaml',
          path: '/skills/backend.yaml',
          content: `languages:
  - Node.js
  - Python
  - Go
databases:
  - PostgreSQL
  - MongoDB
  - Redis
architecture:
  - Microservices
  - REST
  - GraphQL
`,
        } as VirtualFile,
      ],
    } as VirtualFolder,
    {
      id: 'contact',
      name: 'contact',
      path: '/contact',
      children: [
        {
          id: 'contact_sh',
          name: 'contact.sh',
          type: 'shell',
          path: '/contact/contact.sh',
          content: `#!/bin/bash
# Run this to contact me

echo "Email: dasarijit5704@gmail.com"
echo "GitHub: github.com/yourusername"
echo "LinkedIn: linkedin.com/in/yourusername"
`,
        } as VirtualFile,
      ],
    } as VirtualFolder,
  ],
};

export function getAllFiles(node: ExplorerNode): VirtualFile[] {
  if ('content' in node) {
    return [node as VirtualFile];
  }
  return (node as VirtualFolder).children.flatMap(getAllFiles);
}
