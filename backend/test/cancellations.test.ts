import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { Prisma } from "@prisma/client";
import prisma from "../src/lib/prisma";
import { createToken } from "../src/lib/auth";
import { createBookingDetailRouter } from "../src/routes/bookings/[id]";
import { createComplaintResolutionRouter } from "../src/routes/admin/complaint-resolution";

test("cancellation and refund decisions preserve funds and require recorded transfers", async t => {
  function override(object: object, key: string, value: unknown) {
    const target = object as Record<string, unknown>; const original = target[key]; target[key] = value;
    t.after(() => { target[key] = original; });
  }
  type RequestRow = { id: string; bookingId: string; complaintType: string; status: string; reporterId: string; reportedId: string; subject: string; description: string; resolution: string | null; refundAmount: Prisma.Decimal | null; refundReference: string | null; refundPaidAt: Date | null; adminNotes: string | null; resolvedAt: Date | null };
  let rows: RequestRow[], status: string, paid: number, released: number, notices: unknown[], failWrite: boolean;
  function reset() { rows = []; status = "DEPOSIT_PAID"; paid = 3000; released = 0; notices = []; failWrite = false; }
  reset();
  const row = () => ({ id: "booking", status, depositPaid: true, customerId: "customer-profile", providerId: "provider-profile", payments: [{ status: "DEPOSIT_PAID", amount: new Prisma.Decimal(paid) }, { status: "FAILED", amount: new Prisma.Decimal(9000) }], customer: { userId: "customer", user: { email: "demo@example.invalid", firstName: "Demo" } }, provider: { userId: "provider" }, event: { title: "Test", eventDate: new Date("2035-01-01") } });
  override(prisma.user, "findUnique", async ({ where }: { where: { id: string } }) => ({ id: where.id, isActive: true, termsAcceptedAt: new Date() }));
  override(prisma.user, "updateMany", async () => ({ count: 0 }));
  override(prisma.user, "findMany", async () => [{ id: "admin" }]);
  override(prisma.customerProfile, "findUnique", async () => ({ id: "customer-profile" }));
  override(prisma.providerProfile, "findUnique", async () => ({ id: "provider-profile" }));
  override(prisma.booking, "findUnique", async () => row());
  override(prisma.booking, "update", async ({ data }: { data: { status?: string } }) => { if (data.status) status = data.status; return row(); });
  override(prisma.availabilitySlot, "updateMany", async ({ where }: { where: { bookingId?: string } }) => { assert.equal(where.bookingId, "booking"); released++; return { count: 1 }; });
  override(prisma.complaint, "findFirst", async () => rows.find(r => ["open", "investigating"].includes(r.status)) ?? null);
  override(prisma.complaint, "findUnique", async ({ where }: { where: { id: string } }) => rows.find(r => r.id === where.id) ?? null);
  override(prisma.complaint, "findMany", async ({ where }: { where: { id?: { not: string } } }) => rows.filter(r => r.id !== where.id?.not && ["refund_pending", "resolved"].includes(r.status)));
  override(prisma.complaint, "create", async ({ data }: { data: Partial<RequestRow> }) => { const created = { id: "request-" + rows.length, status: "open", resolution: null, refundAmount: null, refundReference: null, refundPaidAt: null, adminNotes: null, resolvedAt: null, ...data } as RequestRow; rows.push(created); return created; });
  override(prisma.complaint, "update", async ({ where, data }: { where: { id: string }; data: Partial<RequestRow> }) => { if (failWrite) throw new Error("Storage unavailable"); const current = rows.find(r => r.id === where.id)!; Object.assign(current, Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined))); return current; });
  override(prisma.notification, "create", async ({ data }: { data: unknown }) => { notices.push(data); return {}; });
  override(prisma, "$transaction", async (callback: (tx: typeof prisma) => Promise<unknown>, options: { isolationLevel: string }) => {
    assert.equal(options.isolationLevel, "Serializable");
    const before = { rows: rows.map(r => ({ ...r })), status, released, notices: [...notices] };
    try { return await callback(prisma); } catch (error) { rows = before.rows; status = before.status; released = before.released; notices = before.notices; throw error; }
  });
  const app = express(); app.use(express.json()); app.use("/bookings/:id", createBookingDetailRouter(async () => {})); app.use("/decisions", createComplaintResolutionRouter());
  const server = app.listen(0, "127.0.0.1"); await new Promise<void>(resolve => server.once("listening", resolve));
  t.after(() => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  const address = server.address(); assert.ok(address && typeof address !== "string");
  const tokens: Record<string, string> = {};
  for (const [id, role] of [["customer", "CUSTOMER"], ["provider", "PROVIDER"], ["admin", "ADMIN"], ["stranger", "CUSTOMER"]] as const) tokens[id] = await createToken({ id, role, email: "demo@example.invalid", firstName: "Demo", lastName: "Test" });
  async function request(path: string, body: unknown, actor = "customer", method = "POST") {
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`, { method, headers: { "Content-Type": "application/json", Cookie: `eventicate_token=${tokens[actor]}` }, body: JSON.stringify(body) });
    return { status: response.status, body: await response.json() };
  }
  const cancel = (actor = "customer") => request("/bookings/booking/cancellation", { reason: "Demo cancellation request only" }, actor);
  const decide = (body: object, actor = "admin") => request("/decisions", { complaintId: rows[0]?.id, ...body }, actor, "PATCH");
  await t.test("owners request review without cancelling or releasing stock; retries deduplicate", async () => {
    reset(); assert.equal((await cancel("stranger")).status, 403); assert.equal(rows.length, 0);
    assert.equal((await cancel()).status, 201); assert.equal((await cancel()).status, 201); assert.equal(rows.length, 1); assert.equal(status, "DEPOSIT_PAID"); assert.equal(released, 0);
  });
  await t.test("provider can request cancellation, but not for closed bookings", async () => {
    reset(); assert.equal((await cancel("provider")).status, 201); status = "COMPLETED"; assert.equal((await cancel()).status, 409);
  });
  await t.test("verified payments cannot be bypassed through direct cancellation", async () => {
    reset(); status = "CONFIRMED";
    for (const actor of ["customer", "provider"]) assert.equal((await request("/bookings/booking", { status: "CANCELLED" }, actor, "PATCH")).status, 409);
    assert.equal(status, "CONFIRMED"); assert.equal(released, 0);
  });
  await t.test("only admins decide; decline leaves booking and funds untouched", async () => {
    reset(); await cancel(); assert.equal((await decide({ status: "dismissed" }, "customer")).status, 403);
    assert.equal((await decide({ status: "dismissed", adminNotes: "Date remains booked" })).status, 200); assert.equal(status, "DEPOSIT_PAID"); assert.equal(released, 0);
  });
  await t.test("approval cancels and releases only this booking, without pretending money moved", async () => {
    reset(); await cancel(); const result = await decide({ status: "refund_pending", resolution: "PARTIAL_REFUND", refundAmount: 2000, adminNotes: "Deposit less agreed cancellation cost" });
    assert.equal(result.status, 200); assert.equal(status, "CANCELLED"); assert.equal(released, 1); assert.equal(rows[0].refundPaidAt, null); assert.equal(rows[0].refundReference, null); assert.equal(row().depositPaid, true);
    assert.equal((await decide({ status: "resolved" })).status, 400);
    assert.equal((await decide({ status: "resolved", resolution: "NO_REFUND" })).status, 409);
    assert.equal((await decide({ status: "resolved", refundReference: "DEMO-REFUND-ONLY" })).status, 200); assert.ok(rows[0].refundPaidAt); assert.equal(rows[0].refundReference, "DEMO-REFUND-ONLY");
    assert.equal((await decide({ status: "open" })).status, 409);
  });
  await t.test("refunds cannot be fabricated, overpaid, or counted against failed payments", async () => {
    reset(); await cancel();
    assert.equal((await decide({ status: "resolved", resolution: "REFUNDED", refundAmount: 3000, refundReference: "FAKE" })).status, 409);
    assert.equal((await decide({ status: "refund_pending", resolution: "REFUNDED", refundAmount: 4000 })).status, 400);
    assert.equal((await decide({ status: "refund_pending", resolution: "REFUNDED", refundAmount: 2000 })).status, 400);
    assert.equal((await decide({ status: "refund_pending", resolution: "PARTIAL_REFUND", refundAmount: 0 })).status, 400);
    assert.equal(status, "DEPOSIT_PAID");
  });
  await t.test("other approved refunds reserve the refundable funds", async () => {
    reset(); await cancel(); rows.push({ ...rows[0], id: "earlier", status: "resolved", resolution: "PARTIAL_REFUND", refundAmount: new Prisma.Decimal(2500) });
    assert.equal((await decide({ status: "refund_pending", resolution: "PARTIAL_REFUND", refundAmount: 1000 })).status, 400);
  });
  await t.test("a failed decision rolls back cancellation and inventory release", async () => {
    reset(); await cancel(); failWrite = true;
    assert.equal((await decide({ status: "refund_pending", resolution: "REFUNDED", refundAmount: 3000, adminNotes: "Demo decision" })).status, 500);
    assert.equal(status, "DEPOSIT_PAID"); assert.equal(released, 0); assert.equal(rows[0].status, "open");
  });
  await t.test("a no-refund cancellation needs decision notes and records no payout", async () => {
    reset(); await cancel(); assert.equal((await decide({ status: "resolved", resolution: "NO_REFUND" })).status, 400);
    assert.equal((await decide({ status: "resolved", resolution: "NO_REFUND", adminNotes: "Agreed cancellation terms retain deposit" })).status, 200);
    assert.equal(status, "CANCELLED"); assert.equal(rows[0].refundPaidAt, null); assert.equal(rows[0].refundAmount, null);
  });
});
