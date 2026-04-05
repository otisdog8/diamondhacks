import nodemailer from "nodemailer";

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

function isEmailEnabled(): boolean {
  return process.env.EMAIL_ENABLED === "true";
}

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error("SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; message: string }> {
  if (!isEmailEnabled()) {
    return { success: false, message: "Email is disabled. Set EMAIL_ENABLED=true to enable." };
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER || "inbtwn@localhost";

  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: `inbtwn <${from}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    return { success: true, message: `Email sent to ${options.to}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[email] Send failed:", msg);
    return { success: false, message: msg };
  }
}

/** Build a leave reminder email */
export function buildLeaveReminderEmail(opts: {
  classCode: string;
  className: string;
  location: string;
  startTime: string;
  walkingMinutes: number;
  leaveBy: string;
}): { subject: string; text: string; html: string } {
  const subject = `Leave now for ${opts.classCode}`;
  const text = `Time to leave for ${opts.classCode} (${opts.className})!\n\nClass starts at ${opts.startTime} in ${opts.location}.\nWalking time: ${opts.walkingMinutes} minutes.\nLeave by: ${opts.leaveBy}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #1B4457; margin-bottom: 4px;">Time to leave!</h2>
      <p style="color: #666; margin-top: 0;">${opts.classCode} — ${opts.className}</p>
      <div style="background: #f8f9fa; border-radius: 12px; padding: 16px; margin: 16px 0;">
        <p style="margin: 4px 0;"><strong>Starts at:</strong> ${opts.startTime}</p>
        <p style="margin: 4px 0;"><strong>Location:</strong> ${opts.location}</p>
        <p style="margin: 4px 0;"><strong>Walk time:</strong> ${opts.walkingMinutes} min</p>
        <p style="margin: 4px 0; color: #d97706;"><strong>Leave by:</strong> ${opts.leaveBy}</p>
      </div>
    </div>`;
  return { subject, text, html };
}

/** Build a todo reminder email */
export function buildTodoReminderEmail(opts: {
  todoTitle: string;
  description?: string;
  dueDate: string;
  classCode?: string;
}): { subject: string; text: string; html: string } {
  const subject = `Reminder: ${opts.todoTitle}`;
  const classLabel = opts.classCode ? ` (${opts.classCode})` : "";
  const text = `Reminder: ${opts.todoTitle}${classLabel}\n\nDue: ${opts.dueDate}${opts.description ? `\n\n${opts.description}` : ""}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #1B4457; margin-bottom: 4px;">Task Reminder</h2>
      <p style="color: #666; margin-top: 0;">${opts.todoTitle}${classLabel}</p>
      <div style="background: #f8f9fa; border-radius: 12px; padding: 16px; margin: 16px 0;">
        <p style="margin: 4px 0;"><strong>Due:</strong> ${opts.dueDate}</p>
        ${opts.description ? `<p style="margin: 4px 0; color: #666;">${opts.description}</p>` : ""}
      </div>
    </div>`;
  return { subject, text, html };
}
