import { Router } from "express";
import prisma from "../../lib/prisma";
import { getSession } from "../../lib/auth";
import { generateQuoteFromBooking } from "../../lib/documents";

const router = Router();

router.post("/", async (req, res) => {
  const session = await getSession(req);
  if (!session || session.role !== "CUSTOMER") {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const customer = await prisma.customerProfile.findUnique({
      where: { userId: session.id },
    });
    if (!customer) return res.status(404).json({ error: "Customer not found" });

    const cartItems = await prisma.cartItem.findMany({
      where: { customerId: customer.id },
      include: {
        service: { include: { provider: true } },
        equipment: { include: { provider: true } },
      },
    });

    if (cartItems.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    const providerGroups = new Map<string, typeof cartItems>();
    for (const item of cartItems) {
      const provider = item.service?.provider || item.equipment?.provider;
      if (!provider) continue;
      const existing = providerGroups.get(provider.id) || [];
      existing.push(item);
      providerGroups.set(provider.id, existing);
    }

    const masterQuoteId = `mq_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const documents: Awaited<ReturnType<typeof generateQuoteFromBooking>>[] = [];

    for (const [providerId, items] of providerGroups) {
      const totalPrice = items.reduce((sum, item) => {
        const unitPrice = item.service?.basePrice || item.equipment?.rentalPrice || 0;
        return sum + unitPrice * item.quantity;
      }, 0);

      const event = await prisma.event.create({
        data: {
          customerId: customer.id,
          title: "Shopping Cart Order",
          eventType: "OTHER",
          eventDate: new Date(),
          location: "",
          guestCount: 1,
          description: `Auto-generated from cart: ${items.map((i) => i.service?.name || i.equipment?.name).join(", ")}`,
          requiredServices: "[]",
          timelineData: "[]",
        },
      });

      const booking = await prisma.booking.create({
        data: {
          eventId: event.id,
          customerId: customer.id,
          providerId,
          quotedPrice: totalPrice,
          status: "QUOTATION_SENT",
          customerNotes: `Cart order: ${items.length} item(s)`,
        },
      });

      const doc = await generateQuoteFromBooking(booking.id);

      await prisma.document.update({
        where: { id: doc.id },
        data: { masterQuoteId },
      });

      documents.push(doc);
    }

    await prisma.cartItem.deleteMany({
      where: { customerId: customer.id },
    });

    return res.status(200).json({
      documents: documents.map((d) => ({
        id: d.id,
        documentNumber: d.documentNumber,
        total: d.total,
        type: d.type,
      })),
      masterQuoteId,
    });
  } catch (error) {
    console.error("Generate from cart error:", error);
    return res.status(500).json({ error: "Failed to generate quotes" });
  }
});

export default router;
