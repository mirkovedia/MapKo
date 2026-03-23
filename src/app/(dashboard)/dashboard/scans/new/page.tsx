"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Radar, MapPin, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { LocationAutocomplete } from "@/components/scan/location-autocomplete";
import { Spinner } from "@/components/ui/spinner";
import { createClient } from "@/lib/supabase/client";
import { BUSINESS_CATEGORIES, PLAN_LIMITS, type PlanTier, type Profile } from "@/types";

export default function NewScanPage() {
  const router = useRouter();
  const [queryText, setQueryText] = useState("");
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | undefined>();
  const [radiusKm, setRadiusKm] = useState(2);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .single();
        if (data) setProfile(data as Profile);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  function toggleCategory(cat: string) {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!queryText.trim()) {
      setError("Please enter a location to scan.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/scans/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          queryText: queryText.trim(),
          placeId: selectedPlaceId,
          radiusKm,
          categories: selectedCategories,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || "Failed to create scan");
      }

      router.push(`/dashboard/scans/${data.scan.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  const plan = (profile?.plan || "free") as PlanTier;
  const limits = PLAN_LIMITS[plan];
  const scansUsed = profile?.scans_this_month || 0;
  const scansLimit = limits.scansPerMonth === -1 ? "Unlimited" : limits.scansPerMonth;
  const atLimit = limits.scansPerMonth !== -1 && scansUsed >= limits.scansPerMonth;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-2xl mx-auto space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold">New Scan</h1>
        <p className="text-muted-foreground mt-1">
          Discover businesses in a target area and analyze their digital presence.
        </p>
      </div>

      {/* Plan usage */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-white/5 rounded-lg px-4 py-3 border border-white/10">
        <Info className="h-4 w-4 shrink-0" />
        <span>
          {scansUsed} of {scansLimit} scans used this month
          {atLimit && (
            <span className="text-amber-400 ml-1">
              — Upgrade your plan for more scans.
            </span>
          )}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Location input */}
        <Card className="glass relative z-20 overflow-visible">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-blue-400" />
              Location
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 overflow-visible">
            <LocationAutocomplete
              value={queryText}
              onChange={(value, placeId) => {
                setQueryText(value);
                setSelectedPlaceId(placeId);
              }}
              placeholder="Search city or neighborhood in LATAM..."
            />
            <p className="text-xs text-muted-foreground">
              Bolivia, Peru, Argentina, Chile, Colombia, Mexico, Paraguay, Uruguay
            </p>
          </CardContent>
        </Card>

        {/* Radius slider */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-base">Search Radius</CardTitle>
          </CardHeader>
          <CardContent>
            <Slider
              min={0.5}
              max={10}
              step={0.5}
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              label="Radius"
              showValue
              unit=" km"
            />
          </CardContent>
        </Card>

        {/* Categories */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-base">Business Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Select the types of businesses to scan. Leave empty to scan all categories.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.keys(BUSINESS_CATEGORIES).map((cat) => {
                const isSelected = selectedCategories.includes(cat);
                return (
                  <label
                    key={cat}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors border ${
                      isSelected
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleCategory(cat)}
                      className="sr-only"
                    />
                    <div
                      className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${
                        isSelected
                          ? "bg-primary border-primary"
                          : "border-white/20"
                      }`}
                    >
                      {isSelected && (
                        <svg className="h-3 w-3 text-primary-foreground" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    {cat}
                  </label>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {/* Submit */}
        <Button
          type="submit"
          size="xl"
          className="w-full"
          disabled={submitting || atLimit}
        >
          {submitting ? (
            <>
              <Spinner size="sm" className="text-primary-foreground" />
              Creating Scan...
            </>
          ) : (
            <>
              <Radar className="h-5 w-5" />
              Start Scan
            </>
          )}
        </Button>
      </form>
    </motion.div>
  );
}
