// ============================================================
// IReminderProvider implementation
// Drop into src/lib/extensions/reminder-provider.ts
//
// Requires in .env.local:
//   RESEND_API_KEY       — for email reminders (https://resend.com)
//   TWILIO_ACCOUNT_SID  — for SMS reminders
//   TWILIO_AUTH_TOKEN
//   TWILIO_FROM_NUMBER  — e.g. +15551234567
// ============================================================
import { v4 as uuidv4 } from "uuid";
import { repo } from "@/lib/db";
import type { IReminder, IReminderProvider, ReminderChannel } from "./types";

const remindersStore = new Map<string, IReminder>();

function now(): string {
  return new Date().toISOString();
}

// Days of week as names for readable email
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Convert schedule day+time to next upcoming datetime
function nextOccurrence(dayOfWeek: number, startTime: string, minutesBefore: number): Date {
  const [hours, mins] = startTime.split(":").map(Number);
  const now = new Date();
  const result = new Date();
  result.setHours(hours, mins - minutesBefore, 0, 0);

  const daysUntil = (dayOfWeek - now.getDay() + 7) % 7;
  result.setDate(now.getDate() + (daysUntil === 0 && result <= now ? 7 : daysUntil));
  return result;
}

async function sendEmail(to: string, subject: string, body: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[DEV] Would send email to ${to}: ${subject}`);
    return true;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "inBtwn <reminders@canvascal.app>",
      to,
      subject,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#7f77dd">inBtwn Reminder</h2>
        <p>${body.replace(/\n/g, "<br>")}</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
        <p style="color:#888;font-size:12px">Sent by inBtwn · <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard">Manage reminders</a></p>
      </div>`,
    }),
  });

  return res.ok;
}

async function sendSms(to: string, body: string): Promise<boolean> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (!sid || !token || !from) {
    console.log(`[DEV] Would send SMS to ${to}: ${body}`);
    return true;
  }

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ From: from, To: to, Body: body }).toString(),
    }
  );

  return res.ok;
}

export const reminderProvider: IReminderProvider = {
  async getRemindersForUser(userId) {
    return [...remindersStore.values()].filter((r) => r.userId === userId);
  },

  async createReminder(data) {
    const reminder: IReminder = {
      ...data,
      id: uuidv4(),
      status: "pending",
      createdAt: now(),
    };
    remindersStore.set(reminder.id, reminder);
    return reminder;
  },

  async updateReminder(id, updates) {
    const existing = remindersStore.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates };
    remindersStore.set(id, updated);
    return updated;
  },

  async deleteReminder(id) {
    return remindersStore.delete(id);
  },

  async sendReminder(reminderId) {
    const reminder = remindersStore.get(reminderId);
    if (!reminder) return false;

    const cls = await repo.findClassById(reminder.classId);
    if (!cls) return false;

    const classInfo = `${cls.name} (${cls.code})`;
    const nextSlot = cls.schedule[0];
    const timeStr = nextSlot
      ? `${DAY_NAMES[nextSlot.dayOfWeek]} at ${nextSlot.startTime}${nextSlot.location ? ` in ${nextSlot.location}` : ""}`
      : "upcoming";

    let success = false;

    if (reminder.channel === "email") {
      success = await sendEmail(
        reminder.destination,
        `Reminder: ${classInfo} in ${reminder.minutesBefore} minutes`,
        `Your class ${classInfo} starts in ${reminder.minutesBefore} minutes.\n\nSchedule: ${timeStr}\nInstructor: ${cls.instructor || "TBA"}`
      );
    } else if (reminder.channel === "sms") {
      success = await sendSms(
        reminder.destination,
        `inBtwn: ${cls.code} starts in ${reminder.minutesBefore} min — ${nextSlot?.location ?? "check your schedule"}`
      );
    }

    const updated: IReminder = {
      ...reminder,
      status: success ? "sent" : "failed",
      sentAt: success ? now() : undefined,
    };
    remindersStore.set(reminderId, updated);
    return success;
  },

  async scheduleRemindersForClass(userId, classId) {
    const cls = await repo.findClassById(classId);
    if (!cls) throw new Error("Class not found");

    const created: IReminder[] = [];

    for (const slot of cls.schedule) {
      // Create a 15-minute reminder by default
      const scheduledFor = nextOccurrence(slot.dayOfWeek, slot.startTime, 15).toISOString();

      const reminder = await reminderProvider.createReminder({
        userId,
        classId,
        channel: "email" as ReminderChannel,
        minutesBefore: 15,
        destination: "", // filled in by the user via the UI
        scheduledFor,
      });
      created.push(reminder);
    }

    return created;
  },
};
