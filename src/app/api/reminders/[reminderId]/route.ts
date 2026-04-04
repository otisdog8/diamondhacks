// ============================================================
// Single Reminder API
// Drop into src/app/api/reminders/[reminderId]/route.ts
// ============================================================
import { withAuth } from "@/lib/auth/middleware";
import { reminderProvider } from "@/lib/extensions/reminder-provider";

export const PATCH = withAuth(async (req, _user, { params }) => {
  const { reminderId } = await params;
  const body = await req.json();
  const updated = await reminderProvider.updateReminder(reminderId, body);
  if (!updated) return Response.json({ error: "Reminder not found" }, { status: 404 });
  return Response.json({ reminder: updated });
});

export const DELETE = withAuth(async (_req, _user, { params }) => {
  const { reminderId } = await params;
  const deleted = await reminderProvider.deleteReminder(reminderId);
  if (!deleted) return Response.json({ error: "Reminder not found" }, { status: 404 });
  return Response.json({ success: true });
});
