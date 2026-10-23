import { createClient } from "jsr:@supabase/supabase-js@2";

/* =====================================================================
   Times Table Tycoon                                 (LAB, 23 Oct 2026)

   60-second rounds. The server hands out each round's questions, then
   marks the answers when it ends - so coins and cards are decided here,
   never on the page. It learns which facts each pupil is slow at or
   gets wrong and asks those more.

   Cards ("Numlings") are earned by playing: a drop after a good round,
   one for mastering a table, and three legendaries for feats. Coins buy
   a SPECIFIC card at a fixed price. There are deliberately no random
   packs to buy - no loot boxes on a school site.

   Trading is LAB ONLY: on unless this is running on the hosted (real)
   Supabase project, or TT_TRADING says otherwise. Offers are cards and
   coins only - no messages, so there is nothing to moderate - and the
   swap happens in one go inside tt_accept().
   ===================================================================== */

const SUPA_URL = Deno.env.get("SUPABASE_URL") ?? "";
const TRADING = (Deno.env.get("TT_TRADING") ?? (/\.supabase\.co/.test(SUPA_URL) ? "0" : "1")) === "1";

const ROUND_SECS = 60;
const ROUNDS_PER_DAY = 40;
const COINS_PER_DAY = 600;
const DROPS_PER_DAY = 8;
const STARTS_PER_MINUTE = 6;
const OFFERS_PER_DAY = 20;
const OPEN_OFFERS = 5;
const TRADES_PER_DAY = 10;

type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
const CARDS: Record<string, { name: string; table?: number; rarity: Rarity; how: string }> = {
  n2:  { name: "Duplo",     table: 2,  rarity: "common",   how: "Drops from rounds on the 2s" },
  n3:  { name: "Trizzle",   table: 3,  rarity: "uncommon", how: "Drops from rounds on the 3s" },
  n4:  { name: "Quadwick",  table: 4,  rarity: "uncommon", how: "Drops from rounds on the 4s" },
  n5:  { name: "Fivefin",   table: 5,  rarity: "common",   how: "Drops from rounds on the 5s" },
  n6:  { name: "Hexabug",   table: 6,  rarity: "rare",     how: "Drops from rounds on the 6s" },
  n7:  { name: "Septimo",   table: 7,  rarity: "epic",     how: "Drops from rounds on the 7s" },
  n8:  { name: "Octobop",   table: 8,  rarity: "epic",     how: "Drops from rounds on the 8s" },
  n9:  { name: "Ninetail",  table: 9,  rarity: "rare",     how: "Drops from rounds on the 9s" },
  n10: { name: "Tenor",     table: 10, rarity: "common",   how: "Drops from rounds on the 10s" },
  n11: { name: "Elevenzee", table: 11, rarity: "uncommon", how: "Drops from rounds on the 11s" },
  n12: { name: "Dozer",     table: 12, rarity: "rare",     how: "Drops from rounds on the 12s" },
  squarelord:   { name: "Squarelord",   rarity: "legendary", how: "Master every square number, 2×2 to 12×12" },
  speeddemon:   { name: "Speed Demon",  rarity: "legendary", how: "40 or more right in one round" },
  perfectionist:{ name: "Perfectionist",rarity: "legendary", how: "25 or more right in a round with none wrong" },
};
const PRICE: Record<Rarity, number> = { common: 40, uncommon: 70, rare: 120, epic: 200, legendary: 0 };

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "content-type": "application/json" } });
const londonDay = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());
const fk = (a: number, b: number) => `${Math.min(a, b)}x${Math.max(a, b)}`;
const shortName = (n: string) => { const p = String(n || "Player").trim().split(/\s+/); return p.length > 1 ? `${p[0]} ${p[p.length - 1][0]}.` : p[0]; };

type Fact = { n: number; ok: number; ms: number };     // ms = running average
type Data = { day: string; rounds: number; coinsToday: number; drops: number; trades: number; offers: number;
              best: number; mastered: number[]; legends: string[] };
const freshData = (d: Partial<Data>): Data => ({ day: d.day ?? "", rounds: d.rounds ?? 0, coinsToday: d.coinsToday ?? 0,
  drops: d.drops ?? 0, trades: d.trades ?? 0, offers: d.offers ?? 0, best: d.best ?? 0,
  mastered: d.mastered ?? [], legends: d.legends ?? [] });

function factWeight(f?: Fact) {
  if (!f || f.n === 0) return 2.0;                                  // never seen: find out
  const acc = f.ok / f.n;
  return 0.4 + (1 - acc) * 3 + (f.ms > 4000 ? 1.2 : f.ms > 2500 ? 0.5 : 0);
}

function makeQuestions(facts: Record<string, Fact>, focus: string): number[][] {
  const pool: { a: number; b: number; w: number }[] = [];
  const tables = focus === "mixed" ? [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] : [Number(focus)];
  for (const a of tables) for (let b = 2; b <= 12; b++) {
    if (focus === "mixed" && b < a) continue;                       // 7x8 once, not also 8x7
    pool.push({ a, b, w: factWeight(facts[fk(a, b)]) });
  }
  const out: number[][] = []; let last = "";
  const sum = pool.reduce((s, p) => s + p.w, 0);
  while (out.length < 90) {
    let r = Math.random() * sum, pick = pool[0];
    for (const p of pool) { r -= p.w; if (r <= 0) { pick = p; break; } }
    const k = fk(pick.a, pick.b);
    if (k === last && pool.length > 1) continue;
    last = k;
    out.push(Math.random() < 0.5 ? [pick.a, pick.b] : [pick.b, pick.a]);
  }
  return out;
}

function tableSummary(facts: Record<string, Fact>) {
  const out: Record<number, { seen: number; acc: number; ms: number; mastered: boolean }> = {};
  for (let t = 2; t <= 12; t++) {
    let seen = 0, n = 0, ok = 0, ms = 0, all = true;
    for (let b = 2; b <= 12; b++) {
      const f = facts[fk(t, b)];
      if (f && f.n) { seen++; n += f.n; ok += f.ok; ms += f.ms; }
      if (!f || f.n < 2 || f.ok / f.n < 0.9 || f.ms > 3000) all = false;
    }
    out[t] = { seen, acc: n ? Math.round(100 * ok / n) : 0, ms: seen ? Math.round(ms / seen) : 0, mastered: all };
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const db = createClient(SUPA_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const { data: who } = await db.auth.getUser(token);
    const user = who?.user;
    if (!user) return json({ error: "Sign in on the Launchpad first." }, 401);
    const uid = user.id;
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "state");

    const { data: off } = await db.rpc("timed_out", { u: uid, f: "tables" });
    if (off && (action === "start" || action === "offer")) {
      return json({ error: "You've been taken off Times Table Tycoon until midnight for going too fast, three times in an hour." }, 429);
    }

    const { data: row } = await db.from("tt_progress").select("*").eq("user_id", uid).maybeSingle();
    const prog = row ?? { user_id: uid, coins: 0, facts: {}, data: {} };
    const facts: Record<string, Fact> = prog.facts ?? {};
    const d = freshData(prog.data ?? {});
    if (d.day !== londonDay()) Object.assign(d, { day: londonDay(), rounds: 0, coinsToday: 0, drops: 0, trades: 0, offers: 0 });
    const save = () => db.from("tt_progress").upsert({ user_id: uid, coins: prog.coins, facts, data: d, updated: new Date().toISOString() });

    const myCards = async () => (await db.from("tt_cards").select("id,kind,shiny,got_by,got_at").eq("owner", uid).order("got_at")).data ?? [];
    const summary = async () => ({
      coins: prog.coins, best: d.best, roundsLeft: Math.max(0, ROUNDS_PER_DAY - d.rounds),
      tables: tableSummary(facts), facts, cards: await myCards(), catalogue: CARDS, prices: PRICE, trading: TRADING,
    });

    const strike = async () => {
      const ends = await db.rpc("add_strike", { u: uid, f: "tables" }).then((r: any) => r.data, () => null);
      return json({ error: ends ? "Three times too fast this hour - Times Table Tycoon is off for you until midnight."
                                : "Slow down a little!" }, 429);
    };

    if (action === "state") { await save(); return json(await summary()); }

    // ---------------- a round ----------------
    if (action === "start") {
      const { count } = await db.from("tt_rounds").select("id", { count: "exact", head: true })
        .eq("user_id", uid).gte("started", new Date(Date.now() - 60000).toISOString());
      if ((count ?? 0) >= STARTS_PER_MINUTE) return await strike();
      if (d.rounds >= ROUNDS_PER_DAY) return json({ error: `That's ${ROUNDS_PER_DAY} rounds today - brilliant effort. More tomorrow!` }, 429);
      const focus = /^(mixed|[2-9]|1[0-2])$/.test(String(body.focus)) ? String(body.focus) : "mixed";
      const qs = makeQuestions(facts, focus);
      const { data: r, error } = await db.from("tt_rounds").insert({ user_id: uid, focus, questions: qs }).select("id").single();
      if (error) throw error;
      return json({ id: r.id, questions: qs, secs: ROUND_SECS });
    }

    if (action === "finish") {
      const { data: r } = await db.from("tt_rounds").select("*").eq("id", String(body.id)).eq("user_id", uid).maybeSingle();
      if (!r) return json({ error: "Not your round." }, 404);
      if (r.finished) return json({ error: "Already marked." }, 409);
      const elapsed = Date.now() - new Date(r.started).getTime();
      await db.from("tt_rounds").update({ finished: new Date().toISOString() }).eq("id", r.id);

      const answers: { v: number; ms: number }[] = Array.isArray(body.answers) ? body.answers.slice(0, r.questions.length) : [];
      const total = answers.reduce((s, a) => s + (Number(a.ms) || 0), 0);
      // Impossible rounds earn nothing: too short, too long, or answers faster than a person can type.
      const human = elapsed >= (ROUND_SECS - 3) * 1000 && elapsed <= 10 * 60000 &&
                    answers.every((a) => Number(a.ms) >= 250 && Number(a.ms) <= 60000) && total <= elapsed + 3000;
      if (!human) return json({ error: "That round didn't add up, so it wasn't counted.", ...(await summary()) }, 400);

      let right = 0, wrong = 0;
      const missed: string[] = [];
      answers.forEach((a, i) => {
        const [x, y] = r.questions[i];
        const ok = Number(a.v) === x * y;
        const k = fk(x, y);
        const f = facts[k] ?? (facts[k] = { n: 0, ok: 0, ms: 0 });
        f.ms = f.n ? Math.round(f.ms * 0.7 + Number(a.ms) * 0.3) : Number(a.ms);
        f.n++; if (ok) { f.ok++; right++; } else { wrong++; missed.push(`${x} × ${y} = ${x * y}`); }
      });
      d.rounds++;

      const newBest = right > d.best; if (newBest) d.best = right;
      let coins = right + (newBest && right >= 10 ? 10 : 0);
      coins = Math.max(0, Math.min(coins, COINS_PER_DAY - d.coinsToday));
      d.coinsToday += coins; prog.coins += coins;

      const got: { kind: string; shiny: boolean; why: string }[] = [];
      const give = (kind: string, shiny: boolean, why: string) => got.push({ kind, shiny, why });

      // a drop for a good round: the table you practised most this round
      if (right >= 12 && d.drops < DROPS_PER_DAY) {
        const count: Record<number, number> = {};
        answers.forEach((_, i) => { const [x, y] = r.questions[i]; count[x] = (count[x] ?? 0) + 1; count[y] = (count[y] ?? 0) + 1; });
        const tables = Object.entries(count).filter(([t]) => Number(t) >= 2 && Number(t) <= 12).sort((a, b) => b[1] - a[1]);
        const t = r.focus !== "mixed" ? Number(r.focus) : Number(tables[Math.floor(Math.random() * Math.min(3, tables.length))]?.[0] ?? 2);
        d.drops++;
        give(`n${t}`, Math.random() < 0.05, "Drop for a good round");
      }
      // mastering a table: a shiny of that table's Numling, once
      const sum = tableSummary(facts);
      for (let t = 2; t <= 12; t++) if (sum[t].mastered && !d.mastered.includes(t)) {
        d.mastered.push(t); give(`n${t}`, true, `You mastered the ${t} times table!`);
      }
      // legendaries, once each
      const squares = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].every((t) => { const f = facts[fk(t, t)]; return f && f.n >= 2 && f.ok / f.n >= 0.9 && f.ms <= 3000; });
      if (squares && !d.legends.includes("squarelord")) { d.legends.push("squarelord"); give("squarelord", false, "Every square number mastered"); }
      if (right >= 40 && !d.legends.includes("speeddemon")) { d.legends.push("speeddemon"); give("speeddemon", false, "40 in one round!"); }
      if (right >= 25 && wrong === 0 && !d.legends.includes("perfectionist")) { d.legends.push("perfectionist"); give("perfectionist", false, "25+ with none wrong"); }

      if (got.length) await db.from("tt_cards").insert(got.map((g) => ({ owner: uid, kind: g.kind, shiny: g.shiny, got_by: g.why.startsWith("Drop") ? "drop" : "feat" })));
      await save();
      return json({ right, wrong, earned: coins, newBest, missed: missed.slice(0, 8), got, ...(await summary()) });
    }

    // ---------------- shop: a specific card, fixed price ----------------
    if (action === "buy") {
      const kind = String(body.kind); const c = CARDS[kind];
      if (!c || c.rarity === "legendary") return json({ error: "That one can only be earned." }, 400);
      const price = PRICE[c.rarity];
      if (prog.coins < price) return json({ error: "Not enough coins yet." }, 400);
      prog.coins -= price; await save();
      await db.from("tt_cards").insert({ owner: uid, kind, shiny: false, got_by: "shop" });
      return json(await summary());
    }

    // ---------------- trading (lab only) ----------------
    if (["players", "collection", "offer", "offers", "accept", "decline", "cancel"].includes(action) && !TRADING) {
      return json({ error: "Trading isn't switched on here." }, 403);
    }

    if (action === "players") {
      const { data: ps } = await db.from("tt_progress").select("user_id").neq("user_id", uid).limit(500);
      const ids = (ps ?? []).map((p: any) => p.user_id);
      if (!ids.length) return json({ players: [] });
      const { data: prof } = await db.from("profiles").select("id,name,approved").in("id", ids);
      return json({ players: (prof ?? []).filter((p: any) => p.approved !== false).map((p: any) => ({ id: p.id, name: shortName(p.name) }))
                                        .sort((a: any, b: any) => a.name.localeCompare(b.name)) });
    }

    if (action === "collection") {
      const other = String(body.user ?? "");
      const { data: cards } = await db.from("tt_cards").select("id,kind,shiny").eq("owner", other).order("kind");
      return json({ cards: cards ?? [] });
    }

    if (action === "offer") {
      if (d.offers >= OFFERS_PER_DAY) return json({ error: `That's ${OFFERS_PER_DAY} offers today.` }, 429);
      const { count: recent } = await db.from("tt_offers").select("id", { count: "exact", head: true })
        .eq("from_user", uid).gte("made_at", new Date(Date.now() - 60000).toISOString());
      if ((recent ?? 0) >= 6) return await strike();
      const { count: open } = await db.from("tt_offers").select("id", { count: "exact", head: true }).eq("from_user", uid).eq("status", "open");
      if ((open ?? 0) >= OPEN_OFFERS) return json({ error: `You can have ${OPEN_OFFERS} offers waiting at once - cancel one first.` }, 400);

      const to = String(body.to ?? "");
      const give = (Array.isArray(body.give) ? body.give : []).map(Number).filter(Number.isFinite).slice(0, 5);
      const want = (Array.isArray(body.want) ? body.want : []).map(Number).filter(Number.isFinite).slice(0, 5);
      const giveCoins = Math.max(0, Math.min(1000, Math.floor(Number(body.giveCoins) || 0)));
      const wantCoins = Math.max(0, Math.min(1000, Math.floor(Number(body.wantCoins) || 0)));
      if (to === uid) return json({ error: "You can't trade with yourself." }, 400);
      // Both sides must put something in: no asking for things for nothing, no giveaways.
      if ((!give.length && !giveCoins) || (!want.length && !wantCoins)) return json({ error: "A trade needs something on both sides." }, 400);
      const { data: them } = await db.from("profiles").select("id,approved").eq("id", to).maybeSingle();
      if (!them || them.approved === false) return json({ error: "Can't find that player." }, 404);
      const { data: g } = await db.from("tt_cards").select("id").eq("owner", uid).in("id", give.length ? give : [-1]);
      const { data: w } = await db.from("tt_cards").select("id").eq("owner", to).in("id", want.length ? want : [-1]);
      if ((g ?? []).length !== give.length) return json({ error: "Some of those cards aren't yours." }, 400);
      if ((w ?? []).length !== want.length) return json({ error: "They don't have some of those cards any more." }, 400);
      if (prog.coins < giveCoins) return json({ error: "You don't have that many coins." }, 400);
      await db.from("tt_offers").insert({ from_user: uid, to_user: to, give_cards: give, give_coins: giveCoins, want_cards: want, want_coins: wantCoins });
      d.offers++; await save();
      return json({ ok: true });
    }

    if (action === "offers") {
      const since = new Date(Date.now() - 3 * 86400000).toISOString();
      const { data: list } = await db.from("tt_offers").select("*")
        .or(`from_user.eq.${uid},to_user.eq.${uid}`).gte("made_at", since).order("made_at", { ascending: false }).limit(40);
      const people = [...new Set((list ?? []).flatMap((o: any) => [o.from_user, o.to_user]))];
      const cardIds = [...new Set((list ?? []).flatMap((o: any) => [...o.give_cards, ...o.want_cards]))];
      const { data: prof } = people.length ? await db.from("profiles").select("id,name").in("id", people) : { data: [] };
      const { data: cards } = cardIds.length ? await db.from("tt_cards").select("id,kind,shiny").in("id", cardIds) : { data: [] };
      const nm: Record<string, string> = {}; (prof ?? []).forEach((p: any) => nm[p.id] = shortName(p.name));
      const cd: Record<number, any> = {}; (cards ?? []).forEach((c: any) => cd[c.id] = { kind: c.kind, shiny: c.shiny });
      return json({ me: uid, offers: (list ?? []).map((o: any) => ({
        id: o.id, mine: o.from_user === uid, from: nm[o.from_user] ?? "Someone", to: nm[o.to_user] ?? "Someone",
        give: o.give_cards.map((id: number) => ({ id, ...(cd[id] ?? { kind: "?" }) })), giveCoins: o.give_coins,
        want: o.want_cards.map((id: number) => ({ id, ...(cd[id] ?? { kind: "?" }) })), wantCoins: o.want_coins,
        status: o.status, at: o.made_at })) });
    }

    if (action === "accept") {
      if (d.trades >= TRADES_PER_DAY) return json({ error: `That's ${TRADES_PER_DAY} trades today.` }, 429);
      const { data: res, error } = await db.rpc("tt_accept", { offer_id: Number(body.id), accepter: uid });
      if (error) throw error;
      if (res !== "ok") return json({ error: res }, 400);
      d.trades++;
      const { data: fresh } = await db.from("tt_progress").select("coins").eq("user_id", uid).maybeSingle();
      prog.coins = fresh?.coins ?? prog.coins;
      await save();
      return json({ ok: true, ...(await summary()) });
    }

    if (action === "decline" || action === "cancel") {
      const col = action === "decline" ? "to_user" : "from_user";
      await db.from("tt_offers").update({ status: action === "decline" ? "declined" : "cancelled", closed_at: new Date().toISOString() })
        .eq("id", Number(body.id)).eq(col, uid).eq("status", "open");
      return json({ ok: true });
    }

    return json({ error: "Don't know how to do that." }, 400);
  } catch (e) {
    console.error("tables", e instanceof Error ? e.message : String(e));
    return json({ error: "Something went wrong on the server." }, 500);
  }
});
