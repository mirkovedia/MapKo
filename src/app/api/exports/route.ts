import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import ExcelJS from "exceljs";

/**
 * POST /api/exports — Generate CSV or XLSX export for a scan.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { scanId, format = "csv" } = await req.json();
  if (!scanId) {
    return NextResponse.json({ error: "Missing scanId" }, { status: 400 });
  }

  // Verify user owns this scan
  const { data: scan } = await supabase
    .from("scans")
    .select("*")
    .eq("id", scanId)
    .eq("user_id", user.id)
    .single();

  if (!scan) {
    return NextResponse.json({ error: "Scan not found" }, { status: 404 });
  }

  // Fetch businesses with analyses
  const admin = createAdminClient();
  const { data: businesses } = await admin
    .from("businesses")
    .select(`*, analysis:analyses(*)`)
    .eq("scan_id", scanId)
    .order("created_at");

  if (!businesses || businesses.length === 0) {
    return NextResponse.json({ error: "No businesses to export" }, { status: 400 });
  }

  const rows = businesses.map((b) => {
    const a = Array.isArray(b.analysis) ? b.analysis[0] : b.analysis;
    return {
      Name: b.name,
      Address: b.address,
      Category: b.category,
      Phone: b.phone || "",
      Website: b.website_url || "",
      Rating: b.rating || "",
      "Review Count": b.review_count,
      "Photo Count": b.photo_count,
      "Opportunity Score": a?.opportunity_score || 0,
      "Has Website": a?.has_website ? "Yes" : "No",
      "Has SSL": a?.website_ssl ? "Yes" : "No",
      "Mobile Friendly": a?.website_responsive ? "Yes" : "No",
      "Has Social Media": a?.has_social_media ? "Yes" : "No",
      "Has Booking": a?.has_booking ? "Yes" : "No",
      "Has WhatsApp": a?.has_whatsapp ? "Yes" : "No",
      "Review Response Rate": a
        ? `${Math.round((a.review_response_rate || 0) * 100)}%`
        : "N/A",
      "Website Technology": a?.website_tech || "",
      Recommendations: a?.recommendations?.join("; ") || "",
      "Google Maps": `https://www.google.com/maps/place/?q=place_id:${b.place_id}`,
    };
  });

  if (format === "csv") {
    const headers = Object.keys(rows[0]);
    const csvLines = [
      headers.join(","),
      ...rows.map((row) =>
        headers
          .map((h) => {
            const val = String(row[h as keyof typeof row]);
            return val.includes(",") || val.includes('"')
              ? `"${val.replace(/"/g, '""')}"`
              : val;
          })
          .join(",")
      ),
    ];

    return new NextResponse(csvLines.join("\n"), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="mapko-scan-${scanId.slice(0, 8)}.csv"`,
      },
    });
  }

  // XLSX export
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "MapKo";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Businesses");

  // Header styling
  const headers = Object.keys(rows[0]);
  sheet.addRow(headers);
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF3B82F6" },
  };

  // Data rows
  for (const row of rows) {
    const values = headers.map((h) => row[h as keyof typeof row]);
    const dataRow = sheet.addRow(values);

    // Color-code by opportunity score
    const scoreIdx = headers.indexOf("Opportunity Score");
    const score = Number(row["Opportunity Score"]);
    if (score >= 70) {
      dataRow.getCell(scoreIdx + 1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFECACA" },
      };
    } else if (score >= 40) {
      dataRow.getCell(scoreIdx + 1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFEF3C7" },
      };
    } else {
      dataRow.getCell(scoreIdx + 1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFD1FAE5" },
      };
    }
  }

  // Auto-width columns
  sheet.columns.forEach((col) => {
    let maxLen = 10;
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const len = String(cell.value).length;
      if (len > maxLen) maxLen = Math.min(len, 50);
    });
    col.width = maxLen + 2;
  });

  // Add outreach template sheet
  const templateSheet = workbook.addWorksheet("Outreach Templates");
  templateSheet.addRow(["Template Name", "Subject", "Body"]);
  const tHeaderRow = templateSheet.getRow(1);
  tHeaderRow.font = { bold: true };

  templateSheet.addRow([
    "Cold Email - No Website",
    "Quick question about {Business Name}'s online presence",
    `Hi {Business Name} team,

I noticed you don't have a website yet. In today's digital world, businesses without an online presence miss out on up to 70% of potential customers who search online first.

I'd love to help you get online with a professional website that brings in new customers. Would you be open to a quick 15-minute chat?

Best regards`,
  ]);

  templateSheet.addRow([
    "Cold Email - Outdated Website",
    "Idea to help {Business Name} get more customers online",
    `Hi {Business Name} team,

I was looking at your website and noticed a few quick wins that could significantly improve your online visibility and bring in more customers:

{Recommendations}

Would you be interested in a free audit? I can show you exactly what to improve.

Best regards`,
  ]);

  templateSheet.addRow([
    "Cold Email - Low Reviews",
    "Boost {Business Name}'s Google visibility",
    `Hi {Business Name} team,

I noticed your Google Business Profile has room for growth. With just a few improvements, you could rank higher in local searches and attract more walk-in customers.

I specialize in helping local businesses improve their digital presence. Would you like to see what I'd recommend?

Best regards`,
  ]);

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="mapko-scan-${scanId.slice(0, 8)}.xlsx"`,
    },
  });
}
