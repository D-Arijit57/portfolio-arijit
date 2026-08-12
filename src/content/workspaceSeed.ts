import { VirtualFolder, VirtualFile, ExplorerNode } from '../types';
import { modelToMermaid } from '../architecture/renderers/mermaidRenderer';
import { cortexaArchitecture } from './architecture/cortexa';
import { rakshachakraArchitecture } from './architecture/rakshachakra';
import { workHistoryToYaml } from '../experience/renderers/yamlRenderer';
import { workHistory } from './workHistory';
import { contactChannelsToShellScript } from '../contact/renderers/shellRenderer';
import { CONTACT_CHANNELS } from './contact';
import { WELCOME_PARAGRAPHS } from './welcome';
import { WELCOME_BANNER } from '../components/signature/signatureBanner';
import {
  ENGINEERING_PROFILE_FIELDS,
  ENGINEERING_PROFILE_FIELD_COLUMN_WIDTH,
  ENGINEERING_PROFILE_STATUS,
} from './engineeringProfile';

// welcome.md's fence body: the widget renderer (documentationWidgets.tsx's
// `welcome-intro` entry) ignores this text entirely — WelcomeIntro.tsx
// renders its own typewriter reveal from the same WELCOME_PARAGRAPHS
// import, independent of whatever sits inside the fence. This exists only
// so `cat welcome.md` and search see the real approved copy instead of an
// empty directive — same duplication caveat as every other generated field
// below: server/repositories/seed/workspaceSeed.ts can't import from src/,
// so its copy is a literal string kept in sync by hand.
const WELCOME_INTRO_CONTENT = `\`\`\`welcome-intro\n${WELCOME_PARAGRAPHS.join('\n\n')}\n\`\`\`\n`;

// startup.log's raw VFS content: a truthful static snapshot of what
// StartupLogViewer's real renderer (TerminalRunner, via signature.sh) shows
// once its sequence settles, built from the exact same WELCOME_BANNER and
// engineering-profile data TerminalRunner itself renders from — not a
// duplicate of its phase machine, just the same source formatted the same
// way EngineeringProfile.tsx pads its own field labels. Deliberately omits
// the visitor count: that's live, per-visitor state fetched at render time
// (visitorClient.recordVisit()), and there's no honest static number to
// print here — see VisitorLine.tsx's own "no fabricated placeholder"
// precedent. Same duplication caveat as WELCOME_INTRO_CONTENT above.
function formatStartupLogContent(): string {
  const fieldLines = ENGINEERING_PROFILE_FIELDS
    .map((f) => `${f.label.padEnd(ENGINEERING_PROFILE_FIELD_COLUMN_WIDTH)}${f.value}`)
    .join('\n');
  const statusLine = `${'Status'.padEnd(ENGINEERING_PROFILE_FIELD_COLUMN_WIDTH)}● ${ENGINEERING_PROFILE_STATUS}`;

  return [
    '$ ./signature.sh',
    '',
    WELCOME_BANNER.join('\n'),
    '',
    fieldLines,
    statusLine,
    '',
    'arijit@portfolio:~$',
  ].join('\n') + '\n';
}

const STARTUP_LOG_CONTENT = formatStartupLogContent();

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
Focus ............... Backend systems • LLM applications
Status .............. AVAILABLE

Strengths
─────────
✓ Node.js/Express backend services and REST APIs
✓ Production debugging and root-cause analysis
✓ Full-stack delivery, frontend through backend
✓ LLM and RAG application work
✓ Readable, testable code

Recent Highlights
─────────────────
• Fixed a serverless deploy failure across 37 backend modules
• Traced a production data race in unawaited async hydration
• Resolved 5+ backend issues by debugging APIs and logging
• Contributed to an AI assistant alongside senior engineers
• Built a full-stack remote interview platform

Looking For
───────────
Backend or full-stack engineering, ideally where LLM features
are shipped into real production systems rather than demos.

Recommendation
──────────────
✓ Strong candidate for Backend & AI Engineering Roles

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

// Same generated-not-hand-written relationship as CORTEXA_ARCHITECTURE_MERMAID
// above, from src/content/architecture/rakshachakra.ts. Same duplication
// caveat — server/repositories/seed/workspaceSeed.ts's copy is a literal
// string kept in sync by hand.
const RAKSHACHAKRA_ARCHITECTURE_MERMAID = modelToMermaid(rakshachakraArchitecture);

// Career Roadmap redesign: americanchase.yaml's displayed source is
// generated from the canonical WorkExperience[] (src/content/workHistory.ts),
// the same relationship CORTEXA_ARCHITECTURE_MERMAID has with
// cortexaArchitecture above — the Career Roadmap panel imports that array
// directly rather than parsing this text back, so there's exactly one place
// the data lives. Same duplication caveat as the others — server/
// repositories/seed/workspaceSeed.ts can't import from src/, so its copy is
// a literal string kept in sync by hand.
const WORK_HISTORY_YAML = workHistoryToYaml(workHistory);

// contact.sh's displayed source — same "model in, source text out"
// relationship as WORK_HISTORY_YAML above, from src/content/contact.ts's
// CONTACT_CHANNELS (itself a projection of ResumeContact, never a second
// set of literal values). Same duplication caveat as the others — server/
// repositories/seed/workspaceSeed.ts can't import from src/, so its copy
// is a literal string kept in sync by hand.
const CONTACT_SH_CONTENT = contactChannelsToShellScript(CONTACT_CHANNELS);

// Hand-authored project documentation, same duplication convention as
// RFC_MARKDOWN and CORTEXA_ARCHITECTURE_MERMAID above — kept textually
// identical to server/repositories/seed/workspaceSeed.ts's own copy, update
// both by hand together.
//
// Documentation Redesign: `badges` switched to lowercase package-style
// names. This markdown source is read only for its `frontmatter` — title
// and summary become the page's `head -1` line (CortexaIdentityLine),
// while status and badges are printed later by run-cortexa's own `cat`
// (ExecutionReplayTerminal). Cortexa's renderer never reads `model.intro`
// or `model.sections` at all: the three-terminal narrative and its
// capability spec are authored in src/content/cortexaNarrative.ts, which
// is also what keeps the decision↔evidence hover links in sync.
const CORTEXA_DOC_MARKDOWN = `---
summary: A technical interview platform that unifies scheduling, live video, and an integrated coding environment into a single, connected workflow.
badges: [nextjs, react, typescript, clerk, convex, stream, monaco]
highlights: [Convex-backed real-time sync, Clerk-managed role-based access, Automated code judging, Stream-managed video & recording, Service-composed across 5 bounded contexts]
metadata: [Status: Deployed]
---

# Cortexa

## Core Features

- **Interview scheduling** — book and manage interview time slots.
- **Live interviews** — video, audio, and screen sharing, with recording, for the interviewer/candidate session.
- **Integrated coding workspace** — an in-browser, multi-language code editor built into the interview session.
- **Automated code evaluation** — submitted code runs against real test cases and returns a verdict.
- **Recording management** — interview recordings are retained and linked back to their interview.
- **Role-based access** — interviewers and candidates operate under managed identity and access control.

## Continue Exploring

- [architecture.mmd](architecture.mmd) — Interactive system architecture diagram.
- [constellation.explore](constellation.explore) — Categorized technology inventory.
- [repository.git](https://github.com/D-Arijit57) — Source code on GitHub.
- [demo.live](https://cortexa-eight.vercel.app/) — Live, deployed instance of the app.
`;

// Manifest Viewer (Engineering Manifest Explorer): every top-level key
// except "project"/"description" is read as a category by
// src/manifest/parser.ts — adding a new key here (e.g. "observability")
// is the entire mechanism for a new card to appear, with zero renderer
// changes. No "stack" wrapper — categories are flat top-level keys, so a
// future addition is exactly the shape the brief's example showed.
//
// The file is named constellation.explore (see the virtual file entry
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

// Rakshachakra: hand-authored project documentation, same shape/convention
// as CORTEXA_DOC_MARKDOWN above (frontmatter + Overview/Problem Statement/
// Core Features/Continue Exploring) — kept textually identical to server/
// repositories/seed/workspaceSeed.ts's own copy, update both by hand
// together. Continue Exploring has 3 link-cards, not Cortexa's 4: no live
// demo URL exists for this project, and inventing one isn't warranted.
const RAKSHACHAKRA_DOC_MARKDOWN = `---
summary: A Flutter-based mobile banking demo built around behavior-based continuous authentication — verifying identity throughout a session, not just at login.
badges: [Flutter, Dart, Firebase, Cloud Firestore, Python, Provider, local_auth]
highlights: [Continuous behavioral risk scoring across the full session, 25+ behavioral signals feeding a live risk model, Adaptive step-up authentication by risk tier, Cloud-hosted model retraining as behavior evolves]
metadata: [Status: Demo / Prototype, Architecture: Layered (Presentation/Application/Data/ML), Platform: Flutter, Backend: Firebase + Python ML Service, Authentication: Continuous Behavioral + Biometric, Risk Engine: Cloud-Hosted Model]
---

# Rakshachakra

## Overview

Rakshachakra is a Flutter-based mobile banking demo built around behavior-based continuous authentication. Instead of verifying identity once at login, it continuously evaluates whether live touch, motion, and device behavior still match the enrolled user's profile, and adjusts the security response in real time based on the resulting risk score. It replaces the common pattern of a single login checkpoint with a system that treats identity as something to be continuously re-confirmed throughout a session.

## Problem Statement

Most mobile banking apps authenticate a user once at login and then trust that session until it expires or the user logs out — leaving no mechanism to detect a stolen or hijacked session where the underlying behavior no longer matches the real user. Rakshachakra keeps behavioral signal collection, feature extraction, risk inference, and the resulting security response inside one continuously running pipeline, rather than treating authentication as a single gate the user passes through once.

## Core Features

- **Continuous behavioral authentication** — identity is re-evaluated throughout the session against touch, motion, and device signals, not just once at login.
- **Behavioral feature extraction** — raw sensor and interaction events are transformed into 25+ behavioral features describing how the current user is interacting with the device.
- **Real-time risk inference** — extracted features are scored against the enrolled behavioral profile to produce a live risk/confidence score.
- **Adaptive response engine** — security response scales with risk: low risk continues normally, medium risk triggers step-up authentication, high risk locks or restricts the session.
- **Cloud-backed model retraining** — the behavioral model evolves over time as legitimate usage patterns change, via a dedicated retraining pipeline.
- **Local and biometric authentication support** — device-level biometric and local authentication checks back the behavioral layer.

## Continue Exploring

- [Architecture Canvas](architecture.mmd) — Explore the interactive system architecture.
- [Tech Stack Constellation](constellation.explore) — Browse the complete categorized technology inventory.
- [GitHub Repository](https://github.com/D-Arijit57/Rakshachakra) — Explore the implementation and source code.
`;

// Rakshachakra's Manifest Viewer source — same JSON-flow-style-inside-a-
// .yaml-file convention as CORTEXA_MANIFEST_YAML above (see that constant's
// comment for why: parseManifest() uses JSON.parse(), not a real YAML
// parser).
//
// Layout v5 — Crystal Lattice (final direction after 4 rejected passes:
// dense 20-node lattice, curated 8-node tree, Orion). Per explicit user
// direction, this is NOT a real-world constellation reference at all —
// silhouette (a gem/crystal reading) took precedence over literal
// dependency accuracy throughout, including one deliberate deviation from
// the user's own suggested edge list: their brief left Cloud Firestore
// with a single connection (to Firebase), which conflicts with their own
// "no dangling nodes" rule — added `Cloud Firestore -> Python ML` (closing
// a triangle with the existing Firebase<->Python ML core edge) to fix
// that, exactly the kind of adjustment the brief explicitly permits
// ("the important part is not the exact edges").
//
// Structure: Flutter/Firebase/Python ML form the rigid 3-node core
// triangle. Three more triangular facets share an edge with the core or
// with each other — Flutter-Provider-Dart, Flutter-Firebase-Provider, and
// Firebase-Python-ML-Cloud-Firestore — plus one two-hop cross-brace
// (Flutter -> Local Auth -> Hive -> fed by Python ML) that anchors at
// BOTH ends rather than dead-ending, satisfying "cross-bracing" and "no
// isolated branches" simultaneously. Every node has >= 2 connections
// (verified programmatically), zero edge crossings (verified via segment-
// intersection check on these exact coordinates), zero cycles, single
// connected component. Bounding box is compact/near-square (~1.15 x 1.05
// normalized units) rather than the previous landscape or portrait
// layouts — deliberately gem-like rather than elongated.
//
// Hierarchy: Flutter alone is `primary` tier (largest/brightest, the
// existing isRoot sparkle treatment). Firebase and Python ML are
// `secondary`. Every other node is `supporting` — this is the data-only
// way "Flutter should read as clearly most important, Firebase/Python ML
// as clear seconds" is satisfied without any renderer change, reusing
// ConstellationStar.tsx's existing tier-driven size/glow exactly as
// before.
//
// Colors/tags/roles/descriptions are unchanged from the prior 8-node
// pass (Dart's revived from the very first 20-node lattice, byte-
// identical to that round). Node set: Sensors Plus dropped, Dart restored
// — this exact 8 (Flutter, Dart, Provider, Hive, Firebase, Cloud
// Firestore, Python ML, Local Auth) per explicit instruction.
const RAKSHACHAKRA_MANIFEST_YAML = `{
  "project": "Rakshachakra",
  "description": "The core technologies that define Rakshachakra's architecture — a curated overview, not an exhaustive dependency list (see rakshachakra.md for the full feature/package inventory).",
  "mobileApp": [
    {
      "technology": "Flutter",
      "role": "Application Framework",
      "description": "Cross-platform mobile framework powering the entire client application.",
      "tags": ["Core"],
      "importance": "primary",
      "position": { "x": 0.15, "y": 0.35 },
      "color": "#3B82F6",
      "connectsTo": ["Firebase", "Python ML", "Provider", "Local Auth"]
    },
    {
      "technology": "Dart",
      "role": "Programming Language",
      "description": "Primary language for the Flutter application and its business logic.",
      "tags": ["Core"],
      "importance": "supporting",
      "position": { "x": -0.25, "y": -0.10 },
      "color": "#60A5FA",
      "connectsTo": ["Provider", "Flutter"]
    },
    {
      "technology": "Provider",
      "role": "State Management",
      "description": "App-wide state management across the Flutter widget tree.",
      "tags": ["Core"],
      "importance": "supporting",
      "position": { "x": 0.10, "y": 0.05 },
      "color": "#38BDF8",
      "connectsTo": ["Firebase"]
    }
  ],
  "localData": [
    {
      "technology": "Hive",
      "role": "Local Database",
      "description": "Lightweight local key-value/object storage for on-device data.",
      "tags": ["Local Storage"],
      "importance": "supporting",
      "position": { "x": 0.15, "y": 0.95 },
      "color": "#5EEAD4"
    }
  ],
  "authentication": [
    {
      "technology": "Local Auth",
      "role": "Biometric Authentication",
      "description": "Device-level biometric and local authentication checks.",
      "tags": ["Biometric", "Local"],
      "importance": "supporting",
      "position": { "x": -0.10, "y": 0.70 },
      "color": "#2DD4BF",
      "connectsTo": ["Hive"]
    }
  ],
  "cloudAndData": [
    {
      "technology": "Firebase",
      "role": "Cloud Platform",
      "description": "Core Firebase integration underpinning the app's cloud services.",
      "tags": ["Managed Service"],
      "importance": "secondary",
      "position": { "x": 0.55, "y": 0.15 },
      "color": "#F97316",
      "connectsTo": ["Python ML", "Cloud Firestore"]
    },
    {
      "technology": "Cloud Firestore",
      "role": "Cloud Database",
      "description": "Cloud data storage and sync for user profile and session data.",
      "tags": ["Database", "Sync"],
      "importance": "supporting",
      "position": { "x": 0.90, "y": 0.35 },
      "color": "#FBBF24",
      "connectsTo": ["Python ML"]
    }
  ],
  "intelligenceLayer": [
    {
      "technology": "Python ML",
      "role": "Behavioral Risk Inference",
      "description": "Python service serving real-time behavioral risk inference and periodic model retraining.",
      "tags": ["Python", "Inference"],
      "importance": "secondary",
      "position": { "x": 0.50, "y": 0.60 },
      "color": "#A855F7",
      "connectsTo": ["Hive"]
    }
  ]
}
`;

// Sprint 11 (Knowledge Graph): consolidates the old skills/frontend.yaml +
// skills/backend.yaml into one skills.graph file, matching the
// 6-category scheme (Programming Languages, Frontend, Backend, Artificial
// Intelligence, Cloud, Developer Tools) and the richer GraphNode schema
// (src/graph/types.ts). Real YAML, not JSON-in-yaml — parsed by
// loadGraphModel() (src/graph/loader.ts) via the `yaml` package, an
// explicit, approved exception to the JSON-flow-style trick
// constellation.explore uses, since this file is meant to read as
// genuinely developer-authored.
//
// Content grounding (per explicit instruction: do not fabricate years,
// proficiency percentages, project usage, or certifications):
// - Every node here appears in the 2026 résumé, either in TECHNICAL SKILLS
//   or in a project's own technology line. Technologies that appeared only
//   in an earlier résumé were removed rather than kept for breadth — see
//   the deletion list below.
// - `projects`/`notes` cite only what the résumé itself documents. A node
//   the résumé lists but never attributes to a project (SQL, Prompt
//   Engineering, Vector DBs, Hugging Face, Open-Source LLMs, JIRA, Postman,
//   Git, GitHub) carries a factual description of the technology and no
//   personal claim.
// - `proficiency`/`proficiencyPercent`/`years` are left unset on every
//   node — nothing in the résumé states per-skill duration or a percentage.
// - `isCore` is the graph's only weighting axis, so it is spent on the
//   technologies that define the current positioning (backend services in
//   Node/Express, the languages they are written in, the React/Next stack
//   the projects are built on, and RAG) rather than on everything credible.
//   C++ is deliberately not core: it is real (TCS CodeVita, top 5%) but it
//   is not what this portfolio is arguing.
//
// Removed in the 2026 pass, each because the current résumé no longer
// mentions it anywhere: OpenAI API, LangChain (the LLM stack the previous
// American Chase story was built on), Go, Vue, Tailwind CSS, Framer Motion,
// shadcn/ui + Radix UI, HTML/CSS, Zustand, PostgreSQL, MongoDB, Redis,
// GraphQL, Microservices, Convex, Vercel, Monaco Editor.
const SKILLS_GRAPH_YAML = `title: Skills
description: An interactive map of the languages, frameworks, and tools I build with.

categories:
  - key: languages
    title: Programming Languages
    nodes:
      - id: javascript
        name: JavaScript
        category: languages
        isCore: true
        description: The language of the web, and the runtime language of the Node.js backends and React frontends in this workspace.
        documentation: https://developer.mozilla.org/docs/Web/JavaScript
        relatedNodes: [nodejs, typescript, react]
        tags: [web, backend, frontend]

      - id: typescript
        name: TypeScript
        category: languages
        isCore: true
        description: A typed superset of JavaScript that surfaces contract errors at compile time rather than in production.
        documentation: https://www.typescriptlang.org/docs
        projects: [Cortexa Remote Interview Platform, Portfolio Workspace (this site)]
        relatedNodes: [javascript, react, nextjs]
        tags: [typed, web]

      - id: python
        name: Python
        category: languages
        isCore: true
        description: A dynamically-typed, readable general-purpose language widely used for scripting, data, and machine learning.
        documentation: https://docs.python.org/3
        projects: [RakshaChakra - Secure Mobile Banking]
        notes: Built the fraud-detection backend for RakshaChakra, evaluated at 92% accuracy against expected behaviour.
        relatedNodes: [machine-learning, aws]
        tags: [scripting, ml, backend]

      - id: cpp
        name: C++
        category: languages
        description: A high-performance, compiled systems language with manual memory control and object-oriented features.
        documentation: https://en.cppreference.com
        notes: Used for competitive algorithmic work — TCS CodeVita 2025, top 5% (4,811 / 100,000).
        tags: [systems, compiled, algorithms]

      - id: sql
        name: SQL
        category: languages
        description: The declarative query language for relational data — joins, aggregates, and set operations over tables.
        documentation: https://www.postgresql.org/docs/current/sql.html
        tags: [data, query]

  - key: backend
    title: Backend
    nodes:
      - id: nodejs
        name: Node.js
        category: backend
        isCore: true
        description: A JavaScript runtime for building server-side applications outside the browser.
        documentation: https://nodejs.org/docs
        projects: [American Chase, Cortexa Remote Interview Platform]
        notes: Resolved 5+ backend issues in a Node.js/Express application at American Chase by debugging APIs and improving application logging.
        relatedNodes: [expressjs, javascript, rest-apis]
        tags: [runtime, backend]

      - id: expressjs
        name: Express.js
        category: backend
        isCore: true
        description: A minimal, unopinionated web framework for Node.js.
        documentation: https://expressjs.com
        projects: [American Chase]
        notes: The application framework behind the serverless backend debugged at American Chase.
        relatedNodes: [nodejs, rest-apis]
        tags: [framework, backend]

      - id: rest-apis
        name: REST APIs
        category: backend
        isCore: true
        description: An architectural style for designing networked applications around stateless, resource-oriented HTTP endpoints.
        documentation: https://developer.mozilla.org/docs/Web/HTTP
        projects: [American Chase, Cortexa Remote Interview Platform]
        relatedNodes: [nodejs, expressjs]
        tags: [http, api, backend]

  - key: frontend
    title: Frontend
    nodes:
      - id: react
        name: React
        category: frontend
        isCore: true
        description: A component-based UI library for building interfaces from composable, stateful pieces.
        documentation: https://react.dev
        projects: [Cortexa Remote Interview Platform, Portfolio Workspace (this site)]
        relatedNodes: [nextjs, javascript, typescript]
        tags: [ui, components]

      - id: nextjs
        name: Next.js
        category: frontend
        isCore: true
        description: A React framework with file-based routing, server rendering, and API routes in one application.
        documentation: https://nextjs.org/docs
        projects: [Cortexa Remote Interview Platform]
        notes: The application framework behind Cortexa's real-time video interviewing platform.
        relatedNodes: [react, typescript]
        tags: [framework, ssr, fullstack]

      - id: flutter
        name: Flutter
        category: frontend
        description: A cross-platform UI toolkit for building natively compiled mobile applications from a single codebase.
        documentation: https://docs.flutter.dev
        projects: [RakshaChakra - Secure Mobile Banking]
        relatedNodes: [machine-learning]
        tags: [mobile, cross-platform]

  - key: ai
    title: Artificial Intelligence
    nodes:
      - id: rag
        name: RAG
        category: ai
        isCore: true
        description: Retrieval-Augmented Generation — grounding a language model's answers in documents retrieved at query time rather than in its weights alone.
        documentation: https://www.pinecone.io/learn/retrieval-augmented-generation
        relatedNodes: [vector-dbs, open-source-llms, prompt-engineering]
        tags: [llm, retrieval]

      - id: vector-dbs
        name: Vector DBs
        category: ai
        description: Databases that index high-dimensional embeddings so semantically similar content can be retrieved by nearest-neighbour search.
        documentation: https://www.pinecone.io/learn/vector-database
        relatedNodes: [rag]
        tags: [embeddings, retrieval]

      - id: prompt-engineering
        name: Prompt Engineering
        category: ai
        description: Structuring instructions, context, and examples so a language model produces reliable, checkable output.
        documentation: https://platform.openai.com/docs/guides/prompt-engineering
        relatedNodes: [rag, open-source-llms]
        tags: [llm, technique]

      - id: open-source-llms
        name: Open-Source LLMs
        category: ai
        description: Openly-licensed language models such as Llama and Mistral, run and adapted outside a hosted vendor API.
        documentation: https://huggingface.co/docs/transformers/index
        relatedNodes: [hugging-face, prompt-engineering]
        tags: [llm, llama, mistral]

      - id: hugging-face
        name: Hugging Face
        category: ai
        description: A hub and library ecosystem for sharing, loading, and running pretrained models and datasets.
        documentation: https://huggingface.co/docs
        relatedNodes: [open-source-llms, python]
        tags: [models, ecosystem]

      - id: machine-learning
        name: Machine Learning
        category: ai
        description: Fitting models to data to predict or classify, and evaluating them against expected behaviour rather than by inspection.
        documentation: https://scikit-learn.org/stable/user_guide.html
        projects: [RakshaChakra - Secure Mobile Banking]
        notes: Fraud-detection models for RakshaChakra, evaluated at 92% accuracy in identifying suspicious transactions.
        relatedNodes: [python, flutter]
        tags: [modelling, evaluation]

  - key: cloud
    title: Cloud
    nodes:
      - id: aws
        name: AWS
        category: cloud
        description: Amazon Web Services — compute, storage, and networking primitives for running applications in the cloud.
        documentation: https://docs.aws.amazon.com
        projects: [RakshaChakra - Secure Mobile Banking]
        notes: Ran RakshaChakra's behavioural analytics system on EC2.
        relatedNodes: [python]
        tags: [cloud, infrastructure]

  - key: devtools
    title: Developer Tools
    nodes:
      - id: git
        name: Git
        category: devtools
        description: A distributed version control system tracking history as a graph of immutable commits.
        documentation: https://git-scm.com/doc
        relatedNodes: [github]
        tags: [vcs]

      - id: github
        name: GitHub
        category: devtools
        description: A hosting platform for Git repositories, with pull requests, reviews, and CI automation.
        documentation: https://docs.github.com
        relatedNodes: [git]
        tags: [vcs, collaboration]

      - id: postman
        name: Postman
        category: devtools
        description: A client for exercising and inspecting HTTP APIs while building and debugging them.
        documentation: https://learning.postman.com/docs
        relatedNodes: [rest-apis]
        tags: [api, testing]

      - id: jira
        name: JIRA
        category: devtools
        description: An issue and sprint tracker for planning work and following it through to delivery.
        documentation: https://support.atlassian.com/jira-software-cloud
        tags: [planning, process]
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
      name: 'welcome.md',
      type: 'markdown',
      path: '/welcome.md',
      content: WELCOME_INTRO_CONTENT,
    } as VirtualFile,
    {
      id: 'startup-log',
      name: 'startup.log',
      type: 'log',
      path: '/startup.log',
      content: STARTUP_LOG_CONTENT,
    } as VirtualFile,
    {
      id: 'about',
      name: 'about',
      path: '/about',
      children: [
        {
          id: 'whoami',
          name: 'whoami.md',
          type: 'markdown',
          path: '/about/whoami.md',
          content: `# signature

\`\`\`identity-terminals
\`\`\`

\`\`\`about-activity-row
\`\`\`

\`\`\`contributions-terminal
\`\`\`
`,
        } as VirtualFile,
        {
          id: 'resume',
          name: 'hire_me.md',
          type: 'markdown',
          path: '/about/hire_me.md',
          content: HIRE_ME_REPORT,
        } as VirtualFile,
      ],
    } as VirtualFolder,
    {
      id: 'experience',
      name: 'experience',
      path: '/experience',
      children: [
        {
          id: 'american_chase',
          name: 'americanchase.yaml',
          type: 'yaml',
          path: '/experience/americanchase.yaml',
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
              name: 'constellation.explore',
              type: 'explore',
              path: '/projects/Cortexa/constellation.explore',
              content: CORTEXA_MANIFEST_YAML,
            } as VirtualFile,
          ],
        } as VirtualFolder,
        {
          id: 'rakshachakra',
          name: 'Rakshachakra',
          path: '/projects/Rakshachakra',
          children: [
            {
              id: 'rakshachakra_readme',
              name: 'rakshachakra.md',
              type: 'markdown',
              path: '/projects/Rakshachakra/rakshachakra.md',
              content: RAKSHACHAKRA_DOC_MARKDOWN,
            } as VirtualFile,
            {
              id: 'rakshachakra_arch',
              name: 'architecture.mmd',
              type: 'mermaid',
              path: '/projects/Rakshachakra/architecture.mmd',
              content: RAKSHACHAKRA_ARCHITECTURE_MERMAID,
            } as VirtualFile,
            {
              id: 'rakshachakra_manifest',
              name: 'constellation.explore',
              type: 'explore',
              path: '/projects/Rakshachakra/constellation.explore',
              content: RAKSHACHAKRA_MANIFEST_YAML,
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
          content: CONTACT_SH_CONTENT,
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
