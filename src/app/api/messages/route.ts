import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { createNotification } from "@/lib/booking-engine";
import { sendMessageNotification } from "@/lib/email";

const messageSchema = z.object({
  receiverId: z.string(),
  content: z.string().min(1),
  bookingId: z.string().optional(),
  type: z.enum(["TEXT", "FILE", "QUOTATION", "EVENT_DETAILS", "BOOKING_UPDATE"]).default("TEXT"),
  fileUrl: z.string().optional(),
  conversationId: z.string().optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const messages = await prisma.message.findMany({
    where: {
      OR: [{ senderId: session.id }, { receiverId: session.id }],
    },
    include: {
      sender: { select: { id: true, firstName: true, lastName: true, role: true } },
      receiver: { select: { id: true, firstName: true, lastName: true, role: true } },
      booking: { select: { id: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ messages });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const data = messageSchema.parse(body);

    let conversationId = data.conversationId;
    if (!conversationId) {
      const conversation = await prisma.conversation.create({
        data: { bookingId: data.bookingId },
      });
      conversationId = conversation.id;
    }

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: session.id,
        receiverId: data.receiverId,
        bookingId: data.bookingId,
        type: data.type,
        content: data.content,
        fileUrl: data.fileUrl,
      },
      include: {
        sender: { select: { firstName: true, lastName: true } },
        receiver: { select: { firstName: true, lastName: true } },
      },
    });

    const recipient = await prisma.user.findUnique({
      where: { id: data.receiverId },
      select: { email: true, firstName: true },
    });

    await createNotification(
      data.receiverId,
      "MESSAGE",
      "New Message",
      `${session.firstName} sent you a message`,
      "/dashboard/messages"
    );

    if (recipient) {
      sendMessageNotification(recipient.email, recipient.firstName, {
        senderName: `${session.firstName} ${session.lastName || ""}`,
        preview: data.content.length > 100 ? data.content.slice(0, 100) + "..." : data.content,
        conversationUrl: `${process.env.NEXT_PUBLIC_APP_URL || ""}/dashboard/messages`,
      }).catch((e) => console.error("Message notification email failed:", e));
    }

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
