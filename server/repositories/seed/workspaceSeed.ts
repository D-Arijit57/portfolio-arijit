import type { VirtualFile, VirtualFolder } from '../../types';

// Migrated 1:1 from src/content/fileSystem.ts (BACKEND_BOOTSTRAP.md Milestone 2 scope).
// Deliberately not imported from src/ — the repository owns its own data independent
// of the frontend, per the "no frontend imports" rule and PROJECT_CONTEXT.md's
// "Decoupled" backend philosophy.

// Sprint 10F: kept textually identical to src/content/workspaceSeed.ts's
// RESUME_MARKDOWN — same duplication convention as every other seed file here.
const RESUME_MARKDOWN = `# Arijit Das

+91-9475101535 | dasarijit5704@gmail.com | [linkedin.com/in/arijit-das-66b5b5248](https://linkedin.com/in/arijit-das-66b5b5248) | [github.com/D-Arijit57](https://github.com/D-Arijit57)

## Summary

Software Engineer with a strong foundation in **C++**, **OOP**, and full-stack development, building **AI-powered applications** and developer tools. Possesses high learning velocity through shipping side projects and hackathons. Familiar with **LLM primitives** (tokens, embeddings), **Transformer architecture**, and experimenting with open-source **LLMs** (Llama, Mistral). Capable of building basic **RAG pipelines**, applying structured **prompting techniques**, and writing testable code with a strong **evaluation mindset** to monitor expected behavior and safety.

## Education

**Vellore Institute of Technology** — Oct 2022 – Jun 2026
*Bachelor of Technology (B.Tech), Computer Science and Engineering* — CGPA: 8.80/10.0

## Technical Skills

- **Programming Languages:** C++, Python, JavaScript, SQL
- **AI & LLM Tools:** RAG, Vector Stores, Prompt Engineering, Open-Source LLMs (Llama, Mistral), Hugging Face
- **Developer Tools & Tech:** React.js, Next.js, Node.js, Express.js, REST APIs, Git, GitHub, AWS, JIRA, Postman

## Experience

**American Chase** — Mar 2025 – Present
*Software Engineer* — Indore, MP

- Developed an LLM-powered document workflow using **OpenAI API** and **LangChain**, automating key-field extraction and saving **2 hrs/week** for a US operations team.
- Resolved **5+ production defects** in a Node.js/Express backend, reducing recurring issues by **35%** through root-cause analysis and improved logging.
- Integrated a **RAG pipeline** into an internal business tool, enabling natural language search across **200+ documents** and reducing lookup time from **5 mins to under 2 mins**.
- Contributed to the delivery of **2 AI-assisted workflow features**, collaborating with US stakeholders from requirements gathering through production rollout.

## Projects

**Cortexa Remote Interview Platform** | React.js, Next.js, Node.js, TypeScript | [GitHub] — May – Jul 2025

- Built a full-stack video interviewing platform utilizing a strong software engineering foundation, featuring real-time video calls and an interactive code editor supporting **4 languages** including Python and C++.
- Developed robust backend workflows and **API integrations** for live coding capabilities, focusing on writing readable, testable code and ensuring secure session management without leaking sensitive data.
- Designed an scalable scheduling system with calendar integration, applying an evaluation mindset to write simple test cases validating user roles and data synchronization across the platform.

**RakshaChakra - Secure Mobile Banking** | Python, Machine Learning, AWS, Flutter | [GitHub] — Jun – Jul 2025

- Developed a **Python-based** fraud detection backend, evaluating machine learning models against expected behavior and achieving **92% accuracy** in identifying suspicious transactions.
- Implemented a cloud-based behavioral analytics system on **AWS EC2**, demonstrating a solid grasp of data pipelines and real-time monitoring for enhanced application security.
- Built on-device ML processing to keep **95% of sensitive data** local, maintaining strict privacy standards parallel to **data safety** requirements.

## Achievements & Certifications

- **TCS CodeVita 2025:** Ranked in Top 5% (4,811 / 100,000), demonstrating algorithmic problem-solving speed and accuracy under competition conditions.
- **Canara Bank Suraksha Hackathon 2025:** Top 105 teams from 4,000+ participants, showcasing teamwork and the ability to build secure, data-centric systems.
- **IBM Gen AI Certification:** Completed training in generative AI technologies, demonstrating curiosity and practical exposure to LLM primitives, prompting techniques, and exploring the LLM training pipeline.
- **Smart India Hackathon 2024:** Participated in national hackathon, demonstrating learning velocity by rapidly prototyping innovative technological solutions and experimenting with external APIs.
`;
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
