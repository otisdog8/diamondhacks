import { withAuth } from "@/lib/auth/middleware";
import { repo } from "@/lib/db";

export const GET = withAuth(async (_req, user) => {
  const profile = await repo.findProfileByUserAndService(user.id, "canvas");
  if (!profile) {
    return Response.json({ profile: null });
  }
  return Response.json({ profile });
});
