"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  MapPin,
  Star,
  Globe2,
  AtSign,
  CalendarCheck,
  Phone,
  Paintbrush,
  Search,
  BarChart3,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { cn, getScoreColor } from "@/lib/utils";
import type { Scan, BusinessWithAnalysis } from "@/types";

export default function PublicScanPage() {
  const { token } = useParams<{ token: string }>();
  const [scan, setScan] = useState<Scan | null>(null);
  const [businesses, setBusinesses] = useState<BusinessWithAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPublicScan() {
      try {
        const supabase = createClient();

        // Fetch scan by share_token (RLS allows public access for is_public=true)
        const { data: scanData, error: scanError } = await supabase
          .from("scans")
          .select("id, query_text, status, lat, lng, radius_km, categories, total_businesses, created_at, updated_at")
          .eq("share_token", token)
          .eq("is_public", true)
          .single();

        if (scanError || !scanData) {
          setError("This scan is not available or the link has expired.");
          setLoading(false);
          return;
        }

        setScan(scanData as Scan);

        // Fetch businesses with analyses
        const { data: bizData } = await supabase
          .from("businesses")
          .select(
            `id, scan_id, place_id, name, address, lat, lng, category, phone, website_url, rating, review_count, photo_count, business_status, created_at, analysis:analyses(id, business_id, has_website, website_ssl, website_responsive, website_load_time_ms, website_tech, has_social_media, social_links, review_response_rate, has_booking, has_whatsapp, profile_completeness, opportunity_score, recommendations, analyzed_at)`
          )
          .eq("scan_id", scanData.id)
          .order("created_at", { ascending: true });

        setBusinesses(
          bizData?.map((b) => ({
            ...b,
            analysis: Array.isArray(b.analysis)
              ? b.analysis[0] || null
              : b.analysis,
          })) as BusinessWithAnalysis[] || []
        );
      } catch {
        setError("Failed to load scan data.");
      } finally {
        setLoading(false);
      }
    }

    fetchPublicScan();
  }, [token]);

  // Score summary
  const summary = useMemo(() => {
    const scored = businesses.filter((b) => b.analysis);
    const total = scored.length;
    const avg =
      total > 0
        ? Math.round(
            scored.reduce(
              (s, b) => s + (b.analysis?.opportunity_score ?? 0),
              0
            ) / total
          )
        : 0;
    const high = scored.filter(
      (b) => (b.analysis?.opportunity_score ?? 0) >= 70
    ).length;
    const medium = scored.filter((b) => {
      const s = b.analysis?.opportunity_score ?? 0;
      return s >= 40 && s < 70;
    }).length;
    const low = scored.filter(
      (b) => (b.analysis?.opportunity_score ?? 0) < 40
    ).length;
    return { total: businesses.length, avg, high, medium, low };
  }, [businesses]);

  // Sort businesses by score desc
  const sorted = useMemo(
    () =>
      [...businesses].sort(
        (a, b) =>
          (b.analysis?.opportunity_score ?? 0) -
          (a.analysis?.opportunity_score ?? 0)
      ),
    [businesses]
  );

  if (loading) {
    return (
      <div className="min-h-screen mesh-bg flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !scan) {
    return (
      <div className="min-h-screen mesh-bg flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500">
              <MapPin className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">
              Map<span className="text-blue-400">Ko</span>
            </span>
          </div>
          <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Scan Not Found</h1>
          <p className="text-muted-foreground mb-6">
            {error || "This scan link is invalid or has been removed."}
          </p>
          <Link
            href="/landing"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors"
          >
            Learn About MapKo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen mesh-bg">
      {/* Header / Branding */}
      <header className="border-b border-white/10 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1200px] mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/landing" className="flex items-center gap-2 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500 transition-transform group-hover:scale-105">
              <MapPin className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-white">
              Map<span className="text-blue-400">Ko</span>
            </span>
          </Link>
          <Badge variant="secondary" className="text-xs">
            Shared Scan
          </Badge>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-4 py-6 space-y-6">
        {/* Scan Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <h1 className="text-xl sm:text-2xl font-bold">{scan.query_text}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {scan.radius_km}km radius &middot;{" "}
            {new Date(scan.created_at).toLocaleDateString()} &middot;{" "}
            {businesses.length} businesses found
          </p>
        </motion.div>

        {/* Summary Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.05 }}
          className="grid grid-cols-2 sm:grid-cols-5 gap-3"
        >
          {[
            {
              label: "Total",
              value: summary.total,
              className: "text-foreground",
            },
            {
              label: "Avg Score",
              value: summary.avg,
              className: "text-blue-400",
            },
            {
              label: "High (70+)",
              value: summary.high,
              className: "text-red-400",
            },
            {
              label: "Medium (40-69)",
              value: summary.medium,
              className: "text-amber-400",
            },
            {
              label: "Low (0-39)",
              value: summary.low,
              className: "text-green-400",
            },
          ].map((s) => (
            <Card key={s.label} className="glass">
              <CardContent className="p-4 text-center">
                <p className={cn("text-2xl font-bold", s.className)}>
                  {s.value}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Business List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.1 }}
        >
          <Card className="glass overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                      Business
                    </th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                      Category
                    </th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                      Rating
                    </th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                      Score
                    </th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                      Needs
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {sorted.map((biz) => {
                    const score = biz.analysis?.opportunity_score ?? 0;
                    const scoreColor = getScoreColor(score);
                    const hasWebsite =
                      biz.analysis?.has_website ?? !!biz.website_url;
                    const hasSocial =
                      biz.analysis?.has_social_media ?? false;

                    return (
                      <tr
                        key={biz.id}
                        className="hover:bg-accent/50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-sm">{biz.name}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {biz.address}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className="text-xs">
                            {biz.category}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-sm">
                            <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                            {biz.rating?.toFixed(1) ?? "N/A"}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            className={cn(
                              "text-xs font-bold border",
                              `score-${scoreColor}`
                            )}
                          >
                            {score}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 flex-wrap">
                            {!hasWebsite && (
                              <span
                                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-red-500/10 text-red-400 border border-red-500/20"
                                title="Needs website"
                              >
                                <Globe2 className="h-3 w-3" />
                                Web
                              </span>
                            )}
                            {hasWebsite &&
                              (!biz.analysis?.website_ssl ||
                                !biz.analysis?.website_responsive) && (
                                <span
                                  className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20"
                                  title="Website needs improvement"
                                >
                                  <Paintbrush className="h-3 w-3" />
                                  Fix
                                </span>
                              )}
                            {!hasSocial && (
                              <span
                                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-pink-500/10 text-pink-400 border border-pink-500/20"
                                title="Needs social media"
                              >
                                <AtSign className="h-3 w-3" />
                                Social
                              </span>
                            )}
                            {!biz.analysis?.has_booking && (
                              <span
                                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20"
                                title="Needs booking system"
                              >
                                <CalendarCheck className="h-3 w-3" />
                                Booking
                              </span>
                            )}
                            {!biz.analysis?.has_whatsapp &&
                              biz.phone && (
                                <span
                                  className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-green-500/10 text-green-400 border border-green-500/20"
                                  title="Needs WhatsApp Business"
                                >
                                  <Phone className="h-3 w-3" />
                                  WA
                                </span>
                              )}
                            {hasWebsite &&
                              hasSocial &&
                              biz.analysis?.has_booking && (
                                <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  OK
                                </span>
                              )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {sorted.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-12 text-center text-muted-foreground"
                      >
                        No businesses found in this scan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>
      </main>

      {/* Footer CTA */}
      <footer className="border-t border-white/10 bg-background/60 backdrop-blur-sm mt-12">
        <div className="max-w-[1200px] mx-auto px-4 py-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-500">
              <MapPin className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-white">
              Powered by Map<span className="text-blue-400">Ko</span>
            </span>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Scan any area on Google Maps and find businesses that need your
            services.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors"
          >
            <BarChart3 className="h-4 w-4" />
            Start Scanning for Free
          </Link>
          <p className="text-xs text-muted-foreground mt-6">
            &copy; {new Date().getFullYear()} MapKo. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
