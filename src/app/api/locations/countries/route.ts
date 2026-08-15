import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

const createSchema = z.object({
  name: z.string().min(1),
  sortOrder: z.number().int().optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const countries = await prisma.country.findMany({
    include: { subdivisions: { orderBy: { sortOrder: "asc" } } },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json({ countries });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const data = createSchema.parse(body);

    const country = await prisma.country.create({
      data: { name: data.name, sortOrder: data.sortOrder ?? 0 },
    });

    return NextResponse.json({ country }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Country POST error:", error);
    return NextResponse.json({ error: "Failed to create country" }, { status: 500 });
  }
}
