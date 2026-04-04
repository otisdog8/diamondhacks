import { cookies } from "next/headers";
import { verifyToken } from "./jwt";
import { repo } from "@/lib/db";
import type { IUser } from "@/lib/db/types";

export type AuthenticatedHandler = (
  req: Request,
  user: IUser
) => Promise<Response>;

export function withAuth(handler: AuthenticatedHandler) {
  return async (req: Request, context?: unknown) => {
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get("token")?.value;

      if (!token) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      const payload = verifyToken(token);
      const user = await repo.findUserById(payload.userId);

      if (!user) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      return handler(req, user);
    } catch {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  };
}
