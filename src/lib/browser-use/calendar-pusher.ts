import { browserUseApi } from "./client";
import { repo } from "@/lib/db";
import type { IUser } from "@/lib/db/types";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export async function startGoogleCalendarSession(user: IUser) {
  let profile = await repo.findProfileByUserAndService(user.id, "google");

  if (!profile) {
    const buProfile = await browserUseApi.profiles.create(`google-${user.username}`);
    profile = await repo.createProfile({
      userId: user.id,
      profileId: buProfile.id,
      service: "google",
      label: `Google - ${user.username}`,
    });
    await repo.updateUser(user.id, { googleProfileId: buProfile.id });
  }

  const session = await browserUseApi.sessions.create({ profileId: profile.profileId });

  const scrapeSession = await repo.createScrapeSession({
    userId: user.id,
    sessionId: session.id,
    liveUrl: session.live_url,
    status: "awaiting_login",
    service: "google",
  });

  // Navigate to Google Calendar
  await browserUseApi.run(
    "Navigate to https://calendar.google.com. If there is a login page, stop and wait - the human user will log in manually.",
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

export async function exportToGoogleCalendar(
  scrapeSessionId: string,
  user: IUser
) {
  const scrapeSession = await repo.findScrapeSession(scrapeSessionId);
  if (!scrapeSession) throw new Error("Session not found");

  await repo.updateScrapeSession(scrapeSessionId, { status: "scraping" });

  try {
    const classes = await repo.findClassesByUserId(user.id);
    const enabledClasses = classes.filter((c) => c.enabled);

    if (enabledClasses.length === 0) {
      await repo.updateScrapeSession(scrapeSessionId, { status: "completed" });
      return { success: true, eventsCreated: 0 };
    }

    const classDescriptions = enabledClasses.map((cls) => {
      const scheduleText = cls.schedule
        .map(
          (s) =>
            `${DAY_NAMES[s.dayOfWeek]} ${s.startTime}-${s.endTime}${s.location ? ` at ${s.location}` : ""} (${s.type})`
        )
        .join("; ");

      return `- ${cls.code}: ${cls.name} | Instructor: ${cls.instructor} | Schedule: ${scheduleText}`;
    });

    const result = await browserUseApi.run(
      `You are on Google Calendar. Create recurring calendar events for the following classes.
For each class, create a separate event for each time slot in the schedule.

Classes to add:
${classDescriptions.join("\n")}

For each event:
1. Click the "+" or "Create" button to create a new event
2. Set the title to the course code and name (e.g. "CSE 110 - Software Engineering")
3. Set the correct day and time
4. Set it to repeat weekly
5. If there's a location, add it
6. Add the instructor name in the description
7. Save the event
8. Try to use a different color for each class

Create ALL events. Confirm each one was saved successfully.
Return a summary of all events created.`,
      {
        sessionId: scrapeSession.sessionId,
        model: "claude-sonnet-4-6",
      }
    );

    await browserUseApi.sessions.stop(scrapeSession.sessionId);

    await repo.updateScrapeSession(scrapeSessionId, {
      status: "completed",
      classesFound: enabledClasses.length,
    });

    return { success: true, eventsCreated: enabledClasses.length, result };
  } catch (error) {
    await repo.updateScrapeSession(scrapeSessionId, {
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}
