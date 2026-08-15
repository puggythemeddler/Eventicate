import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  sortOrder: z.number().int().optional(),
});

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const data = updateSchema.parse(body);

    const subdivision = await prisma.subdivision.update({
      where: { id },
      data,
    });

    return NextResponse.json({ subdivision });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Subdivision PUT error:", error);
    return NextResponse.json({ error: "Failed to update subdivision" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await params;
    await prisma.subdivision.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Subdivision DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete subdivision" }, { status: 500 });
  }
}
