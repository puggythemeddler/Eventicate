import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { Prisma } from "@prisma/client";
import prisma from "../src/lib/prisma";
import { createToken } from "../src/lib/auth";
import cartQuotes from "../src/routes/quotes/generate-from-cart";

// The real router, auth and document generator run against transaction-scoped
// storage doubles. No database, email transport or gateway is contacted.
test("cart quotations use the customer's event and commit all providers together", async (t) => {
  function override<T, K extends keyof T>(object: T, key: K, implementation: unknown) {
    const original = object[key];
    object[key] = implementation as T[K];
    t.after(() => { object[key] = original; });
  }
  const app = express();
  app.use(express.json());
  app.use("/quotes", cartQuotes);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  t.after(() => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const token = await createToken({ id: "test-user", email: "test@example.invalid", firstName: "Test", lastName: "Customer", role: "CUSTOMER" });
  override(prisma.user, "findUnique", async () => ({ id: "test-user", isActive: true, role: "CUSTOMER", termsAcceptedAt: new Date() }));
  override(prisma.user, "updateMany", async () => ({ count: 0 }));
  let event: { id: string; customerId: string; title: string; eventDate: Date; location: string; status: string } | null;
  let conflict = false;
  let failDocument = false;
  let race = false;
  let committed: { bookings: string[]; slots: string[]; deleted: boolean };
  let queries: unknown[];
  let selectedDate: Date | undefined;
  function reset() {
    event = { id: "event-test", customerId: "customer-test", title: "Actual wedding", eventDate: new Date(Date.now() + 30 * 86400000), location: "Nairobi", status: "PLANNING" };
    conflict = false; failDocument = false; race = false; selectedDate = undefined;
    committed = { bookings: [], slots: [], deleted: false }; queries = [];
  }
  reset();
  override(prisma, "$transaction", async (callback: (db: unknown) => Promise<unknown>, options: { isolationLevel: string }) => {
    assert.equal(options.isolationLevel, "Serializable");
    const staged = { bookings: [] as string[], slots: [] as string[], deleted: false };
    const providers = ["provider-a", "provider-b"];
    const tx = {
      customerProfile: { findUnique: async () => ({ id: "customer-test" }) },
      event: { findFirst: async (query: unknown) => { queries.push(query); return event; } },
      cartItem: {
        findMany: async () => providers.map((id) => ({ id: "cart-" + id, quantity: 1, equipment: null, service: { id: "service-" + id, name: "Service", isActive: true, basePrice: new Prisma.Decimal(1000), discountPercent: 0, provider: { id, isApproved: true, businessName: id } } })),
        deleteMany: async ({ where }: { where: { id: { in: string[] } } }) => { assert.deepEqual(where.id.in, providers.map(id => "cart-" + id)); staged.deleted = true; return { count: 2 }; },
      },
      availabilitySlot: {
        findUnique: async ({ where }: { where: { providerId_date: { providerId: string; date: Date } } }) => { selectedDate = where.providerId_date.date; return conflict && where.providerId_date.providerId === "provider-b" ? { status: "CONFIRMED" } : null; },
        upsert: async ({ create }: { create: { providerId: string; bookingId: string } }) => { staged.slots.push(create.providerId); return create; },
      },
      booking: {
        create: async ({ data }: { data: { providerId: string; eventId: string } }) => { assert.equal(data.eventId, "event-test"); staged.bookings.push(data.providerId); return { id: data.providerId }; },
        findUnique: async ({ where }: { where: { id: string } }) => ({ id: where.id, quotedPrice: new Prisma.Decimal(1000), depositAmount: null, depositPaid: false, event, service: { name: "Service" }, provider: { userId: where.id, businessName: where.id }, customer: { userId: "test-user", user: { firstName: "Test", lastName: "Customer", email: "test@example.invalid" } } }),
      },
      documentCounter: { update: async () => ({ nextNumber: 2 + staged.bookings.length }) },
      document: {
        create: async ({ data }: { data: { bookingId: string } }) => { if (failDocument) throw new Error("Simulated document storage failure"); return { id: "doc-" + data.bookingId, documentNumber: "QTE-TEST", total: new Prisma.Decimal(1000), type: "QUOTE" }; },
        update: async () => ({}),
      },
    };
    const result = await callback(tx);
    if (race) throw Object.assign(new Error("Serialization conflict"), { code: "P2034" });
    committed = staged;
    return result;
  });
  async function request(body: unknown) {
    const response = await fetch(`http://127.0.0.1:${address.port}/quotes`, { method: "POST", headers: { "Content-Type": "application/json", Cookie: `eventicate_token=${token}` }, body: JSON.stringify(body) });
    return { status: response.status, body: await response.json() };
  }
  await t.test("missing event is rejected without cart changes", async () => {
    reset(); assert.equal((await request({})).status, 400); assert.equal(committed.deleted, false);
  });
  await t.test("another customer's or missing event is rejected", async () => {
    reset(); event = null; assert.equal((await request({ eventId: "other-event" })).status, 404);
    assert.deepEqual(queries[0], { where: { id: "other-event", customerId: "customer-test" } });
  });
  await t.test("past or cancelled events cannot generate quotes", async () => {
    reset(); event!.eventDate = new Date(0); assert.equal((await request({ eventId: "event-test" })).status, 400);
    reset(); event!.status = "CANCELLED"; assert.equal((await request({ eventId: "event-test" })).status, 400);
  });
  await t.test("an unavailable second provider rolls back the entire cart", async () => {
    reset(); conflict = true; assert.equal((await request({ eventId: "event-test" })).status, 409);
    assert.deepEqual(committed, { bookings: [], slots: [], deleted: false });
  });
  await t.test("document failure preserves the cart and reservations", async () => {
    reset(); failDocument = true; assert.equal((await request({ eventId: "event-test" })).status, 500);
    assert.deepEqual(committed, { bookings: [], slots: [], deleted: false });
  });
  await t.test("serialization conflicts return a retryable response", async () => {
    reset(); race = true; assert.equal((await request({ eventId: "event-test" })).status, 409); assert.equal(committed.deleted, false);
  });
  await t.test("valid selection reuses its date and commits bookings, quotes and cart deletion", async () => {
    reset(); const expectedDate = new Date(event!.eventDate); expectedDate.setHours(0, 0, 0, 0);
    const result = await request({ eventId: "event-test" }); assert.equal(result.status, 200); assert.equal(result.body.documents.length, 2);
    assert.equal(selectedDate!.getTime(), expectedDate.getTime());
    assert.deepEqual(committed, { bookings: ["provider-a", "provider-b"], slots: ["provider-a", "provider-b"], deleted: true });
  });
});
