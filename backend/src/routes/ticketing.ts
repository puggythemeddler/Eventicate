import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { getSession } from "../lib/auth";

const router = Router();
const CURRENCIES = ["KES", "UGX", "TZS", "RWF", "BIF", "CDF", "SSP", "SOS", "USD"] as const;

const ticketTypeInput = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(500).optional().default(""),
  price: z.number().finite().min(0).max(10_000_000),
  quantity: z.number().int().min(1).max(100_000),
  salesStartAt: z.string().datetime({ offset: true }).optional(),
  salesEndAt: z.string().datetime({ offset: true }).optional(),
});

const eventInput = z.object({
  title: z.string().trim().min(4).max(100),
  summary: z.string().trim().min(12).max(240),
  description: z.string().trim().min(20).max(6000),
  category: z.string().trim().min(2).max(50),
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }).optional(),
  timeZone: z.string().trim().min(3).max(64).default("Africa/Nairobi"),
  venueName: z.string().trim().min(2).max(120),
  location: z.string().trim().min(2).max(180),
  city: z.string().trim().min(2).max(80),
  country: z.string().trim().min(2).max(80).default("Kenya"),
  currency: z.enum(CURRENCIES).default("KES"),
  imageUrl: z.string().trim().url().optional().or(z.literal("")),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
  feePayer: z.enum(["ORGANIZER", "ATTENDEE"]).default("ORGANIZER"),
  ticketTypes: z.array(ticketTypeInput).min(1).max(10),
});

const orderInput = z.object({
  ticketTypeId: z.string().min(1),
  quantity: z.number().int().min(1).max(10),
  buyerName: z.string().trim().min(2).max(120),
  buyerEmail: z.string().trim().email().max(254),
  buyerPhone: z.string().trim().max(30).optional().default(""),
  idempotencyKey: z.string().uuid(),
});

function ticketSecret() {
  const secret = process.env.TICKET_SIGNING_SECRET || process.env.JWT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") throw new Error("TICKET_SIGNING_SECRET or JWT_SECRET is required");
  return "eventicate-dev-secret-change-in-production";
}

function signTicket(code: string) {
  const signature = createHmac("sha256", ticketSecret()).update(code).digest("base64url").slice(0, 16);
  return `${code}.${signature}`;
}

function isValidTicketToken(token: string) {
  const separator = token.lastIndexOf(".");
  if (separator < 1) return false;
  const code = token.slice(0, separator);
  const supplied = Buffer.from(token.slice(separator + 1));
  const expected = Buffer.from(signTicket(code).slice(separator + 1));
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

function slugBase(title: string) {
  return title.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 72) || "event";
}

function ticketPayload(order: {
  orderCode: string;
  status: string;
  event: { title: string; startsAt: Date; venueName: string; location: string; city: string; country: string; currency: string };
  ticketType: { name: string };
  tickets: { ticketCode: string; status: string }[];
}) {
  return {
    orderCode: order.orderCode,
    status: order.status,
    event: order.event,
    ticketType: order.ticketType,
    tickets: order.tickets.map((ticket) => ({ ...ticket, qrToken: signTicket(ticket.ticketCode) })),
  };
}

router.get("/commission", async (_req, res) => {
  const config = await prisma.systemConfig.findUnique({ where: { id: "default" }, select: { ticketCommissionRate: true } });
  return res.json({ rate: Math.max(0, Math.min(0.2, config?.ticketCommissionRate ?? 0.06)) });
});

// Public discovery: only published events and active ticket types are exposed.
router.get("/events", async (req, res) => {
  const search = typeof req.query.search === "string" ? req.query.search.trim().slice(0, 100) : "";
  const country = typeof req.query.country === "string" ? req.query.country.trim().slice(0, 80) : "";
  const events = await prisma.ticketEvent.findMany({
    where: {
      status: "PUBLISHED",
      AND: [
        { OR: [{ startsAt: { gte: new Date() } }, { endsAt: { gte: new Date() } }] },
        ...(search ? [{ OR: [
          { title: { contains: search, mode: "insensitive" as const } },
          { summary: { contains: search, mode: "insensitive" as const } },
          { city: { contains: search, mode: "insensitive" as const } },
        ] }] : []),
      ],
      ...(country ? { country: { equals: country, mode: "insensitive" } } : {}),
    },
    include: {
      ticketTypes: { where: { isActive: true }, select: { id: true, name: true, description: true, price: true, quantity: true, sold: true }, orderBy: { price: "asc" } },
      organizer: { select: { firstName: true, lastName: true } },
    },
    orderBy: { startsAt: "asc" },
    take: 60,
  });
  return res.json({ events: events.map((event) => ({
    ...event,
    ticketTypes: event.ticketTypes.map((type) => ({ ...type, remaining: Math.max(0, type.quantity - type.sold) })),
  })) });
});

router.get("/events/:slug", async (req, res) => {
  const event = await prisma.ticketEvent.findUnique({
    where: { slug: req.params.slug },
    include: {
      ticketTypes: { where: { isActive: true }, select: { id: true, name: true, description: true, price: true, quantity: true, sold: true, salesStartAt: true, salesEndAt: true }, orderBy: { price: "asc" } },
      organizer: { select: { firstName: true, lastName: true } },
    },
  });
  if (!event || event.status !== "PUBLISHED") return res.status(404).json({ error: "Event not found" });
  return res.json({ event: {
    ...event,
    ticketTypes: event.ticketTypes.map((type) => ({ ...type, remaining: Math.max(0, type.quantity - type.sold) })),
  } });
});

router.post("/events", async (req, res) => {
  const session = await getSession(req);
  if (!session || !["CUSTOMER", "PROVIDER"].includes(session.role)) return res.status(403).json({ error: "Sign in with an organizer account to publish an event" });

  const parsed = eventInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || "Check the event details" });
  const data = parsed.data;
  const startsAt = new Date(data.startsAt);
  const endsAt = data.endsAt ? new Date(data.endsAt) : null;
  if (endsAt && endsAt <= startsAt) return res.status(400).json({ error: "The event end must be after its start" });
  if (data.status === "PUBLISHED" && startsAt.getTime() < Date.now()) return res.status(400).json({ error: "A published event must start in the future" });
  try {
    new Intl.DateTimeFormat("en", { timeZone: data.timeZone });
  } catch {
    return res.status(400).json({ error: "Choose a valid event time zone" });
  }

  const base = slugBase(data.title);
  const slug = `${base}-${randomBytes(4).toString("hex")}`;
  const event = await prisma.ticketEvent.create({
    data: {
      organizerId: session.id,
      slug,
      title: data.title,
      summary: data.summary,
      description: data.description,
      category: data.category,
      startsAt,
      endsAt,
      timeZone: data.timeZone,
      venueName: data.venueName,
      location: data.location,
      city: data.city,
      country: data.country,
      currency: data.currency,
      imageUrl: data.imageUrl || null,
      status: data.status,
      feePayer: data.feePayer,
      ticketTypes: { create: data.ticketTypes.map((type) => ({
        name: type.name,
        description: type.description || null,
        price: type.price,
        quantity: type.quantity,
        salesStartAt: type.salesStartAt ? new Date(type.salesStartAt) : null,
        salesEndAt: type.salesEndAt ? new Date(type.salesEndAt) : null,
      })) },
    },
    include: { ticketTypes: true },
  });
  return res.status(201).json({ event });
});

router.get("/manage/events", async (req, res) => {
  const session = await getSession(req);
  if (!session || !["CUSTOMER", "PROVIDER"].includes(session.role)) return res.status(401).json({ error: "Sign in to manage your events" });
  const events = await prisma.ticketEvent.findMany({
    where: { organizerId: session.id },
    include: { ticketTypes: { orderBy: { price: "asc" } }, _count: { select: { orders: true } } },
    orderBy: { startsAt: "desc" },
  });
  return res.json({ events });
});

router.patch("/manage/events/:id/status", async (req, res) => {
  const session = await getSession(req);
  if (!session || !["CUSTOMER", "PROVIDER"].includes(session.role)) return res.status(401).json({ error: "Sign in to manage your events" });
  const parsed = z.object({ status: z.enum(["DRAFT", "PUBLISHED"]) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Choose draft or published status" });
  const event = await prisma.ticketEvent.findFirst({ where: { id: req.params.id, organizerId: session.id } });
  if (!event) return res.status(404).json({ error: "Event not found" });
  if (event.status === "CANCELLED" || event.status === "COMPLETED") return res.status(409).json({ error: "This event can no longer be changed" });
  if (parsed.data.status === "PUBLISHED" && event.startsAt < new Date()) return res.status(400).json({ error: "An event that has already started cannot be published" });
  const updated = await prisma.ticketEvent.update({ where: { id: event.id }, data: { status: parsed.data.status } });
  return res.json({ event: updated });
});

router.get("/manage/reports", async (req, res) => {
  const session = await getSession(req);
  if (!session || !["CUSTOMER", "PROVIDER"].includes(session.role)) return res.status(401).json({ error: "Sign in to view organizer reports" });
  const events = await prisma.ticketEvent.findMany({
    where: { organizerId: session.id },
    include: {
      ticketTypes: { select: { id: true, name: true, price: true, quantity: true, sold: true } },
      orders: { where: { status: { in: ["FREE_CONFIRMED", "PAID"] } }, select: { quantity: true, ticketSubtotal: true, platformFeeAmount: true, organizerNetAmount: true, currency: true, status: true } },
      _count: { select: { orders: true } },
    },
    orderBy: { startsAt: "desc" },
  });
  const currencyTotals = new Map<string, { paidTickets: number; freeTickets: number; gross: number; platformFees: number; net: number }>();
  for (const event of events) {
    for (const order of event.orders) {
      const value = currencyTotals.get(order.currency) || { paidTickets: 0, freeTickets: 0, gross: 0, platformFees: 0, net: 0 };
      if (order.status === "PAID") {
        value.paidTickets += order.quantity;
        value.gross += Number(order.ticketSubtotal);
        value.platformFees += Number(order.platformFeeAmount);
        value.net += Number(order.organizerNetAmount);
      } else value.freeTickets += order.quantity;
      currencyTotals.set(order.currency, value);
    }
  }
  const bookingWhere = session.role === "PROVIDER"
    ? { provider: { userId: session.id } }
    : { customer: { userId: session.id } };
  const [bookingCount, settledPayments] = await Promise.all([
    prisma.booking.count({ where: bookingWhere }),
    prisma.payment.count({ where: { booking: bookingWhere, status: { in: ["DEPOSIT_PAID", "FULLY_PAID"] } } }),
  ]);
  return res.json({
    ticketSummary: {
      events: events.length,
      orders: events.reduce((total, event) => total + event._count.orders, 0),
      byCurrency: [...currencyTotals.entries()].map(([currency, totals]) => ({ currency, ...totals })),
    },
    serviceSummary: { bookings: bookingCount, settledPayments },
    events: events.map((event) => ({
      id: event.id, title: event.title, slug: event.slug, startsAt: event.startsAt, status: event.status,
      currency: event.currency,
      capacity: event.ticketTypes.reduce((total, type) => total + type.quantity, 0),
      sold: event.ticketTypes.reduce((total, type) => total + type.sold, 0),
      orders: event._count.orders,
      gross: event.orders.reduce((total, order) => total + (order.status === "PAID" ? Number(order.ticketSubtotal) : 0), 0),
      fees: event.orders.reduce((total, order) => total + Number(order.platformFeeAmount), 0),
      net: event.orders.reduce((total, order) => total + Number(order.organizerNetAmount), 0),
    })),
  });
});

router.get("/manage/events/:id", async (req, res) => {
  const session = await getSession(req);
  if (!session || !["CUSTOMER", "PROVIDER"].includes(session.role)) return res.status(401).json({ error: "Sign in to manage your event" });
  const event = await prisma.ticketEvent.findFirst({
    where: { id: req.params.id, organizerId: session.id },
    include: {
      ticketTypes: { orderBy: { price: "asc" } },
      orders: { where: { status: { in: ["FREE_CONFIRMED", "PAID"] } }, include: { ticketType: { select: { name: true } }, tickets: { orderBy: { createdAt: "asc" } } }, orderBy: { createdAt: "desc" }, take: 500 },
    },
  });
  if (!event) return res.status(404).json({ error: "Event not found" });
  return res.json({ event });
});

router.post("/events/:slug/orders", async (req, res) => {
  const parsed = orderInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || "Check the ticket order details" });
  const data = parsed.data;
  const prior = await prisma.ticketOrder.findUnique({ where: { idempotencyKey: data.idempotencyKey }, include: { event: true, ticketType: true, tickets: true } });
  if (prior) {
    if (prior.event.slug !== req.params.slug || prior.buyerEmail !== data.buyerEmail.toLowerCase()) {
      return res.status(409).json({ error: "That order request has already been used" });
    }
    return res.json({ order: ticketPayload(prior) });
  }

  const event = await prisma.ticketEvent.findUnique({ where: { slug: req.params.slug }, select: { id: true, status: true, startsAt: true, endsAt: true, currency: true, feePayer: true } });
  if (!event || event.status !== "PUBLISHED") return res.status(404).json({ error: "Event not found" });
  if ((event.endsAt && event.endsAt < new Date()) || (!event.endsAt && event.startsAt < new Date())) {
    return res.status(409).json({ error: "Ticket reservations are closed for this event" });
  }

  try {
    const order = await prisma.$transaction(async (tx) => {
      const ticketType = await tx.ticketType.findFirst({ where: { id: data.ticketTypeId, eventId: event.id, isActive: true } });
      if (!ticketType) return { success: false as const, error: "That ticket type is no longer available", status: 404 };
      if (Number(ticketType.price) > 0) return { success: false as const, error: "Paid ticket checkout is not active until the ticket payment flow is connected and verified", status: 402 };
      const now = new Date();
      if ((ticketType.salesStartAt && ticketType.salesStartAt > now) || (ticketType.salesEndAt && ticketType.salesEndAt < now)) {
        return { success: false as const, error: "Ticket sales are not open right now", status: 409 };
      }
      const updated = await tx.ticketType.updateMany({
        where: { id: ticketType.id, isActive: true, sold: { lte: ticketType.quantity - data.quantity } },
        data: { sold: { increment: data.quantity } },
      });
      if (updated.count !== 1) return { success: false as const, error: "Those tickets just sold out. Choose another ticket type or quantity.", status: 409 };

      const config = await tx.systemConfig.findUnique({ where: { id: "default" }, select: { ticketCommissionRate: true } });
      const rate = Math.max(0, Math.min(0.2, config?.ticketCommissionRate ?? 0.06));
      const order = await tx.ticketOrder.create({
        data: {
          orderCode: `ET-${randomBytes(6).toString("hex").toUpperCase()}`,
          eventId: event.id,
          ticketTypeId: ticketType.id,
          buyerId: null,
          buyerName: data.buyerName,
          buyerEmail: data.buyerEmail.toLowerCase(),
          buyerPhone: data.buyerPhone || null,
          quantity: data.quantity,
          currency: event.currency,
          ticketSubtotal: 0,
          platformFeeRate: rate,
          platformFeeAmount: 0,
          paymentProcessingFeeAmount: 0,
          feePayer: event.feePayer,
          totalAmount: 0,
          organizerNetAmount: 0,
          status: "FREE_CONFIRMED",
          idempotencyKey: data.idempotencyKey,
          confirmedAt: now,
          tickets: { create: Array.from({ length: data.quantity }, () => ({ ticketCode: randomBytes(16).toString("base64url") })) },
        },
        include: { event: true, ticketType: true, tickets: true },
      });
      return { success: true as const, order };
    });
    if (!order.success) return res.status(order.status).json({ error: order.error });
    return res.status(201).json({ order: ticketPayload(order.order) });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
      const duplicate = await prisma.ticketOrder.findUnique({ where: { idempotencyKey: data.idempotencyKey }, include: { event: true, ticketType: true, tickets: true } });
      if (duplicate) return res.json({ order: ticketPayload(duplicate) });
    }
    console.error("Ticket order failed:", error);
    return res.status(500).json({ error: "Could not reserve tickets. Please try again." });
  }
});

router.post("/manage/events/:id/check-in", async (req, res) => {
  const session = await getSession(req);
  if (!session || !["CUSTOMER", "PROVIDER"].includes(session.role)) return res.status(401).json({ error: "Sign in to scan tickets" });
  const suppliedToken = typeof req.body?.token === "string" ? req.body.token.trim() : "";
  const token = z.string().min(20).max(100).safeParse(suppliedToken);
  if (!token.success) return res.status(400).json({ error: "Enter or scan a ticket code" });
  const separator = token.data.lastIndexOf(".");
  const hasSignedCode = separator > 0 && isValidTicketToken(token.data);
  const isManualCode = /^[A-Za-z0-9_-]{22}$/.test(token.data);
  if (!hasSignedCode && !isManualCode) return res.status(400).json({ error: "That ticket code is not valid" });
  const ticketCode = hasSignedCode ? token.data.slice(0, separator) : token.data;
  const event = await prisma.ticketEvent.findFirst({ where: { id: req.params.id, organizerId: session.id }, select: { id: true, status: true } });
  if (!event) return res.status(404).json({ error: "Event not found" });
  if (!["PUBLISHED", "COMPLETED"].includes(event.status)) return res.status(409).json({ error: "Check-in is unavailable for this event" });
  const ticket = await prisma.ticket.findFirst({
    where: { ticketCode, order: { eventId: event.id, status: { in: ["FREE_CONFIRMED", "PAID"] } } },
    include: { order: { include: { ticketType: { select: { name: true } } } } },
  });
  if (!ticket) return res.status(404).json({ error: "Ticket not found for this event" });
  if (ticket.status === "CHECKED_IN") return res.status(409).json({ error: "This ticket has already been scanned", scannedAt: ticket.checkedInAt });
  if (ticket.status !== "VALID") return res.status(409).json({ error: "This ticket has been cancelled" });
  const result = await prisma.ticket.updateMany({
    where: { id: ticket.id, status: "VALID" },
    data: { status: "CHECKED_IN", checkedInAt: new Date(), checkedInById: session.id },
  });
  if (result.count !== 1) return res.status(409).json({ error: "This ticket has already been scanned" });
  return res.json({ checkedIn: true, ticket: { ticketCode, buyerName: ticket.order.buyerName, type: ticket.order.ticketType.name } });
});

export default router;
