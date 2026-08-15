import { Router } from "express";
import { z } from "zod";
import prisma from "../../lib/prisma";
import { getSession } from "../../lib/auth";

const createThreadSchema = z.object({
  masterQuoteId: z.string(),
});

const router = Router();

router.post("/", async (req, res) => {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  try {
    const data = createThreadSchema.parse(req.body);

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
      return res.status(404).json({ error: "No documents found" });
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

    return res.status(201).json({ conversation, participantCount: participantIds.size });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    return res.status(500).json({ error: "Failed to create thread" });
  }
});

export default router;
