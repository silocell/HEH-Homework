#!/usr/bin/env bash
# Puts the AI keys on the LAB server. What you type is hidden and never
# printed - it goes straight into ~/supabase/.env. Press Enter on any
# question to leave that key as it is.
cd ~/supabase || { echo "no ~/supabase"; exit 1; }
setkey(){  # name, prompt
  local v; read -rsp "$2 (Enter to skip): " v; echo
  [ -z "$v" ] && { echo "  $1: left as it was"; return; }
  sed -i "/^$1=/d" .env
  printf '%s=%s\n' "$1" "$v" >> .env
  echo "  $1: saved (${#v} characters)"
}
setkey ANTHROPIC_API_KEY "Claude API key (from the Claude Console)"
setkey ANTHROPIC_WORKSPACE_ID "Claude workspace ID - only if your key is NOT in a workspace"
setkey GROQ_API_KEY      "Groq key 1"
setkey GROQ_API_KEY_2    "Groq key 2 (your dad's account)"

# Let the functions container see them (names only go in this file).
f=docker-compose.override.yml
for k in ANTHROPIC_API_KEY ANTHROPIC_WORKSPACE_ID GROQ_API_KEY GROQ_API_KEY_2; do
  if ! grep -q "$k:" $f; then
    awk -v k="$k" '{print} /LAB_FAKE_AI:/ && !d {match($0,/^ */); printf "%s%s: ${%s:-}\n", substr($0,1,RLENGTH), k, k; d=1}' $f > $f.new && mv $f.new $f
  fi
done
sudo docker compose up -d --force-recreate functions >/dev/null 2>&1 && sleep 8
for k in ANTHROPIC_API_KEY ANTHROPIC_WORKSPACE_ID GROQ_API_KEY GROQ_API_KEY_2; do
  n=$(sudo docker exec supabase-edge-functions sh -c "printenv $k | wc -c")
  [ "$n" -gt 1 ] && echo "functions can see $k: yes" || echo "functions can see $k: no"
done
history -c 2>/dev/null; : > ~/.bash_history; echo "done"
