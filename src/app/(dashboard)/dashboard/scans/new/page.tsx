"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Radar, MapPin, Info, Zap, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { LocationAutocomplete } from "@/components/scan/location-autocomplete";
import dynamic from "next/dynamic";
import { Spinner } from "@/components/ui/spinner";

// Lazy-load map preview (Google Maps doesn't need SSR)
const ScanPreviewMap = dynamic(
  () => import("@/components/scan/scan-preview-map").then((mod) => ({ default: mod.ScanPreviewMap })),
  {
    ssr: false,
    loading: () => (
      <div className="h-[200px] rounded-xl bg-card/40 border border-border/60 flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading map...</div>
      </div>
    ),
  }
);
import { useProfile } from "@/components/providers/profile-provider";
import { BUSINESS_CATEGORIES, PLAN_LIMITS, type PlanTier } from "@/types";
import { cn } from "@/lib/utils";

// ── Popular Zone Presets ─────────────────────────────────────────
interface ZonePreset {
  name: string;
  lat: number;
  lng: number;
  radiusKm: number;
}

interface CityGroup {
  city: string;
  zones: ZonePreset[];
}

interface CountryGroup {
  country: string;
  flag: string;
  cities: CityGroup[];
  defaultExpanded: boolean;
}

const ZONE_PRESETS: CountryGroup[] = [
  {
    country: "Bolivia",
    flag: "\u{1F1E7}\u{1F1F4}",
    defaultExpanded: true,
    cities: [
      {
        city: "Santa Cruz",
        zones: [
          { name: "Centro (1er Anillo)", lat: -17.7833, lng: -63.1821, radiusKm: 1 },
          { name: "Equipetrol", lat: -17.7697, lng: -63.1953, radiusKm: 1.5 },
          { name: "Plan 3000", lat: -17.8167, lng: -63.1500, radiusKm: 2 },
          { name: "Av. Monse\u00f1or Rivero", lat: -17.7780, lng: -63.1890, radiusKm: 1 },
          { name: "Ventura Mall Zone", lat: -17.7620, lng: -63.2050, radiusKm: 1.5 },
          { name: "Las Brisas", lat: -17.7550, lng: -63.1650, radiusKm: 1.5 },
        ],
      },
      {
        city: "La Paz",
        zones: [
          { name: "Zona Sur (Calacoto/San Miguel)", lat: -16.5280, lng: -68.0770, radiusKm: 2 },
          { name: "Centro (El Prado)", lat: -16.4955, lng: -68.1336, radiusKm: 1 },
        ],
      },
      {
        city: "Cochabamba",
        zones: [
          { name: "Centro", lat: -17.3935, lng: -66.1570, radiusKm: 1.5 },
        ],
      },
    ],
  },
  {
    country: "Peru",
    flag: "\u{1F1F5}\u{1F1EA}",
    defaultExpanded: false,
    cities: [
      {
        city: "Lima",
        zones: [
          { name: "Miraflores", lat: -12.1191, lng: -77.0300, radiusKm: 2 },
        ],
      },
    ],
  },
  {
    country: "Argentina",
    flag: "\u{1F1E6}\u{1F1F7}",
    defaultExpanded: false,
    cities: [
      {
        city: "Buenos Aires",
        zones: [
          { name: "Palermo", lat: -34.5795, lng: -58.4258, radiusKm: 2 },
        ],
      },
    ],
  },
  {
    country: "Mexico",
    flag: "\u{1F1F2}\u{1F1FD}",
    defaultExpanded: false,
    cities: [
      {
        city: "CDMX",
        zones: [
          { name: "Polanco", lat: -19.4320, lng: -99.1937, radiusKm: 2 },
        ],
      },
    ],
  },
  {
    country: "Colombia",
    flag: "\u{1F1E8}\u{1F1F4}",
    defaultExpanded: false,
    cities: [
      {
        city: "Bogot\u00e1",
        zones: [
          { name: "Zona T / Zona Rosa", lat: 4.6670, lng: -74.0520, radiusKm: 1.5 },
        ],
      },
    ],
  },
  {
    country: "Chile",
    flag: "\u{1F1E8}\u{1F1F1}",
    defaultExpanded: false,
    cities: [
      {
        city: "Santiago",
        zones: [
          { name: "Providencia", lat: -33.4264, lng: -70.6100, radiusKm: 2 },
        ],
      },
    ],
  },
];

export default function NewScanPage() {
  const router = useRouter();
  const [queryText, setQueryText] = useState("");
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | undefined>();
  const [centerCoords, setCenterCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [radiusKm, setRadiusKm] = useState(2);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { profile, loading } = useProfile();
  const [selectedZoneKey, setSelectedZoneKey] = useState<string | null>(null);
  const [expandedCountries, setExpandedCountries] = useState<Set<string>>(
    () => new Set(ZONE_PRESETS.filter((c) => c.defaultExpanded).map((c) => c.country))
  );

  function selectZone(zone: ZonePreset, city: string) {
    const key = `${city}-${zone.name}`;
    setSelectedZoneKey(key);
    setQueryText(`${zone.name}, ${city}`);
    setSelectedPlaceId(undefined);
    setCenterCoords({ lat: zone.lat, lng: zone.lng });
    setRadiusKm(zone.radiusKm);
  }

  function toggleCountry(country: string) {
    setExpandedCountries((prev) => {
      const next = new Set(prev);
      if (next.has(country)) next.delete(country);
      else next.add(country);
      return next;
    });
  }

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
      if (!res.ok) throw new Error(data.message || data.error || "Failed to create scan");
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
      transition={{ duration: 0.25 }}
      className="max-w-3xl mx-auto space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">New Scan</h1>
        <p className="text-muted-foreground mt-1">
          Discover businesses in a target area and analyze their digital presence.
        </p>
      </div>

      {/* Plan usage */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground rounded-xl px-4 py-3 bg-card/60 border border-border/60">
        <Info className="h-4 w-4 shrink-0 text-blue-400" />
        <span>
          {scansUsed} of {scansLimit} scans used this month
          {atLimit && (
            <span className="text-amber-400 ml-1">— Upgrade your plan for more scans.</span>
          )}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Location */}
        <div className="relative z-20">
          <div className="rounded-xl bg-card/60 border border-border/60 p-5 overflow-visible">
            <label className="text-sm font-medium flex items-center gap-2 mb-3">
              <MapPin className="h-4 w-4 text-blue-400" />
              Location
            </label>
            <LocationAutocomplete
              value={queryText}
              onChange={async (value, placeId) => {
                setQueryText(value);
                setSelectedPlaceId(placeId);
                if (placeId) {
                  try {
                    const res = await fetch(`/api/places/geocode?placeId=${encodeURIComponent(placeId)}`);
                    const data = await res.json();
                    if (data.lat != null && data.lng != null) setCenterCoords({ lat: data.lat, lng: data.lng });
                  } catch { /* silent */ }
                } else {
                  setCenterCoords(null);
                }
              }}
              placeholder="Search city or neighborhood in LATAM..."
            />
            <p className="text-xs text-muted-foreground mt-2">
              Bolivia, Peru, Argentina, Chile, Colombia, Mexico, Paraguay, Uruguay
            </p>
          </div>
        </div>

        {/* Popular Zones */}
        <div className="rounded-xl bg-card/60 border border-border/60 p-5">
          <label className="text-sm font-medium flex items-center gap-2 mb-4">
            <MapPin className="h-4 w-4 text-blue-400" />
            Popular Zones
          </label>
          <div className="space-y-3">
            {ZONE_PRESETS.map((country) => {
              const isExpanded = expandedCountries.has(country.country);
              return (
                <div key={country.country}>
                  <button
                    type="button"
                    onClick={() => toggleCountry(country.country)}
                    className="flex items-center gap-2 w-full text-left text-sm font-medium py-1.5 hover:text-foreground transition-colors"
                  >
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform duration-200",
                        !isExpanded && "-rotate-90"
                      )}
                    />
                    <span>{country.flag} {country.country}</span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="pl-6 pt-1 space-y-2">
                          {country.cities.map((cityGroup) => (
                            <div key={cityGroup.city}>
                              <p className="text-xs text-muted-foreground font-medium mb-1.5">{cityGroup.city}</p>
                              <div className="flex flex-wrap gap-2">
                                {cityGroup.zones.map((zone) => {
                                  const key = `${cityGroup.city}-${zone.name}`;
                                  const isSelected = selectedZoneKey === key;
                                  return (
                                    <button
                                      key={key}
                                      type="button"
                                      onClick={() => selectZone(zone, cityGroup.city)}
                                      className={cn(
                                        "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition-all duration-200 border",
                                        isSelected
                                          ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                                          : "bg-card/40 border-border/40 text-muted-foreground hover:bg-card/80 hover:border-border hover:text-foreground"
                                      )}
                                    >
                                      <MapPin className="h-3 w-3 shrink-0" />
                                      <div className="text-left">
                                        <span className="block leading-tight">{zone.name}</span>
                                        <span className="block text-[10px] opacity-60 leading-tight">{cityGroup.city} &middot; {zone.radiusKm}km</span>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>

        {/* Map preview */}
        {centerCoords ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="rounded-xl overflow-hidden border border-border/60"
          >
            <ScanPreviewMap
              center={centerCoords}
              radiusKm={radiusKm}
              onRadiusChange={(r) => setRadiusKm(r)}
              onCenterChange={(c) => setCenterCoords(c)}
            />
          </motion.div>
        ) : (
          <div className="h-[200px] rounded-xl bg-card/40 border border-dashed border-border/60 flex flex-col items-center justify-center gap-2">
            <MapPin className="h-6 w-6 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground/60">Select a location to preview the scan area</p>
          </div>
        )}

        {/* Radius */}
        <div className="rounded-xl bg-card/60 border border-border/60 p-5">
          <label className="text-sm font-medium mb-3 block">Search Radius</label>
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
        </div>

        {/* Categories */}
        <div className="rounded-xl bg-card/60 border border-border/60 p-5">
          <label className="text-sm font-medium mb-1 block">Business Categories</label>
          <p className="text-xs text-muted-foreground mb-4">
            Select types to scan, or leave empty for all categories.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.keys(BUSINESS_CATEGORIES).map((cat) => {
              const isSelected = selectedCategories.includes(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 border",
                    isSelected
                      ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                      : "bg-card/40 border-border/40 text-muted-foreground hover:bg-card/80 hover:border-border hover:text-foreground"
                  )}
                >
                  <div
                    className={cn(
                      "h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-all",
                      isSelected
                        ? "bg-blue-500 border-blue-500"
                        : "border-muted-foreground/30"
                    )}
                  >
                    {isSelected && (
                      <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        {/* Submit */}
        <Button
          type="submit"
          size="xl"
          className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg shadow-blue-500/20 glow-blue"
          disabled={submitting || atLimit}
        >
          {submitting ? (
            <>
              <Spinner size="sm" className="text-white" />
              Creating Scan...
            </>
          ) : (
            <>
              <Zap className="h-5 w-5" />
              Start Scan
            </>
          )}
        </Button>
      </form>
    </motion.div>
  );
}
