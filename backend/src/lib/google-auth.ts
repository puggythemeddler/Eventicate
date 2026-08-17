import crypto from "crypto";

export const GOOGLE_CONFIG = {
  clientId: process.env.GOOGLE_CLIENT_ID || "",
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  redirectUri: process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/auth/google/callback",
};

// OAuth CSRF protection: a random state token is bound to the user's session.
export function generateOAuthState(): string {
  const state = crypto.randomBytes(16).toString("hex");
  const encoded = Buffer.from(JSON.stringify({ state, ts: Date.now() })).toString("base64url");
  return `${state}.${encoded}`;
}

export function verifyOAuthState(state: string | undefined): boolean {
  if (!state) return false;
  const [, encoded] = state.split(".");
  if (!encoded) return false;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (payload.state !== state.split(".")[0]) return false;
    if (Date.now() - payload.ts > 10 * 60 * 1000) return false;
    return true;
  } catch {
    return false;
  }
}

export function getGoogleAuthURL() {
  const params = new URLSearchParams({
    client_id: GOOGLE_CONFIG.clientId,
    redirect_uri: GOOGLE_CONFIG.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent",
    state: generateOAuthState(),
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

interface GoogleTokens {
  access_token: string;
  id_token: string;
}

interface GoogleUser {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
}

export async function getGoogleTokens(code: string): Promise<GoogleTokens> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CONFIG.clientId,
      client_secret: GOOGLE_CONFIG.clientSecret,
      redirect_uri: GOOGLE_CONFIG.redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error("Failed to exchange code for tokens");
  return (await res.json()) as GoogleTokens;
}

export async function getGoogleUser(tokens: GoogleTokens): Promise<GoogleUser> {
  const res = await fetch(
    `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${tokens.access_token}`,
    { headers: { Authorization: `Bearer ${tokens.id_token}` } }
  );
  if (!res.ok) throw new Error("Failed to fetch user info");
  return (await res.json()) as GoogleUser;
}
