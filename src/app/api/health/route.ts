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
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 }
    );
  }
}
