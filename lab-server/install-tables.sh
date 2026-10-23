#!/usr/bin/env bash
# Installs Times Table Tycoon on the LAB server. Prints results only, no keys.
cd ~/supabase || exit 1
sudo docker exec -i supabase-db psql -U postgres -d postgres -tAq < ~/tables_oct23.sql 2>&1 | sed 's/^psql:[^ ]* NOTICE:  //'
mkdir -p volumes/functions/tables
cp ~/tables-lab.ts volumes/functions/tables/index.ts
sudo chcon -Rt svirt_sandbox_file_t volumes/functions 2>/dev/null || true
sudo docker compose up -d --force-recreate functions >/dev/null 2>&1 && sleep 8
printf "tables  "; curl -s -o /dev/null -w "%{http_code}\n" -X POST localhost:8000/functions/v1/tables -d '{}'
echo done
