import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const [
    totalUsers,
    totalProviders,
    totalEvents,
    totalBookings,
    totalRevenue,
    recentBookings,
    complaints,
    popularCategories,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.providerProfile.count({ where: { isApproved: true } }),
    prisma.event.count(),
    prisma.booking.count(),
    prisma.payment.aggregate({
      where: { status: { in: ["DEPOSIT_PAID", "FULLY_PAID"] } },
      _sum: { amount: true },
    }),
    prisma.booking.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        event: { select: { title: true } },
        provider: { select: { businessName: true } },
        customer: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
    }),
    prisma.complaint.findMany({
      where: { status: "open" },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.providerProfile.groupBy({
      by: ["category"],
      _count: { category: true },
      orderBy: { _count: { category: "desc" } },
    }),
  ]);

  return NextResponse.json({
    analytics: {
      totalUsers,
      totalProviders,
      totalEvents,
      totalBookings,
      totalRevenue: totalRevenue._sum.amount || 0,
      recentBookings,
      complaints,
      popularCategories,
    },
  });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const { providerId, action } = body;

  if (action === "approve_provider") {
    await prisma.providerProfile.update({
      where: { id: providerId },
      data: { isApproved: true },
    });
    return NextResponse.json({ success: true });
  }

  if (action === "reject_provider") {
    await prisma.providerProfile.update({
      where: { id: providerId },
      data: { isApproved: false },
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
