import { Router } from "express";
import prisma from "../../lib/prisma";
import { COUNTRIES } from "../../lib/locations";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const countries = await prisma.country.findMany({
      include: { subdivisions: { orderBy: { sortOrder: "asc" } } },
      orderBy: { sortOrder: "asc" },
    });

    if (countries.length > 0) {
      return res.status(200).json({
        countries: countries.map((c) => ({
          name: c.name,
          subdivisions: c.subdivisions.map((s) => ({ value: s.name, label: s.name })),
        })),
      });
    }
  } catch {
    // fallback
  }

  return res.status(200).json({ countries: COUNTRIES });
});

export default router;
