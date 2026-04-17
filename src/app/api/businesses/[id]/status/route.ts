import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { LeadStatus } from "@/types";
import { z } from "zod";

const VALID_STATUSES: LeadStatus[] = [
  "new",
  "contacted",
  "interested",
  "proposal",
  "closed",
  "not_interested",
];

/**
 * PATCH /api/businesses/[id]/status — Update CRM fields for a business.
 * Accepts { lead_status?, notes?, last_contacted_at? } in the request body.
 */
export async function PATCH(
  req: NextRequest,
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

  // Validar input con Zod
  const statusSchema = z.object({
    lead_status: z.enum(["new", "contacted", "interested", "proposal", "closed", "not_interested"]).optional(),
    notes: z.string().max(5000).optional(),
    last_contacted_at: z.string().datetime().optional(),
  });

  const body = await req.json();
  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { lead_status, notes, last_contacted_at } = parsed.data;

  // Verify user owns the scan that produced this business
  const { data: business, error: bizError } = await supabase
    .from("businesses")
    .select("id, scan_id")
    .eq("id", id)
    .single();

  if (bizError || !business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  const { data: scan } = await supabase
    .from("scans")
    .select("id")
    .eq("id", business.scan_id)
    .eq("user_id", user.id)
    .single();

  if (!scan) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  // Build update payload — only include fields that were provided
  const updateData: Record<string, unknown> = {};
  if (lead_status !== undefined) updateData.lead_status = lead_status;
  if (notes !== undefined) updateData.notes = notes;
  if (last_contacted_at !== undefined) updateData.last_contacted_at = last_contacted_at;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { error: "No fields to update" },
      { status: 400 }
    );
  }

  // Use admin client to bypass RLS (we already verified ownership above)
  const admin = createAdminClient();
  const { data: updated, error: updateError } = await admin
    .from("businesses")
    .update(updateData)
    .eq("id", id)
    .select(`*, analysis:analyses(*)`)
    .single();

  if (updateError || !updated) {
    return NextResponse.json(
      { error: "Failed to update business" },
      { status: 500 }
    );
  }

  // Normalize analysis
  const normalized = {
    ...updated,
    analysis: Array.isArray(updated.analysis)
      ? updated.analysis[0] || null
      : updated.analysis,
  };

  return NextResponse.json({ business: normalized });
}
