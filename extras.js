/* ====================================================================
   Extras - things that started as lab experiments and were kept.

   Tried on the lab copy first (experiments.js there), given the verdict
   "Keep for main" on 23 October 2026, and moved here:
     homework streak, cheer on done, grow a plant, daily warm-up,
     focus sounds, flashcards, seasonal touches, the secret code,
     doodle of the day, and the search easter eggs.

   Everything here runs in the browser and keeps what it needs on the
   pupil's own device. Nothing is sent to the server.
   ==================================================================== */
(function(){
  "use strict";
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run); else run();
  function run(){
  if (!document.getElementById("todoList")) return;   // dashboard only
  if (document.documentElement.classList.contains("lab")) return;   // the lab runs experiments.js instead
  var calmer = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var started = false;

  function store(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }
  function read(k, d){ try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch(e){ return d; } }
  function today(){ var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0"); }
  function el(tag, cls, text){ var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function tag(){ /* the lab marks these; the real site doesn't */ }


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
    var days = read("hl.x.doneDays", []);
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
        var ticks = read("hl.x.ticks", []); ticks.push(Date.now());
        store("hl.x.ticks", ticks.slice(-200));
        setTimeout(paintPlant, 0);
      }
      if (on.streak){
        var days = read("hl.x.doneDays", []);
        if (days.indexOf(today()) < 0){ days.push(today()); store("hl.x.doneDays", days.slice(-120)); }
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
      var done = read("hl.x.warmupDone", null);
      item.options.forEach(function(o){
        var b = el("button", "ghost-btn exp-opt", o); b.type = "button";
        b.addEventListener("click", function(){
          var right = o === item.answer;
          store("hl.x.warmupDone", { day: today(), pick: o });
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
    var saved = read("hl.x.warmup", null);
    if (saved && saved.day === today()) { show(saved.item); return; }
    var s = document.createElement("script");
    s.src = "https://gaterun.civilinitiatives.org/questions.js";
    s.onload = function(){
      if (!window.QUIZ){ q.textContent = "Couldn't load today's question."; return; }
      var m = QUIZ.next("both", 1);
      var item = { text: m.text, answer: String(m.answer), options: m.options.map(String), note: m.note || "" };
      store("hl.x.warmup", { day: today(), item: item });
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
    var vol = el("input", "exp-vol"); vol.type = "range"; vol.min = 0; vol.max = 100; vol.value = read("hl.x.vol", 40);
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
    vol.addEventListener("input", function(){ store("hl.x.vol", +vol.value); if (gain) gain.gain.value = vol.value/100 * 0.6; });
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
    var ticks = read("hl.x.ticks", []), now = Date.now();
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
    var key = "hl.x.fireworks";
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

    var mineCards = read("hl.x.cards", []), cards = mineCards, at = 0, flipped = false, deckName = "mine";
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
      at = 0; flipped = false; if (deckName === "mine") store("hl.x.cards", cards); paint();
    });
    bDel.addEventListener("click", function(){ cards.splice(at, 1); flipped = false; store("hl.x.cards", cards); paint(); });
    form.addEventListener("submit", function(e){
      e.preventDefault();
      var a = f1.value.trim(), b = f2.value.trim();
      if (!a || !b) return;
      mineCards.push({ f:a, b:b }); store("hl.x.cards", mineCards.slice(-300));
      at = cards.length - 1; flipped = false; f1.value = f2.value = ""; f1.focus(); paint();
    });
    paint();
  }


  /* ====================================================================
     Doodles and easter eggs. The doodle games themselves live on their
     own site now - doodles.civilinitiatives.org (HEH-Doodles, GPL-3.0).
     The dashboard only links there: the doodle of the day, the search
     eggs and the Games tiles all open the game on that site.
     ==================================================================== */
  var DOODLES = "https://doodles.civilinitiatives.org/";
  var GAMES = {
    snake:"Snake", breakout:"Brick Breaker", mole:"Whack-a-mole", echo:"Colour Echo",
    katch:"Star Catch", pairs:"Pairs", fruit:"Fruit Slash"
  };

  /* "learning" = this account has only the learning games switched on
     (admin panel -> Games). Then the doodles, the doodle of the day and
     the fun tiles stay away. Asked once, from the same my_games() the
     game pages ask. Unknown (server not reachable) counts as "all", like
     the games gate. */
  var gameLevel = "all";
  function askLevel(){
    try {
      if (!window.sb || !window.sb.rpc) return Promise.resolve("all");
      return window.sb.rpc("my_games").then(function(r){
        var d = r && r.data;
        return d && d.allowed && d.level === "learning" ? "learning" : "all";
      }, function(){ return "all"; });
    } catch (e) { return Promise.resolve("all"); }
  }

  function openGame(which){
    if (gameLevel === "learning" || !GAMES[which]) return;
    location.href = DOODLES + "#" + which;
  }

  /* ---------- Doodle of the day ---------- */
  function doodle(){
    var cols = document.querySelector(".columns");
    if (!cols) return;
    var keys = ["snake", "breakout", "mole", "echo", "katch", "pairs", "fruit"];
    var d = new Date(), n = Math.floor((d.getTime() - d.getTimezoneOffset()*60000) / 86400000);
    var which = keys[n % keys.length];
    var bar = el("button", "exp-doodle"); bar.type = "button";
    bar.innerHTML = '<span class="exp-doodle-k">Today’s doodle</span><b></b><span class="exp-doodle-go">Play</span>';
    bar.querySelector("b").textContent = GAMES[which];
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

  /* ---------- styles ---------- */
  var css = el("style");
  css.textContent =
    ".exp-panel{position:relative}" +
    ".x-ggrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:10px}" +
    ".x-gtile{display:flex;align-items:center;gap:12px;padding:12px;border:1px solid var(--rule);border-radius:12px;background:transparent;" +
    "color:var(--ink);text-decoration:none;text-align:left;font:inherit;cursor:pointer;transition:transform .15s,border-color .15s}" +
    ".x-gtile:hover:not(:disabled){border-color:var(--accent);transform:translateY(-1px)}" +
    ".x-gtile b{display:block}.x-gtile small{display:block;color:var(--ink-soft);font-size:.78rem}" +
    ".x-gicon{font-size:1.6rem;width:42px;height:42px;display:grid;place-items:center;border-radius:10px;background:var(--rule);flex:none}" +
    ".x-gtile.soon{opacity:.6;cursor:default}.x-gtile.soon small{font-style:italic}" +
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
    ".exp-doodle{display:flex;align-items:center;gap:12px;width:100%;margin:0 0 18px;padding:12px 16px;border:0;cursor:pointer;" +
    "border-radius:14px;font:inherit;color:#fff;text-align:left;" +
    "background:linear-gradient(100deg,#f08c00,#e8590c 40%,#c2255c);box-shadow:0 8px 24px -12px rgba(232,89,12,.8)}" +
    ".exp-doodle-k{font-size:.7rem;text-transform:uppercase;letter-spacing:.08em;opacity:.85}" +
    ".exp-doodle b{font-size:1.15rem}" +
    ".exp-doodle-go{margin-left:auto;background:#fff;color:#c2255c;border-radius:999px;padding:6px 16px;font-weight:800}" +
    "body.exp-roll{animation:exproll 1.4s ease-in-out}" +
    "@keyframes exproll{to{transform:rotate(360deg)}}" +
    "body.exp-askew{transform:rotate(2deg);transform-origin:center top}" +
    ".exp-lu-door{display:flex;align-items:center;gap:14px;text-decoration:none;color:#fff;border:0;background:linear-gradient(120deg,#4f46e5,#06b6d4)}.exp-lu-door small{display:block;opacity:.9;font-weight:400}.exp-lu-door b{font-size:1.1rem}.exp-lu-rocket{font-size:2rem}.exp-lu-go{margin-left:auto;font-size:1.6rem}.exp-lu-door:hover{filter:brightness(1.07)}";
  document.head.appendChild(css);


  /* ---------- Games: fills the space under the left column ----------
     Every game here has been tried on the lab first. (Tycoon's trading
     stays lab only - the server decides that.) */
  function gamesHub(){
    var col = document.querySelector("#todoList") && document.querySelector("#todoList").closest(".col");
    var left = col && col.parentNode.querySelector(".col");
    if (!left || document.getElementById("xGames")) return;
    var p = el("div", "panel x-games"); p.id = "xGames";
    p.appendChild(el("p", "panel-title", "Games"));
    var grid = el("div", "x-ggrid");
    function tile(icon, name, sub, go, soon){
      var t = el(typeof go === "string" ? "a" : "button", "x-gtile" + (soon ? " soon" : ""));
      if (typeof go === "string") { t.href = go; } else { t.type = "button"; if (go) t.addEventListener("click", go); else t.disabled = true; }
      var i = el("span", "x-gicon", icon), w = el("span");
      w.appendChild(el("b", null, name)); w.appendChild(el("small", null, sub));
      t.appendChild(i); t.appendChild(w); grid.appendChild(t);
    }
    tile("🏎️", "Gate Run", "Steer through the right answer", "https://gaterun.civilinitiatives.org/");
    tile("🚀", "Level Up", "Practice at your level", "https://learn.civilinitiatives.org/levelup.html");
    tile("✖️", "Times Table Tycoon", "60-second rounds", "https://learn.civilinitiatives.org/tables.html");
    tile("🐉", "Word Dragons", "Grow dragons with English", "https://learn.civilinitiatives.org/dragons.html");
    tile("⚔️", "Battle Stories", "Hastings, 1066", "https://learn.civilinitiatives.org/history.html");
    if (gameLevel === "learning") {
      tile("🧭", "Map Quest", "Capitals, maps, the compass", "https://learn.civilinitiatives.org/geo.html");
    } else {
      tile("🐍", "Snake", "Eat the apples", function(){ openGame("snake"); });
      tile("🧱", "Brick Breaker", "Clear every brick", function(){ openGame("breakout"); });
      tile("🔨", "Whack-a-mole", "30 seconds", function(){ openGame("mole"); });
      tile("🕹️", "Arcade", "Just for fun - 8 games", "https://arcade.civilinitiatives.org/");
      /* The six Scratch-made games sit behind one button, rather than
         filling the panel with tiles. */
      tile("🧩", "Scratch games", "Six games made in Scratch", "https://play.civilinitiatives.org/#scratch");
    }
    p.appendChild(grid);
    var all = el("a", null, "All games \u2192"); all.href = "https://play.civilinitiatives.org/"; all.style.cssText = "display:inline-block;margin-top:10px;font-weight:600";
    p.appendChild(all);
    left.appendChild(p);
  }

  function start(){
    if (started) return; started = true;
    var on = { sounds:1, warmup:1, plant:1, cards:1, season:1, konami:1, doodle:1, eggs:1, streak:1, cheer:1 };
    sounds(); warmup(); plant(); flashcards(); season(); konami(); eggs();
    /* The doodle and the games panel wait for one answer: which games
       this account has. */
    askLevel().then(function(level){
      gameLevel = level;
      if (level !== "learning") doodle();
      gamesHub();
      /* Old links: ?play=snake now goes to that game on the doodles site. */
      var pm = location.search.match(/[?&]play=(snake|breakout|mole|echo|katch|pairs|fruit)\b/);
      if (pm) openGame(pm[1]);
    });
    watchTicks(on);
    paintStreak();
  }

  /* Once a pupil is signed in and the dashboard is showing. */
  var tries = 0;
  (function wait(){
    if (window.currentUser && !window.currentUser.offline) return start();
    if (++tries < 240) setTimeout(wait, 500);
  })();
  }
})();
