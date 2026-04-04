// ============================================================
// Reminders API
// Drop into src/app/api/reminders/route.ts
// ============================================================
import { withAuth } from "@/lib/auth/middleware";
import { reminderProvider } from "@/lib/extensions/reminder-provider";

export const GET = withAuth(async (_req, user) => {
  const reminders = await reminderProvider.getRemindersForUser(user.id);
  return Response.json({ reminders });
});

export const POST = withAuth(async (req, user) => {
  const body = await req.json();
  const { classId, channel, minutesBefore, destination, scheduledFor } = body;

  if (!classId || !channel || !minutesBefore || !destination || !scheduledFor) {
    return Response.json(
      { error: "classId, channel, minutesBefore, destination, and scheduledFor are required" },
      { status: 400 }
    );
  }

  const reminder = await reminderProvider.createReminder({
    userId: user.id,
    classId,
    channel,
    minutesBefore,
    destination,
    scheduledFor,
  });

  return Response.json({ reminder }, { status: 201 });
});
