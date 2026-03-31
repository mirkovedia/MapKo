import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { nanoid } from "nanoid";

/**
 * POST /api/scans/[id]/share — Generate a share token and make the scan public.
 * Returns the share URL.
 */
export async function POST(
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

  // Verify ownership
  const { data: scan, error: scanError } = await supabase
    .from("scans")
    .select("id, user_id, share_token, is_public")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (scanError || !scan) {
    return NextResponse.json({ error: "Scan not found" }, { status: 404 });
  }

  // If already shared, return existing token
  if (scan.share_token && scan.is_public) {
    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || ""}/scan/${scan.share_token}`;
    return NextResponse.json({ share_token: scan.share_token, share_url: shareUrl });
  }

  // Generate a new share token
  const shareToken = nanoid(12);

  const { error: updateError } = await supabase
    .from("scans")
    .update({ share_token: shareToken, is_public: true })
    .eq("id", id)
    .eq("user_id", user.id);

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to create share link" },
      { status: 500 }
    );
  }

  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || ""}/scan/${shareToken}`;

  return NextResponse.json({ share_token: shareToken, share_url: shareUrl });
}

/**
 * DELETE /api/scans/[id]/share — Remove share token and make the scan private.
 */
export async function DELETE(
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

  // Verify ownership
  const { data: scan, error: scanError } = await supabase
    .from("scans")
    .select("id, user_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (scanError || !scan) {
    return NextResponse.json({ error: "Scan not found" }, { status: 404 });
  }

  const { error: updateError } = await supabase
    .from("scans")
    .update({ share_token: null, is_public: false })
    .eq("id", id)
    .eq("user_id", user.id);

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to remove share link" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
