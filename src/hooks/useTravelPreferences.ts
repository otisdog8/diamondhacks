"use client";

import { useState, useCallback, useEffect } from "react";

export interface LocationOverride {
  id: string;
  minGapMinutes: number;
  location: string;  // canonical building name
  label: string;     // user-friendly label
}

export interface TravelPreferences {
  homeBase: string | null;
  travelEventsEnabled: boolean;
  travelForLectures: boolean;
  travelForDiscussions: boolean;
  travelForLabs: boolean;
  travelForOfficeHours: boolean;
  locationOverrides: LocationOverride[];
  /** Event IDs the user has chosen to skip (not attend / no travel needed) */
  skippedEventIds: string[];
}

const STORAGE_KEY = "inbtwn_travel_prefs";

const DEFAULT_PREFS: TravelPreferences = {
  homeBase: null,
  travelEventsEnabled: true,
  travelForLectures: true,
  travelForDiscussions: true,
  travelForLabs: true,
  travelForOfficeHours: false,
  locationOverrides: [],
  skippedEventIds: [],
};

function loadPrefs(): TravelPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFS;
  }
}

function savePrefs(prefs: TravelPreferences) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export function useTravelPreferences() {
  const [prefs, setPrefs] = useState<TravelPreferences>(DEFAULT_PREFS);

  useEffect(() => {
    setPrefs(loadPrefs());
  }, []);

  const update = useCallback((patch: Partial<TravelPreferences>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      savePrefs(next);
      return next;
    });
  }, []);

  const setHomeBase = useCallback((homeBase: string | null) => update({ homeBase }), [update]);
  const setTravelEnabled = useCallback((travelEventsEnabled: boolean) => update({ travelEventsEnabled }), [update]);

  const setTravelForType = useCallback((type: string, enabled: boolean) => {
    const map: Record<string, keyof TravelPreferences> = {
      lectures: "travelForLectures",
      discussions: "travelForDiscussions",
      labs: "travelForLabs",
      officeHours: "travelForOfficeHours",
    };
    const key = map[type];
    if (key) update({ [key]: enabled } as Partial<TravelPreferences>);
  }, [update]);

  const addLocationOverride = useCallback((override: Omit<LocationOverride, "id">) => {
    setPrefs((prev) => {
      const next = {
        ...prev,
        locationOverrides: [...prev.locationOverrides, { ...override, id: `lo-${Date.now()}` }],
      };
      savePrefs(next);
      return next;
    });
  }, []);

  const removeLocationOverride = useCallback((id: string) => {
    setPrefs((prev) => {
      const next = {
        ...prev,
        locationOverrides: prev.locationOverrides.filter((o) => o.id !== id),
      };
      savePrefs(next);
      return next;
    });
  }, []);

  const toggleSkippedEvent = useCallback((eventId: string) => {
    setPrefs((prev) => {
      const has = prev.skippedEventIds.includes(eventId);
      const next = {
        ...prev,
        skippedEventIds: has
          ? prev.skippedEventIds.filter((id) => id !== eventId)
          : [...prev.skippedEventIds, eventId],
      };
      savePrefs(next);
      return next;
    });
  }, []);

  return {
    prefs,
    setHomeBase,
    setTravelEnabled,
    setTravelForType,
    addLocationOverride,
    removeLocationOverride,
    toggleSkippedEvent,
  };
}
