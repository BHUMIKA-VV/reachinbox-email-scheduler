import { Router } from "express";
import { z } from "zod";
import { pool } from "../db";
import { emailQueue } from "../queue";

const router = Router();

const scheduleSchema = z.object({
  toEmail: z.string().email(),
  subject: z.string().min(1).max(200),
  body: z.string().min(1),
  senderId: z.string().uuid(),
  scheduledAt: z.string().transform(s => new Date(s))
});

router.post("/schedule", async (req, res) => {
  const parsed = scheduleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_payload" });
  const { toEmail, subject, body, senderId, scheduledAt } = parsed.data;

  const delayMs = Math.max(0, scheduledAt.getTime() - Date.now());
  const client = await pool.connect();
  try {
    await client.query("begin");
    const senderRows = await client.query(
      "select s.id, s.user_id from senders s where s.id = $1",
      [senderId]
    );
    if (senderRows.rows.length === 0) {
      await client.query("rollback");
      return res.status(400).json({ error: "invalid_sender" });
    }
    const userId = senderRows.rows[0].user_id;
    const insert = await client.query(
      `insert into emails (user_id, sender_id, to_email, subject, body, scheduled_at)
       values ($1,$2,$3,$4,$5,$6) returning id`,
      [userId, senderId, toEmail, subject, body, scheduledAt.toISOString()]
    );
    const emailId = insert.rows[0].id;
    const job = await emailQueue.add(
      "send-email",
      { emailId },
      { jobId: String(emailId), delay: delayMs, removeOnComplete: true, removeOnFail: false }
    );
    await client.query("update emails set job_id = $1 where id = $2", [job.id, emailId]);
    await client.query("commit");
    res.json({ emailId, jobId: job.id, status: "scheduled" });
  } catch (e) {
    await client.query("rollback");
    res.status(500).json({ error: "schedule_failed" });
  } finally {
    client.release();
  }
});

router.get("/scheduled", async (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 50), 100);
  const { rows } = await pool.query(
    `select id, to_email, subject, scheduled_at, status
     from emails
     where status = 'scheduled'
     order by scheduled_at asc
     limit $1`,
    [limit]
  );
  res.json(rows);
});

router.get("/sent", async (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 50), 100);
  const { rows } = await pool.query(
    `select id, to_email, subject, sent_at, status
     from emails
     where status = 'sent'
     order by sent_at desc
     limit $1`,
    [limit]
  );
  res.json(rows);
});

export default router;

