import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { searchNearbyBulk, getPlaceDetails } from "@/lib/google/places-client";
import { mapGoogleTypeToCategory } from "@/lib/google/category-mapper";
import { analyzeWebsite } from "@/lib/analyzer/website-checker";
import { calculateOpportunityScore } from "@/lib/analyzer/score-calculator";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PlaceResult = any;

/**
 * Internal endpoint that processes a scan — called fire-and-forget from /api/scans/create.
 * In production, replace with a proper job queue (e.g., Inngest, BullMQ).
 */
export async function POST(req: NextRequest) {
  const { scanId } = await req.json();
  if (!scanId) {
    return NextResponse.json({ error: "Missing scanId" }, { status: 400 });
  }

  const admin = createAdminClient();

  try {
    // Get scan details
    const { data: scan } = await admin
      .from("scans")
      .select("*")
      .eq("id", scanId)
      .single();

    if (!scan) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

    // ── Phase 1: Scanning ──────────────────────────────────
    await admin
      .from("scans")
      .update({ status: "scanning" })
      .eq("id", scanId);

    // Search for businesses
    const includedTypes =
      scan.categories.length > 0 ? scan.categories : undefined;

    const places = await searchNearbyBulk({
      lat: scan.lat,
      lng: scan.lng,
      radiusKm: scan.radius_km,
      includedTypes,
    });

    // Check result limit for free plan
    const { data: profile } = await admin
      .from("profiles")
      .select("plan")
      .eq("user_id", scan.user_id)
      .single();

    const maxResults = profile?.plan === "free" ? 25 : places.length;
    const limitedPlaces = places.slice(0, maxResults) as PlaceResult[];

    // Insert businesses into DB
    const businessRows = limitedPlaces.map((place) => ({
      scan_id: scanId,
      place_id: place.id,
      name: place.displayName?.text || "Unknown",
      address: place.formattedAddress || "",
      lat: place.location?.latitude || scan.lat,
      lng: place.location?.longitude || scan.lng,
      category: mapGoogleTypeToCategory(place.types || []),
      phone: place.nationalPhoneNumber || null,
      website_url: place.websiteUri || null,
      rating: place.rating || null,
      review_count: place.userRatingCount || 0,
      photo_count: place.photos?.length || 0,
      business_status: place.businessStatus || "OPERATIONAL",
      google_data: place as unknown as Record<string, unknown>,
    }));

    if (businessRows.length > 0) {
      const { error: insertError } = await admin
        .from("businesses")
        .upsert(businessRows, { onConflict: "scan_id,place_id" });

      if (insertError) {
        console.error("Failed to insert businesses:", insertError);
      }
    }

    await admin
      .from("scans")
      .update({ status: "analyzing", total_businesses: businessRows.length })
      .eq("id", scanId);

    // ── Phase 2: Analyzing (parallel batches of 5) ──────────
    const { data: businesses } = await admin
      .from("businesses")
      .select("*")
      .eq("scan_id", scanId);

    if (businesses) {
      const ANALYSIS_BATCH = 5;
      for (let i = 0; i < businesses.length; i += ANALYSIS_BATCH) {
        const batch = businesses.slice(i, i + ANALYSIS_BATCH);

        await Promise.allSettled(
          batch.map(async (biz) => {
            try {
              let reviewResponseRate = 0;
              let lastReviewDate: string | null = null;
              let hasBooking = false;

              // Fetch place details (website, reviews, booking)
              try {
                const details = await getPlaceDetails({ placeId: biz.place_id });

                if (details.websiteUri && !biz.website_url) {
                  biz.website_url = details.websiteUri;
                  await admin
                    .from("businesses")
                    .update({ website_url: details.websiteUri })
                    .eq("id", biz.id);
                }

                if (details.reviews) {
                  const ownerReplies = details.reviews.filter(
                    (r: { authorAttribution?: { displayName?: string } }) =>
                      r.authorAttribution?.displayName === "Owner"
                  ).length;
                  reviewResponseRate =
                    details.reviews.length > 0
                      ? ownerReplies / details.reviews.length
                      : 0;
                  if (details.reviews.length > 0) {
                    lastReviewDate = details.reviews[0].publishTime || null;
                  }
                }
                hasBooking = details.reservable || false;
              } catch {
                // Details fetch failed — continue with basic data
              }

              // Analyze website if exists
              let websiteAnalysis = null;
              if (biz.website_url) {
                websiteAnalysis = await analyzeWebsite(biz.website_url);
              }

              // Calculate score
              const scoreResult = calculateOpportunityScore({
                websiteUrl: biz.website_url,
                rating: biz.rating,
                reviewCount: biz.review_count,
                photoCount: biz.photo_count,
                hasBooking,
                businessStatus: biz.business_status,
                reviewResponseRate,
                lastReviewDate,
                websiteAnalysis,
              });

              // Save analysis
              await admin.from("analyses").upsert(
                {
                  business_id: biz.id,
                  has_website: !!biz.website_url,
                  website_ssl: websiteAnalysis?.hasSSL || false,
                  website_responsive: websiteAnalysis?.isResponsive || false,
                  website_load_time_ms: websiteAnalysis?.loadTimeMs || null,
                  website_tech: websiteAnalysis?.technology || null,
                  has_social_media: websiteAnalysis?.hasSocialLinks || false,
                  social_links: websiteAnalysis?.socialLinks || {},
                  review_response_rate: reviewResponseRate,
                  has_booking: hasBooking,
                  has_whatsapp: websiteAnalysis?.hasWhatsApp || false,
                  profile_completeness: scoreResult.profileCompleteness,
                  opportunity_score: scoreResult.score,
                  recommendations: scoreResult.recommendations,
                  analyzed_at: new Date().toISOString(),
                },
                { onConflict: "business_id" }
              );
            } catch (e) {
              console.error(`Analysis failed for business ${biz.id}:`, e);
            }
          })
        );

        // Brief pause between batches to respect rate limits
        if (i + ANALYSIS_BATCH < businesses.length) {
          await new Promise((r) => setTimeout(r, 300));
        }
      }
    }

    // ── Done ───────────────────────────────────────────────
    await admin
      .from("scans")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("id", scanId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Scan processing error:", error);

    await admin
      .from("scans")
      .update({
        status: "failed",
        error_message: error instanceof Error ? error.message : "Unknown error",
      })
      .eq("id", scanId);

    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
