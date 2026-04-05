/**
 * UCSD quarter date lookup and utilities.
 * Used as fallback when the scraper doesn't extract exact dates.
 */

export interface QuarterDates {
  start: string; // ISO date YYYY-MM-DD
  end: string;
  finalsStart: string; // Monday of finals week
  weeks: number;
}

// Known UCSD quarter instruction dates
const UCSD_QUARTERS: Record<string, QuarterDates> = {
  "Fall 2025": { start: "2025-09-25", end: "2025-12-06", finalsStart: "2025-12-08", weeks: 10 },
  "Winter 2026": { start: "2026-01-05", end: "2026-03-14", finalsStart: "2026-03-16", weeks: 10 },
  "Spring 2026": { start: "2026-03-30", end: "2026-06-06", finalsStart: "2026-06-08", weeks: 10 },
  "Summer Session I 2026": { start: "2026-07-06", end: "2026-08-08", finalsStart: "2026-08-09", weeks: 5 },
  "Summer Session II 2026": { start: "2026-08-04", end: "2026-09-06", finalsStart: "2026-09-07", weeks: 5 },
  "Fall 2026": { start: "2026-09-24", end: "2026-12-05", finalsStart: "2026-12-07", weeks: 10 },
  "Winter 2027": { start: "2027-01-04", end: "2027-03-13", finalsStart: "2027-03-15", weeks: 10 },
  "Spring 2027": { start: "2027-03-29", end: "2027-06-05", finalsStart: "2027-06-07", weeks: 10 },
};

/** Exact match on term string */
export function getQuarterDates(term: string): QuarterDates | null {
  // Try exact match first
  if (UCSD_QUARTERS[term]) return UCSD_QUARTERS[term];

  // Try normalizing: "SP26" → "Spring 2026", etc.
  const normalized = normalizeTerm(term);
  if (normalized && UCSD_QUARTERS[normalized]) return UCSD_QUARTERS[normalized];

  return null;
}

/** Infer the number of instruction weeks from a term string */
export function inferQuarterWeeks(term: string): number {
  const known = getQuarterDates(term);
  if (known) return known.weeks;

  const lower = term.toLowerCase();
  if (lower.includes("summer")) return 5;
  return 10; // default for standard quarters
}

/**
 * Given a quarter start date and a target day of week,
 * return the ISO date string of the first occurrence of that day
 * on or after the quarter start.
 */
export function getFirstDayInQuarter(quarterStart: string, dayOfWeek: number): string {
  const start = new Date(quarterStart + "T00:00:00");
  const startDay = start.getDay();
  const diff = (dayOfWeek - startDay + 7) % 7;
  const first = new Date(start);
  first.setDate(start.getDate() + diff);
  return first.toISOString().split("T")[0];
}

/**
 * Given a term and a day-of-week, return the ISO date of the final exam.
 * Finals week starts the Monday after instruction ends.
 * The final is on the same day-of-week during finals week.
 */
export function getFinalExamDate(term: string, dayOfWeek: number): string | null {
  const known = getQuarterDates(term);
  if (!known) return null;

  const finalsMonday = new Date(known.finalsStart + "T00:00:00");
  // dayOfWeek: 0=Sun...6=Sat. Finals week is Mon-Fri (1-5), with Sat finals rare.
  const diff = (dayOfWeek - 1 + 7) % 7; // days from Monday
  const examDate = new Date(finalsMonday);
  examDate.setDate(finalsMonday.getDate() + diff);
  return examDate.toISOString().split("T")[0];
}

function normalizeTerm(term: string): string | null {
  const lower = term.toLowerCase().trim();

  // Match patterns like "spring 2026", "sp26", "spring quarter 2026"
  const seasonMatch = lower.match(/(fall|winter|spring|summer\s*(?:session\s*)?(?:i{1,2})?)\s*(?:quarter\s*)?(\d{2,4})/);
  if (!seasonMatch) return null;

  let season = seasonMatch[1];
  let year = seasonMatch[2];
  if (year.length === 2) year = "20" + year;

  // Normalize season names
  if (season.startsWith("sp")) season = "spring";
  else if (season.startsWith("wi")) season = "winter";
  else if (season.startsWith("fa")) season = "fall";
  else if (season.startsWith("su")) {
    if (season.includes("ii") || season.includes("2")) season = "Summer Session II";
    else if (season.includes("i") || season.includes("1")) season = "Summer Session I";
    else season = "Summer Session I";
    return `${season} ${year}`;
  }

  return `${season.charAt(0).toUpperCase() + season.slice(1)} ${year}`;
}
