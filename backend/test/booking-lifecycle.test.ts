import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { Prisma, type BookingStatus } from "@prisma/client";
import prisma from "../src/lib/prisma";
import { createToken } from "../src/lib/auth";
import { createPaymentInitiationRouter } from "../src/routes/payments/initiate";
import { createManualPaymentRouter } from "../src/routes/payments";
import { createMpesaCallbackRouter } from "../src/routes/payments/mpesa-callback";
import { createAgreementsRouter } from "../src/routes/agreements";
import { createBookingDetailRouter } from "../src/routes/bookings/[id]";
import { getEquipmentAvailability } from "../src/lib/booking-engine";
import { generateQuoteFromBooking } from "../src/lib/documents";

test("booking payments and agreements: isolated route regression and journey checks", async (t) => {
  function override<T, K extends keyof T>(object: T, key: K, implementation: unknown) {
    const original = object[key]; object[key] = implementation as T[K];
    t.after(() => { object[key] = original; });
  }
  type Payment = { id: string; bookingId: string; transactionId: string; status: string; amount: Prisma.Decimal; notes: string | null; isDeposit: boolean };
  type Agreement = { id: string; bookingId: string; documentId: string; terms: string; totalAmount: number; depositAmount: number; customerName: string; signedAt: Date };
  let status: BookingStatus, depositPaid: boolean, payments: Payment[], signed: Agreement | null;
  let bookingOwner: string, failBookingWrite: boolean, gatewayCalls: number, receipts: number, notices: string[];
  let callbackStatus: "COMPLETED" | "FAILED" | "PENDING", gatewaySuccess: boolean;
  let generatedDocument: Record<string, unknown> | null = null;
  let providerTerms: string | null = "Delivery included. Balance due before setup.";
  let requestedDeposit: number | null = 3000;
  let detailsQuery: { include?: { documents?: unknown; agreements?: unknown } } | null;
  const decimal = (n: number) => new Prisma.Decimal(n);
  const quote = { id: "quote-test", bookingId: "booking-test", type: "QUOTE", status: "SENT", senderId: "provider-user", recipientId: "customer-user", documentNumber: "QTE-0001", total: decimal(10000), depositRequired: decimal(3000), terms: "Delivery included. Balance due before setup.", lineItems: '[{"description":"Sound hire","quantity":1,"unitPrice":10000,"total":10000}]' };
  const provider = { id: "provider-test", userId: "provider-user", businessName: "Fixture provider", user: { firstName: "Test", email: "provider@example.invalid" } };
  const customer = { id: "customer-test", userId: "customer-user", user: { firstName: "Test", lastName: "Customer", email: "customer@example.invalid", phone: "test-only" } };
  function reset(initial: BookingStatus = "CONFIRMED") {
    status = initial; depositPaid = false; payments = []; signed = null; bookingOwner = "customer-test";
    failBookingWrite = false; gatewayCalls = 0; receipts = 0; notices = []; callbackStatus = "COMPLETED"; gatewaySuccess = true; detailsQuery = null;
    quote.id = "quote-test"; quote.status = "SENT"; quote.terms = "Delivery included. Balance due before setup.";
    quote.total = decimal(10000); quote.depositRequired = decimal(3000);
    quote.recipientId = "customer-user";
  }
  reset();
  const bookingRow = () => ({
    id: "booking-test", status, depositPaid, customerId: bookingOwner, providerId: provider.id,
    quotedPrice: decimal(10000), finalPrice: null, depositAmount: requestedDeposit === null ? null : decimal(requestedDeposit), providerNotes: providerTerms,
    customer, provider, payments: payments.map(p => ({ ...p })),
    event: { id: "event-test", title: "Future event", eventType: "WEDDING", eventDate: new Date("2035-05-15T10:00:00Z") },
    service: { name: "Sound hire" }, documents: [quote], agreements: signed ? [signed] : [],
  });
  override(prisma.user, "findUnique", async ({ where }: { where: { id: string } }) => ({ id: where.id, isActive: true, termsAcceptedAt: new Date() }));
  override(prisma.user, "updateMany", async () => ({ count: 0 }));
  override(prisma.customerProfile, "findUnique", async ({ where }: { where: { userId: string } }) => ({ id: where.userId === "customer-user" ? "customer-test" : "other-customer" }));
  override(prisma.providerProfile, "findUnique", async () => provider);
  override(prisma.booking, "findFirst", async () => bookingRow());
  override(prisma.booking, "findUnique", async (query: typeof detailsQuery) => { detailsQuery = query; return bookingRow(); });
  override(prisma.booking, "update", async ({ data }: { data: { status?: BookingStatus; depositPaid?: boolean } }) => {
    if (failBookingWrite) throw new Error("Simulated transaction storage failure");
    if (data.status) status = data.status;
    if (data.depositPaid !== undefined) depositPaid = data.depositPaid;
    return bookingRow();
  });
  override(prisma.payment, "create", async ({ data }: { data: Omit<Payment, "id" | "amount"> & { amount: number } }) => {
    const row = { ...data, id: "payment-" + payments.length, amount: decimal(data.amount) }; payments.push(row); return row;
  });
  override(prisma.payment, "findFirst", async ({ where }: { where: { transactionId: string; status?: string } }) => {
    const row = payments.find(p => p.transactionId === where.transactionId && (!where.status || p.status === where.status));
    return row ? { ...row, booking: bookingRow() } : null;
  });
  override(prisma.payment, "findUnique", async ({ where }: { where: { id: string } }) => {
    const row = payments.find(p => p.id === where.id); return row ? { ...row, booking: bookingRow() } : null;
  });
  override(prisma.payment, "updateMany", async ({ where, data }: { where: { id: string; status: string }; data: Partial<Payment> }) => {
    const row = payments.find(p => p.id === where.id && p.status === where.status);
    if (!row) return { count: 0 }; Object.assign(row, data); return { count: 1 };
  });
  override(prisma.systemConfig, "findUnique", async () => ({ mpesaCallbackSecret: "isolated-test-secret" }));
  override(prisma.notification, "create", async ({ data }: { data: { title: string } }) => { notices.push(data.title); return {}; });
  override(prisma.agreement, "findFirst", async () => signed);
  override(prisma.agreement, "create", async ({ data }: { data: Omit<Agreement, "id" | "signedAt"> }) => {
    signed = { ...data, id: "agreement-test", signedAt: new Date() }; return signed;
  });
  override(prisma.document, "findFirst", async () => quote);
  override(prisma.document, "update", async ({ data }: { data: { status: string } }) => { quote.status = data.status; return quote; });
  override(prisma.document, "create", async ({ data }: { data: Record<string, unknown> }) => { generatedDocument = data; return quote; });
  override(prisma.documentCounter, "update", async () => ({ nextNumber: 2 }));
  override(prisma.availabilitySlot, "upsert", async () => ({}));
  override(prisma.availabilitySlot, "updateMany", async () => ({ count: 1 }));
  override(prisma.equipment, "findUnique", async () => ({ id: "equipment-test", providerId: provider.id, quantity: 5 }));
  override(prisma.bookingItem, "findMany", async ({ where }: { where: { booking: { status: { in: string[] } } } }) => where.booking.status.in.includes(status) ? [{ quantity: 2 }] : []);
  override(prisma, "$transaction", async (callback: (tx: typeof prisma) => Promise<unknown>, options: { isolationLevel: string }) => {
    assert.equal(options.isolationLevel, "Serializable");
    const before = { status, depositPaid, payments: payments.map(p => ({ ...p })), signed, quoteStatus: quote.status };
    try { return await callback(prisma); }
    catch (error) { status = before.status; depositPaid = before.depositPaid; payments = before.payments; signed = before.signed; quote.status = before.quoteStatus; throw error; }
  });
  const app = express(); app.use(express.json());
  app.use("/initiate", createPaymentInitiationRouter(async () => {
    gatewayCalls++; return gatewaySuccess ? { success: true, transactionId: "checkout-" + payments.length, checkoutRequestId: "checkout-" + payments.length } : { success: false, error: "Simulated gateway failure" };
  }));
  app.use("/manual", createManualPaymentRouter(async () => { receipts++; return quote as unknown as Awaited<ReturnType<typeof import("../src/lib/documents").generateReceiptFromPayment>>; }));
  app.use("/callback", createMpesaCallbackRouter(async () => ({ status: callbackStatus }), async () => {}));
  app.use("/agreements", createAgreementsRouter(async () => {}));
  app.use("/bookings/:id", createBookingDetailRouter(async () => {}));
  const server = app.listen(0, "127.0.0.1"); await new Promise<void>(resolve => server.once("listening", resolve));
  t.after(() => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  const address = server.address(); assert.ok(address && typeof address !== "string");
  const tokens = {
    CUSTOMER: await createToken({ id: "customer-user", email: "customer@example.invalid", role: "CUSTOMER", firstName: "Test", lastName: "Customer" }),
    PROVIDER: await createToken({ id: "provider-user", email: "provider@example.invalid", role: "PROVIDER", firstName: "Test", lastName: "Provider" }),
  };
  async function request(url: string, body?: unknown, role: keyof typeof tokens = "CUSTOMER", method = "POST") {
    const response = await fetch(`http://127.0.0.1:${address.port}${url}`, { method, headers: { "Content-Type": "application/json", Cookie: `eventicate_token=${tokens[role]}`, "x-eventicate-callback": "isolated-test-secret" }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, body: await response.json() };
  }
  const initiate = (amount = 10000, isDeposit = false) => request("/initiate", { gateway: "mpesa", bookingId: "booking-test", amount, isDeposit });
  const manual = (amount = 10000, isDeposit = false) => request("/manual", { bookingId: "booking-test", amount, method: "CASH", isDeposit }, "PROVIDER");
  const callback = (index = 0, result = 0) => request("/callback", { Body: { stkCallback: { CheckoutRequestID: "checkout-" + index, ResultCode: result, CallbackMetadata: { Item: [{ Name: "Amount", Value: payments[index]?.amount.toNumber() }] } } } });
  const signPayload = () => ({ bookingId: "booking-test", documentId: quote.id, customerName: "Test Customer", customerPhone: "test-only", customerEmail: "customer@example.invalid", signature: "Test Customer", terms: quote.terms, totalAmount: 10000, depositAmount: 3000 });

  await t.test("inactive and unaccepted bookings cannot initiate or record payments", async () => {
    for (const state of ["CANCELLED", "REJECTED", "QUOTATION_REQUESTED", "QUOTATION_SENT", "PENDING_APPROVAL"] as BookingStatus[]) {
      reset(state); assert.equal((await initiate()).status, 409); assert.equal((await manual()).status, 409);
      assert.equal(gatewayCalls, 0); assert.equal(payments.length, 0); assert.equal(receipts, 0);
    }
  });
  await t.test("payment ownership is checked before contacting the gateway", async () => {
    reset(); bookingOwner = "someone-else"; assert.equal((await initiate()).status, 403); assert.equal(gatewayCalls, 0);
  });
  await t.test("gateway failure creates no settled or pending payment", async () => {
    reset(); gatewaySuccess = false; assert.equal((await initiate()).status, 502); assert.equal(payments.length, 0); assert.equal(status, "CONFIRMED");
  });
  await t.test("full advance payment stays active and continues reserving equipment", async () => {
    reset(); assert.equal((await initiate()).status, 200); assert.equal((await callback()).status, 200);
    assert.equal(payments[0].status, "FULLY_PAID"); assert.equal(status, "CONFIRMED"); assert.equal(depositPaid, true);
    const stock = await getEquipmentAvailability(provider.id, "equipment-test"); assert.equal(stock.reservedUnits, 2);
    await callback(); assert.equal(notices.filter(n => n === "Payment Received").length, 1);
  });
  await t.test("full offline payment does not complete a future event", async () => {
    reset(); assert.equal((await manual()).status, 201); assert.equal(payments[0].status, "FULLY_PAID"); assert.equal(status, "CONFIRMED"); assert.equal(receipts, 1);
  });
  await t.test("customers cannot self-certify offline payments", async () => {
    reset();
    assert.equal((await request("/manual", { bookingId: "booking-test", amount: 10000, method: "CASH" })).status, 403);
    assert.equal(payments.length, 0);
  });
  await t.test("offline deposits cannot exceed the remaining balance", async () => {
    reset(); assert.equal((await manual(20000, true)).status, 400); assert.equal(payments.length, 0);
  });
  await t.test("late settlement records money for review without reopening a cancellation", async () => {
    reset(); await initiate(); status = "CANCELLED"; assert.equal((await callback()).status, 200);
    assert.equal(status, "CANCELLED"); assert.equal(depositPaid, false); assert.equal(payments[0].status, "FULLY_PAID");
    assert.equal(JSON.parse(payments[0].notes!).reconciliationRequired, true); assert.ok(notices.includes("Payment Needs Review"));
  });
  await t.test("a transaction failure leaves a callback retryable instead of half-settled", async () => {
    reset(); await initiate(); failBookingWrite = true; assert.equal((await callback()).status, 500);
    assert.equal(payments[0].status, "PENDING"); failBookingWrite = false; assert.equal((await callback()).status, 200); assert.equal(payments[0].status, "FULLY_PAID");
  });
  await t.test("verified failed prompts remain unpaid", async () => {
    reset(); await initiate(); callbackStatus = "FAILED"; await callback(0, 1032); assert.equal(payments[0].status, "FAILED"); assert.equal(status, "CONFIRMED");
  });
  await t.test("a failure callback cannot overwrite an already settled payment", async () => {
    reset(); await initiate(); await callback(); callbackStatus = "FAILED"; await callback(0, 1032);
    assert.equal(payments[0].status, "FULLY_PAID"); assert.equal(status, "CONFIRMED");
  });
  await t.test("delivered bookings may settle an outstanding balance without changing delivery status", async () => {
    reset("COMPLETED"); assert.equal((await manual()).status, 201); assert.equal(status, "COMPLETED");
  });
  await t.test("booking details query includes current quote and saved agreement snapshots", async () => {
    reset(); assert.equal((await request("/bookings/booking-test", undefined, "CUSTOMER", "GET")).status, 200);
    assert.ok(detailsQuery?.include?.documents); assert.ok(detailsQuery?.include?.agreements);
  });
  await t.test("agreements reject changed terms, stale quotes and incorrect amounts", async () => {
    reset(); const payload = signPayload();
    assert.equal((await request("/agreements", { ...payload, terms: "Client replaced the terms" })).status, 409);
    assert.equal((await request("/agreements", { ...payload, documentId: "old-quote" })).status, 409);
    assert.equal((await request("/agreements", { ...payload, totalAmount: 1 })).status, 400);
    assert.equal((await request("/agreements", { ...payload, depositAmount: 1 })).status, 409);
    assert.equal(signed, null);
  });
  await t.test("missing provider terms and cancelled bookings cannot be signed", async () => {
    reset(); quote.terms = ""; assert.equal((await request("/agreements", { ...signPayload(), terms: "Invented terms" })).status, 409);
    reset("CANCELLED"); assert.equal((await request("/agreements", signPayload())).status, 409); assert.equal(signed, null);
  });
  await t.test("a quotation addressed to someone else cannot be signed", async () => {
    reset(); quote.recipientId = "other-user"; assert.equal((await request("/agreements", signPayload())).status, 403); assert.equal(signed, null);
  });
  await t.test("customer/provider journey: quotation, acceptance, agreement, deposit, balance, delivery", async () => {
    reset("QUOTATION_REQUESTED");
    assert.equal((await request("/bookings/booking-test", { status: "QUOTATION_SENT", quotedPrice: 10000, providerNotes: quote.terms }, "PROVIDER", "PATCH")).status, 200);
    assert.equal((await request("/bookings/booking-test", { status: "CONFIRMED" }, "CUSTOMER", "PATCH")).status, 200);
    assert.equal((await request("/agreements", signPayload())).status, 201);
    assert.equal(signed!.terms, quote.terms); assert.equal(quote.status, "ACCEPTED");
    assert.equal((await request("/agreements", signPayload())).status, 409);
    assert.equal((await initiate(3000, true)).status, 200); assert.equal((await callback(0)).status, 200); assert.equal(status, "DEPOSIT_PAID");
    assert.equal((await initiate(7000)).status, 200); assert.equal((await callback(1)).status, 200); assert.equal(status, "DEPOSIT_PAID");
    assert.equal(payments.reduce((sum, p) => sum + p.amount.toNumber(), 0), 10000);
    assert.equal((await request("/bookings/booking-test", { status: "COMPLETED" }, "PROVIDER", "PATCH")).status, 200); assert.equal(status, "COMPLETED");
    assert.equal((await getEquipmentAvailability(provider.id, "equipment-test")).reservedUnits, 0);
  });
  await t.test("generated quotations preserve provider terms and never invent a deposit", async () => {
    reset("QUOTATION_SENT");
    providerTerms = "DEMO ONLY. No services or payment due.";
    for (const deposit of [null, 0, 2500]) {
      requestedDeposit = deposit;
      await generateQuoteFromBooking("booking-test");
      assert.equal(generatedDocument!.terms, providerTerms);
      assert.equal(generatedDocument!.depositRequired, deposit ?? 0);
      assert.equal(generatedDocument!.status, "SENT");
    }
    providerTerms = null;
    await generateQuoteFromBooking("booking-test");
    assert.equal(generatedDocument!.terms, null);
    requestedDeposit = 3000;
  });
  await t.test("sending a quotation requires terms and a deposit within its price", async () => {
    reset("QUOTATION_REQUESTED");
    assert.equal((await request("/bookings/booking-test", { status: "QUOTATION_SENT", quotedPrice: 100 }, "PROVIDER", "PATCH")).status, 400);
    assert.equal((await request("/bookings/booking-test", { status: "QUOTATION_SENT", quotedPrice: 100, providerNotes: "Demo", depositAmount: 101 }, "PROVIDER", "PATCH")).status, 400);
    assert.equal(status, "QUOTATION_REQUESTED");
  });
});
