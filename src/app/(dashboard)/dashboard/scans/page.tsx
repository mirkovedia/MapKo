"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Radar, Eye, Search, Plus, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useCachedFetch, invalidateCache } from "@/lib/hooks/use-cached-fetch";
import type { Scan } from "@/types";

const statusConfig: Record<string, { label: string; variant: "warning" | "default" | "success" | "danger"; pulse?: boolean }> = {
  queued: { label: "Queued", variant: "warning" },
  scanning: { label: "Scanning", variant: "default", pulse: true },
  analyzing: { label: "Analyzing", variant: "default" },
  completed: { label: "Completed", variant: "success" },
  failed: { label: "Failed", variant: "danger" },
};

export default function ScansPage() {
  const { data: scansData, loading, error, refetch } = useCachedFetch<Scan[]>(
    "/api/scans",
    { transform: (raw: unknown) => (raw as { scans: Scan[] }).scans || [] }
  );
  const [scans, setScans] = useState<Scan[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Sync cached data to local state for delete mutations
  if (scansData && scansData !== scans && deletingId === null) {
    setScans(scansData);
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
      // error handled by useCachedFetch
    } finally {
      setDeletingId(null);
    }
  }

  if (loading && scans.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
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
        <Link href="/dashboard/scans/new">
          <Button>
            <Plus className="h-4 w-4" />
            New Scan
          </Button>
        </Link>
      </div>

      {scans.length === 0 ? (
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
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                    Query
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
                {scans.map((scan, i) => {
                  const cfg = statusConfig[scan.status] || statusConfig.queued;
                  return (
                    <motion.tr
                      key={scan.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15 }}
                      className="hover:bg-white/5 transition-colors"
                    >
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
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {new Date(scan.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {scan.total_businesses}
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
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </motion.div>
  );
}
