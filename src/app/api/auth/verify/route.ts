import { NextRequest, NextResponse } from "next/server";

const PI_API_BASE = "https://api.minepi.com/v2";

// POST /api/auth/verify
// Verifies a Pi access token by calling the Pi server and returns the user profile.
export async function POST(req: NextRequest) {
  try {
    const { accessToken } = await req.json();

    if (!accessToken || typeof accessToken !== "string") {
      return NextResponse.json(
        { error: "accessToken is required and must be a string" },
        { status: 400 },
      );
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

    // Return the relevant user fields
    return NextResponse.json({
      uid: userDTO.uid,
      username: userDTO.username,
      // Pass through any additional fields Pi returns
      ...userDTO,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[auth/verify]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}