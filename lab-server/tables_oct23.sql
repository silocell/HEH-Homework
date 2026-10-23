-- =====================================================================
--  Times Table Tycoon - 23 October 2026 (LAB)
--
--  60-second times-table rounds that learn which facts you're slow at,
--  creatures to collect ("Numlings"), coins, and - lab only - trading.
--  Everything goes through the "tables" edge function with the service
--  key; pupils can't read or write these tables directly, so nobody can
--  give themselves cards or coins.
-- =====================================================================

create table if not exists public.tt_progress (
  user_id uuid primary key,
  coins   int  not null default 0,
  facts   jsonb not null default '{}'::jsonb,   -- "7x8": {n, ok, ms}
  data    jsonb not null default '{}'::jsonb,   -- best, rounds today, unlocks
  updated timestamptz not null default now()
);

create table if not exists public.tt_rounds (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null,
  focus     text not null,                      -- "mixed" or "7"
  questions jsonb not null,                     -- [[a,b], ...]
  started   timestamptz not null default now(),
  finished  timestamptz
);
create index if not exists tt_rounds_user on public.tt_rounds (user_id, started desc);

create table if not exists public.tt_cards (
  id       bigserial primary key,
  owner    uuid not null,
  kind     text not null,                       -- "n7", "squarelord", ...
  shiny    boolean not null default false,
  got_by   text not null,                       -- drop, mastery, shop, trade
  got_at   timestamptz not null default now()
);
create index if not exists tt_cards_owner on public.tt_cards (owner);

-- Trading (lab only). An offer is: these cards (+ coins) of mine for those
-- cards (+ coins) of yours. Nothing moves until the other person accepts,
-- and then it all moves at once, inside tt_accept().
create table if not exists public.tt_offers (
  id         bigserial primary key,
  from_user  uuid not null,
  to_user    uuid not null,
  give_cards bigint[] not null default '{}',
  give_coins int not null default 0,
  want_cards bigint[] not null default '{}',
  want_coins int not null default 0,
  status     text not null default 'open',      -- open, done, declined, cancelled, failed
  made_at    timestamptz not null default now(),
  closed_at  timestamptz,
  check (from_user <> to_user),
  check (give_coins >= 0 and want_coins >= 0)
);
create index if not exists tt_offers_to   on public.tt_offers (to_user, status);
create index if not exists tt_offers_from on public.tt_offers (from_user, status);

alter table public.tt_progress enable row level security;
alter table public.tt_rounds   enable row level security;
alter table public.tt_cards    enable row level security;
alter table public.tt_offers   enable row level security;
revoke all on public.tt_progress, public.tt_rounds, public.tt_cards, public.tt_offers from anon, authenticated;
grant  all on public.tt_progress, public.tt_rounds, public.tt_cards, public.tt_offers to service_role;
revoke all on sequence public.tt_cards_id_seq, public.tt_offers_id_seq from anon, authenticated;
grant  usage, select on sequence public.tt_cards_id_seq, public.tt_offers_id_seq to service_role;

/* The swap. Locks both people's rows, checks every card is still owned by
   the right person and every coin is still there, then moves it all. If
   anything has changed since the offer was made, nothing moves and the
   offer is marked failed - so a card can't be traded twice. */
create or replace function public.tt_accept(offer_id bigint, accepter uuid)
returns text language plpgsql security definer set search_path = public as $$
declare o public.tt_offers; a_coins int; b_coins int; n int;
begin
  select * into o from public.tt_offers where id = offer_id for update;
  if not found then return 'no such offer'; end if;
  if o.status <> 'open' then return 'that offer is closed'; end if;
  if o.to_user <> accepter then return 'that offer is not for you'; end if;

  -- lock both players' coin rows in a fixed order, so two trades can't deadlock
  perform 1 from public.tt_progress where user_id in (o.from_user, o.to_user) order by user_id for update;
  select coins into a_coins from public.tt_progress where user_id = o.from_user;
  select coins into b_coins from public.tt_progress where user_id = o.to_user;

  select count(*) into n from public.tt_cards where id = any(o.give_cards) and owner = o.from_user;
  if n <> coalesce(array_length(o.give_cards, 1), 0) then
    update public.tt_offers set status = 'failed', closed_at = now() where id = o.id;
    return 'they no longer have those cards';
  end if;
  select count(*) into n from public.tt_cards where id = any(o.want_cards) and owner = o.to_user;
  if n <> coalesce(array_length(o.want_cards, 1), 0) then
    update public.tt_offers set status = 'failed', closed_at = now() where id = o.id;
    return 'you no longer have those cards';
  end if;
  if coalesce(a_coins, 0) < o.give_coins then
    update public.tt_offers set status = 'failed', closed_at = now() where id = o.id;
    return 'they no longer have the coins';
  end if;
  if coalesce(b_coins, 0) < o.want_coins then return 'you don''t have enough coins'; end if;

  update public.tt_cards set owner = o.to_user,   got_by = 'trade', got_at = now() where id = any(o.give_cards);
  update public.tt_cards set owner = o.from_user, got_by = 'trade', got_at = now() where id = any(o.want_cards);
  update public.tt_progress set coins = coins - o.give_coins + o.want_coins where user_id = o.from_user;
  update public.tt_progress set coins = coins + o.give_coins - o.want_coins where user_id = o.to_user;
  update public.tt_offers set status = 'done', closed_at = now() where id = o.id;

  -- any other open offer that used these cards can no longer happen
  update public.tt_offers set status = 'failed', closed_at = now()
   where status = 'open' and id <> o.id
     and (give_cards && (o.give_cards || o.want_cards) or want_cards && (o.give_cards || o.want_cards));
  return 'ok';
end $$;
revoke all on function public.tt_accept(bigint, uuid) from public, anon, authenticated;
grant execute on function public.tt_accept(bigint, uuid) to service_role;

-- Prove the swap before trusting it, with two made-up players.
do $$
declare a uuid := '00000000-0000-0000-0000-0000000000a1'; b uuid := '00000000-0000-0000-0000-0000000000b2';
        ca bigint; cb bigint; oid bigint; r text;
begin
  insert into public.tt_progress (user_id, coins) values (a, 50), (b, 10) on conflict (user_id) do update set coins = excluded.coins;
  insert into public.tt_cards (owner, kind, got_by) values (a, 'n7', 'test') returning id into ca;
  insert into public.tt_cards (owner, kind, got_by) values (b, 'n9', 'test') returning id into cb;
  insert into public.tt_offers (from_user, to_user, give_cards, give_coins, want_cards) values (a, b, array[ca], 20, array[cb]) returning id into oid;
  r := public.tt_accept(oid, a);  raise notice 'accept by the wrong person -> %', r;
  r := public.tt_accept(oid, b);  raise notice 'accept -> %', r;
  raise notice 'cards swapped: %', (select owner = b from public.tt_cards where id = ca) and (select owner = a from public.tt_cards where id = cb);
  raise notice 'coins now a=% b=% (expect 30 and 30)', (select coins from public.tt_progress where user_id = a), (select coins from public.tt_progress where user_id = b);
  r := public.tt_accept(oid, b);  raise notice 'accept twice -> %', r;
  delete from public.tt_offers where from_user in (a, b);
  delete from public.tt_cards where owner in (a, b);
  delete from public.tt_progress where user_id in (a, b);
end $$;

select 'times table tycoon ready';
