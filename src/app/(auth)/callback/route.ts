import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawRedirect = searchParams.get("redirect") || "/dashboard";
  // Prevenir open redirect — solo permitir paths relativos
  const redirect = rawRedirect.startsWith("/") && !rawRedirect.startsWith("//") ? rawRedirect : "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(redirect, origin));
    }
  }

  // If code exchange fails or no code, redirect to login with error
  return NextResponse.redirect(new URL("/login", origin));
}
