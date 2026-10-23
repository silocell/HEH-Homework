-- =====================================================================
--  Claude allowance - 23 October 2026 (LAB)
--  Every call to Claude (Level Up questions, Ask Claude) takes one from
--  today's and this month's allowance first. When either is used up the
--  answer is "no", and the functions use Groq instead. Counted here, in
--  one place, so it holds however many requests arrive at once.
-- =====================================================================
create table if not exists public.claude_calls (
  day date primary key,
  n   int not null default 0
);
alter table public.claude_calls enable row level security;
revoke all on public.claude_calls from anon, authenticated;
grant  all on public.claude_calls to service_role;

create or replace function public.claude_take(per_day int, per_month int)
returns boolean language plpgsql security definer set search_path = public as $$
declare today date := (now() at time zone 'Europe/London')::date;
        d int; m int;
begin
  insert into public.claude_calls (day, n) values (today, 0) on conflict (day) do nothing;
  select n into d from public.claude_calls where day = today for update;
  select coalesce(sum(n), 0) into m from public.claude_calls where day >= date_trunc('month', today)::date;
  if d >= per_day or m >= per_month then return false; end if;
  update public.claude_calls set n = n + 1 where day = today;
  return true;
end $$;
revoke all on function public.claude_take(int, int) from public, anon, authenticated;
grant execute on function public.claude_take(int, int) to service_role;

select 'claude allowance ready: used today ' ||
  coalesce((select n from public.claude_calls where day = (now() at time zone 'Europe/London')::date), 0);
