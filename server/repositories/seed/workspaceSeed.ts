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

// Hand-authored project documentation, kept textually identical to
// src/content/workspaceSeed.ts's own copy — same duplication convention as
// RESUME_MARKDOWN and CORTEXA_ARCHITECTURE_MERMAID above. Update both by
// hand together.
const CORTEXA_DOC_MARKDOWN = `# Cortexa

## Overview

Cortexa is a technical interview platform that unifies scheduling, live video, and an integrated coding environment into a single, connected workflow. It replaces the common pattern of stitching together a calendar tool, a video conferencing app, and a separate code-sharing tool for each interview with one system that understands an interview as a first-class object — from booking through evaluation.

## Problem Statement

Conducting a structured technical interview typically requires coordinating several disconnected tools: a scheduling tool to find a time slot, a video conferencing product for the live conversation, and a separate code editor or pastebin for the coding portion — often followed by manual note-taking and ad hoc code review after the fact. This fragmentation makes interviews harder to run consistently, harder to review afterward, and leaves code evaluation entirely up to the interviewer's real-time judgment. Cortexa addresses this by keeping scheduling, the live session, the coding workspace, and the resulting artifacts (recordings, submissions, verdicts) inside one system.

## Core Features

- **Interview scheduling** — booking and managing interview time slots.
- **Live interviews** — video, audio, and screen sharing for the interviewer/candidate session, with recording.
- **Integrated coding workspace** — an in-browser, multi-language code editor embedded directly in the interview session.
- **Automated code evaluation** — submitted code is run against test cases and produces a verdict, rather than relying solely on the interviewer's manual review.
- **Recording management** — interview recordings are retained and associated with their interview for later review.
- **Authenticated access with role-based permissions** — interviewers and candidates operate under managed identity and access control.

## Architecture Overview

Cortexa is built as a Next.js application that orchestrates three managed platform services rather than hosting its own auth, database, or video infrastructure:

- **Clerk** — authentication, sessions, and role-based access control.
- **Convex** — the real-time backend: queries, mutations, actions, and the persistent state behind every business domain below.
- **Stream** — video calls, screen sharing, and recording.

Business logic is organized into five domains sitting behind Convex: **Interview Scheduling**, **Interview Lifecycle**, **Coding Challenge**, **Judge Pipeline**, and **Recording Management**. Each is a distinct architectural boundary rather than one monolithic "interview" concept — see Major Engineering Decisions below for why.

This is a high-level summary; the canonical, interactive representation of the system is **architecture.mmd** in this folder. It renders as a live, explorable diagram (the Architecture Canvas) rather than a static picture, and is the source of truth for how these pieces connect — this document doesn't duplicate that detail.

## Interview Workflow

1. **Scheduling** — a time slot is booked through the Scheduling module, backed by the Interview Scheduling domain.
2. **Join** — participants join the Interview Workspace, which composes the Meeting Room (video) and Monaco Editor (coding) for the session.
3. **Live interview** — video/audio/screen sharing runs through Stream; the interview's state and participants are tracked by the Interview Lifecycle domain.
4. **Coding** — the candidate works in Monaco Editor against a challenge defined by the Coding Challenge domain.
5. **Submission & evaluation** — a submission is handed to the Judge Pipeline, which executes it against test cases and produces a result.
6. **Recording & review** — the session recording is retained by Recording Management and associated with the interview for later playback.
7. **Completion** — the Interview Lifecycle domain marks the interview complete once the above has run its course.

## Technology Stack

Next.js (App Router) and React on the client, TailwindCSS for styling, Clerk for auth, Convex as the real-time backend, Stream for video, and Monaco Editor for the coding workspace. See **manifest.json** in this folder for the full inventory grouped by responsibility rather than as a flat dependency list.

## Major Engineering Decisions

- **Convex over a hand-rolled REST API + database.** Interview state (code changes, submission status, session presence) needs to be visible to both participants immediately; Convex's real-time subscriptions provide this without a custom WebSocket layer.
- **Clerk over a custom auth system.** Authentication, session management, and RBAC are well-solved problems; building them in-house would spend engineering effort on infrastructure instead of interview-specific functionality.
- **Stream over a custom WebRTC stack.** Reliable video calling is a substantial engineering investment on its own; delegating it to a managed provider keeps the team focused on the interview experience rather than media transport.
- **Monaco Editor for the coding workspace.** The same editor that powers VS Code, chosen for a coding experience candidates are already likely to be familiar with, without building an editor from scratch.
- **Domain-separated business logic.** Interview Scheduling, Interview Lifecycle, Coding Challenge, Judge Pipeline, and Recording Management are kept as distinct boundaries rather than one large "interview" object, so each concern can be reasoned about, and potentially scaled, independently.
- **Judge Pipeline as its own domain, decoupled from Coding Challenge.** Keeping evaluation separate from challenge authoring means the execution/sandboxing approach can evolve without changing how challenges are defined.

## Managed Services

| Service | Role |
|---|---|
| Clerk | Identity, authentication, session management, RBAC |
| Convex | Real-time database and backend platform — queries, mutations, actions, and persistent state for every business domain |
| Stream | Video calls, audio, screen sharing, recording |

Relying on managed platforms for auth, real-time data, and video is a deliberate tradeoff: it introduces external dependencies outside Cortexa's own control, in exchange for not having to build and operate infrastructure that isn't the product's core value.

## Scalability Considerations

- **Video and real-time transport scale outside Cortexa's own code.** Stream and Convex are managed platforms responsible for scaling media transport and real-time subscriptions respectively; Cortexa's own scaling concern is session/state coordination on top of them, not the transport layer itself.
- **Code execution is the most likely bottleneck under load.** Running arbitrary submitted code requires isolation per submission, and how that isolation is implemented and scaled is not yet fully specified in the current architecture (see the Judge Pipeline node's noted tradeoff in architecture.mmd) — flagged as an open question rather than a settled design.
- **Domain separation is a scaling seam, not just an organizational one.** Because Interview Scheduling, Interview Lifecycle, Coding Challenge, Judge Pipeline, and Recording Management are already separated as distinct domains, any one of them could in principle be scaled or re-architected independently if it became a bottleneck, even though they currently share a single Convex deployment.
`;

// Manifest Viewer (Engineering Manifest Explorer): every top-level key
// except "project"/"description" is read as a category by
// src/manifest/parser.ts — adding a new key here (e.g. "observability")
// is the entire mechanism for a new card to appear, with zero renderer
// changes. Kept textually identical to src/content/workspaceSeed.ts's own
// copy — update both by hand together.
const CORTEXA_MANIFEST_JSON = `{
  "project": "Cortexa",
  "description": "High-level inventory of the core technologies and services powering the platform.",
  "frontend": [
    { "technology": "Next.js (App Router)", "role": "Framework" },
    { "technology": "React", "role": "Library" },
    { "technology": "TailwindCSS", "role": "Styling" }
  ],
  "backendAndData": [
    { "technology": "Next.js (App Router)", "role": "Orchestration" },
    { "technology": "Convex", "role": "Realtime Database" }
  ],
  "authentication": [
    { "technology": "Clerk", "role": "Authentication" }
  ],
  "communication": [
    { "technology": "Stream", "role": "Video & Audio" }
  ],
  "developerExperience": [
    { "technology": "Monaco Editor", "role": "Editor" },
    { "technology": "Next.js tooling", "role": "Tooling" }
  ],
  "deployment": [
    { "technology": "Next.js Application", "role": "Single Deployable App" },
    { "technology": "Clerk", "role": "Managed Service" },
    { "technology": "Convex", "role": "Managed Service" },
    { "technology": "Stream", "role": "Managed Service" }
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
              name: 'manifest.json',
              type: 'json',
              path: '/projects/Cortexa/manifest.json',
              content: CORTEXA_MANIFEST_JSON,
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
