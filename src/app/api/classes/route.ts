import { withAuth } from "@/lib/auth/middleware";
import { repo } from "@/lib/db";

export const GET = withAuth(async (_req, user) => {
  const classes = await repo.findClassesByUserId(user.id);
  return Response.json({ classes });
});

export const POST = withAuth(async (req, user) => {
  try {
    const body = await req.json();
    const cls = await repo.createClass({
      userId: user.id,
      canvasId: body.canvasId || "",
      name: body.name,
      code: body.code,
      instructor: body.instructor || "",
      term: body.term || "",
      enabled: body.enabled ?? true,
      schedule: body.schedule || [],
      rawData: body.rawData || {},
      externalLinks: body.externalLinks || [],
      syllabusUrl: body.syllabusUrl,
      description: body.description,
      scrapeDepth: body.scrapeDepth || 0,
    });
    return Response.json({ class: cls }, { status: 201 });
  } catch (error) {
    console.error("Create class error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
});
