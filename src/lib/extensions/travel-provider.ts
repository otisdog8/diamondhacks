// ============================================================
// ITravelTimeProvider implementation
// Drop into src/lib/extensions/travel-provider.ts
//
// Requires: GOOGLE_MAPS_API_KEY in .env.local
// ============================================================
import { v4 as uuidv4 } from "uuid";
import { repo } from "@/lib/db";
import type { ITravelSegment, ITravelTimeProvider } from "./types";
import type { IClassInfo } from "@/lib/db/types";

const segmentsStore = new Map<string, ITravelSegment>();

function now(): string {
  return new Date().toISOString();
}

// Time string "14:00" → total minutes since midnight
function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

// Given an ordered list of classes on the same day, find back-to-back pairs
function findConsecutivePairs(classes: IClassInfo[]): Array<[IClassInfo, IClassInfo]> {
  // Flatten all schedule slots with their parent class
  type Slot = { cls: IClassInfo; day: number; startMin: number; endMin: number; location: string };
  const slots: Slot[] = [];

  for (const cls of classes) {
    for (const sched of cls.schedule) {
      if (sched.location) {
        slots.push({
          cls,
          day: sched.dayOfWeek,
          startMin: timeToMinutes(sched.startTime),
          endMin: timeToMinutes(sched.endTime),
          location: sched.location,
        });
      }
    }
  }

  // Sort by day then start time
  slots.sort((a, b) => a.day - b.day || a.startMin - b.startMin);

  const pairs: Array<[IClassInfo, IClassInfo]> = [];
  for (let i = 0; i < slots.length - 1; i++) {
    const a = slots[i];
    const b = slots[i + 1];
    if (a.day === b.day && a.cls.id !== b.cls.id) {
      pairs.push([a.cls, b.cls]);
    }
  }
  return pairs;
}

async function fetchWalkingTime(
  origin: string,
  destination: string
): Promise<{ walking: number; transit?: number }> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    // Fallback: estimate 10 min per km based on string similarity (dev mode)
    return { walking: 10 };
  }

  const base = "https://maps.googleapis.com/maps/api/distancematrix/json";
  const params = new URLSearchParams({
    origins: origin,
    destinations: destination,
    mode: "walking",
    key: apiKey,
  });

  const res = await fetch(`${base}?${params}`);
  const data = await res.json();

  const element = data?.rows?.[0]?.elements?.[0];
  if (!element || element.status !== "OK") {
    return { walking: 10 }; // fallback
  }

  const walkingSeconds = element.duration?.value ?? 600;

  // Also fetch transit time
  const transitParams = new URLSearchParams({
    origins: origin,
    destinations: destination,
    mode: "transit",
    key: apiKey,
  });
  let transitMinutes: number | undefined;
  try {
    const transitRes = await fetch(`${base}?${transitParams}`);
    const transitData = await transitRes.json();
    const tElement = transitData?.rows?.[0]?.elements?.[0];
    if (tElement?.status === "OK") {
      transitMinutes = Math.ceil((tElement.duration?.value ?? 0) / 60);
    }
  } catch {
    // ignore transit errors
  }

  return {
    walking: Math.ceil(walkingSeconds / 60),
    transit: transitMinutes,
  };
}

export const travelProvider: ITravelTimeProvider = {
  async getSegmentsForUser(userId) {
    return [...segmentsStore.values()].filter((s) => s.userId === userId);
  },

  async computeSegments(userId) {
    const classes = await repo.findClassesByUserId(userId);
    const enabledClasses = classes.filter((c) => c.enabled);
    const pairs = findConsecutivePairs(enabledClasses);

    const results: ITravelSegment[] = [];

    for (const [from, to] of pairs) {
      // Find the schedule slot with location for each class
      const fromSlot = from.schedule.find((s) => s.location);
      const toSlot = to.schedule.find((s) => s.location);
      if (!fromSlot?.location || !toSlot?.location) continue;

      // Compute gap between classes
      const fromEndMin = timeToMinutes(fromSlot.endTime);
      const toStartMin = timeToMinutes(toSlot.startTime);
      const gapMinutes = toStartMin - fromEndMin;

      const times = await fetchWalkingTime(
        `${fromSlot.location}, UC San Diego`,
        `${toSlot.location}, UC San Diego`
      );

      const segment: ITravelSegment = {
        id: uuidv4(),
        userId,
        fromClassId: from.id,
        toClassId: to.id,
        fromLocation: fromSlot.location,
        toLocation: toSlot.location,
        walkingMinutes: times.walking,
        transitMinutes: times.transit,
        bufferWarning: gapMinutes < times.walking + 5,
        gapMinutes,
        updatedAt: now(),
      };

      // Replace existing segment for same pair
      const existingKey = [...segmentsStore.entries()].find(
        ([, s]) =>
          s.userId === userId &&
          s.fromClassId === from.id &&
          s.toClassId === to.id
      )?.[0];
      if (existingKey) segmentsStore.delete(existingKey);

      segmentsStore.set(segment.id, segment);
      results.push(segment);
    }

    return results;
  },

  async refreshSegment(segmentId) {
    const seg = segmentsStore.get(segmentId);
    if (!seg) return null;

    const times = await fetchWalkingTime(
      `${seg.fromLocation}, UC San Diego`,
      `${seg.toLocation}, UC San Diego`
    );

    const updated: ITravelSegment = {
      ...seg,
      walkingMinutes: times.walking,
      transitMinutes: times.transit,
      bufferWarning: seg.gapMinutes < times.walking + 5,
      updatedAt: now(),
    };
    segmentsStore.set(segmentId, updated);
    return updated;
  },
};
