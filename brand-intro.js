/* Chausima build intro: a crew of little cursor "agents" builds a page in front of you, then they swarm together
   into the name. Shown once per visit; click, tap or any key skips it; skipped for people who ask their device for
   reduced motion. One file for every Chausima and HWL site.
   Usage (same as the old intro):  BrandIntro.play("home" | "site" | "chausima" | "hwl", { onDone })            */
(function () {
  "use strict";
  var PAL = ["#1f4fd8", "#c8312b", "#f2b705", "#1f8a55", "#7a4fd8"];
  var SCENES = {
    home:     { bg: "#ffffff", dark: "#0f1424", ink: "#17245c", word: "CHAUSIMA", sub: "ONE ACCOUNT FOR EVERYTHING" },
    site:     { bg: "#fdfdf8", dark: "#1d2a24", ink: "#1f3a93", word: "CHAUSIMA", sub: "BUILT BY HWL SYSTEMS" },
    chausima: { bg: "#ffffff", dark: "#151a24", ink: "#c8312b", word: "CHAUSIMA", sub: "MAIL" },
    hwl:      { bg: "#ffffff", dark: "#10162a", ink: "#1f4fd8", word: "HWL", sub: "HOMEWORK LAUNCHPAD" }
  };
  var JOBS = ["layout", "type", "colour", "logo", "search", "safety", "icons", "grid", "links", "words", "spacing", "motion", "buttons", "checks"];

  function play(name, opts) {
    opts = opts || {};
    var sc = SCENES[name], seen = false;
    try { seen = sessionStorage.getItem("bi.seen." + name) === "1"; } catch (e) {}
    var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!sc || seen || reduce || !window.requestAnimationFrame || !document.createElement("canvas").getContext) { if (opts.onDone) opts.onDone(); return; }
    try { sessionStorage.setItem("bi.seen." + name, "1"); } catch (e) {}

    var darkMode = window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches && name !== "site";
    var BG = darkMode ? sc.dark : sc.bg, INK = darkMode ? "#e9ecf8" : sc.ink, LINE = darkMode ? "rgba(255,255,255,.22)" : "rgba(23,36,92,.22)";
    var wrap = document.createElement("div");
    wrap.setAttribute("aria-hidden", "true");
    wrap.style.cssText = "position:fixed;inset:0;z-index:2147483600;background:" + BG + ";transition:opacity .45s ease,transform .45s ease;cursor:pointer";
    var cv = document.createElement("canvas"); cv.style.cssText = "width:100%;height:100%;display:block";
    var bar = document.createElement("div");
    bar.style.cssText = "position:absolute;left:50%;bottom:18px;transform:translateX(-50%);display:flex;gap:12px;align-items:center;padding:8px 14px;border-radius:999px;font:600 12px/1 system-ui,-apple-system,Segoe UI,sans-serif;letter-spacing:.02em;white-space:nowrap;" +
      "background:" + (darkMode ? "rgba(255,255,255,.08)" : "rgba(23,36,92,.06)") + ";color:" + INK;
    var skip = document.createElement("span"); skip.textContent = "Tap to skip"; skip.style.opacity = ".6";
    var stat = document.createElement("span");
    bar.appendChild(stat); bar.appendChild(skip);
    wrap.appendChild(cv); wrap.appendChild(bar);
    document.documentElement.appendChild(wrap);
    var ctx = cv.getContext("2d"), dpr = Math.min(2, window.devicePixelRatio || 1), W = 0, H = 0;
    function size() { W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    size();

    /* the page they build: a top bar, a big title block, a search bar, three cards and a footer line */
    var cw = Math.min(W - 32, 860), x0 = (W - cw) / 2, top = Math.max(24, H * 0.08);
    var BOX = [
      { x: x0, y: top, w: cw, h: 38 },
      { x: x0 + cw * 0.1, y: top + 70, w: cw * 0.8, h: Math.min(150, H * 0.2), title: true },
      { x: x0 + cw * 0.16, y: top + 70 + Math.min(150, H * 0.2) + 22, w: cw * 0.68, h: 44 }
    ];
    var cardY = BOX[2].y + 80, cardH = Math.min(130, H * 0.18), gap = 14, cardW = (cw - gap * 2) / 3;
    for (var c = 0; c < 3; c++) BOX.push({ x: x0 + c * (cardW + gap), y: cardY, w: cardW, h: cardH });
    BOX.push({ x: x0 + cw * 0.3, y: Math.min(H - 70, cardY + cardH + 26), w: cw * 0.4, h: 14 });
    BOX.forEach(function (b, i) { b.col = PAL[i % PAL.length]; b.p = 0; b.fill = 0; b.start = 0.55 + i * 0.22; });

    /* the crew */
    var N = Math.max(10, Math.min(16, Math.round(W / 70))), agents = [];
    for (var i = 0; i < N; i++) {
      var side = i % 4, ex = side === 0 ? -40 : side === 1 ? W + 40 : Math.random() * W, ey = side === 2 ? -40 : side === 3 ? H + 40 : Math.random() * H;
      agents.push({ x: ex, y: ey, tx: ex, ty: ey, col: PAL[i % PAL.length], job: JOBS[i % JOBS.length], box: BOX[i % BOX.length], k: i / N });
    }

    /* the name, as dots */
    var pts = [];
    (function () {
      var o = document.createElement("canvas"), fs = Math.min(W * (sc.word.length > 4 ? 0.16 : 0.3), H * 0.32, 220);
      o.width = W; o.height = H; var g = o.getContext("2d");
      g.fillStyle = "#000"; g.font = "800 " + fs + "px 'Bricolage Grotesque','Atkinson Hyperlegible',system-ui,sans-serif";
      g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(sc.word, W / 2, H * 0.44);
      var step = Math.max(4, Math.round(fs / 26)), d = g.getImageData(0, 0, W, H).data;
      for (var y = 0; y < H; y += step) for (var x = 0; x < W; x += step) if (d[(y * W + x) * 4 + 3] > 128) pts.push([x, y]);
      for (var s = pts.length - 1; s > 0; s--) { var j = (Math.random() * (s + 1)) | 0, t = pts[s]; pts[s] = pts[j]; pts[j] = t; }
      pts = pts.slice(0, 1400);
    })();
    var dots = pts.map(function (p, i) { var a = agents[i % N]; return { x: a.x, y: a.y, tx: p[0], ty: p[1], col: PAL[i % PAL.length], d: Math.random() * 0.35 }; });

    var t0 = performance.now(), done = false, raf = 0;
    var T_BUILD = 0.55 + BOX.length * 0.22 + 0.9, T_SWARM = T_BUILD + 0.15, T_HOLD = T_SWARM + 1.35, T_END = T_HOLD + 0.45;
    function ease(x) { return x < 0 ? 0 : x > 1 ? 1 : 1 - Math.pow(1 - x, 3); }

    function arrow(x, y, col, label) {
      ctx.save(); ctx.translate(x, y);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 15); ctx.lineTo(4, 11.5); ctx.lineTo(7, 18); ctx.lineTo(9.5, 17); ctx.lineTo(6.6, 10.6); ctx.lineTo(11.5, 10.6); ctx.closePath();
      ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 1.4; ctx.strokeStyle = BG; ctx.stroke();
      if (label) {
        ctx.font = "700 10.5px system-ui,-apple-system,Segoe UI,sans-serif";
        var w = ctx.measureText(label).width + 12;
        ctx.fillStyle = col; roundRect(12, 14, w, 17, 8.5); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.textBaseline = "middle"; ctx.fillText(label, 18, 22.8);
      }
      ctx.restore();
    }
    function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
    function perimeterPoint(b, f) {   // where on a box's outline the drawing has got to (0..1)
      var P = 2 * (b.w + b.h), d = f * P;
      if (d < b.w) return [b.x + d, b.y]; d -= b.w;
      if (d < b.h) return [b.x + b.w, b.y + d]; d -= b.h;
      if (d < b.w) return [b.x + b.w - d, b.y + b.h]; d -= b.w;
      return [b.x, b.y + b.h - d];
    }
    function partialRect(b, f) {
      ctx.beginPath(); ctx.moveTo(b.x, b.y);
      var corners = [[b.x + b.w, b.y], [b.x + b.w, b.y + b.h], [b.x, b.y + b.h], [b.x, b.y]], P = 2 * (b.w + b.h), lens = [b.w, b.h, b.w, b.h], d = f * P;
      for (var i = 0; i < 4; i++) { if (d >= lens[i]) { ctx.lineTo(corners[i][0], corners[i][1]); d -= lens[i]; } else { var p = perimeterPoint(b, f); ctx.lineTo(p[0], p[1]); break; } }
      ctx.stroke();
    }

    function frame(now) {
      if (done) return;
      var t = (now - t0) / 1000;
      ctx.clearRect(0, 0, W, H);
      var building = t < T_BUILD, built = 0;
      // the boxes being built
      var fadeBoxes = t < T_SWARM ? 1 : Math.max(0, 1 - (t - T_SWARM) / 0.5);
      if (fadeBoxes > 0) {
        ctx.globalAlpha = fadeBoxes;
        BOX.forEach(function (b) {
          var f = ease((t - b.start) / 0.55), fl = ease((t - b.start - 0.5) / 0.35);
          if (f <= 0) return;
          if (fl >= 1) built++;
          ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5; ctx.strokeStyle = LINE; partialRect(b, f); ctx.setLineDash([]);
          if (fl > 0) {
            ctx.fillStyle = b.col; ctx.globalAlpha = fadeBoxes * 0.13 * fl; roundRect(b.x, b.y, b.w, b.h, 10); ctx.fill(); ctx.globalAlpha = fadeBoxes;
            ctx.lineWidth = 2; ctx.strokeStyle = b.col; ctx.globalAlpha = fadeBoxes * fl; roundRect(b.x, b.y, b.w, b.h, 10); ctx.stroke(); ctx.globalAlpha = fadeBoxes;
            if (b.title) {   // the title box gets the name, letter by letter
              var n = Math.ceil(sc.word.length * fl), fs = Math.min(b.h * 0.62, b.w / (sc.word.length * 0.62));
              ctx.fillStyle = INK; ctx.font = "800 " + fs + "px 'Bricolage Grotesque','Atkinson Hyperlegible',system-ui,sans-serif";
              ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(sc.word.slice(0, n), b.x + b.w / 2, b.y + b.h / 2); ctx.textAlign = "left";
            }
          }
        });
        ctx.globalAlpha = 1;
      }
      // the swarm: dots fly from the crew into the name, hold, then the page appears
      if (t >= T_SWARM) {
        var sw = (t - T_SWARM) / 1.0;
        dots.forEach(function (d) {
          var e = ease((sw - d.d) / 0.65);
          var x = d.x + (d.tx - d.x) * e, y = d.y + (d.ty - d.y) * e;
          ctx.fillStyle = d.col; ctx.fillRect(x - 1.6, y - 1.6, 3.2, 3.2);
        });
        var sa = ease((t - T_SWARM - 0.7) / 0.4);
        if (sa > 0) {
          ctx.globalAlpha = sa; ctx.fillStyle = INK; ctx.font = "700 " + Math.max(12, Math.min(18, W / 40)) + "px 'Atkinson Hyperlegible',system-ui,sans-serif";
          ctx.textAlign = "center"; ctx.fillText(sc.sub, W / 2, H * 0.44 + Math.min(W * 0.11, 150)); ctx.textAlign = "left"; ctx.globalAlpha = 1;
        }
      }
      // the crew
      agents.forEach(function (a, i) {
        var tx, ty;
        if (t < 0.55) { tx = a.box.x + a.box.w * (0.2 + 0.6 * a.k); ty = a.box.y + a.box.h * 0.5; }
        else if (building) {
          var b = BOX[(i + Math.floor(t / 0.55)) % BOX.length], f = ease((t - b.start) / 0.55);
          var p = perimeterPoint(b, (f + a.k * 0.25) % 1); tx = p[0]; ty = p[1];
        } else { var d = dots[i]; tx = d ? d.tx : W / 2; ty = d ? d.ty : H / 2; }
        var k = building ? 0.16 : 0.1;
        a.x += (tx - a.x) * k; a.y += (ty - a.y) * k;
        if (!building) dots.forEach(function (d, j) { if (j % N === i && t < T_SWARM + 0.05) { d.x = a.x; d.y = a.y; } });
        var fadeA = t < T_HOLD ? 1 : Math.max(0, 1 - (t - T_HOLD) / 0.3);
        if (fadeA > 0) { ctx.globalAlpha = fadeA; arrow(a.x, a.y, a.col, building || t < T_SWARM + 0.6 ? a.job : ""); ctx.globalAlpha = 1; }
      });
      stat.textContent = N + " agents · " + (building ? built + " of " + BOX.length + " parts · Building" : t < T_HOLD ? BOX.length + " parts · Touring" : "Done");
      if (t >= T_END) return finish();
      raf = requestAnimationFrame(frame);
    }
    function finish() {
      if (done) return; done = true; cancelAnimationFrame(raf);
      removeEventListener("keydown", finish, true); removeEventListener("resize", size);
      wrap.style.opacity = "0"; wrap.style.transform = "scale(1.02)";
      setTimeout(function () { wrap.remove(); if (opts.onDone) opts.onDone(); }, 470);
    }
    wrap.addEventListener("pointerdown", finish);
    addEventListener("keydown", finish, true);
    addEventListener("resize", size);
    raf = requestAnimationFrame(frame);
  }
  window.BrandIntro = { play: play };
})();
