create extension if not exists "uuid-ossp";

create table if not exists users (
  id uuid primary key default uuid_generate_v4(),
  google_id text unique,
  name text not null,
  email text not null unique,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists senders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  from_email text not null,
  from_name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, from_email)
);

do $$
begin
  if not exists (select 1 from pg_type where typname = 'email_status') then
    create type email_status as enum ('scheduled','sending','sent','failed');
  end if;
end$$;

create table if not exists emails (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  sender_id uuid not null references senders(id) on delete cascade,
  to_email text not null,
  subject text not null,
  body text not null,
  scheduled_at timestamptz not null,
  status email_status not null default 'scheduled',
  sent_at timestamptz,
  job_id text unique,
  created_at timestamptz not null default now(),
  check (scheduled_at >= created_at)
);

create table if not exists email_rate_limits (
  sender_id uuid not null references senders(id) on delete cascade,
  hour_window timestamptz not null,
  count integer not null default 0,
  primary key (sender_id, hour_window)
);

create index if not exists idx_emails_user_status_sched on emails (user_id, status, scheduled_at);
create index if not exists idx_emails_sender_status on emails (sender_id, status);
create index if not exists idx_emails_status_scheduled_at on emails (status, scheduled_at) where status = 'scheduled';

insert into users (id, google_id, name, email, avatar_url)
values ('11111111-1111-1111-1111-111111111111', null, 'Demo User', 'demo@reachinbox.test', null)
on conflict (id) do nothing;

insert into senders (id, user_id, from_email, from_name)
values ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'demo-sender@reachinbox.test', 'Demo Sender')
on conflict (user_id, from_email) do nothing;
