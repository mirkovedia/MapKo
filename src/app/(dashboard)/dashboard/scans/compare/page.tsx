"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  Globe2,
  AtSign,
  Phone,
  Star,
  MessageSquare,
  Building2,
  MapPin,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SkeletonScanDetail } from "@/components/ui/skeleton";
import { cn, getScoreColor } from "@/lib/utils";
import type { Scan, BusinessWithAnalysis } from "@/types";

interface ScanData {
  scan: Scan;
  businesses: BusinessWithAnalysis[];
}

interface ScanStats {
  total: number;
  avgScore: number;
  highOpp: number;
  noWebsite: number;
  noSocial: number;
  withPhone: number;
  avgRating: number;
  totalReviews: number;
  categories: Record<string, number>;
}

function computeStats(businesses: BusinessWithAnalysis[]): ScanStats {
  const scored = businesses.filter((b) => b.analysis);
  const avgScore =
    scored.length > 0
      ? Math.round(scored.reduce((s, b) => s + (b.analysis?.opportunity_score ?? 0), 0) / scored.length)
      : 0;
  const highOpp = scored.filter((b) => (b.analysis?.opportunity_score ?? 0) >= 70).length;
  const noWebsite = scored.filter((b) => !b.analysis?.has_website).length;
  const noSocial = scored.filter((b) => !b.analysis?.has_social_media).length;
  const withPhone = businesses.filter((b) => b.phone).length;
  const avgRating =
    businesses.length > 0
      ? Math.round((businesses.reduce((s, b) => s + (b.rating ?? 0), 0) / businesses.length) * 10) / 10
      : 0;
  const totalReviews = businesses.reduce((s, b) => s + b.review_count, 0);
  const categories: Record<string, number> = {};
  for (const b of businesses) {
    categories[b.category] = (categories[b.category] || 0) + 1;
  }
  return { total: businesses.length, avgScore, highOpp, noWebsite, noSocial, withPhone, avgRating, totalReviews, categories };
}

function DiffIndicator({ a, b, inverted }: { a: number; b: number; inverted?: boolean }) {
  const diff = b - a;
  if (diff === 0) return <Minus className="h-4 w-4 text-muted-foreground" />;
  const isPositive = inverted ? diff < 0 : diff > 0;
  return isPositive ? (
    <TrendingUp className="h-4 w-4 text-green-400" />
  ) : (
    <TrendingDown className="h-4 w-4 text-red-400" />
  );
}

function CompareContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const scanA = searchParams.get("a");
  const scanB = searchParams.get("b");

  const [dataA, setDataA] = useState<ScanData | null>(null);
  const [dataB, setDataB] = useState<ScanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!scanA || !scanB) {
      setError("Two scan IDs are required for comparison.");
      setLoading(false);
      return;
    }

    async function fetchBoth() {
      try {
        const [resA, resB] = await Promise.all([
          fetch(`/api/scans/${scanA}`),
          fetch(`/api/scans/${scanB}`),
        ]);
        if (!resA.ok || !resB.ok) throw new Error("Failed to fetch scan data");
        const [a, b] = await Promise.all([resA.json(), resB.json()]);
        setDataA(a);
        setDataB(b);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load scans");
      } finally {
        setLoading(false);
      }
    }

    fetchBoth();
  }, [scanA, scanB]);

  const statsA = useMemo(() => (dataA ? computeStats(dataA.businesses) : null), [dataA]);
  const statsB = useMemo(() => (dataB ? computeStats(dataB.businesses) : null), [dataB]);

  if (loading) return <SkeletonScanDetail />;

  if (error || !dataA || !dataB || !statsA || !statsB) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-destructive">{error || "Could not load scan data."}</p>
        <Button onClick={() => router.push("/dashboard/scans")}>Back to Scans</Button>
      </div>
    );
  }

  const metrics = [
    { label: "Total Businesses", a: statsA.total, b: statsB.total, icon: Building2 },
    { label: "Avg Opportunity Score", a: statsA.avgScore, b: statsB.avgScore, icon: TrendingUp },
    { label: "High Opportunity (70+)", a: statsA.highOpp, b: statsB.highOpp, icon: TrendingUp },
    { label: "No Website", a: statsA.noWebsite, b: statsB.noWebsite, icon: Globe2, inverted: true },
    { label: "No Social Media", a: statsA.noSocial, b: statsB.noSocial, icon: AtSign, inverted: true },
    { label: "With Phone Number", a: statsA.withPhone, b: statsB.withPhone, icon: Phone },
    { label: "Avg Rating", a: statsA.avgRating, b: statsB.avgRating, icon: Star },
    { label: "Total Reviews", a: statsA.totalReviews, b: statsB.totalReviews, icon: MessageSquare },
  ];

  const allCategories = Array.from(
    new Set([...Object.keys(statsA.categories), ...Object.keys(statsB.categories)])
  ).sort();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <button
          onClick={() => router.push("/dashboard/scans")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Scans
        </button>
        <h1 className="text-2xl font-bold">Compare Scans</h1>
        <p className="text-muted-foreground mt-1">
          Side-by-side comparison of two scans.
        </p>
      </div>

      {/* Scan headers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[dataA, dataB].map((data, idx) => (
          <Card key={idx} className={cn("glass", idx === 0 ? "border-blue-500/30" : "border-purple-500/30")}>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <Badge className={idx === 0 ? "bg-blue-500/15 text-blue-400 border-blue-500/30" : "bg-purple-500/15 text-purple-400 border-purple-500/30"}>
                  Scan {idx === 0 ? "A" : "B"}
                </Badge>
              </div>
              <h3 className="font-semibold text-lg">{data.scan.query_text}</h3>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {data.scan.radius_km}km
                </span>
                <span>{new Date(data.scan.created_at).toLocaleDateString()}</span>
                <span>{data.businesses.length} businesses</span>
              </div>
              <Link href={`/dashboard/scans/${data.scan.id}`}>
                <Button variant="ghost" size="sm" className="mt-2 -ml-2">
                  View Full Scan
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Metrics comparison table */}
      <Card className="glass overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold">Key Metrics</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                  Metric
                </th>
                <th className="text-center text-xs font-medium text-blue-400 uppercase tracking-wider px-6 py-3">
                  Scan A
                </th>
                <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3 w-12">
                </th>
                <th className="text-center text-xs font-medium text-purple-400 uppercase tracking-wider px-6 py-3">
                  Scan B
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {metrics.map((m) => (
                <tr key={m.label} className="hover:bg-accent/30 transition-colors">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <m.icon className="h-4 w-4 text-muted-foreground" />
                      {m.label}
                    </div>
                  </td>
                  <td className="px-6 py-3 text-center">
                    <span className={cn("text-lg font-bold", m.label.includes("Score") ? `score-${getScoreColor(m.a)}` : "text-foreground")}>{m.a}</span>
                  </td>
                  <td className="px-6 py-3 text-center">
                    <DiffIndicator a={m.a} b={m.b} inverted={m.inverted} />
                  </td>
                  <td className="px-6 py-3 text-center">
                    <span className={cn("text-lg font-bold", m.label.includes("Score") ? `score-${getScoreColor(m.b)}` : "text-foreground")}>{m.b}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Category breakdown */}
      <Card className="glass overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold">Category Breakdown</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                  Category
                </th>
                <th className="text-center text-xs font-medium text-blue-400 uppercase tracking-wider px-6 py-3">
                  Scan A
                </th>
                <th className="text-center text-xs font-medium text-purple-400 uppercase tracking-wider px-6 py-3">
                  Scan B
                </th>
                <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                  Diff
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {allCategories.map((cat) => {
                const countA = statsA.categories[cat] || 0;
                const countB = statsB.categories[cat] || 0;
                const diff = countB - countA;
                return (
                  <tr key={cat} className="hover:bg-accent/30 transition-colors">
                    <td className="px-6 py-3 text-sm font-medium">{cat}</td>
                    <td className="px-6 py-3 text-center text-sm">{countA}</td>
                    <td className="px-6 py-3 text-center text-sm">{countB}</td>
                    <td className="px-6 py-3 text-center">
                      <span
                        className={cn(
                          "text-sm font-medium",
                          diff > 0 ? "text-green-400" : diff < 0 ? "text-red-400" : "text-muted-foreground"
                        )}
                      >
                        {diff > 0 ? `+${diff}` : diff === 0 ? "—" : diff}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </motion.div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<SkeletonScanDetail />}>
      <CompareContent />
    </Suspense>
  );
}
