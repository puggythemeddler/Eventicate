import prisma from "./prisma";
import { sendAccountDeactivatedEmail } from "./email";

const INACTIVITY_DAYS = Math.max(30, parseInt(process.env.INACTIVITY_DAYS || "90", 10) || 90);

export async function deactivateInactiveAccounts() {
  const cutoff = new Date(Date.now() - INACTIVITY_DAYS * 24 * 60 * 60 * 1000);

  const candidates = await prisma.user.findMany({
    where: {
      role: { not: "ADMIN" },
      isActive: true,
      OR: [
        { lastActiveAt: { lt: cutoff } },
        { lastActiveAt: null, createdAt: { lt: cutoff } },
      ],
    },
    select: { id: true, firstName: true, lastName: true, email: true },
  });

  if (candidates.length === 0) return { deactivated: 0 };

  const ids = candidates.map((c) => c.id);

  await prisma.$transaction([
    prisma.user.updateMany({ where: { id: { in: ids } }, data: { isActive: false } }),
    prisma.notification.createMany({
      data: candidates.map((c) => ({
        userId: c.id,
        type: "SYSTEM",
        title: "Account deactivated",
        message: `Your account was deactivated because it has been inactive for ${INACTIVITY_DAYS} days. Contact support to reactivate it.`,
        link: "/auth/login",
      })),
    }),
  ]);

  for (const user of candidates) {
    try {
      await sendAccountDeactivatedEmail(user.email, `${user.firstName} ${user.lastName}`.trim(), INACTIVITY_DAYS);
    } catch (error) {
      console.error(`Deactivation email failed for ${user.email}:`, error);
    }
  }

  console.log(`[inactive-accounts] Deactivated ${candidates.length} account(s) inactive for ${INACTIVITY_DAYS}+ days`);
  return { deactivated: candidates.length };
}