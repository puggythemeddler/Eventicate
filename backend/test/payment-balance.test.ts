import { test } from "node:test";
import assert from "node:assert/strict";
import { settledPaymentTotal } from "../../src/lib/payment-balance";

test("unsuccessful payment attempts never reduce the customer's balance", () => {
  assert.equal(settledPaymentTotal([
    { amount: 10000, status: "PENDING" },
    { amount: 10000, status: "FAILED" },
    { amount: 3000, status: "REFUNDED" },
  ]), 0);
});

test("a deposit and settled balance count once alongside unsuccessful retries", () => {
  assert.equal(settledPaymentTotal([
    { amount: 3000, status: "DEPOSIT_PAID" },
    { amount: 7000, status: "FULLY_PAID" },
    { amount: 7000, status: "FAILED" },
    { amount: 7000, status: "PENDING" },
  ]), 10000);
  assert.equal(settledPaymentTotal([]), 0);
});
