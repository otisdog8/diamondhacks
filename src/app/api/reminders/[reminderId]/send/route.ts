// ============================================================
// Send Reminder
// Drop into src/app/api/reminders/[reminderId]/send/route.ts
// ============================================================
import { withAuth } from "@/lib/auth/middleware";
import { reminderProvider } from "@/lib/extensions/reminder-provider";

export const POST = withAuth(async (_req, _user, { params }) => {
  const { reminderId } = await params;
  try {
    const success = await reminderProvider.sendReminder(reminderId);
    return Response.json({ success });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send reminder";
    return Response.json({ error: message }, { status: 500 });
  }
});
