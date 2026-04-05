// Static UCSD campus walking times from Google Maps Distance Matrix API.
// See ucsd_walking_times.md for source data.

// ── Canonical building/residence names ───────────────────────────────────────

export const ALL_BUILDINGS = [
  "WLH", "Center", "Ledden", "Jeannie", "Solis", "Galbraith", "York",
  "Mosaic", "Peterson", "Mandeville", "PepCanyon", "CSB", "FAH", "CSE", "RWAC",
] as const;

export const ALL_RESIDENCES = [
  "Revelle", "Muir", "Sixth", "Marshall", "ERC", "WarrenRes",
  "Seventh", "Village", "I-House",
] as const;

export const ALL_LANDMARKS = ["Geisel", "Price"] as const;

export type BuildingName = (typeof ALL_BUILDINGS)[number];
export type ResidenceName = (typeof ALL_RESIDENCES)[number];
export type LocationName = BuildingName | ResidenceName | (typeof ALL_LANDMARKS)[number];

// ── Walking time matrices (minutes) ─────────────────────────────────────────

/** Lecture hall -> Lecture hall */
const HALL_TO_HALL: Record<string, Record<string, number>> = {
  WLH:        { WLH: 0, Center: 9, Ledden: 13, Jeannie: 11, Solis: 9, Galbraith: 18, York: 19, Mosaic: 12, Peterson: 10, Mandeville: 9, PepCanyon: 4, CSB: 10, FAH: 7, CSE: 3, RWAC: 11 },
  Center:     { WLH: 8, Center: 0, Ledden: 8, Jeannie: 8, Solis: 9, Galbraith: 12, York: 12, Mosaic: 9, Peterson: 9, Mandeville: 4, PepCanyon: 8, CSB: 9, FAH: 12, CSE: 10, RWAC: 8 },
  Ledden:     { WLH: 12, Center: 7, Ledden: 0, Jeannie: 3, Solis: 7, Galbraith: 12, York: 13, Mosaic: 2, Peterson: 5, Mandeville: 5, PepCanyon: 12, CSB: 8, FAH: 15, CSE: 13, RWAC: 4 },
  Jeannie:    { WLH: 10, Center: 7, Ledden: 2, Jeannie: 0, Solis: 5, Galbraith: 11, York: 12, Mosaic: 1, Peterson: 3, Mandeville: 4, PepCanyon: 12, CSB: 6, FAH: 14, CSE: 11, RWAC: 2 },
  Solis:      { WLH: 8, Center: 8, Ledden: 7, Jeannie: 5, Solis: 0, Galbraith: 14, York: 16, Mosaic: 6, Peterson: 3, Mandeville: 7, PepCanyon: 10, CSB: 1, FAH: 12, CSE: 10, RWAC: 4 },
  Galbraith:  { WLH: 16, Center: 11, Ledden: 11, Jeannie: 11, Solis: 14, Galbraith: 0, York: 4, Mosaic: 12, Peterson: 12, Mandeville: 10, PepCanyon: 17, CSB: 15, FAH: 20, CSE: 18, RWAC: 12 },
  York:       { WLH: 18, Center: 11, Ledden: 13, Jeannie: 13, Solis: 16, Galbraith: 5, York: 0, Mosaic: 13, Peterson: 14, Mandeville: 12, PepCanyon: 17, CSB: 17, FAH: 22, CSE: 20, RWAC: 13 },
  Mosaic:     { WLH: 11, Center: 8, Ledden: 2, Jeannie: 2, Solis: 6, Galbraith: 12, York: 13, Mosaic: 0, Peterson: 4, Mandeville: 5, PepCanyon: 13, CSB: 7, FAH: 15, CSE: 12, RWAC: 3 },
  Peterson:   { WLH: 8, Center: 8, Ledden: 5, Jeannie: 3, Solis: 3, Galbraith: 12, York: 13, Mosaic: 4, Peterson: 0, Mandeville: 5, PepCanyon: 10, CSB: 4, FAH: 12, CSE: 10, RWAC: 4 },
  Mandeville: { WLH: 8, Center: 3, Ledden: 5, Jeannie: 5, Solis: 7, Galbraith: 11, York: 12, Mosaic: 5, Peterson: 5, Mandeville: 0, PepCanyon: 9, CSB: 7, FAH: 12, CSE: 10, RWAC: 5 },
  PepCanyon:  { WLH: 4, Center: 9, Ledden: 14, Jeannie: 14, Solis: 12, Galbraith: 19, York: 18, Mosaic: 14, Peterson: 12, Mandeville: 10, PepCanyon: 0, CSB: 12, FAH: 10, CSE: 7, RWAC: 14 },
  CSB:        { WLH: 8, Center: 8, Ledden: 8, Jeannie: 6, Solis: 1, Galbraith: 15, York: 16, Mosaic: 6, Peterson: 4, Mandeville: 7, PepCanyon: 10, CSB: 0, FAH: 12, CSE: 10, RWAC: 4 },
  FAH:        { WLH: 7, Center: 13, Ledden: 18, Jeannie: 16, Solis: 14, Galbraith: 23, York: 24, Mosaic: 17, Peterson: 15, Mandeville: 14, PepCanyon: 11, CSB: 14, FAH: 0, CSE: 4, RWAC: 16 },
  CSE:        { WLH: 4, Center: 10, Ledden: 15, Jeannie: 13, Solis: 11, Galbraith: 20, York: 21, Mosaic: 14, Peterson: 12, Mandeville: 11, PepCanyon: 8, CSB: 12, FAH: 4, CSE: 0, RWAC: 13 },
  RWAC:       { WLH: 10, Center: 7, Ledden: 4, Jeannie: 2, Solis: 3, Galbraith: 12, York: 13, Mosaic: 3, Peterson: 4, Mandeville: 5, PepCanyon: 12, CSB: 4, FAH: 13, CSE: 12, RWAC: 0 },
};

/** Residence -> Lecture hall */
const RES_TO_HALL: Record<string, Record<string, number>> = {
  Revelle:    { WLH: 15, Center: 10, Ledden: 10, Jeannie: 10, Solis: 13, Galbraith: 3, York: 6, Mosaic: 10, Peterson: 11, Mandeville: 9, PepCanyon: 16, CSB: 13, FAH: 19, CSE: 17, RWAC: 10 },
  Muir:       { WLH: 13, Center: 10, Ledden: 4, Jeannie: 4, Solis: 9, Galbraith: 12, York: 13, Mosaic: 3, Peterson: 7, Mandeville: 8, PepCanyon: 15, CSB: 9, FAH: 17, CSE: 15, RWAC: 6 },
  Sixth:      { WLH: 13, Center: 10, Ledden: 4, Jeannie: 4, Solis: 7, Galbraith: 14, York: 15, Mosaic: 2, Peterson: 6, Mandeville: 7, PepCanyon: 15, CSB: 7, FAH: 17, CSE: 14, RWAC: 5 },
  Marshall:   { WLH: 15, Center: 14, Ledden: 8, Jeannie: 8, Solis: 8, Galbraith: 18, York: 19, Mosaic: 7, Peterson: 9, Mandeville: 11, PepCanyon: 18, CSB: 9, FAH: 17, CSE: 17, RWAC: 8 },
  ERC:        { WLH: 17, Center: 18, Ledden: 12, Jeannie: 12, Solis: 11, Galbraith: 22, York: 23, Mosaic: 10, Peterson: 12, Mandeville: 15, PepCanyon: 21, CSB: 11, FAH: 16, CSE: 18, RWAC: 11 },
  WarrenRes:  { WLH: 8, Center: 15, Ledden: 20, Jeannie: 17, Solis: 16, Galbraith: 24, York: 26, Mosaic: 18, Peterson: 16, Mandeville: 16, PepCanyon: 12, CSB: 16, FAH: 4, CSE: 5, RWAC: 18 },
  Seventh:    { WLH: 20, Center: 22, Ledden: 16, Jeannie: 15, Solis: 15, Galbraith: 25, York: 27, Mosaic: 14, Peterson: 16, Mandeville: 19, PepCanyon: 24, CSB: 15, FAH: 19, CSE: 21, RWAC: 14 },
  Village:    { WLH: 20, Center: 22, Ledden: 16, Jeannie: 15, Solis: 15, Galbraith: 25, York: 27, Mosaic: 14, Peterson: 16, Mandeville: 18, PepCanyon: 24, CSB: 15, FAH: 18, CSE: 20, RWAC: 14 },
  "I-House":  { WLH: 16, Center: 15, Ledden: 9, Jeannie: 9, Solis: 8, Galbraith: 20, York: 21, Mosaic: 8, Peterson: 9, Mandeville: 13, PepCanyon: 18, CSB: 9, FAH: 14, CSE: 16, RWAC: 8 },
};

/** Residence -> Residence */
const RES_TO_RES: Record<string, Record<string, number>> = {
  Revelle:   { Revelle: 0, Muir: 9, Sixth: 12, Marshall: 16, ERC: 20, WarrenRes: 21, Seventh: 23, Village: 23, "I-House": 18 },
  Muir:      { Revelle: 9, Muir: 0, Sixth: 4, Marshall: 8, ERC: 11, WarrenRes: 19, Seventh: 15, Village: 15, "I-House": 9 },
  Sixth:     { Revelle: 12, Muir: 4, Sixth: 0, Marshall: 5, ERC: 8, WarrenRes: 18, Seventh: 12, Village: 12, "I-House": 6 },
  Marshall:  { Revelle: 16, Muir: 8, Sixth: 5, Marshall: 0, ERC: 5, WarrenRes: 19, Seventh: 9, Village: 9, "I-House": 3 },
  ERC:       { Revelle: 20, Muir: 12, Sixth: 9, Marshall: 6, ERC: 0, WarrenRes: 18, Seventh: 5, Village: 5, "I-House": 4 },
  WarrenRes: { Revelle: 23, Muir: 20, Sixth: 20, Marshall: 21, ERC: 19, WarrenRes: 0, Seventh: 22, Village: 22, "I-House": 18 },
  Seventh:   { Revelle: 23, Muir: 15, Sixth: 12, Marshall: 10, ERC: 5, WarrenRes: 21, Seventh: 0, Village: 1, "I-House": 8 },
  Village:   { Revelle: 23, Muir: 15, Sixth: 12, Marshall: 9, ERC: 5, WarrenRes: 21, Seventh: 1, Village: 0, "I-House": 8 },
  "I-House": { Revelle: 18, Muir: 9, Sixth: 6, Marshall: 3, ERC: 3, WarrenRes: 17, Seventh: 7, Village: 7, "I-House": 0 },
};

/** Landmark -> Building/Residence */
const LANDMARK_TO_ALL: Record<string, Record<string, number>> = {
  Geisel: { WLH: 6, Center: 6, Ledden: 8, Jeannie: 6, Solis: 4, Galbraith: 15, York: 17, Mosaic: 7, Peterson: 5, Mandeville: 7, PepCanyon: 9, CSB: 4, FAH: 10, CSE: 8, RWAC: 7, Revelle: 14, Muir: 9, Sixth: 9, Marshall: 12, ERC: 14, WarrenRes: 12, Seventh: 17, Village: 17, "I-House": 12 },
  Price:  { WLH: 4, Center: 4, Ledden: 9, Jeannie: 9, Solis: 8, Galbraith: 14, York: 15, Mosaic: 10, Peterson: 8, Mandeville: 5, PepCanyon: 5, CSB: 8, FAH: 10, CSE: 7, RWAC: 9, Revelle: 13, Muir: 12, Sixth: 12, Marshall: 15, ERC: 18, WarrenRes: 11, Seventh: 22, Village: 22, "I-House": 16 },
};

// ── Location string → canonical name alias map ──────────────────────────────

const ALIAS_MAP: Record<string, string> = {
  // Buildings — common schedule prefixes
  "PETER": "Peterson", "PETE": "Peterson", "PETERSON": "Peterson",
  "CENTR": "Center", "CENTER": "Center", "CENTRE": "Center",
  "WLH": "WLH", "WARREN LECTURE": "WLH",
  "MOS": "Mosaic", "MOSAIC": "Mosaic",
  "SOLIS": "Solis",
  "CSE": "CSE",
  "FAH": "FAH", "FRANKLIN": "FAH",
  "GALB": "Galbraith", "GALBRAITH": "Galbraith",
  "YORK": "York",
  "LEDDEN": "Ledden", "LEDD": "Ledden",
  "JEANNIE": "Jeannie", "NTPLL": "Jeannie",
  "MANDE": "Mandeville", "MANDEVILLE": "Mandeville",
  "PCYNH": "PepCanyon", "PEPPER": "PepCanyon", "PEP": "PepCanyon", "PEPCANYON": "PepCanyon",
  "CSB": "CSB", "COG": "CSB", "COGNITIVE": "CSB",
  "RWAC": "RWAC", "RIDGE": "RWAC",
  // Residences
  "REVELLE": "Revelle",
  "MUIR": "Muir", "TIOGA": "Muir",
  "SIXTH": "Sixth",
  "MARSHALL": "Marshall",
  "ERC": "ERC", "ELEANOR": "ERC",
  "WARRENRES": "WarrenRes", "WARREN RES": "WarrenRes",
  "SEVENTH": "Seventh",
  "VILLAGE": "Village",
  "I-HOUSE": "I-House", "IHOUSE": "I-House", "INTERNATIONAL": "I-House",
  // Landmarks
  "GEISEL": "Geisel",
  "PRICE": "Price",
  // Extra schedule aliases
  "DIB": "CSB",  // Design & Innovation Building, near CSB
  "COA": "Mosaic", // Center of Arts, part of NTPLL/Mosaic complex
  // Full building name fragments (from Google Calendar / full addresses)
  "COMPUTER SCIENCE": "CSE",
  "CENTER HALL": "Center",
  "CENTR HALL": "Center",
  "PEPPER CANYON": "PepCanyon",
  "PETERSON HALL": "Peterson",
  "MANDEVILLE AUD": "Mandeville",
  "GALBRAITH HALL": "Galbraith",
  "YORK HALL": "York",
  "SOLIS HALL": "Solis",
  "COGNITIVE SCIENCE": "CSB",
  "FRANKLIN ANTONIO": "FAH",
  "GEISEL LIBRARY": "Geisel",
  "PRICE CENTER": "Price",
  "MOSAIC HALL": "Mosaic",
  "LEDDEN AUD": "Ledden",
  "JEANNIE HALL": "Jeannie",
  "RIDGE WALK": "RWAC",
  // Common abbreviations from Google Calendar
  "EBU3B": "CSE",
  "EBU3": "CSE",
  "EBUI": "CSE",
  "APM": "Mandeville", // close enough
};

/**
 * Parse a location string like "PETER 108" or "Mosaic MOS 0113" to a canonical building name.
 * Returns null if unrecognized.
 */
export function parseLocationToBuilding(location: string): string | null {
  if (!location) return null;
  const normalized = location.trim().toUpperCase();
  const words = normalized.split(/[\s,/]+/).filter(Boolean);

  // Try 2-word sliding window (e.g., "COMPUTER SCIENCE", "CENTER HALL", "WARREN LECTURE")
  for (let i = 0; i < words.length - 1; i++) {
    const pair = `${words[i]} ${words[i + 1]}`;
    if (ALIAS_MAP[pair]) return ALIAS_MAP[pair];
  }

  // Try each word individually
  for (const word of words) {
    if (ALIAS_MAP[word]) return ALIAS_MAP[word];
  }

  return null;
}

/**
 * Look up walking time in minutes between two canonical location names.
 * Checks all matrices (hall↔hall, res→hall, res↔res, landmark→all).
 * Returns null if either location is unknown.
 */
export function getWalkingMinutes(from: string, to: string): number | null {
  if (from === to) return 0;

  // Direct matrix lookups
  if (HALL_TO_HALL[from]?.[to] != null) return HALL_TO_HALL[from][to];
  if (RES_TO_HALL[from]?.[to] != null) return RES_TO_HALL[from][to];
  if (RES_TO_RES[from]?.[to] != null) return RES_TO_RES[from][to];
  if (LANDMARK_TO_ALL[from]?.[to] != null) return LANDMARK_TO_ALL[from][to];

  // Reverse: hall → residence (use res→hall data, approximately symmetric)
  if (RES_TO_HALL[to]?.[from] != null) return RES_TO_HALL[to][from];
  // Reverse: landmark
  if (LANDMARK_TO_ALL[to]?.[from] != null) return LANDMARK_TO_ALL[to][from];

  return null;
}

/** Human-readable label for a canonical location name */
export function locationLabel(name: string): string {
  const labels: Record<string, string> = {
    WLH: "Warren Lecture Hall",
    PepCanyon: "Pepper Canyon Hall",
    WarrenRes: "Warren Residence",
    "I-House": "International House",
    ERC: "Eleanor Roosevelt College",
    CSB: "Cognitive Science Building",
    FAH: "Franklin Antonio Hall",
    CSE: "CSE Building",
    RWAC: "Ridge Walk (RWAC)",
  };
  return labels[name] ?? name;
}
