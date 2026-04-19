"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Radar, Eye, Search, Plus, Trash2, MapPin, GitCompareArrows } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton, SkeletonTable } from "@/components/ui/skeleton";
import { useCachedFetch, invalidateCache } from "@/lib/hooks/use-cached-fetch";
import type { Scan } from "@/types";

const statusConfig: Record<string, { label: string; variant: "warning" | "default" | "success" | "danger"; pulse?: boolean }> = {
  queued: { label: "Queued", variant: "warning" },
  scanning: { label: "Scanning", variant: "default", pulse: true },
  analyzing: { label: "Analyzing", variant: "default" },
  completed: { label: "Completed", variant: "success" },
  failed: { label: "Failed", variant: "danger" },
};

function extractCity(queryText: string): string {
  const parts = queryText.split(",").map((p) => p.trim());
  if (parts.length >= 2) return parts[parts.length - 1];
  const words = queryText.trim().split(/\s+/);
  return words[words.length - 1] || queryText;
}

export default function ScansPage() {
  const { data: scansData, loading, error, refetch } = useCachedFetch<Scan[]>(
    "/api/scans",
    { transform: (raw: unknown) => (raw as { scans: Scan[] }).scans || [] }
  );
  const [scans, setScans] = useState<Scan[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [filterCity, setFilterCity] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  useEffect(() => {
    if (scansData && deletingId === null) {
      setScans(scansData);
    }
  }, [scansData, deletingId]);

  const cities = useMemo(() => {
    const citySet = new Set(scans.map((s) => extractCity(s.query_text)));
    return Array.from(citySet).sort();
  }, [scans]);

  const filtered = useMemo(() => {
    let list = [...scans];
    if (searchText) {
      const q = searchText.toLowerCase();
      list = list.filter((s) => s.query_text.toLowerCase().includes(q));
    }
    if (filterCity) {
      list = list.filter((s) => extractCity(s.query_text) === filterCity);
    }
    if (filterStatus) {
      list = list.filter((s) => s.status === filterStatus);
    }
    return list;
  }, [scans, searchText, filterCity, filterStatus]);

  function toggleCompare(scanId: string) {
    setCompareIds((prev) => {
      if (prev.includes(scanId)) return prev.filter((id) => id !== scanId);
      if (prev.length >= 2) return [prev[1], scanId];
      return [...prev, scanId];
    });
  }

  async function handleDelete(scanId: string) {
    if (!window.confirm("Are you sure you want to delete this scan? This action cannot be undone.")) {
      return;
    }
    setDeletingId(scanId);
    try {
      const res = await fetch(`/api/scans/${scanId}/delete`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete scan");
      setScans((prev) => prev.filter((s) => s.id !== scanId));
      invalidateCache("/api/scans");
    } catch {
      // silently fail
    } finally {
      setDeletingId(null);
    }
  }

  if (loading && scans.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-10 w-28 rounded-lg" />
        </div>
        <SkeletonTable rows={6} />
      </div>
    );
  }

  if (error && scans.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-destructive">{error}</p>
        <Button onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Scans</h1>
          <p className="text-muted-foreground mt-1">
            All your area scans and their results.
          </p>
        </div>
        <div className="flex gap-2">
          {scans.filter((s) => s.status === "completed").length >= 2 && (
            <Button
              variant={compareMode ? "default" : "outline"}
              onClick={() => {
                setCompareMode(!compareMode);
                setCompareIds([]);
              }}
              className="gap-1.5"
            >
              <GitCompareArrows className="h-4 w-4" />
              {compareMode ? "Cancel" : "Compare"}
            </Button>
          )}
          <Link href="/dashboard/scans/new">
            <Button>
              <Plus className="h-4 w-4" />
              New Scan
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      {scans.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search scans..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-8"
            />
          </div>
          {cities.length > 1 && (
            <Select
              options={[
                { value: "", label: "All Cities" },
                ...cities.map((c) => ({ value: c, label: c })),
              ]}
              value={filterCity}
              onChange={(e) => setFilterCity(e.target.value)}
              className="w-full sm:w-44"
            />
          )}
          <Select
            options={[
              { value: "", label: "All Status" },
              { value: "completed", label: "Completed" },
              { value: "scanning", label: "Scanning" },
              { value: "failed", label: "Failed" },
              { value: "queued", label: "Queued" },
            ]}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full sm:w-40"
          />
          <span className="text-sm text-muted-foreground flex items-center sm:ml-auto">
            {filtered.length} of {scans.length} scans
          </span>
        </div>
      )}

      {/* Compare mode banner */}
      {compareMode && (
        <Card className="glass border-blue-500/30">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <GitCompareArrows className="h-5 w-5 text-blue-400" />
              <span className="text-sm">
                Select 2 completed scans to compare.{" "}
                <span className="text-muted-foreground">
                  ({compareIds.length}/2 selected)
                </span>
              </span>
            </div>
            {compareIds.length === 2 && (
              <Link href={`/dashboard/scans/compare?a=${compareIds[0]}&b=${compareIds[1]}`}>
                <Button size="sm" className="gap-1.5">
                  <GitCompareArrows className="h-4 w-4" />
                  Compare Now
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {filtered.length === 0 && scans.length === 0 ? (
        <Card className="glass">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-full bg-white/5 mb-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-1">No scans yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first scan to start discovering local business opportunities.
            </p>
            <Link href="/dashboard/scans/new">
              <Button>
                <Radar className="h-4 w-4" />
                Start Your First Scan
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card className="glass overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  {compareMode && (
                    <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3 w-10">
                      Sel
                    </th>
                  )}
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                    Query
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      City
                    </div>
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                    Date
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                    Businesses
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                    Status
                  </th>
                  <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((scan) => {
                  const cfg = statusConfig[scan.status] || statusConfig.queued;
                  const city = extractCity(scan.query_text);
                  const isSelected = compareIds.includes(scan.id);
                  const isCompleted = scan.status === "completed";
                  return (
                    <motion.tr
                      key={scan.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15 }}
                      className={`hover:bg-white/5 transition-colors ${isSelected ? "bg-blue-500/10" : ""}`}
                    >
                      {compareMode && (
                        <td className="px-4 py-4 text-center">
                          {isCompleted ? (
                            <button
                              onClick={() => toggleCompare(scan.id)}
                              className={`h-5 w-5 rounded border-2 transition-all ${
                                isSelected
                                  ? "bg-blue-500 border-blue-500"
                                  : "border-muted-foreground/40 hover:border-blue-400"
                              }`}
                            >
                              {isSelected && (
                                <svg className="h-full w-full text-white" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </button>
                          ) : (
                            <span className="text-xs text-muted-foreground/30">-</span>
                          )}
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 rounded-md bg-white/5">
                            <Radar className="h-3.5 w-3.5 text-blue-400" />
                          </div>
                          <span className="font-medium truncate max-w-[200px]">
                            {scan.query_text}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="secondary" className="text-xs gap-1">
                          <MapPin className="h-3 w-3" />
                          {city}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {new Date(scan.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {scan.total_businesses ?? 0}
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          variant={cfg.variant}
                          className={cfg.pulse ? "animate-pulse" : ""}
                        >
                          {cfg.label}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/dashboard/scans/${scan.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                              View
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(scan.id)}
                            disabled={deletingId === scan.id}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            {deletingId === scan.id ? (
                              <Spinner size="sm" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
                {filtered.length === 0 && scans.length > 0 && (
                  <tr>
                    <td colSpan={compareMode ? 7 : 6} className="px-6 py-12 text-center text-muted-foreground">
                      No scans match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </motion.div>
  );
}
