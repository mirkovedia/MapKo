"use client";

import { LogoShowcase } from "@/components/ui/logos";

export default function LogoPreviewPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Logo Options</h1>
        <p className="text-muted-foreground mt-1">Choose a logo for MapKo</p>
      </div>
      <LogoShowcase />
      <p className="text-sm text-muted-foreground text-center">
        Tell me which number you prefer and I will apply it across the entire app.
      </p>
    </div>
  );
}
