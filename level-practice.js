/* =====================================================================
   Level practice: the dashboard's daily warm-up and flashcard decks,
   pitched at each pupil's own level.

   - Daily warm-up: one Level Up question a day, at the pupil's level in
     a topic from their subjects. The right answer stays on the server
     until they pick, and it earns Level Up points like any question.
     As their levels go up in Level Up, so does the warm-up.
   - Flashcards: Maths and English decks come from Level Up questions -
     the ones they got wrong first (revising mistakes is what helps),
     then ones they got right, then new ones a level below where they
     are. History comes from the hand-checked Battle Stories facts and is
     never AI-written: "what happened" cards first, then "why" cards
     once they say they know them.

   Used by extras.js on the real site and experiments.js on the lab.
   If the server can't help (signed out, offline, no questions yet) the
   warm-up falls back to the old Gate Run quiz and the decks say so.
   ===================================================================== */
(function(){
  function store(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }
  function read(k, d){ try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch(e){ return d; } }
  function today(){ var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0"); }
  function signedIn(){ return !!(window.sb && window.currentUser && !window.currentUser.offline && !window.currentUser.demo); }

  function call(body){
    if (!signedIn()) return Promise.reject(new Error("signed out"));
    return window.sb.functions.invoke("levelup", { body: body }).then(function(r){
      if (r.error || !r.data || r.data.error) throw new Error((r.data && r.data.error) || "no answer");
      return r.data;
    });
  }

  /* ---------- daily warm-up ----------
     ui = { q, opts, note } elements; fallback() runs the old quiz. */
  function daily(ui, fallback){
    var shownAt = Date.now();
    call({ action: "daily" }).then(function(it){
      if (it.none) { fallback(); return; }
      ui.q.textContent = it.q;
      var tagLine = document.createElement("p");
      tagLine.className = "exp-note lp-tag";
      tagLine.textContent = (it.subject ? it.subject.charAt(0).toUpperCase() + it.subject.slice(1) + " - " : "") +
                            it.topic + " - your level " + it.level;
      ui.q.parentNode.insertBefore(tagLine, ui.q);
      ui.opts.textContent = "";
      var mine = read("hl.lp.dailyPick", null);
      it.options.forEach(function(o){
        var b = document.createElement("button");
        b.type = "button"; b.className = "ghost-btn exp-opt"; b.textContent = o;
        b.addEventListener("click", function(){
          [].forEach.call(ui.opts.children, function(x){ x.disabled = true; });
          store("hl.lp.dailyPick", { day: today(), pick: o });
          call({ action: "answer", id: it.id, pick: o, ms: Date.now() - shownAt }).then(function(r){
            mark(o, r.answer, r.right, r.explain, r.gained, r.moved);
          }).catch(function(){
            [].forEach.call(ui.opts.children, function(x){ x.disabled = false; });
            ui.note.textContent = "Couldn't check that just now - try again.";
          });
        });
        ui.opts.appendChild(b);
      });
      if (it.done) mark(mine && mine.day === today() ? mine.pick : null, it.answer, it.right, it.explain, 0, "");
    }).catch(function(){ fallback(); });

    function mark(pick, answer, right, explain, gained, moved){
      [].forEach.call(ui.opts.children, function(b){
        b.disabled = true;
        if (b.textContent === answer) b.classList.add("exp-right");
        else if (b.textContent === pick) b.classList.add("exp-wrong");
      });
      ui.note.textContent = right
        ? "Right" + (gained ? " - +" + gained + " Level Up points" : "") + ". " + (moved ? moved + " " : "") + "Back tomorrow for another."
        : "It was " + answer + ". " + (explain || "") + (moved ? " " + moved : "");
    }
  }

  /* ---------- flashcard decks ---------- */
  /* Hand-checked facts from Battle Stories (history.html), Episode 1:
     Hastings 1066. Same wording as the page; nothing here is AI-written.
     "what" cards are the gentler level, "why" cards the harder one. */
  var HISTORY = [
    { lvl:1, f:"Who was crowned King of England when Edward the Confessor died?", b:"Harold Godwinson", why:"He was crowned the day after Edward died. Edward had no children, which is why there was a fight over the crown at all." },
    { lvl:1, f:"Who did King Harold defeat at the Battle of Stamford Bridge?", b:"Harald Hardrada and Tostig", why:"The Norwegian army of Harald Hardrada, helped by Harold's brother Tostig - in Yorkshire, about 250 miles from Hastings." },
    { lvl:1, f:"What did William do when his men thought he was dead?", b:"Lifted his helmet to show his face", why:"The Bayeux Tapestry shows it, with the words 'Here is Duke William'." },
    { lvl:1, f:"What is the Bayeux Tapestry?", b:"A long embroidered cloth telling the story of the conquest", why:"About 70 metres long, made for the Normans - so it tells the story from the winners' side." },
    { lvl:1, f:"When was William crowned King of England?", b:"Christmas Day 1066", why:"At Westminster Abbey, about ten weeks after the battle." },
    { lvl:2, f:"Why was Harold's army at a disadvantage when it reached Hastings?", b:"It had just fought a battle and marched hundreds of miles", why:"They fought at Stamford Bridge, then marched south in about two weeks. Historians still argue whether Harold should have waited for more troops." },
    { lvl:2, f:"Why did Harold put his army on top of the hill?", b:"So the Normans had to attack uphill", why:"Attacking uphill is exhausting, especially for horses. Behind a shield wall at the top, the English could hold." },
    { lvl:2, f:"Why did the first Norman attacks fail?", b:"The shield wall held and the Normans were attacking uphill", why:"Arrows stuck in shields, and men and horses tired on the slope." },
    { lvl:2, f:"Why was leaving the shield wall a disaster for the English?", b:"On open ground they were cut off by knights, and the wall got weaker", why:"Out of formation, foot soldiers stood little chance against knights. Every man who left made the wall thinner." },
    { lvl:2, f:"According to the Norman chroniclers, why did the Normans pretend to retreat?", b:"To lure the English off the hill", why:"A 'feigned retreat'. Historians debate whether it was really planned." }
  ];

  function historyDeck(){
    var known = read("hl.lp.histKnown", []);
    var easyLeft = HISTORY.filter(function(c, i){ return c.lvl === 1 && known.indexOf(i) < 0; }).length;
    var level = easyLeft ? 1 : 2;
    /* Not-yet-known cards at your level first, then the rest to revise. */
    var list = HISTORY.map(function(c, i){ return { i:i, c:c }; });
    list.sort(function(a, b){
      function rank(x){ var k = known.indexOf(x.i) >= 0; return (x.c.lvl === level && !k) ? 0 : (!k ? 1 : 2); }
      return rank(a) - rank(b) || a.c.lvl - b.c.lvl;
    });
    return Promise.resolve({
      note: level === 1 ? "History - what happened (say which you know, and the 'why' cards come next)"
                        : "History - why it happened",
      cards: list.map(function(x){
        return { f: x.c.f, b: x.c.b + "\n\n" + x.c.why, chip: (x.c.lvl === 1 ? "what" : "why") + (known.indexOf(x.i) >= 0 ? " - known" : ""), hist: x.i };
      })
    });
  }

  function deck(name){
    if (name === "history") return historyDeck();
    return call({ action: "cards", deck: name }).then(function(r){
      var lv = (r.levels || []).map(function(t){ return t.level; });
      var avg = lv.length ? Math.round(lv.reduce(function(a, b){ return a + b; }, 0) / lv.length) : 0;
      return {
        note: (name === "maths" ? "Maths" : "English") + (avg ? " - around level " + avg : "") +
              (r.cards.length ? "" : ". Do some Level Up first and your cards appear here."),
        cards: r.cards.map(function(c){
          return { f: c.front, b: c.back + (c.why ? "\n\n" + c.why : ""), chip: c.topic + " - level " + c.level + (c.kind === "got wrong" ? " - you got this wrong" : c.kind === "new" ? " - new" : "") };
        })
      };
    }, function(){
      return { note: "Sign in to get cards at your level.", cards: [] };
    });
  }

  function knewIt(histIndex){
    var known = read("hl.lp.histKnown", []);
    if (known.indexOf(histIndex) < 0) { known.push(histIndex); store("hl.lp.histKnown", known); }
  }

  window.LevelPractice = { daily: daily, deck: deck, knewIt: knewIt, signedIn: signedIn };
})();
