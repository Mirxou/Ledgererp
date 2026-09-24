import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const rateLimitErr = checkRateLimit(req);
  if (rateLimitErr) return rateLimitErr;

  return NextResponse.redirect(new URL("/api/audit", process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"));
}