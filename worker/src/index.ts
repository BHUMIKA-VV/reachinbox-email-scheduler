import dotenv from "dotenv";
dotenv.config();
import { Worker, Queue } from "bullmq";
import { createTransport, createTestAccount, getTestMessageUrl } from "nodemailer";
import Redis from "ioredis";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const redis = new Redis(String(process.env.REDIS_URL), {
  lazyConnect: true,
  retryStrategy: (times) => Math.min(times * 500, 5000)
});

const emailQueue = new Queue("email-queue", { connection: redis });

const worker = new Worker(
  "email-queue",
  async job => {
    const emailId: string = job.data.emailId;
    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        "select id, sender_id, to_email, subject, body, status from emails where id = $1",
        [emailId]
      );
      if (rows.length === 0) return;
      const email = rows[0];
      if (email.status === "sent") return;

      const updated = await client.query(
        "update emails set status = 'sending' where id = $1 and status in ('scheduled','failed')",
        [emailId]
      );
      if (updated.rowCount === 0) return;

      const limit = Number(process.env.MAX_EMAILS_PER_HOUR_PER_SENDER ?? 200);
      const now = new Date();
      const hourKey = `rate:${email.sender_id}:${now.getUTCFullYear()}-${String(
        now.getUTCMonth() + 1
      ).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}T${String(
        now.getUTCHours()
      ).padStart(2, "0")}`;
      const count = await redis.incr(hourKey);
      if (count === 1) await redis.expire(hourKey, 60 * 60 * 2);

      if (count > limit) {
        const next = new Date(
          Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate(),
            now.getUTCHours() + 1
          )
        );
        const delayMs = next.getTime() - now.getTime();
        await emailQueue.add("send-email", { emailId }, { jobId: String(emailId), delay: delayMs, removeOnComplete: true });
        await client.query("update emails set status = 'scheduled' where id = $1", [emailId]);
        return;
      }

      const account = await createTestAccount();
      const transporter = createTransport({
        host: account.smtp.host,
        port: account.smtp.port,
        secure: account.smtp.secure,
        auth: { user: account.user, pass: account.pass }
      });
      const info = await transporter.sendMail({
        from: "ReachInbox <no-reply@reachinbox.test>",
        to: email.to_email,
        subject: email.subject,
        text: email.body
      });
      const sentAt = new Date();
      await client.query("update emails set status = 'sent', sent_at = $2 where id = $1", [emailId, sentAt.toISOString()]);
      if (process.env.ETHEREAL_ENABLED === "true") {
        const url = getTestMessageUrl(info);
        if (url) console.log(url);
      }
    } catch (e) {
      await client.query("update emails set status = 'failed' where id = $1", [emailId]);
      throw e;
    } finally {
      client.release();
    }
  },
  {
    connection: redis,
    concurrency: Number(process.env.WORKER_CONCURRENCY ?? 5),
    limiter: { max: 1, duration: 2000 }
  }
);
