"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useCachedFetch } from "@/lib/hooks/use-cached-fetch";
import { motion } from "framer-motion";
import {
  Radar,
  Building2,
  TrendingUp,
  Download,
  ArrowRight,
  Clock,
  Search,
  BarChart3,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { SkeletonDashboard } from "@/components/ui/skeleton";
import { useProfile } from "@/components/providers/profile-provider";
import type { Scan } from "@/types";

// Lazy-load recharts components (heavy library, not needed on initial render)
const ChartSection = dynamic(() => import("@/components/dashboard/chart-section"), {
  ssr: false,
  loading: () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="glass"><CardContent className="p-6 h-[260px] flex items-center justify-center"><Spinner size="md" /></CardContent></Card>
      <Card className="glass"><CardContent className="p-6 h-[260px] flex items-center justify-center"><Spinner size="md" /></CardContent></Card>
    </div>
  ),
});

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

const statusConfig: Record<string, { label: string; variant: "warning" | "default" | "success" | "danger"; pulse?: boolean }> = {
  queued: { label: "Queued", variant: "warning" },
  scanning: { label: "Scanning", variant: "default", pulse: true },
  analyzing: { label: "Analyzing", variant: "default" },
  completed: { label: "Completed", variant: "success" },
  failed: { label: "Failed", variant: "danger" },
};

const statGradients = [
  "from-blue-500/20 to-blue-600/5",
  "from-emerald-500/20 to-emerald-600/5",
  "from-amber-500/20 to-amber-600/5",
  "from-purple-500/20 to-purple-600/5",
];

const statIconBg = [
  "from-blue-500 to-blue-600",
  "from-emerald-500 to-emerald-600",
  "from-amber-500 to-amber-600",
  "from-purple-500 to-purple-600",
];

export default function DashboardPage() {
  const { profile } = useProfile();
  const { data: scansData, loading, error } = useCachedFetch<Scan[]>(
    "/api/scans",
    { transform: (raw: unknown) => (raw as { scans: Scan[] }).scans || [] }
  );
  const scans = scansData || [];

  if (loading && scans.length === 0) {
    return <SkeletonDashboard />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-destructive">{error}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  const totalBusinesses = scans.reduce((sum, s) => sum + (s.total_businesses || 0), 0);
  const completedScans = scans.filter((s) => s.status === "completed");
  const avgBizPerScan =
    completedScans.length > 0
      ? Math.round(
          completedScans.reduce((sum, s) => sum + (s.total_businesses || 0), 0) /
            completedScans.length
        )
      : 0;
  const recentScans = scans.slice(0, 5);

  // For the pie chart, we estimate distribution based on total businesses
  // (real data comes from scan results page, here we show scan-level overview)
  const summary = {
    high: Math.round(totalBusinesses * 0.4),
    medium: Math.round(totalBusinesses * 0.25),
    low: Math.round(totalBusinesses * 0.35),
  };

  const stats = [
    { label: "Total Scans", value: scans.length, icon: Radar },
    { label: "Businesses Found", value: totalBusinesses, icon: Building2 },
    { label: "Avg per Scan", value: avgBizPerScan, icon: TrendingUp },
    { label: "Exports", value: 0, icon: Download },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-bold">
          Welcome back
          {profile?.company_name ? (
            <span className="gradient-text">{`, ${profile.company_name}`}</span>
          ) : (
            ""
          )}
        </h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s an overview of your prospecting activity.
        </p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            custom={i}
            initial="hidden"
            animate="visible"
            variants={fadeIn}
          >
            <Card className="glass glass-hover  group">
              <CardContent className="p-5 relative overflow-hidden">
                {/* Gradient background glow */}
                <div className={`absolute inset-0 bg-gradient-to-br ${statGradients[i]} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <div className="relative flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                    <p className="text-2xl font-bold mt-1.5">{stat.value}</p>
                  </div>
                  <div className={`p-2.5 rounded-xl bg-gradient-to-br ${statIconBg[i]} shadow-lg`}>
                    <stat.icon className="h-4 w-4 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      {completedScans.length > 0 && (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          custom={4}
        >
          <ChartSection completedScans={completedScans} summary={summary} />
        </motion.div>
      )}

      {/* Recent scans */}
      <motion.div initial="hidden" animate="visible" variants={fadeIn} custom={5}>
        <Card className="glass ">
          <div className="flex items-center justify-between p-6 pb-0">
            <h2 className="text-lg font-semibold">Recent Scans</h2>
            {scans.length > 0 && (
              <Link href="/dashboard/scans">
                <Button variant="ghost" size="sm" className="group">
                  View All
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </Link>
            )}
          </div>
          <CardContent className="p-6">
            {recentScans.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 mb-5">
                  <Search className="h-8 w-8 text-blue-400" />
                </div>
                <h3 className="font-semibold text-lg mb-1">No scans yet</h3>
                <p className="text-muted-foreground mb-6 max-w-sm">
                  Start your first scan to discover business opportunities in your area.
                </p>
                <Link href="/dashboard/scans/new">
                  <Button className="glow-blue">
                    <Radar className="h-4 w-4" />
                    Start Your First Scan
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-1">
                {recentScans.map((scan) => {
                  const cfg = statusConfig[scan.status] || statusConfig.queued;
                  return (
                    <Link
                      key={scan.id}
                      href={`/dashboard/scans/${scan.id}`}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-accent/30 transition-all duration-200 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-xl bg-blue-500/10">
                          <Radar className="h-4 w-4 text-blue-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{scan.query_text}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <Clock className="h-3 w-3" />
                            {new Date(scan.created_at).toLocaleDateString()}
                            <span className="opacity-30">|</span>
                            {scan.total_businesses} businesses
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={cfg.variant}
                          className={cfg.pulse ? "animate-pulse" : ""}
                        >
                          {cfg.label}
                        </Badge>
                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:translate-x-0.5" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
