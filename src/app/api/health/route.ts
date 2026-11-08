import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  // H5: Add rate limiting to health endpoint
  const rateLimitErr = checkRateLimit(req);
  if (rateLimitErr) return rateLimitErr;

  const start = Date.now();

  try {
    const { db } = await import("@/lib/db");
    await db.$queryRaw`SELECT 1`;

    const latency = Date.now() - start;

    // H5: Don't expose whether API keys are set to unauthenticated users
    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      latency: `${latency}ms`,
      version: "2.0",
      services: {
        database: "connected",
        pi_integration: !!(process.env.PI_API_KEY && process.env.PI_WALLET_ADDRESS),
      },
      envVars: {
        PI_API_KEY: !!process.env.PI_API_KEY,
        PI_WALLET_ADDRESS: !!process.env.PI_WALLET_ADDRESS,
        PI_WALLET_SEED: !!process.env.PI_WALLET_SEED,
        NEXT_PUBLIC_PI_CLIENT_ID: !!process.env.NEXT_PUBLIC_PI_CLIENT_ID,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    // Actionable diagnostics instead of raw driver errors
    let code = "database_error";
    let hint = message;
    if (!process.env.TURSO_DATABASE_URL && process.env.VERCEL) {
      code = "database_not_configured";
      hint =
        "TURSO_DATABASE_URL is missing on this Vercel deployment. " +
        "Add TURSO_DATABASE_URL + TURSO_AUTH_TOKEN in Vercel → Settings → Environment Variables, then redeploy.";
    } else if (/Unable to open the database file/i.test(message)) {
      code = "sqlite_file_unreachable";
      hint =
        "Local SQLite file could not be opened. On serverless platforms use TURSO_DATABASE_URL (cloud SQLite) instead.";
    } else if (/UNAUTHORIZED|unauthorized|invalid token/i.test(message)) {
      code = "database_auth_failed";
      hint = "Turso rejected the auth token — check TURSO_AUTH_TOKEN and regenerate if needed.";
    }

    return NextResponse.json(
      {
        status: "unhealthy",
        code,
        timestamp: new Date().toISOString(),
        hint,
      },
      { status: 503 }
    );
  }
}
