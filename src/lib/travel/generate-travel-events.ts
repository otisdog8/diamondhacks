import { parseLocationToBuilding, getWalkingMinutes, locationLabel } from "./walking-times";
import type { CalendarEvent, EventType } from "@/components/calendar-view/types";
import type { TravelPreferences } from "@/hooks/useTravelPreferences";

const PEAK_BUFFER = 0;

/** Check if travel should be generated for a given event type based on prefs */
function isTravelEnabledForType(type: string, prefs: TravelPreferences): boolean {
  switch (type) {
    case "lecture": return prefs.travelForLectures;
    case "discussion": return prefs.travelForDiscussions;
    case "lab": return prefs.travelForLabs;
    case "office_hours": return prefs.travelForOfficeHours;
    default: return false;
  }
}

/** Class-type events that participate in the travel system at all */
const CLASS_TYPES = new Set(["lecture", "discussion", "lab", "office_hours"]);

/**
 * Generate "travel" calendar events before each class event.
 *
 * Rules:
 * - First event of the day with travel enabled: travel from homeBase.
 * - Subsequent: travel from the previous event that HAS travel enabled (skipping
 *   events without travel, like OH when OH travel is off).
 * - If there's a location override matching the gap duration, use that location
 *   as the origin instead (e.g. "I'll be at Geisel during long gaps").
 * - Same building = skip.
 */
export function generateTravelEvents(
  classEvents: CalendarEvent[],
  homeBase: string | null,
  prefs: TravelPreferences,
): CalendarEvent[] {
  if (classEvents.length === 0 || !prefs.travelEventsEnabled) return [];

  // Group events by calendar date
  const byDate = new Map<string, CalendarEvent[]>();
  for (const ev of classEvents) {
    if (!CLASS_TYPES.has(ev.type)) continue;
    const dateKey = ev.startTime.toISOString().split("T")[0];
    let arr = byDate.get(dateKey);
    if (!arr) { arr = []; byDate.set(dateKey, arr); }
    arr.push(ev);
  }

  const travelEvents: CalendarEvent[] = [];

  for (const [, dayEvents] of byDate) {
    const sorted = [...dayEvents].sort(
      (a, b) => a.startTime.getTime() - b.startTime.getTime(),
    );

    // Track the last event that had travel enabled — this is the "known location"
    let lastTravelOriginBuilding: string | null = null;
    let lastTravelOriginEndTime: Date | null = null;

    for (let i = 0; i < sorted.length; i++) {
      const classEv = sorted[i];
      const wantTravel = isTravelEnabledForType(classEv.type, prefs);
      const isSkipped = prefs.skippedEventIds.includes(classEv.id);

      if (!wantTravel || isSkipped) {
        continue;
      }

      const toBuilding = classEv.location
        ? parseLocationToBuilding(classEv.location)
        : null;
      if (!toBuilding) {
        // Unknown destination — skip travel but mark as origin for next
        lastTravelOriginBuilding = null;
        lastTravelOriginEndTime = classEv.endTime;
        continue;
      }

      // Determine origin
      let fromName: string | null;
      let prevEndTime: Date | null;

      if (lastTravelOriginBuilding) {
        // Use the last event with travel enabled as origin
        fromName = lastTravelOriginBuilding;
        prevEndTime = lastTravelOriginEndTime;
      } else {
        // First travel-enabled event of the day — use home base
        fromName = homeBase;
        prevEndTime = null;
      }

      // Check location overrides: if gap is long enough, user may be elsewhere
      if (fromName && prevEndTime) {
        const gapMinutes = (classEv.startTime.getTime() - prevEndTime.getTime()) / 60_000;
        for (const override of prefs.locationOverrides) {
          if (gapMinutes >= override.minGapMinutes) {
            fromName = override.location;
            break;
          }
        }
      }

      if (!fromName || fromName === toBuilding) {
        // Same building or no origin — no travel event, but update origin
        lastTravelOriginBuilding = toBuilding;
        lastTravelOriginEndTime = classEv.endTime;
        continue;
      }

      const walkMins = getWalkingMinutes(fromName, toBuilding);
      if (walkMins == null || walkMins === 0) {
        lastTravelOriginBuilding = toBuilding;
        lastTravelOriginEndTime = classEv.endTime;
        continue;
      }

      const totalMins = walkMins + PEAK_BUFFER;
      const endTime = new Date(classEv.startTime);
      let startTime = new Date(endTime.getTime() - totalMins * 60_000);

      let tight = false;
      if (prevEndTime && startTime < prevEndTime) {
        startTime = new Date(prevEndTime);
        tight = true;
      }

      const fromLabel = locationLabel(fromName);
      const toLabel = locationLabel(toBuilding);
      const tightTag = tight ? " (tight)" : "";

      travelEvents.push({
        id: `travel-${classEv.id}`,
        title: `${fromName} → ${toBuilding}${tightTag}`,
        startTime,
        endTime,
        type: "travel" as EventType,
        location: `${fromLabel} → ${toLabel}`,
        description: `${walkMins} min walk`,
        classCode: classEv.classCode,
      });

      // Update origin tracking
      lastTravelOriginBuilding = toBuilding;
      lastTravelOriginEndTime = classEv.endTime;
    }
  }

  return travelEvents;
}
