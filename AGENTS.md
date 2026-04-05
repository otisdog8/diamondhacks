<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# inbtwn — Agent Guide

## Project overview

inbtwn is a Next.js 16 App Router application that uses Browser Use (AI browser automation) to scrape Canvas LMS class schedules and push them to Google Calendar. It has a swappable data layer (JSON files for dev, MongoDB for production), hand-rolled JWT authentication, and a growing set of productivity extensions (todos, focus timer, travel reminders, study materials, lecture AI).

## Repository map

```
src/
├── app/                              # Pages and API routes (Next.js App Router)
│   ├── api/auth/{register,login,logout,me}/route.ts   # Auth endpoints
│   ├── api/classes/route.ts                            # GET list, POST create
│   ├── api/classes/[classId]/route.ts                  # GET/PATCH/DELETE single class
│   ├── api/classes/[classId]/toggle/route.ts           # PATCH toggle enabled
│   ├── api/canvas/{connect,status,profile}/route.ts    # Browser Use Canvas integration
│   ├── api/calendar/{connect,export,callback,calendars,events}/route.ts  # Calendar (BU + OAuth2)
│   ├── api/todos/route.ts                              # GET/POST todos
│   ├── api/todos/[todoId]/route.ts                     # PATCH/DELETE todo
│   ├── api/todos/sync/route.ts                         # Sync todos from Canvas
│   ├── api/reminders/route.ts                          # GET/POST reminders
│   ├── api/reminders/[reminderId]/route.ts             # PATCH/DELETE reminder
│   ├── api/reminders/[reminderId]/send/route.ts        # Send reminder
│   ├── api/lectures/route.ts                           # GET/POST lectures
│   ├── api/lectures/[lectureId]/route.ts               # GET/DELETE lecture
│   ├── api/lectures/[lectureId]/process/route.ts       # Process lecture video
│   ├── api/study/[classId]/route.ts                    # GET/POST study materials
│   ├── api/travel/route.ts                             # GET/POST travel estimates
│   ├── dashboard/{layout,page}.tsx                     # Main dashboard with Today/Classes tabs
│   ├── canvas/page.tsx                                 # Canvas import wizard
│   ├── calendar/page.tsx                               # Calendar export page
│   ├── schedule/{layout,page}.tsx                      # Full calendar schedule view
│   ├── focus/page.tsx                                  # Fullscreen focus timer
│   ├── login/page.tsx                                  # Login form
│   ├── register/page.tsx                               # Registration form
│   ├── layout.tsx                                      # Root layout with AuthProvider
│   └── page.tsx                                        # Landing page
├── lib/
│   ├── db/
│   │   ├── types.ts              # ★ CRITICAL: All interfaces (IUser, IClassInfo, IBrowserProfile, IScrapeSession, IRepository)
│   │   ├── index.ts              # Exports `repo` — the active IRepository implementation
│   │   ├── json/repository.ts    # JSON file backend (DEV_MODE=json)
│   │   ├── json/store.ts         # Low-level JSON file read/write
│   │   ├── mongo/repository.ts   # MongoDB backend (DEV_MODE=mongo)
│   │   ├── mongo/connection.ts   # Mongoose connection singleton
│   │   └── mongo/models/         # Mongoose schemas: User.ts, ClassInfo.ts, BrowserProfile.ts
│   ├── auth/
│   │   ├── password.ts           # hashPassword(), verifyPassword() using bcrypt
│   │   ├── jwt.ts                # signToken(), verifyToken() using jsonwebtoken
│   │   └── middleware.ts         # withAuth() — wraps route handlers, passes (req, user, { params })
│   ├── browser-use/
│   │   ├── client.ts             # getClient() — BrowserUse SDK v3 singleton
│   │   ├── canvas-scraper.ts     # Canvas import + external crawl lifecycle (7 exports)
│   │   ├── calendar-pusher.ts    # startGoogleCalendarSession(), exportToGoogleCalendar()
│   │   └── schemas.ts            # Zod schemas for scrape output parsing + dayStringToNumber()
│   ├── google/
│   │   └── calendar.ts           # OAuth2-based Google Calendar API (create events, list calendars)
│   ├── extensions/
│   │   ├── types.ts              # ITodoProvider, ITravelTimeProvider, IReminderProvider, IStudyMaterialProvider, ILectureProvider
│   │   ├── todo-provider.ts      # Canvas assignment sync via Browser Use
│   │   ├── travel-provider.ts    # Travel time estimates
│   │   ├── reminder-provider.ts  # Reminder scheduling
│   │   ├── lecture-provider.ts   # Lecture video analysis via Anthropic API
│   │   └── study-provider.ts     # Study material generation via Anthropic API
│   └── quarter-dates.ts          # UCSD quarter date utilities
├── components/
│   ├── ui/{Button,Input,Card,Toggle,Toast,ConfirmDialog}.tsx  # Reusable UI primitives
│   ├── auth/{LoginForm,RegisterForm}.tsx                       # Auth form components
│   ├── dashboard/
│   │   ├── ClassCard.tsx          # Single class card with toggle, delete, conflict indicator
│   │   ├── ClassList.tsx          # Class list with search, filter, week view, conflict detection
│   │   ├── CrawlExternalUrl.tsx   # External URL crawl from dashboard
│   │   ├── WeekView.tsx           # Weekly schedule grid view
│   │   ├── EmptyState.tsx         # Rich onboarding state when no classes imported
│   │   └── TodayCard.tsx          # Today's schedule card with next class, leave reminder
│   ├── canvas/{BrowserFrame,ConnectionWizard}.tsx  # Canvas import UI
│   ├── calendar/CalendarExport.tsx                 # Calendar export UI
│   ├── calendar-view/
│   │   ├── CalendarLayout.tsx     # Main calendar wrapper (converts classes → events)
│   │   ├── Calendar{Month,Week,Day}View.tsx  # Three calendar view modes
│   │   ├── CalendarTopBar.tsx     # Navigation, view switcher, add event button
│   │   ├── CalendarSidebar.tsx    # Mini calendar, upcoming events, type filters
│   │   ├── CalendarEventCard.tsx  # Single event display
│   │   ├── MiniCalendar.tsx       # Small month calendar for sidebar
│   │   ├── TimeSelectionModal.tsx # Add custom events (study blocks, reminders, etc.)
│   │   ├── UpcomingEventsList.tsx # Sidebar upcoming events list
│   │   └── types.ts              # CalendarEvent, EventType, CalendarView types
│   ├── productivity/
│   │   ├── SmartDayView.tsx       # Today tab — shows today's classes or next class day preview
│   │   ├── RightNowPanel.tsx      # "Right now" status — current/next class, free time suggestions
│   │   ├── DailyTimeline.tsx      # Visual timeline of today's schedule with gaps
│   │   ├── LeaveReminder.tsx      # Travel time countdown to next class
│   │   ├── FocusTimer.tsx         # Pomodoro-style focus timer (inline or fullscreen)
│   │   ├── TinyTasks.tsx          # Quick local task list
│   │   └── types.ts              # ClassEvent type, getTodaysEvents(), getNextClassDay()
│   └── extensions/
│       ├── TodoPanel.tsx          # Canvas assignment todos UI
│       ├── ReminderSetup.tsx      # Reminder configuration UI
│       ├── TravelWarnings.tsx     # Travel time warnings UI
│       ├── LecturePanel.tsx       # Lecture video analysis UI
│       ├── StudyPanel.tsx         # Study material generation UI
│       └── index.ts              # Extension component exports
├── hooks/
│   ├── useClasses.ts             # Fetch + mutate class list (toggle, delete, enableAll, disableAll)
│   ├── useBrowserSession.ts      # Manage Browser Use session lifecycle
│   └── useGoogleCalendarEvents.ts # Fetch Google Calendar events via OAuth2
├── context/AuthContext.tsx         # Auth state provider + useAuth() hook
└── middleware.ts                   # Route protection redirects
```

## Data flow

### Authentication
1. User submits credentials → `POST /api/auth/{login,register}`
2. Server sets JWT in httpOnly cookie `token` (24h expiry)
3. Protected routes use `withAuth()` which reads cookie, verifies JWT, loads user from repo
4. Frontend uses `useAuth()` hook from `AuthContext` for login state

### Canvas import flow (lifecycle)
```
connecting → awaiting_login → scraping → review → completed
                                  ↓          ↗
                             needs_login → scraping (resume)
```

1. `POST /api/canvas/connect` → reuses existing active session or creates Browser Use profile + session → returns `liveUrl`
2. Agent navigates to Canvas (status: `connecting`). Frontend polls `GET /api/canvas/status` for progress.
3. Agent reaches login page → status becomes `awaiting_login`. User sees iframe.
4. User logs into Canvas through the iframe (human-in-the-loop)
5. User clicks "I'm logged in" → `POST /api/canvas/status` `{action: "start"}` triggers `runCanvasScrape()`
6. AI agent navigates Canvas courses, clicks external links from within Canvas (SSO passthrough), extracts structured data. Steps stream to frontend via polling.
7. If agent hits an external login wall → status: `needs_login`. User logs in, clicks "Continue" → `{action: "resume"}`.
8. Scrape finishes → status: `review`. User sees results summary, raw agent output, and can:
   - **Confirm** (`{action: "confirm"}`) → saves cookies, marks `completed`
   - **Search Harder** (`{action: "deeper"}`) → sends deeper prompt to same session
   - **Discard** (`DELETE /api/canvas/connect`) → kills session, resets
9. Session stopped only on confirm/discard to persist profile cookies for future use

### External URL crawl (from dashboard)
Bypasses Canvas entirely — creates a fresh BU session and goes straight to the target URL.

1. `POST /api/canvas/connect` `{action: "crawl", externalUrl: "..."}` → discards any active session, creates new one, starts crawl
2. `CrawlExternalUrl` component on the dashboard polls progress inline
3. Same review/confirm/discard flow as Canvas scrape
4. If the site needs login, agent pauses → user logs in via iframe → resumes

**Key prompt rules for the scrape agent:**
- Must CLICK link elements on Canvas pages, not navigate to URLs directly (SSO passthrough)
- Must return raw JSON as output, not save to workspace files
- Must STOP if it encounters a login page and return what it has so far

### Calendar export flow
Two paths depending on configuration:

**Path A — Google OAuth2** (when `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` are set):
1. `POST /api/calendar/connect` → returns Google OAuth2 authorization URL
2. User authorizes → callback at `/api/calendar/callback` saves refresh token
3. `POST /api/calendar/export` → creates recurring events via Google Calendar API directly
4. `GET /api/calendar/calendars` → lists user's calendars
5. `GET /api/calendar/events` → fetches existing events

**Path B — Browser Use** (fallback):
1. `POST /api/calendar/connect` → creates Browser Use session for Google
2. User logs into Google through iframe
3. `POST /api/calendar/export` → AI agent creates events via browser automation

## Key patterns

### Protected API route
```typescript
import { withAuth } from "@/lib/auth/middleware";
import { repo } from "@/lib/db";

export const GET = withAuth(async (_req, user) => {
  const data = await repo.findClassesByUserId(user.id);
  return Response.json({ data });
});
```

### Protected API route with dynamic params
```typescript
export const GET = withAuth(async (_req, user, { params }) => {
  const { classId } = await params;
  const cls = await repo.findClassById(classId);
  // ...
});
```

### Browser Use SDK (v3)
```typescript
import { getClient } from "@/lib/browser-use/client";

const client = getClient(); // BrowserUse instance from browser-use-sdk/v3

// Create a session (returns immediately with liveUrl)
const session = await client.sessions.create({ profileId: "..." });
// session.liveUrl — embed in iframe for human-in-the-loop

// Run a task in the session — await resolves when the agent finishes
const result = await client.run("Extract data from this page", {
  sessionId: session.id,
  model: "bu-max",     // bu-mini (cheap), bu-max (default), bu-ultra (best)
  keepAlive: true,
});
console.log(result.output); // string output from the agent

// Stop session to persist profile cookies
await client.sessions.stop(session.id);
```

**SDK notes**: Import from `browser-use-sdk/v3` (not the default export which is v2). Pinned to 3.4.0 (3.4.1 ships without dist). Model tiers: `bu-mini`, `bu-max`, `bu-ultra` — do NOT use Anthropic/OpenAI model IDs.

### Adding to the data layer
1. Define interface in `src/lib/db/types.ts`
2. Add methods to `IRepository`
3. Implement in both `json/repository.ts` and `mongo/repository.ts`
4. Add Mongoose model in `mongo/models/`

## Environment

- `DEV_MODE=json` — JSON file storage in `data/`, no external deps needed
- `DEV_MODE=mongo` — MongoDB via Mongoose, requires `MONGODB_URI`
- `BROWSER_USE_API_KEY` — Required for Canvas/Calendar browser automation
- `JWT_SECRET` — Required for auth token signing
- `NEXT_PUBLIC_APP_URL` — App URL (default `http://localhost:3000`)
- `ANTHROPIC_API_KEY` — Used by lecture and study material providers
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Optional: enables OAuth2 Google Calendar (falls back to Browser Use)
- `GOOGLE_MAPS_API_KEY` — Optional: travel time estimates

## Known limitations

- `browser-use-sdk` is pinned to **3.4.0** (3.4.1 has no dist files). Always import from `browser-use-sdk/v3`. Use `getClient()` from `src/lib/browser-use/client.ts`.
- Next.js 16 shows a deprecation warning for `middleware.ts` (recommends `proxy`). It still works.
- Zod v4: import as `import { z } from "zod/v4"`.
- Browser Use sessions timeout after 15 minutes of inactivity (4 hours max).
- JSON dev mode has no file locking — avoid concurrent writes in testing.
- Extension providers (`todo-provider`, `study-provider`, `lecture-provider`, `reminder-provider`, `travel-provider`) use in-memory storage — data does not persist across restarts in dev mode.

## Extension features

These interfaces are defined in `src/lib/extensions/types.ts` and have implementations + API routes + UI components:

| Feature | Provider | API Routes | UI Component |
|---------|----------|------------|--------------|
| Todos | `todo-provider.ts` | `/api/todos`, `/api/todos/[todoId]`, `/api/todos/sync` | `TodoPanel.tsx` |
| Travel time | `travel-provider.ts` | `/api/travel` | `TravelWarnings.tsx` |
| Reminders | `reminder-provider.ts` | `/api/reminders`, `/api/reminders/[reminderId]`, `/api/reminders/[reminderId]/send` | `ReminderSetup.tsx` |
| Study materials | `study-provider.ts` | `/api/study/[classId]` | `StudyPanel.tsx` |
| Lecture AI | `lecture-provider.ts` | `/api/lectures`, `/api/lectures/[lectureId]`, `/api/lectures/[lectureId]/process` | `LecturePanel.tsx` |
