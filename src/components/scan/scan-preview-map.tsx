"use client";

import { useEffect, useRef, useCallback } from "react";
import { APIProvider, Map, useMap } from "@vis.gl/react-google-maps";

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

function getZoomForRadius(radiusKm: number): number {
  if (radiusKm <= 0.5) return 16;
  if (radiusKm <= 1) return 15;
  if (radiusKm <= 2) return 14;
  if (radiusKm <= 5) return 13;
  if (radiusKm <= 10) return 12;
  return 11;
}

interface RadiusCircleProps {
  center: { lat: number; lng: number };
  radiusKm: number;
  onRadiusChange?: (newRadiusKm: number) => void;
  onCenterChange?: (newCenter: { lat: number; lng: number }) => void;
}

/**
 * Interactive circle overlay — drag the edge to resize, drag center to move.
 */
function RadiusCircle({ center, radiusKm, onRadiusChange, onCenterChange }: RadiusCircleProps) {
  const map = useMap();
  const circleRef = useRef<google.maps.Circle | null>(null);
  const isUserEditingRef = useRef(false);

  const updateCircle = useCallback(() => {
    if (!map) return;

    if (!circleRef.current) {
      circleRef.current = new google.maps.Circle({
        map,
        center,
        radius: radiusKm * 1000,
        fillColor: "#3b82f6",
        fillOpacity: 0.12,
        strokeColor: "#3b82f6",
        strokeOpacity: 0.6,
        strokeWeight: 2,
        editable: true,
        draggable: true,
      });

      // Listen for radius changes (user drags the edge)
      circleRef.current.addListener("radius_changed", () => {
        if (!circleRef.current || !onRadiusChange) return;
        isUserEditingRef.current = true;
        const newRadiusM = circleRef.current.getRadius();
        // Snap to 0.5km increments, clamp to 0.5-10
        const newRadiusKm = Math.round((newRadiusM / 1000) * 2) / 2;
        const clamped = Math.max(0.5, Math.min(10, newRadiusKm));
        onRadiusChange(clamped);
        // Update zoom to match
        map.setZoom(getZoomForRadius(clamped));
        setTimeout(() => { isUserEditingRef.current = false; }, 100);
      });

      // Listen for center changes (user drags the circle)
      circleRef.current.addListener("center_changed", () => {
        if (!circleRef.current || !onCenterChange) return;
        isUserEditingRef.current = true;
        const newCenter = circleRef.current.getCenter();
        if (newCenter) {
          onCenterChange({ lat: newCenter.lat(), lng: newCenter.lng() });
        }
        setTimeout(() => { isUserEditingRef.current = false; }, 100);
      });
    } else if (!isUserEditingRef.current) {
      // Only update programmatically if user isn't dragging
      circleRef.current.setCenter(center);
      circleRef.current.setRadius(radiusKm * 1000);
    }

    if (!isUserEditingRef.current) {
      map.panTo(center);
      map.setZoom(getZoomForRadius(radiusKm));
    }
  }, [map, center, radiusKm, onRadiusChange, onCenterChange]);

  useEffect(() => {
    updateCircle();
  }, [updateCircle]);

  useEffect(() => {
    return () => {
      if (circleRef.current) {
        google.maps.event.clearInstanceListeners(circleRef.current);
        circleRef.current.setMap(null);
        circleRef.current = null;
      }
    };
  }, []);

  return null;
}

interface ScanPreviewMapProps {
  center: { lat: number; lng: number };
  radiusKm: number;
  onRadiusChange?: (newRadiusKm: number) => void;
  onCenterChange?: (newCenter: { lat: number; lng: number }) => void;
}

export function ScanPreviewMap({ center, radiusKm, onRadiusChange, onCenterChange }: ScanPreviewMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

  if (!apiKey) {
    return (
      <div className="h-[280px] bg-slate-800/50 flex items-center justify-center rounded-lg border border-white/10">
        <p className="text-sm text-muted-foreground">
          Google Maps API key not configured
        </p>
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey}>
      <div className="relative h-[320px] rounded-xl overflow-hidden border border-border/60">
        <Map
          defaultCenter={center}
          defaultZoom={getZoomForRadius(radiusKm)}
          mapId="mapko-preview-map"
          gestureHandling="greedy"
          disableDefaultUI={true}
          zoomControl={true}
          mapTypeControl={false}
          streetViewControl={false}
          fullscreenControl={false}
          styles={darkMapStyle}
        >
          <RadiusCircle
            center={center}
            radiusKm={radiusKm}
            onRadiusChange={onRadiusChange}
            onCenterChange={onCenterChange}
          />
        </Map>
        {/* Radius indicator overlay */}
        <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs text-white/90 border border-white/10">
          <span className="text-blue-400 font-semibold">{radiusKm} km</span> radius — drag edge to resize
        </div>
      </div>
    </APIProvider>
  );
}
