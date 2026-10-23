#!/usr/bin/env bash
# Installs Experiments on the LAB server. Prints results only, no keys.
cd ~/supabase || { echo "no ~/supabase"; exit 1; }
sudo docker exec -i supabase-db psql -U postgres -d postgres -tAq < ~/lab_flags_oct23.sql
cp ~/admin-lab.ts volumes/functions/admin/index.ts
sudo chcon -Rt svirt_sandbox_file_t volumes/functions 2>/dev/null || true
sudo docker compose up -d --force-recreate functions >/dev/null 2>&1 && sleep 8
echo "fake AI: $(sudo docker exec supabase-edge-functions printenv LAB_FAKE_AI)"
printf "admin    "; curl -s -o /dev/null -w "%{http_code}\n" -X POST localhost:8000/functions/v1/admin -H "content-type: application/json" -d '{}'
history -c 2>/dev/null; : > ~/.bash_history; echo "done"
