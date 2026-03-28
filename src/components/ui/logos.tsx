"use client";

import { cn } from "@/lib/utils";

interface LogoProps {
  size?: number;
  className?: string;
}

// Option 1: Map Pin + Radar waves
export function LogoRadar({ size = 32, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className}>
      {/* Radar waves */}
      <circle cx="20" cy="18" r="16" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.3" />
      <circle cx="20" cy="18" r="11" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.5" />
      <circle cx="20" cy="18" r="6" stroke="#3b82f6" strokeWidth="1.5" opacity="0.7" />
      {/* Pin */}
      <path d="M20 6C15.03 6 11 10.03 11 15c0 7.13 9 19 9 19s9-11.87 9-19c0-4.97-4.03-9-9-9z" fill="url(#grad1)" />
      <circle cx="20" cy="15" r="3.5" fill="white" />
      <defs>
        <linearGradient id="grad1" x1="11" y1="6" x2="29" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3b82f6" />
          <stop offset="1" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// Option 2: Letter M as map pin shape
export function LogoMPin({ size = 32, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className}>
      <path d="M20 2C13.37 2 8 7.37 8 14c0 9.94 12 24 12 24s12-14.06 12-24C32 7.37 26.63 2 20 2z" fill="url(#mpin)" />
      {/* Letter M — slightly smaller, centered in pin */}
      <path d="M14.5 19V11l5.5 6 5.5-6v8" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <defs>
        <linearGradient id="mpin" x1="8" y1="2" x2="32" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3b82f6" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// Option 3: Hexagonal scanner / crosshair
export function LogoHex({ size = 32, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className}>
      {/* Hexagon */}
      <path d="M20 3L35 11.66V28.34L20 37L5 28.34V11.66L20 3Z" fill="url(#hex)" strokeWidth="0" />
      {/* Crosshair / scanner */}
      <circle cx="20" cy="20" r="7" stroke="white" strokeWidth="1.5" opacity="0.9" />
      <line x1="20" y1="10" x2="20" y2="16" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="20" y1="24" x2="20" y2="30" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="10" y1="20" x2="16" y2="20" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="24" y1="20" x2="30" y2="20" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      {/* Center dot */}
      <circle cx="20" cy="20" r="2" fill="white" />
      <defs>
        <linearGradient id="hex" x1="5" y1="3" x2="35" y2="37" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3b82f6" />
          <stop offset="1" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// Option 4: Map pin with lightning bolt (speed/scan)
export function LogoBolt({ size = 32, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className}>
      {/* Rounded square background */}
      <rect x="2" y="2" width="36" height="36" rx="10" fill="url(#bolt)" />
      {/* Pin outline */}
      <path d="M20 8C15.58 8 12 11.58 12 16c0 6 8 16 8 16s8-10 8-16c0-4.42-3.58-8-8-8z" stroke="white" strokeWidth="1.5" fill="none" opacity="0.5" />
      {/* Lightning bolt */}
      <path d="M22 10L16 20h4l-2 10 8-12h-5l1-8z" fill="white" />
      <defs>
        <linearGradient id="bolt" x1="2" y1="2" x2="38" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3b82f6" />
          <stop offset="1" stopColor="#6366f1" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// Option 5: Abstract K + map grid
export function LogoGrid({ size = 32, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className}>
      {/* Circle background */}
      <circle cx="20" cy="20" r="18" fill="url(#grid)" />
      {/* Grid lines */}
      <line x1="8" y1="15" x2="32" y2="15" stroke="white" strokeWidth="0.8" opacity="0.3" />
      <line x1="8" y1="25" x2="32" y2="25" stroke="white" strokeWidth="0.8" opacity="0.3" />
      <line x1="15" y1="8" x2="15" y2="32" stroke="white" strokeWidth="0.8" opacity="0.3" />
      <line x1="25" y1="8" x2="25" y2="32" stroke="white" strokeWidth="0.8" opacity="0.3" />
      {/* MK letters */}
      <text x="20" y="24" textAnchor="middle" fill="white" fontSize="14" fontWeight="800" fontFamily="Inter, system-ui, sans-serif">MK</text>
      {/* Pin dot */}
      <circle cx="28" cy="12" r="3" fill="#fbbf24" stroke="white" strokeWidth="1" />
      <defs>
        <linearGradient id="grid" x1="2" y1="2" x2="38" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1e40af" />
          <stop offset="1" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// Preview all logos
export function LogoShowcase() {
  const logos = [
    { name: "1. Radar Pin", component: LogoRadar, desc: "Pin con ondas de radar" },
    { name: "2. M-Pin", component: LogoMPin, desc: "Letra M dentro de pin" },
    { name: "3. Hex Scanner", component: LogoHex, desc: "Hexagono con crosshair" },
    { name: "4. Bolt", component: LogoBolt, desc: "Pin con rayo (velocidad)" },
    { name: "5. MK Grid", component: LogoGrid, desc: "MK con grilla de mapa" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-5 gap-6 p-8">
      {logos.map((l) => (
        <div key={l.name} className="flex flex-col items-center gap-3 p-6 rounded-xl bg-card/60 border border-border/60">
          <l.component size={64} />
          <div className="text-center">
            <p className="font-bold text-sm">{l.name}</p>
            <p className="text-xs text-muted-foreground">{l.desc}</p>
          </div>
          <div className="flex gap-4 items-center mt-2">
            <div className="flex items-center gap-2 bg-slate-900 rounded-lg px-3 py-2">
              <l.component size={24} />
              <span className="text-white font-bold text-sm">MapKo</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
