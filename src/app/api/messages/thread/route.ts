import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const createThreadSchema = z.object({
  masterQuoteId: z.string(),
});

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const data = createThreadSchema.parse(body);

    const documents = await prisma.document.findMany({
      where: { masterQuoteId: data.masterQuoteId },
      include: {
        booking: {
          include: {
            provider: { include: { user: true } },
            customer: { include: { user: true } },
          },
        },
      },
    });

    if (documents.length === 0) {
      return NextResponse.json({ error: "No documents found" }, { status: 404 });
    }

    const participantIds = new Set<string>();
    let customerId = "";

    for (const doc of documents) {
      if (!doc.booking) continue;
      const booking = doc.booking;
      participantIds.add(booking.provider.userId);
      customerId = booking.customer.userId;
    }
    participantIds.add(customerId);

    const conversation = await prisma.conversation.create({
      data: {},
    });

    const systemMessage = `Planning thread started for your multi-provider event (${documents.length} providers). All participants are included in this group conversation.`;

    const messages = [];
    for (const participantId of participantIds) {
      if (participantId === customerId) continue;
      messages.push({
        conversationId: conversation.id,
        senderId: customerId,
        receiverId: participantId,
        type: "TEXT" as const,
        content: systemMessage,
      });
    }

    for (const msgData of messages) {
      await prisma.message.create({ data: msgData });
    }

    return NextResponse.json({ conversation, participantCount: participantIds.size }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create thread" }, { status: 500 });
  }
}
