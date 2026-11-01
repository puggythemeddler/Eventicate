import { createHash, randomBytes } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { getSession } from "../lib/auth";
import { isSmtpConfigured, sendEventGuestInvitation } from "../lib/email";
import { invitationLimiter } from "../lib/rate-limit";

const router = Router({ mergeParams: true });
const guestInput = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  guestsInvited: z.number().int().min(1).max(20).default(1),
  confirmedPermission: z.literal(true),
});

function routeParam(req: { params: unknown }, name: string) {
  const value = (req.params as Record<string, unknown>)[name];
  return typeof value === "string" ? value : "";
}

async function getOwnedEvent(eventId: string, userId: string) {
  const customer = await prisma.customerProfile.findUnique({ where: { userId }, select: { id: true } });
  if (!customer) return null;
  return prisma.event.findFirst({
    where: { id: eventId, customerId: customer.id },
    include: { customer: { include: { user: { select: { firstName: true, lastName: true } } } } },
  });
}

function isClosed(event: { eventDate: Date; status: string }) {
  return event.eventDate < new Date() || ["completed", "cancelled"].includes(event.status.toLowerCase());
}

router.get("/", async (req, res) => {
  const session = await getSession(req);
  if (!session || session.role !== "CUSTOMER") return res.status(403).json({ error: "Sign in as the event organizer to view guests" });
  const event = await getOwnedEvent(routeParam(req, "id"), session.id);
  if (!event) return res.status(404).json({ error: "Event not found" });
  const guests = await prisma.eventGuest.findMany({
    where: { eventId: event.id },
    select: { id: true, name: true, email: true, guestsInvited: true, guestsAttending: true, rsvpStatus: true, invitationSentAt: true, respondedAt: true, createdAt: true },
    orderBy: [{ rsvpStatus: "asc" }, { name: "asc" }],
  });
  return res.json({ guests, event: { guestCount: event.guestCount, closed: isClosed(event) } });
});

router.post("/", async (req, res) => {
  const session = await getSession(req);
  if (!session || session.role !== "CUSTOMER") return res.status(403).json({ error: "Sign in as the event organizer to add guests" });
  const parsed = guestInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || "Check the guest details" });
  const event = await getOwnedEvent(routeParam(req, "id"), session.id);
  if (!event) return res.status(404).json({ error: "Event not found" });
  if (isClosed(event)) return res.status(409).json({ error: "The guest list is closed for this event" });

  try {
    const guest = await prisma.eventGuest.create({
      data: { eventId: event.id, name: parsed.data.name, email: parsed.data.email.toLowerCase(), guestsInvited: parsed.data.guestsInvited, contactPermissionAt: new Date() },
      select: { id: true, name: true, email: true, guestsInvited: true, guestsAttending: true, rsvpStatus: true, invitationSentAt: true, respondedAt: true, createdAt: true },
    });
    return res.status(201).json({ guest });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
      return res.status(409).json({ error: "That email is already on this event's guest list" });
    }
    console.error("Guest creation failed:", error);
    return res.status(500).json({ error: "Could not add this guest" });
  }
});

router.post("/:guestId/invite", invitationLimiter, async (req, res) => {
  const session = await getSession(req);
  if (!session || session.role !== "CUSTOMER") return res.status(403).json({ error: "Sign in as the event organizer to send invitations" });
  const event = await getOwnedEvent(routeParam(req, "id"), session.id);
  if (!event) return res.status(404).json({ error: "Event not found" });
  if (isClosed(event)) return res.status(409).json({ error: "Invitations are closed for this event" });
  if (!isSmtpConfigured()) return res.status(503).json({ error: "Email delivery is not set up yet. The guest is saved; configure SMTP before sending invitations." });

  const guest = await prisma.eventGuest.findFirst({ where: { id: routeParam(req, "guestId"), eventId: event.id } });
  if (!guest) return res.status(404).json({ error: "Guest not found" });
  const appUrl = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/+$/, "");
  if (!/^https:\/\//i.test(appUrl)) return res.status(503).json({ error: "A public HTTPS app URL is required to create invitation links" });

  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  try {
    await prisma.eventGuest.update({ where: { id: guest.id }, data: { inviteTokenHash: tokenHash } });
    try {
      await sendEventGuestInvitation(
        guest.email,
        guest.name,
        { title: event.title, eventDate: event.eventDate, location: event.location, guestsInvited: guest.guestsInvited },
        `${event.customer.user.firstName} ${event.customer.user.lastName}`.trim(),
        `${appUrl}/rsvp/${token}`,
      );
    } catch (error) {
      await prisma.eventGuest.updateMany({ where: { id: guest.id, inviteTokenHash: tokenHash }, data: { inviteTokenHash: guest.inviteTokenHash } });
      throw error;
    }
    const updated = await prisma.eventGuest.update({
      where: { id: guest.id },
      data: { invitationSentAt: new Date() },
      select: { id: true, name: true, email: true, guestsInvited: true, guestsAttending: true, rsvpStatus: true, invitationSentAt: true, respondedAt: true, createdAt: true },
    });
    return res.json({ guest: updated, sent: true });
  } catch (error) {
    console.error("Guest invitation failed:", error);
    return res.status(502).json({ error: "Could not deliver the invitation. Check SMTP settings and try again." });
  }
});

router.delete("/:guestId", async (req, res) => {
  const session = await getSession(req);
  if (!session || session.role !== "CUSTOMER") return res.status(403).json({ error: "Sign in as the event organizer to remove guests" });
  const event = await getOwnedEvent(routeParam(req, "id"), session.id);
  if (!event) return res.status(404).json({ error: "Event not found" });
  const deleted = await prisma.eventGuest.deleteMany({ where: { id: routeParam(req, "guestId"), eventId: event.id } });
  if (!deleted.count) return res.status(404).json({ error: "Guest not found" });
  return res.json({ deleted: true });
});

export default router;
