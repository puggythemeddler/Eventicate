import { createHash } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";

const router = Router();
const responseInput = z.object({
  status: z.enum(["ACCEPTED", "DECLINED"]),
  guestsAttending: z.number().int().min(0).max(20),
});

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function eventIsClosed(event: { eventDate: Date; status: string }) {
  return event.eventDate < new Date() || ["completed", "cancelled"].includes(event.status.toLowerCase());
}

router.get("/:token", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const guest = await prisma.eventGuest.findFirst({
    where: { inviteTokenHash: tokenHash(req.params.token), invitationSentAt: { not: null } },
    include: { event: { select: { title: true, eventDate: true, location: true, status: true } } },
  });
  if (!guest) return res.status(404).json({ error: "This invitation link is invalid" });
  return res.json({
    invitation: {
      guestName: guest.name,
      guestsInvited: guest.guestsInvited,
      guestsAttending: guest.guestsAttending,
      status: guest.rsvpStatus,
      event: guest.event,
      closed: eventIsClosed(guest.event),
    },
  });
});

router.post("/:token", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const parsed = responseInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Choose whether you can attend and how many guests will come" });
  if (parsed.data.status === "ACCEPTED" && parsed.data.guestsAttending < 1) {
    return res.status(400).json({ error: "Enter at least 1 attending guest" });
  }
  if (parsed.data.status === "DECLINED" && parsed.data.guestsAttending !== 0) {
    return res.status(400).json({ error: "A declined invitation must have zero attending guests" });
  }

  const guest = await prisma.eventGuest.findFirst({
    where: { inviteTokenHash: tokenHash(req.params.token), invitationSentAt: { not: null } },
    include: { event: { select: { eventDate: true, status: true } } },
  });
  if (!guest) return res.status(404).json({ error: "This invitation link is invalid" });
  if (eventIsClosed(guest.event)) return res.status(409).json({ error: "RSVPs are closed for this event" });
  if (parsed.data.guestsAttending > guest.guestsInvited) return res.status(400).json({ error: `You can RSVP for up to ${guest.guestsInvited} guests` });

  const updated = await prisma.eventGuest.update({
    where: { id: guest.id },
    data: { rsvpStatus: parsed.data.status, guestsAttending: parsed.data.guestsAttending, respondedAt: new Date() },
    select: { rsvpStatus: true, guestsAttending: true, respondedAt: true },
  });
  return res.json({ response: updated });
});

export default router;
