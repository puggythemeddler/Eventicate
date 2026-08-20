import { Router } from "express";
import prisma from "../../lib/prisma";
import { getSession } from "../../lib/auth";

const router = Router();

const EVENT_TYPES = new Set(["signup", "booking", "payment", "complaint", "provider_verified", "document"]);

// Unified admin activity log built from existing tables, newest first.
router.get("/", async (req, res) => {
  const session = await getSession(req);
  if (!session || session.role !== "ADMIN") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const typeParam = (req.query.type as string | undefined) || "ALL";
  const type = EVENT_TYPES.has(typeParam) ? typeParam : "ALL";
  const days = Math.min(365, Math.max(1, parseInt((req.query.days as string) || "30", 10) || 30));
  const page = Math.max(1, parseInt((req.query.page as string) || "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt((req.query.pageSize as string) || "50", 10) || 50));

  const start = days === 365 ? undefined : new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const createdWhere = start ? { createdAt: { gte: start } } : {};

  type ActivityEvent = {
    id: string;
    type: string;
    title: string;
    description: string;
    date: Date;
    link: string | null;
  };

  const events: ActivityEvent[] = [];
  const totals: Record<string, number> = { signup: 0, booking: 0, payment: 0, complaint: 0, provider_verified: 0, document: 0 };

  const [users, bookings, payments, complaints, verifications, documents] = await Promise.all([
    type === "ALL" || type === "signup"
      ? prisma.user.findMany({
          where: createdWhere,
          select: { id: true, firstName: true, lastName: true, email: true, role: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 500,
        })
      : [],
    type === "ALL" || type === "booking"
      ? prisma.booking.findMany({
          where: createdWhere,
          select: {
            id: true,
            status: true,
            createdAt: true,
            event: { select: { title: true } },
            customer: { select: { user: { select: { firstName: true, lastName: true } } } },
            provider: { select: { businessName: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 500,
        })
      : [],
    type === "ALL" || type === "payment"
      ? prisma.payment.findMany({
          where: createdWhere,
          select: { id: true, amount: true, method: true, status: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 500,
        })
      : [],
    type === "ALL" || type === "complaint"
      ? prisma.complaint.findMany({
          where: createdWhere,
          select: {
            id: true,
            subject: true,
            status: true,
            priority: true,
            createdAt: true,
            reporter: { select: { firstName: true, lastName: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 500,
        })
      : [],
    type === "ALL" || type === "provider_verified"
      ? prisma.providerProfile.findMany({
          where: start ? { verifiedAt: { not: null, gte: start } } : { verifiedAt: { not: null } },
          select: { id: true, businessName: true, verifiedAt: true },
          orderBy: { verifiedAt: "desc" },
          take: 500,
        })
      : [],
    type === "ALL" || type === "document"
      ? prisma.document.findMany({
          where: createdWhere,
          select: { id: true, type: true, documentNumber: true, senderName: true, recipientName: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 500,
        })
      : [],
  ]);

  for (const u of users) {
    totals.signup += 1;
    events.push({
      id: `signup-${u.id}`,
      type: "signup",
      title: "New account created",
      description: `${u.firstName} ${u.lastName} (${u.email}) registered as ${u.role.replace(/_/g, " ").toLowerCase()}`,
      date: u.createdAt,
      link: "/admin/users",
    });
  }

  for (const b of bookings) {
    totals.booking += 1;
    events.push({
      id: `booking-${b.id}`,
      type: "booking",
      title: "New booking requested",
      description: `"${b.event.title}" — ${b.customer?.user?.firstName ?? "Customer"} ${b.customer?.user?.lastName ?? ""} → ${b.provider?.businessName ?? "provider"} (${b.status.replace(/_/g, " ")})`,
      date: b.createdAt,
      link: "/admin/payments",
    });
  }

  for (const p of payments) {
    totals.payment += 1;
    events.push({
      id: `payment-${p.id}`,
      type: "payment",
      title: `Payment ${p.status.toLowerCase()}`,
      description: `${p.method.replace(/_/g, " ")} payment of ${Number(p.amount).toFixed(2)}`,
      date: p.createdAt,
      link: "/admin/payments",
    });
  }

  for (const c of complaints) {
    totals.complaint += 1;
    events.push({
      id: `complaint-${c.id}`,
      type: "complaint",
      title: `Complaint filed (${c.status})`,
      description: `${c.reporter?.firstName ?? ""} ${c.reporter?.lastName ?? ""}: ${c.subject}`,
      date: c.createdAt,
      link: "/admin/complaints",
    });
  }

  for (const v of verifications) {
    if (!v.verifiedAt) continue;
    totals.provider_verified += 1;
    events.push({
      id: `verified-${v.id}`,
      type: "provider_verified",
      title: "Provider verified",
      description: `${v.businessName} passed verification`,
      date: v.verifiedAt,
      link: "/admin/providers",
    });
  }

  for (const d of documents) {
    totals.document += 1;
    events.push({
      id: `document-${d.id}`,
      type: "document",
      title: `Document created (${d.type.replace(/_/g, " ").toLowerCase()})`,
      description: `${d.senderName} → ${d.recipientName} (${d.documentNumber})`,
      date: d.createdAt,
      link: null,
    });
  }

  events.sort((a, b) => b.date.getTime() - a.date.getTime());

  const total = events.length;
  const paged = events.slice((page - 1) * pageSize, page * pageSize);

  return res.status(200).json({
    events: paged.map((e) => ({ ...e, date: e.date.toISOString() })),
    totals,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
});

export default router;