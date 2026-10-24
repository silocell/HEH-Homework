/* =====================================================================
   The stats strip above a packaged Scratch game.

   Scratch's own variable boxes are drawn ON the stage, where they sit
   on top of the game - they covered the maze. So every game now hides
   them and the page draws the few that matter in a strip of its own,
   above the stage, where nothing can be in the way. The close button
   lives in the same strip.

   A page says what to show before loading this file:
     window.GameHUD = { title:"The Maze of Confusion",
                        chips:[ {label:"Maze", v:"Level", of:3}, ... ] };
   where v is the name of a variable on the Scratch stage.
   ===================================================================== */
(function(){
  var spec = window.GameHUD || {};
  var chips = spec.chips || [];
  var BAR = 46;                       // height of the strip, in pixels

  var css = document.createElement("style");
  css.textContent =
    "#hud{position:fixed;top:0;left:0;right:0;height:" + BAR + "px;z-index:50;display:flex;align-items:center;" +
      "gap:8px;padding:0 10px;box-sizing:border-box;background:#0b1020;border-bottom:1px solid rgba(255,255,255,.14);" +
      "font:600 14px/1 system-ui,-apple-system,'Segoe UI',sans-serif;color:#e8ecfb;overflow:hidden}" +
    "#hud .t{font-weight:800;margin-right:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:38vw}" +
    "#hud .c{display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.08);border-radius:999px;" +
      "padding:5px 11px;white-space:nowrap}" +
    "#hud .c i{font-style:normal;opacity:.72;font-size:12px;text-transform:uppercase;letter-spacing:.05em}" +
    "#hud .c b{font-variant-numeric:tabular-nums;font-size:15px}" +
    "#hud .x{margin-left:auto;display:grid;place-items:center;width:34px;height:34px;flex:0 0 auto;border-radius:50%;" +
      "background:rgba(255,255,255,.1);color:#fff;text-decoration:none;font-size:18px;font-weight:700}" +
    "#hud .x:hover{background:rgba(255,255,255,.2)}" +
    "#app{top:" + BAR + "px !important;height:calc(100% - " + BAR + "px) !important}" +
    /* Full screen is the one time the game should have the whole window. */
    "body.is-fullscreen #hud{display:none}" +
    "body.is-fullscreen #app{top:0 !important;height:100% !important}" +
    "@media (max-width:560px){#hud .t{display:none}#hud .c{padding:4px 9px}}";
  document.head.appendChild(css);

  var hud = document.createElement("div");
  hud.id = "hud";
  if (spec.title) {
    var t = document.createElement("span"); t.className = "t"; t.textContent = spec.title;
    hud.appendChild(t);
  }
  var outs = chips.map(function(c){
    var box = document.createElement("span"); box.className = "c";
    var i = document.createElement("i"); i.textContent = c.label;
    var b = document.createElement("b"); b.textContent = "-";
    box.appendChild(i); box.appendChild(b); hud.appendChild(box);
    return b;
  });
  var x = document.createElement("a");
  x.className = "x"; x.href = "games.html"; x.textContent = "✕";
  x.setAttribute("aria-label", "Close and go back to the games");
  hud.appendChild(x);
  (document.body || document.documentElement).appendChild(hud);

  /* The game sizes itself to its box, and it measured that box before
     this strip existed - so ask it to measure again. A few goes, in
     case the project is still loading. */
  function relayout(){
    var sc = window.scaffolding;
    try { if (sc && sc.relayout) sc.relayout(); } catch (e) {}
    try { window.dispatchEvent(new Event("resize")); } catch (e) {}
  }
  [0, 60, 300, 900, 2000, 4000].forEach(function(ms){ setTimeout(relayout, ms); });
  window.addEventListener("load", relayout);
  document.addEventListener("fullscreenchange", function(){ setTimeout(relayout, 60); });

  /* Read the stage's variables straight from the running project. */
  function values(){
    var vm = window.vm || (window.scaffolding && window.scaffolding.vm);
    if (!vm || !vm.runtime || !vm.runtime.getTargetForStage) return null;
    var stage = vm.runtime.getTargetForStage();
    if (!stage) return null;
    var byName = {};
    for (var id in stage.variables) {
      var v = stage.variables[id];
      if (v && v.type !== "broadcast_msg") byName[v.name] = v.value;
    }
    return byName;
  }
  function tick(){
    var v = values();
    if (v) chips.forEach(function(c, n){
      var raw = v[c.v];
      if (raw === undefined) return;
      var num = Math.round(Number(raw));
      if (!isFinite(num)) num = raw;
      /* A level or lap counter runs one past the end on the last win,
         so it never reads "4 / 3". */
      if (c.of && num > c.of) num = c.of;
      outs[n].textContent = c.of ? num + " / " + c.of : String(num);
    });
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
