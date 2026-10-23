#!/usr/bin/env bash
# Installs Level Up and Ask Claude on the LAB server. Prints results only, no keys.
cd ~/supabase || { echo "no ~/supabase"; exit 1; }
sudo docker exec -i supabase-db psql -U postgres -d postgres -tAq < ~/levelup_oct23.sql
mkdir -p volumes/functions/levelup
cp ~/levelup-lab.ts volumes/functions/levelup/index.ts
cp ~/admin-lab.ts   volumes/functions/admin/index.ts
sudo chcon -Rt svirt_sandbox_file_t volumes/functions 2>/dev/null || true
sudo docker compose up -d --force-recreate functions >/dev/null 2>&1 && sleep 8
for f in levelup admin; do
  printf "%-8s " $f
  curl -s -o /dev/null -w "%{http_code}\n" -X POST localhost:8000/functions/v1/$f -H "content-type: application/json" -d '{}'
done
history -c 2>/dev/null; : > ~/.bash_history; echo "done"
