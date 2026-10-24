/* =====================================================================
   Games gate. Loaded at the top of every game page (Arcade, Battle
   Stories, the Games page). Asks the server "may this pupil play?"
   (my_games, games_nightly_oct24.sql) and, if the answer is no, covers
   the page with the reason and a way back.

   The server is the one that decides: Tycoon and Word Dragons also
   refuse on the server itself. These pages have nothing on the server
   to refuse, so this is the lock on their door - good enough for games
   that store nothing. If the server can't be reached at all, the page
   is left open rather than broken; a "no" is always obeyed.
   ===================================================================== */
(function(){
  var LAB = /^\/HEH-(Homework|Launchpad)-Lab(\/|$)/i.test(location.pathname);
  var URL = LAB ? "https://hehs.duckdns.org" : "https://hehs-live.duckdns.org";
  var KEY = LAB
    ? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzkyNzcxNTQzLCJleHAiOjIxMDgxMzE1NDN9.MFpgmA0d-KISwuCicZMUhnaEpVHY-Sw_jFp3Muck6FM"
    : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzkyODMyMjkwLCJleHAiOjIxMDgxOTIyOTB9.7gFhQa5RBwVtiOPLO7Qf2-aVEbkd5xgpLiN1J06Gybo";
  /* supabase-js keeps the sign-in under sb-<first part of the host>-auth-token. */
  var SKEY = "sb-" + URL.replace(/^https:\/\//, "").split(".")[0] + "-auth-token";
  var token = null, sess = null;
  try {
    sess = JSON.parse(localStorage.getItem(SKEY) || "null");
    token = sess && sess.access_token;
  } catch(e) {}

  var cover = null;
  function block(why){
    if (cover) return;
    cover = document.createElement("div");
    cover.setAttribute("role", "alertdialog"); cover.setAttribute("aria-modal", "true");
    cover.style.cssText = "position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:20px;" +
      "background:rgba(10,13,26,.92);color:#fff;font:16px/1.5 system-ui,-apple-system,'Segoe UI',sans-serif;text-align:center";
    var box = document.createElement("div"); box.style.maxWidth = "420px";
    var big = document.createElement("p"); big.style.cssText = "font-size:2.6rem;margin:0"; big.textContent = "🔒";
    var h = document.createElement("p"); h.style.cssText = "font-weight:800;font-size:1.3rem;margin:8px 0"; h.textContent = "Games are locked";
    var p = document.createElement("p"); p.style.margin = "0 0 18px"; p.textContent = why;
    var a = document.createElement("a"); a.href = "./"; a.textContent = "Back to the Launchpad";
    a.style.cssText = "display:inline-block;background:#fff;color:#111827;font-weight:700;padding:10px 18px;border-radius:12px;text-decoration:none";
    box.appendChild(big); box.appendChild(h); box.appendChild(p); box.appendChild(a); cover.appendChild(box);
    (document.body || document.documentElement).appendChild(cover);
    document.documentElement.style.overflow = "hidden";
    setTimeout(function(){ a.focus(); }, 50);
  }
  window.GamesGate = { ready: null };
  if (!token) {
    var show = function(){ block("Sign in on the Launchpad first, then come back to play."); };
    if (document.body) show(); else document.addEventListener("DOMContentLoaded", show);
    window.GamesGate.ready = Promise.resolve(false);
    return;
  }
  function ask(t){ return fetch(URL + "/rest/v1/rpc/my_games", {
    method: "POST", headers: { "apikey": KEY, "Authorization": "Bearer " + t, "Content-Type": "application/json" }, body: "{}" }); }
  /* A sign-in lasts an hour; if the dashboard hasn't been open since, the
     saved one has run out. Swap it for a fresh one exactly as the
     dashboard would, and save it back the same way, so the dashboard
     carries on signed in. */
  function refresh(){
    if (!sess || !sess.refresh_token) return Promise.resolve(null);
    return fetch(URL + "/auth/v1/token?grant_type=refresh_token", { method: "POST",
      headers: { "apikey": KEY, "Content-Type": "application/json" }, body: JSON.stringify({ refresh_token: sess.refresh_token }) })
      .then(function(r){ return r.ok ? r.json() : null; })
      .then(function(n){ if (!n || !n.access_token) return null;
        if (!n.expires_at && n.expires_in) n.expires_at = Math.floor(Date.now() / 1000) + n.expires_in;
        try { localStorage.setItem(SKEY, JSON.stringify(n)); } catch(e) {}
        return n.access_token; });
  }
  window.GamesGate.ready = ask(token).then(function(r){
    if (r.status !== 401) return r;
    return refresh().then(function(t){ return t ? ask(t) : r; });
  }).then(function(r){
    if (r.status === 401) return { allowed: false, why: "Open the Launchpad and sign in again, then come back to play." };
    return r.ok ? r.json() : null;
  }).then(function(d){
    if (d && d.allowed === false) {
      var go = function(){ block(d.why || "Games are switched off for your account."); };
      if (document.body) go(); else document.addEventListener("DOMContentLoaded", go);
      return false;
    }
    return true;
  }).catch(function(){ return true; });
})();
