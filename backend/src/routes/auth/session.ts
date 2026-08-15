import { Router } from "express";
import { getSession } from "../../lib/auth";

const router = Router();

router.get("/", async (req, res) => {
  const session = await getSession(req);
  return res.status(200).json({ user: session });
});

export default router;
