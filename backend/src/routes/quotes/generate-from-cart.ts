import { Router } from "express";
import { z } from "zod";
import prisma from "../../lib/prisma";
import { getSession } from "../../lib/auth";
import { generateQuoteFromBooking } from "../../lib/documents";
import { assertEquipmentQuantityAvailable } from "../../lib/booking-engine";

const router = Router();
const requestSchema = z.object({ eventId: z.string().min(1) });

function fail(status: number, message: string): never {
  throw Object.assign(new Error(message), { status });
}

router.post("/", async (req, res) => {
  const session = await getSession(req);
  if (!session || session.role !== "CUSTOMER") {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const data = requestSchema.parse(req.body);
    const result = await prisma.$transaction(async (tx) => {
      const customer = await tx.customerProfile.findUnique({
        where: { userId: session.id },
      });
      if (!customer) fail(404, "Customer not found");

      const event = await tx.event.findFirst({ where: { id: data.eventId, customerId: customer.id } });
      if (!event) fail(404, "Event not found");
      if (["CANCELLED", "COMPLETED"].includes(event.status.toUpperCase()) || event.eventDate <= new Date()) {
        fail(400, "Choose an upcoming event that has not been cancelled or completed");
      }
      if (!event.location.trim()) fail(400, "Add a location to your event before requesting quotes");

      const cartItems = await tx.cartItem.findMany({
        where: { customerId: customer.id },
        include: {
          service: { include: { provider: true } },
          equipment: { include: { provider: true } },
        },
      });

      if (cartItems.length === 0) {
        fail(400, "Cart is empty");
      }

      const providerGroups = new Map<string, typeof cartItems>();
      for (const item of cartItems) {
        const provider = item.service?.provider || item.equipment?.provider;
        if (!provider) fail(400, "A cart item is no longer available. Remove it and try again.");
        if (!provider.isApproved || item.service?.isActive === false) {
          fail(400, "A provider or service in your cart is no longer available");
        }
        const existing = providerGroups.get(provider.id) || [];
        existing.push(item);
        providerGroups.set(provider.id, existing);
      }

      const masterQuoteId = `mq_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      const documents: Awaited<ReturnType<typeof generateQuoteFromBooking>>[] = [];

      for (const [providerId, items] of providerGroups) {
        const dateOnly = new Date(event.eventDate);
        dateOnly.setHours(0, 0, 0, 0);
        const slot = await tx.availabilitySlot.findUnique({
          where: { providerId_date: { providerId, date: dateOnly } },
        });
        if (slot && slot.status !== "AVAILABLE") {
          fail(409, `${items[0].service?.provider.businessName || items[0].equipment?.provider.businessName} is no longer available on your event date`);
        }
        // Guard against over-committing rental stock before creating anything.
        for (const item of items) {
          if (item.equipment) {
            await assertEquipmentQuantityAvailable(providerId, item.equipment.id, item.quantity, tx);
          }
        }

        // Price from the source of truth, honoring discounts and per-item charges.
        const totalPrice = items.reduce((sum, item) => {
          if (item.service) {
            const svc = item.service;
            const discounted = svc.discountPercent > 0
              ? (svc.basePrice.toNumber() * (100 - svc.discountPercent)) / 100
              : svc.basePrice.toNumber();
            return sum + Math.round(discounted * item.quantity * 100) / 100;
          }
          if (item.equipment) {
            const eq = item.equipment;
            const discounted = eq.discountPercent > 0
              ? (eq.rentalPrice.toNumber() * (100 - eq.discountPercent)) / 100
              : eq.rentalPrice.toNumber();
            const perItem = discounted + eq.setupCharge.toNumber() + eq.transportCharge.toNumber() + eq.operatorCharge.toNumber();
            return sum + Math.round(perItem * item.quantity * 100) / 100;
          }
          return sum;
        }, 0);

        const booking = await tx.booking.create({
          data: {
            eventId: event.id,
            customerId: customer.id,
            providerId,
            quotedPrice: totalPrice,
            status: "QUOTATION_SENT",
            customerNotes: `Cart order: ${items.length} item(s)`,
            items: {
              create: items.map((item) => {
                if (item.equipment) {
                  const eq = item.equipment;
                  const discounted = eq.discountPercent > 0
                    ? (eq.rentalPrice.toNumber() * (100 - eq.discountPercent)) / 100
                    : eq.rentalPrice.toNumber();
                  return {
                    equipmentId: eq.id,
                    quantity: item.quantity,
                    unitPrice: Math.round(discounted * 100) / 100,
                    setupCharge: eq.setupCharge.toNumber(),
                    transportCharge: eq.transportCharge.toNumber(),
                    operatorCharge: eq.operatorCharge.toNumber(),
                  };
                }
                if (item.service) {
                  const svc = item.service;
                  const discounted = svc.discountPercent > 0
                    ? (svc.basePrice.toNumber() * (100 - svc.discountPercent)) / 100
                    : svc.basePrice.toNumber();
                  return {
                    serviceId: svc.id,
                    quantity: item.quantity,
                    unitPrice: Math.round(discounted * 100) / 100,
                  };
                }
                throw new Error("Cart item references no service or equipment");
              }),
            },
          },
        });

        await tx.availabilitySlot.upsert({
          where: { providerId_date: { providerId, date: dateOnly } },
          create: { providerId, date: dateOnly, status: "PENDING", bookingId: booking.id },
          update: { status: "PENDING", bookingId: booking.id },
        });

        const doc = await generateQuoteFromBooking(booking.id, tx);

        await tx.document.update({
          where: { id: doc.id },
          data: { masterQuoteId },
        });

        documents.push(doc);
      }

      await tx.cartItem.deleteMany({
        where: { customerId: customer.id, id: { in: cartItems.map((item) => item.id) } },
      });

      return {
        documents: documents.map((d) => ({
          id: d.id,
          documentNumber: d.documentNumber,
          total: d.total,
          type: d.type,
        })),
        masterQuoteId,
      };
    }, { isolationLevel: "Serializable", timeout: 15000 });
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Choose an event before requesting quotes" });
    const failure = error as { status?: number; code?: string; message?: string };
    if (failure.status) return res.status(failure.status).json({ error: failure.message });
    if (failure.code === "P2034" || failure.code === "P2002") {
      return res.status(409).json({ error: "Availability or cart contents changed. Review your cart and try again." });
    }
    console.error("Generate from cart error:", error);
    return res.status(500).json({ error: "Failed to generate quotes" });
  }
});

export default router;
