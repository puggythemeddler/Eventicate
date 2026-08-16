import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizePhone } from "../src/lib/mpesa";
import { calculateCateringPrice } from "../src/lib/booking-engine";

test("normalizePhone converts local formats to international", () => {
  assert.equal(normalizePhone("0712345678"), "254712345678");
  assert.equal(normalizePhone("254712345678"), "254712345678");
  assert.equal(normalizePhone("712345678"), "254712345678");
  assert.equal(normalizePhone("+254 712 345 678"), "254712345678");
});

test("calculateCateringPrice charges per extra guest above package count", () => {
  assert.equal(calculateCateringPrice(150000, 1500, 100, 100), 150000);
  assert.equal(calculateCateringPrice(150000, 1500, 100, 120), 180000);
  assert.equal(calculateCateringPrice(50000, 800, 50, 40), 50000);
});