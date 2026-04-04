import { getClient } from "./client";
import { repo } from "@/lib/db";
import type { IUser } from "@/lib/db/types";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export async function startGoogleCalendarSession(user: IUser) {
  const client = getClient();

  let profile = await repo.findProfileByUserAndService(user.id, "google");

  if (!profile) {
    const buProfile = await client.profiles.create({ name: `google-${user.username}` });
    profile = await repo.createProfile({
      userId: user.id,
      profileId: buProfile.id,
      service: "google",
      label: `Google - ${user.username}`,
    });
    await repo.updateUser(user.id, { googleProfileId: buProfile.id });
  }

  // Create session (no task — just get liveUrl fast)
  const session = await client.sessions.create({
    profileId: profile.profileId,
  });

  const scrapeSession = await repo.createScrapeSession({
    userId: user.id,
    sessionId: session.id,
    liveUrl: session.liveUrl ?? "",
    status: "awaiting_login",
    service: "google",
  });

  // Navigate to Google Calendar in the background
  void client.run(
    "Navigate to https://calendar.google.com. If there is a login page, stop and wait - the human user will log in manually.",
    { sessionId: session.id, model: "bu-mini" }
  ).then(() => {}, (err: unknown) => console.error("[calendar-pusher] Nav task error:", err));

  return {
    scrapeSessionId: scrapeSession.id,
    liveUrl: session.liveUrl ?? "",
    sessionId: session.id,
  };
}

export async function exportToGoogleCalendar(
  scrapeSessionId: string,
  user: IUser
) {
  const client = getClient();
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

    // Run export task via the SDK
    await client.run(
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
        model: "bu-max",
        timeout: 600_000,
      }
    );

    // Stop session to persist cookies
    await client.sessions.stop(scrapeSession.sessionId);

    await repo.updateScrapeSession(scrapeSessionId, {
      status: "completed",
      classesFound: enabledClasses.length,
    });

    return { success: true, eventsCreated: enabledClasses.length };
  } catch (error) {
    await repo.updateScrapeSession(scrapeSessionId, {
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}
