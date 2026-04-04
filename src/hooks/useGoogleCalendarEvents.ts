"use client";

import { useState, useEffect, useCallback } from "react";

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
  allDay: boolean;
  recurringEventId?: string;
  colorId?: string;
}

export function useGoogleCalendarEvents(calendarId?: string) {
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (calendarId) params.set("calendarId", calendarId);

      const res = await fetch(`/api/calendar/events?${params}`);
      if (!res.ok) {
        if (res.status === 401) {
          setConnected(false);
          setEvents([]);
          return;
        }
        throw new Error("Failed to fetch calendar events");
      }

      const data = await res.json();
      setConnected(data.connected ?? false);
      setEvents(data.events ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [calendarId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return { events, loading, error, connected, refetch: fetchEvents };
}
