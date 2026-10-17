# Homework Launchpad

A homework dashboard for Year 7 at my school. I'm in Year 7 too — I built
this because I wanted one place for the things I needed every evening,
instead of six tabs and a planner I'd left in my locker.

**Live:** https://silocell.github.io/HEH-Homework/

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

## What actually keeps it safe

Not this repository being tidy. Three things:

1. **Row Level Security.** Every table has rules about who may read and
   write it, enforced by the database. The key in this page is meant to be
   public; it can't do anything the rules don't allow.
2. **Checks on the server.** Who's an admin, who may post, who's in which
   room — the server decides, every time. The page only decides what to
   draw.
3. **One filter, one pipeline.** Chat, noticeboard, rooms and the explainer
   all go through the same word list and the same checker. There's no back
   way in, because there's only one way in.

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
for hosting.

Built with a lot of help from Claude, which argued with me about several
of the decisions above, and was right about some of them.

— Shiv
