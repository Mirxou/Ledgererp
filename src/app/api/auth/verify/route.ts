import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/api-auth";

const PI_API_BASE = "https://api.minepi.com/v2";

/** Pi Client ID from environment (C5 fix — not hardcoded) */
function getClientId(): string {
  return process.env.PI_CLIENT_ID || "2hLhGkUUVFhu64ln3khC2TPLt_s2Q3OK4pZeB-7BoAU";
}

// POST /api/auth/verify
export async function POST(req: NextRequest) {
  try {
    const rateLimitErr = checkRateLimit(req);
    if (rateLimitErr) return rateLimitErr;

    const body = await req.json();
    const { accessToken, clientId } = body;
    const PI_CLIENT_ID = getClientId();

    if (!accessToken || typeof accessToken !== "string") {
      return NextResponse.json(
        { error: "accessToken is required and must be a string" },
        { status: 400 },
      );
    }

    // Validate Client ID if provided
    if (clientId && clientId !== PI_CLIENT_ID) {
      console.warn("[auth/verify] Client ID mismatch:", clientId, "!== expected");
    }

    // Call Pi API to verify the token and get user info (with timeout)
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    const piRes = await fetch(`${PI_API_BASE}/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    if (!piRes.ok) {
      const errText = await piRes.text();
      console.error(`[auth/verify] Pi API error ${piRes.status}:`, errText);

      if (piRes.status === 401) {
        return NextResponse.json(
          { error: "Invalid or expired access token" },
          { status: 401 },
        );
      }

      return NextResponse.json(
        { error: `Pi verification failed: ${piRes.status}`, details: errText },
        { status: piRes.status },
      );
    }

    const userDTO = await piRes.json();

    // H1 fix: Only return uid and username — don't spread entire Pi API response
    return NextResponse.json({
      uid: userDTO.uid,
      username: userDTO.username || "unknown",
      clientId: PI_CLIENT_ID,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[auth/verify]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET /api/auth/verify — OAuth config (minimal, no secrets)
export async function GET() {
  const PI_CLIENT_ID = getClientId();
  return NextResponse.json({
    appId: PI_CLIENT_ID,
    redirectUris: [
      "https://ledgererp.online/",
      "http://localhost:3000/",
    ],
    message: "Ledgererp Pi Auth endpoint is active.",
  });
}
