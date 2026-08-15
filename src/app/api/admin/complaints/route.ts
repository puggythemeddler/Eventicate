import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const where: Record<string, unknown> = {};
  if (status && status !== "ALL") where.status = status;

  const complaints = await prisma.complaint.findMany({
    where,
    include: {
      reporter: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ complaints });
}

const patchSchema = z.object({
  complaintId: z.string(),
  status: z.enum(["open", "investigating", "resolved", "dismissed"]).optional(),
  adminNotes: z.string().optional(),
});

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const data = patchSchema.parse(body);

    const updateData: Record<string, unknown> = {};
    if (data.status) updateData.status = data.status;
    if (data.adminNotes !== undefined) updateData.adminNotes = data.adminNotes;

    const complaint = await prisma.complaint.update({
      where: { id: data.complaintId },
      data: updateData,
    });

    return NextResponse.json({ complaint });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Complaint PATCH error:", error);
    return NextResponse.json({ error: "Failed to update complaint" }, { status: 500 });
  }
}
