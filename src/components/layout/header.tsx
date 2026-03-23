"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import type { Profile } from "@/types";

export function Header() {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (data) setProfile(data as Profile);
    }
    loadProfile();
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-card/80 backdrop-blur-sm px-6">
      <div />
      <div className="flex items-center gap-3">
        {profile && (
          <>
            <Badge
              variant={
                profile.plan === "agency"
                  ? "default"
                  : profile.plan === "pro"
                  ? "default"
                  : "secondary"
              }
            >
              {profile.plan.toUpperCase()}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {profile.company_name || "My Workspace"}
            </span>
          </>
        )}
      </div>
    </header>
  );
}
