import { Router } from "express";
import { z } from "zod";
import { getSession } from "../../lib/auth";
import prisma from "../../lib/prisma";

const createSchema = z.object({
  name: z.string().min(1),
  sortOrder: z.number().int().optional(),
});

const router = Router();

router.get("/", async (req, res) => {
  const session = await getSession(req);
  if (!session || session.role !== "ADMIN") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const countries = await prisma.country.findMany({
    include: { subdivisions: { orderBy: { sortOrder: "asc" } } },
    orderBy: { sortOrder: "asc" },
  });

  return res.status(200).json({ countries });
});

router.post("/", async (req, res) => {
  const session = await getSession(req);
  if (!session || session.role !== "ADMIN") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  try {
    const body = req.body;
    const data = createSchema.parse(body);

    const country = await prisma.country.create({
      data: { name: data.name, sortOrder: data.sortOrder ?? 0 },
    });

    return res.status(201).json({ country });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Country POST error:", error);
    return res.status(500).json({ error: "Failed to create country" });
  }
});

export default router;
