import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/api-auth";

const PI_API_BASE = "https://api.minepi.com/v2";

/** Pi Client ID from environment — MUST be set in .env (no hardcoded fallback for security) */
function getClientId(): string {
  const clientId = process.env.PI_CLIENT_ID;
  if (!clientId) {
    console.error("[auth/verify] PI_CLIENT_ID is not set in environment!");
    throw new Error("Server configuration error: PI_CLIENT_ID not set");
  }
  return clientId;
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
    const uid = userDTO.uid as string;
    const username = (userDTO.username || "unknown") as string;

    // Upsert user in DB — persist authentication for notifications, settings, audit
    const user = await db.user.upsert({
      where: { piUid: uid },
      update: {
        username,
        accessToken,
        lastLoginAt: new Date(),
      },
      create: {
        piUid: uid,
        username,
        accessToken,
      },
    });

    // Create audit log for login
    await db.auditLog.create({
      data: {
        action: "login",
        userId: uid,
        entity: "user",
        entityId: user.id,
        details: `تسجيل دخول: ${username}`,
      },
    });

    return NextResponse.json({
      uid,
      username,
      clientId: PI_CLIENT_ID,
      userId: user.id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[auth/verify]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET /api/auth/verify — OAuth config (minimal, no secrets)
export async function GET(req: NextRequest) {
  const rateLimitErr = checkRateLimit(req);
  if (rateLimitErr) return rateLimitErr;

  let PI_CLIENT_ID: string;
  try {
    PI_CLIENT_ID = getClientId();
  } catch {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }
  return NextResponse.json({
    appId: PI_CLIENT_ID,
    redirectUris: [
      "https://ledgererp.online/",
      "http://localhost:3000/",
    ],
    message: "Ledgererp Pi Auth endpoint is active.",
  });
}
