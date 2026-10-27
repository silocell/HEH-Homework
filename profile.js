/* =====================================================================
   Your profile, in the top bar of the dashboard: your picture, name,
   account email, points, Launchpad Pounds and achievements - and the
   way into the Launchpad Shop (shop.civilinitiatives.org), where you
   buy and wear things.

   Pictures are drawn by avatar.js (the same code the shop uses), from
   the look the server keeps for you (the "profile" function). This page
   only shows it. A copy is kept on this device so the picture appears
   straight away next time. The dashboard theme you're wearing (bought
   in the shop) is applied here too.

   In the chat and on the board, every name gets that person's picture and
   tag. The dashboard's addStaffTag() already runs for each name (it adds
   "Admin"/"Helper"), so this wraps it. Pictures are asked for in one batch
   ("looks": display parts only, never emails) and kept for two minutes.
   ===================================================================== */
(function(){
  var CACHE = "hl.profile2";
  var SHOP = "https://shop.civilinitiatives.org/";
  var LEVELUP = "https://learn.civilinitiatives.org/levelup.html";
  var S = null;               // what the profile function's "get" returns
  var tab = "me";

  function el(tag, cls, text){ var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function read(){ try { return JSON.parse(localStorage.getItem(CACHE)); } catch(e){ return null; } }
  function keep(v){ try { localStorage.setItem(CACHE, JSON.stringify(v)); } catch(e){} }
  function user(){ return window.currentUser || {}; }
  function initial(){
    var n = (user().name || user().email || "?").trim();
    return (n.charAt(0) || "?").toUpperCase();
  }
  function A(){ return window.HEHAvatar; }
  function setState(st){
    S = st; keep({ look: st.look, pts: st.pts, pounds: st.pounds, role: st.role });
    paintButton();
    var me = user().uid;
    if (me && st.look) { LOOKS[me] = { look: st.look, at: Date.now() }; redecorate(me); }
    if (A()) A().ready.then(function(){ A().applyTheme(S.look); });
  }
  function call(body){
    if (!window.sb || !sb.functions) return Promise.reject(new Error("Sign in first."));
    return sb.functions.invoke("profile", { body: body }).then(function(r){
      if (r.error) {
        var ctx = r.error.context;
        if (ctx && ctx.json) return ctx.json().then(function(j){ throw new Error(j && j.error || "Something went wrong."); });
        throw new Error("Something went wrong.");
      }
      if (r.data && r.data.error) throw new Error(r.data.error);
      return r.data;
    });
  }
  function pic(size){
    if (!A() || !S) { var d = el("span", "pf-fallback", initial()); d.style.setProperty("--s", size + "px"); return d; }
    return A().el(S.look, size, { initial: initial() });
  }
  function nameEl(tag, text){ return A() && S ? A().nameEl(tag, text, S.look) : el(tag, null, text); }

  /* ---------- the button in the top bar ---------- */
  var btn = null;
  function paintButton(){
    if (!btn) return;
    btn.textContent = "";
    btn.appendChild(pic(30));
    var first = (user().name || "").split(" ")[0];
    if (first) { var n = nameEl("span", first); n.classList.add("pf-name"); btn.appendChild(n); }
  }
  function addButton(){
    var bar = document.querySelector(".topbar-actions"), out = document.getElementById("switchBtn");
    if (!bar || document.getElementById("meBtn")) return;
    btn = el("button", "ghost-btn pf-btn"); btn.id = "meBtn"; btn.type = "button";
    btn.setAttribute("aria-label", "Your profile");
    btn.title = "Your profile";
    btn.addEventListener("click", open);
    bar.insertBefore(btn, out);
    paintButton();
  }

  /* ---------- the profile sheet ---------- */
  var veil = null;
  function close(){ if (veil) { veil.remove(); veil = null; document.removeEventListener("keydown", esc); if (btn) btn.focus(); } }
  function esc(e){ if (e.key === "Escape") close(); }
  function open(){
    if (veil) return;
    veil = el("div", "pf-veil");
    veil.addEventListener("click", function(e){ if (e.target === veil) close(); });
    var sheet = el("div", "pf-sheet"); sheet.setAttribute("role", "dialog"); sheet.setAttribute("aria-modal", "true");
    sheet.setAttribute("aria-label", "Your profile");
    veil.appendChild(sheet); document.body.appendChild(veil);
    document.addEventListener("keydown", esc);
    paintSheet();
    call({ action:"get" }).then(function(st){ setState(st); paintSheet(); }, function(){});
  }
  function paintSheet(){
    if (!veil) return;
    var sheet = veil.querySelector(".pf-sheet");
    sheet.textContent = "";
    var head = el("div", "pf-head");
    var x = el("button", "ghost-btn pf-x", "Close"); x.type = "button"; x.addEventListener("click", close);
    head.appendChild(el("h3", null, "Your profile")); head.appendChild(x);
    sheet.appendChild(head);

    var me = el("div", "pf-me");
    me.appendChild(pic(104));
    var who = el("div", "pf-who");
    var nm = nameEl("b", user().name || "You");
    if (S && S.role) nm.appendChild(el("span", "pf-role " + S.role, S.role === "owner" ? "Founder" : "Helper"));
    who.appendChild(nm);
    var myTag = A() && S && S.look ? A().tagEl(S.look) : null;
    if (myTag) { var tw = el("span", "pf-mytag"); tw.appendChild(myTag); who.appendChild(tw); }
    who.appendChild(el("span", "pf-email", user().email || ""));
    if (S) {
      var bank = el("span", "pf-pts");
      bank.appendChild(el("span", null, "⭐ " + (S.pts || 0).toLocaleString() + " points"));
      bank.appendChild(el("span", "pf-lp", "🪙 " + (S.pounds || 0) + " Launchpad Pound" + (S.pounds === 1 ? "" : "s")));
      who.appendChild(bank);
    }
    me.appendChild(who);
    sheet.appendChild(me);

    var go = el("a", "pf-shop");
    go.href = SHOP;
    go.appendChild(el("span", "pf-shop-ic", "🛍️"));
    var t = el("span");
    t.appendChild(el("b", null, "Open the Launchpad Shop"));
    t.appendChild(el("small", null, "Over a thousand things for your picture - characters, hats, frames, themes. Rare ones are rare."));
    go.appendChild(t);
    sheet.appendChild(go);

    if (!S || !S.rules) { sheet.appendChild(el("p", "pf-muted", "Loading…")); return; }

    var tabs = el("div", "pf-tabs"); tabs.setAttribute("role", "tablist");
    [["me", "🪙 Earning"], ["ach", "🏅 Achievements"]].forEach(function(p){
      var b = el("button", "pf-tab", p[1]); b.type = "button";
      b.setAttribute("role", "tab"); b.setAttribute("aria-selected", tab === p[0] ? "true" : "false");
      b.addEventListener("click", function(){ tab = p[0]; paintSheet(); });
      tabs.appendChild(b);
    });
    sheet.appendChild(tabs);
    if (tab === "ach") paintAchievements(sheet); else paintEarning(sheet);
  }

  function paintEarning(sheet){
    var r = S.rules || { perPound:20, subjectCap:2, dayCap:5 };
    var today = S.today || [];
    var got = today.reduce(function(n, t){ return n + t.pounds; }, 0);
    var box = el("div", "pf-today");
    box.appendChild(el("b", null, "Today: 🪙 " + Math.min(got, r.dayCap) + " of " + r.dayCap));
    box.appendChild(el("p", null, "Every " + r.perPound + " right answers in a subject earns a Launchpad Pound - up to " + r.subjectCap +
      " per subject and " + r.dayCap + " a day. Level Up, Word Dragons, Times Table Tycoon, Map Quest, Battle Stories and flash cards all count."));
    today.forEach(function(t){
      var row = el("div", "pf-subj");
      row.appendChild(el("span", null, t.subject.charAt(0).toUpperCase() + t.subject.slice(1)));
      var n = t.pounds >= r.subjectCap ? "done for today" : (r.perPound - t.correct % r.perPound) + " more right for the next 🪙";
      row.appendChild(el("small", null, t.correct + " right · " + n));
      box.appendChild(row);
    });
    var lu = el("a", "pf-earn", "⭐ Earn points in Level Up →"); lu.href = LEVELUP;
    box.appendChild(lu);
    sheet.appendChild(box);
  }

  function paintAchievements(sheet){
    var list = el("div", "pf-achs");
    (S.achievements || []).slice().sort(function(a, b){ return (a.done - b.done) || (b.have / b.need - a.have / a.need); }).forEach(function(a){
      var row = el("div", "pf-ach" + (a.done ? " done" : ""));
      row.appendChild(el("span", "pf-ach-ic", a.done ? "🏅" : "🔒"));
      var mid = el("div", "pf-ach-mid");
      mid.appendChild(el("b", null, a.name));
      mid.appendChild(el("small", null, a.says + (a.unlocks && a.unlocks.length ? " · unlocks " + a.unlocks.join(", ") : "") + " · " + a.have + " / " + a.need));
      var bar = el("span", "pf-bar"); var fill = el("span"); fill.style.width = Math.round(100 * a.have / a.need) + "%"; bar.appendChild(fill);
      mid.appendChild(bar);
      row.appendChild(mid);
      row.appendChild(el("span", "pf-ach-r", (a.done ? "✓ " : "") + "🪙 " + a.reward));
      list.appendChild(row);
    });
    sheet.appendChild(list);
  }

  /* ---------- pictures and tags in the chat and on the board ---------- */
  var LOOKS = {};            // uid -> { look, at }
  var asking = {}, askTimer = null;
  function decorate(whoEl, uid){
    if (!whoEl || !uid || !A()) return;
    var old = whoEl.querySelectorAll(".pf-mini, .pf-ctag");
    for (var i = 0; i < old.length; i++) old[i].remove();
    var have = LOOKS[uid];
    if (!have || Date.now() - have.at > 120000) ask(uid);
    if (!have) return;
    var name = (whoEl.firstChild && whoEl.firstChild.nodeType === 3 ? whoEl.firstChild.nodeValue : whoEl.textContent || "?").trim();
    var mini = A().el(have.look, 22, { initial: (name.charAt(0) || "?").toUpperCase() });
    mini.classList.add("pf-mini");
    whoEl.insertBefore(mini, whoEl.firstChild);
    var tag = A().tagEl(have.look);
    if (tag) {
      tag.classList.add("pf-ctag");
      var colon = whoEl.querySelector(".who-colon");
      if (colon) whoEl.insertBefore(tag, colon); else whoEl.appendChild(tag);
    }
  }
  function redecorate(uid){
    var els = document.querySelectorAll('[data-uid="' + uid + '"]');
    for (var i = 0; i < els.length; i++) decorate(els[i], uid);
  }
  function ask(uid){
    if (asking[uid]) return;
    asking[uid] = true;
    if (!askTimer) askTimer = setTimeout(function(){
      askTimer = null;
      var ids = Object.keys(asking).filter(function(id){ return asking[id] === true; }).slice(0, 100);
      ids.forEach(function(id){ asking[id] = "sent"; });
      if (!ids.length) return;
      Promise.all([A().ready, call({ action:"looks", ids: ids })]).then(function(x){
        var got = (x[1] && x[1].looks) || {};
        ids.forEach(function(id){
          /* No picture saved yet = the starting look (their initial). */
          LOOKS[id] = { look: got[id] || {}, at: Date.now() };
          delete asking[id];
          redecorate(id);
        });
      }, function(){
        /* Server busy or down: leave the names plain and try again in a minute, not on every new message. */
        ids.forEach(function(id){ asking[id] = "wait"; });
        setTimeout(function(){ ids.forEach(function(id){ if (asking[id] === "wait") delete asking[id]; }); }, 60000);
      });
    }, 250);
  }
  function hookNames(){
    if (window.addStaffTag && !window.addStaffTag._pf) {
      var orig = window.addStaffTag;
      var wrapped = function(whoEl, uid){ orig(whoEl, uid); try { decorate(whoEl, uid); } catch (e) {} };
      wrapped._pf = true;
      window.addStaffTag = wrapped;
    }
    var els = document.querySelectorAll("[data-uid]");
    for (var i = 0; i < els.length; i++) decorate(els[i], els[i].getAttribute("data-uid"));
  }

  /* ---------- styles ---------- */
  var css = el("style");
  css.textContent =
    ".pf-btn{display:inline-flex;align-items:center;gap:8px;padding-top:3px;padding-bottom:3px}" +
    ".pf-name{max-width:9em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
    "@media (max-width:560px){.pf-name{display:none}}" +
    ".pf-fallback{display:inline-grid;place-items:center;width:var(--s);height:var(--s);border-radius:50%;background:linear-gradient(135deg,#60a5fa,#2563eb);color:#fff;font-weight:800}" +
    ".pf-veil{position:fixed;inset:0;z-index:9995;background:rgba(10,12,20,.55);display:grid;place-items:center;padding:16px}" +
    ".pf-sheet{position:relative;background:var(--card,#fff);color:var(--ink);border-radius:18px;padding:18px;width:min(560px,100%);" +
    "max-height:calc(100vh - 32px);overflow:auto;box-shadow:0 30px 70px -20px rgba(0,0,0,.6)}" +
    ".pf-head{display:flex;align-items:center;gap:10px;margin-bottom:8px}.pf-head h3{margin:0;flex:1;font-family:var(--font-display)}" +
    ".pf-me{display:flex;align-items:center;gap:20px;padding:22px 4px 16px}" +
    ".pf-who{display:flex;flex-direction:column;gap:3px;min-width:0}.pf-who b{font-size:1.2rem}" +
    ".pf-role{display:inline-block;font-size:.66rem;font-weight:800;letter-spacing:.05em;text-transform:uppercase;padding:2px 8px;border-radius:999px;" +
    "color:#fff;margin-left:8px;vertical-align:middle;-webkit-text-fill-color:#fff}" +
    ".pf-role.owner{background:linear-gradient(90deg,#f59e0b,#4338ca)}.pf-role.helper{background:#0d9488}" +
    ".pf-email{color:var(--ink-soft);font-size:.88rem;overflow-wrap:anywhere}" +
    ".pf-pts{margin-top:6px;font-weight:700;display:flex;flex-wrap:wrap;gap:4px 12px}.pf-lp{color:#b45309}" +
    ":root[data-theme=dark] .pf-lp{color:#fbbf24}@media (prefers-color-scheme:dark){:root:not([data-theme=light]) .pf-lp{color:#fbbf24}}" +
    ".pf-shop{display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:16px;text-decoration:none;color:#fff;margin-bottom:14px;" +
    "background:linear-gradient(100deg,#1e1b4b,#4338ca 55%,#be185d);box-shadow:0 10px 26px -14px rgba(67,56,202,.9)}" +
    ".pf-shop:hover{filter:brightness(1.08)}.pf-shop:focus-visible{outline:3px solid #fde68a;outline-offset:2px}" +
    ".pf-shop-ic{font-size:1.9rem}.pf-shop b{display:block;font-size:1.02rem}.pf-shop small{display:block;opacity:.85;font-size:.8rem}" +
    ".pf-earn{color:var(--accent);font-size:.85rem;font-weight:600;text-decoration:none;display:inline-block;margin-top:8px}.pf-earn:hover{text-decoration:underline}" +
    ".pf-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}" +
    ".pf-tab{font:inherit;font-size:.85rem;font-weight:600;padding:7px 13px;border-radius:999px;border:1px solid var(--rule);background:transparent;color:var(--ink);cursor:pointer}" +
    ".pf-tab[aria-selected=true]{background:var(--accent);border-color:var(--accent);color:var(--on-accent,#fff)}" +
    ".pf-tab:focus-visible{outline:2px solid var(--accent);outline-offset:2px}" +
    ".pf-today{border:1px solid var(--rule);border-radius:14px;padding:12px 14px}.pf-today p{margin:4px 0 6px;color:var(--ink-soft);font-size:.8rem}" +
    ".pf-subj{display:flex;justify-content:space-between;gap:10px;padding:5px 0;border-top:1px solid var(--rule);font-size:.85rem}.pf-subj small{color:var(--ink-soft)}" +
    ".pf-achs{display:flex;flex-direction:column;gap:8px}" +
    ".pf-ach{display:flex;align-items:center;gap:12px;padding:10px 12px;border:1px solid var(--rule);border-radius:12px}" +
    ".pf-ach.done{background:var(--accent-soft);border-color:var(--accent)}" +
    ".pf-ach-ic{font-size:1.4rem}.pf-ach-mid{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}" +
    ".pf-ach-mid small{color:var(--ink-soft);font-size:.76rem}.pf-ach-r{font-weight:700;white-space:nowrap}" +
    ".pf-bar{display:block;height:6px;border-radius:99px;background:var(--rule);overflow:hidden}.pf-bar span{display:block;height:100%;background:var(--accent)}" +
    ".pf-muted{color:var(--ink-soft);font-size:.8rem;margin:10px 0 0}" +
    ".pf-mytag{margin-top:2px}" +
    ".pf-mini{margin-right:6px;vertical-align:-6px}" +
    ".pf-ctag{margin-left:5px;font-size:.6rem;padding:0 6px;vertical-align:1px}";
  document.head.appendChild(css);

  /* ---------- start, once a pupil is signed in ---------- */
  var cached = read();
  if (cached && cached.look) S = cached;
  if (S && A()) A().ready.then(function(){ A().applyTheme(S.look); paintButton(); });
  var tries = 0;
  (function wait(){
    var u = window.currentUser;
    if (u && !u.offline && window.sb) {
      addButton();
      hookNames();
      call({ action:"get" }).then(setState, function(){});
      return;
    }
    if (++tries < 240) setTimeout(wait, 500);
  })();
})();
