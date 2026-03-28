"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Lock, Save, User, Shield, Key } from "lucide-react";
import { useProfile } from "@/components/providers/profile-provider";
import type { PlanTier } from "@/types";

export default function SettingsPage() {
  const { profile, email, loading } = useProfile();
  const [companyName, setCompanyName] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile && !initialized) {
      setCompanyName(profile.company_name ?? "");
      setInitialized(true);
    }
  }, [profile, initialized]);

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    setSaveMessage(null);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ company_name: companyName || null })
        .eq("id", profile.id);

      if (updateError) throw updateError;
      setSaveMessage("Profile updated successfully");
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      setSaveMessage(
        err instanceof Error ? err.message : "Failed to save profile"
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account and preferences
        </p>
      </div>

      <div className="grid gap-6 max-w-2xl">
        {/* Profile Card */}
        <Card className="glass">
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-400" />
              <CardTitle>Profile</CardTitle>
            </div>
            <CardDescription>
              Update your company information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Company Name</label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Enter your company name"
              />
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Spinner size="sm" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving ? "Saving..." : "Save Changes"}
              </Button>
              {saveMessage && (
                <span
                  className={`text-sm ${
                    saveMessage.includes("success")
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {saveMessage}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Account Card */}
        <Card className="glass">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-400" />
              <CardTitle>Account</CardTitle>
            </div>
            <CardDescription>Your account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input value={email} disabled className="opacity-60" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Plan:</span>
              <PlanBadge plan={profile?.plan ?? "free"} />
            </div>
          </CardContent>
        </Card>

        {/* API Keys Card */}
        <Card className="glass opacity-75">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-muted-foreground">API Keys</CardTitle>
            </div>
            <CardDescription>
              Programmatic access to MapKo data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 py-4 text-muted-foreground">
              <Lock className="h-8 w-8" />
              <div>
                <p className="font-medium">Coming soon for Agency plan</p>
                <p className="text-sm">
                  API access will be available for Agency subscribers. Upgrade
                  your plan to get early access.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PlanBadge({ plan }: { plan: PlanTier }) {
  const variants: Record<PlanTier, { className: string; label: string }> = {
    free: {
      className: "bg-zinc-400/10 text-zinc-400 border-zinc-400/20",
      label: "Free",
    },
    pro: {
      className: "bg-blue-400/10 text-blue-400 border-blue-400/20",
      label: "Pro",
    },
    agency: {
      className: "bg-purple-400/10 text-purple-400 border-purple-400/20",
      label: "Agency",
    },
  };

  const v = variants[plan];
  return <Badge className={v.className}>{v.label}</Badge>;
}
