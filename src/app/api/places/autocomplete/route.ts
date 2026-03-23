import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.GOOGLE_PLACES_API_KEY!;

/**
 * GET /api/places/autocomplete?q=santa+cruz
 * Returns place suggestions restricted to LATAM countries.
 */

const ALLOWED_COUNTRIES = [
  "bo", // Bolivia (priority)
  "pe", // Peru
  "ar", // Argentina
  "cl", // Chile
  "co", // Colombia
  "mx", // Mexico
  "py", // Paraguay
  "uy", // Uruguay
];

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");
  if (!query || query.length < 2) {
    return NextResponse.json({ predictions: [] });
  }

  // Google Places Autocomplete with country restrictions
  // Note: max 5 countries per request, so we split into batches and merge
  const predictions: Record<string, unknown>[] = [];
  const seen = new Set<string>();

  // Batch 1: Bolivia + neighboring countries (priority)
  const batch1 = ALLOWED_COUNTRIES.slice(0, 5);
  // Batch 2: remaining countries
  const batch2 = ALLOWED_COUNTRIES.slice(5);

  for (const countries of [batch1, batch2]) {
    if (countries.length === 0) continue;

    const url = new URL(
      "https://maps.googleapis.com/maps/api/place/autocomplete/json"
    );
    url.searchParams.set("input", query);
    url.searchParams.set("key", API_KEY);
    url.searchParams.set("types", "(regions)");
    url.searchParams.set(
      "components",
      countries.map((c) => `country:${c}`).join("|")
    );
    // Bias results toward Bolivia (Santa Cruz de la Sierra)
    url.searchParams.set("location", "-17.783,-63.182");
    url.searchParams.set("radius", "500000"); // 500km bias radius

    try {
      const res = await fetch(url.toString());
      const data = await res.json();

      if (data.status === "OK" && data.predictions) {
        for (const p of data.predictions) {
          if (!seen.has(p.place_id)) {
            seen.add(p.place_id);
            predictions.push({
              placeId: p.place_id,
              description: p.description,
              mainText: p.structured_formatting?.main_text || p.description,
              secondaryText: p.structured_formatting?.secondary_text || "",
            });
          }
        }
      }
    } catch (e) {
      console.error("Autocomplete batch failed:", e);
    }
  }

  return NextResponse.json({ predictions: predictions.slice(0, 8) });
}
