// ★ SHARED CONTRACT — all developers code against these interfaces

export interface IUser {
  id: string;
  username: string;
  passwordHash: string;
  canvasProfileId?: string;
  googleProfileId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClassSchedule {
  dayOfWeek: number; // 0=Sun, 1=Mon, ..., 6=Sat
  startTime: string; // "14:00" 24h format
  endTime: string; // "15:20"
  location?: string;
  type: "lecture" | "discussion" | "lab" | "office_hours" | "final" | "midterm" | "other";
  recurrence?: string; // "weekly", or iCal RRULE
}

export interface IClassInfo {
  id: string;
  userId: string;
  canvasId: string;
  name: string; // e.g. "Software Engineering"
  code: string; // e.g. "CSE 110"
  instructor: string;
  term: string; // e.g. "Spring 2026"
  enabled: boolean; // toggle for calendar export

  schedule: ClassSchedule[];

  // Over-document everything
  rawData: Record<string, unknown>;
  externalLinks: string[];
  syllabusUrl?: string;
  description?: string;

  lastScrapedAt?: Date;
  scrapeDepth: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IBrowserProfile {
  id: string;
  userId: string;
  profileId: string; // browser-use profile_id
  service: "canvas" | "google";
  label: string;
  lastUsedAt?: Date;
  createdAt: Date;
}

export interface IScrapeSession {
  id: string;
  userId: string;
  sessionId: string; // browser-use session ID
  taskId?: string;
  liveUrl: string;
  status: "awaiting_login" | "scraping" | "completed" | "failed";
  service: "canvas" | "google";
  classesFound?: number;
  error?: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface IRepository {
  // Users
  createUser(data: Omit<IUser, "id" | "createdAt" | "updatedAt">): Promise<IUser>;
  findUserByUsername(username: string): Promise<IUser | null>;
  findUserById(id: string): Promise<IUser | null>;
  updateUser(id: string, data: Partial<IUser>): Promise<IUser>;

  // Classes
  createClass(data: Omit<IClassInfo, "id" | "createdAt" | "updatedAt">): Promise<IClassInfo>;
  findClassesByUserId(userId: string): Promise<IClassInfo[]>;
  findClassById(id: string): Promise<IClassInfo | null>;
  updateClass(id: string, data: Partial<IClassInfo>): Promise<IClassInfo>;
  deleteClass(id: string): Promise<void>;
  toggleClass(id: string): Promise<IClassInfo>;

  // Browser Profiles
  createProfile(data: Omit<IBrowserProfile, "id" | "createdAt">): Promise<IBrowserProfile>;
  findProfileByUserAndService(userId: string, service: "canvas" | "google"): Promise<IBrowserProfile | null>;
  updateProfile(id: string, data: Partial<IBrowserProfile>): Promise<IBrowserProfile>;

  // Scrape Sessions (in-memory or short-lived)
  createScrapeSession(data: Omit<IScrapeSession, "id" | "createdAt" | "expiresAt">): Promise<IScrapeSession>;
  findScrapeSession(id: string): Promise<IScrapeSession | null>;
  findActiveScrapeSessionByUser(userId: string, service: "canvas" | "google"): Promise<IScrapeSession | null>;
  updateScrapeSession(id: string, data: Partial<IScrapeSession>): Promise<IScrapeSession>;
}
