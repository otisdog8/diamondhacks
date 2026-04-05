import { withAuth } from "@/lib/auth/middleware";
import {
  sendEmail,
  buildLeaveReminderEmail,
  buildTodoReminderEmail,
} from "@/lib/email/send";

/**
 * POST /api/email
 * Body: { type: "leave" | "todo", to: string, ...data }
 *
 * Sends a reminder email. In test mode, builds the email and returns
 * the content without sending if EMAIL_ENABLED is not true.
 */
export const POST = withAuth(async (req) => {
  try {
    const body = await req.json();
    const { type, to, test } = body;

    if (!to) {
      return Response.json({ error: "Recipient email (to) is required" }, { status: 400 });
    }

    let emailContent: { subject: string; text: string; html: string };

    if (type === "leave") {
      emailContent = buildLeaveReminderEmail({
        classCode: body.classCode ?? "CSE 125",
        className: body.className ?? "Software Systems",
        location: body.location ?? "WLH 2001",
        startTime: body.startTime ?? "2:00 PM",
        walkingMinutes: body.walkingMinutes ?? 10,
        leaveBy: body.leaveBy ?? "1:50 PM",
      });
    } else if (type === "todo") {
      emailContent = buildTodoReminderEmail({
        todoTitle: body.todoTitle ?? "Example Todo",
        description: body.description,
        dueDate: body.dueDate ?? "Tomorrow",
        classCode: body.classCode,
      });
    } else {
      return Response.json({ error: "type must be 'leave' or 'todo'" }, { status: 400 });
    }

    // Test mode: return the email content without sending
    if (test) {
      return Response.json({
        success: true,
        test: true,
        message: "Test mode — email content generated but not sent.",
        email: emailContent,
      });
    }

    const result = await sendEmail({ to, ...emailContent });
    return Response.json(result);
  } catch (error) {
    console.error("Email API error:", error);
    return Response.json({ error: "Failed to send email" }, { status: 500 });
  }
});
