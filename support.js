/* support.js - the 💬 Help button on the Launchpad.
   A small chat in the corner that answers questions about the site.
   - Signed in and the server has it: asks Launchpad AI (hwchat, action "support"),
     which knows the Launchpad, is free, and goes through the same safety check
     and personal-info filter as every other Launchpad AI message.
   - Otherwise: answers from the short FAQ below.
   - Always: "Still stuck?" sends it to the help desk (hwl@chausima.com).
   Nothing typed here is kept on this device. */
(function () {
  if (window.__hlSupport) return; window.__hlSupport = true;
  var URL_ = "https://hehs-live.duckdns.org";
  var KEY_ = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzkyODMyMjkwLCJleHAiOjIxMDgxOTIyOTB9.7gFhQa5RBwVtiOPLO7Qf2-aVEbkd5xgpLiN1J06Gybo";  // public (anon) key
  var HELPDESK = "hwl@chausima.com";

  var FAQ = [
    [/pence|pounds|coins?|money|earn|points/i, "You earn 1p for every right answer in HWL Learning (Brainstorm Maths, XP Reader, Chemically Scientific, Word Passport, Times Tables and the rest). Pence add up into Launchpad Pounds, which you can spend in the Shop and the Game Maker."],
    [/homework|due|week|friday|deadline/i, "Homework in the HWL Learning apps runs from Friday 9am to the next Friday 9am. Open 🎒 My homework on learn.civilinitiatives.org to see what's set and how far you've got. Anything you get wrong comes back at the end so you can fix it."],
    [/password|log ?in|sign ?in|locked|can'?t get in|account/i, "If you can't sign in, ask a Launchpad helper or your teacher - they can check your account. For safety, passwords are never reset by email, even if you ask the help desk."],
    [/report|rude|bully|unsafe|inappropriate/i, "Use the ⚑ Report button next to any message, board post, picture or game. It goes straight to the people who look after the site. If something is serious or upsetting, tell a teacher or a trusted adult too."],
    [/game ?maker|make (a |my |your )?(own )?games?|my game/i, "The Game Maker (sandbox.civilinitiatives.org) builds a game from your idea. A safeguard checks the idea first, then Claude builds it - usually within the hour. It costs Pounds, and if it can't be built you get them back."],
    [/launchpad ai|\bai\b|chatbot|claude/i, "Launchpad AI (ai.civilinitiatives.org) helps with homework: explanations, revision and writing help. The free AIs cost nothing; Claude costs a few pence per answer. It never sees your personal details - they're taken out first."],
    [/lag|slow|crash|freez|smooth|phone/i, "If the site feels slow, open the dashboard's Smoothness setting and pick Smooth or Lite - it turns off the heavy effects. Auto picks for you based on your device."],
    [/what is|about|who made|teacher|parent/i, "The Homework Launchpad is a free set of homework tools, HWL Learning and apps for secondary-school pupils, built by a student. Teachers and parents can read more on the About page: civilinitiatives.org/about.html"]
  ];
  function faqAnswer(q) {
    for (var i = 0; i < FAQ.length; i++) if (FAQ[i][0].test(q)) return FAQ[i][1];
    return null;
  }

  var css = ".hls-btn{position:fixed;right:max(14px,env(safe-area-inset-right));bottom:max(14px,env(safe-area-inset-bottom));z-index:9000;border:0;border-radius:999px;padding:11px 16px;font:600 15px system-ui,-apple-system,sans-serif;background:#1f6feb;color:#fff;box-shadow:0 4px 14px rgba(0,0,0,.25);cursor:pointer}" +
    ".hls-btn:focus-visible{outline:3px solid #fff;outline-offset:2px}" +
    ".hls-box{position:fixed;right:max(10px,env(safe-area-inset-right));bottom:max(10px,env(safe-area-inset-bottom));z-index:9001;width:min(360px,calc(100vw - 20px));max-height:min(540px,calc(100vh - 20px));display:flex;flex-direction:column;background:#fff;color:#18222c;border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,.3);font:15px/1.45 system-ui,-apple-system,sans-serif;overflow:hidden}" +
    "@media (prefers-color-scheme:dark){.hls-box{background:#19222b;color:#e4eaf0}.hls-m.u{background:#2c3946}.hls-in{background:#11171d;color:#e4eaf0;border-color:#2c3946}}" +
    ".hls-h{display:flex;align-items:center;gap:8px;padding:12px 14px;background:#1f6feb;color:#fff;font-weight:700}.hls-h span{flex:1}.hls-x{background:none;border:0;color:#fff;font-size:20px;cursor:pointer;padding:0 4px}" +
    ".hls-log{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px}" +
    ".hls-m{padding:8px 11px;border-radius:12px;max-width:88%;white-space:pre-wrap;overflow-wrap:anywhere}.hls-m.a{background:rgba(31,111,235,.1);align-self:flex-start}.hls-m.u{background:#eef1f4;align-self:flex-end}" +
    ".hls-chips{display:flex;flex-wrap:wrap;gap:6px}.hls-chip{border:1px solid rgba(31,111,235,.4);background:none;color:inherit;border-radius:999px;padding:5px 10px;font:inherit;font-size:13px;cursor:pointer}" +
    ".hls-f{display:flex;gap:6px;padding:10px;border-top:1px solid rgba(127,127,127,.25)}.hls-in{flex:1;min-width:0;border:1px solid #d6dde4;border-radius:10px;padding:9px 10px;font:inherit}" +
    ".hls-send{border:0;border-radius:10px;background:#1f6feb;color:#fff;font:600 14px system-ui;padding:0 14px;cursor:pointer}" +
    ".hls-desk{display:block;text-align:center;font-size:13px;padding:0 12px 10px;color:inherit;opacity:.8}";
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  var btn = document.createElement("button"); btn.type = "button"; btn.className = "hls-btn"; btn.textContent = "💬 Help"; btn.setAttribute("aria-label", "Open Launchpad help");
  var box = null, log, input, history = [], busy = false;

  function add(role, text) { var m = document.createElement("div"); m.className = "hls-m " + role; m.textContent = text; log.appendChild(m); log.scrollTop = log.scrollHeight; return m; }
  function client() {
    if (window.sb && window.sb.auth) return window.sb;
    try { if (window.HEHLearn && HEHLearn.connect) return HEHLearn.connect(); } catch (e) {}
    return null;
  }
  function session() {
    var c = client(); if (!c) return Promise.resolve(null);
    return c.auth.getSession().then(function (s) { return s.data && s.data.session; }, function () { return null; });
  }
  function askServer(q) {
    return session().then(function (s) {
      if (!s || !s.access_token) return null;
      var key = KEY_;
      return fetch(URL_ + "/functions/v1/hwchat", { method: "POST", headers: { Authorization: "Bearer " + s.access_token, apikey: key, "content-type": "application/json" },
        body: JSON.stringify({ action: "support", page: location.hostname + location.pathname, messages: history.slice(-8) }) })
        .then(function (r) { return r.json(); }).then(function (d) { return d && d.reply ? d.reply : null; }, function () { return null; });
    });
  }
  function ask(q) {
    if (busy || !q.trim()) return; busy = true;
    add("u", q); history.push({ role: "user", text: q });
    var wait = add("a", "…");
    askServer(q).then(function (r) {
      var ans = r || faqAnswer(q) || "I'm not sure about that one. Press \"Send to the help desk\" below and someone will get back to you.";
      wait.textContent = ans; history.push({ role: "ai", text: ans });
    }, function () { wait.textContent = faqAnswer(q) || "I couldn't reach the server. Try again, or send it to the help desk."; })
      .then(function () { busy = false; log.scrollTop = log.scrollHeight; });
  }
  function open() {
    if (box) { box.hidden = false; btn.hidden = true; input.focus(); return; }
    box = document.createElement("div"); box.className = "hls-box"; box.setAttribute("role", "dialog"); box.setAttribute("aria-label", "Launchpad help");
    var h = document.createElement("div"); h.className = "hls-h"; var t = document.createElement("span"); t.textContent = "💬 Launchpad help"; h.appendChild(t);
    var x = document.createElement("button"); x.type = "button"; x.className = "hls-x"; x.textContent = "×"; x.setAttribute("aria-label", "Close help"); x.onclick = close; h.appendChild(x);
    log = document.createElement("div"); log.className = "hls-log"; log.setAttribute("aria-live", "polite");
    var f = document.createElement("form"); f.className = "hls-f";
    input = document.createElement("input"); input.className = "hls-in"; input.placeholder = "Ask about the Launchpad…"; input.setAttribute("aria-label", "Your question"); input.maxLength = 500;
    var s = document.createElement("button"); s.className = "hls-send"; s.textContent = "Ask";
    f.appendChild(input); f.appendChild(s);
    f.onsubmit = function (e) { e.preventDefault(); var q = input.value; input.value = ""; ask(q); };
    var desk = document.createElement("a"); desk.className = "hls-desk"; desk.textContent = "Still stuck? Send to the help desk";
    desk.href = "mailto:" + HELPDESK + "?subject=" + encodeURIComponent("Launchpad help: " + location.hostname);
    box.appendChild(h); box.appendChild(log); box.appendChild(f); box.appendChild(desk);
    document.body.appendChild(box);
    add("a", "Hi! I can help with the Launchpad - homework, earning pence, the Game Maker, Launchpad AI, or anything not working. Don't type passwords or personal details here.");
    var chips = document.createElement("div"); chips.className = "hls-chips";
    ["How do I earn pence?", "When is homework due?", "I can't sign in", "The site is slow"].forEach(function (c) {
      var b = document.createElement("button"); b.type = "button"; b.className = "hls-chip"; b.textContent = c; b.onclick = function () { chips.remove(); ask(c); }; chips.appendChild(b);
    });
    log.appendChild(chips);
    btn.hidden = true; input.focus();
  }
  function close() { box.hidden = true; btn.hidden = false; btn.focus(); }
  btn.onclick = open;
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && box && !box.hidden) close(); });
  function mount() { document.body.appendChild(btn); }
  if (document.body) mount(); else document.addEventListener("DOMContentLoaded", mount);
})();
