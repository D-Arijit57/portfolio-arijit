import { VirtualFolder, VirtualFile, ExplorerNode } from '../types';
import { generateResumeMarkdown } from './resume';
import { getDefaultResumeVariant } from '../components/resume/variants/resumeRegistry';
import { modelToMermaid } from '../architecture/renderers/mermaidRenderer';
import { cortexaArchitecture } from './architecture/cortexa';
import { workHistoryToYaml } from '../experience/renderers/yamlRenderer';
import { workHistory } from './workHistory';

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

// Career Roadmap redesign: work_history.yaml's displayed source is
// generated from the canonical WorkExperience[] (src/content/workHistory.ts),
// the same relationship CORTEXA_ARCHITECTURE_MERMAID has with
// cortexaArchitecture above — the Career Roadmap panel imports that array
// directly rather than parsing this text back, so there's exactly one place
// the data lives. Same duplication caveat as the others — server/
// repositories/seed/workspaceSeed.ts can't import from src/, so its copy is
// a literal string kept in sync by hand.
const WORK_HISTORY_YAML = workHistoryToYaml(workHistory);

// Hand-authored project documentation, same duplication convention as
// RESUME_MARKDOWN and CORTEXA_ARCHITECTURE_MERMAID above — kept textually
// identical to server/repositories/seed/workspaceSeed.ts's own copy, update
// both by hand together.
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
// changes. No "stack" wrapper — categories are flat top-level keys, so a
// future addition is exactly the shape the brief's example showed.
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

## What I Build

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

export function getAllFiles(node: ExplorerNode): VirtualFile[] {
  if ('content' in node) {
    return [node as VirtualFile];
  }
  return (node as VirtualFolder).children.flatMap(getAllFiles);
}
