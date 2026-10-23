-- =====================================================================
--  Three strikes - 23 October 2026
--
--  Hitting a per-minute limit once is a pupil in a hurry. Hitting it
--  three times in an hour is somebody leaning on the button. The third
--  time, that feature is switched off for them until midnight, and they
--  show up in "Worth a look" so Shiv can decide whether it is a quiet
--  word or something more. It lifts by itself; Shiv can lift it early.
--
--  Only the service key can touch any of this. Pupils cannot read who
--  has strikes, cannot clear their own, and cannot add them to others.
-- =====================================================================

create table if not exists public.strikes (
  id      bigserial primary key,
  user_id uuid        not null,
  fn      text        not null,
  at      timestamptz not null default now()
);
create index if not exists strikes_recent on public.strikes (user_id, fn, at desc);

create table if not exists public.strike_timeouts (
  user_id uuid        not null,
  fn      text        not null,
  until   timestamptz not null,
  strikes int         not null default 3,
  made_at timestamptz not null default now(),
  primary key (user_id, fn)
);

alter table public.strikes  enable row level security;
alter table public.strike_timeouts enable row level security;
-- No policies: with RLS on and none written, anon and authenticated
-- get nothing. Supabase grants new tables to them by default until
-- 30 October 2026, so take that away explicitly as well.
revoke all on public.strikes, public.strike_timeouts from anon, authenticated;
grant  all on public.strikes, public.strike_timeouts to service_role;
revoke all on sequence public.strikes_id_seq from anon, authenticated;
grant  usage, select on sequence public.strikes_id_seq to service_role;

-- Midnight tonight, school time - not UTC, or a strike at 23:30 in
-- summer would lift at 01:00 and one at 00:30 would last a whole day.
create or replace function public.next_midnight_london()
returns timestamptz language sql stable as $$
  select (date_trunc('day', now() at time zone 'Europe/London') + interval '1 day')
         at time zone 'Europe/London';
$$;

-- Records a strike. Hands back when the timeout ends if this one was
-- the third in an hour, otherwise NULL. Old strikes are swept as it
-- goes, so the table cannot grow for ever.
create or replace function public.add_strike(u uuid, f text)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare n int; ends timestamptz;
begin
  delete from public.strikes where at < now() - interval '1 day';
  -- One strike per minute at most. Leaning on the button for one
  -- minute is ONE strike, however many presses it was - three strikes
  -- means coming back and doing it again, three separate times.
  if not exists (select 1 from public.strikes
                  where user_id = u and fn = f and at > now() - interval '1 minute') then
    insert into public.strikes (user_id, fn) values (u, f);
  end if;
  select count(*) into n from public.strikes
   where user_id = u and fn = f and at > now() - interval '1 hour';
  if n >= 3 then
    ends := public.next_midnight_london();
    insert into public.strike_timeouts (user_id, fn, until, strikes)
    values (u, f, ends, n)
    on conflict (user_id, fn) do update
      set until = excluded.until, strikes = excluded.strikes, made_at = now();
    return ends;
  end if;
  return null;
end $$;

-- When this person's timeout for this feature ends, or NULL if none.
create or replace function public.timed_out(u uuid, f text)
returns timestamptz language sql stable security definer set search_path = public as $$
  select until from public.strike_timeouts where user_id = u and fn = f and until > now();
$$;

revoke all on function public.next_midnight_london()   from public, anon, authenticated;
revoke all on function public.add_strike(uuid, text)    from public, anon, authenticated;
revoke all on function public.timed_out(uuid, text)     from public, anon, authenticated;
grant execute on function public.next_midnight_london() to service_role;
grant execute on function public.add_strike(uuid, text) to service_role;
grant execute on function public.timed_out(uuid, text)  to service_role;

-- Prove it before trusting it, with a made-up account.
-- Hammering inside one minute: still one strike, no timeout.
select 'same minute, 5 presses -> ' || coalesce(max(r)::text, 'no timeout') from (
  select public.add_strike('00000000-0000-0000-0000-0000000000fe','test') r from generate_series(1,5)) t;
select 'strikes recorded: ' || count(*) from public.strikes where user_id = '00000000-0000-0000-0000-0000000000fe';
-- Three separate minutes: back-date two strikes, then the third.
update public.strikes set at = now() - interval '20 minutes' where user_id = '00000000-0000-0000-0000-0000000000fe';
insert into public.strikes (user_id, fn, at) values ('00000000-0000-0000-0000-0000000000fe','test', now() - interval '10 minutes');
select 'third separate time -> ' || coalesce(public.add_strike('00000000-0000-0000-0000-0000000000fe','test')::text, 'no timeout');
select 'timed out now? ' || (public.timed_out('00000000-0000-0000-0000-0000000000fe','test') is not null)::text;

delete from public.strikes  where user_id = '00000000-0000-0000-0000-0000000000fe';
delete from public.strike_timeouts where user_id = '00000000-0000-0000-0000-0000000000fe';
