import { withAuth } from "@/lib/auth/middleware";
import { repo } from "@/lib/db";

export const GET = withAuth(async (_req, user) => {
  const url = new URL(_req.url);
  const classId = url.pathname.split("/").pop()!;
  const cls = await repo.findClassById(classId);
  if (!cls || cls.userId !== user.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  return Response.json({ class: cls });
});

export const PATCH = withAuth(async (req, user) => {
  const url = new URL(req.url);
  const segments = url.pathname.split("/");
  const classId = segments[segments.indexOf("classes") + 1];
  const cls = await repo.findClassById(classId);
  if (!cls || cls.userId !== user.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  const body = await req.json();
  const updated = await repo.updateClass(classId, body);
  return Response.json({ class: updated });
});

export const DELETE = withAuth(async (req, user) => {
  const url = new URL(req.url);
  const segments = url.pathname.split("/");
  const classId = segments[segments.indexOf("classes") + 1];
  const cls = await repo.findClassById(classId);
  if (!cls || cls.userId !== user.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  await repo.deleteClass(classId);
  return new Response(null, { status: 204 });
});
