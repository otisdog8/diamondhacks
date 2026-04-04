import { withAuth } from "@/lib/auth/middleware";

export const GET = withAuth(async (_req, user) => {
  return Response.json({
    user: { id: user.id, username: user.username },
  });
});
