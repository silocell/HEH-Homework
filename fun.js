/* =====================================================================
   Fun experiments (lab) - 24 October 2026.
   Each one is switched on and off from the admin panel's Experiments
   list, like the others in experiments.js, which calls LabFun.start().

   Server parts (fun_oct24.sql) are only ever reached through functions
   that check who is asking: the Monster can only be hit by Level Up for
   a right answer, the pet fed at most once an hour per pupil, and Would
   you rather allows one vote a day and shows totals, never names.
   Everything else here stays on this device (localStorage, hl.fun.*).
   ===================================================================== */
(function(){
  function el(tag, cls, text){ var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function read(k, d){ try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch(e){ return d; } }
  function store(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }
  function today(){ var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0"); }
  function pick(a){ return a[Math.floor(Math.random() * a.length)]; }
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function cols(){ var col = document.querySelector("#todoList") && document.querySelector("#todoList").closest(".col");
    return { right: col, left: col && col.parentNode.querySelector(".col") }; }
  /* These are the daft ones - a class pet, an excuse machine, a sticker
     book. They say so on the panel, so nobody mistakes any of it for
     school work. */
  function panel(id, title, where){ var c = cols(), host = where === "right" ? c.right : c.left; if (!host || document.getElementById(id)) return null;
    var p = el("div", "panel exp-panel fun-panel"); p.id = id;
    p.appendChild(el("span", "exp-tag", "Lab experiment"));
    var t = el("p", "panel-title", title);
    t.appendChild(el("span", "fun-pill", "Just for fun"));
    p.appendChild(t);
    if (where === "right-top") { var todo = document.querySelector("#todoList").closest(".panel"); c.right.insertBefore(p, todo); }
    else host.appendChild(p);
    return p; }
  function rpc(name, args){ return window.sb.rpc(name, args || {}).then(function(r){ if (r.error) throw r.error; return r.data; }); }

  /* ---------- Homework Monster ---------- */
  function monster(){
    var p = panel("funMonster", "Homework Monster", "right-top"); if (!p) return;
    var name = el("p", "fun-big", "..."), bar = el("div", "fun-bar"), fill = el("div", "fun-fill"), info = el("p", "exp-note"), face = el("div", "fun-monster", "👾");
    bar.appendChild(fill);
    var go = el("a", "ghost-btn", "Hit it in Level Up →"); go.href = "/HEH-Launchpad-Learn/levelup.html";
    p.appendChild(face); p.appendChild(name); p.appendChild(bar); p.appendChild(info); p.appendChild(go);
    var faces = ["👾","👹","🐙","🦑","🐲","🧌","👻","🦖"];
    function paint(m){
      face.textContent = m.beaten ? "💥" : faces[Math.abs(hash(m.week)) % faces.length];
      name.textContent = m.beaten ? m.name + " is beaten!" : m.name;
      var pct = Math.max(0, Math.round(100 * m.hp / m.max)); fill.style.width = pct + "%";
      fill.style.background = pct > 50 ? "#ef4444" : pct > 20 ? "#f97316" : "#facc15";
      info.textContent = m.beaten ? "The year group beat it this week. A new one turns up on Monday."
        : m.hp + " of " + m.max + " health left. Every right answer in Level Up, from anyone in the year, hits it. " +
          m.helpers + " fighting so far" + (m.mine ? " - you've hit it " + m.mine + (m.mine === 1 ? " time." : " times.") : ".");
    }
    function load(){ rpc("monster_state").then(paint).catch(function(){ info.textContent = "The monster's asleep (not set up on this server yet)."; }); }
    load(); setInterval(function(){ if (!document.hidden) load(); }, 30000);
  }
  function hash(s){ var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }

  /* ---------- Class pet ---------- */
  function pet(){
    var p = panel("funPet", "Class pet", "left"); if (!p) return;
    var art = el("div", "fun-pet"), line = el("p", "fun-big"), info = el("p", "exp-note");
    p.appendChild(art); p.appendChild(line); p.appendChild(info);
    var name = "Biscuit";
    function paint(s){
      var stage = s.total < 10 ? 0 : s.total < 40 ? 1 : s.total < 120 ? 2 : 3;
      var looks = ["🥚","🐣","🐥","🦆"];
      var hungry = !s.three_days, happy = s.today >= 3;
      art.textContent = hungry ? "😿" : looks[stage];
      art.style.fontSize = (40 + stage * 14) + "px";
      art.classList.toggle("fun-bounce", happy && !reduce);
      line.textContent = hungry ? name + " is hungry and sulking" : happy ? name + " is having a brilliant day" : name + " is doing OK";
      info.textContent = "Fed " + s.today + " times today, " + s.total + " altogether. Tick off a to-do to feed " + name + " (once an hour each).";
    }
    function load(){ rpc("pet_state").then(paint).catch(function(){ info.textContent = name + " hasn't moved in yet (not set up on this server)."; }); }
    load();
    document.addEventListener("change", function(e){
      var t = e.target; if (!t || t.type !== "checkbox" || !t.closest || !t.closest("#todoList") || !t.checked) return;
      rpc("pet_feed").then(function(fed){ if (fed) { toast("You fed " + name + "! 🍪"); load(); } }).catch(function(){});
    }, true);
  }

  /* ---------- Would you rather ---------- */
  function wyr(){
    var p = panel("funWyr", "Would you rather...", "left"); if (!p) return;
    var a = el("button", "ghost-btn fun-choice"), or = el("span", "fun-or", "or"), b = el("button", "ghost-btn fun-choice"), info = el("p", "exp-note");
    a.type = b.type = "button";
    var row = el("div", "fun-wyr"); row.appendChild(a); row.appendChild(or); row.appendChild(b);
    p.appendChild(row); p.appendChild(info);
    function paint(q){
      var total = q.votes_a + q.votes_b;
      function lbl(btn, text, n, me){ btn.textContent = "";
        btn.appendChild(el("span", null, "..." + text));
        if (q.mine) { var pc = total ? Math.round(100 * n / total) : 0; btn.appendChild(el("b", "fun-pc", pc + "%")); btn.style.setProperty("--pc", pc + "%"); }
        btn.disabled = !!q.mine; btn.classList.toggle("fun-mine", q.mine === me); }
      lbl(a, q.a, q.votes_a, "a"); lbl(b, q.b, q.votes_b, "b");
      info.textContent = q.mine ? total + (total === 1 ? " vote" : " votes") + " so far today. New question tomorrow." : "Pick one - you can't change it, and nobody sees who picked what.";
    }
    a.addEventListener("click", function(){ rpc("wyr_vote", { p: "a" }).then(paint); });
    b.addEventListener("click", function(){ rpc("wyr_vote", { p: "b" }).then(paint); });
    rpc("wyr_today").then(paint).catch(function(){ info.textContent = "No question today (not set up on this server yet)."; });
  }

  /* ---------- Excuse-o-Matic ---------- */
  var WHO = ["A pigeon","My little brother","The Wi-Fi","A very confused postman","My cat","Next door's tortoise","A gust of wind","The printer","A time traveller","My nan's parrot"];
  var DID = ["filed it under Lost Property","used it as a paper aeroplane","ate the second page","turned it into a hat","uploaded it to the wrong planet","hid it in the freezer","mistook it for a takeaway menu","read it and got too emotional","laminated it by accident","sent it to a different school"];
  var BUT = ["and then it rained.","and it's still in the garden.","so it's technically in orbit.","but it was very good work.","and I've been too upset to write it again.","and now it's in a museum.","and the dog says sorry.","so I'm owed an extra week."];
  function excuse(){
    var p = panel("funExcuse", "Excuse-o-Matic", "left"); if (!p) return;
    var out = el("p", "fun-big fun-excuse", "Press the button for a homework excuse."), btn = el("button", "ghost-btn", "Make an excuse");
    var warn = el("p", "exp-note", "Guaranteed not to work. Please do your homework.");
    btn.type = "button"; p.appendChild(out); p.appendChild(btn); p.appendChild(warn);
    btn.addEventListener("click", function(){ out.textContent = "“" + pick(WHO) + " " + pick(DID) + ", " + pick(BUT) + "”"; });
  }

  /* ---------- Fortune cookie ---------- */
  var FORTUNES = [
    "Tip: explain it to a teddy bear. If the bear gets it, you've got it.",
    "Tip: do the hardest homework first, while your brain is fresh.",
    "Tip: 25 minutes on, 5 minutes off. Your brain likes breaks.",
    "Tip: test yourself instead of re-reading - it sticks far better.",
    "Tip: write tomorrow's to-do list tonight.",
    "Tip: sleep is when your brain saves what you learned today.",
    "Tip: stuck? Write down exactly which bit you're stuck on. Half the time that solves it.",
    "Joke: why did the maths book look sad? It had too many problems.",
    "Joke: what do you call a dinosaur with a big vocabulary? A thesaurus.",
    "Joke: why was the teacher wearing sunglasses? Her pupils were too bright.",
    "Joke: why did the student eat his homework? The teacher said it was a piece of cake.",
    "Joke: what's a pirate's favourite subject? Arrrrt.",
    "Joke: why can't you trust atoms? They make up everything.",
    "Fortune: a good mark is heading your way. It's being chased by homework.",
    "Fortune: today you will find something you lost. Possibly a pen.",
    "Fortune: someone will laugh at your joke today. Make sure it's a good one.",
    "Fortune: you will be very good at something you haven't tried yet."
  ];
  function fortune(){
    var p = panel("funFortune", "Fortune cookie", "right"); if (!p) return;
    var cookie = el("button", "fun-cookie", "🥠"), out = el("p", "fun-big", "Tap the cookie to crack it open.");
    cookie.type = "button"; cookie.setAttribute("aria-label", "Crack the fortune cookie");
    p.appendChild(cookie); p.appendChild(out);
    var saved = read("hl.fun.fortune", null);
    if (saved && saved.day === today()) { cookie.textContent = "🍪"; cookie.disabled = true; out.textContent = saved.text; return; }
    cookie.addEventListener("click", function(){
      var t = FORTUNES[Math.floor(Math.random() * FORTUNES.length)];
      store("hl.fun.fortune", { day: today(), text: t });
      cookie.textContent = "🍪"; cookie.disabled = true; out.textContent = t + " (Another one tomorrow.)";
      award("cookie");
    });
  }

  /* ---------- Upside-down day ---------- */
  function upside(){
    document.documentElement.classList.add("fun-upside");
    var b = el("button", "fun-unflip", "Flip it back (just for me)"); b.type = "button";
    b.addEventListener("click", function(){ document.documentElement.classList.remove("fun-upside"); b.remove(); });
    document.body.appendChild(b);
    award("upside");
  }

  /* ---------- Sticker book ---------- */
  var STICKERS = [
    { k:"first",  i:"⭐", n:"First tick",        d:"Tick off a to-do." },
    { k:"ten",    i:"🔟", n:"Ten done",          d:"Tick off 10 to-dos." },
    { k:"sunday", i:"🌞", n:"Sunday worker",     d:"Tick off a to-do on a Sunday." },
    { k:"owl",    i:"🦉", n:"Night owl",         d:"Tick off a to-do after 8pm." },
    { k:"early",  i:"🐓", n:"Early bird",        d:"Tick off a to-do before 8am." },
    { k:"logo",   i:"🖱️", n:"Logo poker",        d:"Click the Homework Launchpad name 50 times." },
    { k:"cookie", i:"🥠", n:"Cookie cracker",    d:"Crack a fortune cookie." },
    { k:"arcade", i:"🕹️", n:"Arcade regular",    d:"Get a score in 3 different Arcade games." },
    { k:"upside", i:"🙃", n:"Upside-downer",     d:"Be here on upside-down day." },
    { k:"week",   i:"📅", n:"Seven days",        d:"Visit the dashboard on 7 different days." }
  ];
  function award(k){
    var got = read("hl.fun.stickers", {});
    if (got[k]) return; got[k] = today(); store("hl.fun.stickers", got);
    var s = STICKERS.filter(function(x){ return x.k === k; })[0];
    if (s) toast("New sticker: " + s.i + " " + s.n);
    var book = document.getElementById("funStickers"); if (book && book.paint) book.paint();
  }
  function stickers(){
    var p = panel("funStickers", "Sticker book", "left"); if (!p) return;
    var grid = el("div", "fun-stickers"), info = el("p", "exp-note"); p.appendChild(grid); p.appendChild(info);
    p.paint = function(){ var got = read("hl.fun.stickers", {}); grid.textContent = ""; var n = 0;
      STICKERS.forEach(function(s){ var c = el("div", "fun-sticker" + (got[s.k] ? " got" : "")); c.title = s.n + " - " + s.d;
        c.appendChild(el("span", "fun-si", got[s.k] ? s.i : "?")); c.appendChild(el("small", null, got[s.k] ? s.n : s.d)); grid.appendChild(c); if (got[s.k]) n++; });
      info.textContent = n + " of " + STICKERS.length + " collected. Kept on this device."; };
    p.paint();
    // visits on different days
    var days = read("hl.fun.days", []); if (days.indexOf(today()) < 0) { days.push(today()); store("hl.fun.days", days.slice(-30)); }
    if (days.length >= 7) award("week");
    // arcade scores (the Arcade keeps bests under hl.arc.*)
    var played = 0; ["robin","catapult","plane","drop","doubles","rocks","toss","penalty"].forEach(function(g){ if (read("hl.arc." + g, 0) > 0) played++; });
    if (played >= 3) award("arcade");
    // ticks
    document.addEventListener("change", function(e){
      var t = e.target; if (!t || t.type !== "checkbox" || !t.closest || !t.closest("#todoList") || !t.checked) return;
      var n = read("hl.fun.ticks", 0) + 1; store("hl.fun.ticks", n);
      var now = new Date(); award("first"); if (n >= 10) award("ten");
      if (now.getDay() === 0) award("sunday"); if (now.getHours() >= 20) award("owl"); if (now.getHours() < 8) award("early");
    }, true);
    // the logo
    var brand = document.querySelector(".brand"), clicks = 0;
    if (brand) brand.addEventListener("click", function(){ if (++clicks >= 50) award("logo"); });
  }

  /* ---------- a small toast ---------- */
  function toast(t){ var d = el("div", "fun-toast", t); d.setAttribute("role", "status"); document.body.appendChild(d); setTimeout(function(){ d.remove(); }, 3200); }

  var css = el("style");
  css.textContent =
    ".fun-pill{display:inline-block;margin-left:8px;padding:2px 9px;border-radius:999px;font-size:.62rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;vertical-align:middle;background:rgba(219,39,119,.16);color:#db2777}" +
    "html[data-theme='dark'] .fun-pill{background:rgba(244,114,182,.18);color:#f9a8d4}" +
    ".fun-big{font-weight:700;margin:6px 0}.fun-bar{height:14px;border-radius:999px;background:rgba(127,127,127,.2);overflow:hidden;margin:6px 0}" +
    ".fun-fill{height:100%;border-radius:999px;transition:width .6s}.fun-monster{font-size:46px;line-height:1}" +
    ".fun-pet{line-height:1.1;text-align:center}.fun-bounce{animation:funbounce 1.2s ease-in-out infinite}@keyframes funbounce{50%{transform:translateY(-8px)}}" +
    ".fun-wyr{display:flex;gap:8px;align-items:stretch;flex-wrap:wrap}.fun-choice{flex:1 1 140px;text-align:left;position:relative;overflow:hidden;white-space:normal;line-height:1.3;padding:10px}" +
    ".fun-choice::before{content:'';position:absolute;inset:0;width:var(--pc,0);background:rgba(124,58,237,.14);z-index:0}.fun-choice>*{position:relative}" +
    ".fun-pc{display:block;margin-top:4px}.fun-mine{border-color:#7c3aed!important}.fun-or{align-self:center;font-weight:700;opacity:.6}" +
    ".fun-excuse{font-style:italic}.fun-cookie{font-size:44px;background:none;border:0;cursor:pointer;line-height:1}.fun-cookie:disabled{cursor:default}" +
    "html.fun-upside body{transform:rotate(180deg)}.fun-unflip{position:fixed;left:12px;bottom:12px;z-index:99999;transform:rotate(180deg);padding:8px 12px;border-radius:10px;border:0;background:#7c3aed;color:#fff;font-weight:700}" +
    ".fun-stickers{display:grid;grid-template-columns:repeat(auto-fill,minmax(88px,1fr));gap:8px}.fun-sticker{border:1px dashed var(--rule,#ccc);border-radius:12px;padding:8px;text-align:center;opacity:.55}" +
    ".fun-sticker.got{opacity:1;border-style:solid}.fun-si{display:block;font-size:26px}.fun-sticker small{display:block;font-size:.68rem;line-height:1.25}" +
    ".fun-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#111827;color:#fff;padding:10px 16px;border-radius:12px;z-index:99999;font-weight:600;box-shadow:0 8px 24px rgba(0,0,0,.25)}" +
    "@media (prefers-reduced-motion: reduce){.fun-bounce{animation:none}.fun-fill{transition:none}}";
  document.head.appendChild(css);

  window.LabFun = {
    CAT: [
      { key:"monster", name:"Homework Monster", says:"One boss a week for the whole year. Every right answer in Level Up, from anyone, knocks a point off its health." },
      { key:"pet", name:"Class pet", says:"Biscuit, shared by everyone. Grows when people tick off to-dos, sulks if nobody does for three days." },
      { key:"wyr", name:"Would you rather", says:"One silly question a day (written by Shiv, never by pupils). One vote each; everyone sees the totals, nobody sees who." },
      { key:"excuse", name:"Excuse-o-Matic", says:"Makes up ridiculous homework excuses. Clearly labelled: guaranteed not to work." },
      { key:"fortune", name:"Fortune cookie", says:"Crack one open each day for a joke, a revision tip or a silly fortune." },
      { key:"upside", name:"Upside-down day", says:"Turns the whole dashboard upside down for everyone, with a button to flip it back. For April Fools'." },
      { key:"stickers", name:"Sticker book", says:"Ten silly stickers to collect - Sunday worker, Night owl, Logo poker... Kept on this device." }
    ],
    start: function(on){
      if (on.monster) monster(); if (on.pet) pet(); if (on.wyr) wyr(); if (on.fortune) fortune();
      if (on.excuse) excuse(); if (on.stickers) stickers(); if (on.upside) upside();
    }
  };
})();
