import { VirtualFolder, VirtualFile, ExplorerNode } from '../types';
import { modelToMermaid } from '../architecture/renderers/mermaidRenderer';
import { cortexaArchitecture } from './architecture/cortexa';
import { workHistoryToYaml } from '../experience/renderers/yamlRenderer';
import { workHistory } from './workHistory';

// hire_me.md: the left panel's content is a hand-authored artifact styled
// like generated CLI output — "why hire this engineer" — rather than
// restating the resume the PDF on the right already covers. Rendered by
// HireMeDocumentView.tsx's own line-based terminal parser, not the generic
// markdown pipeline. Still duplicated as a literal string in
// server/repositories/seed/workspaceSeed.ts (that seed can't import from
// src/, same "no frontend imports" convention every backend seed file
// already follows) — keep both copies byte-identical by hand.
const HIRE_ME_REPORT = `$ review candidate

Loading profile...

Candidate ........... Arijit Das
Role ................ Software Engineer
Focus ............... Backend • AI • Developer Tools
Status .............. AVAILABLE

Strengths
─────────
✓ Builds production-ready software
✓ Backend engineering
✓ AI-powered applications
✓ Product-first mindset
✓ Strong ownership

Recent Highlights
─────────────────
• Built LLM-powered workflow automation
• Integrated production RAG pipeline
• Reduced search time from 5 min → <2 min
• Reduced recurring production issues by 35%
• Built full-stack remote interview platform

Recommendation
──────────────
✓ Strong candidate for Software & AI Engineering Roles

Learn More
──────────
→ Download resume.pdf
→ Explore projects/
→ View github.com/D-Arijit57
`;

// ARCHITECTURE_PLATFORM_DESIGN.md §6.1/§13 (Phase 1): architecture.mmd is now
// generated from the canonical ArchitectureModel (src/content/architecture/
// cortexa.ts), not hand-written. Same duplication caveat as RFC_MARKDOWN
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
// RFC_MARKDOWN and CORTEXA_ARCHITECTURE_MERMAID above — kept textually
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
      "position": { "x": 0.29, "y": 0.60 },
      "connectsTo": ["React", "shadcn/ui + Radix UI"]
    },
    {
      "technology": "React",
      "role": "UI Library",
      "description": "Component-based UI library for building interactive user interfaces.",
      "tags": ["Core"],
      "importance": "secondary",
      "position": { "x": 0.13, "y": 0.34 },
      "connectsTo": ["TypeScript", "Tailwind CSS"]
    },
    {
      "technology": "TypeScript",
      "role": "Type System",
      "description": "Static typing across the entire frontend and backend codebase.",
      "tags": ["Core"],
      "importance": "supporting",
      "position": { "x": 0.35, "y": 0.06 },
      "connectsTo": ["Stream"]
    },
    {
      "technology": "Tailwind CSS",
      "role": "Styling System",
      "description": "Utility-first CSS framework for rapid and consistent UI development.",
      "tags": ["Core"],
      "importance": "supporting",
      "position": { "x": -0.26, "y": 0.46 }
    },
    {
      "technology": "shadcn/ui + Radix UI",
      "role": "UI Components",
      "description": "Accessible, unstyled primitives composed into the app's design system.",
      "tags": ["Core"],
      "importance": "supporting",
      "position": { "x": 0.38, "y": 0.82 }
    }
  ],
  "backendAndData": [
    {
      "technology": "Convex",
      "role": "Backend Platform",
      "description": "Real-time backend platform with database, serverless functions, and live synchronization.",
      "tags": ["Database", "Realtime", "Queries", "Mutations", "Actions"],
      "importance": "secondary",
      "position": { "x": 1.06, "y": 0.50 },
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
      "position": { "x": 0.99, "y": 0.26 },
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
      "position": { "x": 0.51, "y": -0.08 },
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
      "position": { "x": 0.64, "y": 0.12 }
    }
  ],
  "deployment": [
    {
      "technology": "Vercel",
      "role": "Frontend Hosting",
      "description": "Hosting and global delivery for the Next.js application.",
      "tags": ["Managed Service"],
      "importance": "supporting",
      "position": { "x": 0.67, "y": 0.62 },
      "connectsTo": ["Next.js"]
    },
    {
      "technology": "Convex Cloud",
      "role": "Backend Hosting",
      "description": "Serverless backend platform with automatic scaling.",
      "tags": ["Managed Service"],
      "importance": "supporting",
      "position": { "x": 1.22, "y": 0.14 }
    },
    {
      "technology": "Stream Cloud",
      "role": "Media Infrastructure",
      "description": "Global media infrastructure for real-time communication.",
      "tags": ["Managed Service"],
      "importance": "supporting",
      "position": { "x": 0.19, "y": -0.14 }
    }
  ]
}
`;

// Sprint 11 (Knowledge Graph): consolidates the old skills/frontend.yaml +
// skills/backend.yaml into one skills.graph file, matching the new
// 6-category scheme (Programming Languages, Frontend, Backend, Artificial
// Intelligence, Cloud, Developer Tools) and the richer GraphNode schema
// (src/graph/types.ts). Real YAML, not JSON-in-yaml — parsed by
// loadGraphModel() (src/graph/loader.ts) via the `yaml` package, an
// explicit, approved exception to the JSON-flow-style trick manifest.yaml
// uses, since this file is meant to read as genuinely developer-authored.
//
// Content grounding (per explicit instruction: do not fabricate years,
// proficiency percentages, project usage, or certifications):
// - `projects`/`notes` on a node only cite what the resume
//   (src/components/resume/data/fullstack-ai.ts, verified verbatim
//   against the real resume PDF) or the Cortexa manifest
//   (manifest.yaml, this same file) already document — e.g. React's
//   `projects` cites Cortexa because manifest.yaml's own frontend
//   category already lists it, and "Portfolio Workspace (this site)"
//   because this app's own package.json genuinely depends on
//   react/typescript/tailwindcss/motion/zustand.
// - `proficiency`/`proficiencyPercent`/`years` are left unset on every
//   node — nothing in the resume states per-skill experience duration or
//   a percentage, so inventing one would violate the instruction. Ready
//   for the user to fill in by hand later.
// - Skills with no direct resume/manifest citation (Vue, Go, PostgreSQL,
//   MongoDB, Redis, GraphQL, Microservices, HTML/CSS, JIRA, Postman, Git,
//   GitHub, Hugging Face, Open-Source LLMs, Prompt Engineering, Vector
//   Stores, SQL) carry a factual description of the technology itself
//   (safe, non-personal) but no `projects`/`notes` claim.
const SKILLS_GRAPH_YAML = `title: Skills
description: An interactive map of the languages, frameworks, and tools I build with.

categories:
  - key: languages
    title: Programming Languages
    nodes:
      - id: cpp
        name: C++
        category: languages
        isCore: true
        description: A high-performance, compiled systems language with manual memory control and object-oriented features.
        documentation: https://en.cppreference.com
        tags: [systems, compiled, oop]

      - id: python
        name: Python
        category: languages
        isCore: true
        description: A dynamically-typed, readable general-purpose language widely used for scripting, data, and machine learning.
        documentation: https://docs.python.org/3
        projects: [RakshaChakra - Secure Mobile Banking]
        notes: Built the fraud-detection backend for RakshaChakra, evaluated at 92% accuracy.
        relatedNodes: [aws]
        tags: [scripting, ml, backend]

      - id: javascript
        name: JavaScript
        category: languages
        description: The core scripting language of the web, running in browsers and on servers via Node.js.
        documentation: https://developer.mozilla.org/en-US/docs/Web/JavaScript
        relatedNodes: [typescript, nodejs]
        tags: [web, scripting]

      - id: typescript
        name: TypeScript
        category: languages
        isCore: true
        description: A statically-typed superset of JavaScript that catches errors at compile time.
        documentation: https://www.typescriptlang.org/docs
        projects: [Cortexa Remote Interview Platform, Portfolio Workspace (this site)]
        relatedNodes: [react, nextjs, javascript]
        tags: [web, typed]

      - id: sql
        name: SQL
        category: languages
        description: The standard query language for relational databases.
        relatedNodes: [postgresql, mongodb]
        tags: [database, query]

      - id: go
        name: Go
        category: languages
        description: A compiled, statically-typed language designed for simple, efficient concurrent systems.
        documentation: https://go.dev/doc
        tags: [systems, backend, concurrency]

  - key: frontend
    title: Frontend
    nodes:
      - id: react
        name: React
        category: frontend
        isCore: true
        description: A component-based JavaScript library for building user interfaces.
        documentation: https://react.dev
        projects: [Cortexa Remote Interview Platform, Portfolio Workspace (this site)]
        relatedNodes: [nextjs, typescript, tailwindcss]
        tags: [ui, library, component-based]

      - id: nextjs
        name: Next.js
        category: frontend
        isCore: true
        description: A React framework with routing, server components, and API routes built in.
        documentation: https://nextjs.org/docs
        projects: [Cortexa Remote Interview Platform]
        relatedNodes: [react, typescript, vercel]
        tags: [framework, ssr]

      - id: vue
        name: Vue
        category: frontend
        description: An approachable, component-based JavaScript framework for building user interfaces.
        documentation: https://vuejs.org
        tags: [ui, framework]

      - id: tailwindcss
        name: Tailwind CSS
        category: frontend
        description: A utility-first CSS framework for building custom designs without leaving HTML.
        documentation: https://tailwindcss.com/docs
        projects: [Cortexa Remote Interview Platform, Portfolio Workspace (this site)]
        relatedNodes: [react, shadcn-radix, html-css]
        tags: [css, styling]

      - id: framer-motion
        name: Framer Motion
        category: frontend
        description: A production-ready animation library for React, published today as the "motion" package.
        documentation: https://motion.dev
        projects: [Portfolio Workspace (this site)]
        relatedNodes: [react]
        tags: [animation, react]

      - id: shadcn-radix
        name: shadcn/ui + Radix UI
        category: frontend
        description: Accessible, unstyled UI primitives (Radix) composed into a themeable component set (shadcn/ui).
        documentation: https://ui.shadcn.com
        projects: [Cortexa Remote Interview Platform]
        relatedNodes: [tailwindcss, react]
        tags: [ui, components, accessibility]

      - id: html-css
        name: HTML/CSS
        category: frontend
        description: The foundational markup and styling languages of the web.
        relatedNodes: [tailwindcss]
        tags: [web, markup, styling]

      - id: zustand
        name: Zustand
        category: frontend
        description: A small, unopinionated state-management library for React.
        documentation: https://zustand.docs.pmnd.rs
        projects: [Portfolio Workspace (this site)]
        relatedNodes: [react]
        tags: [state-management, react]

  - key: backend
    title: Backend
    nodes:
      - id: nodejs
        name: Node.js
        category: backend
        isCore: true
        description: A JavaScript runtime for building server-side applications outside the browser.
        documentation: https://nodejs.org/docs
        projects: [Cortexa Remote Interview Platform]
        notes: Resolved 5+ production defects in a Node.js/Express backend at American Chase, reducing recurring issues by 35% through root-cause analysis and improved logging.
        relatedNodes: [expressjs, javascript, typescript]
        tags: [runtime, backend]

      - id: expressjs
        name: Express.js
        category: backend
        description: A minimal, unopinionated web framework for Node.js.
        documentation: https://expressjs.com
        relatedNodes: [nodejs, rest-apis]
        tags: [framework, backend]

      - id: rest-apis
        name: REST APIs
        category: backend
        description: An architectural style for designing networked applications around stateless, resource-oriented HTTP endpoints.
        relatedNodes: [expressjs, graphql]
        tags: [api, architecture]

      - id: postgresql
        name: PostgreSQL
        category: backend
        description: An open-source, standards-compliant relational database.
        documentation: https://www.postgresql.org/docs
        relatedNodes: [sql]
        tags: [database, relational]

      - id: mongodb
        name: MongoDB
        category: backend
        description: A document-oriented NoSQL database.
        documentation: https://www.mongodb.com/docs
        relatedNodes: [sql]
        tags: [database, nosql]

      - id: redis
        name: Redis
        category: backend
        description: An in-memory key-value store used for caching, queues, and fast lookups.
        documentation: https://redis.io/docs
        tags: [database, cache]

      - id: graphql
        name: GraphQL
        category: backend
        description: A query language for APIs that lets clients request exactly the data they need.
        documentation: https://graphql.org/learn
        relatedNodes: [rest-apis]
        tags: [api, query-language]

      - id: microservices
        name: Microservices
        category: backend
        description: An architectural style that structures an application as a collection of independently deployable services.
        relatedNodes: [rest-apis, graphql]
        tags: [architecture]

      - id: convex
        name: Convex
        category: backend
        description: A real-time backend platform combining a database, serverless functions, and live synchronization.
        documentation: https://docs.convex.dev
        projects: [Cortexa Remote Interview Platform]
        relatedNodes: [react, nextjs]
        tags: [backend-platform, realtime]

  - key: ai
    title: Artificial Intelligence
    nodes:
      - id: openai-api
        name: OpenAI API
        category: ai
        isCore: true
        description: A hosted API for accessing large language models for text generation and reasoning tasks.
        documentation: https://platform.openai.com/docs
        notes: Used to build an LLM-powered document workflow automating key-field extraction, saving 2 hrs/week for a US operations team.
        relatedNodes: [langchain, rag]
        tags: [llm, api]

      - id: langchain
        name: LangChain
        category: ai
        isCore: true
        description: A framework for composing LLM calls, tools, and retrieval steps into structured pipelines.
        documentation: https://www.langchain.com
        notes: Used alongside the OpenAI API to build an automated document-processing workflow.
        relatedNodes: [openai-api, rag, vector-stores]
        tags: [llm, framework]

      - id: rag
        name: RAG
        category: ai
        isCore: true
        description: Retrieval-Augmented Generation — combines a language model with a search step over external documents to ground its answers.
        notes: Integrated a RAG pipeline enabling natural-language search across 200+ internal documents, cutting lookup time from around 5 minutes to under 2.
        relatedNodes: [langchain, vector-stores, openai-api]
        tags: [llm, retrieval]

      - id: prompt-engineering
        name: Prompt Engineering
        category: ai
        description: Structuring inputs to a language model to reliably produce the intended output.
        relatedNodes: [openai-api, langchain]
        tags: [llm]

      - id: vector-stores
        name: Vector Stores
        category: ai
        description: Databases optimized for storing and searching embeddings by semantic similarity — the retrieval half of RAG.
        relatedNodes: [rag, langchain]
        tags: [llm, retrieval, database]

      - id: hugging-face
        name: Hugging Face
        category: ai
        description: A platform and library ecosystem for open-source machine learning models.
        documentation: https://huggingface.co/docs
        relatedNodes: [open-source-llms]
        tags: [ml, models]

      - id: open-source-llms
        name: Open-Source LLMs (Llama, Mistral)
        category: ai
        description: Openly-available language models that can be run and experimented with outside a hosted API.
        relatedNodes: [hugging-face]
        tags: [llm]

  - key: cloud
    title: Cloud
    nodes:
      - id: aws
        name: AWS
        category: cloud
        description: Amazon's cloud computing platform, spanning compute, storage, and managed services.
        documentation: https://docs.aws.amazon.com
        projects: [RakshaChakra - Secure Mobile Banking]
        notes: Deployed a cloud-based behavioral-analytics system on AWS EC2 for real-time monitoring.
        relatedNodes: [python]
        tags: [cloud, infrastructure]

      - id: vercel
        name: Vercel
        category: cloud
        description: A hosting platform for frontend frameworks, built around Next.js.
        documentation: https://vercel.com/docs
        projects: [Cortexa Remote Interview Platform]
        relatedNodes: [nextjs]
        tags: [hosting, deployment]

  - key: devtools
    title: Developer Tools
    nodes:
      - id: git
        name: Git
        category: devtools
        description: A distributed version-control system for tracking changes in source code.
        documentation: https://git-scm.com/doc
        relatedNodes: [github]
        tags: [vcs]

      - id: github
        name: GitHub
        category: devtools
        description: A hosting platform for Git repositories, code review, and CI/CD.
        documentation: https://docs.github.com
        relatedNodes: [git]
        tags: [vcs, collaboration]

      - id: jira
        name: JIRA
        category: devtools
        description: A project- and issue-tracking tool used for agile software development.
        documentation: https://support.atlassian.com/jira-software-cloud
        tags: [project-management]

      - id: postman
        name: Postman
        category: devtools
        description: A tool for building, testing, and documenting HTTP APIs.
        documentation: https://learning.postman.com/docs
        relatedNodes: [rest-apis]
        tags: [api, testing]

      - id: monaco-editor
        name: Monaco Editor
        category: devtools
        description: The code editor component that powers VS Code, embeddable in web applications.
        documentation: https://microsoft.github.io/monaco-editor
        projects: [Cortexa Remote Interview Platform]
        relatedNodes: [typescript]
        tags: [editor, tooling]
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
      name: 'hire_me.md',
      type: 'markdown',
      path: '/hire_me.md',
      content: HIRE_ME_REPORT,
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
          id: 'skills_graph',
          name: 'skills.graph',
          type: 'graph',
          path: '/skills/skills.graph',
          content: SKILLS_GRAPH_YAML,
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
