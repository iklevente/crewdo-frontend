# Crewdo Frontend

Modern collaboration interface built with React 19, Rsbuild, Material UI, React Query, Zustand, and LiveKit client SDK. It pairs with the Crewdo backend for workspace management, messaging, calls, and notifications.

## Highlights

- **Workspaces and Projects**: Feature-rich views for projects, tasks, and comments with drag-and-drop, data grids, and search.
- **Realtime Presence**: Socket.IO client keeps presence indicators and typing states in sync.
- **Voice and Video**: LiveKit components deliver calls, screen share, and audio controls that match backend permissions.
- **State and Data**: Zustand stores user/session selections while React Query handles API caching and background refresh.
- **Design System**: Material UI theme with custom tokens, responsive layouts, and shared UI primitives.

## Prerequisites

- Node.js 20+
- npm 11+
- Crewdo backend running locally at `http://localhost:3000` (or alternate URL configured via environment)

## Environment Setup

1. Copy the template environment file.

```bash
cp .env.dist .env
```

1. Open `.env` and set the backend API origin.

```env
API_BASE_URL=http://localhost:3000/api
```

Change the value if your backend is reachable elsewhere (for example, through a tunnel or container network).

## Installation and Startup

1. Install dependencies.

```bash
npm install
```

1. Start the development server (defaults to `http://localhost:3001`).

```bash
npm run start
```

Use `npm run dev` as an alias. The command clears stale builds before launching Rsbuild for hot-module reload.

1. Build a production bundle when ready to deploy.

```bash
npm run build
```

1. Optionally lint and format before committing.

```bash
npm run lint
npm run prettier:fix
```

## Folder Structure

- `src/app` – Application shell, layout, routes, and providers.
- `src/features` – Domain modules (auth, channels, projects, users, workspaces, etc.).
- `src/components` – Shared UI components such as presence indicators and notification toasts.
- `src/services` – API client composition, LiveKit presence service, socket context wiring.
- `src/store` – Zustand stores for auth, presence, and workspace selection.
- `src/theme` – Material UI theme extension and tokens.
- `src/api` – Generated OpenAPI clients synchronized with the backend.
- `src/utils` – Reusable helpers and formatters.

## Working With the Backend

- Ensure the backend `.env` includes `CORS_ORIGIN=http://localhost:3001` or the hostname you serve the frontend from.
- Run the LiveKit and MSSQL Docker containers as described in the backend README to unlock calls and data persistence.
- Use `npm run copy-api-client` after backend schema updates to refresh generated API clients.

## Testing and Quality

- `npm run lint` – Type-check, ESLint, and Prettier validation in a single command.
- `npm run lint:fix` – ESLint auto-fixes plus Prettier formatting.
- `npm run tsr:check` – Detect unused exports with Tree-shaker.
