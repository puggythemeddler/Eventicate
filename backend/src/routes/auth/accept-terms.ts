import { Router } from "express";
import prisma from "../../lib/prisma";
import { getSession, createToken, setSessionCookie } from "../../lib/auth";

const router = Router();

// Accept the role-specific terms of use. Marks the account as having accepted
// and issues a fresh session token that carries termsAcceptedAt so the
// frontend gate stops redirecting to the acceptance page.
router.post("/", async (req, res) => {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  try {
    const user = await prisma.user.update({
      where: { id: session.id },
      data: { termsAcceptedAt: new Date() },
      include: { customerProfile: true, providerProfile: true },
    });

    const token = await createToken({
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      country: user.customerProfile?.country ?? user.providerProfile?.country ?? null,
      termsAcceptedAt: user.termsAcceptedAt?.toISOString() ?? null,
    });

    setSessionCookie(res, token);

    return res.status(200).json({ success: true });
  } catch {
    return res.status(500).json({ error: "Failed to accept terms" });
  }
});

export default router;