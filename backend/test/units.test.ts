import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateDocumentTotals, formatDocumentNumber } from "../src/lib/documents";
import { calculateAverageRating, parseJsonArray, toJsonArray } from "../src/lib/utils";
import { sanitizeFolderName } from "../src/lib/cloudinary";
import { extractStkCallback } from "../src/lib/mpesa";
import { isSolemnEvent } from "../src/lib/constants";
import { hashToken } from "../src/routes/auth/forgot-password";

test("formatDocumentNumber pads to four digits", () => {
  assert.equal(formatDocumentNumber(1), "0001");
  assert.equal(formatDocumentNumber(42), "0042");
  assert.equal(formatDocumentNumber(12345), "12345");
});

test("calculateDocumentTotals applies tax after discount", () => {
  const items = [
    { description: "Venue", quantity: 1, unitPrice: 100000, total: 100000 },
    { description: "Catering", quantity: 2, unitPrice: 5000, total: 10000 },
  ];
  const totals = calculateDocumentTotals(items, 16, 10);
  assert.equal(totals.subtotal, 110000);
  assert.equal(totals.discountAmount, 11000);
  assert.equal(totals.taxAmount, 15840); // (110000 - 11000) * 0.16
  assert.equal(totals.total, 114840); // 99000 + 15840
});

test("calculateDocumentTotals with no line items is zero", () => {
  const totals = calculateDocumentTotals([], 16, 0);
  assert.equal(totals.subtotal, 0);
  assert.equal(totals.taxAmount, 0);
  assert.equal(totals.total, 0);
});

test("calculateAverageRating averages only valid ratings and rounds to 1dp", () => {
  assert.equal(calculateAverageRating([]), 0);
  assert.equal(calculateAverageRating([null, undefined, 0]), 0);
  assert.equal(calculateAverageRating([5, 4, 5]), 4.7);
  assert.equal(calculateAverageRating([3, 3, 3]), 3);
});

test("parseJsonArray falls back on invalid input", () => {
  assert.deepEqual(parseJsonArray<number>("[1,2,3]"), [1, 2, 3]);
  assert.deepEqual(parseJsonArray<number>("not-json"), []);
  assert.deepEqual(parseJsonArray<number>("not-json", [1]), [1]);
  assert.deepEqual(parseJsonArray<number>('{"a":1}'), []);
});

test("toJsonArray serializes arrays", () => {
  assert.equal(toJsonArray([{ a: 1 }]), '[{"a":1}]');
});

test("sanitizeFolderName keeps alphanumerics and dashes", () => {
  assert.equal(sanitizeFolderName("My Business"), "My-Business");
  assert.equal(sanitizeFolderName("  Led   Lights  "), "Led-Lights");
  assert.equal(sanitizeFolderName("OK_2"), "OK_2");
  assert.equal(sanitizeFolderName("a/../b"), "a-b");
});

test("extractStkCallback parses a successful callback", () => {
  const raw = {
    Body: {
      stkCallback: {
        MerchantRequestID: "m1",
        CheckoutRequestID: "c1",
        ResultCode: "0",
        ResultDesc: "Success",
        CallbackMetadata: {
          Item: [
            { Name: "Amount", Value: 5000 },
            { Name: "MpesaReceiptNumber", Value: "PBX1234" },
            { Name: "PhoneNumber", Value: 254700000001 },
            { Name: "TransactionDate", Value: "20260818120000" },
          ],
        },
      },
    },
  };
  const cb = extractStkCallback(raw);
  assert.equal(cb.checkoutRequestId, "c1");
  assert.equal(cb.resultCode, "0");
  assert.equal(cb.amount, 5000);
  assert.equal(cb.receipt, "PBX1234");
  assert.equal(cb.phone, "254700000001");
  assert.equal(cb.transactionDate, "20260818120000");
});

test("extractStkCallback returns empty for malformed payload", () => {
  assert.deepEqual(extractStkCallback({}), {});
  assert.deepEqual(extractStkCallback(null), {});
  assert.deepEqual(extractStkCallback({ Body: {} }), {});
});

test("isSolemnEvent flags funeral and church events", () => {
  assert.equal(isSolemnEvent("FUNERAL"), true);
  assert.equal(isSolemnEvent("CHURCH"), true);
  assert.equal(isSolemnEvent("WEDDING"), false);
  assert.equal(isSolemnEvent(null), false);
});

test("hashToken is deterministic sha256", () => {
  const a = hashToken("abc123");
  const b = hashToken("abc123");
  assert.equal(a, b);
  assert.notEqual(a, hashToken("abc124"));
  assert.match(a, /^[a-f0-9]{64}$/);
});
