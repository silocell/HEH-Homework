-- =====================================================================
--  Lab experiments - 23 October 2026.  LAB SERVER ONLY.
--
--  One row per experiment: whether it is switched on for the lab's
--  testers, and Shiv's verdict on it - still trying, keep it for the
--  real site, or bin it - with a note on why.
--
--  Signed-in lab pupils may READ the switches (the page has to know
--  what to show). Only the admin function, with the service key, may
--  change them. Nobody signed out sees anything.
-- =====================================================================
create table if not exists public.lab_flags (
  key        text primary key,
  on_now     boolean     not null default false,
  verdict    text        not null default 'trying' check (verdict in ('trying','keep','bin')),
  note       text        not null default '',
  changed_at timestamptz not null default now()
);
alter table public.lab_flags enable row level security;
drop policy if exists "signed in can read lab flags" on public.lab_flags;
create policy "signed in can read lab flags" on public.lab_flags
  for select to authenticated using (true);
revoke all on public.lab_flags from anon, authenticated;
grant select on public.lab_flags to authenticated;
grant all on public.lab_flags to service_role;

insert into public.lab_flags (key) values ('focus'), ('streak'), ('cheer'), ('warmup')
  on conflict (key) do nothing;

select 'lab_flags ready: ' || count(*) || ' experiments' from public.lab_flags;
