#!/usr/bin/env bash
# Updates Level Up and the admin function on the LAB server. No keys printed.
cd ~/supabase || exit 1
[ -f ~/claude_limit_oct23.sql ] && sudo docker exec -i supabase-db psql -U postgres -d postgres -tAq < ~/claude_limit_oct23.sql
cp ~/levelup-lab.ts volumes/functions/levelup/index.ts
cp ~/admin-lab.ts   volumes/functions/admin/index.ts
sudo chcon -Rt svirt_sandbox_file_t volumes/functions 2>/dev/null || true
sudo docker compose up -d --force-recreate functions >/dev/null 2>&1 && sleep 8
printf "levelup "; curl -s -o /dev/null -w "%{http_code}\n" -X POST localhost:8000/functions/v1/levelup -d '{}'
echo done
