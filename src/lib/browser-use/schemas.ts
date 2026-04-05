import { z } from "zod/v4";

export const CourseScheduleSchema = z.object({
  dayOfWeek: z.string().describe("Day of week, e.g. 'Monday', 'Tuesday'"),
  startTime: z.string().describe("Start time in 24h format, e.g. '14:00'"),
  endTime: z.string().describe("End time in 24h format, e.g. '15:20'"),
  location: z.string().optional().describe("Building abbreviation + room number, e.g. 'WLH 2001', 'PETER 108', 'CSE 4258', 'CENTR 101', 'FAH 1301'. Use the short campus building code, NOT the full address."),
  host: z.string().optional().describe("For office hours: who is hosting, e.g. 'TA John Smith', 'Prof. Rossano'. Omit for lectures/discussions/labs."),
  type: z.string().describe("Type: lecture, discussion, lab, office_hours, final, midterm, or other"),
});

export const ScrapedCourseSchema = z.object({
  canvasId: z.string().describe("Canvas course ID from the URL"),
  name: z.string().describe("Full course name"),
  code: z.string().optional().describe("Course code, e.g. 'CSE 110'"),
  instructor: z.string().describe("Instructor name"),
  term: z.string().describe("Term, e.g. 'Spring 2026'"),
  schedule: z.array(CourseScheduleSchema),
  quarterStartDate: z.string().optional().describe("First day of instruction for this term, ISO format YYYY-MM-DD if found"),
  quarterEndDate: z.string().optional().describe("Last day of instruction for this term, ISO format YYYY-MM-DD if found"),
  syllabusText: z.string().optional().describe("Full syllabus text if available"),
  syllabusUrl: z.string().optional().describe("URL to syllabus"),
  externalLinks: z.array(z.string()).describe("All external links found — must be full URLs starting with http:// or https://, not just names like 'Piazza'"),
  description: z.string().optional().describe("Course description"),
  rawNotes: z.string().describe("Any additional information found - over-document everything"),
});

export const CanvasScrapeResultSchema = z.object({
  courses: z.array(ScrapedCourseSchema),
});

export type CanvasScrapeResult = z.infer<typeof CanvasScrapeResultSchema>;
export type ScrapedCourse = z.infer<typeof ScrapedCourseSchema>;

const DAY_MAP: Record<string, number> = {
  sunday: 0, sun: 0,
  monday: 1, mon: 1,
  tuesday: 2, tue: 2, tues: 2,
  wednesday: 3, wed: 3,
  thursday: 4, thu: 4, thur: 4, thurs: 4,
  friday: 5, fri: 5,
  saturday: 6, sat: 6,
};

export function dayStringToNumber(day: string): number | null {
  return DAY_MAP[day.toLowerCase()] ?? null;
}
