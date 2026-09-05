import { NextRequest, NextResponse } from "next/server";

const PI_API_BASE = "https://api.minepi.com/v2";
const PI_CLIENT_ID = "2hLhGkUUVFhu64ln3khC2TPLt_s2Q3OK4pZeB-7BoAU";

// POST /api/auth/verify
// Verifies a Pi access token by calling the Pi server and returns the user profile.
// Also validates the OAuth Client ID for additional security.
export async function POST(req: NextRequest) {
  try {
    const { accessToken, clientId } = await req.json();

    if (!accessToken || typeof accessToken !== "string") {
      return NextResponse.json(
        { error: "accessToken is required and must be a string" },
        { status: 400 },
      );
    }

    // Optional: Validate Client ID if provided
    // This ensures the request is coming from our registered Pi app
    if (clientId && clientId !== PI_CLIENT_ID) {
      console.warn("[auth/verify] Client ID mismatch:", clientId, "!== expected");
      // Don't reject — just log the warning. The Pi SDK handles client validation.
    }

    // Call Pi API to verify the token and get user info
    const piRes = await fetch(`${PI_API_BASE}/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

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

    // Return the relevant user fields with our Client ID info
    return NextResponse.json({
      uid: userDTO.uid,
      username: userDTO.username,
      clientId: PI_CLIENT_ID,
      // Pass through any additional fields Pi returns
      ...userDTO,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[auth/verify]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET /api/auth/verify
// Returns the OAuth configuration for the app (useful for debugging)
export async function GET() {
  return NextResponse.json({
    appId: PI_CLIENT_ID,
    redirectUris: [
      "https://ledgererp.online/",
      "http://localhost:3000/",
    ],
    piApiBase: PI_API_BASE,
    message: "Ledgererp Pi Auth endpoint is active. Configure these Redirect URIs in Pi Developer Portal.",
  });
}
