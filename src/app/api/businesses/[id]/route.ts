import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/businesses/[id] — Get a single business with its analysis.
 * Verifies the authenticated user owns the scan that found this business.
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

  // Fetch the business with its analysis
  const { data: business, error: bizError } = await supabase
    .from("businesses")
    .select(`*, analysis:analyses(*)`)
    .eq("id", id)
    .single();

  if (bizError || !business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  // Verify user owns the scan that produced this business
  const { data: scan } = await supabase
    .from("scans")
    .select("id")
    .eq("id", business.scan_id)
    .eq("user_id", user.id)
    .single();

  if (!scan) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  // Normalize analysis from array to single object
  const normalized = {
    ...business,
    analysis: Array.isArray(business.analysis)
      ? business.analysis[0] || null
      : business.analysis,
  };

  return NextResponse.json({ business: normalized });
}
