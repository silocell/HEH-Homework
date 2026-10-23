# Homework Launchpad — context for Claude

Read this before changing anything. Last updated 23 October 2026.

## What this is

A homework dashboard for Year 7 at Hatch End High School, built by a Year 7
pupil (Shiv). Presented at school on **5 November 2026**. Static pages on
GitHub Pages, with Supabase for accounts, data and edge functions.

| Site | Repo / branch | Address | Database |
|---|---|---|---|
| Real site | `silocell/HEH-Homework`, `main` | silocell.github.io/HEH-Homework/ | Hosted Supabase (project `lkyfpvlrqgezgitfmpqo`) |
| Lab (testing copy) | `HEH-Homework`, `lab` branch → published to `silocell/HEH-Launchpad-Lab` | silocell.github.io/HEH-Launchpad-Lab/ | Self-hosted Supabase on an Oracle Cloud ARM machine, `https://79.72.79.18.sslip.io` |
| Gate Run (game) | `silocell/HEH-Launchpad-Game` | silocell.github.io/HEH-Launchpad-Game/ | none |

The same files serve both the real site and the lab. Lab mode is decided by
the page address (`/^\/HEH-(Homework|Launchpad)-Lab(\/|$)/i`), which adds
`html.lab`, the purple bar, the flask tab icon and the lab's Supabase URL and
key. Merging lab into main can never point the real site at the lab.

**Publishing the lab:** commit to `lab`, then copy the changed files into the
HEH-Launchpad-Lab checkout (`git archive lab <files> | tar -x`) and push its
`main`. Do NOT archive the whole branch: the lab repo has its own README.

## Files

- `index.html`: the dashboard (pupils). `notes.html`: the admin panel.
- `polish.css` / `polish.js`: shared styling and touches.
- `extras.js` (main): ten features kept from the lab: streak, cheer on done,
  grow a plant, daily warm-up, focus sounds, flashcards, seasonal touches,
  Konami code, doodle of the day, search easter eggs. Device-only
  (`localStorage` keys `hl.x.*`), dashboard only, does nothing on lab pages.
- `experiments.js` (lab only): the same features behind switches in the
  `lab_flags` table, plus the Experiments and Ask Claude sections of the lab
  admin panel. Keys `hl.exp.*`.
- `chaos.js` (lab): fault switch ("Break things"), including an SSH tunnel mode.
- `levelup.html` (lab): Level Up, adaptive practice. See below.
- `tables.html` (lab): Times Table Tycoon - 60s rounds, Numling cards, lab-only
  trading (`tt_accept()` swaps atomically in the database).
- `dragons.html` (lab): Word Dragons - English lessons grow dragons; battles by
  email, only dragons ever shown. Shares `levelup_bank` for questions.
- `history.html`: Battle Stories (Hastings 1066), client-only - facts checked by
  hand, never AI-written; BBC clips embedded from the BBC's own YouTube.
- `games.html`: all games in one place. The dashboard Games panel (always on in
  the lab via experiments.js, `gamesHub()` in extras.js on main) links here.
  Every game page has a big round ✕ back to the dashboard.
- Groq models are never hard-coded: the functions ask Groq what the account has
  (hourly) and pick a writer plus a different checker. Groq retires models.
- Lab test mode: `LAB_TEST_EMAILS` on the lab server sends answers with
  questions for listed testers (🧪 autoplay buttons). Impossible on the real
  site: the functions refuse it off the self-hosted machine.
- Server code (edge functions, SQL, install scripts) is NOT in this repo: it's kept closed source, on the server and Shiv's laptop only. Never commit it here.

## Level Up (lab, not on main yet)

Sparx-style practice: three daily tasks (Warm-up = strongest topic, Target =
weakest, Challenge = a level up), then Free practice. 25 topics across maths,
English and science, each with its own level 1–5. Points/XP and a shop
(titles, colour themes, badges) — no real money.

- Edge function `levelup` (server code, not in this repo).
- Claude Haiku (`claude-haiku-5-5`) writes questions in batches of 4.
- Groq (`openai/gpt-oss-120b`) answers them blind; only questions both agree on are kept.
- Groq writes "Explain it to me", which is saved on the question.
- Questions are saved in `levelup_bank` and reused for everyone; the bank is topped up in the background.
- Right answers stay server-side (`levelup_issued`) until answered. Points are worked out on the server.
- Claude allowance: `claude_take()` caps calls at `CLAUDE_PER_DAY` (60) and `CLAUDE_PER_MONTH` (800). After that Groq writes the questions.
- Groq key 2 (`GROQ_API_KEY_2`) is used only when key 1 returns 429 or 401.
- Tables: `levelup_bank`, `levelup_issued`, `levelup_progress`, `claude_calls`, `ask_claude_log`. RLS on, no policies; only the service role touches them.

Moving it to main needs: the function deployed to the hosted project, the
SQL run there, and the keys as Supabase secrets.

## Safety rules (decided with Shiv — keep them)

- Never put keys, passwords, the JWT secret or the service_role key in a page,
  a chat, a commit or a log. Diagnostics print names and counts, not values.
  Server keys go in with `add-keys.sh` / `claude-key.sh` (hidden input).
- Pupils' messages, names and emails are never sent to an AI provider for
  admin purposes (Ask Claude gets counts and switches only).
- The admin panel decides nothing: every action is checked server-side
  against the signed-in account. Owner email lives only in the function code
  on the server, never in this public repo (the page uses a SHA-256 fingerprint).
- No raw-SQL or "do anything" buttons in the admin panel; server-level work stays on SSH.
- No one-click wipe of the safeguarding logs.
- The demo ("look only") and helper accounts must never reach chat logs.
- Three strikes: hitting a per-minute limit in 3 separate minutes within an
  hour times that feature out until London midnight; it lifts by itself.
- The real site's own `timeouts` table is not the strikes table (`strike_timeouts`).
- Anything that moves to main is tried on the lab first.

## Conventions

- British English, plain words; the reader is often an 11-year-old.
- Comments explain *why*, in full sentences.
- Respect `prefers-reduced-motion` and dark mode (`data-theme` on `<html>`).
- Test with Playwright (Chromium is pre-installed), stubbing `window.supabase`.
