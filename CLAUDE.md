@AGENTS.md

# CanvasCal — Project Context for Claude

## What this project is

A Next.js 16 app that imports Canvas LMS class schedules into Google Calendar using Browser Use (AI browser automation). Built for DiamondHacks 2026.

## Architecture decisions

- **Data layer abstraction**: All data access goes through the `IRepository` interface (`src/lib/db/types.ts`). There are two backends: JSON files (`DEV_MODE=json`) and MongoDB (`DEV_MODE=mongo`). Never access data directly — always use `repo` from `src/lib/db/index.ts`.
- **Auth**: Hand-rolled JWT + bcrypt. The `withAuth()` wrapper in `src/lib/auth/middleware.ts` is used by all protected API routes. Auth state is stored in an httpOnly cookie named `token`.
- **Browser Use**: We use the REST API directly (`src/lib/browser-use/client.ts`) because the npm SDK (`browser-use-sdk`) ships without dist files. The API base URL is `https://api.browser-use.com/v3`.
- **Frontend state**: React Context for auth (`src/context/AuthContext.tsx`), custom hooks for data fetching (`src/hooks/`). No external state management library.

## Key files to understand

- `src/lib/db/types.ts` — All data model interfaces and the `IRepository` interface. This is the shared contract.
- `src/lib/db/index.ts` — Exports `repo`, the active repository instance. Import from here, not from json/ or mongo/ directly.
- `src/lib/auth/middleware.ts` — `withAuth(handler)` pattern for protected API routes.
- `src/lib/browser-use/client.ts` — `browserUseApi` object with `.profiles`, `.sessions`, `.run()` methods.
- `src/lib/browser-use/canvas-scraper.ts` — `startCanvasSession()` and `runCanvasScrape()` — the core Canvas import flow.
- `src/lib/browser-use/calendar-pusher.ts` — `startGoogleCalendarSession()` and `exportToGoogleCalendar()` — the Google Calendar export flow.
- `src/lib/extensions/types.ts` — Interfaces for future features (todos, travel time, reminders, flashcards, lecture AI).

## Conventions

- API routes use the Next.js App Router pattern: `export const GET = withAuth(async (req, user) => { ... })`.
- Client components use `"use client"` directive. Server components are the default.
- All frontend data fetching goes through `/api/` routes — no direct database access from components.
- Tailwind CSS for styling. UI primitives are in `src/components/ui/`.
- Browser Use sessions use profiles to persist cookies. Always call `sessions.stop()` to save profile state.

## Common tasks

### Adding a new API route
1. Create `src/app/api/<path>/route.ts`
2. Use `withAuth()` wrapper for protected routes
3. Access data via `repo` from `@/lib/db`

### Adding a new data model
1. Add interface to `src/lib/db/types.ts`
2. Add methods to `IRepository` interface
3. Implement in both `src/lib/db/json/repository.ts` and `src/lib/db/mongo/repository.ts`
4. Add Mongoose model in `src/lib/db/mongo/models/`

### Adding an extension feature
1. Pick an interface from `src/lib/extensions/types.ts`
2. Create implementation file in `src/lib/extensions/`
3. Create API routes in `src/app/api/`
4. Create UI components and wire into dashboard

## Warnings

- The `browser-use-sdk` npm package is installed but **has no dist files** — do not import from it. Use `browserUseApi` from `src/lib/browser-use/client.ts` instead.
- Next.js 16 deprecates the `middleware.ts` convention in favor of `proxy`. The current middleware still works but will show a warning.
- The `zod` package exports from `zod/v4` (Zod v4 style). Import as `import { z } from "zod/v4"`.
- When in JSON dev mode, `data/*.json` files are created automatically on first write. The `data/` directory is gitignored.
