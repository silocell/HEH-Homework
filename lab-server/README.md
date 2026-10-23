# Lab server files

What runs on the lab's own Supabase (Docker on the Oracle machine), kept
here so it isn't only on one laptop.

| File | What it is |
|---|---|
| `levelup-lab.ts` | The Level Up edge function (`volumes/functions/levelup/index.ts`) |
| `levelup_oct23.sql` | Level Up tables and the Ask Claude log |
| `claude_limit_oct23.sql` | Claude's daily and monthly allowance |
| `strikes_oct23.sql` | Three strikes |
| `lab_flags_oct23.sql` | The Experiments switches |
| `install-*.sh`, `update-levelup.sh` | Put the above on the server |
| `add-keys.sh`, `claude-key.sh` | Put AI keys in the server's `.env` (typed hidden, never printed) |

Not here on purpose: the admin, chat and explain functions. They hold the
owner's address and how the chat filter works, and this repository is
public. Those live on the server and on Shiv's laptop.

No keys are in any of these files, and none should ever be.
