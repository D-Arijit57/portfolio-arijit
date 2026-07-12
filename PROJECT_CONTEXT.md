# Project Context

## Vision
To build an interactive, highly realistic developer portfolio disguised as a Visual Studio Code environment. The application should provide visitors with an immersive experience, allowing them to explore the developer's background, projects, and skills through familiar IDE paradigms (file explorer, terminal, code editor, command palette).

## Engineering Philosophy
- **Realism**: The UI must closely mimic VS Code's aesthetic, layout, and interaction patterns (e.g., split panes, terminal execution, file tabs).
- **Performance**: The application must be fast and responsive. Interactions like opening files, typing in the terminal, or toggling panes should feel instantaneous.
- **Modularity**: Components should be strictly separated by their domain (Explorer, Editor, Terminal, etc.) to allow independent scaling and maintenance.
- **Robustness**: State must remain consistent across URL changes, browser navigation, and UI interactions.

## Architecture Goals
- Complete separation of the presentation layer from the data/content layer.
- Centralized state management driving the entire application.
- Seamless virtual routing without page reloads.
- Extensible design to easily transition from the current mock/static data architecture to a fully dynamic backend.

## Tech Stack
- **Frontend Framework**: React 18+ (via Vite)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Animations**: Motion (framer-motion)
- **Syntax Highlighting**: Shiki
- **Editor Core**: react-simple-code-editor
- **Icons**: lucide-react
- **Command Palette**: cmdk

## Design Constraints
- Single-page application (SPA) architecture.
- Maintain the "Professional Polish" VS Code dark theme (`#1e1e1e` background, specific VS Code accent colors).
- Ensure a single-view, single-screen structural layout (no traditional website scrolling; scroll inside panes only).
- Must feel like a desktop application running in the browser.

## Coding Standards
- Strict TypeScript enforcement (no `any` types where avoidable).
- Use functional components and React hooks exclusively.
- Centralize all shared types in `src/types/index.ts`.
- Use Tailwind utility classes directly in the JSX; avoid custom CSS unless absolutely necessary (e.g., custom scrollbars or complex pseudo-elements).

## Backend Philosophy
- **API-First**: The backend should serve as a headless API provider for the frontend.
- **Statelessness (Where Possible)**: The backend should ideally be stateless, or maintain user session state purely for terminal context if required.
- **Decoupled**: The frontend should not care how the backend resolves data (e.g., database vs. local files).

## Important Project Rules
- Do NOT use standard browser alerts, prompts, or confirm dialogs.
- Do NOT introduce traditional website navigation (e.g., navbar, footer). Rely on the VS Code Activity Bar and Explorer.
- The layout must remain 100vh / 100vw, with overflow handled within specific panes (Editor, Terminal, Explorer).

## Long-Term Roadmap
1. **Phase 1 (Complete)**: Static frontend mockup with virtual file system and Zustand state.
2. **Phase 2 (Upcoming)**: Backend integration to serve the virtual file system, process terminal commands dynamically, and fetch live stats.
3. **Phase 3**: Real-time integrations (GitHub, LeetCode) and dynamic content generation (e.g., an AI agent integrated into the terminal).
