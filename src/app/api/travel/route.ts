// ============================================================
// Travel Time API
// Drop into src/app/api/travel/route.ts
// ============================================================
import { withAuth } from "@/lib/auth/middleware";
import { travelProvider } from "@/lib/extensions/travel-provider";

// GET /api/travel — get all computed segments for the user
export const GET = withAuth(async (_req, user) => {
  const segments = await travelProvider.getSegmentsForUser(user.id);
  return Response.json({ segments });
});

// POST /api/travel — recompute all segments
export const POST = withAuth(async (_req, user) => {
  try {
    const segments = await travelProvider.computeSegments(user.id);
    return Response.json({ segments, computed: segments.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to compute travel times";
    return Response.json({ error: message }, { status: 500 });
  }
});
