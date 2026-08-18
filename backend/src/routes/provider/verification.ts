import { Router } from "express";
import { z } from "zod";
import prisma from "../../lib/prisma";
import { getSession } from "../../lib/auth";
import { createNotification } from "../../lib/booking-engine";

const router = Router();

const requestSchema = z.object({
  documents: z.array(z.string().url()).min(1).max(10),
  note: z.string().max(1000).optional(),
});

// Provider submits a verification request with supporting documents.
router.post("/", async (req, res) => {
  const session = await getSession(req);
  if (!session || session.role !== "PROVIDER") {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const provider = await prisma.providerProfile.findUnique({
    where: { userId: session.id },
  });
  if (!provider) return res.status(404).json({ error: "Provider not found" });

  try {
    const data = requestSchema.parse(req.body);

    if (provider.verificationStatus === "VERIFIED") {
      return res.status(400).json({ error: "Your business is already verified" });
    }

    const updated = await prisma.providerProfile.update({
      where: { id: provider.id },
      data: {
        verificationStatus: "PENDING",
        verificationSubmittedAt: new Date(),
        verificationDocuments: JSON.stringify(data.documents),
        verificationNote: data.note,
      },
    });

    // Notify admins so the request isn't left waiting forever.
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });
    await Promise.all(
      admins.map((a) =>
        createNotification(
          a.id,
          "SYSTEM",
          "Verification Request",
          `${updated.businessName} submitted a verification request`,
          "/admin/providers"
        )
      )
    );

    return res.status(200).json({ verificationStatus: updated.verificationStatus });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    return res.status(500).json({ error: "Failed to submit verification request" });
  }
});

export default router;