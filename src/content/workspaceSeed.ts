import { VirtualFolder, VirtualFile, ExplorerNode } from '../types';
import { generateResumeMarkdown } from './resume';
import { getDefaultResumeVariant } from '../components/resume/variants/resumeRegistry';
import { modelToMermaid } from '../architecture/renderers/mermaidRenderer';
import { cortexaArchitecture } from './architecture/cortexa';

// Sprint 10F.1: RESUME.md's content is generated from the canonical resume
// variant (Sprint 10F.5: components/resume/variants/resumeRegistry.ts)
// rather than hand-typed here — verified byte-identical to the Sprint 10F
// hand-written version. Still duplicated as a literal string in
// server/repositories/seed/workspaceSeed.ts (that seed can't import from
// src/, same "no frontend imports" convention every backend seed file
// already follows) — update that copy by hand if the default variant's
// content ever changes.
const RESUME_MARKDOWN = generateResumeMarkdown(getDefaultResumeVariant().data);

// ARCHITECTURE_PLATFORM_DESIGN.md §6.1/§13 (Phase 1): architecture.mmd is now
// generated from the canonical ArchitectureModel (src/content/architecture/
// cortexa.ts), not hand-written. Same duplication caveat as RESUME_MARKDOWN
// above — server/repositories/seed/workspaceSeed.ts can't import from src/,
// so its copy is a literal string kept in sync by hand.
const CORTEXA_ARCHITECTURE_MERMAID = modelToMermaid(cortexaArchitecture);

// Hand-authored project documentation, same duplication convention as
// RESUME_MARKDOWN and CORTEXA_ARCHITECTURE_MERMAID above — kept textually
// identical to server/repositories/seed/workspaceSeed.ts's own copy, update
// both by hand together.
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
// changes. No "stack" wrapper — categories are flat top-level keys, so a
// future addition is exactly the shape the brief's example showed.
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

export function getAllFiles(node: ExplorerNode): VirtualFile[] {
  if ('content' in node) {
    return [node as VirtualFile];
  }
  return (node as VirtualFolder).children.flatMap(getAllFiles);
}
