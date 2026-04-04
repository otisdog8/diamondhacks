import type { IRepository } from "./types";
import { JsonRepository } from "./json/repository";
import { MongoRepository } from "./mongo/repository";

function createRepository(): IRepository {
  const mode = process.env.DEV_MODE || "json";
  if (mode === "json") {
    return new JsonRepository();
  }
  return new MongoRepository();
}

export const repo: IRepository = createRepository();
export type { IRepository } from "./types";
export type {
  IUser,
  IClassInfo,
  IBrowserProfile,
  IScrapeSession,
  ClassSchedule,
} from "./types";
