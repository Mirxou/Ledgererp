import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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