"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Radar,
  Building2,
  TrendingUp,
  Download,
  ArrowRight,
  Clock,
  Search,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { createClient } from "@/lib/supabase/client";
import type { Scan, Profile } from "@/types";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.4 },
  }),
};

const statusConfig: Record<string, { label: string; variant: "warning" | "default" | "success" | "danger"; pulse?: boolean }> = {
  queued: { label: "Queued", variant: "warning" },
  scanning: { label: "Scanning", variant: "default", pulse: true },
  analyzing: { label: "Analyzing", variant: "default" },
  completed: { label: "Completed", variant: "success" },
  failed: { label: "Failed", variant: "danger" },
};

export default function DashboardPage() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .single();
        if (profileData) setProfile(profileData as Profile);

        // Fetch scans
        const res = await fetch("/api/scans");
        if (!res.ok) throw new Error("Failed to fetch scans");
        const { scans: scanData } = await res.json();
        setScans(scanData || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
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
  const avgScore =
    completedScans.length > 0
      ? Math.round(
          completedScans.reduce((sum, s) => sum + (s.total_businesses || 0), 0) /
            completedScans.length
        )
      : 0;
  const recentScans = scans.slice(0, 5);

  const stats = [
    { label: "Total Scans", value: scans.length, icon: Radar, color: "text-blue-400" },
    { label: "Businesses Found", value: totalBusinesses, icon: Building2, color: "text-emerald-400" },
    { label: "Avg Opportunity Score", value: avgScore, icon: TrendingUp, color: "text-amber-400" },
    { label: "Exports Generated", value: 0, icon: Download, color: "text-purple-400" },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-2xl font-bold">
          Welcome back{profile?.company_name ? `, ${profile.company_name}` : ""}
        </h1>
        <p className="text-muted-foreground mt-1">
          Here is an overview of your prospecting activity.
        </p>
      </motion.div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            custom={i}
            initial="hidden"
            animate="visible"
            variants={fadeIn}
          >
            <Card className="glass glass-hover">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <div className={`p-2 rounded-lg bg-white/5 ${stat.color}`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Recent scans */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        custom={4}
      >
        <Card className="glass">
          <div className="flex items-center justify-between p-6 pb-0">
            <h2 className="text-lg font-semibold">Recent Scans</h2>
            {scans.length > 0 && (
              <Link href="/dashboard/scans">
                <Button variant="ghost" size="sm">
                  View All <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
          <CardContent className="p-6">
            {recentScans.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 rounded-full bg-white/5 mb-4">
                  <Search className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-lg mb-1">No scans yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start your first scan to discover business opportunities!
                </p>
                <Link href="/dashboard/scans/new">
                  <Button>
                    <Radar className="h-4 w-4" />
                    Start Your First Scan
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {recentScans.map((scan) => {
                  const cfg = statusConfig[scan.status] || statusConfig.queued;
                  return (
                    <Link
                      key={scan.id}
                      href={`/dashboard/scans/${scan.id}`}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-white/5">
                          <Radar className="h-4 w-4 text-blue-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">
                            {scan.query_text}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <Clock className="h-3 w-3" />
                            {new Date(scan.created_at).toLocaleDateString()}
                            <span className="text-muted-foreground/50">|</span>
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
                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
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
