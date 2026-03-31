"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  useAdvancedMarkerRef,
  useMap,
} from "@vis.gl/react-google-maps";
import { Star, Globe, Share2, ExternalLink, MapPin, Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BusinessWithAnalysis } from "@/types";
import Link from "next/link";

interface ScanMapProps {
  businesses: BusinessWithAnalysis[];
  center: { lat: number; lng: number };
  radiusKm: number;
}

function getMarkerColor(score: number): string {
  if (score >= 70) return "#ef4444"; // red — high opportunity
  if (score >= 40) return "#f59e0b"; // amber — medium
  return "#22c55e"; // green — low (already digital)
}

function MarkerWithInfo({
  business,
}: {
  business: BusinessWithAnalysis;
}) {
  const [infoOpen, setInfoOpen] = useState(false);
  const [markerRef, marker] = useAdvancedMarkerRef();
  const score = business.analysis?.opportunity_score ?? 0;
  const color = getMarkerColor(score);

  const handleClick = useCallback(() => setInfoOpen((o) => !o), []);
  const handleClose = useCallback(() => setInfoOpen(false), []);

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={{ lat: business.lat, lng: business.lng }}
        onClick={handleClick}
        title={business.name}
      >
        {/* Custom pin */}
        <div className="relative group cursor-pointer">
          <div
            className="w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-[10px] font-bold text-white transition-transform hover:scale-125"
            style={{ backgroundColor: color }}
          >
            {score}
          </div>
          {/* Pin tail */}
          <div
            className="w-0 h-0 mx-auto -mt-[1px]"
            style={{
              borderLeft: "5px solid transparent",
              borderRight: "5px solid transparent",
              borderTop: `6px solid ${color}`,
            }}
          />
        </div>
      </AdvancedMarker>

      {infoOpen && marker && (
        <InfoWindow anchor={marker} onCloseClick={handleClose}>
          <div className="min-w-[220px] max-w-[280px] p-1">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-semibold text-sm text-slate-900 leading-tight">
                {business.name}
              </h3>
              <Badge
                className={cn(
                  "text-[10px] font-bold shrink-0",
                  score >= 70
                    ? "bg-red-100 text-red-700"
                    : score >= 40
                    ? "bg-amber-100 text-amber-700"
                    : "bg-green-100 text-green-700"
                )}
              >
                {score}
              </Badge>
            </div>

            <p className="text-xs text-slate-500 mb-2">{business.address}</p>

            <div className="flex items-center gap-3 text-xs text-slate-600 mb-2">
              {business.rating && (
                <span className="flex items-center gap-0.5">
                  <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                  {business.rating.toFixed(1)}
                </span>
              )}
              <span>{business.review_count} reviews</span>
              <Badge variant="secondary" className="text-[10px]">
                {business.category}
              </Badge>
            </div>

            <div className="flex items-center gap-2 text-xs mb-3">
              <span className="flex items-center gap-1">
                <Globe
                  className={cn(
                    "h-3 w-3",
                    business.analysis?.has_website
                      ? "text-green-500"
                      : "text-red-400"
                  )}
                />
                {business.analysis?.has_website ? "Website" : "No website"}
              </span>
              <span className="flex items-center gap-1">
                <Share2
                  className={cn(
                    "h-3 w-3",
                    business.analysis?.has_social_media
                      ? "text-green-500"
                      : "text-red-400"
                  )}
                />
                {business.analysis?.has_social_media ? "Social" : "No social"}
              </span>
            </div>

            <Link href={`/dashboard/businesses/${business.id}`}>
              <Button size="sm" className="w-full text-xs h-7">
                <ExternalLink className="h-3 w-3" />
                View Full Analysis
              </Button>
            </Link>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

/**
 * HeatmapLayer component — uses the raw Google Maps instance
 * to manage a google.maps.visualization.HeatmapLayer.
 */
function HeatmapOverlay({ businesses }: { businesses: BusinessWithAnalysis[] }) {
  const map = useMap();
  const heatmapRef = useRef<google.maps.visualization.HeatmapLayer | null>(null);

  useEffect(() => {
    if (!map || !google.maps.visualization) return;

    const data = businesses.map((b) => ({
      location: new google.maps.LatLng(b.lat, b.lng),
      weight: (b.analysis?.opportunity_score ?? 50) / 100,
    }));

    if (!heatmapRef.current) {
      heatmapRef.current = new google.maps.visualization.HeatmapLayer({
        data,
        map,
        radius: 30,
        opacity: 0.7,
        gradient: [
          "rgba(0, 0, 0, 0)",
          "#22c55e",
          "#eab308",
          "#f97316",
          "#ef4444",
          "#dc2626",
        ],
      });
    } else {
      heatmapRef.current.setData(data);
      heatmapRef.current.setMap(map);
    }

    return () => {
      if (heatmapRef.current) {
        heatmapRef.current.setMap(null);
      }
    };
  }, [map, businesses]);

  return null;
}

export function ScanMap({ businesses, center, radiusKm }: ScanMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  const [viewMode, setViewMode] = useState<"pins" | "heatmap">("pins");

  if (!apiKey) {
    return (
      <div className="h-[300px] md:h-[500px] bg-slate-800/50 flex items-center justify-center rounded-lg">
        <p className="text-muted-foreground">
          Google Maps API key not configured
        </p>
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey} libraries={["visualization"]}>
      <div className="h-[300px] md:h-[500px] rounded-lg overflow-hidden relative">
        <Map
          defaultCenter={center}
          defaultZoom={getZoomForRadius(radiusKm)}
          mapId="mapko-scan-map"
          gestureHandling="greedy"
          disableDefaultUI={false}
          zoomControl={true}
          mapTypeControl={false}
          streetViewControl={false}
          fullscreenControl={true}
          styles={darkMapStyle}
        >
          {viewMode === "pins" &&
            businesses.map((biz) => (
              <MarkerWithInfo key={biz.id} business={biz} />
            ))}
          {viewMode === "heatmap" && (
            <HeatmapOverlay businesses={businesses} />
          )}
        </Map>

        {/* View mode toggle */}
        <div className="absolute top-2 left-2 sm:top-4 sm:left-4 flex rounded-lg overflow-hidden border border-white/10">
          <button
            onClick={() => setViewMode("pins")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
              viewMode === "pins"
                ? "bg-blue-500 text-white"
                : "bg-slate-900/90 text-white/70 hover:text-white hover:bg-slate-800/90"
            )}
          >
            <MapPin className="h-3.5 w-3.5" />
            Pins
          </button>
          <button
            onClick={() => setViewMode("heatmap")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
              viewMode === "heatmap"
                ? "bg-blue-500 text-white"
                : "bg-slate-900/90 text-white/70 hover:text-white hover:bg-slate-800/90"
            )}
          >
            <Flame className="h-3.5 w-3.5" />
            Heat Map
          </button>
        </div>

        {/* Legend */}
        <div className="absolute bottom-2 left-2 sm:bottom-4 sm:left-4 bg-slate-900/90 backdrop-blur-sm rounded-lg px-2 py-2 sm:px-4 sm:py-3 border border-white/10">
          <p className="text-[10px] sm:text-xs font-medium text-white/80 mb-1 sm:mb-2">Opportunity Score</p>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-[10px] sm:text-xs">
            <span className="flex items-center gap-1 sm:gap-1.5">
              <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-red-500" />
              <span className="text-white/70">High (70+)</span>
            </span>
            <span className="flex items-center gap-1 sm:gap-1.5">
              <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-amber-500" />
              <span className="text-white/70">Medium (40-69)</span>
            </span>
            <span className="flex items-center gap-1 sm:gap-1.5">
              <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-green-500" />
              <span className="text-white/70">Low (0-39)</span>
            </span>
          </div>
        </div>

        {/* Business count */}
        <div className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-slate-900/90 backdrop-blur-sm rounded-lg px-2 py-1 sm:px-3 sm:py-2 border border-white/10">
          <p className="text-[10px] sm:text-xs text-white/80">
            <span className="font-bold text-white">{businesses.length}</span> businesses
          </p>
        </div>
      </div>
    </APIProvider>
  );
}

function getZoomForRadius(radiusKm: number): number {
  if (radiusKm <= 0.5) return 16;
  if (radiusKm <= 1) return 15;
  if (radiusKm <= 2) return 14;
  if (radiusKm <= 5) return 13;
  if (radiusKm <= 10) return 12;
  return 11;
}

// Dark map style to match the dashboard aesthetic
const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#1a1a2e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a1a2e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8892b0" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#b8c4d8" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6b7894" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#1e2d3d" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#2a2a4a" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1a1a2e" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#3a3a5a" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#2a2a4a" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0e1a2b" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#4a5568" }],
  },
];
