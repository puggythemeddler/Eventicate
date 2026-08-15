import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getSubscriptionStatus, startTrial, subscribeToPlan } from "@/lib/subscription";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const provider = await prisma.providerProfile.findUnique({
    where: { userId: session.id },
  });
  if (!provider) return NextResponse.json({ error: "Provider not found" }, { status: 404 });

  const subscription = await getSubscriptionStatus(provider.id);
  return NextResponse.json({ subscription });
}

const bodySchema = z.object({
  planId: z.string().optional(),
  billingPeriod: z.enum(["MONTHLY", "ANNUAL"]).optional().default("MONTHLY"),
});

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const provider = await prisma.providerProfile.findUnique({
    where: { userId: session.id },
  });
  if (!provider) return NextResponse.json({ error: "Provider not found" }, { status: 404 });

  try {
    const body = await request.json().catch(() => ({}));
    const data = bodySchema.parse(body);

    if (data.planId) {
      const plan = await prisma.subscriptionPlan.findUnique({ where: { id: data.planId } });
      if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });
      if (!plan.isActive) return NextResponse.json({ error: "Plan is not active" }, { status: 400 });
      const subscription = await subscribeToPlan(provider.id, data.planId, data.billingPeriod);
      return NextResponse.json({ subscription });
    }

    const subscription = await startTrial(provider.id);
    return NextResponse.json({ subscription });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to process subscription" }, { status: 500 });
  }
}
