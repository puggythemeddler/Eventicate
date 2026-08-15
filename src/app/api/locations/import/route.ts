import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

const importSchema = z.object({
  csv: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { csv } = importSchema.parse(body);

    const lines = csv.split("\n").map((l) => l.trim()).filter(Boolean);
    const errors: string[] = [];
    let imported = 0;

    const startIndex = lines.length > 0 && lines[0].toLowerCase().startsWith("country") ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      const parts = line.split(",").map((s) => s.trim());
      if (parts.length < 2) {
        errors.push(`Line ${i + 1}: invalid format, expected "country,subdivision"`);
        continue;
      }
      const [countryName, subdivisionName] = parts;
      if (!countryName || !subdivisionName) {
        errors.push(`Line ${i + 1}: empty country or subdivision`);
        continue;
      }

      try {
        const country = await prisma.country.upsert({
          where: { name: countryName },
          update: {},
          create: { name: countryName },
        });

        await prisma.subdivision.upsert({
          where: { countryId_name: { countryId: country.id, name: subdivisionName } },
          update: {},
          create: { countryId: country.id, name: subdivisionName },
        });

        imported++;
      } catch (err) {
        errors.push(`Line ${i + 1}: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    }

    return NextResponse.json({ imported, errors });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Import POST error:", error);
    return NextResponse.json({ error: "Failed to import CSV" }, { status: 500 });
  }
}
