 PRIVATE & PROPRIETARY PROPERTY

Copyright © 2026 Shiv (silocell). All Rights Reserved.

By viewing this repository, you agree to the following terms:
* **NO COPYING:** You are strictly prohibited from copying, duplicating, or using any part of this code.
* **NO HOSTING:** You may not host your own copy, fork, or live version of this dashboard.
* **NO PLAGIARISM:** You may not present this work or any derivative of it as your own.

Viewing this code is permitted for educational inspection only. Unauthorized use, replication, or distribution will result in an immediate DMCA copyright takedown notice. See [LICENSE](LICENSE) for full legal terms.




# Homework Launchpad

A homework dashboard for Year 7 at my school. I'm in Year 7 too — I built
this because I wanted one place for the things I needed every evening,
instead of six tabs and a planner I'd left in my locker.

**Live:** https://civilinitiatives.org

## What it does

- **To-do list** — private to you. Nobody else can read it, including me.
- **Year chat** — one room for the whole year, filtered and watched.
- **Noticeboard** — notices and homework questions people can answer.
- **Private rooms** — invite-only chats. I'm the only one who can make one.
- **Explain a topic** — an AI explains something you didn't understand.
  Ten a day each. It won't do your homework for you.
- **Look it up** — Simple English Wikipedia first, then full Wikipedia.
  Free, and it doesn't use up your ten.
- **Word of the day**, shortcuts, themes, and a font that's easier to read.

## What's in this repository

The page you see in your browser, and the admin panel. That's it.

The server side — the bits that check who you are, run the filter and talk
to the AI — isn't here. Not because hiding code makes anything safe: it
doesn't, and anyone who tells you otherwise is selling something. It's
because those files hold keys, and keys belong somewhere private.

The games aren't here either. They're in repos of their own:

- [HEH-Launchpad-Game](https://github.com/silocell/HEH-Launchpad-Game) — Gate Run, at gaterun.civilinitiatives.org
- [HEH-Launchpad-Scratch](https://github.com/silocell/HEH-Launchpad-Scratch) — the six Scratch games, at games.civilinitiatives.org
- [HEH-Launchpad-Learn](https://github.com/silocell/HEH-Launchpad-Learn) — Level Up, Times Table Tycoon, Word Dragons, Battle Stories, at learn.civilinitiatives.org
- [HEH-Play](https://github.com/silocell/HEH-Play) — the games page (every game in one place), at play.civilinitiatives.org
- [HEH-Arcade](https://github.com/silocell/HEH-Arcade) — the Arcade, at arcade.civilinitiatives.org (GPL-3.0)
- [HEH-Doodles](https://github.com/silocell/HEH-Doodles) — the doodle games, at doodles.civilinitiatives.org (GPL-3.0)

One sign-in covers all of them: `auth-store.js` keeps the session in a
cookie for `.civilinitiatives.org`, because each subdomain is a separate
origin and can't see the others' localStorage.

That split is on purpose, and it's about the licence as much as the file
sizes. The games are released under the GNU GPL v3: copy them, change
them, put them on your own site. The dashboard in this repository is not —
it's all rights reserved, and you're welcome to read it but not to run
your own copy. Keeping them in separate repositories means each one has a
single, unambiguous licence, instead of one repository claiming both
things at once.

## What actually keeps it safe

Not this repository being tidy. Five things:

1. **Row Level Security.** Every table has rules about who may read and
   write it, enforced by the database. The key in this page is meant to be
   public; it can't do anything the rules don't allow.
2. **Checks on the server.** Who's an admin, who may post, who's in which
   room — the server decides, every time. The page only decides what to
   draw.
3. **One filter, one pipeline.** Chat, noticeboard, rooms and the explainer
   all go through the same word list and the same checker. There's no back
   way in, because there's only one way in.
4. **Column rules as well as row rules.** Row Level Security says which
   rows you may read; it says nothing about which columns. The chat table
   also holds the unmasked text behind a hashed-out message, and everyone's
   address, so those columns are taken away from pupils at the database
   level. The page asks for columns by name and never `select("*")`.
5. **Counting that can't be raced.** The explainer's ten-a-day is taken in
   one step inside the database, and the chat's messages-a-minute is a
   trigger on the table, so firing fifty requests at once gets fifty
   refusals, not fifty messages.

### If the server side ever has to be rebuilt

Supabase, self-hosted on an Oracle Cloud server since 24 October. Three edge
functions — `chat`, `admin`, `explain` — and a handful
of SQL files that are run once in the SQL editor, in this order:
`site_status.sql`, `rooms.sql`, `room_requests.sql`, `demo_admins.sql`,
`lock_columns.sql`, `spend_ai.sql`, `rate_limits.sql`. The functions need
three secrets: `GROQ_API_KEY`, and for sign-in the Azure client id and
secret. None of these files live in this repository; keep the current
copies with the backups.

## Honest notes

- "Private" rooms are private from other pupils. They are not private from
  me — I hold the keys — and every room says so on its header.
- Signing in with Microsoft shows an "unverified" warning. That's because
  publisher verification needs a registered company and I'm not one.
- Nothing here is a secret. My email address is in this code. Email
  addresses aren't passwords, and the real secrets live in Supabase.

## Built with

Plain HTML, CSS and JavaScript — no framework. Supabase for the database,
sign-in and server functions. Groq and Cloudflare for the AI. GitHub Pages
for hosting, on civilinitiatives.org.

Built with a lot of help from Claude, which argued with me about several
of the decisions above, and was right about some of them.

— Shiv
