import { createClient } from "jsr:@supabase/supabase-js@2";

/* =====================================================================
   Level Up - practice that learns you.        (LAB, 23 October 2026)

   Who does what:
     Claude Haiku   writes new questions, four at a time, aimed at the
                    topic, level and kind of question this pupil needs.
     Groq           answers each new question itself, without being told
                    the answer. Only questions where the two agree are
                    kept - two different AIs marking each other catch
                    far more slips than one marking its own work.
                    Groq also writes "explain it to me" help after a
                    wrong answer, saved so it is only ever written once.
   If only one key is set, that service does both jobs.

   Every checked question goes into levelup_bank and is reused for
   everyone, so the AI is only asked when the bank runs short for this
   pupil - plus now and then anyway, to keep it fresh.

   The right answer never leaves the server until the pupil has
   answered. Points are worked out here, not on the page.

   Keys come from the server's environment: ANTHROPIC_API_KEY and
   GROQ_API_KEY. Never in the page, never in chat.
   ===================================================================== */

const HAIKU = "claude-haiku-5-5";
const GROQ_MODELS = ["openai/gpt-oss-120b", "llama-3.3-70b-versatile"];

/* Claude costs money; Groq (free plan) doesn't. So Claude has a hard
   allowance, counted in the database across everything that uses it.
   When it's used up, Groq writes the questions instead - nobody sees
   an error, and the bill can't creep. Change with CLAUDE_PER_DAY and
   CLAUDE_PER_MONTH on the server. */
const CLAUDE_PER_DAY   = Number(Deno.env.get("CLAUDE_PER_DAY")   ?? "60");
const CLAUDE_PER_MONTH = Number(Deno.env.get("CLAUDE_PER_MONTH") ?? "800");

const PER_MINUTE = 20;           // questions asked for, per pupil per minute
const GEN_PER_PUPIL_DAY = 15;    // fresh batches one pupil can cause a day
const GEN_ALL_DAY = 400;         // fresh batches for the whole lab a day
const EXPLAIN_PER_PUPIL_DAY = 30;
const TASK_LEN = 5;

type Topic = { name: string; subject: "maths" | "english" | "science"; guide: string };
const TOPICS: Record<string, Topic> = {
  times:      { subject:"maths", name:"Mental maths", guide:"times tables, multiplying and dividing in your head" },
  place:      { subject:"maths", name:"Place value and rounding", guide:"place value, rounding to the nearest 10/100/1000 and decimal places" },
  negatives:  { subject:"maths", name:"Negative numbers", guide:"adding, subtracting, ordering negatives, temperatures" },
  fractions:  { subject:"maths", name:"Fractions", guide:"equivalent fractions, simplifying, fractions of amounts, adding fractions" },
  decimals:   { subject:"maths", name:"Decimals", guide:"ordering, adding and multiplying decimals" },
  percent:    { subject:"maths", name:"Percentages", guide:"percentages of amounts, converting fractions/decimals/percentages" },
  ratio:      { subject:"maths", name:"Ratio", guide:"simplifying ratios, sharing in a ratio" },
  bidmas:     { subject:"maths", name:"Order of operations", guide:"BIDMAS/BODMAS with brackets and powers" },
  algebra:    { subject:"maths", name:"Algebra basics", guide:"substitution, simplifying expressions, one-step and two-step equations" },
  sequences:  { subject:"maths", name:"Sequences", guide:"term-to-term rules, next terms, simple nth term" },
  angles:     { subject:"maths", name:"Angles", guide:"angles on a line, around a point, in a triangle, types of angle" },
  area:       { subject:"maths", name:"Area and perimeter", guide:"rectangles, triangles, compound shapes, units" },
  probability:{ subject:"maths", name:"Probability", guide:"probability scale, simple probabilities as fractions" },
  spelling:   { subject:"english", name:"Spelling", guide:"commonly misspelt words, which spelling is correct" },
  homophones: { subject:"english", name:"Homophones", guide:"there/their/they're, your/you're, to/too/two, affect/effect and similar" },
  apostrophes:{ subject:"english", name:"Apostrophes", guide:"possession and contraction, its/it's" },
  punctuation:{ subject:"english", name:"Punctuation", guide:"commas, full stops, speech marks, question marks, colons" },
  wordclass:  { subject:"english", name:"Word classes", guide:"nouns, verbs, adjectives, adverbs, pronouns, prepositions" },
  figurative: { subject:"english", name:"Figurative language", guide:"simile, metaphor, personification, alliteration, onomatopoeia" },
  vocab:      { subject:"english", name:"Vocabulary", guide:"meanings of words, synonyms and antonyms" },
  cells:      { subject:"science", name:"Cells", guide:"animal and plant cells, organelles and their jobs, microscopes" },
  particles:  { subject:"science", name:"Particles", guide:"solids, liquids, gases, changes of state, diffusion" },
  forces:     { subject:"science", name:"Forces", guide:"pushes and pulls, newtons, friction, balanced and unbalanced forces" },
  energy:     { subject:"science", name:"Energy", guide:"energy stores and transfers, food energy, fuels" },
  mixtures:   { subject:"science", name:"Mixtures and separating", guide:"filtering, evaporation, distillation, chromatography, dissolving" },
};
const LEVELS = [
  "", "very gentle - the start of Year 7",
  "early Year 7", "solid Year 7", "the end of Year 7, a stretch", "a challenge - Year 8 level",
];
const FLAVOURS: Record<string, string> = {
  plain:  "short and straightforward - just the question",
  story:  "set in a short everyday situation (a shop, a football match, a school trip, a video game) in one or two sentences",
  puzzle: "framed as a puzzle or as 'spot the mistake' (e.g. someone's working with an error in it)",
};

const SHOP = [
  { id:"t-rookie",  kind:"title", name:"Rookie", cost:0 },
  { id:"t-number",  kind:"title", name:"Number Ninja", cost:150 },
  { id:"t-word",    kind:"title", name:"Word Wizard", cost:150 },
  { id:"t-science", kind:"title", name:"Science Spark", cost:150 },
  { id:"t-brain",   kind:"title", name:"Brainbox", cost:400 },
  { id:"t-legend",  kind:"title", name:"Launchpad Legend", cost:800 },
  { id:"c-classic", kind:"theme", name:"Classic", cost:0 },
  { id:"c-ocean",   kind:"theme", name:"Ocean", cost:120 },
  { id:"c-sunset",  kind:"theme", name:"Sunset", cost:120 },
  { id:"c-forest",  kind:"theme", name:"Forest", cost:200 },
  { id:"c-galaxy",  kind:"theme", name:"Galaxy", cost:350 },
  { id:"a-rocket",  kind:"badge", name:"Rocket", cost:0 },
  { id:"a-star",    kind:"badge", name:"Star", cost:80 },
  { id:"a-bolt",    kind:"badge", name:"Lightning", cost:120 },
  { id:"a-owl",     kind:"badge", name:"Owl", cost:200 },
  { id:"a-crown",   kind:"badge", name:"Crown", cost:300 },
  { id:"a-dragon",  kind:"badge", name:"Dragon", cost:500 },
];

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "content-type": "application/json" } });
}

function londonDay(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());
}
function levelFromXp(xp: number) {
  // Level n needs 100 * n(n-1)/2 XP: 0, 100, 300, 600, 1000...
  let n = 1; while (100 * n * (n + 1) / 2 <= xp) n++;
  const from = 100 * n * (n - 1) / 2, to = 100 * n * (n + 1) / 2;
  return { level: n, into: xp - from, need: to - from };
}

// ---------- what it knows about a pupil ----------
type TStat = { n: number; ok: number; recent: number[]; lvl: number; run: number; miss: number; ms: number[] };
type Data = {
  topics: Record<string, TStat>;
  flav: Record<string, { n: number; ok: number }>;
  hints: { n: number; used: number };
  subjects: string[];
  day: string;
  tasks: Array<{ key: string; name: string; topic: string; bump: number; done: number; right: number; bonus: boolean }>;
  streak: number; best: number; last: string;
  gen: { day: string; n: number; ex: number };
};
function fresh(d: Partial<Data>): Data {
  return {
    topics: d.topics ?? {}, flav: d.flav ?? { plain:{n:0,ok:0}, story:{n:0,ok:0}, puzzle:{n:0,ok:0} },
    hints: d.hints ?? { n:0, used:0 }, subjects: d.subjects ?? ["maths", "english", "science"],
    day: d.day ?? "", tasks: d.tasks ?? [], streak: d.streak ?? 0, best: d.best ?? 0, last: d.last ?? "",
    gen: d.gen ?? { day:"", n:0, ex:0 },
  };
}
const stat = (d: Data, k: string): TStat => d.topics[k] ??= { n:0, ok:0, recent:[], lvl:2, run:0, miss:0, ms:[] };
const acc = (t?: TStat) => t && t.recent.length ? t.recent.reduce((a, b) => a + b, 0) / t.recent.length : 0.5;
const pickOf = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

function pool(d: Data) {
  const ks = Object.keys(TOPICS).filter((k) => d.subjects.includes(TOPICS[k].subject));
  return ks.length ? ks : Object.keys(TOPICS);
}

/* Today's three tasks, Sparx-fashion: one to warm up on something you're
   good at, one aimed squarely at your weakest topic, and one a level
   above where you are. After that, Free practice goes on for ever. */
function planDay(d: Data) {
  const today = londonDay();
  if (d.day === today && d.tasks.length) return;
  d.day = today;
  const ks = pool(d);
  const tried = ks.filter((k) => (d.topics[k]?.n ?? 0) >= 3);
  const byAcc = [...tried].sort((a, b) => acc(d.topics[b]) - acc(d.topics[a]));
  const warm = byAcc[0] ?? pickOf(ks);
  const untried = ks.filter((k) => !tried.includes(k) && k !== warm);
  const target = byAcc.length >= 2 ? byAcc[byAcc.length - 1] : (pickOf(untried) ?? pickOf(ks));
  const rest = ks.filter((k) => k !== warm && k !== target);
  const challenge = pickOf(rest.length ? rest : ks);
  d.tasks = [
    { key:"warm",      name:"Warm-up",   topic:warm,      bump:0, done:0, right:0, bonus:false },
    { key:"target",    name:"Target",    topic:target,    bump:0, done:0, right:0, bonus:false },
    { key:"challenge", name:"Challenge", topic:challenge, bump:1, done:0, right:0, bonus:false },
  ];
}

/* Its idea of your style: which kind of question you do best on. It
   mostly gives you that kind, but keeps trying the others now and then
   so it can change its mind. */
function pickFlavour(d: Data): string {
  const ks = Object.keys(FLAVOURS);
  if (Math.random() < 0.3) return pickOf(ks);
  let best = "plain", bestScore = -1;
  for (const k of ks) {
    const f = d.flav[k] ?? { n:0, ok:0 };
    const s = (f.ok + 1) / (f.n + 2);
    if (s > bestScore) { bestScore = s; best = k; }
  }
  return best;
}

function freePick(d: Data): string {
  const ks = pool(d).filter((k) => k !== d.last);
  const w = ks.map((k) => { const t = d.topics[k]; return !t || t.n < 2 ? 1.5 : 0.35 + (1 - acc(t)) * 2.2; });
  let r = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < ks.length; i++) { r -= w[i]; if (r <= 0) return ks[i]; }
  return ks[0];
}

function insights(d: Data): string[] {
  const out: string[] = [];
  const tried = Object.keys(d.topics).filter((k) => d.topics[k].n >= 3 && TOPICS[k]);
  if (tried.length < 2) return ["Answer a few more and it will start to learn what you're good at."];
  tried.sort((a, b) => acc(d.topics[b]) - acc(d.topics[a]) || d.topics[b].lvl - d.topics[a].lvl);
  out.push(`Strongest: ${TOPICS[tried[0]].name} (level ${d.topics[tried[0]].lvl}).`);
  const weakest = tried[tried.length - 1];
  out.push(acc(d.topics[weakest]) < 0.8 ? `Working on: ${TOPICS[weakest].name}.`
                                         : "Nothing weak so far - it'll keep pushing your levels up.");
  const all = tried.flatMap((k) => d.topics[k].ms).sort((a, b) => a - b);
  if (all.length >= 6) {
    const med = all[Math.floor(all.length / 2)];
    out.push(med < 9000 ? "You're quick - it'll slip in more careful-reading questions."
                        : "You take your time - it'll give you more steps to work through.");
  }
  const f = Object.entries(d.flav).filter(([, v]) => v.n >= 4)
    .sort((a, b) => b[1].ok / b[1].n - a[1].ok / a[1].n);
  if (f.length >= 2) {
    const say: Record<string, string> = { plain:"straight questions", story:"real-life story questions", puzzle:"puzzles and spot-the-mistake" };
    out.push(`You do best with ${say[f[0][0]]}, so you'll get more of those.`);
  }
  if (d.hints.n >= 8 && d.hints.used / d.hints.n > 0.4) out.push("You use hints a lot - try one without first, the points are double.");
  return out;
}

// ---------- the two AIs ----------
function firstJson(text: string): any {
  const a = text.indexOf("{"), b = text.lastIndexOf("}");
  if (a < 0 || b <= a) throw new Error("no JSON");
  return JSON.parse(text.slice(a, b + 1));
}

/* A key made outside any workspace needs telling which workspace to use. */
function claudeHeaders(key: string): Record<string, string> {
  const h: Record<string, string> = { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" };
  const ws = Deno.env.get("ANTHROPIC_WORKSPACE_ID");
  if (ws) h["anthropic-workspace-id"] = ws;
  return h;
}
let claudeDownUntil = 0;   // after a failure, give Claude five minutes off

// deno-lint-ignore no-explicit-any
let db: any = null;        // set per request, for the allowance counter
async function claudeAllowed(): Promise<boolean> {
  if (!db) return false;
  try {
    const { data, error } = await db.rpc("claude_take", { per_day: CLAUDE_PER_DAY, per_month: CLAUDE_PER_MONTH });
    if (error) { console.error("claude_take", error.message); return false; }   // can't count = don't spend
    return data === true;
  } catch { return false; }
}

async function askClaude(system: string, user: string, maxTokens: number): Promise<{ text: string; by: string }> {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) throw new Error("no anthropic key");
  if (Date.now() < claudeDownUntil) throw new Error("claude resting");
  if (!(await claudeAllowed())) throw new Error("claude allowance used up");
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: claudeHeaders(key),
    body: JSON.stringify({ model: HAIKU, max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] }),
    signal: AbortSignal.timeout(30000),
  });
  if (!r.ok) {
    console.error("claude", r.status, (await r.text()).slice(0, 300));
    if (r.status === 400 || r.status === 401 || r.status === 403 || r.status === 429 || r.status >= 500) claudeDownUntil = Date.now() + 5 * 60000;
    throw new Error("claude " + r.status);
  }
  const j = await r.json();
  return { text: (j.content ?? []).map((c: any) => c.text ?? "").join(""), by: HAIKU };
}

/* Two Groq accounts: GROQ_API_KEY first, GROQ_API_KEY_2 only when the
   first says it's out (429) or fails. Remembered for ten minutes, so a
   worn-out key isn't knocked on again for every single question. */
const groqKeys = () => [Deno.env.get("GROQ_API_KEY"), Deno.env.get("GROQ_API_KEY_2")].filter(Boolean) as string[];
const restingUntil: Record<number, number> = {};

async function askGroq(system: string, user: string, maxTokens: number, wantJson: boolean): Promise<{ text: string; by: string }> {
  const keys = groqKeys();
  if (!keys.length) throw new Error("no groq key");
  const order = keys.map((_, i) => i).sort((a, b) => (restingUntil[a] ?? 0) - (restingUntil[b] ?? 0));
  for (const ki of order) {
    for (const model of GROQ_MODELS) {
      try {
        const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Authorization": `Bearer ${keys[ki]}`, "content-type": "application/json" },
          body: JSON.stringify({
            model, max_tokens: maxTokens, temperature: 0.4,
            messages: [{ role: "system", content: system }, { role: "user", content: user }],
            ...(wantJson ? { response_format: { type: "json_object" } } : {}),
            ...(model.startsWith("openai/gpt-oss") ? { reasoning_effort: "medium" } : {}),
          }),
          signal: AbortSignal.timeout(30000),
        });
        if (r.status === 429 || r.status === 401) {
          console.error("groq key", ki + 1, r.status, "- trying the other key");
          restingUntil[ki] = Date.now() + 10 * 60000;
          break;                                   // next key, not next model
        }
        if (!r.ok) { console.error("groq", ki + 1, model, r.status, (await r.text()).slice(0, 300)); continue; }
        const j = await r.json();
        return { text: j.choices?.[0]?.message?.content ?? "", by: model + (ki ? " (key 2)" : "") };
      } catch (e) { console.error("groq", ki + 1, model, e instanceof Error ? e.message : String(e)); }
    }
  }
  throw new Error("groq failed");
}

const haveClaude = () => !!Deno.env.get("ANTHROPIC_API_KEY");
const haveGroq = () => groqKeys().length > 0;

const WRITER_SYSTEM =
  "You write multiple-choice practice questions for UK Year 7 pupils (age 11-12, Key Stage 3). " +
  "Use British spelling, pounds (£) and metric units. Every question must have exactly ONE clearly correct option; " +
  "wrong options should be believable mistakes a pupil really makes. Keep questions under 220 characters and options short. " +
  "Never use 'all of the above' or 'none of the above'. Be kind and encouraging in hints and explanations. " +
  "The options are shuffled before pupils see them, so NEVER refer to an option by its position or letter " +
  "('the first one', 'option B') - quote the words instead. " +
  "Reply with JSON only, no other text.";

type Item = { q: string; options: string[]; answer: string; hint: string; explain: string };

function clean(raw: any): Item | null {
  if (!raw || typeof raw.q !== "string" || !Array.isArray(raw.options)) return null;
  const options = raw.options.map((o: unknown) => String(o).trim()).filter(Boolean);
  const answer = String(raw.answer ?? "").trim();
  if (options.length !== 4 || new Set(options.map((o: string) => o.toLowerCase())).size !== 4) return null;
  if (!options.includes(answer)) return null;
  if (raw.q.length > 300 || options.some((o: string) => o.length > 90)) return null;
  return { q: raw.q.trim(), options, answer, hint: String(raw.hint ?? "").slice(0, 240), explain: String(raw.explain ?? "").slice(0, 400) };
}

async function writeBatch(topic: string, level: number, flavour: string, avoid: string[] = []): Promise<{ items: Item[]; by: string }> {
  const t = TOPICS[topic];
  const user =
    (avoid.length ? `These questions already exist - do NOT repeat them, their examples, or their sentences:\n- ${avoid.join("\n- ")}\n\n` : "") +
    `Write 4 questions on ${t.subject}: ${t.name} (${t.guide}).\n` +
    `Difficulty: ${LEVELS[level]}.\nStyle: ${FLAVOURS[flavour]}.\n` +
    `Make the 4 questions test different things within the topic and use different numbers or words.\n` +
    `JSON shape: {"questions":[{"q":"...","options":["...","...","...","..."],"answer":"(exactly one of the options)",` +
    `"hint":"one sentence that nudges without giving it away","explain":"one or two sentences on why the answer is right"}]}`;
  let got: { text: string; by: string };
  if (haveClaude()) {
    try { got = await askClaude(WRITER_SYSTEM, user, 1800); }
    catch (e) {
      if (!haveGroq()) throw e;
      console.error("writer: Claude failed, Groq writing instead");
      got = await askGroq(WRITER_SYSTEM, user, 6000, true);
    }
  } else got = await askGroq(WRITER_SYSTEM, user, 6000, true);
  const list = (firstJson(got.text).questions ?? []).map(clean).filter(Boolean) as Item[];
  return { items: list, by: got.by };
}

/* The second opinion. The checker sees the questions and options but not
   the answers, and answers them itself. Disagreement = thrown away. */
async function check(items: Item[], writtenBy = ""): Promise<Item[]> {
  if (!items.length) return items;
  const system = "You are checking a quiz. Answer each question yourself, carefully, working it out. Reply with JSON only.";
  const user = "For each question pick the single correct option, copied exactly. " +
    'JSON shape: {"answers":["...", ...]} in the same order.\n\n' +
    items.map((it, i) => `${i + 1}. ${it.q}\nOptions: ${it.options.map((o) => JSON.stringify(o)).join(", ")}`).join("\n\n");
  try {
    /* Whoever didn't write it checks it. If Groq wrote it (Claude down),
       Claude checks - and if Claude can't, Groq checks its own work,
       which is weaker but better than nothing. */
    const groqWrote = !writtenBy.startsWith("claude");
    let got: { text: string; by: string };
    if (groqWrote && haveClaude()) {
      try { got = await askClaude(system, user, 1200); } catch { got = await askGroq(system, user, 8000, true); }
    } else got = haveGroq() ? await askGroq(system, user, 8000, true) : await askClaude(system, user, 1200);
    const ans: string[] = (firstJson(got.text).answers ?? []).map((a: unknown) => String(a).trim());
    const kept = items.filter((it, i) => ans[i] === it.answer);
    if (kept.length < items.length) console.error(`check: kept ${kept.length} of ${items.length}`);
    return kept;
  } catch (e) {
    console.error("check", e instanceof Error ? e.message : String(e));
    return []; // no second opinion, no question - better none than a wrong one
  }
}

// ---------- the function ----------
Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
                               { auth: { persistSession: false } });
    db = admin;
    const { data: who } = await admin.auth.getUser(token);
    const user = who?.user;
    if (!user) return json({ error: "Sign in on the Launchpad first." }, 401);
    const uid = user.id;

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "state");

    // three strikes, shared with the rest of the site
    const { data: off } = await admin.rpc("timed_out", { u: uid, f: "levelup" }).then((r: any) => r, () => ({ data: null }));
    if (off && action === "next") {
      return json({ error: "You've been taken off Level Up until midnight for going too fast, three times in an hour. It comes back by itself tomorrow." }, 429);
    }

    const { data: row } = await admin.from("levelup_progress").select("*").eq("user_id", uid).maybeSingle();
    const prog = row ?? { user_id: uid, pts: 0, xp: 0, data: {}, owned: ["t-rookie", "c-classic", "a-rocket"],
                          wear: { title: "t-rookie", theme: "c-classic", badge: "a-rocket" } };
    const d = fresh(prog.data ?? {});
    planDay(d);
    if (d.gen.day !== londonDay()) d.gen = { day: londonDay(), n: 0, ex: 0 };

    const save = () => admin.from("levelup_progress").upsert({
      user_id: uid, pts: prog.pts, xp: prog.xp, data: d, owned: prog.owned, wear: prog.wear, updated: new Date().toISOString(),
    });
    const summary = () => ({
      pts: prog.pts, xp: prog.xp, ...levelFromXp(prog.xp), streak: d.streak, best: d.best,
      owned: prog.owned, wear: prog.wear, subjects: d.subjects,
      tasks: d.tasks.map((t) => ({ key: t.key, name: t.name, topic: TOPICS[t.topic]?.name ?? t.topic,
                                   done: Math.min(t.done, TASK_LEN), of: TASK_LEN, right: t.right })),
      insights: insights(d),
      topics: Object.entries(d.topics).filter(([k]) => TOPICS[k]).map(([k, t]) =>
        ({ key: k, name: TOPICS[k].name, subject: TOPICS[k].subject, level: t.lvl, n: t.n, acc: Math.round(acc(t) * 100) })),
      shop: SHOP,
      ai: { writer: haveClaude() ? "Claude Haiku" : haveGroq() ? "Groq" : "none", checker: haveGroq() ? "Groq" : haveClaude() ? "Claude Haiku" : "none" },
    });

    if (action === "state") { await save(); return json(summary()); }

    if (action === "subjects") {
      const s = (Array.isArray(body.subjects) ? body.subjects : []).filter((x: unknown) => ["maths", "english", "science"].includes(String(x)));
      if (!s.length) return json({ error: "Pick at least one subject." }, 400);
      d.subjects = s; d.day = ""; planDay(d); await save(); return json(summary());
    }

    if (action === "next") {
      // per-minute limit -> strike
      const since = new Date(Date.now() - 60000).toISOString();
      const { count } = await admin.from("levelup_issued").select("id", { count: "exact", head: true })
        .eq("user_id", uid).gte("made_at", since);
      if ((count ?? 0) >= PER_MINUTE) {
        const ends = await admin.rpc("add_strike", { u: uid, f: "levelup" }).then((r: any) => r.data, () => null);
        return json({ error: ends ? "That's three times too fast this hour - Level Up is off for you until midnight."
                                  : "Slow down a little - read each question properly!" }, 429);
      }

      const taskKey = String(body.task ?? "free");
      const ti = d.tasks.findIndex((t) => t.key === taskKey && t.done < TASK_LEN);
      const task = ti >= 0 ? d.tasks[ti] : null;
      const topic = task ? task.topic : freePick(d);
      const st = stat(d, topic);
      const level = Math.min(5, st.lvl + (task?.bump ?? 0));
      const flavour = pickFlavour(d);

      // questions this pupil has already had
      const { data: seenRows } = await admin.from("levelup_issued").select("bank_id").eq("user_id", uid).not("bank_id", "is", null);
      const seen = new Set((seenRows ?? []).map((r: any) => r.bank_id));
      const { data: slot } = await admin.from("levelup_bank").select("id,item,flavour,level,served")
        .eq("topic", topic).eq("level", level).eq("off", false).limit(200);
      let unseen = (slot ?? []).filter((b: any) => !seen.has(b.id));
      const preferred = unseen.filter((b: any) => b.flavour === flavour);

      /* Making questions takes two AIs about ten seconds, so pupils
         shouldn't wait for it. If there's something they haven't had at
         this level, they get it straight away and the bank is topped up
         in the background. They only wait when there's nothing at all. */
      const startOfDay = new Date(); startOfDay.setUTCHours(0, 0, 0, 0);
      const { count: madeToday } = await admin.from("levelup_bank").select("id", { count: "exact", head: true })
        .gte("made_at", startOfDay.toISOString());
      const roomToday = (madeToday ?? 0) < GEN_ALL_DAY * 4 && d.gen.n < GEN_PER_PUPIL_DAY && (haveClaude() || haveGroq());
      const { data: recent } = await admin.from("levelup_bank").select("item").eq("topic", topic)
        .order("made_at", { ascending: false }).limit(12);
      const avoid = (recent ?? []).map((r: any) => String(r.item?.q ?? "").slice(0, 140)).filter(Boolean);
      const topUp = async () => {
        try {
          const w = await writeBatch(topic, level, flavour, avoid);
          const ok = await check(w.items, w.by);
          if (!ok.length) return [];
          const { data: ins } = await admin.from("levelup_bank")
            .insert(ok.map((item) => ({ topic, level, flavour, item, made_by: w.by }))).select("id,item,flavour,level,served");
          return ins ?? [];
        } catch (e) { console.error("write", e instanceof Error ? e.message : String(e)); return []; }
      };
      if (roomToday && !unseen.length) {
        d.gen.n++;
        unseen = [...(await topUp())];
      } else if (roomToday && (unseen.length < 4 || preferred.length < 1 || Math.random() < 0.1)) {
        d.gen.n++;
        // @ts-ignore EdgeRuntime exists on Supabase's edge runtime
        if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(topUp()); else topUp();
      }

      let pickRow: any = unseen.find((b: any) => b.flavour === flavour) ?? unseen[0];
      if (!pickRow) {
        // anything on this topic they haven't had, then anything at all on it
        const { data: any1 } = await admin.from("levelup_bank").select("id,item,flavour,level,served")
          .eq("topic", topic).eq("off", false).limit(200);
        const pool2 = (any1 ?? []);
        pickRow = pool2.filter((b: any) => !seen.has(b.id)).sort((a: any, b: any) => Math.abs(a.level - level) - Math.abs(b.level - level))[0]
               ?? (pool2.length ? pickOf(pool2) : null);
      }
      if (!pickRow) {
        await save();
        return json({ error: haveClaude() || haveGroq() ? "Couldn't get a question just now - try again in a moment."
                                                       : "No AI key is set on the server yet, and the question bank is empty." }, 503);
      }
      const it = pickRow.item as Item;
      const options = [...it.options].sort(() => Math.random() - 0.5);
      const qNo = task ? task.done + 1 : 0;
      const code = task ? `${ti + 1}${"ABCDE"[task.done] ?? "Z"}` : `F${(d.gen.n + seen.size) % 90 + 10}`;
      const { data: issued, error: iErr } = await admin.from("levelup_issued").insert({
        user_id: uid, bank_id: pickRow.id, task: task ? task.key : "free", code, topic,
        level: pickRow.level, flavour: pickRow.flavour, answer: it.answer, explain: it.explain,
      }).select("id").single();
      if (iErr) throw iErr;
      await admin.from("levelup_bank").update({ served: (pickRow.served ?? 0) + 1 }).eq("id", pickRow.id);
      await save();
      return json({
        id: issued.id, code, task: task ? task.name : "Free practice", qNo, of: task ? TASK_LEN : 0,
        topic: TOPICS[topic].name, subject: TOPICS[topic].subject, level: pickRow.level, flavour: pickRow.flavour,
        q: it.q, options, hasHint: !!it.hint,
      });
    }

    if (action === "hint") {
      const { data: is } = await admin.from("levelup_issued").select("id,bank_id,right_ans").eq("id", String(body.id)).eq("user_id", uid).maybeSingle();
      if (!is) return json({ error: "Not your question." }, 404);
      const { data: b } = await admin.from("levelup_bank").select("item").eq("id", is.bank_id).maybeSingle();
      if (is.right_ans === null) await admin.from("levelup_issued").update({ hinted: true }).eq("id", is.id);
      return json({ hint: (b?.item as Item)?.hint || "Read the question again slowly - what is it really asking?" });
    }

    if (action === "answer") {
      const { data: is } = await admin.from("levelup_issued").select("*").eq("id", String(body.id)).eq("user_id", uid).maybeSingle();
      if (!is) return json({ error: "Not your question." }, 404);
      if (is.right_ans !== null) return json({ error: "Already answered." }, 409);
      const pick = String(body.pick ?? "");
      const ms = Math.max(0, Math.min(600000, Number(body.ms) || 0));
      const right = pick === is.answer;
      await admin.from("levelup_issued").update({ right_ans: right, ms, answered_at: new Date().toISOString() }).eq("id", is.id);

      const st = stat(d, is.topic);
      st.n++; st.recent.push(right ? 1 : 0); if (st.recent.length > 10) st.recent.shift();
      st.ms.push(ms); if (st.ms.length > 10) st.ms.shift();
      const f = d.flav[is.flavour] ??= { n: 0, ok: 0 }; f.n++; if (right) f.ok++;
      d.hints.n++; if (is.hinted) d.hints.used++;
      d.last = is.topic;

      let gained = 0, moved = "";
      const task = d.tasks.find((t) => t.key === is.task);
      if (right) {
        st.ok++; st.run++; st.miss = 0; d.streak++; d.best = Math.max(d.best, d.streak);
        gained = 10 * is.level + Math.min(25, 5 * (d.streak - 1));
        if (is.hinted) gained = Math.ceil(gained / 2);
        if ((st.run >= 3 || (ms < 8000 && st.run >= 2 && !is.hinted)) && st.lvl < 5) {
          st.lvl++; st.run = 0; moved = `Up to level ${st.lvl} in ${TOPICS[is.topic]?.name}!`;
        }
      } else {
        st.run = 0; st.miss++; d.streak = 0;
        if (st.miss >= 2 && st.lvl > 1) { st.lvl--; st.miss = 0; moved = `Taking ${TOPICS[is.topic]?.name} down to level ${st.lvl} to steady it.`; }
      }
      let taskDone = false, bonus = 0;
      if (task && task.done < TASK_LEN) {
        task.done++; if (right) task.right++;
        if (task.done === TASK_LEN && !task.bonus) { task.bonus = true; taskDone = true; bonus = 30 + task.right * 10; }
      }
      prog.pts += gained + bonus; prog.xp += gained + bonus;
      await save();
      return json({ right, answer: is.answer, explain: is.explain, gained, bonus, moved, taskDone,
                    canExplain: !right && (haveGroq() || haveClaude()), ...summary() });
    }

    // "Explain it to me" after a wrong answer - written by Groq, kept for next time.
    if (action === "explain") {
      const { data: is } = await admin.from("levelup_issued").select("*").eq("id", String(body.id)).eq("user_id", uid).maybeSingle();
      if (!is || is.right_ans === null) return json({ error: "Answer it first." }, 400);
      const { data: b } = await admin.from("levelup_bank").select("id,item").eq("id", is.bank_id).maybeSingle();
      const it = b?.item as (Item & { more?: string }) | undefined;
      if (!it) return json({ error: "That question has gone." }, 404);
      if (it.more) return json({ more: it.more });
      if (d.gen.ex >= EXPLAIN_PER_PUPIL_DAY) return json({ more: it.explain });
      d.gen.ex++; await save();
      const system = "You are a friendly, patient tutor for an 11-year-old in the UK. Explain step by step in at most 6 short lines. " +
                     "Plain text only, no markdown headings. Finish with one quick tip for next time.";
      const userMsg = `Question: ${it.q}\nOptions: ${it.options.join(" | ")}\nCorrect answer: ${it.answer}\nExplain how to get the right answer.`;
      try {
        const got = haveGroq() ? await askGroq(system, userMsg, 900, false) : await askClaude(system, userMsg, 500);
        const more = got.text.trim().slice(0, 1200);
        if (more) await admin.from("levelup_bank").update({ item: { ...it, more } }).eq("id", b!.id);
        return json({ more: more || it.explain });
      } catch { return json({ more: it.explain }); }
    }

    if (action === "report") {
      const { data: is } = await admin.from("levelup_issued").select("bank_id").eq("id", String(body.id)).eq("user_id", uid).maybeSingle();
      if (!is?.bank_id) return json({ ok: true });
      const { data: b } = await admin.from("levelup_bank").select("reports").eq("id", is.bank_id).maybeSingle();
      const reports = (b?.reports ?? 0) + 1;
      await admin.from("levelup_bank").update({ reports, off: reports >= 2 }).eq("id", is.bank_id);
      return json({ ok: true, said: "Thanks - if someone else reports it too, it's taken out." });
    }

    if (action === "buy" || action === "wear") {
      const item = SHOP.find((s) => s.id === String(body.item));
      if (!item) return json({ error: "No such thing in the shop." }, 404);
      const owned: string[] = Array.isArray(prog.owned) ? prog.owned : [];
      if (!owned.includes(item.id)) {
        if (action === "wear") return json({ error: "Buy it first." }, 400);
        if (prog.pts < item.cost) return json({ error: "Not enough points yet." }, 400);
        prog.pts -= item.cost; owned.push(item.id); prog.owned = owned;
      }
      prog.wear = { ...(prog.wear ?? {}), [item.kind]: item.id };
      await save();
      return json(summary());
    }

    return json({ error: "Don't know how to do that." }, 400);
  } catch (e) {
    console.error("levelup", e instanceof Error ? e.message : String(e));
    return json({ error: "Something went wrong on the server." }, 500);
  }
});
