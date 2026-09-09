import { NextResponse } from "next/server";

export async function GET() {
  const start = Date.now();

  try {
    const { db } = await import("@/lib/db");
    await db.$queryRaw`SELECT 1`;

    const latency = Date.now() - start;

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      latency: `${latency}ms`,
      version: "2.0",
      services: {
        database: "connected",
        pi_api_key: !!process.env.PI_API_KEY,
        pi_wallet: !!process.env.PI_WALLET_ADDRESS,
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
