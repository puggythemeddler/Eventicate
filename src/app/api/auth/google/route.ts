import { NextResponse } from "next/server";
import { getGoogleAuthURL, GOOGLE_CONFIG } from "@/lib/google-auth";

export async function GET() {
  if (!GOOGLE_CONFIG.clientId) {
    return NextResponse.json({ error: "Google OAuth not configured" }, { status: 501 });
  }
  return NextResponse.redirect(getGoogleAuthURL());
}
