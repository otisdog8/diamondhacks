import { getClient } from "./client";
import { dayStringToNumber } from "./schemas";
import type { ScrapedCourse } from "./schemas";
import { repo } from "@/lib/db";
import type { IUser, ClassSchedule } from "@/lib/db/types";
import { getQuarterDates } from "@/lib/quarter-dates";

/**
 * Step 1: Create a Browser Use session and return the liveUrl immediately.
 * A lightweight navigation task runs so the browser starts loading Canvas.
 */
export async function startCanvasSession(user: IUser, canvasUrl: string) {
  const client = getClient();

  let profile = await repo.findProfileByUserAndService(user.id, "canvas");

  if (!profile) {
    const buProfile = await client.profiles.create({ name: `canvas-${user.username}` });
    profile = await repo.createProfile({
      userId: user.id,
      profileId: buProfile.id,
      service: "canvas",
      label: `Canvas - ${user.username}`,
    });
    await repo.updateUser(user.id, { canvasProfileId: buProfile.id });
  }

  const session = await client.sessions.create({
    profileId: profile.profileId,
  });

  console.log("[canvas-scraper] Session created:", session.id, "liveUrl:", session.liveUrl);

  const scrapeSession = await repo.createScrapeSession({
    userId: user.id,
    sessionId: session.id,
    liveUrl: session.liveUrl ?? "",
    status: "connecting",
    service: "canvas",
  });

  // Navigate to Canvas in the background.
  // When the nav task finishes, the status API will detect BU idle → awaiting_login.
  void client.run(
    `Navigate to ${canvasUrl}. If there is a login page, stop and wait - the human user will log in manually through the browser.`,
    { sessionId: session.id, model: "bu-mini" }
  ).then(
    () => {
      // Nav task done — mark awaiting_login
      repo.updateScrapeSession(scrapeSession.id, {
        status: "awaiting_login",
        lastStepSummary: "Ready for login",
      }).catch(() => {});
    },
    (err: unknown) => {
      console.error("[canvas-scraper] Nav task error:", err);
      repo.updateScrapeSession(scrapeSession.id, {
        status: "awaiting_login",
        lastStepSummary: "Browser ready (navigation may have had an issue)",
      }).catch(() => {});
    }
  );

  return {
    scrapeSessionId: scrapeSession.id,
    liveUrl: session.liveUrl ?? "",
    sessionId: session.id,
  };
}

const SCRAPE_PROMPT = (canvasUrl: string) => `You are on Canvas LMS at ${canvasUrl}. The user has already logged in. Do the following exhaustively:

1. Go to the Dashboard or Courses page and find ALL current/active courses
2. For EACH course, navigate into it and extract:
   - Course name and course code (e.g. "CSE 110", "COGS 13" — the short department + number code, NOT the full name)
   - Instructor name, term/semester
   - Full schedule: days of week, start/end times, locations
   - Check the Syllabus page for schedule details, office hours, and any links
   - Check the Modules page for any external links or resources
   - Check the Home page for any additional info
3. Find the quarter/term start and end dates:
   - Check the Canvas calendar, academic calendar link, syllabus, or any "Important Dates" section
   - Extract the first day of instruction and last day of instruction for the current term
   - Return these as quarterStartDate and quarterEndDate in YYYY-MM-DD format
4. If a course is still missing concrete times, locations, or section info after checking Canvas and
   the course website/syllabus, try the UCSD Schedule of Classes:
   - Navigate to https://act.ucsd.edu/scheduleOfClasses/scheduleOfClassesStudent.htm
   - The page has a form with dropdown menus and text fields. You MUST interact with the form by
     CLICKING on fields and TYPING into them — do not try to manipulate the URL or use JavaScript.
   - Step by step:
     1. CLICK the "Subject Area" dropdown and select the department (e.g. "CSE").
     2. CLICK the "Course Number" text field and TYPE the number (e.g. "125").
     3. CLICK the "Quarter" dropdown and select the correct quarter (e.g. "SP26").
     4. CLICK the "Search" or "Submit" button to run the search.
   - Do NOT try to type into dropdowns — click them to open, then click the option.
   - Do NOT try to construct a URL with query parameters — always use the form UI.
   - Extract lecture, discussion, and lab section times, locations, and instructors from the results.
   - If you can't find the course after a couple of attempts, move on and return what you have.
5. Follow ALL external links you find (up to 2 clicks deep) to gather more info
   - Some classes host content on Piazza, Ed Discussion, Gradescope, personal websites, etc.
   - CRITICAL: You MUST actually CLICK links/buttons on the page rather than navigating to URLs directly.
     Canvas uses SSO passthrough — clicking a Piazza/Gradescope/Ed link FROM a Canvas page will
     automatically authenticate you. Navigating to the URL directly will NOT work and will show a login page.
     Always click the link element on the page, never use direct URL navigation for external tools.
   - Extract any schedule, office hours, or meeting info from these sites
6. OVER-DOCUMENT: capture everything you find, even if it seems minor

SCHEDULE ENTRY RULES — pay close attention to the "type" and "dayOfWeek" fields:
- "type" must be one of: "lecture", "discussion", "lab", "office_hours", "final", "midterm", "other"
- For office_hours entries, include a "host" field with the name of who is holding them (e.g. "TA Josh", "Prof. Rossano", "Instructor"). If the syllabus lists TA office hours separately from instructor OH, create separate entries for each with the correct host.
- Regular weekly classes (lectures, discussions, labs) should have a SPECIFIC single day like "Monday", "Tuesday", etc.
  If a class meets on multiple days (e.g. TuTh), create SEPARATE schedule entries for EACH day.
- Finals and midterms are ONE-TIME events — still include them but mark type as "final" or "midterm".
- "dayOfWeek" must be a single standard day name: "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", or "Sunday".
  Do NOT use compound values like "varies", "TuTh", "MWF", or "varies (TuTh or WF)". If the day varies or is unknown, OMIT that schedule entry entirely.
- "startTime" and "endTime" must be in 24-hour format like "14:00" or "09:00". Do NOT use "varies" — if the time is unknown, omit the entry.

IMPORTANT: If you encounter a login page on ANY site (including Canvas SSO), STOP immediately and return what you have so far as JSON. Do NOT try to log in yourself — the user will handle that.

CRITICAL: Your FINAL response must be ONLY the JSON object below — no other text, no file saving, no workspace operations. Just output the raw JSON directly as your response:
{ "courses": [{ "canvasId": "74024", "name": "Field Methods: Cognition in the Wild", "code": "COGS 13", "instructor": "Federico Rossano", "term": "Spring 2026", "quarterStartDate": "2026-03-30", "quarterEndDate": "2026-06-06", "schedule": [{"dayOfWeek": "Tuesday", "startTime": "12:30", "endTime": "13:50", "location": "PETER 108", "type": "lecture"}, {"dayOfWeek": "Thursday", "startTime": "12:30", "endTime": "13:50", "location": "PETER 108", "type": "lecture"}, {"dayOfWeek": "Wednesday", "startTime": "14:00", "endTime": "15:00", "location": "CSE 4258", "type": "office_hours", "host": "Prof. Rossano"}, {"dayOfWeek": "Friday", "startTime": "10:00", "endTime": "11:00", "location": "CSE 4110", "type": "office_hours", "host": "TA Josh"}, {"dayOfWeek": "Monday", "startTime": "08:00", "endTime": "10:59", "location": "PETER 108", "type": "final"}], "syllabusText": "...", "syllabusUrl": "https://...", "externalLinks": ["https://piazza.com/class/abc123"], "description": "...", "rawNotes": "everything else you found" }] }

Do NOT save to a file. Do NOT use workspace. Return the JSON directly in your output.`;

const DEEPER_PROMPT = (canvasUrl: string) => `You previously scraped Canvas at ${canvasUrl} but the user wants more thorough results. Search harder:

1. Go back to the Courses page and check ALL courses again — including past terms if visible
2. For each course, check EVERY tab: Home, Syllabus, Modules, Assignments, Grades, People, Files
3. Click into external tool links FROM WITHIN Canvas (Piazza, Gradescope, Ed Discussion, etc.)
   - CRITICAL: You MUST actually CLICK the link/button elements on the Canvas page — do NOT navigate
     to external URLs directly. Canvas SSO passthrough only works when you click from within Canvas.
     Direct URL navigation will hit a login wall.
   - Extract any additional schedule, section, or instructor info from these external tools
4. Look for meeting patterns in assignment due dates and discussion sections
5. Check the Canvas calendar view for any scheduled events
6. Look at announcement pages for schedule changes or room updates
7. If any courses are still missing concrete times, locations, or section info after all the above,
   try the UCSD Schedule of Classes:
   - Navigate to https://act.ucsd.edu/scheduleOfClasses/scheduleOfClassesStudent.htm
   - The page has a form with dropdown menus and text fields. You MUST interact with the form by
     CLICKING on fields and TYPING into them — do not try to manipulate the URL or use JavaScript.
   - Step by step:
     1. CLICK the "Subject Area" dropdown and select the department (e.g. "CSE").
     2. CLICK the "Course Number" text field and TYPE the number (e.g. "125").
     3. CLICK the "Quarter" dropdown and select the correct quarter (e.g. "SP26").
     4. CLICK the "Search" or "Submit" button to run the search.
   - Do NOT try to type into dropdowns — click them to open, then click the option.
   - Do NOT try to construct a URL with query parameters — always use the form UI.
   - Extract lecture, discussion, and lab section times, locations, and instructors.
   - If you can't find the course after a couple of attempts, move on and return what you have.

SCHEDULE ENTRY RULES:
- "type" must be one of: "lecture", "discussion", "lab", "office_hours", "final", "midterm", "other"
- For office_hours entries, include a "host" field with the name of who is holding them (e.g. "TA Josh", "Prof. Rossano"). Create separate entries for each person's office hours.
- Each schedule entry must have a SINGLE day name: "Monday", "Tuesday", etc. — NOT "TuTh", "MWF", or "varies".
  For multi-day classes, create separate entries per day.
- "startTime"/"endTime" must be 24h format like "14:00". Omit entries where times are unknown.
- "location" must use the SHORT campus building code + room number, e.g. "WLH 2001", "PETER 108", "CSE 4258", "CENTR 101", "FAH 1301". Do NOT use full addresses or full building names like "Warren Lecture Hall" — use "WLH" instead.
- Finals/midterms: include with type "final"/"midterm" — these are one-time events, not weekly.

Return ALL data as JSON in your output. Include everything you found previously plus new discoveries.
CRITICAL: Your FINAL response must be ONLY the JSON object — no file saving, no workspace. Format:
{ "courses": [{ "canvasId": "74024", "name": "Field Methods: Cognition in the Wild", "code": "COGS 13", "instructor": "...", "term": "Spring 2026", "quarterStartDate": "2026-03-30", "quarterEndDate": "2026-06-06", "schedule": [{"dayOfWeek": "Tuesday", "startTime": "12:30", "endTime": "13:50", "location": "PETER 108", "type": "lecture"}, {"dayOfWeek": "Wednesday", "startTime": "14:00", "endTime": "15:00", "location": "CSE 4258", "type": "office_hours", "host": "Prof. Rossano"}], "syllabusText": "...", "syllabusUrl": "https://...", "externalLinks": ["https://piazza.com/class/abc123"], "description": "...", "rawNotes": "everything else you found" }] }`;

const EXTERNAL_URL_PROMPT = (externalUrl: string) => `The user wants you to crawl an external class website to extract course information.

Navigate to: ${externalUrl}

Extract ALL information you can find about courses/classes on this site:
- Course names and course codes (e.g. "CSE 110", "COGS 13" — the short department + number, NOT the full name)
- Instructors
- Schedules: days, times, locations
- Syllabus content, office hours (include who is hosting each OH session)
- Any links to other resources
- Assignment info, section info
- ANYTHING that looks like it relates to a class

If the site requires login, STOP and return what the page shows — the user will log in manually.

SCHEDULE ENTRY RULES:
- "type" must be one of: "lecture", "discussion", "lab", "office_hours", "final", "midterm", "other"
- For office_hours entries, include a "host" field with the name of who is holding them (e.g. "TA Josh", "Prof. Rossano"). Create separate entries for each person's office hours.
- "dayOfWeek" must be a SINGLE standard day name: "Monday", "Tuesday", etc. — NOT "TuTh", "MWF", or "varies".
  If a class meets on multiple days, create SEPARATE entries for each day.
- "startTime"/"endTime" must be in 24-hour format like "14:00" or "09:00". Do NOT use "varies" — omit if unknown.
- "location" must use the SHORT campus building code + room number, e.g. "WLH 2001", "PETER 108", "CSE 4258". Do NOT use full addresses.
- Finals/midterms: include with type "final"/"midterm".

CRITICAL: Return ONLY a JSON object as your final output — no file saving, no workspace:
{ "courses": [{ "canvasId": "external", "name": "Field Methods: Cognition in the Wild", "code": "COGS 13", "instructor": "...", "term": "Spring 2026", "schedule": [{"dayOfWeek": "Tuesday", "startTime": "12:30", "endTime": "13:50", "location": "PETER 108", "type": "lecture"}, {"dayOfWeek": "Wednesday", "startTime": "14:00", "endTime": "15:00", "location": "CSE 4258", "type": "office_hours", "host": "Prof. Rossano"}], "syllabusText": "...", "syllabusUrl": "${externalUrl}", "externalLinks": ["https://piazza.com/class/abc123"], "description": "...", "rawNotes": "everything else you found" }] }`;

/**
 * Step 2: Scrape using the SAME session the user logged into.
 * No new session — we keep the live browser where the user is authenticated.
 * Profile cookies are saved only after scraping completes successfully.
 */
export async function runCanvasScrape(scrapeSessionId: string, canvasUrl: string) {
  const scrapeSession = await repo.findScrapeSession(scrapeSessionId);
  if (!scrapeSession) throw new Error("Scrape session not found");

  await repo.updateScrapeSession(scrapeSessionId, {
    status: "scraping",
    stepCount: 0,
    lastStepSummary: "Starting scrape...",
  });

  try {
    await runScrapeTask(scrapeSession.sessionId, scrapeSessionId, canvasUrl);
  } catch (error) {
    console.error("[canvas-scraper] Scrape error:", error);
    await repo.updateScrapeSession(scrapeSessionId, {
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Resume scraping after the user manually logged in on an external site.
 * Sends a continuation task to the SAME session.
 */
export async function resumeCanvasScrape(scrapeSessionId: string, canvasUrl: string) {
  const scrapeSession = await repo.findScrapeSession(scrapeSessionId);
  if (!scrapeSession) throw new Error("Scrape session not found");

  await repo.updateScrapeSession(scrapeSessionId, {
    status: "scraping",
    lastStepSummary: "Resuming after login...",
  });

  try {
    await runScrapeTask(scrapeSession.sessionId, scrapeSessionId, canvasUrl);
  } catch (error) {
    console.error("[canvas-scraper] Resume error:", error);
    await repo.updateScrapeSession(scrapeSessionId, {
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Confirm review results — stop the session, save cookies, mark completed.
 */
export async function confirmScrapeResults(scrapeSessionId: string) {
  const client = getClient();
  const scrapeSession = await repo.findScrapeSession(scrapeSessionId);
  if (!scrapeSession) throw new Error("Scrape session not found");

  // Stop session to persist cookies for future use
  try {
    await client.sessions.stop(scrapeSession.sessionId);
    console.log("[canvas-scraper] Session stopped, cookies saved to profile");
  } catch {
    console.warn("[canvas-scraper] Could not stop session");
  }

  await repo.updateScrapeSession(scrapeSessionId, {
    status: "completed",
    lastStepSummary: `Confirmed — ${scrapeSession.classesFound ?? 0} courses saved`,
  });
}

/**
 * "Search harder" — send another task to the same session telling the agent
 * to look more carefully, follow more links, check external sites via Canvas links.
 */
export async function deeperScrape(scrapeSessionId: string, canvasUrl: string) {
  const scrapeSession = await repo.findScrapeSession(scrapeSessionId);
  if (!scrapeSession) throw new Error("Scrape session not found");

  await repo.updateScrapeSession(scrapeSessionId, {
    status: "scraping",
    lastStepSummary: "Searching harder...",
  });

  try {
    await runScrapeTask(
      scrapeSession.sessionId,
      scrapeSessionId,
      canvasUrl,
      "deeper",
    );
  } catch (error) {
    console.error("[canvas-scraper] Deeper scrape error:", error);
    await repo.updateScrapeSession(scrapeSessionId, {
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Crawl an external URL to extract class info using the same BU session.
 */
export async function crawlExternalUrl(scrapeSessionId: string, externalUrl: string) {
  const scrapeSession = await repo.findScrapeSession(scrapeSessionId);
  if (!scrapeSession) throw new Error("Scrape session not found");

  await repo.updateScrapeSession(scrapeSessionId, {
    status: "scraping",
    lastStepSummary: `Crawling ${new URL(externalUrl).hostname}...`,
  });

  try {
    await runScrapeTask(
      scrapeSession.sessionId,
      scrapeSessionId,
      externalUrl,
      "external",
    );
  } catch (error) {
    console.error("[canvas-scraper] External crawl error:", error);
    await repo.updateScrapeSession(scrapeSessionId, {
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Create a new BU session and immediately crawl an external URL.
 * No Canvas navigation — goes straight to the target site.
 */
export async function startCrawlSession(user: IUser, externalUrl: string) {
  const client = getClient();

  let profile = await repo.findProfileByUserAndService(user.id, "canvas");
  if (!profile) {
    const buProfile = await client.profiles.create({ name: `canvas-${user.username}` });
    profile = await repo.createProfile({
      userId: user.id,
      profileId: buProfile.id,
      service: "canvas",
      label: `Canvas - ${user.username}`,
    });
    await repo.updateUser(user.id, { canvasProfileId: buProfile.id });
  }

  const session = await client.sessions.create({ profileId: profile.profileId });

  const scrapeSession = await repo.createScrapeSession({
    userId: user.id,
    sessionId: session.id,
    liveUrl: session.liveUrl ?? "",
    status: "scraping",
    service: "canvas",
  });

  // Start the crawl in the background
  crawlExternalUrl(scrapeSession.id, externalUrl).catch(
    (err) => console.error("[canvas-scraper] Crawl session error:", err)
  );

  return {
    scrapeSessionId: scrapeSession.id,
    liveUrl: session.liveUrl ?? "",
    sessionId: session.id,
  };
}

/**
 * Core scrape execution — sends the task and streams steps for progress.
 * Uses the SAME Browser Use session (no stop/restart).
 */
async function runScrapeTask(
  buSessionId: string,
  scrapeSessionId: string,
  url: string,
  mode: "normal" | "deeper" | "external" = "normal",
) {
  const client = getClient();

  const prompt = mode === "deeper"
    ? DEEPER_PROMPT(url)
    : mode === "external"
      ? EXTERNAL_URL_PROMPT(url)
      : SCRAPE_PROMPT(url);
  const run = client.run(prompt, {
    sessionId: buSessionId,
    model: "bu-max",
    timeout: 600_000,
  });

  // Stream steps for live progress
  let stepCount = 0;
  for await (const step of run) {
    stepCount++;
    const summary = (step as Record<string, unknown>).nextGoal as string
      ?? (step as Record<string, unknown>).summary as string
      ?? `Step ${stepCount}`;
    await repo.updateScrapeSession(scrapeSessionId, {
      stepCount,
      lastStepSummary: summary,
    });
    console.log(`[canvas-scraper] Step ${stepCount}: ${summary}`);
  }

  const result = run.result;
  if (!result) {
    throw new Error("Scrape task returned no result");
  }

  const output = result.output || "";
  console.log("[canvas-scraper] Agent output length:", output.length);

  // Check if the agent reported being blocked by a login page
  const looksBlocked = /login.*(required|page|blocked)|sso|sign.in|credentials/i.test(output)
    && !/courses/i.test(output);

  if (looksBlocked) {
    console.log("[canvas-scraper] Agent appears blocked by login, setting needs_login");
    await repo.updateScrapeSession(scrapeSessionId, {
      status: "needs_login",
      lastStepSummary: "Agent hit a login page — please log in and continue",
      rawOutput: output,
    });
    return; // Don't stop session — user will resume
  }

  // Parse courses from output
  const courses = parseCourses(output);

  // Also try to read from workspace if the agent saved there instead of returning JSON
  if (courses.length === 0 && output.length > 0) {
    console.log("[canvas-scraper] No courses in output, checking for workspace files...");
    try {
      // Try fetching the session to see if there's file content
      const sessionData = await client.sessions.get(buSessionId);
      const fullOutput = (sessionData as Record<string, unknown>).output;
      if (typeof fullOutput === "string" && fullOutput.length > output.length) {
        const wsCourses = parseCourses(fullOutput);
        if (wsCourses.length > 0) {
          courses.push(...wsCourses);
        }
      }
    } catch {
      // ignore
    }
  }

  // Save courses to DB (preliminary — user can review and re-scrape)
  const scrapeSession = await repo.findScrapeSession(scrapeSessionId);
  if (scrapeSession) {
    await saveCourses(courses, scrapeSession.userId);
  }

  // Go to REVIEW state — session stays alive, user can inspect results
  // and optionally ask the agent to search harder before we finalize.
  await repo.updateScrapeSession(scrapeSessionId, {
    status: "review",
    classesFound: courses.length,
    rawOutput: output.slice(0, 10000), // cap at 10k chars for storage
    lastStepSummary: courses.length > 0
      ? `Found ${courses.length} courses — review below`
      : "No structured course data found — review the agent output below",
  });
}

function parseCourses(output: string): ScrapedCourse[] {
  try {
    const jsonMatch = output.match(/\{[\s\S]*"courses"[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.courses || [];
    }
  } catch {
    console.error("[canvas-scraper] Failed to parse scrape output");
  }
  return [];
}

/** Extract a course code like "COGS 13" from a name like "COGS 13 - Field Methods: Cognition in the Wild" */
function extractCode(name: string, code?: string): string {
  if (code) return code;
  // Match patterns like "CSE 110", "COGS 13", "HUM 2", "VIS 10"
  const match = name.match(/^([A-Z]{2,5}\s+\d+[A-Z]?)/);
  return match ? match[1] : name.split(/\s*[-–—:]\s*/)[0].trim();
}

/** Check if a time string is a valid 24h time like "14:00" or "9:00" (not "varies") */
function isValidTime(t: string): boolean {
  return /^\d{1,2}:\d{2}$/.test(t.trim());
}

async function saveCourses(courses: ScrapedCourse[], userId: string) {
  for (const course of courses) {
    // Filter out schedule entries with unparseable days or times
    const schedule: ClassSchedule[] = (course.schedule || [])
      .filter((s) => {
        const dayNum = dayStringToNumber(s.dayOfWeek);
        if (dayNum === null) return false; // "varies", "varies (TuTh or WF)", etc.
        if (!isValidTime(s.startTime) || !isValidTime(s.endTime)) return false; // "varies"
        return true;
      })
      .map((s) => ({
        dayOfWeek: dayStringToNumber(s.dayOfWeek) as number,
        startTime: s.startTime,
        endTime: s.endTime,
        location: s.location,
        host: s.host,
        type: (s.type as ClassSchedule["type"]) || "lecture",
        recurrence: "weekly",
      }));

    const resolvedCode = extractCode(course.name, course.code);

    const existingClasses = await repo.findClassesByUserId(userId);
    const existing = existingClasses.find(
      (c) => c.canvasId === course.canvasId || c.code === resolvedCode
    );

    // Resolve quarter dates: scraped values > known UCSD dates > undefined
    const fallbackDates = getQuarterDates(course.term || "");
    const quarterStartDate = course.quarterStartDate || fallbackDates?.start;
    const quarterEndDate = course.quarterEndDate || fallbackDates?.end;

    const classData = {
      name: course.name,
      code: resolvedCode,
      instructor: course.instructor || "",
      term: course.term || "",
      quarterStartDate,
      quarterEndDate,
      schedule,
      rawData: {
        syllabusText: course.syllabusText,
        rawNotes: course.rawNotes,
      },
      externalLinks: course.externalLinks || [],
      syllabusUrl: course.syllabusUrl,
      description: course.description,
      lastScrapedAt: new Date(),
      scrapeDepth: 2,
    };

    if (existing) {
      await repo.updateClass(existing.id, {
        ...classData,
        name: course.name || existing.name,
        code: course.code || existing.code,
        instructor: course.instructor || existing.instructor,
        term: course.term || existing.term,
        rawData: { ...existing.rawData, ...classData.rawData },
        externalLinks: [
          ...new Set([...existing.externalLinks, ...classData.externalLinks]),
        ],
        syllabusUrl: course.syllabusUrl || existing.syllabusUrl,
        description: course.description || existing.description,
      });
    } else {
      await repo.createClass({
        userId,
        canvasId: course.canvasId || resolvedCode,
        enabled: true,
        ...classData,
      });
    }
  }
}
