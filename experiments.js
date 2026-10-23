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
      says:"Make your own revision cards, flip them, shuffle them. Kept on this device." }
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
    p.appendChild(card); p.appendChild(meta); p.appendChild(nav); p.appendChild(form);
    left.appendChild(p);

    var cards = read("hl.exp.cards", []), at = 0, flipped = false;
    function paint(){
      if (!cards.length){ card.textContent = "No cards yet. Add one below."; card.disabled = true; meta.textContent = ""; }
      else {
        at = Math.max(0, Math.min(at, cards.length - 1));
        card.disabled = false;
        card.textContent = flipped ? cards[at].b : cards[at].f;
        card.classList.toggle("exp-flipped", flipped);
        meta.textContent = "Card " + (at+1) + " of " + cards.length + (flipped ? " - the answer" : " - tap to flip");
      }
      [bPrev, bNext, bMix, bDel].forEach(function(x){ x.disabled = !cards.length; });
    }
    card.addEventListener("click", function(){ flipped = !flipped; paint(); });
    bNext.addEventListener("click", function(){ at = (at + 1) % cards.length; flipped = false; paint(); });
    bPrev.addEventListener("click", function(){ at = (at - 1 + cards.length) % cards.length; flipped = false; paint(); });
    bMix.addEventListener("click", function(){
      for (var i = cards.length - 1; i > 0; i--){ var j = Math.floor(Math.random()*(i+1)); var t = cards[i]; cards[i] = cards[j]; cards[j] = t; }
      at = 0; flipped = false; store("hl.exp.cards", cards); paint();
    });
    bDel.addEventListener("click", function(){ cards.splice(at, 1); flipped = false; store("hl.exp.cards", cards); paint(); });
    form.addEventListener("submit", function(e){
      e.preventDefault();
      var a = f1.value.trim(), b = f2.value.trim();
      if (!a || !b) return;
      cards.push({ f:a, b:b }); store("hl.exp.cards", cards.slice(-300));
      at = cards.length - 1; flipped = false; f1.value = f2.value = ""; f1.focus(); paint();
    });
    paint();
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
    ".exp-card.exp-flipped{background:rgba(124,58,237,.08);border-color:#7c3aed}" +
    ".exp-cardform{display:grid;grid-template-columns:1fr 1fr auto;gap:6px;margin-top:12px}" +
    ".exp-cardform input{font:inherit;font-size:.85rem;padding:8px 10px;border:1px solid var(--rule);border-radius:8px;background:var(--paper);color:var(--ink);min-width:0}" +
    "@media (max-width:560px){.exp-cardform{grid-template-columns:1fr}}";
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
    if (on.streak || on.cheer || on.plant) watchTicks(on);
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
