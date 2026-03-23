/**
 * Google Places API client — server-side only.
 * Uses the legacy Places API endpoints (compatible with "Places API" enabled).
 */

const API_KEY = process.env.GOOGLE_PLACES_API_KEY!;
const BASE_URL = "https://maps.googleapis.com/maps/api/place";

interface NearbySearchParams {
  lat: number;
  lng: number;
  radiusMeters: number;
  includedTypes?: string[];
  pageToken?: string;
}

interface PlaceDetailsParams {
  placeId: string;
  fields?: string[];
}

interface GeocodingResult {
  lat: number;
  lng: number;
  formattedAddress: string;
}

// ─── Nearby Search ────────────────────────────────────────────
export async function searchNearby({
  lat,
  lng,
  radiusMeters,
  includedTypes = [],
  pageToken,
}: NearbySearchParams) {
  const url = new URL(`${BASE_URL}/nearbysearch/json`);
  url.searchParams.set("location", `${lat},${lng}`);
  url.searchParams.set("radius", String(Math.min(radiusMeters, 50000)));
  url.searchParams.set("key", API_KEY);

  if (includedTypes.length > 0) {
    url.searchParams.set("type", includedTypes[0]);
  }

  if (pageToken) {
    url.searchParams.set("pagetoken", pageToken);
  }

  const res = await fetch(url.toString());

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Nearby Search failed (${res.status}): ${error}`);
  }

  const data = await res.json();

  if (data.status === "REQUEST_DENIED") {
    throw new Error(`Nearby Search denied: ${data.error_message || "Check API key"}`);
  }

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new Error(`Nearby Search error: ${data.status} — ${data.error_message || ""}`);
  }

  // Normalize results to match our expected format
  const places = (data.results || []).map((r: Record<string, unknown>) => ({
    id: r.place_id as string,
    displayName: { text: r.name as string, languageCode: "en" },
    formattedAddress: (r.vicinity || r.formatted_address || "") as string,
    location: {
      latitude: (r.geometry as Record<string, Record<string, number>>)?.location?.lat,
      longitude: (r.geometry as Record<string, Record<string, number>>)?.location?.lng,
    },
    types: r.types as string[] || [],
    rating: r.rating as number | undefined,
    userRatingCount: r.user_ratings_total as number | undefined,
    businessStatus: r.business_status as string || "OPERATIONAL",
    photos: (r.photos as Record<string, unknown>[] || []).map((p) => ({
      name: p.photo_reference as string,
      widthPx: p.width as number,
      heightPx: p.height as number,
    })),
    googleMapsUri: `https://www.google.com/maps/place/?q=place_id:${r.place_id}`,
    // website not available in nearby search — fetched via details
  }));

  return { places, nextPageToken: data.next_page_token || null };
}

/**
 * Paginate a single nearby search through all available pages (max 3 pages = 60 results).
 */
async function searchNearbyAllPages(
  lat: number,
  lng: number,
  radiusMeters: number,
  type?: string
) {
  const results: unknown[] = [];
  let pageToken: string | undefined;
  let page = 0;

  do {
    try {
      const result = await searchNearby({
        lat,
        lng,
        radiusMeters,
        includedTypes: type ? [type] : [],
        pageToken,
      });

      results.push(...result.places);
      pageToken = result.nextPageToken || undefined;
      page++;

      // Google requires ~2 second delay before using nextPageToken
      if (pageToken) {
        await sleep(2000);
      }
    } catch (e) {
      console.error(`Search failed for type ${type}:`, e);
      break;
    }
  } while (pageToken && page < 3);

  return results;
}

/**
 * Search a large area with parallel category searches.
 * Runs up to 3 category searches concurrently for speed.
 */
export async function searchNearbyBulk({
  lat,
  lng,
  radiusKm,
  includedTypes = [],
  onProgress,
}: {
  lat: number;
  lng: number;
  radiusKm: number;
  includedTypes?: string[];
  onProgress?: (found: number, total: number) => void;
}) {
  const radiusMeters = radiusKm * 1000;
  const allPlaces = new Map<string, unknown>();

  if (includedTypes.length === 0) {
    // No categories selected — do a single broad search
    const results = await searchNearbyAllPages(lat, lng, radiusMeters);
    for (const p of results) {
      allPlaces.set((p as { id: string }).id, p);
    }
    onProgress?.(allPlaces.size, 1);
  } else {
    // Run category searches in parallel (batches of 3 to respect rate limits)
    const BATCH_SIZE = 3;
    for (let i = 0; i < includedTypes.length; i += BATCH_SIZE) {
      const batch = includedTypes.slice(i, i + BATCH_SIZE);

      const batchResults = await Promise.allSettled(
        batch.map((type) => searchNearbyAllPages(lat, lng, radiusMeters, type))
      );

      for (const result of batchResults) {
        if (result.status === "fulfilled") {
          for (const p of result.value) {
            allPlaces.set((p as { id: string }).id, p);
          }
        }
      }

      onProgress?.(allPlaces.size, Math.min(i + BATCH_SIZE, includedTypes.length));

      // Brief pause between batches
      if (i + BATCH_SIZE < includedTypes.length) {
        await sleep(500);
      }
    }
  }

  return Array.from(allPlaces.values());
}

// ─── Place Details ────────────────────────────────────────────
export async function getPlaceDetails({ placeId, fields }: PlaceDetailsParams) {
  const defaultFields = [
    "place_id",
    "name",
    "formatted_address",
    "geometry",
    "types",
    "rating",
    "user_ratings_total",
    "website",
    "formatted_phone_number",
    "international_phone_number",
    "photos",
    "reviews",
    "business_status",
    "opening_hours",
    "url",
  ];

  const url = new URL(`${BASE_URL}/details/json`);
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("fields", (fields || defaultFields).join(","));
  url.searchParams.set("key", API_KEY);

  const res = await fetch(url.toString());

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Place Details failed (${res.status}): ${error}`);
  }

  const data = await res.json();

  if (data.status !== "OK") {
    throw new Error(`Place Details error: ${data.status}`);
  }

  const r = data.result;

  // Normalize to our expected format
  return {
    id: r.place_id,
    displayName: { text: r.name },
    formattedAddress: r.formatted_address,
    location: {
      latitude: r.geometry?.location?.lat,
      longitude: r.geometry?.location?.lng,
    },
    types: r.types || [],
    rating: r.rating,
    userRatingCount: r.user_ratings_total,
    websiteUri: r.website,
    nationalPhoneNumber: r.formatted_phone_number,
    internationalPhoneNumber: r.international_phone_number,
    photos: (r.photos || []).map((p: Record<string, unknown>) => ({
      name: p.photo_reference,
      widthPx: p.width,
      heightPx: p.height,
    })),
    reviews: (r.reviews || []).map((rev: Record<string, unknown>) => ({
      name: "",
      rating: rev.rating,
      text: { text: rev.text },
      authorAttribution: { displayName: rev.author_name },
      publishTime: rev.time ? new Date((rev.time as number) * 1000).toISOString() : "",
      relativePublishTimeDescription: rev.relative_time_description,
    })),
    businessStatus: r.business_status || "OPERATIONAL",
    reservable: false, // Not available in legacy API
    googleMapsUri: r.url,
  };
}

// ─── Geocoding ────────────────────────────────────────────────
// Restricted to LATAM countries for MapKo
const LATAM_COUNTRIES = ["BO", "PE", "AR", "CL", "CO", "MX", "PY", "UY"];

export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", address);
  url.searchParams.set("key", API_KEY);
  // Restrict to LATAM countries
  url.searchParams.set(
    "components",
    LATAM_COUNTRIES.map((c) => `country:${c}`).join("|")
  );
  // Bias toward Bolivia
  url.searchParams.set("bounds", "-22.9,-69.6|-9.7,-57.5");

  const res = await fetch(url.toString());
  if (!res.ok) return null;

  const data = await res.json();
  if (data.status !== "OK" || !data.results?.[0]) return null;

  const result = data.results[0];
  return {
    lat: result.geometry.location.lat,
    lng: result.geometry.location.lng,
    formattedAddress: result.formatted_address,
  };
}

/**
 * Geocode using a Google Place ID (from autocomplete) — more precise than text.
 */
export async function geocodePlaceId(placeId: string): Promise<GeocodingResult | null> {
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("key", API_KEY);

  const res = await fetch(url.toString());
  if (!res.ok) return null;

  const data = await res.json();
  if (data.status !== "OK" || !data.results?.[0]) return null;

  const result = data.results[0];
  return {
    lat: result.geometry.location.lat,
    lng: result.geometry.location.lng,
    formattedAddress: result.formatted_address,
  };
}

// ─── Helpers ──────────────────────────────────────────────────
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
