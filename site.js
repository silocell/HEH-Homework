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
      return h === OWNER_HASH;
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
      bar.innerHTML = "<span><b>The Suite is blocked on this network.</b> Write, Grid, Present and the other Suite apps won't open here in the browser. Use the Launchpad app instead.</span>" +
        "<a href=\"/app/\">Get the app</a><button type=\"button\" aria-label=\"Hide for today\">✕</button>";
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
