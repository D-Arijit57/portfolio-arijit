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

// ARCHITECTURE_PLATFORM_DESIGN.md §6.1/§13 (Phase 1): kept textually
// identical to src/content/workspaceSeed.ts's CORTEXA_ARCHITECTURE_MERMAID
// (modelToMermaid(cortexaArchitecture), src/content/architecture/cortexa.ts)
// — same duplication convention as RESUME_MARKDOWN above. Update this copy
// by hand if cortexa.ts's ArchitectureModel ever changes.
const CORTEXA_ARCHITECTURE_MERMAID = `graph TD
    client[Client]
    dashboard[Dashboard]
    interview_workspace[Interview Workspace]
    scheduling_ui[Scheduling]
    meeting_room[Meeting Room]
    monaco_editor[Monaco Editor]
    next_js_app[Next.js Application]
    clerk[[Clerk]]
    convex[(Convex)]
    stream_video[[Stream Video]]
    interview_scheduling[Interview Scheduling]
    interview_lifecycle[Interview Lifecycle]
    coding_challenge[Coding Challenge]
    judge_pipeline[Judge Pipeline]
    recording_management[Recording Management]
    client --> dashboard
    client --> interview_workspace
    client --> scheduling_ui
    client --> meeting_room
    client --> monaco_editor
    dashboard --> next_js_app
    interview_workspace --> next_js_app
    scheduling_ui --> next_js_app
    meeting_room --> next_js_app
    monaco_editor --> next_js_app
    next_js_app -->|Auth API| clerk
    next_js_app -->|Realtime| convex
    next_js_app -->|Video API| stream_video
    convex --> interview_scheduling
    convex --> interview_lifecycle
    convex --> coding_challenge
    convex --> recording_management
    coding_challenge --> judge_pipeline
    stream_video --> recording_management
`;

// Career Roadmap redesign: kept textually identical to
// src/content/workspaceSeed.ts's own WORK_HISTORY_YAML
// (workHistoryToYaml(workHistory), src/content/workHistory.ts) — same
// duplication convention as CORTEXA_ARCHITECTURE_MERMAID above. Update this
// copy by hand if workHistory.ts's WorkExperience[] ever changes.
const WORK_HISTORY_YAML = `# Work History

experiences:
  - company: "American Chase"
    role: "Software Engineer"
    startDate: "2025-03"
    endDate: "Present"
    location: "Indore, MP"
    tech: ["OpenAI API", "LangChain", "RAG", "Node.js", "Express.js"]
    highlights:
      - Developed an LLM-powered document workflow using OpenAI API and LangChain, automating key-field extraction and saving 2 hrs/week for a US operations team.

      - Resolved 5+ production defects in a Node.js/Express backend, reducing recurring issues by 35% through root-cause analysis and improved logging.

      - Integrated a RAG pipeline into an internal business tool, enabling natural language search across 200+ documents and reducing lookup time from 5 mins to under 2 mins.

      - Contributed to the delivery of 2 AI-assisted workflow features, collaborating with US stakeholders from requirements gathering through production rollout.
`;

// Hand-authored project documentation, kept textually identical to
// src/content/workspaceSeed.ts's own copy — same duplication convention as
// RESUME_MARKDOWN and CORTEXA_ARCHITECTURE_MERMAID above. Update both by
// hand together.
const CORTEXA_DOC_MARKDOWN = `---
summary: A technical interview platform that unifies scheduling, live video, and an integrated coding environment into a single, connected workflow.
badges: [Next.js, React, TypeScript, Clerk, Convex, Stream, Monaco Editor]
highlights: [Real-time state via Convex subscriptions, Managed auth & RBAC via Clerk, Managed video & recording via Stream, Domain-separated business logic across 5 bounded contexts]
metadata: [Status: Production Ready, Architecture: Service-Composed, Frontend: Next.js, Backend: Convex, Authentication: Clerk, Realtime: Stream + Convex]
---

# Cortexa

## Overview

Cortexa is a technical interview platform that unifies scheduling, live video, and an integrated coding environment into a single, connected workflow. It replaces the common pattern of stitching together a calendar tool, a video conferencing app, and a separate code-sharing tool for each interview with one system that understands an interview as a first-class object — from booking through evaluation.

## Problem Statement

Conducting a structured technical interview typically means coordinating several disconnected tools — a scheduler, a video call, and a separate code editor — followed by manual note-taking and ad hoc review after the fact. This fragmentation makes interviews harder to run consistently and leaves code evaluation entirely up to the interviewer's real-time judgment. Cortexa keeps scheduling, the live session, the coding workspace, and the resulting artifacts inside one connected system.

## Core Features

- **Interview scheduling** — booking and managing interview time slots.
- **Live interviews** — video, audio, and screen sharing for the interviewer/candidate session, with recording.
- **Integrated coding workspace** — an in-browser, multi-language code editor embedded directly in the interview session.
- **Automated code evaluation** — submitted code is run against test cases and produces a verdict, rather than relying solely on the interviewer's manual review.
- **Recording management** — interview recordings are retained and associated with their interview for later review.
- **Authenticated access with role-based permissions** — interviewers and candidates operate under managed identity and access control.

## Continue Exploring

- [Architecture Canvas](architecture.mmd) — Explore the interactive system architecture.
- [Technology Manifest](manifest.yaml) — Browse the complete categorized technology inventory.
- [GitHub Repository](https://github.com/D-Arijit57) — Explore the implementation and source code.
- [Live Demo](https://cortexa-eight.vercel.app/) — Experience Cortexa in action.
`;

// Manifest Viewer (Engineering Manifest Explorer): every top-level key
// except "project"/"description" is read as a category by
// src/manifest/parser.ts — adding a new key here (e.g. "observability")
// is the entire mechanism for a new card to appear, with zero renderer
// changes. Kept textually identical to src/content/workspaceSeed.ts's own
// copy — update both by hand together (hydrateVFS() replaces the frontend
// seed with this one, so this copy is what actually renders at runtime).
//
// The file is named/typed manifest.yaml (see the virtual file entry
// below) but this text stays JSON-flow-style rather than YAML block
// style — JSON is a valid subset of YAML 1.2, so parseManifest()'s
// JSON.parse() keeps working unchanged. It's never shown raw either way
// (ManifestViewer always renders the parsed model, never this source
// text), so the flow-style form costs nothing and avoids a parser rewrite.
//
// Tech Stack Constellation topology (`position`/`connectsTo` below): the
// actual Sagittarius constellation, not "inspired by" it — 12 real,
// named Sagittarius stars (the 8-star Teapot asterism plus 4 more real
// stars traditionally placed around it: Albaldah, Alnasl already counted,
// Eta Sagittarii, Omicron Sagittarii, Polis), positioned per their real
// relative sky arrangement (normalized [0,1], see ManifestPosition in
// src/manifest/types.ts) so the silhouette is recognizably the Teapot +
// bow even with every label removed. Each technology is assigned to a
// star by real apparent-magnitude rank matched against tech importance —
// the brightest real star (Kaus Australis, mag 1.85) carries the most
// important technology (Next.js, the app framework everything else runs
// on), the next-brightest (Nunki, Ascella, Kaus Media) carry the three
// secondary technologies (Clerk, Convex, React), and the remaining 8
// dimmer stars carry the 8 supporting technologies, also in brightness
// order. `connectsTo` is the real Teapot line pattern (the ring of 7
// asterism lines plus the spout and the 4 satellite-star connections)
// re-expressed with the assigned technology names and directed as a
// spanning tree rooted at Clerk (one edge — the ring's closing segment —
// is omitted to break the asterism's natural cycle into a buildable
// dependency order; every other real connection line is present). See
// src/manifest/constellationGraph.ts / constellationLayout.ts for how
// this authored data drives the renderer.
const CORTEXA_MANIFEST_YAML = `{
  "project": "Cortexa",
  "description": "High-level inventory of the core technologies and services that power the Cortexa platform.",
  "frontend": [
    {
      "technology": "Next.js",
      "role": "Application Framework",
      "description": "React framework with App Router, Server Components and Route Handlers.",
      "tags": ["Core"],
      "importance": "primary",
      "position": { "x": 0.24, "y": 0.60 },
      "connectsTo": ["React", "shadcn/ui + Radix UI"]
    },
    {
      "technology": "React",
      "role": "UI Library",
      "description": "Component-based UI library for building interactive user interfaces.",
      "tags": ["Core"],
      "importance": "secondary",
      "position": { "x": 0.04, "y": 0.34 },
      "connectsTo": ["TypeScript", "Tailwind CSS"]
    },
    {
      "technology": "TypeScript",
      "role": "Type System",
      "description": "Static typing across the entire frontend and backend codebase.",
      "tags": ["Core"],
      "importance": "supporting",
      "position": { "x": 0.32, "y": 0.06 },
      "connectsTo": ["Stream"]
    },
    {
      "technology": "Tailwind CSS",
      "role": "Styling System",
      "description": "Utility-first CSS framework for rapid and consistent UI development.",
      "tags": ["Core"],
      "importance": "supporting",
      "position": { "x": -0.44, "y": 0.46 }
    },
    {
      "technology": "shadcn/ui + Radix UI",
      "role": "UI Components",
      "description": "Accessible, unstyled primitives composed into the app's design system.",
      "tags": ["Core"],
      "importance": "supporting",
      "position": { "x": 0.36, "y": 0.82 }
    }
  ],
  "backendAndData": [
    {
      "technology": "Convex",
      "role": "Backend Platform",
      "description": "Real-time backend platform with database, serverless functions, and live synchronization.",
      "tags": ["Database", "Realtime", "Queries", "Mutations", "Actions"],
      "importance": "secondary",
      "position": { "x": 1.20, "y": 0.50 },
      "connectsTo": ["Vercel"]
    }
  ],
  "authentication": [
    {
      "technology": "Clerk",
      "role": "Identity Platform",
      "description": "Authentication, user management, sessions and role-based access control.",
      "tags": ["Authentication", "Sessions", "RBAC", "JWT"],
      "importance": "secondary",
      "position": { "x": 1.12, "y": 0.26 },
      "connectsTo": ["Convex", "Monaco Editor", "Convex Cloud"]
    }
  ],
  "communication": [
    {
      "technology": "Stream",
      "role": "Media Infrastructure",
      "description": "Managed video SDK powering live interviews with audio, video, screen sharing and recording.",
      "tags": ["Video", "Audio", "Screen Sharing", "Recordings"],
      "importance": "supporting",
      "position": { "x": 0.52, "y": -0.08 },
      "connectsTo": ["Stream Cloud"]
    }
  ],
  "developerExperience": [
    {
      "technology": "Monaco Editor",
      "role": "Code Editor",
      "description": "In-browser code editor with multi-language support and live code execution.",
      "tags": ["Multi-language", "Code Execution", "Hot Reload"],
      "importance": "supporting",
      "position": { "x": 0.68, "y": 0.12 }
    }
  ],
  "deployment": [
    {
      "technology": "Vercel",
      "role": "Frontend Hosting",
      "description": "Hosting and global delivery for the Next.js application.",
      "tags": ["Managed Service"],
      "importance": "supporting",
      "position": { "x": 0.72, "y": 0.62 },
      "connectsTo": ["Next.js"]
    },
    {
      "technology": "Convex Cloud",
      "role": "Backend Hosting",
      "description": "Serverless backend platform with automatic scaling.",
      "tags": ["Managed Service"],
      "importance": "supporting",
      "position": { "x": 1.40, "y": 0.14 }
    },
    {
      "technology": "Stream Cloud",
      "role": "Media Infrastructure",
      "description": "Global media infrastructure for real-time communication.",
      "tags": ["Managed Service"],
      "importance": "supporting",
      "position": { "x": 0.12, "y": -0.14 }
    }
  ]
}
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

> **Quick Start**
>
> This workspace is interactive.
>
> Run \`help\` in the terminal below to begin exploring the portfolio.
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
          name: 'work_history.yaml',
          type: 'yaml',
          path: '/experience/work_history.yaml',
          content: WORK_HISTORY_YAML,
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
              name: 'cortexa.md',
              type: 'markdown',
              path: '/projects/Cortexa/cortexa.md',
              content: CORTEXA_DOC_MARKDOWN,
            } as VirtualFile,
            {
              id: 'cortexa_arch',
              name: 'architecture.mmd',
              type: 'mermaid',
              path: '/projects/Cortexa/architecture.mmd',
              content: CORTEXA_ARCHITECTURE_MERMAID,
            } as VirtualFile,
            {
              id: 'cortexa_manifest',
              name: 'manifest.yaml',
              type: 'yaml',
              path: '/projects/Cortexa/manifest.yaml',
              content: CORTEXA_MANIFEST_YAML,
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
