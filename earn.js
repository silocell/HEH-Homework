/* =====================================================================
   earn.js - pence for the fun games (Arcade, Scratch). Doodles pay nothing.

   A game calls HEHEarn.played("plane", score) when a round ends (the
   Scratch games every 2 minutes of play). The server pays 1-3p, at most
   10p per game a day, never more often than every 15 seconds, and never
   Launchpad Pounds. Learning games pay 1p per right answer on their own,
   with a small lucky chance of a Pound; achievements always pay Pounds.

   Uses the same shared sign-in as the games gate (auth-store.js). No
   sign-in, no pence - the game still works.
   ===================================================================== */
(function(){
  var URL = "https://hehs-live.duckdns.org";
  var KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzkyODMyMjkwLCJleHAiOjIxMDgxOTIyOTB9.7gFhQa5RBwVtiOPLO7Qf2-aVEbkd5xgpLiN1J06Gybo";
  var SKEY = "sb-hehs-live-auth-token";
  function token(){
    try {
      var raw = (window.HEHAuth && window.HEHAuth.get) ? window.HEHAuth.get(SKEY) : localStorage.getItem(SKEY);
      var s = JSON.parse(raw || "null");
      if (!s || !s.access_token) return null;
      if (s.expires_at && s.expires_at * 1000 < Date.now()) return null;
      return s.access_token;
    } catch (e) { return null; }
  }
  function pop(n){
    var d = document.createElement("div");
    d.textContent = "+" + n + "p";
    d.setAttribute("role", "status");
    d.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:99999;padding:8px 14px;border-radius:999px;" +
      "background:#16a34a;color:#fff;font:700 15px system-ui,sans-serif;box-shadow:0 8px 24px -8px rgba(0,0,0,.5);transition:opacity .4s";
    document.body.appendChild(d);
    setTimeout(function(){ d.style.opacity = "0"; }, 1600);
    setTimeout(function(){ d.remove(); }, 2100);
  }
  window.HEHEarn = {
    played: function(game, score){
      var t = token(); if (!t) return;
      fetch(URL + "/functions/v1/profile", {
        method: "POST", keepalive: true,
        headers: { "Authorization": "Bearer " + t, "apikey": KEY, "content-type": "application/json" },
        body: JSON.stringify({ action: "played", game: String(game || "game"), score: Math.max(0, Math.floor(Number(score) || 0)) })
      }).then(function(r){ return r.ok ? r.json() : null; }).then(function(j){
        if (j && j.gained > 0) pop(j.gained);
      }).catch(function(){});
    }
  };
})();
