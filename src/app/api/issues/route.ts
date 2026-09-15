import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const severity = searchParams.get("severity");
    const status = searchParams.get("status");
    const source = searchParams.get("source");

    const where: Record<string, unknown> = {};
    if (severity && severity !== "ALL") where.severity = severity;
    if (status && status !== "ALL") where.status = status;
    if (source && source !== "ALL") where.source = source;

    const issues = await db.auditIssue.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: { priority: "asc" },
    });

    return NextResponse.json({ issues, total: issues.length });
  } catch (error) {
    console.error("Failed to fetch issues:", error);
    return NextResponse.json({ error: "فشل في جلب البيانات" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { issueId, status, notes, assignee } = body;

    if (!issueId) {
      return NextResponse.json({ error: "issueId مطلوب" }, { status: 400 });
    }

    const existing = await db.auditIssue.findUnique({ where: { issueId } });
    if (!existing) {
      return NextResponse.json({ error: "المشكلة غير موجودة" }, { status: 404 });
    }

    const oldStatus = existing.status;
    const updateData: Record<string, unknown> = {};
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (assignee !== undefined) updateData.assignee = assignee;
    if (status === "fixed") updateData.fixedAt = new Date();

    const updated = await db.auditIssue.update({
      where: { issueId },
      data: updateData,
    });

    // Create audit log
    if (status !== undefined && status !== oldStatus) {
      await db.auditLog.create({
        data: {
          action: "status_change",
          issueId,
          oldStatus,
          newStatus: status,
          details: `تم تغيير الحالة من ${oldStatus} إلى ${status}`,
        },
      });
    }

    if (notes !== undefined && notes !== "") {
      await db.auditLog.create({
        data: {
          action: "note_added",
          issueId,
          details: notes,
        },
      });
    }

    return NextResponse.json({ issue: updated, success: true });
  } catch (error) {
    console.error("Failed to update issue:", error);
    return NextResponse.json({ error: "فشل في تحديث المشكلة" }, { status: 500 });
  }
}