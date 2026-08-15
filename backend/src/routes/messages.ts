import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { getSession } from "../lib/auth";
import { createNotification } from "../lib/booking-engine";
import { sendMessageNotification } from "../lib/email";

const messageSchema = z.object({
  receiverId: z.string(),
  content: z.string().min(1),
  bookingId: z.string().optional(),
  type: z.enum(["TEXT", "FILE", "QUOTATION", "EVENT_DETAILS", "BOOKING_UPDATE"]).default("TEXT"),
  fileUrl: z.string().optional(),
  conversationId: z.string().optional(),
});

const router = Router();

router.get("/", async (req, res) => {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

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

  return res.status(200).json({ messages });
});

router.post("/", async (req, res) => {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  try {
    const data = messageSchema.parse(req.body);

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

    return res.status(201).json({ message });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    return res.status(500).json({ error: "Failed to send message" });
  }
});

export default router;
