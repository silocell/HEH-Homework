/* ====================================================================
   Chaos - the lab copy's fault switch.

   Lets you make things go wrong on purpose, without touching anything
   stored: the AI answers garbage, the explainer takes fifteen seconds,
   sign-in is "down", the database is "down", the word of the day is
   missing, everything is slow. You see exactly how the site copes with
   each, and what you would lose if it happened for real.

   Nothing here reaches the server. It sits in front of fetch() in the
   browser and lies about what came back. On the real site this file
   does nothing at all: it only arms itself when the page is served
   from the lab address.
   ==================================================================== */
(function(){
  if (!document.documentElement.classList.contains("lab")) return;

  /* Whichever server this copy talks to: the lab one, through the
     tunnel or not, or the real one if the lab is ever pointed back. */
  var HOSTS = /lkyfpvlrqgezgitfmpqo\.supabase\.co|79\.72\.79\.18\.sslip\.io|localhost:8000/;
  var FAULTS = [
    { key:"slow",     name:"Everything slow",     says:"Every request to the server takes four seconds." },
    { key:"ai_down",  name:"AI down",             says:"The explainer and the chat checks fail with a server error." },
    { key:"ai_slow",  name:"AI very slow",        says:"The AI takes fifteen seconds to answer." },
    { key:"ai_junk",  name:"AI talks rubbish",    says:"The AI answers, but with nonsense." },
    { key:"auth",     name:"Sign-in down",        says:"The sign-in server fails. Reload to see what that does." },
    { key:"db",       name:"Database down",       says:"Every read and write fails. Nothing is actually touched." },
    { key:"wotd",     name:"No word of the day",  says:"The word of the day comes back empty." }
  ];
  var JUNK = ["Potato quantum sideways.", "The Tudors invented the number seven, which is why 7 × 8 is purple.",
              "Yes and also no, depending on the tide.", "Have you tried turning the homework off and on again?",
              "In conclusion, bees.", "The answer is 42, or possibly a sandwich."];

  function on(){ try { return JSON.parse(localStorage.getItem("hl.chaos") || "{}") || {}; } catch(e){ return {}; } }
  function save(o){ try { localStorage.setItem("hl.chaos", JSON.stringify(o)); } catch(e){} paint(); }
  function count(){ var o = on(), n = 0; for (var k in o) if (o[k]) n++; return n; }
  function wait(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }
  function fail(what, code){
    return new Response(JSON.stringify({ error: what + " (a lab fault, switched on by you)" }),
      { status: code || 503, headers: { "content-type": "application/json" } });
  }
  function junkify(v){
    if (typeof v === "string") return v.length > 12 ? JUNK[Math.floor(Math.random()*JUNK.length)] : v;
    if (Array.isArray(v)) return v.map(junkify);
    if (v && typeof v === "object"){ var o = {}; for (var k in v) o[k] = junkify(v[k]); return o; }
    return v;
  }

  /* In front of fetch, before the page makes its Supabase client - the
     client keeps hold of whatever fetch was when it was made. */
  var real = window.fetch.bind(window);
  window.fetch = async function(input, init){
    var url = typeof input === "string" ? input : (input && input.url) || "";
    if (!HOSTS.test(url)) return real(input, init);
    var f = on();
    var isAI = /\/functions\/v1\/(explain|chat)\b/.test(url);
    if (f.slow) await wait(4000);
    if (f.auth && url.indexOf("/auth/v1/") >= 0) return fail("Sign-in is down");
    if (f.db && url.indexOf("/rest/v1/") >= 0) return fail("The database is down");
    if (f.wotd && /\/rest\/v1\/wotd\b/.test(url))
      return new Response("null", { status: 200, headers: { "content-type": "application/json" } });
    if (isAI && f.ai_down) return fail("The AI is down");
    if (isAI && f.ai_slow) await wait(15000);
    var res = await real(input, init);
    if (isAI && f.ai_junk && res.ok){
      var body; try { body = junkify(await res.clone().json()); } catch(e){ return res; }
      return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
    }
    return res;
  };

  /* The switchboard: a button in the lab bar, a panel of toggles. */
  var bar = document.querySelector(".labbar");
  var btn = document.createElement("button");
  btn.type = "button"; btn.className = "chaosbtn";
  var panel = document.createElement("div");
  panel.className = "chaos"; panel.hidden = true;
  panel.innerHTML = '<p class="chaos-h">Break things</p><p class="chaos-sub">Nothing stored is touched. Switch one on, then use the site and watch what happens.</p>';
  FAULTS.forEach(function(f){
    var row = document.createElement("label"); row.className = "chaos-row";
    var box = document.createElement("input"); box.type = "checkbox"; box.dataset.key = f.key;
    box.addEventListener("change", function(){ var o = on(); o[f.key] = box.checked; save(o); });
    var txt = document.createElement("span"); txt.innerHTML = "<b></b><small></small>";
    txt.querySelector("b").textContent = f.name; txt.querySelector("small").textContent = f.says;
    row.appendChild(box); row.appendChild(txt); panel.appendChild(row);
  });
  /* Not a fault: which road to the lab's server. Shiv's home broadband
     blocks the lab's address, so he goes through his SSH tunnel. */
  var tun = document.createElement("label"); tun.className = "chaos-row";
  var tbox = document.createElement("input"); tbox.type = "checkbox";
  try { tbox.checked = localStorage.getItem("hl.labapi") === "tunnel"; } catch (e) {}
  tbox.addEventListener("change", function(){
    try { if (tbox.checked) localStorage.setItem("hl.labapi", "tunnel"); else localStorage.removeItem("hl.labapi"); } catch (e) {}
    location.reload();
  });
  var ttxt = document.createElement("span");
  ttxt.innerHTML = "<b>Through my SSH tunnel</b><small>Talk to the lab server at localhost:8000. Only works while your ssh -L window is open.</small>";
  tun.appendChild(tbox); tun.appendChild(ttxt); panel.appendChild(tun);
  var clear = document.createElement("button"); clear.type = "button"; clear.className = "chaos-clear";
  clear.textContent = "Fix everything";
  clear.addEventListener("click", function(){ save({}); });
  panel.appendChild(clear);
  btn.addEventListener("click", function(){ panel.hidden = !panel.hidden; });
  function paint(){
    var o = on(), n = count();
    btn.textContent = n ? "Breaking " + n + " thing" + (n === 1 ? "" : "s") : "Break things";
    btn.classList.toggle("hot", n > 0);
    panel.querySelectorAll("input").forEach(function(b){ b.checked = !!o[b.dataset.key]; });
  }
  if (bar) bar.appendChild(btn);
  document.body.appendChild(panel);
  paint();

  var css = document.createElement("style");
  css.textContent =
    ".chaosbtn{margin-left:14px;font:inherit;font-size:.72rem;font-weight:700;text-transform:none;letter-spacing:0;" +
    "background:rgba(255,255,255,.18);color:#fff;border:1px solid rgba(255,255,255,.5);border-radius:999px;padding:2px 10px;cursor:pointer}" +
    ".chaosbtn.hot{background:#ff4757;border-color:#ff4757}" +
    ".chaos{position:fixed;top:34px;right:12px;z-index:60;width:min(360px,calc(100vw - 24px));background:var(--card,#fff);color:var(--ink,#1b2430);" +
    "border:1px solid var(--rule,#ddd);border-radius:14px;padding:14px 16px;box-shadow:0 20px 50px -20px rgba(0,0,0,.6);font-size:.82rem}" +
    ".chaos-h{margin:0;font-weight:800;font-size:1rem}.chaos-sub{margin:4px 0 10px;color:var(--ink-soft,#5d6b7d);font-size:.74rem;line-height:1.4}" +
    ".chaos-row{display:flex;gap:10px;align-items:flex-start;padding:7px 0;border-top:1px solid var(--rule,#eee);cursor:pointer}" +
    ".chaos-row input{margin-top:3px}.chaos-row b{display:block}.chaos-row small{display:block;color:var(--ink-soft,#5d6b7d);line-height:1.35}" +
    ".chaos-clear{margin-top:10px;width:100%;font:inherit;font-size:.8rem;font-weight:700;padding:8px;border:0;border-radius:9px;" +
    "background:var(--accent,#2f6bff);color:#fff;cursor:pointer}";
  document.head.appendChild(css);

  window.__chaos = { on: on, set: save, faults: FAULTS.map(function(f){ return f.key; }) };
})();
