"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useTravelPreferences } from "@/hooks/useTravelPreferences";
import { ALL_RESIDENCES, ALL_BUILDINGS, locationLabel } from "@/lib/travel/walking-times";
import type { LocationOverride } from "@/hooks/useTravelPreferences";
import { useState } from "react";

const TYPE_OPTIONS = [
  { key: "lectures", label: "Lectures", prefsKey: "travelForLectures" as const },
  { key: "discussions", label: "Discussions", prefsKey: "travelForDiscussions" as const },
  { key: "labs", label: "Labs", prefsKey: "travelForLabs" as const },
  { key: "officeHours", label: "Office Hours", prefsKey: "travelForOfficeHours" as const },
];

export default function SettingsPage() {
  const {
    prefs, setHomeBase, setTravelEnabled,
    setTravelForType, addLocationOverride, removeLocationOverride,
  } = useTravelPreferences();

  const [showAddOverride, setShowAddOverride] = useState(false);
  const [overrideGap, setOverrideGap] = useState("30");
  const [overrideLocation, setOverrideLocation] = useState("");

  const allLocations = [...ALL_RESIDENCES, ...ALL_BUILDINGS];

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Configure your campus location and travel preferences.
        </p>
      </div>

      {/* Residence */}
      <Card className="p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Your Residence</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Used to calculate walking time to your first class each day and for Google Calendar travel events.
          </p>
        </div>
        <select
          value={prefs.homeBase ?? ""}
          onChange={(e) => setHomeBase(e.target.value || null)}
          className="w-full max-w-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Not set</option>
          {ALL_RESIDENCES.map((r) => (
            <option key={r} value={r}>{locationLabel(r)}</option>
          ))}
        </select>
        {prefs.homeBase && (
          <p className="text-sm text-green-600">
            Walking times will be calculated from {locationLabel(prefs.homeBase)}.
          </p>
        )}
      </Card>

      {/* Travel Events */}
      <Card className="p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Travel Events</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Show walking time blocks before events in your calendar and daily timeline.
          </p>
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={prefs.travelEventsEnabled}
            onChange={(e) => setTravelEnabled(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">Enable travel blocks in calendar</span>
        </label>

        {prefs.travelEventsEnabled && (
          <>
            <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Show travel time before:
              </p>
              <div className="space-y-2">
                {TYPE_OPTIONS.map(({ key, label, prefsKey }) => (
                  <label key={key} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={prefs[prefsKey]}
                      onChange={(e) => setTravelForType(key, e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Location Overrides */}
      {prefs.travelEventsEnabled && (
        <Card className="p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Location Overrides</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              If you spend long gaps at a specific location (like the library), set a rule so travel is calculated from there instead.
            </p>
          </div>

          {prefs.locationOverrides.length > 0 && (
            <div className="space-y-2">
              {prefs.locationOverrides.map((o) => (
                <div key={o.id} className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2">
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    When gap &ge; <span className="font-medium">{o.minGapMinutes} min</span>,
                    walk from <span className="font-medium">{locationLabel(o.location)}</span>
                  </div>
                  <button
                    onClick={() => removeLocationOverride(o.id)}
                    className="text-red-400 hover:text-red-600 text-sm ml-2"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          {showAddOverride ? (
            <div className="space-y-3 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">When gap is at least</span>
                <input
                  type="number"
                  min={10}
                  max={180}
                  value={overrideGap}
                  onChange={(e) => setOverrideGap(e.target.value)}
                  className="w-16 text-center border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-sm"
                />
                <span className="text-gray-500">minutes, I'll be at:</span>
              </div>
              <select
                value={overrideLocation}
                onChange={(e) => setOverrideLocation(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
              >
                <option value="">Select location...</option>
                <optgroup label="Landmarks">
                  <option value="Geisel">{locationLabel("Geisel")}</option>
                  <option value="Price">{locationLabel("Price")}</option>
                </optgroup>
                <optgroup label="Buildings">
                  {ALL_BUILDINGS.map((b) => (
                    <option key={b} value={b}>{locationLabel(b)}</option>
                  ))}
                </optgroup>
                <optgroup label="Residences">
                  {ALL_RESIDENCES.map((r) => (
                    <option key={r} value={r}>{locationLabel(r)}</option>
                  ))}
                </optgroup>
              </select>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={!overrideLocation}
                  onClick={() => {
                    addLocationOverride({
                      minGapMinutes: parseInt(overrideGap) || 30,
                      location: overrideLocation,
                      label: locationLabel(overrideLocation),
                    });
                    setShowAddOverride(false);
                    setOverrideLocation("");
                    setOverrideGap("30");
                  }}
                >
                  Add Rule
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowAddOverride(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => setShowAddOverride(true)}>
              + Add Location Rule
            </Button>
          )}
        </Card>
      )}
    </div>
  );
}
