import { Router } from "express";
import { z } from "zod";
import { getSession } from "../../lib/auth";
import prisma from "../../lib/prisma";

const createSchema = z.object({
  countryId: z.string().min(1),
  name: z.string().min(1),
  sortOrder: z.number().int().optional(),
});

const router = Router();

router.get("/", async (req, res) => {
  const session = await getSession(req);
  if (!session || session.role !== "ADMIN") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const countryId = req.query.countryId as string | undefined;

  const where = countryId ? { countryId } : {};
  const subdivisions = await prisma.subdivision.findMany({
    where,
    orderBy: { sortOrder: "asc" },
  });

  return res.status(200).json({ subdivisions });
});

router.post("/", async (req, res) => {
  const session = await getSession(req);
  if (!session || session.role !== "ADMIN") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  try {
    const body = req.body;
    const data = createSchema.parse(body);

    const subdivision = await prisma.subdivision.create({
      data: { countryId: data.countryId, name: data.name, sortOrder: data.sortOrder ?? 0 },
    });

    return res.status(201).json({ subdivision });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Subdivision POST error:", error);
    return res.status(500).json({ error: "Failed to create subdivision" });
  }
});

export default router;
