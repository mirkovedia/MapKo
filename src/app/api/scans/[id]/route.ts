import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/scans/[id] — Get scan details with businesses and analyses.
 * Used for polling status and loading scan results.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get scan
  const { data: scan, error } = await supabase
    .from("scans")
    .select("id, query_text, status, lat, lng, radius_km, categories, total_businesses, error_message, share_token, is_public, created_at, updated_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !scan) {
    return NextResponse.json({ error: "Scan not found" }, { status: 404 });
  }

  // Get businesses with analyses in a single joined query
  const { data: businesses } = await supabase
    .from("businesses")
    .select(`id, scan_id, place_id, name, address, lat, lng, category, phone, website_url, rating, review_count, photo_count, business_status, created_at, analysis:analyses(id, business_id, has_website, website_ssl, website_responsive, website_load_time_ms, website_tech, has_social_media, social_links, review_response_rate, has_booking, has_whatsapp, profile_completeness, opportunity_score, recommendations, analyzed_at)`)
    .eq("scan_id", id)
    .order("created_at", { ascending: true });

  const cacheHeader = scan.status === "completed"
    ? "private, max-age=60"
    : "no-store";

  return NextResponse.json({
    scan,
    businesses: businesses?.map((b) => ({
      ...b,
      analysis: Array.isArray(b.analysis) ? b.analysis[0] || null : b.analysis,
    })) || [],
  }, {
    headers: { "Cache-Control": cacheHeader },
  });
}
