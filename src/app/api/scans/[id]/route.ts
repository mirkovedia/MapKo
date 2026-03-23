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
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !scan) {
    return NextResponse.json({ error: "Scan not found" }, { status: 404 });
  }

  // Get businesses with analyses
  const { data: businesses } = await supabase
    .from("businesses")
    .select(`*, analysis:analyses(*)`)
    .eq("scan_id", id)
    .order("created_at", { ascending: true });

  return NextResponse.json({
    scan,
    businesses: businesses?.map((b) => ({
      ...b,
      analysis: Array.isArray(b.analysis) ? b.analysis[0] || null : b.analysis,
    })) || [],
  });
}
