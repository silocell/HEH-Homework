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
/* Remember the last few errors on this page, for "Ask Claude" on the
   admin page. Error text and where it happened only. */
(function(){
  if (!/^\/HEH-(Homework|Launchpad)-Lab(\/|$)/i.test(location.pathname)) return;
  var errs = window.__labErrs = [];
  function keep(t){ errs.push(new Date().toTimeString().slice(0, 8) + " " + String(t).slice(0, 300)); if (errs.length > 30) errs.shift(); }
  window.addEventListener("error", function(e){ keep((e.message || "error") + (e.filename ? " @ " + e.filename.split("/").pop() + ":" + e.lineno : "")); });
  window.addEventListener("unhandledrejection", function(e){ keep("promise: " + (e.reason && e.reason.message || e.reason)); });
})();

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
      says:"One maths or English question from Gate Run on the dashboard, a new one each day." },
    { key:"roulette", name:"Homework roulette",
      says:"A Pick for me button on the to-do list: spins through what's left and lands on one to start with." },
    { key:"sounds", name:"Focus sounds",
      says:"Rain or brown noise to work to, made live in the browser - no audio files, nothing downloaded." },
    { key:"plant", name:"Grow a plant",
      says:"A plant that grows as you tick off to-dos in a week, and droops if nothing's been ticked for three days." },
    { key:"season", name:"Seasonal touches",
      says:"Bats for Halloween week, fireworks on Bonfire Night (5 November). Preview with ?season=halloween or ?season=bonfire." },
    { key:"konami", name:"Secret code",
      says:"Type up up down down left right left right B A on the dashboard and see what happens." },
    { key:"cards", name:"Flashcards",
      says:"Make your own revision cards, flip them, shuffle them. Kept on this device." },
    { key:"eggs", name:"Search easter eggs",
      says:"Try typing these into the dashboard search: do a barrel roll, askew, flip a coin, roll a die, recursion, snake, brick breaker, whack a mole." },
    { key:"doodle", name:"Doodle of the day",
      says:"Like a Google doodle: a little game on the dashboard that changes every day - Snake, Brick Breaker or Whack-a-mole. Nothing to do with homework, on purpose." }
  ];
  /* The fun experiments live in fun.js, which loads first. */
  if (window.LabFun) CAT = CAT.concat(window.LabFun.CAT);
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
    askClaude(main, sec);
  }

  /* ---------- Ask Claude ----------
     Describe what's wrong; the server adds a snapshot of the lab (counts
     and switches only - never what pupils wrote) and asks Claude through
     the API key on the server. It is a fresh Claude each time: it can
     explain and suggest, not change code. Browser errors seen on this
     page are sent along too, because they're usually the clue. */
  function askClaude(main, after){
    var sec = document.createElement("div"); sec.className = "sec"; sec.id = "askSec";
    sec.innerHTML =
      '<p class="sec-h">Ask Claude</p>' +
      '<p class="amsg" id="askMsg">Say what\u2019s wrong in your own words. Claude gets that plus a snapshot of the lab ' +
      '(numbers and switches \u2014 never pupils\u2019 messages) and suggests what to check. Up to 10 a day.</p>' +
      '<textarea id="askQ" rows="4" placeholder="e.g. Level Up says \u2018Couldn\u2019t get a question\u2019 every time"></textarea>' +
      '<div class="ask-row"><label><input type="checkbox" id="askErrs" checked> Include errors from this browser</label>' +
      '<button class="btn" id="askGo" type="button">Ask Claude</button></div>' +
      '<div id="askOut"></div><details id="askOld"><summary>Earlier answers</summary><div id="askLog"></div></details>';
    after.parentNode.insertBefore(sec, after);
    var css = document.createElement("style");
    css.textContent =
      "#askQ{width:100%;font:inherit;padding:10px;border:1px solid var(--rule);border-radius:10px;background:var(--paper);color:var(--ink);resize:vertical}" +
      ".ask-row{display:flex;justify-content:space-between;align-items:center;gap:10px;margin:8px 0;flex-wrap:wrap;font-size:.86rem}" +
      ".ask-ans{white-space:pre-wrap;padding:14px;border:1px solid var(--rule);border-radius:10px;margin-top:8px;line-height:1.5}" +
      "#askOld{margin-top:10px}#askOld summary{cursor:pointer;color:var(--ink-soft)}" +
      ".ask-q{font-weight:600;margin-top:12px}.ask-when{font-size:.75rem;color:var(--ink-soft)}";
    document.head.appendChild(css);
    var go = sec.querySelector("#askGo"), q = sec.querySelector("#askQ"), out = sec.querySelector("#askOut"), m = sec.querySelector("#askMsg");
    go.addEventListener("click", function(){
      var text = q.value.trim();
      if (text.length < 5){ m.textContent = "Say what's wrong first."; return; }
      go.disabled = true; go.textContent = "Asking\u2026"; out.textContent = "";
      var ctx = sec.querySelector("#askErrs").checked ? (window.__labErrs || []).slice(-15).join("\n") : "";
      window.call({ action:"askclaude", question:text, context:ctx }).then(function(d){
        var a = document.createElement("div"); a.className = "ask-ans"; a.textContent = d.answer || "(no answer)";
        out.appendChild(a); m.textContent = "Claude\u2019s answer is below. It can\u2019t see the code - if it needs changing, bring this back to the chat.";
        loadLog();
      }).catch(function(e){ m.textContent = e.message; }).then(function(){ go.disabled = false; go.textContent = "Ask Claude"; });
    });
    function loadLog(){
      window.call({ action:"askclaudelog" }).then(function(d){
        var box = sec.querySelector("#askLog"); box.textContent = "";
        (d.log || []).forEach(function(r){
          var w = document.createElement("div");
          var t = document.createElement("div"); t.className = "ask-when"; t.textContent = new Date(r.at).toLocaleString("en-GB");
          var qq = document.createElement("div"); qq.className = "ask-q"; qq.textContent = r.question;
          var aa = document.createElement("div"); aa.className = "ask-ans"; aa.textContent = r.answer || "";
          w.appendChild(t); w.appendChild(qq); w.appendChild(aa); box.appendChild(w);
        });
      }).catch(function(){});
    }
    loadLog();
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
      if (on.plant){
        var ticks = read("hl.exp.ticks", []); ticks.push(Date.now());
        store("hl.exp.ticks", ticks.slice(-200));
        setTimeout(paintPlant, 0);
      }
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

    /* Signed in: one Level Up question a day at this pupil's level
       (level-practice.js). Otherwise, or if that can't help, the old
       Gate Run question below. */
    if (window.LevelPractice && window.LevelPractice.signedIn()) {
      window.LevelPractice.daily({ q: q, opts: opts, note: note }, oldQuiz);
      return;
    }
    oldQuiz();
    function oldQuiz(){
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
  }


  /* ---------- Homework roulette ---------- */
  function roulette(){
    var panel = document.querySelector("#todoList") && document.querySelector("#todoList").closest(".panel");
    var title = panel && panel.querySelector(".panel-title");
    if (!title) return;
    var b = el("button", "ghost-btn exp-spin", "Pick for me"); b.type = "button";
    title.appendChild(b);
    b.addEventListener("click", function(){
      var left = [].slice.call(document.querySelectorAll("#todoList .todo-item:not(.done)"));
      if (!left.length){ b.textContent = "Nothing left!"; setTimeout(function(){ b.textContent = "Pick for me"; }, 1800); return; }
      left.forEach(function(x){ x.classList.remove("exp-pick"); });
      var n = calmer ? 1 : 12 + Math.floor(Math.random()*left.length), i = 0, at = 0, delay = 60;
      b.disabled = true;
      (function hop(){
        left.forEach(function(x){ x.classList.remove("exp-spinning"); });
        at = Math.floor(Math.random()*left.length);
        left[at].classList.add("exp-spinning");
        if (++i < n){ delay *= 1.12; setTimeout(hop, delay); return; }
        left[at].classList.remove("exp-spinning");
        left[at].classList.add("exp-pick");
        left[at].scrollIntoView({ behavior: calmer ? "auto" : "smooth", block:"nearest" });
        b.disabled = false; b.textContent = "Pick again";
      })();
    });
  }

  /* ---------- Focus sounds ----------
     Made from random numbers, not recordings: brown noise is a random
     walk, rain is white noise through a filter with a slow wobble. */
  function sounds(){
    var col = document.querySelector("#todoList") && document.querySelector("#todoList").closest(".col");
    if (!col) return;
    var p = el("div", "panel exp-panel"); p.id = "expSounds";
    tag(p);
    p.appendChild(el("p", "panel-title", "Focus sounds"));
    var row = el("div", "exp-row");
    var bRain = el("button", "ghost-btn", "Rain"), bBrown = el("button", "ghost-btn", "Brown noise"), bOff = el("button", "ghost-btn", "Off");
    [bRain, bBrown, bOff].forEach(function(x){ x.type = "button"; row.appendChild(x); });
    var vol = el("input", "exp-vol"); vol.type = "range"; vol.min = 0; vol.max = 100; vol.value = read("hl.exp.vol", 40);
    vol.setAttribute("aria-label", "Volume");
    p.appendChild(row); p.appendChild(vol);
    var focus = document.getElementById("expFocus");
    col.insertBefore(p, focus ? focus.nextSibling : col.firstChild);

    var ctx = null, src = null, gain = null, lfo = null, playing = "";
    function buffer(kind){
      var len = ctx.sampleRate * 4, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0), last = 0;
      for (var i = 0; i < len; i++){
        var w = Math.random()*2 - 1;
        if (kind === "brown"){ last = (last + 0.02*w) / 1.02; d[i] = last * 3.5; } else d[i] = w * 0.5;
      }
      return buf;
    }
    function stop(){
      try { if (src) src.stop(); if (lfo) lfo.stop(); } catch(e){}
      src = lfo = null; playing = ""; paint();
    }
    function play(kind){
      if (!window.AudioContext && !window.webkitAudioContext) return;
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === "suspended") ctx.resume();
      stop();
      gain = ctx.createGain(); gain.gain.value = vol.value/100 * 0.6;
      src = ctx.createBufferSource(); src.buffer = buffer(kind); src.loop = true;
      var tail = src;
      if (kind === "rain"){
        var f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 1400; f.Q.value = 0.6;
        var wob = ctx.createGain(); wob.gain.value = 0.85;
        lfo = ctx.createOscillator(); lfo.frequency.value = 0.15;
        var depth = ctx.createGain(); depth.gain.value = 0.15;
        lfo.connect(depth); depth.connect(wob.gain); lfo.start();
        src.connect(f); f.connect(wob); tail = wob;
      }
      tail.connect(gain); gain.connect(ctx.destination);
      src.start(); playing = kind; paint();
    }
    function paint(){
      bRain.classList.toggle("exp-on", playing === "rain");
      bBrown.classList.toggle("exp-on", playing === "brown");
    }
    bRain.addEventListener("click", function(){ play("rain"); });
    bBrown.addEventListener("click", function(){ play("brown"); });
    bOff.addEventListener("click", stop);
    vol.addEventListener("input", function(){ store("hl.exp.vol", +vol.value); if (gain) gain.gain.value = vol.value/100 * 0.6; });
  }

  /* ---------- Grow a plant ---------- */
  function plant(){
    var col = document.querySelector("#todoList") && document.querySelector("#todoList").closest(".col");
    if (!col) return;
    var p = el("div", "panel exp-panel"); p.id = "expPlant";
    tag(p);
    p.appendChild(el("p", "panel-title", "Your plant"));
    var art = el("div", "exp-plant-art"), cap = el("p", "exp-note");
    art.id = "expPlantArt"; cap.id = "expPlantCap";
    p.appendChild(art); p.appendChild(cap);
    col.appendChild(p);
    paintPlant();
  }
  function paintPlant(){
    var art = document.getElementById("expPlantArt"), cap = document.getElementById("expPlantCap");
    if (!art) return;
    var ticks = read("hl.exp.ticks", []), now = Date.now();
    var week = ticks.filter(function(t){ return now - t < 7*86400000; }).length;
    var last = ticks.length ? ticks[ticks.length-1] : 0;
    var thirsty = !last || now - last > 3*86400000;
    var stage = Math.min(5, week);                   /* 0 seed ... 5 in flower */
    var leaf = thirsty ? "#a0895a" : "#3fa34d", pot = "#c4693c";
    var lean = thirsty && stage ? 18 : 0;
    var leaves = "";
    for (var i = 0; i < stage; i++){
      var y = 92 - i*13, side = i % 2 ? 1 : -1;
      leaves += '<ellipse cx="' + (60 + side*12) + '" cy="' + y + '" rx="11" ry="5" fill="' + leaf +
                '" transform="rotate(' + (side*(25 + lean)) + ' ' + (60 + side*12) + ' ' + y + ')"/>';
    }
    var top = 100 - stage*13;
    var flower = stage >= 5 && !thirsty
      ? '<circle cx="60" cy="' + (top-4) + '" r="7" fill="#ffb703"/><circle cx="60" cy="' + (top-4) + '" r="3" fill="#d9480f"/>' : "";
    art.innerHTML =
      '<svg viewBox="0 0 120 140" width="120" height="140" role="img" aria-label="A plant at stage ' + stage + ' of 5">' +
      (stage ? '<path d="M60 112 Q' + (60 + lean) + ' ' + (top+20) + ' 60 ' + top + '" stroke="' + leaf + '" stroke-width="4" fill="none" stroke-linecap="round"/>' : '<ellipse cx="60" cy="110" rx="5" ry="3" fill="#7a5230"/>') +
      leaves + flower +
      '<path d="M38 112 h44 l-6 24 h-32 z" fill="' + pot + '"/><rect x="34" y="108" width="52" height="8" rx="2" fill="#a8552f"/></svg>';
    cap.textContent = !ticks.length ? "Tick off a to-do to plant the seed."
      : thirsty ? "It's drooping - nothing ticked off for three days. One to-do perks it up."
      : stage >= 5 ? "In flower! " + week + " ticked off this week."
      : week + " ticked off this week. " + (5 - stage) + " more and it flowers.";
  }

  /* ---------- Seasonal touches ---------- */
  function season(){
    var q = (location.search.match(/[?&]season=(halloween|bonfire)/) || [])[1];
    var d = new Date(), m = d.getMonth() + 1, day = d.getDate();
    var which = q || (m === 10 && day >= 24) || (m === 11 && day === 1) ? (q || "halloween")
              : (m === 11 && day >= 4 && day <= 6) ? "bonfire" : "";
    if (!which) return;
    if (which === "halloween"){
      var bats = el("div", "exp-bats"); bats.setAttribute("aria-hidden", "true");
      for (var i = 0; i < 5; i++){
        var b = el("span", "exp-bat");
        b.innerHTML = '<svg viewBox="0 0 40 16" width="34"><path d="M20 6 C17 2 12 1 6 4 C9 5 9 7 7 9 C11 8 13 9 14 12 C16 10 18 10 20 12 C22 10 24 10 26 12 C27 9 29 8 33 9 C31 7 31 5 34 4 C28 1 23 2 20 6Z" fill="currentColor"/></svg>';
        b.style.left = (8 + i*19) + "%"; b.style.animationDelay = (i*0.9) + "s";
        bats.appendChild(b);
      }
      document.body.appendChild(bats);
      return;
    }
    /* Bonfire Night: fireworks, once a day, unless asked for less motion. */
    if (calmer) return;
    var key = "hl.exp.fireworks";
    if (read(key, "") === today() && !q) return;
    store(key, today());
    var cv = el("canvas", "exp-fw"); cv.width = innerWidth; cv.height = innerHeight;
    document.body.appendChild(cv);
    var g = cv.getContext("2d"), parts = [], t0 = performance.now();
    function bang(){
      var x = innerWidth*(0.15 + Math.random()*0.7), y = innerHeight*(0.12 + Math.random()*0.35);
      var hue = Math.floor(Math.random()*360);
      for (var i = 0; i < 60; i++){
        var a = Math.random()*Math.PI*2, v = 1.5 + Math.random()*3.5;
        parts.push({ x:x, y:y, vx:Math.cos(a)*v, vy:Math.sin(a)*v, life:1, hue:hue + Math.random()*30 });
      }
    }
    var next = 0;
    (function frame(now){
      var el2 = now - t0;
      if (el2 < 4500 && el2 > next){ bang(); next = el2 + 350 + Math.random()*400; }
      g.clearRect(0, 0, cv.width, cv.height);
      parts = parts.filter(function(p){ return p.life > 0; });
      parts.forEach(function(p){
        p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.vx *= 0.985; p.life -= 0.012;
        g.fillStyle = "hsla(" + p.hue + ",100%,60%," + p.life + ")";
        g.fillRect(p.x, p.y, 3, 3);
      });
      if (el2 < 6500 || parts.length) requestAnimationFrame(frame); else cv.remove();
    })(t0);
  }

  /* ---------- Secret code ---------- */
  function konami(){
    var code = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"], at = 0;
    document.addEventListener("keydown", function(e){
      /* Not while typing: "ba" in a flashcard or a to-do is just "ba". */
      var t = e.target;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) { at = 0; return; }
      var k = e.key && e.key.length === 1 ? e.key.toLowerCase() : e.key;
      at = k === code[at] ? at + 1 : (k === code[0] ? 1 : 0);
      if (at < code.length) return;
      at = 0;
      var car = el("div", "exp-car"); car.setAttribute("aria-hidden", "true");
      car.innerHTML = '<svg viewBox="0 0 64 34" width="96"><rect x="0" y="12" width="64" height="15" rx="5" fill="#ff5a5f"/>' +
        '<rect x="15" y="2" width="30" height="13" rx="5" fill="#2b3a4a"/><circle cx="14" cy="28" r="6" fill="#23272e"/>' +
        '<circle cx="50" cy="28" r="6" fill="#23272e"/></svg>';
      var msg = el("div", "exp-found", "You found the secret. Now go and do your homework.");
      document.body.appendChild(msg);
      if (!calmer) document.body.appendChild(car);
      setTimeout(function(){ car.remove(); msg.remove(); }, 3600);
    });
  }

  /* ---------- Flashcards ---------- */
  function flashcards(){
    var col = document.querySelector("#todoList") && document.querySelector("#todoList").closest(".col");
    var left = col && col.parentNode.querySelector(".col");
    if (!left) return;
    var p = el("div", "panel exp-panel"); p.id = "expCards";
    tag(p);
    p.appendChild(el("p", "panel-title", "Flashcards"));
    var card = el("button", "exp-card"); card.type = "button";
    var meta = el("p", "exp-note");
    var nav = el("div", "exp-row");
    var bPrev = el("button", "ghost-btn", "Back"), bNext = el("button", "ghost-btn", "Next"),
        bMix = el("button", "ghost-btn", "Shuffle"), bDel = el("button", "ghost-btn", "Delete");
    [bPrev, bNext, bMix, bDel].forEach(function(x){ x.type = "button"; nav.appendChild(x); });
    var form = el("form", "exp-cardform");
    var f1 = el("input"), f2 = el("input"), add = el("button", "btn", "Add");
    f1.placeholder = "Front - e.g. Capital of France"; f2.placeholder = "Back - e.g. Paris";
    f1.maxLength = f2.maxLength = 200; add.type = "submit";
    form.appendChild(f1); form.appendChild(f2); form.appendChild(add);
    /* Decks: your own cards, plus Maths, English and History pitched at
       your level (level-practice.js). */
    var tabs = el("div", "exp-row lp-decks");
    var deckNote = el("p", "exp-note lp-tag");
    var bKnew = el("button", "ghost-btn", "I knew it"); bKnew.type = "button"; bKnew.hidden = true;
    nav.appendChild(bKnew);
    [["mine", "My cards"], ["maths", "Maths"], ["english", "English"], ["history", "History"]].forEach(function(dk){
      if (dk[0] !== "mine" && !window.LevelPractice) return;
      var t = el("button", "ghost-btn lp-deck", dk[1]); t.type = "button"; t.dataset.deck = dk[0];
      t.setAttribute("aria-pressed", dk[0] === "mine" ? "true" : "false");
      t.addEventListener("click", function(){ useDeck(dk[0]); });
      tabs.appendChild(t);
    });
    p.appendChild(tabs); p.appendChild(deckNote);
    p.appendChild(card); p.appendChild(meta); p.appendChild(nav); p.appendChild(form);
    left.appendChild(p);

    var mineCards = read("hl.exp.cards", []), cards = mineCards, at = 0, flipped = false, deckName = "mine";
    function useDeck(name){
      deckName = name; at = 0; flipped = false;
      [].forEach.call(tabs.children, function(t){ t.setAttribute("aria-pressed", t.dataset.deck === name ? "true" : "false"); });
      form.hidden = bDel.hidden = name !== "mine";
      bKnew.hidden = name !== "history";
      if (name === "mine") { cards = mineCards; deckNote.textContent = ""; paint(); return; }
      cards = []; deckNote.textContent = "Getting your cards..."; paint();
      window.LevelPractice.deck(name).then(function(r){
        if (deckName !== name) return;            /* switched deck while loading */
        cards = r.cards; deckNote.textContent = r.note; paint();
      });
    }
    bKnew.addEventListener("click", function(){
      if (!cards.length || cards[at].hist == null) return;
      window.LevelPractice.knewIt(cards[at].hist);
      cards[at].chip = (cards[at].chip || "") + " - known";
      at = (at + 1) % cards.length; flipped = false; paint();
    });
    function paint(){
      if (!cards.length){ card.textContent = deckName === "mine" ? "No cards yet. Add one below." : "No cards here yet."; card.disabled = true; meta.textContent = ""; }
      else {
        at = Math.max(0, Math.min(at, cards.length - 1));
        card.disabled = false;
        card.textContent = flipped ? cards[at].b : cards[at].f;
        card.classList.toggle("exp-flipped", flipped);
        meta.textContent = "Card " + (at+1) + " of " + cards.length + (cards[at].chip ? " - " + cards[at].chip : "") + (flipped ? " - the answer" : " - tap to flip");
      }
      [bPrev, bNext, bMix, bDel, bKnew].forEach(function(x){ x.disabled = !cards.length; });
    }
    card.addEventListener("click", function(){ flipped = !flipped; paint(); });
    bNext.addEventListener("click", function(){ at = (at + 1) % cards.length; flipped = false; paint(); });
    bPrev.addEventListener("click", function(){ at = (at - 1 + cards.length) % cards.length; flipped = false; paint(); });
    bMix.addEventListener("click", function(){
      for (var i = cards.length - 1; i > 0; i--){ var j = Math.floor(Math.random()*(i+1)); var t = cards[i]; cards[i] = cards[j]; cards[j] = t; }
      at = 0; flipped = false; if (deckName === "mine") store("hl.exp.cards", cards); paint();
    });
    bDel.addEventListener("click", function(){ cards.splice(at, 1); flipped = false; store("hl.exp.cards", cards); paint(); });
    form.addEventListener("submit", function(e){
      e.preventDefault();
      var a = f1.value.trim(), b = f2.value.trim();
      if (!a || !b) return;
      mineCards.push({ f:a, b:b }); store("hl.exp.cards", mineCards.slice(-300));
      at = cards.length - 1; flipped = false; f1.value = f2.value = ""; f1.focus(); paint();
    });
    paint();
  }


  /* ====================================================================
     Doodles and easter eggs. Three small 2d games in one overlay, plus
     Google-style search eggs. Nothing here touches the server: scores
     are kept on this device only.
     ==================================================================== */
  var GAMES = {
    snake:     { name:"Snake",       how:"Arrow keys or WASD - or swipe. Eat the apples, don't eat yourself." },
    breakout:  { name:"Brick Breaker",    how:"Move with the arrow keys, the mouse, or your finger. Clear every brick." },
    mole:      { name:"Whack-a-mole",how:"Click or tap the moles before they hide. Gold ones are worth three. 30 seconds." },
    echo:      { name:"Colour Echo", how:"Watch the colours light up, then tap them back in the same order." },
    katch:     { name:"Star Catch",  how:"Move with the mouse, the arrow keys or your finger. Catch stars, dodge rocks." },
    pairs:     { name:"Pairs",       how:"Turn two cards at a time and find every matching pair." },
    /* A doodle that isn't a canvas game: the packaged Scratch game is
       opened in a frame inside the same overlay. It keeps its own
       score, so the overlay doesn't show one. */
    fruit:     { name:"Fruit Slash", how:"Swipe with the mouse to slice the fruit - never the bomb.",
                 page:"/HEH-Launchpad-Scratch/sg-fruit.html" }
  };
  var overlay = null;

  /* Games access (the server decides; see games-gate.js). Asked once
     when the dashboard starts; until the answer comes, games work as
     before. A "no" locks the doodles and the Games panel. */
  var gamesNo = null;
  function askGames(then){
    if (!window.sb || !window.sb.rpc) return then && then();
    window.sb.rpc("my_games").then(function(r){
      if (!r.error && r.data && r.data.allowed === false) gamesNo = r.data.why || "Games are switched off for your account.";
      if (then) then();
    }, function(){ if (then) then(); });
  }
  function lockedNote(){
    var t = el("div", "panel exp-panel");
    t.style.cssText = "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:99999;max-width:420px;text-align:center";
    t.appendChild(el("p", null, "\ud83d\udd12 " + gamesNo)); document.body.appendChild(t);
    setTimeout(function(){ t.remove(); }, 4000);
  }
  function openGame(which){
    if (gamesNo) { lockedNote(); return; }
    if (overlay) overlay.close();
    var g = GAMES[which]; if (!g) return;
    var wrap = el("div", "exp-game"); wrap.setAttribute("role", "dialog"); wrap.setAttribute("aria-label", g.name);
    var box = el("div", "exp-game-box");
    var head = el("div", "exp-game-head");
    var title = el("b", null, g.name), score = el("span", "exp-game-score", "Score 0");
    var close = el("button", "ghost-btn", "Close"); close.type = "button";
    head.appendChild(title); head.appendChild(score); head.appendChild(close);
    var cv, frame = null;
    if (g.page) {
      frame = el("iframe", "exp-game-frame");
      frame.src = g.page; frame.title = g.name; frame.setAttribute("loading", "eager");
      cv = frame;                       // the thing that fills the box
      score.hidden = true;              // the game keeps its own score
    } else {
      cv = el("canvas", "exp-game-cv"); cv.width = 400; cv.height = 400; cv.tabIndex = 0;
    }
    var foot = el("p", "exp-note", g.how);
    box.appendChild(head); box.appendChild(cv); box.appendChild(foot);
    wrap.appendChild(box); document.body.appendChild(wrap);
    var ctx2 = frame ? null : cv.getContext("2d");
    var bestKey = "hl.exp.best." + which, best = read(bestKey, 0);
    var stopFn = null, alive = true;
    function setScore(n){ score.textContent = "Score " + n + (best ? " - best " + best : ""); }
    function finish(n, line){
      if (n > best){ best = n; store(bestKey, n); line = "New best! " + line; }
      setScore(n); foot.textContent = line + " Press Space or tap the board to play again.";
    }
    function onEsc(e){ if (e.key === "Escape") api.close(); }
    document.addEventListener("keydown", onEsc);
    var api = overlay = {
      close: function(){
        alive = false; if (stopFn) stopFn();
        document.removeEventListener("keydown", onEsc);
        wrap.remove(); overlay = null;
      }
    };
    close.addEventListener("click", api.close);
    wrap.addEventListener("click", function(e){ if (e.target === wrap) api.close(); });
    function colour(name){ return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#888"; }
    function start(){
      if (!alive) return;
      if (stopFn) stopFn();
      foot.textContent = g.how; setScore(0);
      stopFn = ({ snake:snake, breakout:breakout, mole:mole, echo:echo, katch:katch, pairs:pairs }[which])(cv, ctx2, setScore, finish, colour);
    }
    if (frame) { setTimeout(function(){ frame.focus(); }, 30); return; }
    cv.addEventListener("keydown", function(e){ if (e.key === " " && foot.textContent.indexOf("play again") > 0){ e.preventDefault(); start(); } });
    cv.addEventListener("click", function(){ if (foot.textContent.indexOf("play again") > 0) start(); });
    setTimeout(function(){ cv.focus(); start(); }, 30);
  }

  /* Swipes for phones, shared by Snake and Breakout. */
  function swipes(cv, cb){
    var sx = 0, sy = 0;
    function s(e){ var t = e.touches[0]; sx = t.clientX; sy = t.clientY; }
    function m(e){ e.preventDefault(); cb(e.touches[0].clientX, e.touches[0].clientY, sx, sy); }
    cv.addEventListener("touchstart", s, { passive:true });
    cv.addEventListener("touchmove", m, { passive:false });
    return function(){ cv.removeEventListener("touchstart", s); cv.removeEventListener("touchmove", m); };
  }

  function snake(cv, g, setScore, finish, colour){
    var N = 20, S = cv.width / N, body = [{x:9,y:10},{x:8,y:10},{x:7,y:10}], dir = {x:1,y:0}, want = dir;
    var apple = drop(), score = 0, timer = null, pulse = 0, gap = 130;
    function drop(){ var a; do { a = { x:Math.floor(Math.random()*N), y:Math.floor(Math.random()*N) }; }
      while (body.some(function(b){ return b.x === a.x && b.y === a.y; })); return a; }
    /* Checked against the QUEUED direction: two quick turns inside one
       tick used to let you reverse into your own neck and die unfairly. */
    function turn(x, y){ if (x !== -want.x || y !== -want.y) want = { x:x, y:y }; }
    function key(e){
      var k = e.key.toLowerCase(), m = { arrowup:[0,-1], w:[0,-1], arrowdown:[0,1], s:[0,1], arrowleft:[-1,0], a:[-1,0], arrowright:[1,0], d:[1,0] }[k];
      if (m){ e.preventDefault(); turn(m[0], m[1]); }
    }
    cv.addEventListener("keydown", key);
    var unswipe = swipes(cv, function(x, y, sx, sy){
      var dx = x - sx, dy = y - sy;
      if (Math.abs(dx) + Math.abs(dy) < 24) return;
      if (Math.abs(dx) > Math.abs(dy)) turn(dx > 0 ? 1 : -1, 0); else turn(0, dy > 0 ? 1 : -1);
    });
    function round(x, y, w, h, r){
      g.beginPath();
      if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h);
      g.fill();
    }
    function draw(){
      g.fillStyle = colour("--paper"); g.fillRect(0, 0, cv.width, cv.height);
      /* a faint board, so the squares read as squares */
      g.strokeStyle = "rgba(127,127,127,.10)"; g.lineWidth = 1;
      for (var i = 1; i < N; i++){
        g.beginPath(); g.moveTo(i*S, 0); g.lineTo(i*S, cv.width); g.stroke();
        g.beginPath(); g.moveTo(0, i*S); g.lineTo(cv.width, i*S); g.stroke();
      }
      /* the apple breathes a little, so the eye finds it at once */
      var r = S*0.36 + Math.sin(pulse/6) * S*0.04;
      g.fillStyle = "#e03131";
      g.beginPath(); g.arc(apple.x*S + S/2, apple.y*S + S/2, r, 0, Math.PI*2); g.fill();
      g.fillStyle = "#2f9e44";
      g.beginPath(); g.ellipse(apple.x*S + S/2 + r*0.5, apple.y*S + S/2 - r*0.9, r*0.42, r*0.2, -0.6, 0, Math.PI*2); g.fill();
      body.forEach(function(b, i){
        g.fillStyle = i ? "#2f9e44" : "#1b7a31";
        round(b.x*S + 1.5, b.y*S + 1.5, S - 3, S - 3, i ? 4 : 6);
      });
      /* eyes, looking the way you're going */
      var h = body[0], cx = h.x*S + S/2, cy = h.y*S + S/2, o = S*0.17;
      g.fillStyle = "#ffffff";
      g.beginPath(); g.arc(cx + dir.y*o - dir.x*o*0.2, cy + dir.x*o - dir.y*o*0.2, S*0.13, 0, Math.PI*2);
      g.arc(cx - dir.y*o - dir.x*o*0.2, cy - dir.x*o - dir.y*o*0.2, S*0.13, 0, Math.PI*2); g.fill();
      g.fillStyle = "#10281a";
      g.beginPath(); g.arc(cx + dir.y*o + dir.x*o*0.3, cy + dir.x*o + dir.y*o*0.3, S*0.07, 0, Math.PI*2);
      g.arc(cx - dir.y*o + dir.x*o*0.3, cy - dir.x*o + dir.y*o*0.3, S*0.07, 0, Math.PI*2); g.fill();
    }
    function step(){
      dir = want; pulse++;
      var h = { x: body[0].x + dir.x, y: body[0].y + dir.y };
      if (h.x < 0 || h.y < 0 || h.x >= N || h.y >= N || body.some(function(b){ return b.x === h.x && b.y === h.y; })){
        clearInterval(timer); timer = null; draw(); finish(score, "Game over - " + score + (score === 1 ? " apple." : " apples.")); return;
      }
      body.unshift(h);
      if (h.x === apple.x && h.y === apple.y){
        score++; setScore(score); apple = drop();
        /* it quickens as you grow, down to a brisk floor */
        var faster = Math.max(70, 130 - score * 4);
        if (faster !== gap){ gap = faster; clearInterval(timer); timer = setInterval(step, gap); }
      } else body.pop();
      draw();
    }
    draw(); timer = setInterval(step, gap);
    return function(){ if (timer) clearInterval(timer); cv.removeEventListener("keydown", key); unswipe(); };
  }

  function breakout(cv, g, setScore, finish, colour){
    var W = cv.width, H = cv.height, padW = 74, px = W/2 - padW/2, ball = fresh();
    var rows = 5, cols = 8, bw = W/cols, bh = 18, bricks = [], score = 0, keys = {}, raf = 0, lives = 3;
    var trail = [], shake = 0, last = 0, carry = 0, STEP = 1000/60;
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) bricks.push({ x:c*bw, y:40 + r*bh, on:true, r:r });
    var hues = ["#e03131","#f08c00","#f2c200","#2f9e44","#1c7ed6"];
    function fresh(){ return { x:W/2, y:H-60, vx:3, vy:-3.4, r:6 }; }
    function kd(e){ keys[e.key] = true; if (/Arrow/.test(e.key)) e.preventDefault(); }
    function ku(e){ keys[e.key] = false; }
    function mm(e){ var r = cv.getBoundingClientRect(); px = (e.clientX - r.left) * W / r.width - padW/2; }
    function blur(){ keys = {}; }
    cv.addEventListener("keydown", kd); cv.addEventListener("keyup", ku); cv.addEventListener("mousemove", mm);
    window.addEventListener("blur", blur);
    var unswipe = swipes(cv, function(x){ var r = cv.getBoundingClientRect(); px = (x - r.left) * W / r.width - padW/2; });

    /* One brick, checked properly: which side the ball came in by
       decides which way it leaves, so it can't slip through a corner. */
    function hitBrick(b){
      var nx = Math.max(b.x, Math.min(ball.x, b.x + bw)), ny = Math.max(b.y, Math.min(ball.y, b.y + bh));
      var dx = ball.x - nx, dy = ball.y - ny;
      if (dx*dx + dy*dy > ball.r*ball.r) return false;
      if (Math.abs(dx) > Math.abs(dy)) { ball.vx = Math.abs(ball.vx) * (dx < 0 ? -1 : 1); ball.x = nx + (dx < 0 ? -ball.r : ball.r); }
      else { ball.vy = Math.abs(ball.vy) * (dy < 0 ? -1 : 1); ball.y = ny + (dy < 0 ? -ball.r : ball.r); }
      return true;
    }
    function tick(){
      if (keys.ArrowLeft || keys.a || keys.A) px -= 7;
      if (keys.ArrowRight || keys.d || keys.D) px += 7;
      px = Math.max(0, Math.min(W - padW, px));
      ball.x += ball.vx; ball.y += ball.vy;
      trail.push({ x:ball.x, y:ball.y }); if (trail.length > 9) trail.shift();
      if (ball.x < ball.r){ ball.x = ball.r; ball.vx = Math.abs(ball.vx); }
      if (ball.x > W - ball.r){ ball.x = W - ball.r; ball.vx = -Math.abs(ball.vx); }
      if (ball.y < ball.r){ ball.y = ball.r; ball.vy = Math.abs(ball.vy); }
      /* the paddle: where it hits decides the angle, and it never
         catches the ball twice on the way up */
      if (ball.vy > 0 && ball.y + ball.r > H - 24 && ball.y < H - 10 && ball.x > px - 4 && ball.x < px + padW + 4){
        ball.y = H - 24 - ball.r; ball.vy = -Math.abs(ball.vy);
        ball.vx = ((ball.x - (px + padW/2)) / (padW/2)) * 4.4;
        var sp = Math.min(7.5, Math.hypot(ball.vx, ball.vy) + 0.12);
        var a = Math.atan2(ball.vy, ball.vx); ball.vx = Math.cos(a)*sp; ball.vy = Math.sin(a)*sp;
      }
      for (var i = 0; i < bricks.length; i++){
        var b = bricks[i];
        if (b.on && hitBrick(b)){ b.on = false; score += 5 - b.r; setScore(score); shake = 5; break; }
      }
      if (ball.y - ball.r > H){
        if (--lives <= 0){ draw(); finish(score, "Out of balls - " + score + " points."); return false; }
        ball = fresh(); trail = [];
      }
      if (!bricks.some(function(b){ return b.on; })){ draw(); finish(score, "Cleared it! " + score + " points."); return false; }
      return true;
    }
    /* A fixed step, so the game runs at the same speed on a 60Hz
       screen and a 120Hz one. */
    function frame(now){
      if (!last) last = now;
      carry += Math.min(100, now - last); last = now;
      while (carry >= STEP){ if (!tick()) return; carry -= STEP; }
      draw(); raf = requestAnimationFrame(frame);
    }
    function draw(){
      g.save();
      if (shake > 0){ g.translate((Math.random()-0.5)*shake, (Math.random()-0.5)*shake); shake -= 0.6; }
      g.fillStyle = colour("--paper"); g.fillRect(-8, -8, W + 16, H + 16);
      bricks.forEach(function(b){
        if (!b.on) return;
        g.fillStyle = hues[b.r];
        g.beginPath();
        if (g.roundRect) g.roundRect(b.x + 2, b.y + 2, bw - 4, bh - 4, 4); else g.rect(b.x + 2, b.y + 2, bw - 4, bh - 4);
        g.fill();
        g.fillStyle = "rgba(255,255,255,.28)"; g.fillRect(b.x + 5, b.y + 5, bw - 10, 3);
      });
      trail.forEach(function(t, i){
        g.globalAlpha = (i + 1) / trail.length * 0.33;
        g.fillStyle = colour("--ink");
        g.beginPath(); g.arc(t.x, t.y, ball.r * (0.4 + i/trail.length*0.5), 0, Math.PI*2); g.fill();
      });
      g.globalAlpha = 1;
      g.fillStyle = colour("--ink");
      g.beginPath();
      if (g.roundRect) g.roundRect(px, H - 24, padW, 9, 5); else g.rect(px, H - 24, padW, 9);
      g.fill();
      g.beginPath(); g.arc(ball.x, ball.y, ball.r, 0, Math.PI*2); g.fill();
      g.font = "bold 12px sans-serif";
      g.fillText("Balls: " + lives, 8, 20);
      g.restore();
    }
    raf = requestAnimationFrame(frame);
    return function(){ cancelAnimationFrame(raf); cv.removeEventListener("keydown", kd);
      cv.removeEventListener("keyup", ku); cv.removeEventListener("mousemove", mm);
      window.removeEventListener("blur", blur); unswipe(); };
  }

  function mole(cv, g, setScore, finish, colour){
    var W = cv.width, holes = [], score = 0, ends = performance.now() + 30000, raf = 0, nextPop = 0;
    var puffs = [], streak = 0, best = 0;
    for (var r = 0; r < 3; r++) for (var c = 0; c < 3; c++) holes.push({ x:70 + c*130, y:90 + r*120, up:0, hit:0, gold:false });
    function click(e){
      var rc = cv.getBoundingClientRect(), x = (e.clientX - rc.left) * W / rc.width, y = (e.clientY - rc.top) * W / rc.height;
      var now = performance.now(), got = false;
      holes.forEach(function(h){
        if (h.up > now && !h.hit && Math.hypot(x - h.x, y - (h.y - 18)) < 38){
          h.hit = now; h.up = now + 260; got = true;
          streak++; if (streak > best) best = streak;
          /* a golden mole is worth three, and a run of hits adds one more */
          score += (h.gold ? 3 : 1) + (streak >= 3 ? 1 : 0);
          setScore(score);
          puffs.push({ x:h.x, y:h.y - 30, t:now, gold:h.gold });
        }
      });
      /* a swing at nothing breaks the run */
      if (!got) streak = 0;
    }
    cv.addEventListener("pointerdown", click);
    function frame(now){
      if (now > ends){ draw(now); finish(score, "Time! " + score + " points, best run " + best + "."); return; }
      if (now > nextPop){
        var free = holes.filter(function(h){ return h.up < now; });
        if (free.length){
          var h = free[Math.floor(Math.random()*free.length)];
          h.gold = Math.random() < 0.16;
          h.up = now + (h.gold ? 620 : 700) + Math.random()*600; h.hit = 0;
        }
        nextPop = now + 380 + Math.random()*420 - Math.min(250, score*6);
      }
      draw(now); raf = requestAnimationFrame(frame);
    }
    function draw(now){
      g.fillStyle = "#8fd46a"; g.fillRect(0, 0, W, W);
      /* a few tufts of grass, so it isn't a flat green square */
      g.strokeStyle = "rgba(32,94,32,.25)"; g.lineWidth = 2;
      for (var i = 0; i < 26; i++){
        var gx = (i * 71) % W, gy = 30 + ((i * 133) % (W - 50));
        g.beginPath(); g.moveTo(gx, gy); g.lineTo(gx + 3, gy - 9); g.stroke();
      }
      var left = Math.max(0, (ends - now) / 30000);
      g.fillStyle = "rgba(0,0,0,.18)"; g.fillRect(10, 30, W - 20, 7);
      g.fillStyle = left < 0.25 ? "#e03131" : "#1b2430";
      g.fillRect(10, 30, (W - 20) * left, 7);
      g.fillStyle = "#1b2430"; g.font = "bold 14px sans-serif";
      g.fillText("Time " + Math.max(0, Math.ceil((ends - now)/1000)) + "s", 10, 22);
      if (streak >= 3){ g.fillStyle = "#b54708"; g.fillText("Run of " + streak + "!", W - 96, 22); }
      holes.forEach(function(h){
        g.fillStyle = "#5b3a1e"; g.beginPath(); g.ellipse(h.x, h.y + 10, 46, 16, 0, 0, Math.PI*2); g.fill();
        g.fillStyle = "rgba(0,0,0,.25)"; g.beginPath(); g.ellipse(h.x, h.y + 7, 38, 11, 0, 0, Math.PI*2); g.fill();
        if (h.up > now){
          /* it rises out of the hole rather than snapping into place */
          var life = h.up - now, rise = h.hit ? 10 : Math.min(1, (1 - Math.min(1, life / 900)) * 4 + 0.35) * 22;
          g.save(); g.translate(0, 22 - rise);
          g.fillStyle = h.hit ? "#c9a27e" : (h.gold ? "#e8b923" : "#8a5a3b");
          g.beginPath(); g.arc(h.x, h.y - 14, 30, Math.PI, 0); g.rect(h.x - 30, h.y - 14, 60, 22); g.fill();
          g.fillStyle = h.gold ? "#fff3c4" : "#c9a27e";
          g.beginPath(); g.ellipse(h.x, h.y - 6, 17, 12, 0, 0, Math.PI*2); g.fill();
          g.fillStyle = "#1b2430";
          g.beginPath(); g.arc(h.x - 10, h.y - 22, 3.4, 0, Math.PI*2); g.arc(h.x + 10, h.y - 22, 3.4, 0, Math.PI*2); g.fill();
          g.fillStyle = "#f783ac"; g.beginPath(); g.arc(h.x, h.y - 12, 5, 0, Math.PI*2); g.fill();
          g.restore();
        }
      });
      puffs = puffs.filter(function(p){ return now - p.t < 520; });
      puffs.forEach(function(p){
        var k = (now - p.t) / 520;
        g.globalAlpha = 1 - k;
        g.fillStyle = p.gold ? "#b54708" : "#1b2430";
        g.font = "bold " + (17 + k*9) + "px sans-serif";
        var word = p.gold ? "+3!" : "BONK";
        g.fillText(word, p.x - g.measureText(word).width/2, p.y - k*26);
        g.globalAlpha = 1;
      });
    }
    raf = requestAnimationFrame(frame);
    return function(){ cancelAnimationFrame(raf); cv.removeEventListener("pointerdown", click); };
  }
  /* ---------- Colour Echo: watch the pattern, play it back ---------- */
  function echo(cv, g, setScore, finish, colour){
    var W = cv.width, pads = [
      { c:"#e03131", lit:"#ff8787", x:0, y:0 }, { c:"#1c7ed6", lit:"#74c0fc", x:1, y:0 },
      { c:"#2f9e44", lit:"#8ce99a", x:0, y:1 }, { c:"#f2b200", lit:"#ffe066", x:1, y:1 }
    ];
    var seq = [], step = 0, showing = true, flash = -1, flashUntil = 0, raf = 0, round = 0;
    var next = performance.now() + 600, idx = 0, dead = false;
    /* Sized to fit BOTH ways: the header eats 54px of height, so the
       pads take whichever of the two budgets is smaller, then sit in
       the middle of what's left. */
    var M = 18, TOP = 54;
    var S = Math.min((W - M*3) / 2, (W - TOP - M*3) / 2);
    var ox = (W - (S*2 + M)) / 2, oy = TOP + (W - TOP - (S*2 + M)) / 2;
    pads.forEach(function(p){ p.px = ox + p.x*(S + M); p.py = oy + p.y*(S + M); });
    function grow(){ seq.push(Math.floor(Math.random()*4)); round++; showing = true; idx = 0; next = performance.now() + 420; }
    function at(x, y){
      for (var i = 0; i < 4; i++){ var p = pads[i];
        if (x >= p.px && x <= p.px + S && y >= p.py && y <= p.py + S) return i; }
      return -1;
    }
    function click(e){
      if (showing || dead) return;
      var rc = cv.getBoundingClientRect();
      var i = at((e.clientX - rc.left) * W / rc.width, (e.clientY - rc.top) * W / rc.height);
      if (i < 0) return;
      flash = i; flashUntil = performance.now() + 180;
      if (i === seq[step]){
        step++;
        if (step >= seq.length){ setScore(round); step = 0; setTimeout(grow, 420); }
      } else {
        dead = true;
        finish(round - 1, "Wrong colour - you reached round " + round + ".");
      }
    }
    cv.addEventListener("pointerdown", click);
    function frame(now){
      if (showing && now > next){
        if (idx < seq.length){ flash = seq[idx]; flashUntil = now + 340; idx++; next = now + 520; }
        else { showing = false; flash = -1; }
      }
      if (now > flashUntil && !showing) flash = -1;
      if (now > flashUntil && showing && flash >= 0 && now > flashUntil) flash = -1;
      draw(now);
      if (!dead) raf = requestAnimationFrame(frame);
    }
    function draw(now){
      g.fillStyle = colour("--paper"); g.fillRect(0, 0, W, W);
      g.fillStyle = colour("--ink"); g.font = "bold 20px sans-serif";
      g.fillText("Round " + Math.max(1, round), 18, 34);
      g.font = "13px sans-serif"; g.globalAlpha = .7;
      g.fillText(showing ? "Watch..." : "Your turn", W - 92, 34);
      g.globalAlpha = 1;
      pads.forEach(function(p, i){
        g.fillStyle = (flash === i && now < flashUntil) ? p.lit : p.c;
        g.beginPath();
        if (g.roundRect) g.roundRect(p.px, p.py, S, S, 16); else g.rect(p.px, p.py, S, S);
        g.fill();
      });
    }
    grow(); raf = requestAnimationFrame(frame);
    return function(){ cancelAnimationFrame(raf); cv.removeEventListener("pointerdown", click); };
  }

  /* ---------- Star Catch: a basket, falling stars, dodge the rocks ---------- */
  function katch(cv, g, setScore, finish, colour){
    var W = cv.width, H = cv.height, bx = W/2, bw = 84, score = 0, lives = 3;
    var drops = [], raf = 0, keys = {}, last = 0, carry = 0, STEP = 1000/60, spawn = 0, fall = 2.6;
    function kd(e){ keys[e.key] = true; if (/Arrow/.test(e.key)) e.preventDefault(); }
    function ku(e){ keys[e.key] = false; }
    function mm(e){ var r = cv.getBoundingClientRect(); bx = (e.clientX - r.left) * W / r.width; }
    function blur(){ keys = {}; }
    cv.addEventListener("keydown", kd); cv.addEventListener("keyup", ku); cv.addEventListener("mousemove", mm);
    window.addEventListener("blur", blur);
    var unswipe = swipes(cv, function(x){ var r = cv.getBoundingClientRect(); bx = (x - r.left) * W / r.width; });
    function star(g2, x, y, r, fill){
      g2.fillStyle = fill; g2.beginPath();
      for (var i = 0; i < 10; i++){
        var rr = i % 2 ? r*0.46 : r, a = -Math.PI/2 + i*Math.PI/5;
        g2[i ? "lineTo" : "moveTo"](x + Math.cos(a)*rr, y + Math.sin(a)*rr);
      }
      g2.closePath(); g2.fill();
    }
    function tick(now){
      if (keys.ArrowLeft || keys.a) bx -= 7;
      if (keys.ArrowRight || keys.d) bx += 7;
      bx = Math.max(bw/2, Math.min(W - bw/2, bx));
      if (now > spawn){
        drops.push({ x: 30 + Math.random()*(W - 60), y: -20, rock: Math.random() < 0.26, spin: Math.random()*6 });
        spawn = now + Math.max(260, 760 - score*9);
        fall = Math.min(6.5, 2.6 + score*0.05);
      }
      for (var i = drops.length - 1; i >= 0; i--){
        var d = drops[i]; d.y += fall; d.spin += 0.05;
        if (d.y > H - 46 && d.y < H - 8 && Math.abs(d.x - bx) < bw/2 + 8){
          drops.splice(i, 1);
          if (d.rock){ if (--lives <= 0){ draw(now); finish(score, "A rock got you - " + score + " stars."); return false; } }
          else { score++; setScore(score); }
        } else if (d.y > H + 24){
          drops.splice(i, 1);
          if (!d.rock && --lives <= 0){ draw(now); finish(score, "Three stars missed - " + score + " caught."); return false; }
        }
      }
      return true;
    }
    function frame(now){
      if (!last) last = now;
      carry += Math.min(100, now - last); last = now;
      while (carry >= STEP){ if (!tick(now)) return; carry -= STEP; }
      draw(now); raf = requestAnimationFrame(frame);
    }
    function draw(now){
      var sky = g.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, "#1b1b3a"); sky.addColorStop(1, "#3b2a5a");
      g.fillStyle = sky; g.fillRect(0, 0, W, H);
      for (var i = 0; i < 30; i++){
        g.globalAlpha = 0.25 + ((i * 37) % 10) / 20;
        g.fillStyle = "#ffffff";
        g.fillRect((i * 97) % W, (i * 53) % (H - 60), 2, 2);
      }
      g.globalAlpha = 1;
      drops.forEach(function(d){
        if (d.rock){
          g.save(); g.translate(d.x, d.y); g.rotate(d.spin);
          g.fillStyle = "#6b7280"; g.beginPath();
          g.moveTo(-11, 3); g.lineTo(-5, -10); g.lineTo(8, -8); g.lineTo(12, 4); g.lineTo(2, 11); g.closePath(); g.fill();
          g.restore();
        } else star(g, d.x, d.y, 12, "#ffd93d");
      });
      /* the basket */
      g.fillStyle = "#b45309";
      g.beginPath();
      g.moveTo(bx - bw/2, H - 40); g.lineTo(bx + bw/2, H - 40);
      g.lineTo(bx + bw/2 - 10, H - 10); g.lineTo(bx - bw/2 + 10, H - 10); g.closePath(); g.fill();
      g.fillStyle = "#92400e"; g.fillRect(bx - bw/2 - 3, H - 44, bw + 6, 7);
      g.fillStyle = "#ffffff"; g.font = "bold 14px sans-serif";
      g.fillText("Lives " + lives, 10, 24);
    }
    raf = requestAnimationFrame(frame);
    return function(){ cancelAnimationFrame(raf); cv.removeEventListener("keydown", kd);
      cv.removeEventListener("keyup", ku); cv.removeEventListener("mousemove", mm);
      window.removeEventListener("blur", blur); unswipe(); };
  }

  /* ---------- Pairs: turn two cards, find the match ---------- */
  function pairs(cv, g, setScore, finish, colour){
    var W = cv.width, N = 4, M = 14, TOP = 44;
    var S = Math.min((W - M*(N+1)) / N, (W - TOP - M*(N+1)) / N);
    var OX = (W - (S*N + M*(N-1))) / 2, OY = TOP + (W - TOP - (S*N + M*(N-1))) / 2;
    var icons = ["★","▲","●","♥","♪","❖","■","✿"];
    var deck = [], first = null, second = null, lock = 0, found = 0, turns = 0, raf = 0, done = false;
    icons.concat(icons).forEach(function(s){ deck.push({ s:s, up:false, gone:false }); });
    for (var i = deck.length - 1; i > 0; i--){ var j = Math.floor(Math.random()*(i+1)); var t = deck[i]; deck[i] = deck[j]; deck[j] = t; }
    deck.forEach(function(c, i){ c.cx = OX + (i % N)*(S + M); c.cy = OY + Math.floor(i / N)*(S + M); });
    var hues = ["#e03131","#1c7ed6","#2f9e44","#f2b200","#7c3aed","#0ca678","#f06595","#fd7e14"];
    deck.forEach(function(c){ c.hue = hues[icons.indexOf(c.s)]; });
    function click(e){
      if (lock > performance.now() || done) return;
      var rc = cv.getBoundingClientRect();
      var x = (e.clientX - rc.left) * W / rc.width, y = (e.clientY - rc.top) * W / rc.height;
      deck.forEach(function(c){
        if (c.gone || c.up) return;
        if (x < c.cx || x > c.cx + S || y < c.cy || y > c.cy + S) return;
        c.up = true;
        if (!first) { first = c; return; }
        second = c; turns++;
        if (first.s === second.s){
          first.gone = second.gone = true; found++; setScore(found);
          first = second = null;
          if (found === icons.length){ done = true; finish(found, "All matched in " + turns + " turns!"); }
        } else {
          lock = performance.now() + 700;
          var a = first, b = second; first = second = null;
          setTimeout(function(){ a.up = b.up = false; }, 700);
        }
      });
    }
    cv.addEventListener("pointerdown", click);
    function frame(){
      g.fillStyle = colour("--paper"); g.fillRect(0, 0, W, W);
      g.fillStyle = colour("--ink"); g.font = "bold 19px sans-serif";
      g.fillText("Pairs found " + found + " / " + icons.length, 14, 30);
      g.font = "13px sans-serif"; g.globalAlpha = .7;
      g.fillText("Turns " + turns, W - 78, 30); g.globalAlpha = 1;
      deck.forEach(function(c){
        if (c.gone){
          g.globalAlpha = .18;
          g.fillStyle = c.hue;
          g.beginPath();
          if (g.roundRect) g.roundRect(c.cx, c.cy, S, S, 12); else g.rect(c.cx, c.cy, S, S);
          g.fill(); g.globalAlpha = 1; return;
        }
        g.fillStyle = c.up ? c.hue : "#4c6ef5";
        g.beginPath();
        if (g.roundRect) g.roundRect(c.cx, c.cy, S, S, 12); else g.rect(c.cx, c.cy, S, S);
        g.fill();
        if (c.up){
          g.fillStyle = "#ffffff"; g.font = "bold " + Math.round(S*0.52) + "px sans-serif";
          g.fillText(c.s, c.cx + S/2 - g.measureText(c.s).width/2, c.cy + S*0.68);
        } else {
          g.strokeStyle = "rgba(255,255,255,.35)"; g.lineWidth = 3;
          g.beginPath(); g.arc(c.cx + S/2, c.cy + S/2, S*0.22, 0, Math.PI*2); g.stroke();
        }
      });
      if (!done) raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return function(){ cancelAnimationFrame(raf); cv.removeEventListener("pointerdown", click); };
  }

  /* ---------- Doodle of the day ---------- */
  function doodle(){
    var cols = document.querySelector(".columns");
    if (!cols) return;
    var keys = ["snake", "breakout", "mole", "echo", "katch", "pairs", "fruit"];
    var d = new Date(), n = Math.floor((d.getTime() - d.getTimezoneOffset()*60000) / 86400000);
    var which = keys[n % keys.length], g = GAMES[which];
    var bar = el("button", "exp-doodle"); bar.type = "button";
    bar.innerHTML = '<span class="exp-doodle-k">Today’s doodle</span><b></b><span class="exp-doodle-go">Play</span>';
    bar.querySelector("b").textContent = g.name;
    bar.addEventListener("click", function(){ openGame(which); });
    cols.parentNode.insertBefore(bar, cols);
  }

  /* ---------- Search easter eggs ---------- */
  function eggs(){
    var form = document.getElementById("searchForm"), box = document.getElementById("searchInput");
    if (!form || !box) return;
    function toast(text){
      var t = el("div", "exp-found", text); document.body.appendChild(t);
      setTimeout(function(){ t.remove(); }, 2600);
    }
    form.addEventListener("submit", function(e){
      var q = box.value.trim().toLowerCase().replace(/[?!.]+$/, "").replace(/\s+/g, " ");
      var hit = true;
      if (q === "do a barrel roll" || q === "z or r twice"){
        if (calmer) toast("Barrel roll! (Skipped - your device asked for less motion.)");
        else { document.body.classList.remove("exp-roll"); void document.body.offsetWidth; document.body.classList.add("exp-roll"); }
      } else if (q === "askew" || q === "tilt"){
        document.body.classList.toggle("exp-askew");
      } else if (q === "flip a coin" || q === "coin flip"){
        toast(Math.random() < 0.5 ? "Heads" : "Tails");
      } else if (q === "roll a die" || q === "roll a dice" || q === "roll dice"){
        toast("You rolled a " + (1 + Math.floor(Math.random()*6)));
      } else if (q === "recursion"){
        toast("Did you mean: recursion");
      } else if (q === "the answer to life the universe and everything" || q === "answer to life the universe and everything"){
        toast("42");
      } else if (q === "snake" || q === "play snake"){ openGame("snake");
      } else if (q === "brick breaker" || q === "breakout"){ openGame("breakout");
      } else if (q === "whack a mole" || q === "whack-a-mole"){ openGame("mole");
      } else hit = false;
      if (hit){ e.preventDefault(); e.stopImmediatePropagation(); box.value = ""; }
    }, true);
  }

  function gamesPanel(){
    var col = document.querySelector("#todoList") && document.querySelector("#todoList").closest(".col");
    var left = col && col.parentNode.querySelector(".col");
    if (!left || document.getElementById("expGames")) return;
    var p = el("div", "panel exp-panel"); p.id = "expGames"; tag(p);
    p.appendChild(el("p", "panel-title", "Games"));
    var grid = el("div", "x-ggrid");
    [["\ud83c\udfce\ufe0f", "Gate Run", "Race your ghost through the right answer", "/HEH-Launchpad-Game/?ghost=1"],
     ["\u2716\ufe0f", "Times Table Tycoon", "60 seconds - collect Numlings", "/HEH-Launchpad-Learn/tables.html"],
     ["\ud83d\udc09", "Word Dragons", "Grow dragons with English", "/HEH-Launchpad-Learn/dragons.html"],
     ["\u2694\ufe0f", "Battle Stories", "Hastings, 1066", "/HEH-Launchpad-Learn/history.html"],
     ["\ud83d\ude80", "Level Up", "Practice that learns you", "/HEH-Launchpad-Learn/levelup.html"],
     ["\ud83d\udd79\ufe0f", "Arcade", "Just for fun", "arcade.html"],
     /* The six Scratch-made games sit behind one button, rather than
        filling the panel with tiles. */
     ["\ud83e\udde9", "Scratch games", "Six games made in Scratch", "games.html#scratch"]].forEach(function(x){
      var a = el("a", "x-gtile"); a.href = x[3];
      a.appendChild(el("span", "x-gicon", x[0])); var w = el("span"); w.appendChild(el("b", null, x[1])); w.appendChild(el("small", null, x[2])); a.appendChild(w);
      grid.appendChild(a);
    });
    p.appendChild(grid);
    var all = el("a", null, "All games \u2192"); all.href = "games.html"; all.style.cssText = "display:inline-block;margin-top:10px;font-weight:600;color:var(--accent,#2f6bff)";
    p.appendChild(all); left.appendChild(p);
    askGames(function(){ if (!gamesNo) return;
      grid.textContent = ""; all.remove(); p.appendChild(el("p", "exp-note", "\ud83d\udd12 " + gamesNo));
      var bar = document.querySelector(".exp-doodle"); if (bar) bar.remove(); });
  }

  /* ---------- styles ---------- */
  var css = el("style");
  css.textContent =
    ".exp-panel{position:relative}" +
    ".x-ggrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:10px}" +
    ".x-gtile{display:flex;align-items:center;gap:12px;padding:12px;border:1px solid var(--rule);border-radius:12px;color:var(--ink);text-decoration:none}" +
    ".x-gtile:hover{border-color:var(--accent)}.x-gtile b{display:block}.x-gtile small{display:block;color:var(--ink-soft);font-size:.78rem}" +
    ".x-gicon{font-size:1.6rem;width:42px;height:42px;display:grid;place-items:center;border-radius:10px;background:var(--rule);flex:none}" +
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
    ".exp-note{font-size:.82rem;color:var(--ink-soft);margin:10px 0 0;min-height:1em}" +
    ".exp-spin{margin-left:10px;font-size:.72rem;padding:3px 10px;text-transform:none;letter-spacing:0}" +
    "#todoList .exp-spinning{outline:2px dashed #7c3aed;outline-offset:2px}" +
    "#todoList .exp-pick{outline:3px solid #7c3aed;outline-offset:2px;background:rgba(124,58,237,.08)}" +
    ".exp-on{background:var(--accent);color:#fff;border-color:var(--accent)}" +
    ".exp-vol{width:100%;margin-top:12px}" +
    ".exp-plant-art{display:flex;justify-content:center}" +
    ".exp-bats{position:fixed;left:0;right:0;top:30px;height:0;pointer-events:none;z-index:40}" +
    ".exp-bat{position:absolute;color:#2b2140;opacity:.75;animation:expbat 6s ease-in-out infinite}" +
    "@keyframes expbat{0%,100%{transform:translate(0,0)}25%{transform:translate(14px,8px)}50%{transform:translate(-6px,16px)}75%{transform:translate(-14px,4px)}}" +
    "@media (prefers-reduced-motion:reduce){.exp-bat{animation:none}}" +
    ".exp-fw{position:fixed;inset:0;pointer-events:none;z-index:9998}" +
    ".exp-car{position:fixed;bottom:20px;left:-120px;z-index:9999;pointer-events:none;animation:expdrive 3.4s ease-in forwards}" +
    "@keyframes expdrive{to{transform:translateX(calc(100vw + 240px))}}" +
    ".exp-found{position:fixed;left:50%;top:40%;transform:translate(-50%,-50%);z-index:9999;background:#7c3aed;color:#fff;" +
    "padding:12px 20px;border-radius:12px;font-weight:700;box-shadow:0 10px 30px -10px rgba(0,0,0,.5)}" +
    ".exp-card{display:block;width:100%;min-height:110px;margin:6px 0 0;padding:18px;border-radius:12px;" +
    "border:1px solid var(--rule);background:var(--card,#fff);color:var(--ink);font:inherit;font-size:1.1rem;" +
    "font-weight:600;cursor:pointer;text-align:center}" +
    ".exp-card{white-space:pre-line}.lp-decks{margin:2px 0 0}.lp-deck[aria-pressed=true]{border-color:currentColor;font-weight:700}.lp-tag{margin:4px 0 0;font-size:.78rem;opacity:.8}" +
    ".exp-card.exp-flipped{background:rgba(124,58,237,.08);border-color:#7c3aed}" +
    ".exp-cardform{display:grid;grid-template-columns:1fr 1fr auto;gap:6px;margin-top:12px}" +
    ".exp-cardform input{font:inherit;font-size:.85rem;padding:8px 10px;border:1px solid var(--rule);border-radius:8px;background:var(--paper);color:var(--ink);min-width:0}" +
    "@media (max-width:560px){.exp-cardform{grid-template-columns:1fr}}" +
    ".exp-game{position:fixed;inset:0;z-index:9990;background:rgba(10,12,20,.6);display:grid;place-items:center;padding:16px}" +
    ".exp-game-box{background:var(--card,#fff);color:var(--ink);border-radius:16px;padding:14px;width:min(440px,100%);" +
    "box-shadow:0 30px 70px -20px rgba(0,0,0,.7)}" +
    ".exp-game-head{display:flex;align-items:center;gap:10px;margin-bottom:10px}" +
    ".exp-game-head b{font-size:1.1rem}.exp-game-score{margin-left:auto;font-size:.82rem;color:var(--ink-soft)}" +
    ".exp-game-cv{display:block;width:100%;height:auto;aspect-ratio:1;border-radius:10px;border:1px solid var(--rule);touch-action:none;outline:none}" +
    ".exp-game-cv:focus-visible{outline:2px solid #7c3aed}" +
    ".exp-game-frame{width:min(92vw,760px);height:min(68vh,560px);border:0;border-radius:12px;background:#000;display:block}" +
    ".exp-doodle{display:flex;align-items:center;gap:12px;width:100%;margin:0 0 18px;padding:12px 16px;border:0;cursor:pointer;" +
    "border-radius:14px;font:inherit;color:#fff;text-align:left;" +
    "background:linear-gradient(100deg,#f08c00,#e8590c 40%,#c2255c);box-shadow:0 8px 24px -12px rgba(232,89,12,.8)}" +
    ".exp-doodle-k{font-size:.7rem;text-transform:uppercase;letter-spacing:.08em;opacity:.85}" +
    ".exp-doodle b{font-size:1.15rem}" +
    ".exp-doodle-go{margin-left:auto;background:#fff;color:#c2255c;border-radius:999px;padding:6px 16px;font-weight:800}" +
    "body.exp-roll{animation:exproll 1.4s ease-in-out}" +
    "@keyframes exproll{to{transform:rotate(360deg)}}" +
    "body.exp-askew{transform:rotate(2deg);transform-origin:center top}" +
    ".exp-lu-door{display:flex;align-items:center;gap:14px;text-decoration:none;color:#fff;border:0;background:linear-gradient(120deg,#4f46e5,#06b6d4)}.exp-lu-door small{display:block;opacity:.9;font-weight:400}.exp-lu-door b{font-size:1.1rem}.exp-lu-rocket{font-size:2rem}.exp-lu-go{margin-left:auto;font-size:1.6rem}.exp-lu-door:hover{filter:brightness(1.07)}.exp-dr-door{background:linear-gradient(120deg,#059669,#0ea5e9)}.exp-tt-door{background:linear-gradient(120deg,#f59e0b,#ef4444)}";
  document.head.appendChild(css);

  /* ---------- switch on whatever is on ---------- */
  function start(on){
    if (started) return; started = true;
    if (on.focus) focusTimer();
    if (on.sounds) sounds();
    if (on.warmup) warmup();
    if (on.plant) plant();
    if (on.cards) flashcards();
    if (on.roulette) roulette();
    if (on.season) season();
    if (on.konami) konami();
    gamesPanel();          // always on in the lab, like on the real site
    /* From the Games page: ?play=snake opens that game straight away. */
    var pm = location.search.match(/[?&]play=(snake|breakout|mole|echo|katch|pairs|fruit)\b/);
    if (pm) setTimeout(function(){ openGame(pm[1]); }, 300);
    if (on.doodle) doodle();
    if (on.eggs) eggs();
    if (on.streak || on.cheer || on.plant) watchTicks(on);
    if (on.streak) paintStreak();
    if (window.LabFun) window.LabFun.start(on);
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
