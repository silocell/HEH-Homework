/* site.js - loaded by every Launchpad site (civilinitiatives.org and all its
   subdomains), as early as possible in <head>.

   1. LIGHT MODE. Weaker phones and laptops get the same pages without the
      frosted glass, blur, shadows and animations, which are what make
      scrolling stutter. Decided from the device itself (memory, cores,
      data saver, slow connection, "reduce motion") and then from how
      smoothly the first second actually draws. Anyone can force it either
      way: localStorage "hl.lite" = "on" / "off".

   2. MAINTENANCE. When the switch in Maintenance closes the site, every
      subdomain shows the "Under maintenance" screen too, not just the main
      page. Only the owner account gets past it. The main page keeps its
      own gate, so this stays out of its way there.

   3. SUITE BLOCKED. Some networks (school Wi-Fi) block suite.civilinitiatives.org
      while the rest works. The main page checks quietly and, if the Suite
      can't be reached, says so and points to the Launchpad app.        */
(function () {
  "use strict";
  var ROOT = "civilinitiatives.org";
  var API = "https://hehs-live.duckdns.org";
  var KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzkyODMyMjkwLCJleHAiOjIxMDgxOTIyOTB9.7gFhQa5RBwVtiOPLO7Qf2-aVEbkd5xgpLiN1J06Gybo";
  var OWNER_HASH = "747e511bdf6129b4347b4d4e0292c64db92d3e7ab2f41da57de0968becb8d0a9";
  var CLOSED_OK = ["fd804b4f914bd60f44b2e14460ff9e6c98639bf7152ba7e62fda4c1c11baca8b","21639513153d5858f6f5aa97b49c5caa8663cd513dc52081b66ce35b310b7c97"];
  var html = document.documentElement;
  var inApp = /LaunchpadApp\//.test(navigator.userAgent);
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  /* ---------------- 1. light mode ---------------- */
  var LITE_CSS =
    "html.lite *,html.lite *::before,html.lite *::after{" +
      "backdrop-filter:none!important;-webkit-backdrop-filter:none!important;" +
      "animation-duration:.001s!important;animation-iteration-count:1!important;" +
      "transition-duration:.001s!important;scroll-behavior:auto!important}" +
    "html.lite *:not(input):not(textarea):not(button){box-shadow:none!important;text-shadow:none!important}" +
    "html.lite [style*='blur(']{filter:none!important}" +
    "html.lite body{background-attachment:scroll!important}" +
    "html.lite img{content-visibility:auto}" +
    "html.lite .tile,html.lite .card,html.lite section{contain:content}";
  function addStyle(css) { var s = document.createElement("style"); s.textContent = css; (document.head || html).appendChild(s); }
  addStyle(LITE_CSS);

  /* Phones: tapping something quickly (five taps on a title, a game button)
     must not double-tap-zoom the page in and out - in the app that looked
     like the page glitching and reloading. Pinch zoom still works. Also
     stops phones blowing text up on their own when turned sideways. */
  addStyle("html{touch-action:manipulation;-webkit-text-size-adjust:100%;text-size-adjust:100%}" +
    "a,button,[role=button],summary,label{-webkit-tap-highlight-color:transparent}");
  /* A page that forgot to say how wide it is would show zoomed out on a phone. */
  if (!document.querySelector("meta[name=viewport]")) {
    var vp = document.createElement("meta"); vp.name = "viewport"; vp.content = "width=device-width, initial-scale=1";
    (document.head || html).appendChild(vp);
  }

  function weakDevice() {
    var n = navigator, c = n.connection || {};
    if (c.saveData) return true;
    if (/(^|-)2g$|^3g$/.test(c.effectiveType || "")) return true;
    if (n.deviceMemory && n.deviceMemory <= 4) return true;
    if (n.hardwareConcurrency && n.hardwareConcurrency <= 4) return true;
    try { if (matchMedia("(prefers-reduced-motion: reduce)").matches) return true; } catch (e) {}
    return false;
  }
  var force = ls("hl.lite");
  var lite = force === "on" ? true : force === "off" ? false : (ls("hl.lite.seen") === "1" || weakDevice());
  if (lite) html.classList.add("lite");

  /* If nothing gave it away, watch the first few seconds of drawing. Lots of
     long frames means the device is struggling: switch to light mode now and
     remember it for next time. */
  if (!lite && force !== "off" && window.requestAnimationFrame) {
    var last = 0, frames = 0, slow = 0, start = 0;
    var tick = function (t) {
      if (!start) start = t;
      if (last) { frames++; if (t - last > 34) slow++; }
      last = t;
      if (t - start < 4000 && !document.hidden) requestAnimationFrame(tick);
      else if (frames > 20 && slow / frames > 0.25) { html.classList.add("lite"); ls("hl.lite.seen", "1"); }
    };
    var go = function () { setTimeout(function () { requestAnimationFrame(tick); }, 800); };
    if (document.readyState === "complete") go(); else addEventListener("load", go);
  }
  window.HEHLite = {
    on: function () { return html.classList.contains("lite"); },
    set: function (v) { ls("hl.lite", v ? "on" : "off"); html.classList.toggle("lite", !!v); },
    auto: function () { try { localStorage.removeItem("hl.lite"); localStorage.removeItem("hl.lite.seen"); } catch (e) {} }
  };

  /* ---------------- 4. the look: Glass or Notebook ----------------
     Notebook is the exercise book from chausima.com: squared paper, a red
     margin line, solid white cards with biro-blue edges, notebook-shaped
     buttons. Chosen in "Make it yours" on the Launchpad; a cookie shares it
     with every *.civilinitiatives.org site. Glass is the default. Games
     that fill the screen keep their own look. */
  var NB_SKIP = /^(gaterun)\./i.test(location.hostname);
  var NB_CSS =
    ":root.nb{--nb-paper:#fdfdf8;--nb-grid:#d5e4f5;--nb-grid2:#b9d1ee;--nb-margin:#e2474b;--nb-ink:#1f3a93;--nb-card:#ffffff;--nb-line:#c9d6e8;--nb-text:#262a33;--nb-soft:#5b6170;--nb-hl:#ffe94a}" +
    ":root.nb[data-theme=dark]{--nb-paper:#1d2a24;--nb-grid:rgba(255,255,255,.05);--nb-grid2:rgba(255,255,255,.09);--nb-margin:#f07a7d;--nb-ink:#f3f1e4;--nb-card:#22302a;--nb-line:rgba(255,255,255,.16);--nb-text:#ecebe2;--nb-soft:#aab4ad;--nb-hl:#e8d34a}" +
    "@media (prefers-color-scheme:dark){:root.nb:not([data-theme=light]){--nb-paper:#1d2a24;--nb-grid:rgba(255,255,255,.05);--nb-grid2:rgba(255,255,255,.09);--nb-margin:#f07a7d;--nb-ink:#f3f1e4;--nb-card:#22302a;--nb-line:rgba(255,255,255,.16);--nb-text:#ecebe2;--nb-soft:#aab4ad;--nb-hl:#e8d34a}}" +
    /* the sites' own colour names, pointed at the notebook (the #nb keeps these ahead of each page's own) */
    ":root.nb:not(#nb){--paper:var(--nb-paper);--bg:var(--nb-paper);--card:var(--nb-card);--chip:var(--nb-card);--rule:var(--nb-line);--line:var(--nb-line);--margin:var(--nb-margin);--lg-tint:100%;--lg-blur:0px}" +
    ":root.nb:not([data-accent]):not(#nb){--accent:var(--nb-ink);--a1:var(--nb-ink)}" +
    "html.nb body{background-color:var(--nb-paper)!important;background-image:linear-gradient(var(--nb-grid2) 1px,transparent 1px),linear-gradient(90deg,var(--nb-grid2) 1px,transparent 1px),linear-gradient(var(--nb-grid) 1px,transparent 1px),linear-gradient(90deg,var(--nb-grid) 1px,transparent 1px)!important;background-size:120px 120px,120px 120px,24px 24px,24px 24px!important}" +
    "html.nb body::before{content:''!important;display:block!important;position:fixed!important;top:0!important;bottom:0!important;right:auto!important;left:max(10px,calc(50vw - 650px))!important;width:2px!important;height:auto!important;inset:auto;background:var(--nb-margin)!important;opacity:.55!important;filter:none!important;animation:none!important;transform:none!important;pointer-events:none!important;z-index:0!important}" +
    "html.nb .card,html.nb .panel,html.nb .tile,html.nb .stat,html.nb .sheet,html.nb .modal,html.nb .sec,html.nb dialog{background:var(--nb-card)!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important;border:1.5px solid var(--nb-line)!important;border-radius:4px 4px 14px 4px!important;box-shadow:3px 3px 0 color-mix(in srgb,var(--nb-ink) 10%,transparent)!important}" +
    "html.nb .topbar{background:var(--nb-card)!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important;border:2px solid var(--nb-ink)!important;border-radius:4px 4px 16px 4px!important;box-shadow:4px 4px 0 color-mix(in srgb,var(--nb-ink) 14%,transparent)!important}" +
    "html.nb .top{background:var(--nb-ink)!important;color:var(--nb-paper)!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important;box-shadow:none!important}" +
    "html.nb .top a,html.nb .top b,html.nb .top button{color:inherit}" +
    "html.nb .btn,html.nb .abtn{border-radius:4px 4px 12px 4px!important;box-shadow:2px 2px 0 color-mix(in srgb,var(--nb-ink) 20%,transparent)!important}" +
    "html.nb .ghost-btn,html.nb .mode-btn,html.nb .chip-btn{border-radius:4px 4px 10px 4px!important}" +
    "html.nb input[type=text],html.nb input[type=search],html.nb input[type=email],html.nb input[type=password],html.nb input:not([type]),html.nb textarea,html.nb select{border-radius:4px 4px 10px 4px!important;background-color:var(--nb-card)}" +
    "html.nb h1{font-family:'Bricolage Grotesque',system-ui,sans-serif;color:var(--nb-ink);letter-spacing:-.03em}" +
    "html.nb .panel-title,html.nb .eyebrow,html.nb .kicker,html.nb .guide-kicker{font-family:'Kalam','Comic Sans MS',cursive!important;color:var(--nb-margin)!important;text-transform:none!important;letter-spacing:0!important;font-size:1.02rem!important;font-weight:700!important}" +
    "html.nb ::selection{background:color-mix(in srgb,var(--nb-hl) 75%,transparent)}";
  function lookNow() {
    var m = document.cookie.match(/(?:^|; )hl_look=(glass|notebook)/);
    return m ? m[1] : (ls("hl.look") === "notebook" ? "notebook" : "glass");
  }
  var nbStyle = null;
  function applyLook(l) {
    var on = l === "notebook" && !NB_SKIP;
    if (on && !nbStyle) {
      nbStyle = document.createElement("style"); nbStyle.id = "hehNotebook"; nbStyle.textContent = NB_CSS; (document.head || html).appendChild(nbStyle);
      var f = document.createElement("link"); f.rel = "stylesheet";
      f.href = "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=Kalam:wght@400;700&display=swap";
      (document.head || html).appendChild(f);
    }
    html.classList.toggle("nb", on);
  }
  applyLook(lookNow());
  window.HEHLook = {
    get: lookNow,
    set: function (l) {
      l = l === "notebook" ? "notebook" : "glass";
      ls("hl.look", l);
      if (/(^|\.)civilinitiatives\.org$/.test(location.hostname))
        document.cookie = "hl_look=" + l + "; domain=.civilinitiatives.org; path=/; max-age=34560000; secure; samesite=lax";
      applyLook(l);
    }
  };

  /* ---------------- 2. maintenance on every subdomain ---------------- */
  function cookies() {
    var out = {}, all = document.cookie ? document.cookie.split("; ") : [];
    for (var i = 0; i < all.length; i++) { var e = all[i].indexOf("="); if (e > 0) out[all[i].slice(0, e)] = all[i].slice(e + 1); }
    return out;
  }
  function sessionEmail() {
    var raw = null, c = cookies(), k, i;
    for (k in c) {
      var m = k.match(/^(sb-.*-auth-token)(\.0)?$/); if (!m) continue;
      var enc = c[m[1]] !== undefined ? c[m[1]] : "";
      if (!enc) for (i = 0; c[m[1] + "." + i] !== undefined; i++) enc += c[m[1] + "." + i];
      try { raw = decodeURIComponent(enc); } catch (e) {}
      if (raw) break;
    }
    if (!raw) try {
      for (i = 0; i < localStorage.length; i++) { k = localStorage.key(i); if (/^sb-.*-auth-token$/.test(k)) { raw = localStorage.getItem(k); break; } }
    } catch (e) {}
    if (!raw) return null;
    try {
      var s = JSON.parse(raw); s = s.currentSession || s;
      if (s.user && s.user.email) return s.user.email;
      var p = s.access_token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      return JSON.parse(atob(p)).email || null;
    } catch (e) { return null; }
  }
  function isOwner(email) {
    if (!email || !window.crypto || !crypto.subtle) return Promise.resolve(false);
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(email).trim().toLowerCase())).then(function (b) {
      var h = Array.prototype.map.call(new Uint8Array(b), function (x) { return ("0" + x.toString(16)).slice(-2); }).join("");
      if (h === OWNER_HASH) return true;
      /* also let in while closed (SHA-256 of the part before the @, so the names aren't here) */
      var local = String(email).trim().toLowerCase().split("@")[0];
      return crypto.subtle.digest("SHA-256", new TextEncoder().encode(local)).then(function (b2) {
        var h2 = Array.prototype.map.call(new Uint8Array(b2), function (x) { return ("0" + x.toString(16)).slice(-2); }).join("");
        return CLOSED_OK.indexOf(h2) !== -1;
      });
    }, function () { return false; });
  }
  function readStatus() {
    var ctl = window.AbortController ? new AbortController() : null;
    var t = setTimeout(function () { if (ctl) ctl.abort(); }, 6000);
    return fetch(API + "/rest/v1/site_status?id=eq.1&select=open_now,message", {
      headers: { apikey: KEY, Authorization: "Bearer " + KEY }, cache: "no-store", signal: ctl ? ctl.signal : undefined
    }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (rows) { clearTimeout(t); return rows && rows[0] ? rows[0] : null; },
            function () { clearTimeout(t); return null; });   // can't tell -> stays open, like the main page
  }
  var shown = null;
  function showClosed(msg) {
    if (shown) { shown.querySelector("p").textContent = msg; return; }
    addStyle(
      "#hehClosed{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:16px;" +
        "background:#0f172a;color:#e2e8f0;font:16px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}" +
      "#hehClosed>div{max-width:440px;background:#1e293b;border:1px solid #334155;border-radius:20px;padding:28px 24px;text-align:center}" +
      "#hehClosed h1{margin:0 0 8px;font-size:1.5rem;color:#fff}#hehClosed p{margin:0 0 18px;color:#cbd5e1}" +
      "#hehClosed a{display:inline-block;background:#6366f1;color:#fff;border-radius:12px;padding:10px 16px;text-decoration:none;font-weight:600}" +
      "html.heh-closed body{overflow:hidden!important}");
    shown = document.createElement("div"); shown.id = "hehClosed"; shown.setAttribute("role", "alertdialog"); shown.setAttribute("aria-modal", "true");
    shown.innerHTML = "<div><h1>Under maintenance</h1><p></p><a href=\"https://" + ROOT + "/\">Go to the Launchpad</a></div>";
    shown.querySelector("p").textContent = msg;
    html.classList.add("heh-closed");
    document.body.appendChild(shown);
    try { document.body.inert = true; shown.inert = false; } catch (e) {}
  }
  function hideClosed() {
    if (!shown) return;
    shown.remove(); shown = null; html.classList.remove("heh-closed");
    try { document.body.inert = false; } catch (e) {}
  }
  var ownGate = false;
  function checkLock() {
    if (ownGate || document.hidden) return;
    readStatus().then(function (row) {
      if (!row || row.open_now !== false) { hideClosed(); return; }
      isOwner(sessionEmail()).then(function (owner) {
        if (owner) { hideClosed(); return; }
        showClosed(row.message || "The site is being worked on at the moment. It'll be back shortly.");
      });
    });
  }

  /* ---------------- 3. is the Suite blocked here? ---------------- */
  function checkSuite() {
    if (location.hostname !== ROOT || inApp || !navigator.onLine) return;
    if (sessionStorage.getItem("hl.suiteok")) return;
    var img = new Image(), done = false;
    var fail = function () {
      if (done) return; done = true;
      if (ls("hl.suitebar.off") === String(new Date().toDateString())) return;
      addStyle(
        "#hehSuiteBar{position:fixed;left:12px;right:12px;bottom:12px;z-index:2147483000;display:flex;gap:10px;align-items:center;flex-wrap:wrap;" +
          "max-width:640px;margin:0 auto;padding:12px 14px;border-radius:16px;background:#1e293b;color:#f1f5f9;border:1px solid #475569;" +
          "font:14px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.35)}" +
        "#hehSuiteBar span{flex:1;min-width:200px}#hehSuiteBar a{background:#6366f1;color:#fff;border-radius:10px;padding:7px 12px;text-decoration:none;font-weight:600}" +
        "#hehSuiteBar button{border:0;background:transparent;color:#94a3b8;font-size:1.2rem;cursor:pointer;padding:2px 6px}");
      var bar = document.createElement("div"); bar.id = "hehSuiteBar"; bar.setAttribute("role", "status");
      bar.innerHTML = "<span><b>You're on the school network, where the Suite is blocked.</b> Write, Grid, Present and the other Suite apps won't open in the browser here. Install the Launchpad app instead.</span>" +
        "<a href=\"/app/\">Install the app</a><button type=\"button\" aria-label=\"Hide for today\">✕</button>";
      bar.querySelector("button").onclick = function () { bar.remove(); ls("hl.suitebar.off", new Date().toDateString()); };
      document.body.appendChild(bar);
    };
    img.onload = function () { done = true; try { sessionStorage.setItem("hl.suiteok", "1"); } catch (e) {} };
    img.onerror = fail;
    setTimeout(fail, 8000);
    img.src = "https://suite." + ROOT + "/favicon.png?ping=" + Date.now();
  }

  function ready() {
    ownGate = !!document.getElementById("closed");      // the main page has its own gate
    checkLock();
    setInterval(checkLock, 60000);
    document.addEventListener("visibilitychange", checkLock);
    setTimeout(checkSuite, 2500);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready); else ready();
})();
