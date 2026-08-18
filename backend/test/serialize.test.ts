import { test } from "node:test";
import assert from "node:assert/strict";
import { Prisma } from "@prisma/client";
import { stripDecimals } from "../src/lib/serialize";

test("stripDecimals converts Decimal instances to numbers", () => {
  const input = {
    amount: new Prisma.Decimal("1250.5"),
    name: "Booking",
    due: new Prisma.Decimal(0),
    list: [new Prisma.Decimal("99.99"), 5],
    when: new Date("2026-01-01T00:00:00.000Z"),
    nested: { price: new Prisma.Decimal("12.34") },
  };
  const out = stripDecimals(input) as Record<string, unknown>;
  assert.equal(out.amount, 1250.5);
  assert.equal(out.name, "Booking");
  assert.equal(out.due, 0);
  assert.deepEqual(out.list, [99.99, 5]);
  assert.ok(out.when instanceof Date);
  assert.deepEqual(out.nested, { price: 12.34 });
});

test("stripDecimals leaves primitives untouched", () => {
  assert.equal(stripDecimals(null), null);
  assert.equal(stripDecimals(undefined), undefined);
  assert.equal(stripDecimals(42), 42);
  assert.equal(stripDecimals("str"), "str");
  assert.equal(stripDecimals(true), true);
});