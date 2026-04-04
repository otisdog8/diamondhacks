import { browserUseApi } from "./client";
import { dayStringToNumber } from "./schemas";
import type { ScrapedCourse } from "./schemas";
import { repo } from "@/lib/db";
import type { IUser, ClassSchedule } from "@/lib/db/types";

export async function startCanvasSession(user: IUser, canvasUrl: string) {
  // Check for existing profile
  let profile = await repo.findProfileByUserAndService(user.id, "canvas");

  // Create browser-use profile if none exists
  if (!profile) {
    const buProfile = await browserUseApi.profiles.create(`canvas-${user.username}`);
    profile = await repo.createProfile({
      userId: user.id,
      profileId: buProfile.id,
      service: "canvas",
      label: `Canvas - ${user.username}`,
    });
    await repo.updateUser(user.id, { canvasProfileId: buProfile.id });
  }

  // Create a session using the profile
  const session = await browserUseApi.sessions.create({ profileId: profile.profileId });

  // Store the scrape session
  const scrapeSession = await repo.createScrapeSession({
    userId: user.id,
    sessionId: session.id,
    liveUrl: session.live_url,
    status: "awaiting_login",
    service: "canvas",
  });

  // Navigate to Canvas login
  await browserUseApi.run(
    `Navigate to ${canvasUrl}. If there is a login page, stop and wait - the human user will log in manually through the browser.`,
    {
      sessionId: session.id,
      model: "gemini-3-flash",
    }
  );

  return {
    scrapeSessionId: scrapeSession.id,
    liveUrl: session.live_url,
    sessionId: session.id,
  };
}

export async function runCanvasScrape(scrapeSessionId: string, canvasUrl: string) {
  const scrapeSession = await repo.findScrapeSession(scrapeSessionId);
  if (!scrapeSession) throw new Error("Scrape session not found");

  await repo.updateScrapeSession(scrapeSessionId, { status: "scraping" });

  try {
    const result = await browserUseApi.run(
      `You are on Canvas LMS at ${canvasUrl}. Do the following exhaustively:

1. Go to the Dashboard or Courses page and find ALL current/active courses
2. For EACH course, navigate into it and extract:
   - Course name, course code, instructor name, term/semester
   - Full schedule: days of week, start/end times, locations
   - Check the Syllabus page for schedule details, office hours, and any links
   - Check the Modules page for any external links or resources
   - Check the Home page for any additional info
3. Follow ALL external links you find (up to 2 clicks deep) to gather more info
   - Some classes host content on Piazza, Ed Discussion, Gradescope, personal websites, etc.
   - Extract any schedule, office hours, or meeting info from these sites
4. OVER-DOCUMENT: capture everything you find, even if it seems minor
5. Return ALL data in a structured JSON format with this shape:
   { "courses": [{ "canvasId": "...", "name": "...", "code": "...", "instructor": "...", "term": "...", "schedule": [{"dayOfWeek": "Monday", "startTime": "14:00", "endTime": "15:20", "location": "WLH 2001", "type": "lecture"}], "syllabusText": "...", "syllabusUrl": "...", "externalLinks": ["..."], "description": "...", "rawNotes": "everything else you found" }] }

Be thorough and follow every link. Extract as much information as possible.`,
      {
        sessionId: scrapeSession.sessionId,
        model: "claude-sonnet-4-6",
      }
    );

    // Parse the result
    let courses: ScrapedCourse[] = [];
    try {
      const output = result.output || JSON.stringify(result);
      const jsonMatch = output.match(/\{[\s\S]*"courses"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        courses = parsed.courses || [];
      }
    } catch {
      console.error("Failed to parse scrape result, storing raw");
    }

    // Save courses to database
    for (const course of courses) {
      const schedule: ClassSchedule[] = (course.schedule || []).map((s) => ({
        dayOfWeek: dayStringToNumber(s.dayOfWeek),
        startTime: s.startTime,
        endTime: s.endTime,
        location: s.location,
        type: (s.type as ClassSchedule["type"]) || "lecture",
        recurrence: "weekly",
      }));

      const existingClasses = await repo.findClassesByUserId(scrapeSession.userId);
      const existing = existingClasses.find(
        (c) => c.canvasId === course.canvasId || c.code === course.code
      );

      if (existing) {
        await repo.updateClass(existing.id, {
          name: course.name || existing.name,
          code: course.code || existing.code,
          instructor: course.instructor || existing.instructor,
          term: course.term || existing.term,
          schedule,
          rawData: {
            ...existing.rawData,
            syllabusText: course.syllabusText,
            rawNotes: course.rawNotes,
          },
          externalLinks: [
            ...new Set([...existing.externalLinks, ...(course.externalLinks || [])]),
          ],
          syllabusUrl: course.syllabusUrl || existing.syllabusUrl,
          description: course.description || existing.description,
          lastScrapedAt: new Date(),
          scrapeDepth: 2,
        });
      } else {
        await repo.createClass({
          userId: scrapeSession.userId,
          canvasId: course.canvasId || course.code,
          name: course.name,
          code: course.code,
          instructor: course.instructor || "",
          term: course.term || "",
          enabled: true,
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
        });
      }
    }

    // Stop session to persist profile cookies
    await browserUseApi.sessions.stop(scrapeSession.sessionId);

    await repo.updateScrapeSession(scrapeSessionId, {
      status: "completed",
      classesFound: courses.length,
    });

    return { success: true, classesFound: courses.length };
  } catch (error) {
    await repo.updateScrapeSession(scrapeSessionId, {
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}
