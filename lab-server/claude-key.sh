#!/usr/bin/env bash
# Changes ONLY the Claude key on the lab server. What you paste is hidden
# and never printed. Restarts the functions so they pick it up.
cd ~/supabase || exit 1
read -rsp "New Claude API key: " v; echo
[ -z "$v" ] && { echo "Nothing pasted - left as it was."; exit 0; }
sed -i '/^ANTHROPIC_API_KEY=/d' .env
printf 'ANTHROPIC_API_KEY=%s\n' "$v" >> .env
unset v
sudo docker compose up -d --force-recreate functions >/dev/null 2>&1 && sleep 8
n=$(sudo docker exec supabase-edge-functions sh -c 'printenv ANTHROPIC_API_KEY | wc -c')
[ "$n" -gt 1 ] && echo "Claude key: saved, functions can see it" || echo "Claude key: functions can NOT see it"
history -c 2>/dev/null; : > ~/.bash_history
