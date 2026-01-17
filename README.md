# ReachInbox – Full-stack Email Job Scheduler

Production-ready scheduler using Express + TypeScript, BullMQ + Redis (delayed jobs), PostgreSQL, and a Next.js dashboard. Stateless app logic with durable state in Redis/DB. Designed for safe restarts, idempotency, rate limits, and multi-sender support.

## Architecture
- API (Express + TypeScript): auth, email scheduling, lists
- Persistence (PostgreSQL): users, senders, emails, delivery state
- Queue/Worker (BullMQ + Redis): delayed jobs, concurrency, limiter
- Frontend (Next.js + Tailwind): dashboard, compose, senders management
- No cron/timers/in-memory scheduling; only Redis-persisted delayed jobs

## Tech Stack
- Server: Express, TypeScript, BullMQ (ioredis), pg
- Worker: TypeScript, BullMQ, Nodemailer (Ethereal dev)
- Web: Next.js, SWR, Tailwind
- Infra: Docker Compose for Redis + Postgres

## Local Setup
1) Install
```bash
npm install
```
2) Start infrastructure (Docker Desktop required)
```bash
docker compose up -d
```
3) Environment (examples)
Create `server/.env`:
```
DATABASE_URL=postgres://reach:reachpw@localhost:5432/reachinbox
REDIS_URL=redis://localhost:6379
SESSION_SECRET=dev_secret
ETHEREAL_ENABLED=true
DEV_USER_ID=11111111-1111-1111-1111-111111111111
FRONTEND_ORIGIN=http://localhost:3001
```
Create `worker/.env`:
```
DATABASE_URL=postgres://reach:reachpw@localhost:5432/reachinbox
REDIS_URL=redis://localhost:6379
WORKER_CONCURRENCY=5
MAX_EMAILS_PER_HOUR_PER_SENDER=200
ETHEREAL_ENABLED=true
```
4) Run services
```bash
# API
npm run -w server dev
# Worker
npm run -w worker dev
# Frontend
npm run -w web dev
```
Open http://localhost:3001

## Database Schema
- users: id, google_id, name, email, avatar_url, created_at
- senders: id, user_id, from_email, from_name, created_at, unique(user_id, from_email)
- emails: id, user_id, sender_id, to_email, subject, body, scheduled_at, status, sent_at, job_id, created_at
- email_rate_limits: sender_id, hour_window, count
Indexes ensure performance on status/scheduled_at and sender queries. Seed adds a demo user/sender.

## API Overview
- Auth:
  - GET /auth/google
  - GET /auth/google/callback
- Senders:
  - GET /senders
  - POST /senders { fromEmail, fromName }
- Emails:
  - POST /emails/schedule { toEmail, subject, body, senderId, scheduledAt }
  - GET /emails/scheduled
  - GET /emails/sent

## Scheduling & Worker Behavior
- Enqueue delayed job with jobId = email.id (idempotency)
- On processing:
  - Guarded DB update to status = sending
  - Redis hourly rate limit per sender (key rate:{senderId}:{YYYY-MM-DDTHH}, TTL 2h)
  - If exceeded: re-add job delayed to next hour; keep status = scheduled
  - Nodemailer Ethereal send; set status = sent + sent_at
  - On error: status = failed; rely on BullMQ retries
- BullMQ limiter: `{ max:1, duration:2000 }` guarantees ≥2s between sends

## Frontend
- Pages:
  - /login → Google OAuth redirect
  - /dashboard → Scheduled & Sent tabs, “Compose New Email”
  - /senders → Add/list sender identities
- Configure API base:
  - NEXT_PUBLIC_API_URL (defaults to http://localhost:3000)

## Deployment (Vercel + Render)
- Vercel (frontend):
  - NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
- Render (backend web service):
  - Env: DATABASE_URL, REDIS_URL, SESSION_SECRET, FRONTEND_ORIGIN, GOOGLE_CLIENT_ID/SECRET, GOOGLE_REDIRECT_URI
  - Build: `npm run -w server build`
  - Start: `npm run -w server start`
- Render (worker service):
  - Env: DATABASE_URL, REDIS_URL, WORKER_CONCURRENCY, MAX_EMAILS_PER_HOUR_PER_SENDER
  - Build: `npm run -w worker build`
  - Start: `npm run -w worker start`
- Redis:
  - Use Upstash/Redis Cloud; set REDIS_URL (TLS rediss:// if required)
- OAuth:
  - Authorized redirect URI: `https://your-backend.onrender.com/auth/google/callback`
- Cookies:
  - SameSite=None & Secure in production; CORS origin = FRONTEND_ORIGIN

## Security
- .env files excluded via .gitignore
- No secrets in logs; optionally disable Ethereal in production
- Validate input (zod), check sender ownership, use HTTPS in production

## Scripts
```bash
# Typecheck
npm run -w server typecheck
npm run -w worker typecheck
npm run -w web typecheck
# Build
npm run -w server build
npm run -w worker build
npm run -w web build
```

