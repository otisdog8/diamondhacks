import { v4 as uuid } from "uuid";
import { readCollection, writeCollection } from "./store";
import type {
  IRepository,
  IUser,
  IClassInfo,
  IBrowserProfile,
  IScrapeSession,
} from "../types";

export class JsonRepository implements IRepository {
  // Users
  async createUser(data: Omit<IUser, "id" | "createdAt" | "updatedAt">): Promise<IUser> {
    const users = readCollection<IUser>("users");
    const user: IUser = {
      ...data,
      id: uuid(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    users.push(user);
    writeCollection("users", users);
    return user;
  }

  async findUserByUsername(username: string): Promise<IUser | null> {
    const users = readCollection<IUser>("users");
    return users.find((u) => u.username === username) ?? null;
  }

  async findUserById(id: string): Promise<IUser | null> {
    const users = readCollection<IUser>("users");
    return users.find((u) => u.id === id) ?? null;
  }

  async updateUser(id: string, data: Partial<IUser>): Promise<IUser> {
    const users = readCollection<IUser>("users");
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) throw new Error("User not found");
    users[idx] = { ...users[idx], ...data, updatedAt: new Date() };
    writeCollection("users", users);
    return users[idx];
  }

  // Classes
  async createClass(data: Omit<IClassInfo, "id" | "createdAt" | "updatedAt">): Promise<IClassInfo> {
    const classes = readCollection<IClassInfo>("classes");
    const cls: IClassInfo = {
      ...data,
      id: uuid(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    classes.push(cls);
    writeCollection("classes", classes);
    return cls;
  }

  async findClassesByUserId(userId: string): Promise<IClassInfo[]> {
    const classes = readCollection<IClassInfo>("classes");
    return classes.filter((c) => c.userId === userId);
  }

  async findClassById(id: string): Promise<IClassInfo | null> {
    const classes = readCollection<IClassInfo>("classes");
    return classes.find((c) => c.id === id) ?? null;
  }

  async updateClass(id: string, data: Partial<IClassInfo>): Promise<IClassInfo> {
    const classes = readCollection<IClassInfo>("classes");
    const idx = classes.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error("Class not found");
    classes[idx] = { ...classes[idx], ...data, updatedAt: new Date() };
    writeCollection("classes", classes);
    return classes[idx];
  }

  async deleteClass(id: string): Promise<void> {
    const classes = readCollection<IClassInfo>("classes");
    const filtered = classes.filter((c) => c.id !== id);
    writeCollection("classes", filtered);
  }

  async toggleClass(id: string): Promise<IClassInfo> {
    const classes = readCollection<IClassInfo>("classes");
    const idx = classes.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error("Class not found");
    classes[idx].enabled = !classes[idx].enabled;
    classes[idx].updatedAt = new Date();
    writeCollection("classes", classes);
    return classes[idx];
  }

  // Browser Profiles
  async createProfile(data: Omit<IBrowserProfile, "id" | "createdAt">): Promise<IBrowserProfile> {
    const profiles = readCollection<IBrowserProfile>("profiles");
    const profile: IBrowserProfile = {
      ...data,
      id: uuid(),
      createdAt: new Date(),
    };
    profiles.push(profile);
    writeCollection("profiles", profiles);
    return profile;
  }

  async findProfileByUserAndService(
    userId: string,
    service: "canvas" | "google"
  ): Promise<IBrowserProfile | null> {
    const profiles = readCollection<IBrowserProfile>("profiles");
    return profiles.find((p) => p.userId === userId && p.service === service) ?? null;
  }

  async updateProfile(id: string, data: Partial<IBrowserProfile>): Promise<IBrowserProfile> {
    const profiles = readCollection<IBrowserProfile>("profiles");
    const idx = profiles.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error("Profile not found");
    profiles[idx] = { ...profiles[idx], ...data };
    writeCollection("profiles", profiles);
    return profiles[idx];
  }

  // Scrape Sessions (in-memory for JSON mode too, stored in file for simplicity)
  async createScrapeSession(
    data: Omit<IScrapeSession, "id" | "createdAt" | "expiresAt">
  ): Promise<IScrapeSession> {
    const sessions = readCollection<IScrapeSession>("sessions");
    const session: IScrapeSession = {
      ...data,
      id: uuid(),
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 min
    };
    sessions.push(session);
    writeCollection("sessions", sessions);
    return session;
  }

  async findScrapeSession(id: string): Promise<IScrapeSession | null> {
    const sessions = readCollection<IScrapeSession>("sessions");
    return sessions.find((s) => s.id === id) ?? null;
  }

  async findActiveScrapeSessionByUser(
    userId: string,
    service: "canvas" | "google"
  ): Promise<IScrapeSession | null> {
    const sessions = readCollection<IScrapeSession>("sessions");
    return (
      sessions.find(
        (s) =>
          s.userId === userId &&
          s.service === service &&
          (s.status === "connecting" || s.status === "awaiting_login" || s.status === "scraping" || s.status === "needs_login" || s.status === "review") &&
          new Date(s.expiresAt) > new Date()
      ) ?? null
    );
  }

  async updateScrapeSession(
    id: string,
    data: Partial<IScrapeSession>
  ): Promise<IScrapeSession> {
    const sessions = readCollection<IScrapeSession>("sessions");
    const idx = sessions.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error("Session not found");
    sessions[idx] = { ...sessions[idx], ...data };
    writeCollection("sessions", sessions);
    return sessions[idx];
  }
}
