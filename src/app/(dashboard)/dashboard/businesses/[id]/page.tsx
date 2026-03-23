"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Globe,
  Share2,
  Star,
  MapPin,
  ExternalLink,
  Check,
  X,
  Clock,
  Code,
  BarChart3,
  Lightbulb,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn, getScoreColor, getScoreLabel } from "@/lib/utils";
import type { BusinessWithAnalysis } from "@/types";

function BoolIndicator({ value, label }: { value: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
      <div
        className={cn(
          "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
          value ? "bg-green-400/10 text-green-400" : "bg-red-400/10 text-red-400"
        )}
      >
        {value ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
      </div>
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

function PercentBar({ value, label }: { value: number; label: string }) {
  const pct = Math.round(value * 100);
  return (
    <div className="p-3 rounded-lg bg-white/5">
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{pct}%</span>
      </div>
      <div className="w-full bg-white/10 rounded-full h-2">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function BusinessDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [business, setBusiness] = useState<BusinessWithAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/businesses/${id}`);
        if (!res.ok) throw new Error("Failed to fetch business");
        const data = await res.json();
        setBusiness(data.business);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-destructive">{error || "Business not found"}</p>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  const analysis = business.analysis;
  const score = analysis?.opportunity_score ?? 0;
  const scoreColor = getScoreColor(score);
  const scoreLabel = getScoreLabel(score);
  const socialLinks = analysis?.social_links ?? {};
  const socialEntries = Object.entries(socialLinks);
  const ringColorClass =
    scoreColor === "high"
      ? "text-red-400"
      : scoreColor === "medium"
      ? "text-amber-400"
      : "text-green-400";
  const ringBgClass =
    scoreColor === "high"
      ? "stroke-red-400"
      : scoreColor === "medium"
      ? "stroke-amber-400"
      : "stroke-green-400";

  // Calculate the circumference and offset for the score ring
  const RADIUS = 54;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const offset = CIRCUMFERENCE - (score / 100) * CIRCUMFERENCE;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6 max-w-4xl"
    >
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Scan
      </button>

      {/* Business header */}
      <Card className="glass">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">{business.name}</h1>
              <div className="flex items-center gap-2 text-muted-foreground mt-2">
                <MapPin className="h-4 w-4 shrink-0" />
                <span className="text-sm">{business.address}</span>
              </div>
              <div className="flex items-center gap-3 mt-3">
                <Badge variant="secondary">{business.category}</Badge>
                {business.rating !== null && (
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                    <span className="font-medium">{business.rating.toFixed(1)}</span>
                    <span className="text-muted-foreground">
                      ({business.review_count} reviews)
                    </span>
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-3">
                <a
                  href={`https://www.google.com/maps/place/?q=place_id:${business.place_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm">
                    <MapPin className="h-4 w-4" />
                    Google Maps
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </a>
                {business.website_url && (
                  <a href={business.website_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm">
                      <Globe className="h-4 w-4" />
                      Website
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </a>
                )}
              </div>
            </div>

            {/* Score indicator */}
            <div className="flex flex-col items-center shrink-0">
              <div className="relative h-32 w-32">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
                  <circle
                    cx="60"
                    cy="60"
                    r={RADIUS}
                    fill="none"
                    className="stroke-white/10"
                    strokeWidth="8"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r={RADIUS}
                    fill="none"
                    className={ringBgClass}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={CIRCUMFERENCE}
                    strokeDashoffset={offset}
                    style={{ transition: "stroke-dashoffset 1s ease-out" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={cn("text-3xl font-bold", ringColorClass)}>{score}</span>
                </div>
              </div>
              <p className={cn("text-sm font-semibold mt-1", ringColorClass)}>
                {scoreLabel}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Digital Presence Audit */}
      {analysis && (
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-400" />
              Digital Presence Audit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <BoolIndicator value={analysis.has_website} label="Website" />
              <BoolIndicator value={analysis.website_ssl} label="SSL Certificate" />
              <BoolIndicator value={analysis.website_responsive} label="Mobile Friendly" />
              <BoolIndicator value={analysis.has_booking} label="Online Booking" />
              <BoolIndicator value={analysis.has_whatsapp} label="WhatsApp" />
              <BoolIndicator value={analysis.has_social_media} label="Social Media Presence" />

              {/* Website URL */}
              {analysis.has_website && business.website_url && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 col-span-full">
                  <div className="h-8 w-8 rounded-full bg-blue-400/10 text-blue-400 flex items-center justify-center shrink-0">
                    <Globe className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Website URL</p>
                    <a
                      href={business.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline truncate block"
                    >
                      {business.website_url}
                    </a>
                  </div>
                </div>
              )}

              {/* Social media links */}
              {socialEntries.length > 0 && (
                <div className="p-3 rounded-lg bg-white/5 col-span-full">
                  <div className="flex items-center gap-2 mb-2">
                    <Share2 className="h-4 w-4 text-blue-400" />
                    <span className="text-sm font-medium">Social Media Links</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {socialEntries.map(([platform, url]) => (
                      <a
                        key={platform}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded-md px-2.5 py-1.5 transition-colors"
                      >
                        {platform}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Percentages */}
              <PercentBar
                value={analysis.review_response_rate}
                label="Review Response Rate"
              />
              <PercentBar
                value={analysis.profile_completeness}
                label="Profile Completeness"
              />

              {/* Website Technology */}
              {analysis.website_tech && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                  <div className="h-8 w-8 rounded-full bg-purple-400/10 text-purple-400 flex items-center justify-center shrink-0">
                    <Code className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Website Technology</p>
                    <p className="text-sm font-medium">{analysis.website_tech}</p>
                  </div>
                </div>
              )}

              {/* Load Time */}
              {analysis.website_load_time_ms !== null && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                  <div className="h-8 w-8 rounded-full bg-amber-400/10 text-amber-400 flex items-center justify-center shrink-0">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Load Time</p>
                    <p className="text-sm font-medium">{analysis.website_load_time_ms}ms</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {analysis && analysis.recommendations.length > 0 && (
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-400" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analysis.recommendations.map((rec, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1, duration: 0.3 }}
                  className="flex items-start gap-3 p-3 rounded-lg bg-white/5"
                >
                  <div className="h-6 w-6 rounded-full bg-amber-400/10 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-bold">{i + 1}</span>
                  </div>
                  <p className="text-sm">{rec}</p>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Back button */}
      <Button variant="outline" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4" />
        Back to Scan
      </Button>
    </motion.div>
  );
}
