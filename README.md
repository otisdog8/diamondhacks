# inbtwn

Import your Canvas LMS class schedule to Google Calendar automatically using AI-powered browser automation.

Built for [DiamondHacks 2026](https://diamondhacks.acmucsd.com/) at UC San Diego.

## How it works

1. **Connect Canvas** — A Browser Use session opens your Canvas LMS in a cloud browser. You watch the AI navigate, then log in manually when the login page appears (human-in-the-loop).
2. **Import Classes** — An AI agent navigates your courses, clicks into external tools (Piazza, Gradescope) via Canvas SSO passthrough, and extracts structured schedule data. If it hits a login wall, it pauses for you to log in and then continues.
3. **Review & Confirm** — After scraping, you see a summary of what was found, the raw agent output, and can ask the agent to "search harder" before confirming. The browser session stays alive during review.
4. **Crawl External Sites** — From the dashboard, paste any class website URL (Piazza, instructor page, department site) and the AI crawls it directly for schedule info.
5. **Toggle & Manage** — Your dashboard shows all imported classes with full details. Toggle each class on or off for calendar export.
6. **Export to Google Calendar** — Another Browser Use session logs into Google Calendar and creates recurring events for your enabled classes.

## Quick start

```bash
# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env.local
# Edit .env.local — at minimum set BROWSER_USE_API_KEY for scraping

# Start dev server (uses local JSON files, no database needed)
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000), create an account, and start importing.

## Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DEV_MODE` | No | `json` | `json` for local file storage, `mongo` for MongoDB |
| `JWT_SECRET` | Yes | `dev-secret-change-me` | Secret for signing auth tokens |
| `BROWSER_USE_API_KEY` | For scraping | — | API key from [cloud.browser-use.com](https://cloud.browser-use.com/settings?tab=api-keys) |
| `MONGODB_URI` | If `DEV_MODE=mongo` | — | MongoDB connection string |
| `NEXT_PUBLIC_APP_URL` | No | `http://localhost:3000` | Public URL of the app |

## Development modes

### JSON mode (default)

No external services needed. User data, classes, and profiles are stored in `data/*.json` files at the project root. Good for frontend work and local development.

### MongoDB mode

Set `DEV_MODE=mongo` and provide `MONGODB_URI`. Same auth and data flows, backed by Mongoose models. Use this for production or when you need concurrent multi-user support.

## Project structure

```
src/
├── app/                          # Next.js App Router pages + API routes
│   ├── api/
│   │   ├── auth/                 # Register, login, logout, me
│   │   ├── classes/              # CRUD + toggle for class data
│   │   ├── canvas/               # Browser Use Canvas integration
│   │   └── calendar/             # Browser Use Google Calendar integration
│   ├── dashboard/                # Main class list view
│   ├── canvas/                   # Canvas connection wizard
│   ├── calendar/                 # Calendar export view
│   ├── login/ & register/        # Auth pages
│   └── page.tsx                  # Landing page
├── lib/
│   ├── db/                       # Data layer
│   │   ├── types.ts              # ★ Shared interfaces (IRepository, all models)
│   │   ├── index.ts              # Switches JSON/Mongo based on DEV_MODE
│   │   ├── json/                 # JSON file backend
│   │   └── mongo/                # MongoDB/Mongoose backend
│   ├── auth/                     # Password hashing, JWT, middleware
│   ├── browser-use/              # Browser Use SDK v3 client + task logic
│   └── extensions/               # Future feature interfaces
├── components/                   # React components (auth, dashboard, canvas, calendar, ui)
├── hooks/                        # useAuth, useClasses, useBrowserSession
├── context/                      # AuthContext provider
└── middleware.ts                  # Route protection redirects
```

## API reference

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | No | Create account. Body: `{username, password}` |
| POST | `/api/auth/login` | No | Login. Body: `{username, password}` |
| POST | `/api/auth/logout` | No | Clear session cookie |
| GET | `/api/auth/me` | Yes | Get current user `{user: {id, username}}` |

### Classes

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/classes` | Yes | List all classes for current user |
| POST | `/api/classes` | Yes | Create a class. Body: class fields |
| GET | `/api/classes/:id` | Yes | Get class detail |
| PATCH | `/api/classes/:id` | Yes | Update class fields |
| DELETE | `/api/classes/:id` | Yes | Delete class |
| PATCH | `/api/classes/:id/toggle` | Yes | Toggle class enabled/disabled |

### Canvas (Browser Use)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/canvas/connect` | Yes | Start or reuse Canvas session. Body: `{canvasUrl?}` or `{action: "crawl", externalUrl}` for direct crawl. Returns `{scrapeSessionId, liveUrl, sessionId, reused?}` |
| DELETE | `/api/canvas/connect` | Yes | Discard current Canvas session |
| GET | `/api/canvas/status?sessionId=` | Yes | Poll session status with live progress (`stepCount`, `lastStepSummary`, `rawOutput`) |
| POST | `/api/canvas/status` | Yes | Lifecycle actions. Body: `{scrapeSessionId, action, canvasUrl?}`. Actions: (none)=start scrape, `resume`=continue after login, `confirm`=finalize review, `deeper`=search harder, `crawl`=crawl external URL (requires `externalUrl`) |
| GET | `/api/canvas/profile` | Yes | Get stored Canvas browser profile |

### Calendar (Browser Use)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/calendar/connect` | Yes | Start Google Calendar session. Returns `{scrapeSessionId, liveUrl}` |
| POST | `/api/calendar/export` | Yes | Push enabled classes to calendar. Body: `{scrapeSessionId}` |

## Data model

**IClassInfo** — the core data object:

```typescript
{
  id: string;
  userId: string;
  canvasId: string;          // Canvas course ID
  name: string;              // "Software Engineering"
  code: string;              // "CSE 110"
  instructor: string;
  term: string;              // "Spring 2026"
  enabled: boolean;          // Toggle for calendar export
  schedule: [{
    dayOfWeek: number;       // 0=Sun ... 6=Sat
    startTime: string;       // "14:00"
    endTime: string;         // "15:20"
    location?: string;       // "WLH 2001"
    type: string;            // "lecture" | "discussion" | "lab" | ...
  }];
  rawData: {};               // Everything else the scraper found
  externalLinks: string[];   // Links to Piazza, Gradescope, etc.
  syllabusUrl?: string;
  description?: string;
}
```

## Extending the project

Extension interfaces are defined in `src/lib/extensions/types.ts`. Each is a TypeScript interface ready for implementation:

- **ITodoProvider** — Per-class todo lists sourced from Canvas assignments
- **ITravelTimeProvider** — Walking/biking time between class locations
- **IReminderProvider** — Email/SMS/push notifications before class
- **IStudyMaterialProvider** — Textbook finding + flashcard generation
- **ILectureProvider** — Video indexing, summarization, flashcards via TwelveLabs

To implement one: create a file in `src/lib/extensions/` that satisfies the interface, then wire it into the relevant API route.

## Team development

The project is structured for parallel work with minimal merge conflicts:

| Area | Key files | Description |
|------|-----------|-------------|
| Auth + Data | `lib/db/*`, `lib/auth/*`, `api/auth/*` | Data layer and authentication |
| Browser Use | `lib/browser-use/*`, `api/canvas/*`, `api/calendar/*` | Scraping and automation |
| Frontend | `components/*`, `hooks/*`, `context/*`, pages | UI components and pages |
| Classes API | `api/classes/*`, `lib/extensions/*` | Class CRUD and extensions |

Everyone codes against the shared `IRepository` interface in `src/lib/db/types.ts`.

## Tech stack

- **Next.js 16** (App Router, TypeScript, Tailwind CSS)
- **MongoDB** / Mongoose (production) or **JSON files** (development)
- **Browser Use** SDK v3 (`browser-use-sdk@3.4.0`) for AI browser automation
- **bcrypt** + **JWT** for authentication
- **Zod** for schema validation

## License

MIT
