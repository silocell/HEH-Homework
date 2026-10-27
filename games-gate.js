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

   Two kinds of game (27 Oct). Each page says which it is on its script
   tag: data-kind="fun" (Scratch games, Arcade), "learning" (the default:
   Tycoon, Word Dragons, Battle Stories, Map Quest, Gate Run) or "hub"
   (the Games page). An account can be off, "learning" (learning games
   only) or "all". A learning-only account is locked out of fun pages;
   the hub stays open and hides the fun ones (GamesGate.level says which).
   ===================================================================== */
(function(){
  var me = document.currentScript;
  var KIND = (me && me.getAttribute("data-kind")) || "learning";
  var LAB = (/^lab\./i.test(location.hostname) || /^\/HEH-(Homework|Launchpad)-Lab(\/|$)/i.test(location.pathname));
  var URL = LAB ? "https://hehs.duckdns.org" : "https://hehs-live.duckdns.org";
  var KEY = LAB
    ? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzkyNzcxNTQzLCJleHAiOjIxMDgxMzE1NDN9.MFpgmA0d-KISwuCicZMUhnaEpVHY-Sw_jFp3Muck6FM"
    : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzkyODMyMjkwLCJleHAiOjIxMDgxOTIyOTB9.7gFhQa5RBwVtiOPLO7Qf2-aVEbkd5xgpLiN1J06Gybo";
  /* supabase-js keeps the sign-in under sb-<first part of the host>-auth-token. */
  var SKEY = "sb-" + URL.replace(/^https:\/\//, "").split(".")[0] + "-auth-token";
  var token = null, sess = null;
  try {
    /* auth-store.js knows whether the session is in a cookie shared
       across the subdomains or in localStorage, and reads the right one.
       If it has not loaded, fall back to how this always worked. */
    var raw = (window.HEHAuth && window.HEHAuth.get)
                ? window.HEHAuth.get(SKEY)
                : localStorage.getItem(SKEY);
    sess = JSON.parse(raw || "null");
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
    var h = document.createElement("p"); h.style.cssText = "font-weight:800;font-size:1.3rem;margin:8px 0";
    h.textContent = /learning games/.test(why) ? "This one's locked" : "Games are locked";
    var p = document.createElement("p"); p.style.margin = "0 0 18px"; p.textContent = why;
    var a = document.createElement("a"); a.textContent = "Back to the Launchpad";
    /* From games. or gaterun., "./" would be that site's own front page. */
    a.href = /(^|\.)civilinitiatives\.org$/i.test(location.hostname) && !/^(civilinitiatives\.org|lab\.civilinitiatives\.org)$/i.test(location.hostname)
      ? (LAB ? "https://lab.civilinitiatives.org/" : "https://civilinitiatives.org/") : "./";
    a.style.cssText = "display:inline-block;background:#fff;color:#111827;font-weight:700;padding:10px 18px;border-radius:12px;text-decoration:none";
    box.appendChild(big); box.appendChild(h); box.appendChild(p); box.appendChild(a); cover.appendChild(box);
    (document.body || document.documentElement).appendChild(cover);
    document.documentElement.style.overflow = "hidden";
    setTimeout(function(){ a.focus(); }, 50);
  }
  window.GamesGate = { ready: null, level: null };
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
        try {
          /* Save it where the page will look: the shared cookie on the
             domain, localStorage elsewhere. Writing it only to localStorage
             left the cookie holding a refresh token that had just been
             used up. */
          if (window.HEHAuth && window.HEHAuth.storage) window.HEHAuth.storage.setItem(SKEY, JSON.stringify(n));
          else localStorage.setItem(SKEY, JSON.stringify(n));
        } catch(e) {}
        return n.access_token; });
  }
  window.GamesGate.ready = ask(token).then(function(r){
    if (r.status !== 401) return r;
    return refresh().then(function(t){ return t ? ask(t) : r; });
  }).then(function(r){
    if (r.status === 401) return { allowed: false, why: "Open the Launchpad and sign in again, then come back to play." };
    return r.ok ? r.json() : null;
  }).then(function(d){
    function shut(why){
      var go = function(){ block(why); };
      if (document.body) go(); else document.addEventListener("DOMContentLoaded", go);
      return false;
    }
    if (d && d.allowed === false) { window.GamesGate.level = "off"; return shut(d.why || "Games are switched off for your account."); }
    /* An older server doesn't say a level: that means every game. */
    var level = (d && d.level === "learning") ? "learning" : "all";
    window.GamesGate.level = level;
    if (level === "learning") {
      document.documentElement.classList.add("learning-only");
      if (KIND === "fun") return shut("Only the learning games are switched on for your account. Try Level Up, Times Table Tycoon or Map Quest.");
    }
    return true;
  }).catch(function(){ return true; });
})();
