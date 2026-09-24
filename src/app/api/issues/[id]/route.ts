import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/api-auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitErr = checkRateLimit(req);
  if (rateLimitErr) return rateLimitErr;

  try {
    const { id } = await params;
    const issue = await db.auditIssue.findUnique({
      where: { issueId: id },
      include: {
        logs: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });

    if (!issue) {
      return NextResponse.json({ error: "المشكلة غير موجودة" }, { status: 404 });
    }

    return NextResponse.json({ issue });
  } catch (error) {
    console.error("Failed to fetch issue:", error);
    return NextResponse.json({ error: "فشل في جلب المشكلة" }, { status: 500 });
  }
}