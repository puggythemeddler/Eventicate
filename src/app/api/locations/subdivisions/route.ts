import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

const createSchema = z.object({
  countryId: z.string().min(1),
  name: z.string().min(1),
  sortOrder: z.number().int().optional(),
});

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const countryId = searchParams.get("countryId");

  const where = countryId ? { countryId } : {};
  const subdivisions = await prisma.subdivision.findMany({
    where,
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json({ subdivisions });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const data = createSchema.parse(body);

    const subdivision = await prisma.subdivision.create({
      data: { countryId: data.countryId, name: data.name, sortOrder: data.sortOrder ?? 0 },
    });

    return NextResponse.json({ subdivision }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Subdivision POST error:", error);
    return NextResponse.json({ error: "Failed to create subdivision" }, { status: 500 });
  }
}
