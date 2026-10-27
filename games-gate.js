/* =====================================================================
   Games gate. Loaded at the top of every game page (Arcade, Battle
   Stories, the Games page, the Scratch games, Gate Run). Asks the
   server "may this pupil play?" (my_games) and, if the answer is no,
   sends them to the site's "404 - File not found" page: a dead end.

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

  /* Anyone who isn't allowed in gets a dead end: the site's own "404 -
     File not found" page (404.html), with the crest and a link back to
     the Launchpad and nothing about why. replace(), so Back doesn't land
     on the game again, and stop() so nothing else on this page loads.
     Until the answer comes the page stays invisible, so the game never
     flashes up first; if the server can't be reached at all the page is
     shown after a few seconds rather than left blank. */
  var root = document.documentElement;
  root.style.visibility = "hidden";
  var shown = false;
  function reveal(){ if (!shown) { shown = true; root.style.visibility = ""; } }
  var failsafe = setTimeout(reveal, 5000);
  var gone = false;
  function block(){
    if (gone) return; gone = true;
    clearTimeout(failsafe);
    try { window.stop(); } catch (e) {}
    location.replace("/404");
  }
  window.GamesGate = { ready: null, level: null };
  if (!token) {
    window.GamesGate.ready = Promise.resolve(false);
    block();
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
    if (r.status === 401) return { allowed: false };
    return r.ok ? r.json() : null;
  }).then(function(d){
    if (d && d.allowed === false) { window.GamesGate.level = "off"; block(); return false; }
    /* An older server doesn't say a level: that means every game. */
    var level = (d && d.level === "learning") ? "learning" : "all";
    window.GamesGate.level = level;
    if (level === "learning") {
      root.classList.add("learning-only");
      if (KIND === "fun") { block(); return false; }
    }
    clearTimeout(failsafe); reveal();
    return true;
  }).catch(function(){ clearTimeout(failsafe); reveal(); return true; });
})();
