import { Router } from "express";
import { z } from "zod";
import prisma from "../../../lib/prisma";
import { getSession } from "../../../lib/auth";
import { createNotification } from "../../../lib/booking-engine";
import { sendMessageNotification } from "../../../lib/email";

const router = Router({ mergeParams: true });

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

  // Authorization: session must be a participant of at least one of the thread's bookings.
  const isParticipant = documents.some(
    (doc) =>
      doc.booking &&
      (doc.booking.customer.userId === session.id || doc.booking.provider.userId === session.id)
  );
  if (!isParticipant) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const participants = new Map<string, { id: string; firstName: string; lastName: string; role: string; email: string }>();

  for (const doc of documents) {
    if (!doc.booking) continue;
    const customer = doc.booking.customer.user;
    participants.set(customer.id, customer);
    const provider = doc.booking.provider.user;
    participants.set(provider.id, provider);
  }

  const conversation = await prisma.conversation.findUnique({
    where: { masterQuoteId: masterQuoteId as string },
  });

  const messages = conversation
    ? await prisma.message.findMany({
        where: { conversationId: conversation.id },
        include: {
          sender: { select: { id: true, firstName: true, lastName: true, role: true } },
          receiver: { select: { id: true, firstName: true, lastName: true, role: true } },
        },
        orderBy: { createdAt: "asc" },
      })
    : [];

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

    const isParticipant = documents.some(
      (doc) =>
        doc.booking &&
        (doc.booking.customer.userId === session.id || doc.booking.provider.userId === session.id)
    );
    if (!isParticipant) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const participantIds = new Set<string>();
    for (const doc of documents) {
      if (!doc.booking) continue;
      participantIds.add(doc.booking.provider.userId);
      participantIds.add(doc.booking.customer.userId);
    }
    participantIds.delete(session.id);

    // Messages in a thread share a conversation keyed by masterQuoteId.
    const conversation = await prisma.conversation.upsert({
      where: { masterQuoteId: masterQuoteId as string },
      create: { masterQuoteId },
      update: {},
    });

    const messages = [];
    const receiversWithEmail = new Map<string, { email: string; firstName: string; role: string }>();
    for (const receiverId of participantIds) {
      const msg = await prisma.message.create({
        data: {
          conversationId: conversation.id,
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

      const receiverUser = await prisma.user.findUnique({
        where: { id: receiverId },
        select: { email: true, firstName: true, role: true },
      });
      if (receiverUser) receiversWithEmail.set(receiverId, receiverUser);

      await createNotification(
        receiverId,
        "MESSAGE",
        "New Message",
        `${session.firstName} sent a message in the planning thread`,
        receiverUser?.role === "PROVIDER" ? "/provider/messages" : "/dashboard/messages"
      );
    }

    // Group email notification to every participant except the sender.
    for (const user of receiversWithEmail.values()) {
      sendMessageNotification(user.email, user.firstName, {
        senderName: `${session.firstName} ${session.lastName || ""}`,
        preview: data.content.length > 100 ? data.content.slice(0, 100) + "..." : data.content,
        conversationUrl: `${process.env.NEXT_PUBLIC_APP_URL || ""}/${user.role === "PROVIDER" ? "provider" : "dashboard"}/messages`,
      }).catch((e) => console.error("Thread notification email failed:", e));
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
