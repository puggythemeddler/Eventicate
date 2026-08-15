import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role");
  const search = searchParams.get("search");
  const isActive = searchParams.get("isActive");

  const where: Record<string, unknown> = {};
  if (role && role !== "ALL") where.role = role;
  if (isActive === "true") where.isActive = true;
  if (isActive === "false") where.isActive = false;
  if (search) {
    where.OR = [
      { firstName: { contains: search } },
      { lastName: { contains: search } },
      { email: { contains: search } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  const enriched = await Promise.all(
    users.map(async (u) => {
      const customer = await prisma.customerProfile.findUnique({
        where: { userId: u.id },
        include: { _count: { select: { bookings: true } } },
      });
      return {
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        isVerified: u.isVerified,
        createdAt: u.createdAt,
        bookingCount: customer?._count?.bookings ?? 0,
      };
    })
  );

  return NextResponse.json({ users: enriched, total: enriched.length });
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const { userId, isActive } = body;

  if (!userId || typeof isActive !== "boolean") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { isActive },
    select: { id: true, isActive: true, firstName: true, lastName: true, email: true, role: true },
  });

  return NextResponse.json({ user });
}
