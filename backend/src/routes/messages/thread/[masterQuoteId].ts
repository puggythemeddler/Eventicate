import { Router } from "express";
import { z } from "zod";
import prisma from "../../../lib/prisma";
import { getSession } from "../../../lib/auth";

const router = Router();

router.get("/", async (req, res) => {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const masterQuoteId = (req.params as { masterQuoteId: string }).masterQuoteId;

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

  return res.status(200).json({
    participants: Array.from(participants.values()),
    messages,
  });
});

const sendSchema = z.object({
  content: z.string().min(1),
});

router.post("/", async (req, res) => {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const masterQuoteId = (req.params as { masterQuoteId: string }).masterQuoteId;

  try {
    const data = sendSchema.parse(req.body);

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
      return res.status(404).json({ error: "No documents found" });
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

    return res.status(201).json({ messages });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    return res.status(500).json({ error: "Failed to send message" });
  }
});

export default router;
