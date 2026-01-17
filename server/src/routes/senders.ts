import { Router } from "express";
import { z } from "zod";
import { pool } from "../db";

const router = Router();

function getUserIdFromReq(req: any): string | null {
  const sessionUser = req.cookies?.["session_user"];
  if (sessionUser) return String(sessionUser);
  const devUser = process.env.DEV_USER_ID;
  return devUser ? String(devUser) : null;
}

router.get("/", async (req, res) => {
  const userId = getUserIdFromReq(req);
  if (!userId) return res.status(401).json({ error: "unauthorized" });
  const { rows } = await pool.query(
    "select id, from_email, from_name, created_at from senders where user_id = $1 order by created_at desc",
    [userId]
  );
  res.json(rows);
});

const createSchema = z.object({
  fromEmail: z.string().email(),
  fromName: z.string().min(1).max(100)
});

router.post("/", async (req, res) => {
  const userId = getUserIdFromReq(req);
  if (!userId) return res.status(401).json({ error: "unauthorized" });
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_payload" });
  const { fromEmail, fromName } = parsed.data;
  try {
    const { rows } = await pool.query(
      `insert into senders (user_id, from_email, from_name)
       values ($1,$2,$3)
       on conflict (user_id, from_email) do update set from_name = excluded.from_name
       returning id, from_email, from_name`,
      [userId, fromEmail, fromName]
    );
    res.json(rows[0]);
  } catch {
    res.status(500).json({ error: "create_failed" });
  }
});

export default router;

