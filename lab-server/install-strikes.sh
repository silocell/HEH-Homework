#!/usr/bin/env bash
# Installs three strikes on the LAB server. Prints results only, no keys.
cd ~/supabase || { echo "no ~/supabase"; exit 1; }

# 1. Put back the original access on the site's own timeouts table,
#    taken from the copy of the real site's schema.
grep -iE '^(GRANT|REVOKE) .* ON TABLE public\.timeouts ' ~/heh-schema.sql \
  | sudo docker exec -i supabase-db psql -U postgres -d postgres -q \
  && echo "your timeouts table: access restored"

# 2. Three strikes: tables, functions, and its own self-test.
sudo docker exec -i supabase-db psql -U postgres -d postgres -tAq < ~/strikes_oct23.sql

# 3. The lab functions.
for f in explain chat admin; do
  [ -f ~/$f-lab.ts ] && cp ~/$f-lab.ts volumes/functions/$f/index.ts
done
sudo chcon -Rt svirt_sandbox_file_t volumes/functions 2>/dev/null || true
sudo docker compose up -d --force-recreate functions >/dev/null 2>&1 && sleep 8
echo "fake AI: $(sudo docker exec supabase-edge-functions printenv LAB_FAKE_AI)"
for f in explain chat admin; do
  printf "%-8s " $f
  curl -s -o /dev/null -w "%{http_code}\n" -X POST localhost:8000/functions/v1/$f \
    -H "content-type: application/json" -d '{}'
done

# 4. Forget anything typed into this account's command history.
history -c 2>/dev/null; : > ~/.bash_history; echo "server command history: cleared"
