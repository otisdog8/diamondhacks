"""
UCSD Campus Walking Times — Google Maps Distance Matrix Edition
===============================================================
Fetches real walking directions between UCSD lecture halls, residential
halls, and key landmarks via the Google Maps Distance Matrix API, then
outputs a structured markdown file suitable for LLM context injection.

Usage:
    export GOOGLE_MAPS_API_KEY="your-key-here"
    python ucsd_walking_times.py

    # Or pass inline:
    python ucsd_walking_times.py --api-key YOUR_KEY

    # Optional: choose output format
    python ucsd_walking_times.py --format md       # markdown (default)
    python ucsd_walking_times.py --format json     # raw JSON

Prerequisites:
    pip install requests

API quota note:
    The Distance Matrix API limits each request to 25 origins, 25
    destinations, and 100 total elements (origins × destinations).
    We batch in 10×10 chunks → 9 API calls for 26 buildings.
    Total elements = 26×26 = 676, well within the free-tier daily limit of 2,500.
    Cost at pay-as-you-go: $5 per 1,000 elements → ~$3.40 for a full run.
"""

import argparse
import itertools
import json
import math
import os
import sys
import time
from typing import Any

import requests

# ── Building coordinates ────────────────────────────────────────────────

BUILDINGS: dict[str, dict[str, Any]] = {
    # ── Lecture Halls ──
    "Warren Lecture Hall (WLH)":        {"lat": 32.88059, "lng": -117.23442, "category": "lecture"},
    "Center Hall":                      {"lat": 32.87755, "lng": -117.23741, "category": "lecture"},
    "Ledden Auditorium (York Hall)":    {"lat": 32.87886, "lng": -117.24169, "category": "lecture"},
    "Jeannie Hall (NTPLL)":             {"lat": 32.87987, "lng": -117.24120, "category": "lecture"},
    "Solis Hall":                       {"lat": 32.88091, "lng": -117.23978, "category": "lecture"},
    "Galbraith Hall":                   {"lat": 32.87363, "lng": -117.24124, "category": "lecture"},
    "York Hall":                        {"lat": 32.87424, "lng": -117.23993, "category": "lecture"},
    "Mosaic Hall (NTPLL)":              {"lat": 32.87992, "lng": -117.24192, "category": "lecture"},
    "Peterson Hall":                    {"lat": 32.87997, "lng": -117.24024, "category": "lecture"},
    "Mandeville Auditorium":            {"lat": 32.87783, "lng": -117.23943, "category": "lecture"},
    "Pepper Canyon Hall":               {"lat": 32.87838, "lng": -117.23376, "category": "lecture"},
    "Cognitive Science Building (CSB)": {"lat": 32.88058, "lng": -117.23954, "category": "lecture"},
    "Franklin Antonio Hall (FAH)":      {"lat": 32.88350, "lng": -117.23491, "category": "lecture"},
    "CSE Building":                     {"lat": 32.88180, "lng": -117.23352, "category": "lecture"},
    "RWAC (Ridge Walk)":                {"lat": 32.88039, "lng": -117.24107, "category": "lecture"},

    # ── Residential ──
    "Revelle College Res Halls":        {"lat": 32.87497, "lng": -117.24172, "category": "residence"},
    "Muir College (Tioga Hall)":        {"lat": 32.87904, "lng": -117.24337, "category": "residence"},
    "Sixth College Res Hall":           {"lat": 32.88057, "lng": -117.24283, "category": "residence"},
    "Marshall Res Halls":               {"lat": 32.88300, "lng": -117.24267, "category": "residence"},
    "ERC (Eleanor Roosevelt)":          {"lat": 32.88514, "lng": -117.24288, "category": "residence"},
    "Warren College Res":               {"lat": 32.88400, "lng": -117.23325, "category": "residence"},
    "Seventh College Res":              {"lat": 32.88804, "lng": -117.24254, "category": "residence"},
    "The Village (upper-div)":          {"lat": 32.88796, "lng": -117.24255, "category": "residence"},
    "International House":              {"lat": 32.88402, "lng": -117.24217, "category": "residence"},

    # ── Landmarks ──
    "Geisel Library":                   {"lat": 32.88118, "lng": -117.23759, "category": "landmark"},
    "Price Center":                     {"lat": 32.87957, "lng": -117.23647, "category": "landmark"},
}

ALIASES = {
    "Center Hall": "Center",
    "Cognitive Science Building (CSB)": "CSB",
    "CSE Building": "CSE",
    "Franklin Antonio Hall (FAH)": "FAH",
    "Galbraith Hall": "Galbraith",
    "Jeannie Hall (NTPLL)": "Jeannie",
    "Ledden Auditorium (York Hall)": "Ledden",
    "Mandeville Auditorium": "Mandeville",
    "Mosaic Hall (NTPLL)": "Mosaic",
    "Pepper Canyon Hall": "PepCanyon",
    "Peterson Hall": "Peterson",
    "RWAC (Ridge Walk)": "RWAC",
    "Solis Hall": "Solis",
    "Warren Lecture Hall (WLH)": "WLH",
    "York Hall": "York",
    "ERC (Eleanor Roosevelt)": "ERC",
    "International House": "I-House",
    "Marshall Res Halls": "Marshall",
    "Muir College (Tioga Hall)": "Muir",
    "Revelle College Res Halls": "Revelle",
    "Seventh College Res": "Seventh",
    "Sixth College Res Hall": "Sixth",
    "The Village (upper-div)": "Village",
    "Warren College Res": "WarrenRes",
    "Geisel Library": "Geisel",
    "Price Center": "Price",
}

# ── Google Maps API helpers ─────────────────────────────────────────────

DISTANCE_MATRIX_URL = "https://maps.googleapis.com/maps/api/distancematrix/json"


def to_latlng(name: str) -> str:
    b = BUILDINGS[name]
    return f"{b['lat']},{b['lng']}"


def fetch_distance_matrix(
    origins: list[str],
    destinations: list[str],
    api_key: str,
) -> dict:
    """Call the Distance Matrix API for one origin×destination batch."""
    params = {
        "origins": "|".join(to_latlng(o) for o in origins),
        "destinations": "|".join(to_latlng(d) for d in destinations),
        "mode": "walking",
        "units": "metric",
        "key": api_key,
    }
    resp = requests.get(DISTANCE_MATRIX_URL, params=params, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    if data["status"] != "OK":
        raise RuntimeError(f"API error: {data['status']} — {data.get('error_message', '')}")
    return data


def build_walking_matrix(api_key: str) -> dict[tuple[str, str], dict]:
    """
    Fetch walking times for all pairs. Returns a dict keyed by
    (origin_name, dest_name) → {"duration_min": int, "distance_m": int, "duration_text": str}.
    """
    names = list(BUILDINGS.keys())
    results: dict[tuple[str, str], dict] = {}

    # API limits: max 25 origins, max 25 destinations, max 100 elements per request.
    # Use chunks of 10×10 = 100 elements to maximize efficiency within all limits.
    chunk_size = 10
    origin_chunks = [names[i:i + chunk_size] for i in range(0, len(names), chunk_size)]
    dest_chunks = [names[i:i + chunk_size] for i in range(0, len(names), chunk_size)]

    total_requests = len(origin_chunks) * len(dest_chunks)
    print(f"Fetching walking times: {len(names)} buildings, {total_requests} API calls "
          f"(up to {chunk_size}×{chunk_size} = {chunk_size**2} elements/call)...")

    call_num = 0
    for origin_batch in origin_chunks:
        for dest_batch in dest_chunks:
            call_num += 1
            print(f"  Batch {call_num}/{total_requests}: "
                  f"{len(origin_batch)} origins × {len(dest_batch)} destinations")
            data = fetch_distance_matrix(origin_batch, dest_batch, api_key)

            for oi, origin in enumerate(origin_batch):
                row = data["rows"][oi]
                for di, dest in enumerate(dest_batch):
                    elem = row["elements"][di]
                    if elem["status"] == "OK":
                        results[(origin, dest)] = {
                            "duration_min": math.ceil(elem["duration"]["value"] / 60),
                            "distance_m": elem["distance"]["value"],
                            "duration_text": elem["duration"]["text"],
                        }
                    else:
                        results[(origin, dest)] = {
                            "duration_min": -1,
                            "distance_m": -1,
                            "duration_text": "N/A",
                        }

            # Be polite to the API
            if call_num < total_requests:
                time.sleep(0.5)

    print(f"Done. {len(results)} pairs fetched.\n")
    return results


# ── Output formatters ───────────────────────────────────────────────────

def make_matrix_md(
    row_names: list[str],
    col_names: list[str],
    matrix: dict[tuple[str, str], dict],
) -> str:
    header = "| |" + "|".join(ALIASES[c] for c in col_names) + "|"
    sep = "|---|" + "|".join("---:" for _ in col_names) + "|"
    rows = [header, sep]
    for r in row_names:
        cells = []
        for c in col_names:
            if r == c:
                cells.append("—")
            else:
                info = matrix.get((r, c))
                if info and info["duration_min"] >= 0:
                    cells.append(str(info["duration_min"]))
                else:
                    cells.append("?")
        rows.append(f"|**{ALIASES[r]}**|" + "|".join(cells) + "|")
    return "\n".join(rows)


def generate_markdown(matrix: dict[tuple[str, str], dict]) -> str:
    lectures = [n for n in BUILDINGS if BUILDINGS[n]["category"] == "lecture"]
    residences = [n for n in BUILDINGS if BUILDINGS[n]["category"] == "residence"]
    landmarks = [n for n in BUILDINGS if BUILDINGS[n]["category"] == "landmark"]

    sections = []
    sections.append("# UCSD Campus Walking Times Reference")
    sections.append("")
    sections.append("## Purpose")
    sections.append(
        "Use this data to estimate walking transit time between locations on the "
        "UC San Diego campus. Add the estimated minutes as buffer time between "
        "back-to-back calendar events at different locations."
    )
    sections.append("")
    sections.append("## Data Source")
    sections.append(
        "Walking times sourced from the **Google Maps Distance Matrix API** (walking mode). "
        "These reflect actual pedestrian routes, paths, stairs, and elevation changes on campus — "
        "not straight-line estimates."
    )
    sections.append("")

    sections.append("## Quick-Reference Rules of Thumb")
    sections.append("- Same building or adjacent buildings: 1–3 min")
    sections.append("- Within the same college cluster: 3–7 min")
    sections.append("- Across 1–2 college boundaries: 8–14 min")
    sections.append("- Opposite ends of campus (Revelle ↔ Seventh/Village): 18–30 min")
    sections.append("- Add +2 min during peak class-change periods (:50–:00 transitions).")
    sections.append("")

    sections.append("## Walking Time Matrix: Lecture Hall ↔ Lecture Hall (minutes)")
    sections.append("")
    sections.append(make_matrix_md(lectures, lectures, matrix))
    sections.append("")

    sections.append("## Walking Time Matrix: Residence → Lecture Hall (minutes)")
    sections.append("")
    sections.append(make_matrix_md(residences, lectures, matrix))
    sections.append("")

    sections.append("## Walking Time Matrix: Residence ↔ Residence (minutes)")
    sections.append("")
    sections.append(make_matrix_md(residences, residences, matrix))
    sections.append("")

    sections.append("## Walking Time Matrix: Key Landmarks (minutes)")
    sections.append("")
    sections.append(make_matrix_md(landmarks, lectures + residences, matrix))
    sections.append("")

    sections.append("## Building Aliases & Coordinates")
    sections.append("")
    for full in sorted(BUILDINGS.keys()):
        b = BUILDINGS[full]
        sections.append(f"- **{ALIASES[full]}** = {full} ({b['lat']:.5f}, {b['lng']:.5f})")
    sections.append("")

    sections.append("## Usage Notes for Calendar Buffer")
    sections.append("")
    sections.append("1. Look up `from` and `to` buildings in the appropriate matrix.")
    sections.append("2. The cell value is the Google Maps estimated walking time in minutes.")
    sections.append("3. Add this as buffer/travel time between consecutive calendar events.")
    sections.append("4. Add +2 min for peak class-change rush or if you need to find a seat.")
    sections.append("5. If the exact room is unknown, the building-level estimate is accurate to ±1 min.")
    sections.append("")
    sections.append("---")
    sections.append("*Generated via Google Maps Distance Matrix API (walking mode).*")

    return "\n".join(sections)


def generate_json(matrix: dict[tuple[str, str], dict]) -> str:
    output = {
        "buildings": {
            name: {
                "alias": ALIASES[name],
                "lat": info["lat"],
                "lng": info["lng"],
                "category": info["category"],
            }
            for name, info in BUILDINGS.items()
        },
        "walking_times": [
            {
                "from": orig,
                "from_alias": ALIASES[orig],
                "to": dest,
                "to_alias": ALIASES[dest],
                "walk_min": data["duration_min"],
                "distance_m": data["distance_m"],
                "duration_text": data["duration_text"],
            }
            for (orig, dest), data in sorted(matrix.items())
            if orig != dest and data["duration_min"] >= 0
        ],
    }
    return json.dumps(output, indent=2)


# ── CLI ─────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Fetch UCSD walking times via Google Maps")
    parser.add_argument("--api-key", default=os.environ.get("GOOGLE_MAPS_API_KEY"),
                        help="Google Maps API key (or set GOOGLE_MAPS_API_KEY env var)")
    parser.add_argument("--format", choices=["md", "json"], default="md",
                        help="Output format: 'md' (markdown) or 'json'")
    parser.add_argument("--output", default=None,
                        help="Output file path (default: ucsd_walking_times.md or .json)")
    args = parser.parse_args()

    if not args.api_key:
        print("ERROR: No API key provided.")
        print("  Set GOOGLE_MAPS_API_KEY env var, or pass --api-key YOUR_KEY")
        print()
        print("  To get a key:")
        print("  1. Go to https://console.cloud.google.com/apis/credentials")
        print("  2. Create a project (or select one)")
        print("  3. Enable the 'Distance Matrix API'")
        print("  4. Create an API key")
        print("  5. (Optional) Restrict the key to Distance Matrix API only")
        sys.exit(1)

    matrix = build_walking_matrix(args.api_key)

    if args.format == "json":
        content = generate_json(matrix)
        out_path = args.output or "ucsd_walking_times.json"
    else:
        content = generate_markdown(matrix)
        out_path = args.output or "ucsd_walking_times.md"

    with open(out_path, "w") as f:
        f.write(content)

    print(f"Written to {out_path} ({len(content):,} chars)")

    # Print a quick summary
    times = [v["duration_min"] for k, v in matrix.items() if k[0] != k[1] and v["duration_min"] > 0]
    if times:
        print(f"Walking time range: {min(times)}–{max(times)} min")
        print(f"Median: {sorted(times)[len(times)//2]} min")


if __name__ == "__main__":
    main()
