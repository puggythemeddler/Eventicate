import { Router } from "express";
import prisma from "../lib/prisma";
import { getWhatsAppVerifyToken, normalizeWhatsAppPhone } from "../lib/whatsapp";
import { createNotification } from "../lib/booking-engine";
import { sendMessageNotification } from "../lib/email";

const router = Router();

// GET /api/whatsapp/webhook — Meta subscription verification handshake.
router.get("/webhook", async (req, res) => {
  const verifyToken = await getWhatsAppVerifyToken();
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === verifyToken) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// POST /api/whatsapp/webhook — inbound messages from WhatsApp.
router.post("/webhook", async (req, res) => {
  // Always answer 200 fast; Meta retries on failure and we don't want to hold
  // their webhook. Processing is fire-and-forget below.
  res.sendStatus(200);

  try {
    const entry = req.body?.entry;
    if (!entry) return;

    for (const e of entry) {
      for (const change of e.changes || []) {
        const contacts = change?.value?.contacts || [];
        const messages = change?.value?.messages || [];
        if (!contacts.length || !messages.length) continue;

        const senderPhone = normalizeWhatsAppPhone(contacts[0].wa_id || "");
        if (!senderPhone) continue;

        const sender = await prisma.user.findFirst({ where: { phone: senderPhone } });
        if (!sender) {
          console.log(`WhatsApp webhook: no user matches phone ${senderPhone}`);
          continue;
        }

        for (const msg of messages) {
          const type = msg.type;
          if (type !== "text") continue; // only text inbound for now

          const text = msg.text?.body;
          if (!text) continue;
          const waMessageId = msg.id;
          if (!waMessageId) continue;

          // Dedupe: same message id can arrive more than once from Meta.
          const existing = await prisma.message.findUnique({ where: { waMessageId } });
          if (existing) continue;

          // Find a conversation this user is already part of. Prefer the most
          // recently active one; otherwise create a standalone conversation.
          const conversation = await prisma.conversation.findFirst({
            where: {
              OR: [
                { messages: { some: { senderId: sender.id } } },
                { messages: { some: { receiverId: sender.id } } },
              ],
            },
            orderBy: { updatedAt: "desc" },
          });

          if (!conversation) {
            console.log(`WhatsApp webhook: no conversation for user ${sender.id}; ignoring`);
            continue;
          }

          // The in-app receiver is whoever this sender last talked to.
          const last = await prisma.message.findFirst({
            where: { conversationId: conversation.id },
            orderBy: { createdAt: "desc" },
          });
          const receiverId =
            last && last.senderId === sender.id ? last.receiverId : last?.senderId;
          if (!receiverId) continue;

          const message = await prisma.message.create({
            data: {
              conversationId: conversation.id,
              senderId: sender.id,
              receiverId,
              bookingId: conversation.bookingId || undefined,
              type: "TEXT",
              content: text,
              waMessageId,
            },
          });

          const receiver = await prisma.user.findUnique({
            where: { id: receiverId },
            select: { email: true, firstName: true, role: true },
          });

          await createNotification(
            receiverId,
            "MESSAGE",
            "New Message",
            `${sender.firstName} sent you a message (via WhatsApp)`,
            receiver?.role === "PROVIDER" ? "/provider/messages" : "/dashboard/messages"
          );

          if (receiver) {
            sendMessageNotification(receiver.email, receiver.firstName, {
              senderName: `${sender.firstName} ${sender.lastName || ""}`,
              preview: text.length > 100 ? text.slice(0, 100) + "..." : text,
              conversationUrl: `${process.env.NEXT_PUBLIC_APP_URL || ""}/${receiver.role === "PROVIDER" ? "provider" : "dashboard"}/messages`,
            }).catch((err) => console.error("WhatsApp message email failed:", err));
          }

          console.log(
            `WhatsApp webhook: stored message ${message.id} from ${sender.firstName} (${senderPhone})`
          );
        }
      }
    }
  } catch (error) {
    console.error("WhatsApp webhook processing error:", error);
  }
});

export default router;