import { Router } from "express";
import { z } from "zod";
import { getSession } from "../../../lib/auth";
import prisma from "../../../lib/prisma";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  sortOrder: z.number().int().optional(),
});

const router = Router();

router.put("/", async (req, res) => {
  const session = await getSession(req);
  if (!session || session.role !== "ADMIN") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  try {
    const id = (req.params as { id: string }).id;
    const body = req.body;
    const data = updateSchema.parse(body);

    const subdivision = await prisma.subdivision.update({
      where: { id },
      data,
    });

    return res.status(200).json({ subdivision });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Subdivision PUT error:", error);
    return res.status(500).json({ error: "Failed to update subdivision" });
  }
});

router.delete("/", async (req, res) => {
  const session = await getSession(req);
  if (!session || session.role !== "ADMIN") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  try {
    const id = (req.params as { id: string }).id;
    await prisma.subdivision.delete({ where: { id } });
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Subdivision DELETE error:", error);
    return res.status(500).json({ error: "Failed to delete subdivision" });
  }
});

export default router;
