import { Router } from "express";
import prisma from "../lib/prisma";
import { getSession } from "../lib/auth";

const router = Router();

router.get("/", async (req, res) => {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const take = Math.min(Number(req.query.take) || 20, 100);
  const unreadOnly = req.query.unread === "true";

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: session.id, ...(unreadOnly ? { isRead: false } : {}) },
      orderBy: { createdAt: "desc" },
      take,
    }),
    prisma.notification.count({ where: { userId: session.id, isRead: false } }),
  ]);

  return res.json({ notifications, unreadCount });
});

router.get("/unread-count", async (req, res) => {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const unreadCount = await prisma.notification.count({
    where: { userId: session.id, isRead: false },
  });

  return res.json({ unreadCount });
});

router.patch("/:id", async (req, res) => {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const notification = await prisma.notification.findUnique({
    where: { id: req.params.id },
  });
  if (!notification || notification.userId !== session.id) {
    return res.status(404).json({ error: "Notification not found" });
  }

  await prisma.notification.update({
    where: { id: notification.id },
    data: { isRead: true },
  });

  return res.json({ success: true });
});

router.post("/read-all", async (req, res) => {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  await prisma.notification.updateMany({
    where: { userId: session.id, isRead: false },
    data: { isRead: true },
  });

  return res.json({ success: true });
});

export default router;