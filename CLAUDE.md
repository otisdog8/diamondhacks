@AGENTS.md

# inbtwn — Project Context for Claude

## What this project is

A Next.js 16 app that imports Canvas LMS class schedules into Google Calendar using Browser Use (AI browser automation). Built for DiamondHacks 2026.

## Architecture decisions

- **Data layer abstraction**: All data access goes through the `IRepository` interface (`src/lib/db/types.ts`). There are two backends: JSON files (`DEV_MODE=json`) and MongoDB (`DEV_MODE=mongo`). Never access data directly — always use `repo` from `src/lib/db/index.ts`.
- **Auth**: Hand-rolled JWT + bcrypt. The `withAuth()` wrapper in `src/lib/auth/middleware.ts` is used by all protected API routes. Auth state is stored in an httpOnly cookie named `token`. The handler signature is `(req, user, context)` where context includes `params` for dynamic routes.
- **Browser Use**: We use the official SDK (`browser-use-sdk@3.4.0`) with the **v3 import** (`browser-use-sdk/v3`). The v3 API uses `POST /sessions` as the unified endpoint. Model tiers are `bu-mini`, `bu-max`, `bu-ultra`. Version 3.4.1 is broken (missing dist files) — pinned to 3.4.0.
- **Google Calendar**: Two export paths — (1) Google OAuth2 via `googleapis` if `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` are set (`src/lib/google/calendar.ts`), or (2) Browser Use automation as fallback (`src/lib/browser-use/calendar-pusher.ts`).
- **Frontend state**: React Context for auth (`src/context/AuthContext.tsx`), custom hooks for data fetching (`src/hooks/`). No external state management library.

## Key files to understand

- `src/lib/db/types.ts` — All data model interfaces and the `IRepository` interface. This is the shared contract.
- `src/lib/db/index.ts` — Exports `repo`, the active repository instance. Import from here, not from json/ or mongo/ directly.
- `src/lib/auth/middleware.ts` — `withAuth(handler)` pattern for protected API routes. Handler receives `(req, user, { params })`.
- `src/lib/browser-use/client.ts` — `getClient()` returns a `BrowserUse` instance (from `browser-use-sdk/v3`) with `.profiles`, `.sessions`, `.run()` methods.
- `src/lib/browser-use/canvas-scraper.ts` — `startCanvasSession()`, `runCanvasScrape()`, `resumeCanvasScrape()`, `confirmScrapeResults()`, `deeperScrape()`, `crawlExternalUrl()`, `startCrawlSession()` — the full Canvas import and external crawl lifecycle.
- `src/lib/browser-use/calendar-pusher.ts` — `startGoogleCalendarSession()` and `exportToGoogleCalendar()` — the Browser Use Google Calendar export flow.
- `src/lib/google/calendar.ts` — OAuth2-based Google Calendar integration (create events via API, list calendars).
- `src/lib/extensions/types.ts` — Interfaces for extension features (todos, travel time, reminders, study materials, lecture AI).
- `src/lib/quarter-dates.ts` — Quarter date utilities for UCSD academic calendar.

## Conventions

- API routes use the Next.js App Router pattern: `export const GET = withAuth(async (req, user, { params }) => { ... })`. Routes without dynamic segments can omit the third argument.
- Client components use `"use client"` directive. Server components are the default.
- All frontend data fetching goes through `/api/` routes — no direct database access from components.
- Tailwind CSS for styling. UI primitives are in `src/components/ui/`.
- Browser Use sessions use profiles to persist cookies. Call `sessions.stop()` to save profile state — but only after the user confirms results in the `review` stage, not mid-scrape.
- The Canvas scrape lifecycle is: `connecting → awaiting_login → scraping → review → completed`. The `review` stage keeps the session alive so the user can "search harder", crawl an external URL, or discard.
- External URL crawl from the dashboard bypasses Canvas entirely: `POST /api/canvas/connect` with `{action: "crawl", externalUrl}` creates a fresh session and crawls directly.
- The scrape agent must CLICK links on Canvas pages (not navigate to URLs directly) so SSO passthrough works for Piazza/Gradescope/etc.
- The agent's final output must be raw JSON in the response — not saved to workspace files.

## Common tasks

### Adding a new API route
1. Create `src/app/api/<path>/route.ts`
2. Use `withAuth()` wrapper for protected routes
3. Access data via `repo` from `@/lib/db`
4. For dynamic routes, use the third `{ params }` argument: `const { id } = await params;`

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

- The `browser-use-sdk` is pinned to **3.4.0** — version 3.4.1 ships without dist files. Always import from `browser-use-sdk/v3` (not the default export which is the v2 API). Use `getClient()` from `src/lib/browser-use/client.ts`.
- Next.js 16 deprecates the `middleware.ts` convention in favor of `proxy`. The current middleware still works but will show a warning.
- The `zod` package exports from `zod/v4` (Zod v4 style). Import as `import { z } from "zod/v4"`.
- When in JSON dev mode, `data/*.json` files are created automatically on first write. The `data/` directory is gitignored.
- Browser Use model tiers are `bu-mini`, `bu-max`, `bu-ultra` — do not use Anthropic or other model IDs in Browser Use `.run()` calls.
