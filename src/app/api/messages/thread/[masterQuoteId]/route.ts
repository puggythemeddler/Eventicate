import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ masterQuoteId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { masterQuoteId } = await params;

  const documents = await prisma.document.findMany({
    where: { masterQuoteId },
    include: {
      booking: {
        include: {
          provider: { include: { user: { select: { id: true, firstName: true, lastName: true, role: true, email: true } } } },
          customer: { include: { user: { select: { id: true, firstName: true, lastName: true, role: true, email: true } } } },
        },
      },
    },
  });

  const participants = new Map<string, { id: string; firstName: string; lastName: string; role: string; email: string }>();
  let conversations: string[] = [];

  for (const doc of documents) {
    if (!doc.booking) continue;
    const customer = doc.booking.customer.user;
    participants.set(customer.id, customer);
    const provider = doc.booking.provider.user;
    participants.set(provider.id, provider);

    const msgs = await prisma.message.findMany({
      where: { OR: [{ senderId: customer.id }, { receiverId: customer.id }, { senderId: provider.id }, { receiverId: provider.id }] },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, role: true } },
        receiver: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    conversations = [...new Set([...conversations, ...msgs.map((m) => m.conversationId)])];
  }

  const messages = await prisma.message.findMany({
    where: { conversationId: { in: conversations } },
    include: {
      sender: { select: { id: true, firstName: true, lastName: true, role: true } },
      receiver: { select: { id: true, firstName: true, lastName: true, role: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    participants: Array.from(participants.values()),
    messages,
  });
}

const sendSchema = z.object({
  content: z.string().min(1),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ masterQuoteId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { masterQuoteId } = await params;

  try {
    const body = await request.json();
    const data = sendSchema.parse(body);

    const documents = await prisma.document.findMany({
      where: { masterQuoteId },
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
    for (const doc of documents) {
      if (!doc.booking) continue;
      participantIds.add(doc.booking.provider.userId);
      participantIds.add(doc.booking.customer.userId);
    }
    participantIds.delete(session.id);

    const messages = [];
    for (const receiverId of participantIds) {
      const msg = await prisma.message.create({
        data: {
          conversationId: "",
          senderId: session.id,
          receiverId,
          type: "TEXT",
          content: data.content,
        },
        include: {
          sender: { select: { id: true, firstName: true, lastName: true, role: true } },
          receiver: { select: { id: true, firstName: true, lastName: true, role: true } },
        },
      });
      messages.push(msg);
    }

    return NextResponse.json({ messages }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
