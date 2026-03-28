"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  MapPin,
  List,
  Download,
  RefreshCw,
  Star,
  MessageSquare,
  ArrowUpDown,
  Filter,
  AlertTriangle,
  Eye,
  Search,
  Trash2,
  ExternalLink,
  MessageCircle,
  Target,
  Globe2,
  Paintbrush,
  AtSign,
  CalendarCheck,
  Phone,
  MessageSquareDashed,
  ThumbsDown,
  Flame,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { cn, getScoreColor, getScoreLabel } from "@/lib/utils";
import { isMobileNumber, formatPhoneForWhatsApp } from "@/lib/utils/phone-helper";
import dynamic from "next/dynamic";
import type { Scan, BusinessWithAnalysis, ScanStatus } from "@/types";

// Lazy-load map component (Google Maps doesn't need SSR)
const ScanMap = dynamic(
  () => import("@/components/map/scan-map").then((mod) => ({ default: mod.ScanMap })),
  {
    ssr: false,
    loading: () => (
      <div className="h-[500px] rounded-xl bg-card/40 border border-border/60 flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading map...</div>
      </div>
    ),
  }
);

// ── Progress phases ──────────────────────────────────────────────
const PHASES: { status: ScanStatus; label: string }[] = [
  { status: "queued", label: "Queued" },
  { status: "scanning", label: "Scanning" },
  { status: "analyzing", label: "Analyzing" },
  { status: "completed", label: "Completed" },
];

function phaseIndex(status: ScanStatus): number {
  if (status === "failed") return -1;
  return PHASES.findIndex((p) => p.status === status);
}

// ── Sort types ───────────────────────────────────────────────────
type SortKey = "score" | "rating" | "reviews";
type SortDir = "asc" | "desc";

export default function ScanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [scan, setScan] = useState<Scan | null>(null);
  const [businesses, setBusinesses] = useState<BusinessWithAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"map" | "list">("list");
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterScore, setFilterScore] = useState("");
  const [searchText, setSearchText] = useState("");
  const [serviceNeed, setServiceNeed] = useState("");
  const [exporting, setExporting] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ── Fetch / poll ─────────────────────────────────────────────
  const fetchScan = useCallback(async () => {
    try {
      const res = await fetch(`/api/scans/${id}`);
      if (!res.ok) throw new Error("Failed to fetch scan");
      const data = await res.json();
      setScan(data.scan);
      setBusinesses(data.businesses || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchScan();
  }, [fetchScan]);

  // Poll while in progress
  useEffect(() => {
    if (!scan) return;
    const inProgress = ["queued", "scanning", "analyzing"].includes(scan.status);
    if (!inProgress) return;

    const interval = setInterval(fetchScan, 3000);
    return () => clearInterval(interval);
  }, [scan, fetchScan]);

  // ── Export handler ───────────────────────────────────────────
  async function handleExport(format: "csv" | "xlsx") {
    if (!scan) return;
    setExporting(format);
    try {
      const res = await fetch("/api/exports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scanId: scan.id, format }),
      });
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mapko-scan-${scan.id.slice(0, 8)}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Export failed. Please try again.");
    } finally {
      setExporting(null);
    }
  }

  // ── Retry handler ──────────────────────────────────────────
  async function handleRetry() {
    if (!scan || retrying) return;
    setRetrying(true);
    setError(null);
    try {
      const res = await fetch("/api/scans/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scanId: scan.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Retry failed");
      }
      // Re-fetch scan to pick up the new "scanning" status and start polling
      await fetchScan();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Retry failed");
    } finally {
      setRetrying(false);
    }
  }

  // ── Delete handler ─────────────────────────────────────────
  async function handleDelete() {
    if (!scan || deleting) return;
    if (!window.confirm("Are you sure you want to delete this scan? This action cannot be undone.")) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/scans/${scan.id}/delete`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete scan");
      router.push("/dashboard/scans");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete scan");
      setDeleting(false);
    }
  }

  // ── Sort & filter ────────────────────────────────────────────
  const categories = useMemo(() => {
    const cats = new Set(businesses.map((b) => b.category));
    return Array.from(cats).sort();
  }, [businesses]);

  const filtered = useMemo(() => {
    let list = [...businesses];

    if (searchText) {
      const q = searchText.toLowerCase();
      list = list.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.address.toLowerCase().includes(q)
      );
    }

    if (filterCategory) {
      list = list.filter((b) => b.category === filterCategory);
    }

    if (filterScore) {
      list = list.filter((b) => {
        const score = b.analysis?.opportunity_score ?? 0;
        if (filterScore === "high") return score >= 70;
        if (filterScore === "medium") return score >= 40 && score < 70;
        if (filterScore === "low") return score < 40;
        return true;
      });
    }

    // Service need filters — find businesses that need YOUR services
    if (serviceNeed) {
      list = list.filter((b) => {
        const a = b.analysis;
        switch (serviceNeed) {
          case "no-website":
            return !a?.has_website && !b.website_url;
          case "bad-website":
            return a?.has_website && (!a?.website_ssl || !a?.website_responsive);
          case "no-social":
            return !a?.has_social_media;
          case "no-booking":
            return !a?.has_booking;
          case "no-whatsapp":
            return !a?.has_whatsapp;
          case "low-reviews":
            return b.review_count < 10;
          case "no-response":
            return (a?.review_response_rate ?? 0) === 0;
          case "needs-everything":
            return (a?.opportunity_score ?? 0) >= 70 && !a?.has_website;
          default:
            return true;
        }
      });
    }

    list.sort((a, b) => {
      let valA: number, valB: number;
      switch (sortKey) {
        case "score":
          valA = a.analysis?.opportunity_score ?? 0;
          valB = b.analysis?.opportunity_score ?? 0;
          break;
        case "rating":
          valA = a.rating ?? 0;
          valB = b.rating ?? 0;
          break;
        case "reviews":
          valA = a.review_count;
          valB = b.review_count;
          break;
        default:
          valA = 0;
          valB = 0;
      }
      return sortDir === "desc" ? valB - valA : valA - valB;
    });

    return list;
  }, [businesses, searchText, filterCategory, filterScore, serviceNeed, sortKey, sortDir]);

  // ── Score summary ────────────────────────────────────────────
  const summary = useMemo(() => {
    const scored = businesses.filter((b) => b.analysis);
    const total = scored.length;
    const avg =
      total > 0
        ? Math.round(
            scored.reduce((s, b) => s + (b.analysis?.opportunity_score ?? 0), 0) /
              total
          )
        : 0;
    const high = scored.filter((b) => (b.analysis?.opportunity_score ?? 0) >= 70).length;
    const medium = scored.filter(
      (b) => {
        const s = b.analysis?.opportunity_score ?? 0;
        return s >= 40 && s < 70;
      }
    ).length;
    const low = scored.filter((b) => (b.analysis?.opportunity_score ?? 0) < 40).length;
    return { total: businesses.length, avg, high, medium, low };
  }, [businesses]);

  // ── Toggle sort ──────────────────────────────────────────────
  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  // ── Loading state ────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error && !scan) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-destructive">{error}</p>
        <Button onClick={() => router.push("/dashboard/scans")}>
          Back to Scans
        </Button>
      </div>
    );
  }

  if (!scan) return null;

  const isInProgress = ["queued", "scanning", "analyzing"].includes(scan.status);
  const isFailed = scan.status === "failed";
  const isCompleted = scan.status === "completed";
  const currentPhase = phaseIndex(scan.status);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <button
            onClick={() => router.push("/dashboard/scans")}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Scans
          </button>
          <h1 className="text-xl sm:text-2xl font-bold">{scan.query_text}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {scan.radius_km}km radius &middot; Created{" "}
            {new Date(scan.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          {isCompleted && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport("csv")}
                disabled={!!exporting}
                className="flex-1 sm:flex-none"
              >
                {exporting === "csv" ? <Spinner size="sm" /> : <Download className="h-4 w-4" />}
                Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport("xlsx")}
                disabled={!!exporting}
                className="flex-1 sm:flex-none"
              >
                {exporting === "xlsx" ? <Spinner size="sm" /> : <Download className="h-4 w-4" />}
                Export XLSX
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 sm:flex-none text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            {deleting ? <Spinner size="sm" /> : <Trash2 className="h-4 w-4" />}
            Delete
          </Button>
        </div>
      </div>

      {/* Progress indicator */}
      {(isInProgress || isCompleted) && (
        <Card className="glass">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              {PHASES.map((phase, i) => {
                const isActive = i === currentPhase;
                const isDone = i < currentPhase || isCompleted;
                return (
                  <div key={phase.status} className="flex items-center gap-2 flex-1">
                    <div
                      className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all shrink-0",
                        isDone
                          ? "bg-primary border-primary text-primary-foreground"
                          : isActive
                          ? "border-primary text-primary animate-pulse"
                          : "border-border text-muted-foreground"
                      )}
                    >
                      {i + 1}
                    </div>
                    <span
                      className={cn(
                        "text-sm font-medium hidden sm:block",
                        isDone || isActive ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {phase.label}
                    </span>
                    {i < PHASES.length - 1 && (
                      <div
                        className={cn(
                          "flex-1 h-0.5 mx-2",
                          isDone ? "bg-primary" : "bg-muted"
                        )}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            {isInProgress && (
              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: "0%" }}
                  animate={{
                    width:
                      scan.status === "queued"
                        ? "15%"
                        : scan.status === "scanning"
                        ? "50%"
                        : "80%",
                  }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Failed state */}
      {isFailed && (
        <Card className="glass border-destructive/30">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-full bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">Scan Failed</p>
              <p className="text-sm text-muted-foreground mt-1">
                {scan.error_message || "An unexpected error occurred during scanning."}
              </p>
            </div>
            <Button onClick={handleRetry} variant="outline" disabled={retrying}>
              {retrying ? (
                <Spinner size="sm" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {retrying ? "Retrying..." : "Retry"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* In-progress waiting message */}
      {isInProgress && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Spinner size="lg" className="mb-4" />
          <p className="text-lg font-semibold">
            {scan.status === "queued" && "Preparing your scan..."}
            {scan.status === "scanning" && "Scanning for businesses..."}
            {scan.status === "analyzing" && "Analyzing digital presence..."}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            This usually takes 30 seconds to 2 minutes.
          </p>
        </div>
      )}

      {/* Completed: results */}
      {isCompleted && (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: "Total", value: summary.total, className: "text-foreground" },
              { label: "Avg Score", value: summary.avg, className: "text-blue-400" },
              { label: "High (70+)", value: summary.high, className: "text-red-400" },
              { label: "Medium (40-69)", value: summary.medium, className: "text-amber-400" },
              { label: "Low (0-39)", value: summary.low, className: "text-green-400" },
            ].map((s) => (
              <Card key={s.label} className="glass">
                <CardContent className="p-4 text-center">
                  <p className={cn("text-2xl font-bold", s.className)}>{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 rounded-lg p-1 w-fit" style={{ background: "hsl(var(--tab-bg))" }}>
            <button
              onClick={() => setActiveTab("map")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                activeTab === "map"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <MapPin className="h-4 w-4" />
              Map View
            </button>
            <button
              onClick={() => setActiveTab("list")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                activeTab === "list"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <List className="h-4 w-4" />
              List View
            </button>
          </div>

          {/* Map View tab */}
          {activeTab === "map" && (
            <ScanMap
              businesses={businesses}
              center={{ lat: scan.lat, lng: scan.lng }}
              radiusKm={scan.radius_km}
            />
          )}

          {/* List View tab */}
          {activeTab === "list" && (
            <Card className="glass overflow-hidden">
              {/* Service Need Quick Filters */}
              <div className="p-4 border-b border-border">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="h-4 w-4 text-blue-400" />
                  <span className="text-sm font-medium">Find clients that need:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: "", label: "All", icon: Filter, color: "" },
                    { key: "no-website", label: "Pagina Web", icon: Globe2, color: "text-red-400" },
                    { key: "bad-website", label: "Rediseño Web", icon: Paintbrush, color: "text-orange-400" },
                    { key: "no-social", label: "Redes Sociales", icon: AtSign, color: "text-pink-400" },
                    { key: "no-booking", label: "Sistema de Reservas", icon: CalendarCheck, color: "text-purple-400" },
                    { key: "no-whatsapp", label: "WhatsApp Business", icon: Phone, color: "text-green-400" },
                    { key: "low-reviews", label: "Reputacion Online", icon: MessageSquareDashed, color: "text-yellow-400" },
                    { key: "no-response", label: "Atencion al Cliente", icon: ThumbsDown, color: "text-amber-400" },
                    { key: "needs-everything", label: "Necesitan Todo", icon: Flame, color: "text-red-500" },
                  ].map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setServiceNeed(serviceNeed === f.key ? "" : f.key)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all border",
                        serviceNeed === f.key
                          ? "bg-blue-500/15 border-blue-500/30 text-blue-400"
                          : "bg-card/40 border-border/40 text-muted-foreground hover:bg-card/80 hover:text-foreground"
                      )}
                    >
                      <f.icon className={cn("h-3.5 w-3.5", serviceNeed === f.key ? "text-blue-400" : f.color)} />
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search & Category Filters */}
              <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 p-4 border-b border-border">
                <div className="relative w-full sm:w-56">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or address..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select
                  options={[
                    { value: "", label: "All Categories" },
                    ...categories.map((c) => ({ value: c, label: c })),
                  ]}
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full sm:w-48"
                />
                <Select
                  options={[
                    { value: "", label: "All Scores" },
                    { value: "high", label: "High (70+)" },
                    { value: "medium", label: "Medium (40-69)" },
                    { value: "low", label: "Low (0-39)" },
                  ]}
                  value={filterScore}
                  onChange={(e) => setFilterScore(e.target.value)}
                  className="w-full sm:w-44"
                />
                <span className="text-sm text-muted-foreground sm:ml-auto">
                  {filtered.length} of {businesses.length} businesses
                </span>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                        Name
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                        Category
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                        <button
                          onClick={() => toggleSort("rating")}
                          className="flex items-center gap-1 hover:text-foreground transition-colors"
                        >
                          Rating
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                        <button
                          onClick={() => toggleSort("reviews")}
                          className="flex items-center gap-1 hover:text-foreground transition-colors"
                        >
                          Reviews
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                        <button
                          onClick={() => toggleSort("score")}
                          className="flex items-center gap-1 hover:text-foreground transition-colors"
                        >
                          Score
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                        Needs
                      </th>
                      <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {filtered.map((biz, i) => {
                      const score = biz.analysis?.opportunity_score ?? 0;
                      const scoreColor = getScoreColor(score);
                      const hasWebsite = biz.analysis?.has_website ?? !!biz.website_url;
                      const hasSocial = biz.analysis?.has_social_media ?? false;

                      return (
                        <motion.tr
                          key={biz.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.15 }}
                          className="hover:bg-accent/50 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="font-medium text-sm">{biz.name}</p>
                                <a
                                  href={
                                    (biz.google_data?.googleMapsUri as string) ||
                                    `https://www.google.com/maps/place/?q=place_id:${biz.place_id}`
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                                  title="Open in Google Maps"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              </div>
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
                          <td className="px-4 py-3 text-sm">
                            <div className="flex items-center gap-1">
                              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                              {biz.review_count}
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
                                <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-red-500/10 text-red-400 border border-red-500/20" title="Needs website">
                                  <Globe2 className="h-3 w-3" />Web
                                </span>
                              )}
                              {hasWebsite && (!biz.analysis?.website_ssl || !biz.analysis?.website_responsive) && (
                                <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20" title="Website needs improvement">
                                  <Paintbrush className="h-3 w-3" />Fix
                                </span>
                              )}
                              {!hasSocial && (
                                <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-pink-500/10 text-pink-400 border border-pink-500/20" title="Needs social media">
                                  <AtSign className="h-3 w-3" />Social
                                </span>
                              )}
                              {!biz.analysis?.has_booking && (
                                <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20" title="Needs booking system">
                                  <CalendarCheck className="h-3 w-3" />Booking
                                </span>
                              )}
                              {!biz.analysis?.has_whatsapp && biz.phone && (
                                <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-green-500/10 text-green-400 border border-green-500/20" title="Needs WhatsApp Business">
                                  <Phone className="h-3 w-3" />WA
                                </span>
                              )}
                              {hasWebsite && hasSocial && biz.analysis?.has_booking && (
                                <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  OK
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {biz.phone && isMobileNumber(biz.phone) && (
                                <a
                                  href={`https://wa.me/${formatPhoneForWhatsApp(biz.phone)}?text=${encodeURIComponent("Hola! Encontré su negocio en Google Maps y me gustaría ofrecerle servicios digitales para mejorar su presencia online. ¿Podemos hablar?")}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-[#25D366] hover:text-[#1da851] hover:bg-[#25D366]/10"
                                    title="Contactar via WhatsApp"
                                  >
                                    <MessageCircle className="h-4 w-4" />
                                  </Button>
                                </a>
                              )}
                              {biz.phone && !isMobileNumber(biz.phone) && (
                                <a href={`tel:${biz.phone.replace(/[\s\-()]/g, "")}`}>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                    title={`Llamar: ${biz.phone} (teléfono fijo)`}
                                  >
                                    <Phone className="h-4 w-4" />
                                  </Button>
                                </a>
                              )}
                              <Link href={`/dashboard/businesses/${biz.id}`}>
                                <Button variant="ghost" size="sm">
                                  <Eye className="h-4 w-4" />
                                  View
                                </Button>
                              </Link>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                          No businesses match the current filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </motion.div>
  );
}
