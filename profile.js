/* =====================================================================
   Your profile: a picture, your name and your account email, in the
   top bar of the dashboard.

   The picture is built from four parts - background, character, frame
   and hat. Some parts are free. The rest are unlocked with the points
   you earn in Level Up, so getting questions right there is how you
   dress up your picture here.

   The shop, the prices, what you own and whether you can afford
   something all live on the server (the "profile" function). This page
   only draws what it is told. A copy is kept on this device so the
   picture appears straight away next time.
   ===================================================================== */
(function(){
  var CACHE = "hl.profile";
  var LEVELUP = "https://learn.civilinitiatives.org/levelup.html";
  var PARTS = [
    { id:"bg",    name:"Background" },
    { id:"face",  name:"Character" },
    { id:"frame", name:"Frame" },
    { id:"hat",   name:"Hat" }
  ];
  var S = null;               // { pts, look:{bg,face,frame,hat}, owned:[], shop:[] }
  var byId = {};

  function el(tag, cls, text){ var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function read(){ try { return JSON.parse(localStorage.getItem(CACHE)); } catch(e){ return null; } }
  function keep(v){ try { localStorage.setItem(CACHE, JSON.stringify(v)); } catch(e){} }
  function user(){ return window.currentUser || {}; }
  function initial(){
    var n = (user().name || user().email || "?").trim();
    return (n.charAt(0) || "?").toUpperCase();
  }
  function setState(st){
    S = st; byId = {};
    (S.shop || []).forEach(function(it){ byId[it.id] = it; });
    keep(S);
    paintButton();
  }
  function call(body){
    if (!window.sb || !sb.functions) return Promise.reject(new Error("Sign in first."));
    return sb.functions.invoke("profile", { body: body }).then(function(r){
      if (r.error) {
        /* The function's own message is in the response body. */
        var ctx = r.error.context;
        if (ctx && ctx.json) return ctx.json().then(function(j){ throw new Error(j && j.error || "Something went wrong."); });
        throw new Error("Something went wrong.");
      }
      if (r.data && r.data.error) throw new Error(r.data.error);
      return r.data;
    });
  }

  /* ---------- drawing a picture ---------- */
  function avatar(look, size){
    var bg = byId[look.bg], face = byId[look.face], frame = byId[look.frame], hat = byId[look.hat];
    var wrap = el("span", "pf-av"); wrap.style.setProperty("--s", size + "px");
    var ring = el("span", "pf-ring");
    if (frame && frame.v) { ring.style.background = frame.v; ring.classList.add("on"); }
    var disc = el("span", "pf-disc");
    disc.style.background = bg && bg.v ? bg.v : "linear-gradient(135deg,#60a5fa,#2563eb)";
    if (face && face.v) { disc.textContent = face.v; disc.classList.add("emoji"); }
    else disc.textContent = initial();
    ring.appendChild(disc); wrap.appendChild(ring);
    if (hat && hat.v) wrap.appendChild(el("span", "pf-hat", hat.v));
    wrap.setAttribute("aria-hidden", "true");
    return wrap;
  }

  /* ---------- the button in the top bar ---------- */
  var btn = null;
  function paintButton(){
    if (!btn) return;
    btn.textContent = "";
    btn.appendChild(avatar(S ? S.look : { bg:"bg-sky", face:"f-letter" }, 30));
    var first = (user().name || "").split(" ")[0];
    if (first) btn.appendChild(el("span", "pf-name", first));
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
  var veil = null, tab = "face", armed = null;
  function close(){ if (veil) { veil.remove(); veil = null; document.removeEventListener("keydown", esc); if (btn) btn.focus(); } }
  function esc(e){ if (e.key === "Escape") close(); }
  function toast(text, bad){
    var t = el("div", "pf-toast" + (bad ? " bad" : ""), text);
    veil.querySelector(".pf-sheet").appendChild(t);
    setTimeout(function(){ t.remove(); }, 2400);
  }
  function open(){
    if (veil) return;
    veil = el("div", "pf-veil");
    veil.addEventListener("click", function(e){ if (e.target === veil) close(); });
    var sheet = el("div", "pf-sheet"); sheet.setAttribute("role", "dialog"); sheet.setAttribute("aria-modal", "true");
    sheet.setAttribute("aria-label", "Your profile");
    veil.appendChild(sheet); document.body.appendChild(veil);
    document.addEventListener("keydown", esc);
    paintSheet();
    if (!S || !S.shop) sheet.appendChild(el("p", "pf-muted", "Loading…"));
    call({ action:"get" }).then(function(st){ setState(st); paintSheet(); })
      .catch(function(e){ if (veil) toast(e.message, true); });
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
    me.appendChild(avatar(S ? S.look : {}, 96));
    var who = el("div", "pf-who");
    who.appendChild(el("b", null, user().name || "You"));
    who.appendChild(el("span", "pf-email", user().email || ""));
    if (S) {
      var pts = el("span", "pf-pts", "⭐ " + S.pts + " points");
      who.appendChild(pts);
      var earn = el("a", "pf-earn", "Earn more in Level Up →"); earn.href = LEVELUP;
      who.appendChild(earn);
    }
    me.appendChild(who);
    sheet.appendChild(me);
    if (!S || !S.shop) return;

    var tabs = el("div", "pf-tabs"); tabs.setAttribute("role", "tablist");
    PARTS.forEach(function(p){
      var t = el("button", "pf-tab", p.name); t.type = "button";
      t.setAttribute("role", "tab"); t.setAttribute("aria-selected", tab === p.id ? "true" : "false");
      t.addEventListener("click", function(){ tab = p.id; armed = null; paintSheet(); });
      tabs.appendChild(t);
    });
    sheet.appendChild(tabs);

    var grid = el("div", "pf-grid");
    S.shop.filter(function(it){ return it.part === tab; }).forEach(function(it){
      var using = S.look[it.part] === it.id;
      var has = it.cost === 0 || S.owned.indexOf(it.id) >= 0;
      var cell = el("button", "pf-item" + (using ? " using" : "") + (has ? "" : " locked") + (armed === it.id ? " armed" : ""));
      cell.type = "button";
      var preview = {}; for (var k in S.look) preview[k] = S.look[k]; preview[it.part] = it.id;
      cell.appendChild(avatar(preview, 56));
      cell.appendChild(el("b", null, it.name));
      cell.appendChild(el("small", null,
        using ? "Using" : armed === it.id ? "Tap again to buy" : has ? (it.cost ? "Unlocked" : "Free") : "⭐ " + it.cost));
      cell.setAttribute("aria-pressed", using ? "true" : "false");
      cell.addEventListener("click", function(){ pick(it, has, using); });
      grid.appendChild(cell);
    });
    sheet.appendChild(grid);
    sheet.appendChild(el("p", "pf-muted", "Points are the ones you earn answering questions in Level Up - the same points as its shop. Nothing here costs real money."));
  }
  function pick(it, has, using){
    if (using) return;
    if (!has) {
      if (S.pts < it.cost) { armed = null; paintSheet(); toast("You need " + (it.cost - S.pts) + " more points for that.", true); return; }
      if (armed !== it.id) { armed = it.id; paintSheet(); return; }
    }
    armed = null;
    call({ action: has ? "use" : "buy", item: it.id }).then(function(st){
      setState(st); paintSheet();
      if (!has) toast("Unlocked: " + it.name + "!");
    }).catch(function(e){ paintSheet(); toast(e.message, true); });
  }

  /* ---------- styles ---------- */
  var css = el("style");
  css.textContent =
    ".pf-btn{display:inline-flex;align-items:center;gap:8px;padding-top:3px;padding-bottom:3px}" +
    ".pf-name{max-width:9em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
    "@media (max-width:560px){.pf-name{display:none}}" +
    ".pf-av{position:relative;display:inline-block;width:var(--s);height:var(--s);flex:none}" +
    ".pf-ring{display:block;width:100%;height:100%;border-radius:50%;box-sizing:border-box}" +
    ".pf-ring.on{padding:calc(var(--s) * .07)}" +
    ".pf-disc{display:grid;place-items:center;width:100%;height:100%;border-radius:50%;color:#fff;font-weight:800;" +
    "font-size:calc(var(--s) * .44);line-height:1;font-family:var(--font-display,system-ui);text-shadow:0 1px 2px rgba(0,0,0,.25)}" +
    ".pf-disc.emoji{font-size:calc(var(--s) * .52);text-shadow:none}" +
    ".pf-hat{position:absolute;left:50%;top:calc(var(--s) * -.30);transform:translateX(-50%) rotate(-8deg);font-size:calc(var(--s) * .46);line-height:1;pointer-events:none}" +
    ".pf-veil{position:fixed;inset:0;z-index:9995;background:rgba(10,12,20,.55);display:grid;place-items:center;padding:16px}" +
    ".pf-sheet{position:relative;background:var(--card,#fff);color:var(--ink);border-radius:18px;padding:18px;width:min(560px,100%);" +
    "max-height:calc(100vh - 32px);overflow:auto;box-shadow:0 30px 70px -20px rgba(0,0,0,.6)}" +
    ".pf-head{display:flex;align-items:center;gap:10px;margin-bottom:12px}.pf-head h3{margin:0;flex:1;font-family:var(--font-display)}" +
    ".pf-me{display:flex;align-items:center;gap:18px;padding:18px 4px 16px;border-bottom:1px solid var(--rule);margin-bottom:12px}" +
    ".pf-who{display:flex;flex-direction:column;gap:3px;min-width:0}.pf-who b{font-size:1.15rem}" +
    ".pf-email{color:var(--ink-soft);font-size:.88rem;overflow-wrap:anywhere}" +
    ".pf-pts{margin-top:6px;font-weight:700}" +
    ".pf-earn{color:var(--accent);font-size:.85rem;font-weight:600;text-decoration:none}.pf-earn:hover{text-decoration:underline}" +
    ".pf-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}" +
    ".pf-tab{font:inherit;font-size:.85rem;font-weight:600;padding:7px 13px;border-radius:999px;border:1px solid var(--rule);background:transparent;color:var(--ink);cursor:pointer}" +
    ".pf-tab[aria-selected=true]{background:var(--accent);border-color:var(--accent);color:var(--on-accent,#fff)}" +
    ".pf-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px}" +
    ".pf-item{display:flex;flex-direction:column;align-items:center;gap:5px;padding:20px 8px 10px;border:1px solid var(--rule);border-radius:14px;" +
    "background:transparent;color:var(--ink);font:inherit;cursor:pointer;text-align:center}" +
    ".pf-item:hover{border-color:var(--accent)}.pf-item b{font-size:.86rem}.pf-item small{font-size:.75rem;color:var(--ink-soft)}" +
    ".pf-item.using{border:2px solid var(--accent);background:var(--accent-soft)}.pf-item.using small{color:var(--accent);font-weight:700}" +
    ".pf-item.locked .pf-av{filter:saturate(.35) opacity(.7)}" +
    ".pf-item.armed{border:2px solid #e8590c}.pf-item.armed small{color:#e8590c;font-weight:700}" +
    ".pf-item:focus-visible,.pf-tab:focus-visible{outline:2px solid var(--accent);outline-offset:2px}" +
    ".pf-muted{color:var(--ink-soft);font-size:.8rem;margin:14px 0 0}" +
    ".pf-toast{position:sticky;bottom:0;margin-top:12px;padding:10px 14px;border-radius:10px;background:var(--good,#1d7a4c);color:#fff;font-weight:600;text-align:center}" +
    ".pf-toast.bad{background:#c92a2a}";
  document.head.appendChild(css);

  /* ---------- start, once a pupil is signed in ---------- */
  var cached = read();
  if (cached && cached.shop) setState(cached);
  var tries = 0;
  (function wait(){
    var u = window.currentUser;
    if (u && !u.offline && window.sb) {
      addButton();
      call({ action:"get" }).then(setState, function(){});
      return;
    }
    if (++tries < 240) setTimeout(wait, 500);
  })();
})();
