import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { getSession } from "../lib/auth";
import { createNotification } from "../lib/booking-engine";
import { sendMessageNotification } from "../lib/email";
import { sendWhatsAppText } from "../lib/whatsapp";

const messageSchema = z.object({
  receiverId: z.string(),
  content: z.string().min(1),
  bookingId: z.string().optional(),
  type: z.enum(["TEXT", "FILE", "QUOTATION", "EVENT_DETAILS", "BOOKING_UPDATE"]).default("TEXT"),
  fileUrl: z.string().optional(),
  conversationId: z.string().optional(),
});

const router = Router();

// List the user's conversations with unread counts, last message, and a
// human-friendly display name for the other party (WhatsApp-ready phone).
router.get("/conversations", async (req, res) => {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [{ messages: { some: { senderId: session.id } } }, { messages: { some: { receiverId: session.id } } }],
    },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          sender: { select: { id: true, firstName: true, lastName: true, role: true, phone: true } },
          receiver: { select: { id: true, firstName: true, lastName: true, role: true, phone: true } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const result = conversations.map((conv) => {
    const msgs = conv.messages;
    const last = msgs[msgs.length - 1];
    const unreadCount = msgs.filter(
      (m) => m.receiverId === session.id && !m.isRead
    ).length;

    // Collect every participant except the current user.
    const participantIds = new Set<string>();
    for (const m of msgs) {
      if (m.senderId !== session.id) participantIds.add(m.senderId);
      if (m.receiverId !== session.id) participantIds.add(m.receiverId);
    }

    // Prefer a display name from the booking if this is a 1:1 booking chat.
    return {
      id: conv.id,
      bookingId: conv.bookingId,
      masterQuoteId: conv.masterQuoteId,
      unreadCount,
      lastMessage: last
        ? {
            id: last.id,
            content: last.content,
            type: last.type,
            fileUrl: last.fileUrl,
            createdAt: last.createdAt,
            senderId: last.senderId,
          }
        : null,
      participants: msgs
        .map((m) => (m.senderId === session.id ? m.receiver : m.sender))
        .filter((u, i, arr) => u && arr.findIndex((x) => x?.id === u.id) === i),
      participantCount: participantIds.size,
    };
  });

  return res.status(200).json({ conversations: result });
});

// Mark all messages in a conversation as read for the current user.
router.post("/read", async (req, res) => {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const schema = z.object({ conversationId: z.string() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid conversationId" });

  try {
    const update = await prisma.message.updateMany({
      where: { conversationId: parsed.data.conversationId, receiverId: session.id, isRead: false },
      data: { isRead: true },
    });
    return res.status(200).json({ updated: update.count });
  } catch {
    return res.status(500).json({ error: "Failed to mark messages as read" });
  }
});

// Fetch messages for a specific conversation.
router.get("/:conversationId", async (req, res, next) => {
  // The thread router handles /thread and /thread/:masterQuoteId paths.
  if (req.params.conversationId === "thread") return next();

  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const { conversationId } = req.params;
  const before = req.query.before ? new Date(String(req.query.before)) : undefined;

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      messages: {
        where: before ? { createdAt: { lt: before } } : undefined,
        orderBy: { createdAt: "desc" },
        take: 60,
        include: {
          sender: { select: { id: true, firstName: true, lastName: true, role: true } },
          receiver: { select: { id: true, firstName: true, lastName: true, role: true } },
        },
      },
    },
  });

  if (!conversation) return res.status(404).json({ error: "Conversation not found" });

  const mine = conversation.messages.some(
    (m) => m.senderId === session.id || m.receiverId === session.id
  );
  if (!mine) return res.status(403).json({ error: "Forbidden" });

  // Mark everything in this thread as read now that it's been opened.
  await prisma.message.updateMany({
    where: { conversationId, receiverId: session.id, isRead: false },
    data: { isRead: true },
  });

  return res.status(200).json({ messages: conversation.messages.reverse() });
});

// Back-compat: list recent messages (used by the new-message modal).
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

    if (data.receiverId === session.id) {
      return res.status(400).json({ error: "Cannot message yourself" });
    }

    // Only allow messaging users you share a booking with (or an existing conversation).
    const sharedBooking = data.bookingId
      ? await prisma.booking.findFirst({
          where: {
            id: data.bookingId,
            OR: [
              { customer: { userId: session.id }, provider: { userId: data.receiverId } },
              { customer: { userId: data.receiverId }, provider: { userId: session.id } },
            ],
          },
        })
      : null;

    const sharedConversation = data.conversationId
      ? await prisma.conversation.findFirst({
          where: {
            id: data.conversationId,
            messages: { some: { senderId: session.id, receiverId: data.receiverId } },
          },
        })
      : null;

    if (!sharedBooking && !sharedConversation) {
      return res.status(403).json({
        error: "You can only message providers or customers you share a booking with",
      });
    }

    let conversationId = data.conversationId;
    if (!conversationId) {
      const conversation = await prisma.conversation.create({
        data: { bookingId: sharedBooking?.id },
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

    // Bridge to WhatsApp (fire-and-forget): if the recipient has a phone and
    // WhatsApp is configured, mirror the message there. Delivery state is
    // written back to the message row so the UI can show it.
    const recipientWithPhone = await prisma.user.findUnique({
      where: { id: data.receiverId },
      select: { phone: true, firstName: true },
    });
    if (recipientWithPhone?.phone) {
      sendWhatsAppText({
        to: recipientWithPhone.phone,
        text: data.type === "FILE"
          ? `${session.firstName} sent you a file: ${data.content} — open Eventicate to view it`
          : `${session.firstName}: ${data.content}`,
      })
        .then(async (result) => {
          await prisma.message.update({
            where: { id: message.id },
            data: result.ok
              ? { waStatus: "SENT", waMessageId: result.messageId }
              : { waStatus: "FAILED", waError: result.error?.slice(0, 500) || "WhatsApp send failed" },
          });
        })
        .catch((err) => console.error("WhatsApp mirror failed:", err));
    }

    const recipient = await prisma.user.findUnique({
      where: { id: data.receiverId },
      select: { email: true, firstName: true, role: true },
    });

    const recipientRole = recipient?.role === "PROVIDER" ? "PROVIDER" : "CUSTOMER";

    await createNotification(
      data.receiverId,
      "MESSAGE",
      "New Message",
      `${session.firstName} sent you a message`,
      recipientRole === "PROVIDER" ? "/provider/messages" : "/dashboard/messages"
    );

    if (recipient) {
      sendMessageNotification(recipient.email, recipient.firstName, {
        senderName: `${session.firstName} ${session.lastName || ""}`,
        preview: data.content.length > 100 ? data.content.slice(0, 100) + "..." : data.content,
        conversationUrl: `${process.env.NEXT_PUBLIC_APP_URL || ""}/${recipientRole === "PROVIDER" ? "provider" : "dashboard"}/messages`,
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
