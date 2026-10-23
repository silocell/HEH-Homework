/* ====================================================================
   Experiments - the lab copy only.

   Ideas tried out on the lab before anyone decides whether they belong
   on the real site. Each one is switched on and off from the lab's
   admin panel (Experiments), where it also gets a verdict - trying,
   keep for main, or bin - and a note on why.

   The switches live in the lab's database (lab_flags), so every tester
   sees the same set. This file does nothing at all on the real site:
   it only runs when the page is served from the lab address, and the
   real site does not load it.

   An idea that graduates is moved into the real site's own code
   properly - not by loading this file there.
   ==================================================================== */
(function(){
  if (!document.documentElement.classList.contains("lab")) return;

  /* The catalogue. The admin panel reads this list to draw its rows, so
     an experiment exists in one place. */
  var CAT = [
    { key:"focus",  name:"Focus timer",
      says:"A 25-minute focus timer with 5-minute breaks, at the top of the dashboard." },
    { key:"streak", name:"Homework streak",
      says:"Counts the days in a row you've ticked off at least one to-do." },
    { key:"cheer",  name:"Cheer on done",
      says:"A burst of confetti when you tick off a to-do. None for anyone whose device asks for less motion." },
    { key:"warmup", name:"Daily warm-up",
      says:"One maths or English question from Gate Run on the dashboard, a new one each day." }
  ];
  window.LAB_EXPERIMENTS = CAT;

  /* This file loads at the top of the page, before the dashboard or the
     admin panel exists - so everything below waits for the page to be
     built before it decides which page it is on. */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else { run(); }
  function run(){

  /* ---------- on the lab's admin panel: the Experiments section ----------
     Built here rather than written into the admin page, so the real
     site's admin page carries none of it. Owner only: the server refuses
     these actions to anyone else, and the section says so. */
  if (!document.getElementById("todoList")) {
    var waited = 0;
    (function waitPanel(){
      var main = document.getElementById("mainPanel");
      if (main && window.unlocked && !main.hidden && typeof window.call === "function") {
        if (window.showOnly) return;
        buildPanel(main); return;
      }
      if (++waited < 600) setTimeout(waitPanel, 500);
    })();
    return;
  }

  function buildPanel(main){
    var sec = document.createElement("div"); sec.className = "sec"; sec.id = "expSec";
    sec.innerHTML =
      '<p class="sec-h">Experiments</p>' +
      '<p class="amsg" id="expMsg">Ideas being tried on the lab before they go anywhere near the real site. ' +
      'Switch one on and the testers get it; give it a verdict so you remember what you decided.</p>' +
      '<div id="expRows"></div>';
    main.insertBefore(sec, main.querySelector(".sec"));
    var css = document.createElement("style");
    css.textContent =
      ".exp-adm{display:grid;grid-template-columns:1fr auto;gap:6px 14px;padding:12px 0;border-top:1px solid var(--rule)}" +
      ".exp-adm:first-child{border-top:0}" +
      ".exp-adm b{display:block}.exp-adm small{display:block;color:var(--ink-soft);line-height:1.4}" +
      ".exp-adm .exp-ctl{display:flex;gap:6px;align-items:center;flex-wrap:wrap;justify-content:flex-end}" +
      ".exp-adm .exp-v.on{background:var(--accent);color:#fff;border-color:var(--accent)}" +
      ".exp-adm .exp-v.keep.on{background:#2f9e44;border-color:#2f9e44}" +
      ".exp-adm .exp-v.bin.on{background:#e03131;border-color:#e03131}" +
      ".exp-adm input.exp-n{grid-column:1/-1;width:100%;font:inherit;font-size:.82rem;padding:7px 10px;" +
      "border:1px solid var(--rule);border-radius:8px;background:var(--paper);color:var(--ink)}";
    document.head.appendChild(css);
    load();
  }

  function msg(t, bad){
    var m = document.getElementById("expMsg");
    if (m){ m.textContent = t; m.style.color = bad ? "var(--bad, #e03131)" : ""; }
  }

  function load(){
    window.call({ action:"labflags" }).then(function(d){
      var have = {}; (d.flags || []).forEach(function(f){ have[f.key] = f; });
      var rows = document.getElementById("expRows"); rows.textContent = "";
      CAT.forEach(function(x){
        var f = have[x.key] || { on_now:false, verdict:"trying", note:"" };
        var r = document.createElement("div"); r.className = "exp-adm";
        var what = document.createElement("div");
        var b = document.createElement("b"); b.textContent = x.name;
        var sm = document.createElement("small"); sm.textContent = x.says;
        what.appendChild(b); what.appendChild(sm);
        var ctl = document.createElement("div"); ctl.className = "exp-ctl";
        var lab = document.createElement("label");
        var box = document.createElement("input"); box.type = "checkbox"; box.checked = !!f.on_now;
        lab.appendChild(box); lab.appendChild(document.createTextNode(" On for testers"));
        box.addEventListener("change", function(){ save(x.key, { on: box.checked }, box.checked ? x.name + " is on for testers. They'll see it on their next visit." : x.name + " is off."); });
        ctl.appendChild(lab);
        [["trying","Trying"],["keep","Keep for main"],["bin","Bin"]].forEach(function(v){
          var vb = document.createElement("button"); vb.type = "button";
          vb.className = "abtn quiet exp-v " + v[0] + (f.verdict === v[0] ? " on" : "");
          vb.textContent = v[1];
          vb.addEventListener("click", function(){ save(x.key, { verdict: v[0] }, x.name + ": " + v[1].toLowerCase() + "."); });
          ctl.appendChild(vb);
        });
        var note = document.createElement("input"); note.className = "exp-n"; note.type = "text";
        note.placeholder = "Why? What did the testers say?"; note.value = f.note || ""; note.maxLength = 500;
        note.addEventListener("change", function(){ save(x.key, { note: note.value }, "Note saved for " + x.name + "."); });
        r.appendChild(what); r.appendChild(ctl); r.appendChild(note);
        rows.appendChild(r);
      });
    }).catch(function(e){
      msg("Can't load the experiments: " + (e && e.message ? e.message : "no reply") +
          ". Is lab_flags_oct23.sql run on the lab server, and the new admin function in place?", true);
    });
  }

  function save(key, patch, said){
    var body = { action:"labflag", key:key };
    for (var k in patch) body[k] = patch[k];
    window.call(body).then(function(){ msg(said); load(); })
      .catch(function(e){ msg(e && e.message ? e.message : "That didn't save.", true); });
  }

  var calmer = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var started = false;

  function store(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }
  function read(k, d){ try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch(e){ return d; } }
  function today(){ var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0"); }
  function el(tag, cls, text){ var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function tag(panel){ var t = el("span", "exp-tag", "Lab experiment"); panel.appendChild(t); }

  /* ---------- Focus timer ---------- */
  function focusTimer(){
    var col = document.querySelector("#todoList") && document.querySelector("#todoList").closest(".col");
    if (!col) return;
    var p = el("div", "panel exp-panel"); p.id = "expFocus";
    tag(p);
    p.appendChild(el("p", "panel-title", "Focus timer"));
    var face = el("div", "exp-clock", "25:00");
    var mode = el("p", "exp-mode", "Focus");
    var row = el("div", "exp-row");
    var go = el("button", "btn", "Start"); go.type = "button";
    var reset = el("button", "ghost-btn", "Reset"); reset.type = "button";
    row.appendChild(go); row.appendChild(reset);
    p.appendChild(face); p.appendChild(mode); p.appendChild(row);
    col.insertBefore(p, col.firstChild);

    var LEN = { Focus: 25*60, Break: 5*60 };
    var cur = "Focus", left = LEN.Focus, ends = 0, tick = null, baseTitle = document.title;
    function paint(){
      face.textContent = String(Math.floor(left/60)).padStart(2,"0") + ":" + String(left%60).padStart(2,"0");
      mode.textContent = cur;
      go.textContent = tick ? "Pause" : (left < LEN[cur] ? "Carry on" : "Start");
      document.title = tick ? face.textContent + " - " + cur : baseTitle;
    }
    function stop(){ clearInterval(tick); tick = null; }
    function step(){
      /* From the clock, not by counting ticks: a background tab is only
         woken now and then, and counting would drift by minutes. */
      left = Math.max(0, Math.round((ends - Date.now())/1000));
      if (left === 0){
        stop();
        cur = cur === "Focus" ? "Break" : "Focus";
        left = LEN[cur];
        p.classList.add("exp-ding"); setTimeout(function(){ p.classList.remove("exp-ding"); }, 1600);
      }
      paint();
    }
    go.addEventListener("click", function(){
      if (tick){ stop(); paint(); return; }
      ends = Date.now() + left*1000; tick = setInterval(step, 500); paint();
    });
    reset.addEventListener("click", function(){ stop(); cur = "Focus"; left = LEN.Focus; paint(); });
    paint();
  }

  /* ---------- Homework streak + Cheer on done ---------- */
  function streakCount(){
    var days = read("hl.exp.doneDays", []);
    var set = {}; days.forEach(function(d){ set[d] = true; });
    var n = 0, d = new Date();
    if (!set[today()]) d.setDate(d.getDate() - 1);   /* today not done yet: count up to yesterday */
    for (;;){
      var k = d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
      if (!set[k]) break;
      n++; d.setDate(d.getDate() - 1);
    }
    return n;
  }
  function paintStreak(){
    var title = document.querySelector("#todoList") && document.querySelector("#todoList").closest(".panel").querySelector(".panel-title");
    if (!title) return;
    var b = document.getElementById("expStreak");
    if (!b){ b = el("span", "exp-streak"); b.id = "expStreak"; title.appendChild(b); }
    var n = streakCount();
    b.textContent = n ? n + "-day streak" : "";
    b.hidden = !n;
  }

  function burst(x, y){
    if (calmer) return;
    var colours = ["#ff4757","#ffb703","#3ddc97","#2f6bff","#c77dff","#ff8fa3"];
    for (var i = 0; i < 22; i++){
      var bit = el("span", "exp-bit");
      bit.style.left = x + "px"; bit.style.top = y + "px";
      bit.style.background = colours[i % colours.length];
      var a = Math.random()*Math.PI*2, r = 50 + Math.random()*70;
      bit.style.setProperty("--dx", Math.cos(a)*r + "px");
      bit.style.setProperty("--dy", (Math.sin(a)*r - 40) + "px");
      bit.style.setProperty("--rot", (Math.random()*540 - 270) + "deg");
      document.body.appendChild(bit);
      setTimeout(function(b){ return function(){ b.remove(); }; }(bit), 900);
    }
  }

  var watchingTicks = false;
  function watchTicks(on){
    if (watchingTicks) return; watchingTicks = true;
    /* Capture phase: the list redraws itself as soon as a box is ticked,
       so by the time the event bubbles up the box has gone and has no
       position to burst from. */
    document.addEventListener("change", function(e){
      var t = e.target;
      if (!t || t.type !== "checkbox" || !t.closest || !t.closest("#todoList") || !t.checked) return;
      if (on.streak){
        var days = read("hl.exp.doneDays", []);
        if (days.indexOf(today()) < 0){ days.push(today()); store("hl.exp.doneDays", days.slice(-120)); }
        setTimeout(paintStreak, 0);
      }
      if (on.cheer){
        var r = t.getBoundingClientRect();
        burst(r.left + r.width/2, r.top + r.height/2);
      }
    }, true);
  }

  /* ---------- Daily warm-up ---------- */
  function warmup(){
    var col = document.querySelector("#todoList") && document.querySelector("#todoList").closest(".col");
    if (!col) return;
    var p = el("div", "panel exp-panel"); p.id = "expWarmup";
    tag(p);
    p.appendChild(el("p", "panel-title", "Daily warm-up"));
    var q = el("p", "exp-q", "Loading a question…");
    var opts = el("div", "exp-opts");
    var note = el("p", "exp-note");
    p.appendChild(q); p.appendChild(opts); p.appendChild(note);
    var todoPanel = document.querySelector("#todoList").closest(".panel");
    col.insertBefore(p, todoPanel);

    function show(item){
      q.textContent = item.text;
      opts.textContent = "";
      var done = read("hl.exp.warmupDone", null);
      item.options.forEach(function(o){
        var b = el("button", "ghost-btn exp-opt", o); b.type = "button";
        b.addEventListener("click", function(){
          var right = o === item.answer;
          store("hl.exp.warmupDone", { day: today(), pick: o });
          mark(o);
        });
        opts.appendChild(b);
      });
      function mark(pick){
        [].forEach.call(opts.children, function(b){
          b.disabled = true;
          if (b.textContent === item.answer) b.classList.add("exp-right");
          else if (b.textContent === pick) b.classList.add("exp-wrong");
        });
        note.textContent = pick === item.answer
          ? "Right. Back tomorrow for another."
          : "It was " + item.answer + "." + (item.note ? " " + item.note : "");
      }
      if (done && done.day === today()) mark(done.pick);
    }

    var saved = read("hl.exp.warmup", null);
    if (saved && saved.day === today()) { show(saved.item); return; }
    var s = document.createElement("script");
    s.src = "/HEH-Launchpad-Game/questions.js";
    s.onload = function(){
      if (!window.QUIZ){ q.textContent = "Couldn't load today's question."; return; }
      var m = QUIZ.next("both", 1);
      var item = { text: m.text, answer: String(m.answer), options: m.options.map(String), note: m.note || "" };
      store("hl.exp.warmup", { day: today(), item: item });
      show(item);
    };
    s.onerror = function(){ q.textContent = "Couldn't load today's question."; };
    document.head.appendChild(s);
  }

  /* ---------- styles ---------- */
  var css = el("style");
  css.textContent =
    ".exp-panel{position:relative}" +
    ".exp-tag{position:absolute;top:12px;right:14px;font-size:.62rem;font-weight:700;letter-spacing:.08em;" +
    "text-transform:uppercase;color:#7c3aed;background:rgba(124,58,237,.12);padding:3px 8px;border-radius:999px}" +
    ".exp-clock{font-family:var(--font-mono,monospace);font-size:2.6rem;font-weight:600;letter-spacing:.02em;margin:4px 0 0}" +
    ".exp-mode{margin:0 0 10px;color:var(--ink-soft);font-size:.82rem}" +
    ".exp-row{display:flex;gap:8px}" +
    ".exp-ding{animation:expding .5s ease-in-out 3}" +
    "@keyframes expding{50%{box-shadow:0 0 0 4px rgba(124,58,237,.5)}}" +
    ".exp-streak{margin-left:10px;font-size:.7rem;font-weight:700;color:#d9480f;background:rgba(255,122,26,.14);" +
    "padding:2px 8px;border-radius:999px;letter-spacing:0;text-transform:none}" +
    ".exp-bit{position:fixed;width:8px;height:8px;border-radius:2px;pointer-events:none;z-index:9999;" +
    "animation:expbit .85s cubic-bezier(.2,.7,.4,1) forwards}" +
    "@keyframes expbit{to{transform:translate(var(--dx),var(--dy)) rotate(var(--rot));opacity:0}}" +
    ".exp-q{font-weight:600;margin:6px 0 10px}" +
    ".exp-opts{display:flex;gap:8px;flex-wrap:wrap}" +
    ".exp-opt.exp-right{border-color:#2f9e44;color:#2f9e44;font-weight:700}" +
    ".exp-opt.exp-wrong{border-color:#e03131;color:#e03131;text-decoration:line-through}" +
    ".exp-note{font-size:.82rem;color:var(--ink-soft);margin:10px 0 0;min-height:1em}";
  document.head.appendChild(css);

  /* ---------- switch on whatever is on ---------- */
  function start(on){
    if (started) return; started = true;
    if (on.focus) focusTimer();
    if (on.warmup) warmup();
    if (on.streak || on.cheer) watchTicks(on);
    if (on.streak) paintStreak();
  }

  /* Wait for the page to have its server connection and a signed-in
     pupil, then ask which experiments are on. If the flags can't be
     read, nothing switches on - the lab page is then just the site. */
  var tries = 0;
  (function wait(){
    if (window.sb && window.currentUser && !window.currentUser.offline){
      window.sb.from("lab_flags").select("key,on_now").then(function(r){
        if (r.error || !r.data) return;
        var on = {}; r.data.forEach(function(f){ on[f.key] = !!f.on_now; });
        start(on);
      });
      return;
    }
    if (++tries < 240) setTimeout(wait, 500);
  })();
  }
})();
