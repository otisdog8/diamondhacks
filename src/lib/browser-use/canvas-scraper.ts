import { getClient } from "./client";
import { dayStringToNumber } from "./schemas";
import type { ScrapedCourse } from "./schemas";
import { repo } from "@/lib/db";
import type { IUser, ClassSchedule } from "@/lib/db/types";
import { assignmentProvider } from "@/lib/extensions/assignment-provider";
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
   - Check the Syllabus page for schedule details, office hours, links, AND any listed assignments/deadlines/exams with due dates
   - Check the Assignments page and extract ALL assignments with their titles, due dates, point values, and types
   - Check the Modules page for any external links or resources
   - Check the Home page for any additional info
   - Look for assignment info EVERYWHERE: syllabus text, course calendar, announcements, and module descriptions. Many instructors list deadlines only on the syllabus, not on the Assignments page.
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
5. If you find a link to a dedicated course website (e.g. an instructor's course homepage), click into it to extract schedule and assignment info.
   - ONLY follow links that are clearly a course website or course homepage. Do NOT follow links to Piazza, Ed Discussion, Gradescope, Google Drive, Google Docs, Zoom, or any other tool.
   - CRITICAL: You MUST actually CLICK links/buttons on the page rather than navigating to URLs directly.
   - If you hit a login wall, give up immediately and move on.
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

OUTPUT RULES:
1. Your final result MUST be a JSON object in the format shown below.
2. Do NOT save the JSON to a file. Do NOT use save_file, write_file, or any workspace/file operation.
3. Do NOT create any files. Return the JSON as your task result.

JSON format:
{ "courses": [{ "canvasId": "74024", "name": "Field Methods: Cognition in the Wild", "code": "COGS 13", "instructor": "Federico Rossano", "term": "Spring 2026", "quarterStartDate": "2026-03-30", "quarterEndDate": "2026-06-06", "schedule": [{"dayOfWeek": "Tuesday", "startTime": "12:30", "endTime": "13:50", "location": "PETER 108", "type": "lecture"}, {"dayOfWeek": "Wednesday", "startTime": "14:00", "endTime": "15:00", "location": "CSE 4258", "type": "office_hours", "host": "Prof. Rossano"}, {"dayOfWeek": "Monday", "startTime": "08:00", "endTime": "10:59", "location": "PETER 108", "type": "final"}], "assignments": [{"id": "12345", "title": "Essay 1", "dueDate": "2026-04-26", "points": 100, "type": "essay"}, {"id": "12346", "title": "Final Exam", "dueDate": "2026-06-08", "points": 200, "type": "exam"}], "syllabusText": "...", "syllabusUrl": "https://...", "externalLinks": ["https://piazza.com/class/abc123"], "description": "...", "rawNotes": "everything else you found" }] }`;

const DEEPER_PROMPT = (canvasUrl: string) => `You previously scraped Canvas at ${canvasUrl} but the user wants more thorough results. Search harder:

1. Go back to the Courses page and check ALL courses again — including past terms if visible
2. For each course, check EVERY tab: Home, Syllabus, Modules, Assignments, Grades, People, Files
3. Click into external links FROM WITHIN Canvas to instructor/course websites
   - DO NOT visit Piazza, Ed Discussion, Gradescope, or Google Drive — these require separate login and will waste time.
   - Google Docs/Sheets are OK to try, but give up immediately if you hit a login wall.
   - Good targets: instructor personal websites, course homepages, department pages.
   - CRITICAL: You MUST actually CLICK the link/button elements on the Canvas page — do NOT navigate to URLs directly.
   - Extract any additional schedule, section, instructor, or assignment info from these sites
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

Include everything you found previously plus new discoveries.

OUTPUT RULES:
1. Your final result MUST be a JSON object in the format shown below.
2. Do NOT save the JSON to a file. Do NOT use save_file, write_file, or any workspace/file operation.
3. Do NOT create any files. Return the JSON as your task result.

JSON format:
{ "courses": [{ "canvasId": "74024", "name": "Field Methods: Cognition in the Wild", "code": "COGS 13", "instructor": "...", "term": "Spring 2026", "quarterStartDate": "2026-03-30", "quarterEndDate": "2026-06-06", "schedule": [{"dayOfWeek": "Tuesday", "startTime": "12:30", "endTime": "13:50", "location": "PETER 108", "type": "lecture"}, {"dayOfWeek": "Wednesday", "startTime": "14:00", "endTime": "15:00", "location": "CSE 4258", "type": "office_hours", "host": "Prof. Rossano"}], "assignments": [{"id": "12345", "title": "Essay 1", "dueDate": "2026-04-26", "points": 100, "type": "essay"}], "syllabusText": "...", "syllabusUrl": "https://...", "externalLinks": ["https://piazza.com/class/abc123"], "description": "...", "rawNotes": "everything else you found" }] }`;

const EXTERNAL_URL_PROMPT = (externalUrl: string) => `The user wants you to crawl an external class website to extract course information.

Navigate to: ${externalUrl}

Extract ALL information you can find about courses/classes on this site:
- Course names and course codes (e.g. "CSE 110", "COGS 13" — the short department + number, NOT the full name)
- Instructors
- Schedules: days, times, locations
- Syllabus content, office hours (include who is hosting each OH session)
- ALL assignments, homework, projects, essays, quizzes, exams, and deadlines with due dates and point values
  Look for these in: assignment lists, syllabus pages, course calendars, gradebook, announcements
  On Gradescope: check the assignments list for due dates
  On Piazza/Ed: check for pinned posts with deadlines
  On instructor websites: check syllabus, schedule, and homework pages
- Any links to other resources
- ANYTHING that looks like it relates to a class

Also follow links within this site (up to 2 clicks deep) to find additional assignment and schedule info.
DO NOT follow links to Piazza, Gradescope, or Google Drive — these require separate login.
Google Docs/Sheets links are OK to try, but give up immediately if you hit a login wall.

If the site requires login, STOP and return what the page shows — the user will log in manually.

SCHEDULE ENTRY RULES:
- "type" must be one of: "lecture", "discussion", "lab", "office_hours", "final", "midterm", "other"
- For office_hours entries, include a "host" field with the name of who is holding them (e.g. "TA Josh", "Prof. Rossano"). Create separate entries for each person's office hours.
- "dayOfWeek" must be a SINGLE standard day name: "Monday", "Tuesday", etc. — NOT "TuTh", "MWF", or "varies".
  If a class meets on multiple days, create SEPARATE entries for each day.
- "startTime"/"endTime" must be in 24-hour format like "14:00" or "09:00". Do NOT use "varies" — omit if unknown.
- "location" must use the SHORT campus building code + room number, e.g. "WLH 2001", "PETER 108", "CSE 4258". Do NOT use full addresses.
- Finals/midterms: include with type "final"/"midterm".

OUTPUT RULES:
1. Your final result MUST be a JSON object in the format shown below.
2. Do NOT save the JSON to a file. Do NOT use save_file, write_file, or any workspace/file operation.
3. Do NOT create any files. Return the JSON as your task result.

JSON format:
{ "courses": [{ "canvasId": "external", "name": "Field Methods: Cognition in the Wild", "code": "COGS 13", "instructor": "...", "term": "Spring 2026", "schedule": [{"dayOfWeek": "Tuesday", "startTime": "12:30", "endTime": "13:50", "location": "PETER 108", "type": "lecture"}], "assignments": [{"id": "hw1", "title": "Problem Set 1", "dueDate": "2026-04-10", "points": 50, "type": "homework"}], "syllabusText": "...", "syllabusUrl": "${externalUrl}", "externalLinks": ["https://piazza.com/class/abc123"], "description": "...", "rawNotes": "everything else you found" }] }`;

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
  const timeout = mode === "deeper" ? 2_400_000 : 1_200_000; // 40 min for deeper, 20 min otherwise
  const run = client.run(prompt, {
    sessionId: buSessionId,
    model: "bu-mini",
    timeout,
  });

  // Stream steps for live progress
  let stepCount = 0;
  let lastStepText = "";
  for await (const step of run) {
    stepCount++;
    const stepObj = step as Record<string, unknown>;
    const summary = stepObj.nextGoal as string
      ?? stepObj.summary as string
      ?? `Step ${stepCount}`;
    // Capture the full step output text as fallback for JSON extraction
    const stepOutput = stepObj.output as string ?? stepObj.result as string ?? "";
    if (stepOutput) lastStepText = stepOutput;
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

  // The SDK may return the output in different places depending on version
  let output = "";
  if (typeof result === "string") {
    output = result;
  } else if (typeof result.output === "string") {
    output = result.output;
  } else if (typeof (result as Record<string, unknown>).result === "string") {
    output = (result as Record<string, unknown>).result as string;
  } else {
    // Last resort: stringify the whole result and try to extract JSON from it
    try {
      output = JSON.stringify(result);
    } catch {
      output = String(result);
    }
  }
  // If SDK didn't return output, try the last step's text (often contains the JSON)
  if (!output || output === "{}" || output === "undefined") {
    if (lastStepText) {
      console.log("[canvas-scraper] Using last step text as output fallback");
      output = lastStepText;
    }
  }
  console.log("[canvas-scraper] Agent output length:", output.length);
  console.log("[canvas-scraper] Agent output preview:", output.slice(0, 200));

  // Check if the agent reported being blocked by a login page
  const outputStr = typeof output === "string" ? output : "";
  const looksBlocked = outputStr.length > 0
    && /login.*(required|page|blocked)|sso|sign.in|credentials/i.test(outputStr)
    && !/courses/i.test(outputStr);

  if (looksBlocked) {
    console.log("[canvas-scraper] Agent appears blocked by login, setting needs_login");
    await repo.updateScrapeSession(scrapeSessionId, {
      status: "needs_login",
      lastStepSummary: "Agent hit a login page — please log in and continue",
      rawOutput: String(output || ""),
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
    rawOutput: String(output || ""), // cap at 10k chars for storage
    lastStepSummary: courses.length > 0
      ? `Found ${courses.length} courses — review below`
      : "No structured course data found — review the agent output below",
  });
}

function parseCourses(output: unknown): ScrapedCourse[] {
  // Handle non-string inputs gracefully
  if (!output) return [];

  let text: string;
  if (typeof output === "string") {
    text = output;
  } else if (typeof output === "object") {
    // If it's already a parsed object with courses, use it directly
    const obj = output as Record<string, unknown>;
    if (Array.isArray(obj.courses)) return obj.courses as ScrapedCourse[];
    try { text = JSON.stringify(output); } catch { return []; }
  } else {
    text = String(output);
  }

  if (!text || text.length === 0) return [];

  // Try multiple strategies to extract JSON
  // 1. Direct parse (if the output is pure JSON)
  try {
    const parsed = JSON.parse(text);
    if (parsed && Array.isArray(parsed.courses)) return parsed.courses;
  } catch { /* not pure JSON, try extraction */ }

  // 2. Extract JSON object containing "courses" key
  try {
    const jsonMatch = text.match(/\{[\s\S]*"courses"\s*:\s*\[[\s\S]*\]/);
    if (jsonMatch) {
      // Find the matching closing brace
      let candidate = jsonMatch[0];
      // Ensure the braces are balanced
      let depth = 0;
      let end = -1;
      for (let i = 0; i < candidate.length; i++) {
        if (candidate[i] === "{") depth++;
        else if (candidate[i] === "}") { depth--; if (depth === 0) { end = i; break; } }
      }
      if (end > 0) candidate = candidate.slice(0, end + 1);
      const parsed = JSON.parse(candidate);
      if (parsed && Array.isArray(parsed.courses)) return parsed.courses;
    }
  } catch {
    console.error("[canvas-scraper] Failed to parse extracted JSON from output");
  }

  // 3. Try to find a JSON array of courses directly
  try {
    const arrayMatch = text.match(/\[\s*\{[\s\S]*"canvasId"[\s\S]*\]\s*/);
    if (arrayMatch) {
      const parsed = JSON.parse(arrayMatch[0]);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch { /* ignore */ }

  console.error("[canvas-scraper] Could not extract courses from output, length:", text.length);
  return [];
}

/** Safely coerce anything to a string, returning "" for null/undefined/non-string */
function str(v: unknown): string {
  if (typeof v === "string") return v;
  if (v == null) return "";
  return String(v);
}

/** Extract a course code like "COGS 13" from a name like "COGS 13 - Field Methods: Cognition in the Wild" */
function extractCode(name: string, code?: string): string {
  const c = str(code);
  if (c) return c;
  const n = str(name);
  if (!n) return "UNKNOWN";
  const match = n.match(/([A-Z]{2,5}\s+\d+[A-Z]?)/);
  return match ? match[1] : n.split(/\s*[-–—:]\s*/)[0].trim() || "UNKNOWN";
}

/** Check if a time string is a valid 24h time like "14:00" or "9:00" (not "varies") */
function isValidTime(t: unknown): boolean {
  return typeof t === "string" && /^\d{1,2}:\d{2}$/.test(t.trim());
}

/** Validate that a schedule type is one of the known types */
const VALID_TYPES = new Set(["lecture", "discussion", "lab", "office_hours", "final", "midterm", "other"]);
function normalizeType(t: unknown): ClassSchedule["type"] {
  const s = str(t).toLowerCase().trim();
  if (VALID_TYPES.has(s)) return s as ClassSchedule["type"];
  if (s.includes("lab")) return "lab";
  if (s.includes("disc")) return "discussion";
  if (s.includes("office") || s.includes("oh")) return "office_hours";
  if (s.includes("final")) return "final";
  if (s.includes("midterm") || s.includes("exam")) return "midterm";
  return "lecture";
}

async function saveCourses(courses: ScrapedCourse[], userId: string) {
  if (!Array.isArray(courses)) return;

  for (const course of courses) {
    try {
      if (!course || typeof course !== "object") continue;

      // Filter out schedule entries with unparseable days or times
      const rawSchedule = Array.isArray(course.schedule) ? course.schedule : [];
      const schedule: ClassSchedule[] = rawSchedule
        .filter((s) => {
          if (!s || typeof s !== "object") return false;
          const dayNum = dayStringToNumber(str(s.dayOfWeek));
          if (dayNum === null) return false;
          if (!isValidTime(s.startTime) || !isValidTime(s.endTime)) return false;
          return true;
        })
        .map((s) => ({
          dayOfWeek: dayStringToNumber(str(s.dayOfWeek)) as number,
          startTime: str(s.startTime),
          endTime: str(s.endTime),
          location: str(s.location) || undefined,
          host: str(s.host) || undefined,
          type: normalizeType(s.type),
          recurrence: "weekly",
        }));

      const courseName = str(course.name);
      const resolvedCode = extractCode(courseName, course.code);

      const existingClasses = await repo.findClassesByUserId(userId);
      const canvasId = str(course.canvasId);
      const existing = existingClasses.find(
        (c) => (canvasId && c.canvasId === canvasId) || c.code === resolvedCode
      );

      // Resolve quarter dates: scraped values > known UCSD dates > undefined
      const term = str(course.term);
      const fallbackDates = getQuarterDates(term);
      const quarterStartDate = str(course.quarterStartDate) || fallbackDates?.start;
      const quarterEndDate = str(course.quarterEndDate) || fallbackDates?.end;

      // Safely coerce arrays
      const externalLinks = Array.isArray(course.externalLinks)
        ? course.externalLinks.filter((l): l is string => typeof l === "string")
        : [];

      const classData = {
        name: courseName,
        code: resolvedCode,
        instructor: str(course.instructor),
        term,
        quarterStartDate,
        quarterEndDate,
        schedule,
        rawData: {
          syllabusText: str(course.syllabusText),
          rawNotes: str(course.rawNotes),
        },
        externalLinks,
        syllabusUrl: str(course.syllabusUrl) || undefined,
        description: str(course.description) || undefined,
        lastScrapedAt: new Date(),
        scrapeDepth: 2,
      };

      let classId: string;

      if (existing) {
        await repo.updateClass(existing.id, {
          ...classData,
          name: courseName || existing.name,
          code: resolvedCode || existing.code,
          instructor: str(course.instructor) || existing.instructor,
          term: term || existing.term,
          rawData: { ...existing.rawData, ...classData.rawData },
          externalLinks: [
            ...new Set([...existing.externalLinks, ...externalLinks]),
          ],
          syllabusUrl: str(course.syllabusUrl) || existing.syllabusUrl,
          description: str(course.description) || existing.description,
        });
        classId = existing.id;
      } else {
        const created = await repo.createClass({
          userId,
          canvasId: canvasId || resolvedCode,
          enabled: true,
          ...classData,
        });
        classId = created.id;
      }

      // Save scraped assignments
      const assignments = Array.isArray(course.assignments) ? course.assignments : [];
      for (const a of assignments) {
        if (!a || typeof a !== "object") continue;
        const aTitle = str(a.title);
        if (!aTitle) continue; // title is required, but dueDate is optional

        try {
          const existingAssignments = await assignmentProvider.getAssignmentsForClass(userId, classId);
          const aId = str(a.id);
          const dup = existingAssignments.find(
            (ex) =>
              // Only match on canvasAssignmentId if both sides are non-empty
              (aId && ex.canvasAssignmentId && ex.canvasAssignmentId === aId) ||
              ex.title === aTitle
          );
          if (dup) continue;

          await assignmentProvider.createAssignment({
            userId,
            classId,
            title: aTitle,
            description: str(a.description) || undefined,
            dueDate: str(a.dueDate) || undefined,
            points: typeof a.points === "number" ? a.points : undefined,
            type: (str(a.type) as "homework" | "project" | "exam" | "quiz" | "lab" | "other") || "homework",
            source: "canvas",
            canvasAssignmentId: aId || undefined,
            completed: false,
          });
        } catch (err) {
          console.error(`[canvas-scraper] Failed to save assignment "${aTitle}":`, err);
        }
      }
    } catch (err) {
      console.error(`[canvas-scraper] Failed to save course "${str(course.name)}":`, err);
    }
  }
}
