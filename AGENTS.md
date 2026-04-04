<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# CanvasCal — Agent Guide

## Project overview

CanvasCal is a Next.js 16 App Router application that uses Browser Use (AI browser automation) to scrape Canvas LMS class schedules and push them to Google Calendar. It has a swappable data layer (JSON files for dev, MongoDB for production) and hand-rolled JWT authentication.

## Repository map

```
src/
├── app/                              # Pages and API routes (Next.js App Router)
│   ├── api/auth/{register,login,logout,me}/route.ts   # Auth endpoints
│   ├── api/classes/route.ts                            # GET list, POST create
│   ├── api/classes/[classId]/route.ts                  # GET/PATCH/DELETE single class
│   ├── api/classes/[classId]/toggle/route.ts           # PATCH toggle enabled
│   ├── api/canvas/{connect,status,profile}/route.ts    # Browser Use Canvas integration
│   ├── api/calendar/{connect,export}/route.ts          # Browser Use Google Calendar
│   ├── dashboard/{layout,page}.tsx                     # Main authenticated view
│   ├── canvas/page.tsx                                 # Canvas import wizard
│   ├── calendar/page.tsx                               # Calendar export page
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
│   │   └── middleware.ts         # withAuth() — wraps route handlers with auth check
│   ├── browser-use/
│   │   ├── client.ts             # browserUseApi — REST client for Browser Use Cloud API
│   │   ├── canvas-scraper.ts     # startCanvasSession(), runCanvasScrape()
│   │   ├── calendar-pusher.ts    # startGoogleCalendarSession(), exportToGoogleCalendar()
│   │   └── schemas.ts           # Zod schemas for scrape output parsing
│   └── extensions/types.ts       # Unimplemented interfaces: ITodoProvider, ITravelTimeProvider, IReminderProvider, IStudyMaterialProvider, ILectureProvider
├── components/
│   ├── ui/{Button,Input,Card,Toggle}.tsx               # Reusable UI primitives
│   ├── auth/{LoginForm,RegisterForm}.tsx                # Auth form components
│   ├── dashboard/{ClassCard,ClassList}.tsx              # Class display components
│   ├── canvas/{BrowserFrame,ConnectionWizard}.tsx       # Canvas import UI
│   └── calendar/CalendarExport.tsx                      # Calendar export UI
├── hooks/
│   ├── useClasses.ts             # Fetch + mutate class list
│   └── useBrowserSession.ts      # Manage Browser Use session lifecycle
├── context/AuthContext.tsx         # Auth state provider + useAuth() hook
└── middleware.ts                   # Route protection redirects
```

## Data flow

### Authentication
1. User submits credentials → `POST /api/auth/{login,register}`
2. Server sets JWT in httpOnly cookie `token` (24h expiry)
3. Protected routes use `withAuth()` which reads cookie, verifies JWT, loads user from repo
4. Frontend uses `useAuth()` hook from `AuthContext` for login state

### Canvas import flow
1. `POST /api/canvas/connect` → creates Browser Use profile + session → returns `liveUrl` (iframe URL)
2. User logs into Canvas through the iframe (human-in-the-loop)
3. User clicks "I'm logged in" → `POST /api/canvas/status` triggers `runCanvasScrape()`
4. AI agent navigates Canvas courses, follows external links, extracts structured data
5. Parsed courses saved as `IClassInfo` records via `repo.createClass()`/`repo.updateClass()`
6. Session stopped to persist profile cookies for future use

### Calendar export flow
1. `POST /api/calendar/connect` → similar profile + session setup for Google
2. User logs into Google through iframe
3. `POST /api/calendar/export` → fetches enabled classes → AI agent creates recurring calendar events

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

### Browser Use API call
```typescript
import { browserUseApi } from "@/lib/browser-use/client";

const session = await browserUseApi.sessions.create({ profileId: "..." });
const result = await browserUseApi.run("task description", {
  sessionId: session.id,
  model: "claude-sonnet-4-6",  // or "gemini-3-flash" for simple tasks
});
await browserUseApi.sessions.stop(session.id); // persist cookies
```

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

## Known limitations

- The `browser-use-sdk` npm package is installed but has no dist files. Use `browserUseApi` from `src/lib/browser-use/client.ts` instead.
- Next.js 16 shows a deprecation warning for `middleware.ts` (recommends `proxy`). It still works.
- Zod v4: import as `import { z } from "zod/v4"`.
- Browser Use sessions timeout after 15 minutes of inactivity (4 hours max).
- JSON dev mode has no file locking — avoid concurrent writes in testing.

## Extension points

These interfaces exist in `src/lib/extensions/types.ts` but are not yet implemented:

| Interface | Purpose | Would integrate with |
|-----------|---------|---------------------|
| `ITodoProvider` | Class-specific todo tracking | Canvas Assignments API or scraping |
| `ITravelTimeProvider` | Travel time between locations | Google Maps API |
| `IReminderProvider` | Email/SMS/push reminders | Twilio, SendGrid, or web push |
| `IStudyMaterialProvider` | Textbook + flashcard generation | Browser Use + LLM |
| `ILectureProvider` | Video analysis + flashcards | TwelveLabs API |
