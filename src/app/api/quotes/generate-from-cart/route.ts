import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { generateQuoteFromBooking } from "@/lib/documents";

export async function POST() {
  const session = await getSession();
  if (!session || session.role !== "CUSTOMER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const customer = await prisma.customerProfile.findUnique({
      where: { userId: session.id },
    });
    if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

    const cartItems = await prisma.cartItem.findMany({
      where: { customerId: customer.id },
      include: {
        service: { include: { provider: true } },
        equipment: { include: { provider: true } },
      },
    });

    if (cartItems.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
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

    return NextResponse.json({
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
    return NextResponse.json({ error: "Failed to generate quotes" }, { status: 500 });
  }
}
