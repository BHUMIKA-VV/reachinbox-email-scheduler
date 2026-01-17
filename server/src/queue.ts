import { Queue } from "bullmq";
import Redis from "ioredis";

const redis = new Redis(String(process.env.REDIS_URL), {
  lazyConnect: true,
  retryStrategy: (times) => Math.min(times * 500, 5000)
});

export const emailQueue = new Queue("email-queue", {
  connection: redis
});
