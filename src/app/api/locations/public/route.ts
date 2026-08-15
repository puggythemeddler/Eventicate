import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { COUNTRIES } from "@/lib/locations";

export async function GET() {
  try {
    const countries = await prisma.country.findMany({
      include: { subdivisions: { orderBy: { sortOrder: "asc" } } },
      orderBy: { sortOrder: "asc" },
    });

    if (countries.length > 0) {
      return NextResponse.json({
        countries: countries.map((c) => ({
          name: c.name,
          subdivisions: c.subdivisions.map((s) => ({ value: s.name, label: s.name })),
        })),
      });
    }
  } catch {
    // fallback
  }

  return NextResponse.json({ countries: COUNTRIES });
}
