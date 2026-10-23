-- =====================================================================
--  Level Up - 23 October 2026 (LAB)
--
--  Practice that learns you. Three tables, all reached only through the
--  "levelup" edge function with the service key:
--
--    levelup_bank      questions Groq has written and a second Groq
--                      call has checked. Shared by everyone, so every
--                      question written gets used again - that is the
--                      cache. A reported question is switched off.
--    levelup_issued    each question handed to a pupil. The right answer
--                      stays here; the page never sees it until they
--                      have answered, so it can't be read off the page.
--    levelup_progress  per pupil: points, XP, what it has learnt about
--                      them, what they own in the shop.
--
--  Pupils can't read or write any of it directly, so points can't be
--  edited from the browser.
-- =====================================================================

create table if not exists public.levelup_bank (
  id        bigserial primary key,
  topic     text not null,
  level     int  not null,
  flavour   text not null,
  item      jsonb not null,            -- {q, options[4], answer, hint, explain}
  made_by   text,                      -- which model wrote it
  reports   int  not null default 0,
  off       boolean not null default false,
  served    int  not null default 0,
  made_at   timestamptz not null default now()
);
create index if not exists levelup_bank_slot on public.levelup_bank (topic, level, flavour) where not off;

create table if not exists public.levelup_issued (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  bank_id     bigint references public.levelup_bank(id) on delete set null,
  task        text not null,
  code        text not null,
  topic       text not null,
  level       int  not null,
  flavour     text not null,
  answer      text not null,
  explain     text,
  hinted      boolean not null default false,
  right_ans   boolean,
  ms          int,
  made_at     timestamptz not null default now(),
  answered_at timestamptz
);
create index if not exists levelup_issued_user on public.levelup_issued (user_id, made_at desc);

create table if not exists public.levelup_progress (
  user_id  uuid primary key,
  pts      int  not null default 0,
  xp       int  not null default 0,
  data     jsonb not null default '{}'::jsonb,
  owned    jsonb not null default '["t-rookie","c-classic","a-rocket"]'::jsonb,
  wear     jsonb not null default '{"title":"t-rookie","theme":"c-classic","badge":"a-rocket"}'::jsonb,
  updated  timestamptz not null default now()
);

alter table public.levelup_bank     enable row level security;
alter table public.levelup_issued   enable row level security;
alter table public.levelup_progress enable row level security;
revoke all on public.levelup_bank, public.levelup_issued, public.levelup_progress from anon, authenticated;
grant  all on public.levelup_bank, public.levelup_issued, public.levelup_progress to service_role;
revoke all on sequence public.levelup_bank_id_seq from anon, authenticated;
grant  usage, select on sequence public.levelup_bank_id_seq to service_role;

-- Old issued rows are only needed for "what have you learnt"; a week is plenty.
delete from public.levelup_issued where made_at < now() - interval '7 days';

select 'level up tables ready: bank ' || (select count(*) from public.levelup_bank)
       || ', pupils ' || (select count(*) from public.levelup_progress);

-- Ask Claude, from the admin panel: what was asked and what came back.
create table if not exists public.ask_claude_log (
  id       bigserial primary key,
  at       timestamptz not null default now(),
  question text not null,
  answer   text
);
alter table public.ask_claude_log enable row level security;
revoke all on public.ask_claude_log from anon, authenticated;
grant  all on public.ask_claude_log to service_role;
revoke all on sequence public.ask_claude_log_id_seq from anon, authenticated;
grant  usage, select on sequence public.ask_claude_log_id_seq to service_role;
select 'ask claude log ready';
