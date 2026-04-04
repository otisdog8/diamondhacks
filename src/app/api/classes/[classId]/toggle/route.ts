import { withAuth } from "@/lib/auth/middleware";
import { repo } from "@/lib/db";

export const PATCH = withAuth(async (req, user) => {
  const url = new URL(req.url);
  const segments = url.pathname.split("/");
  const classId = segments[segments.indexOf("classes") + 1];
  const cls = await repo.findClassById(classId);
  if (!cls || cls.userId !== user.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  const updated = await repo.toggleClass(classId);
  return Response.json({ class: updated });
});
