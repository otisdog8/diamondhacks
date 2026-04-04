import { connectToDatabase } from "./connection";
import { UserModel } from "./models/User";
import { ClassInfoModel } from "./models/ClassInfo";
import { BrowserProfileModel } from "./models/BrowserProfile";
import type {
  IRepository,
  IUser,
  IClassInfo,
  IBrowserProfile,
  IScrapeSession,
} from "../types";

function docToUser(doc: Record<string, unknown>): IUser {
  const d = doc as Record<string, unknown>;
  return {
    id: String(d._id),
    username: d.username as string,
    passwordHash: d.passwordHash as string,
    canvasProfileId: d.canvasProfileId as string | undefined,
    googleProfileId: d.googleProfileId as string | undefined,
    createdAt: d.createdAt as Date,
    updatedAt: d.updatedAt as Date,
  };
}

function docToClass(doc: Record<string, unknown>): IClassInfo {
  const d = doc as Record<string, unknown>;
  return {
    id: String(d._id),
    userId: d.userId as string,
    canvasId: d.canvasId as string,
    name: d.name as string,
    code: d.code as string,
    instructor: d.instructor as string,
    term: d.term as string,
    enabled: d.enabled as boolean,
    schedule: d.schedule as IClassInfo["schedule"],
    rawData: (d.rawData as Record<string, unknown>) ?? {},
    externalLinks: (d.externalLinks as string[]) ?? [],
    syllabusUrl: d.syllabusUrl as string | undefined,
    description: d.description as string | undefined,
    lastScrapedAt: d.lastScrapedAt as Date | undefined,
    scrapeDepth: (d.scrapeDepth as number) ?? 0,
    createdAt: d.createdAt as Date,
    updatedAt: d.updatedAt as Date,
  };
}

function docToProfile(doc: Record<string, unknown>): IBrowserProfile {
  const d = doc as Record<string, unknown>;
  return {
    id: String(d._id),
    userId: d.userId as string,
    profileId: d.profileId as string,
    service: d.service as "canvas" | "google",
    label: d.label as string,
    lastUsedAt: d.lastUsedAt as Date | undefined,
    createdAt: d.createdAt as Date,
  };
}

// In-memory store for scrape sessions (they're transient)
const scrapeSessions = new Map<string, IScrapeSession>();
let sessionCounter = 0;

export class MongoRepository implements IRepository {
  private async connect() {
    await connectToDatabase();
  }

  async createUser(data: Omit<IUser, "id" | "createdAt" | "updatedAt">): Promise<IUser> {
    await this.connect();
    const doc = await UserModel.create(data);
    return docToUser(doc.toObject());
  }

  async findUserByUsername(username: string): Promise<IUser | null> {
    await this.connect();
    const doc = await UserModel.findOne({ username }).lean();
    return doc ? docToUser(doc as Record<string, unknown>) : null;
  }

  async findUserById(id: string): Promise<IUser | null> {
    await this.connect();
    const doc = await UserModel.findById(id).lean();
    return doc ? docToUser(doc as Record<string, unknown>) : null;
  }

  async updateUser(id: string, data: Partial<IUser>): Promise<IUser> {
    await this.connect();
    const doc = await UserModel.findByIdAndUpdate(id, data, { new: true }).lean();
    if (!doc) throw new Error("User not found");
    return docToUser(doc as Record<string, unknown>);
  }

  async createClass(data: Omit<IClassInfo, "id" | "createdAt" | "updatedAt">): Promise<IClassInfo> {
    await this.connect();
    const doc = await ClassInfoModel.create(data);
    return docToClass(doc.toObject());
  }

  async findClassesByUserId(userId: string): Promise<IClassInfo[]> {
    await this.connect();
    const docs = await ClassInfoModel.find({ userId }).lean();
    return docs.map((d) => docToClass(d as Record<string, unknown>));
  }

  async findClassById(id: string): Promise<IClassInfo | null> {
    await this.connect();
    const doc = await ClassInfoModel.findById(id).lean();
    return doc ? docToClass(doc as Record<string, unknown>) : null;
  }

  async updateClass(id: string, data: Partial<IClassInfo>): Promise<IClassInfo> {
    await this.connect();
    const doc = await ClassInfoModel.findByIdAndUpdate(id, data, { new: true }).lean();
    if (!doc) throw new Error("Class not found");
    return docToClass(doc as Record<string, unknown>);
  }

  async deleteClass(id: string): Promise<void> {
    await this.connect();
    await ClassInfoModel.findByIdAndDelete(id);
  }

  async toggleClass(id: string): Promise<IClassInfo> {
    await this.connect();
    const doc = await ClassInfoModel.findById(id);
    if (!doc) throw new Error("Class not found");
    doc.enabled = !doc.enabled;
    await doc.save();
    return docToClass(doc.toObject());
  }

  async createProfile(data: Omit<IBrowserProfile, "id" | "createdAt">): Promise<IBrowserProfile> {
    await this.connect();
    const doc = await BrowserProfileModel.create(data);
    return docToProfile(doc.toObject());
  }

  async findProfileByUserAndService(
    userId: string,
    service: "canvas" | "google"
  ): Promise<IBrowserProfile | null> {
    await this.connect();
    const doc = await BrowserProfileModel.findOne({ userId, service }).lean();
    return doc ? docToProfile(doc as Record<string, unknown>) : null;
  }

  async updateProfile(id: string, data: Partial<IBrowserProfile>): Promise<IBrowserProfile> {
    await this.connect();
    const doc = await BrowserProfileModel.findByIdAndUpdate(id, data, { new: true }).lean();
    if (!doc) throw new Error("Profile not found");
    return docToProfile(doc as Record<string, unknown>);
  }

  // Scrape sessions are in-memory for both backends
  async createScrapeSession(
    data: Omit<IScrapeSession, "id" | "createdAt" | "expiresAt">
  ): Promise<IScrapeSession> {
    const id = `session_${++sessionCounter}`;
    const session: IScrapeSession = {
      ...data,
      id,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    };
    scrapeSessions.set(id, session);
    return session;
  }

  async findScrapeSession(id: string): Promise<IScrapeSession | null> {
    return scrapeSessions.get(id) ?? null;
  }

  async findActiveScrapeSessionByUser(
    userId: string,
    service: "canvas" | "google"
  ): Promise<IScrapeSession | null> {
    for (const session of scrapeSessions.values()) {
      if (
        session.userId === userId &&
        session.service === service &&
        (session.status === "awaiting_login" || session.status === "scraping") &&
        new Date(session.expiresAt) > new Date()
      ) {
        return session;
      }
    }
    return null;
  }

  async updateScrapeSession(
    id: string,
    data: Partial<IScrapeSession>
  ): Promise<IScrapeSession> {
    const session = scrapeSessions.get(id);
    if (!session) throw new Error("Session not found");
    const updated = { ...session, ...data };
    scrapeSessions.set(id, updated);
    return updated;
  }
}
