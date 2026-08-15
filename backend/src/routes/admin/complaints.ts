import { Router } from "express";
import { z } from "zod";
import prisma from "../../lib/prisma";
import { getSession } from "../../lib/auth";

const router = Router();

router.get("/", async (req, res) => {
  const session = await getSession(req);
  if (!session || session.role !== "ADMIN") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const status = req.query.status as string | undefined;

  const where: Record<string, unknown> = {};
  if (status && status !== "ALL") where.status = status;

  const complaints = await prisma.complaint.findMany({
    where,
    include: {
      reporter: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return res.status(200).json({ complaints });
});

const patchSchema = z.object({
  complaintId: z.string(),
  status: z.enum(["open", "investigating", "resolved", "dismissed"]).optional(),
  adminNotes: z.string().optional(),
});

router.patch("/", async (req, res) => {
  const session = await getSession(req);
  if (!session || session.role !== "ADMIN") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  try {
    const body = req.body;
    const data = patchSchema.parse(body);

    const updateData: Record<string, unknown> = {};
    if (data.status) updateData.status = data.status;
    if (data.adminNotes !== undefined) updateData.adminNotes = data.adminNotes;

    const complaint = await prisma.complaint.update({
      where: { id: data.complaintId },
      data: updateData,
    });

    return res.status(200).json({ complaint });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Complaint PATCH error:", error);
    return res.status(500).json({ error: "Failed to update complaint" });
  }
});

export default router;
