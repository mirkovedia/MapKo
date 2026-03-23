"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          company_name: companyName,
        },
        emailRedirectTo: `${window.location.origin}/callback`,
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  return (
    <Card className="w-full max-w-md glass">
      <CardHeader className="text-center space-y-2">
        <Link href="/landing" className="inline-block mb-2">
          <h1 className="text-3xl font-bold gradient-text tracking-tight">
            MapKo
          </h1>
        </Link>
        <CardDescription className="text-muted-foreground text-sm">
          Bulk Business Scanner
        </CardDescription>
        <CardTitle className="text-xl pt-4">Create your account</CardTitle>
        <CardDescription>
          Start scanning and generating leads in minutes
        </CardDescription>
      </CardHeader>

      <CardContent>
        {success ? (
          <div className="rounded-md bg-green-500/10 border border-green-500/20 px-4 py-3 text-sm text-green-400 text-center">
            <p className="font-medium">Check your email for a confirmation link.</p>
            <p className="mt-1 text-muted-foreground">
              Once confirmed, you can{" "}
              <Link href="/login" className="text-primary hover:underline">
                sign in
              </Link>
              .
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="company" className="text-sm font-medium text-foreground">
                Company name
              </label>
              <Input
                id="company"
                type="text"
                placeholder="Your agency or company"
                value={companyName}
                onChange={(e) => {
                  setCompanyName(e.target.value);
                  setError(null);
                }}
                required
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                required
                autoComplete="email"
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                required
                minLength={6}
                autoComplete="new-password"
                className="h-10"
              />
            </div>

            <Button type="submit" className="w-full h-10" disabled={loading}>
              {loading ? "Creating account..." : "Create account"}
            </Button>
          </form>
        )}
      </CardContent>

      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
