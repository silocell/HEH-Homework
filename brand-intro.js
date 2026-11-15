/* Brand intro: a short line-drawing animation shown once per visit before a sign-in page.
   A sketch draws itself, colour floods in, the subject moves, big letters draw stroke by
   stroke, then the page is revealed. Click, tap or any key skips it. Skipped entirely for
   people who ask their device for reduced motion.
   Usage: BrandIntro.play("chausima" | "site" | "hwl", { onDone }) */
(function () {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";
  const SCENES = {
    chausima: {
      bg: "#ffffff", ink: "#9aa3ad", main: "#c8312b", on: "#ffffff", word: "CHAUSIMA", sub: "MAIL", size: 150,
      font: "'Atkinson Hyperlegible', 'Segoe UI', Arial, sans-serif",
      art: `
        <g class="sk" id="bi-subject" transform="translate(500 270)">
          <circle r="150" class="ln"/><circle r="104" class="ln"/>
          <rect x="-62" y="-40" width="124" height="80" rx="4" class="ln"/>
          <path d="M-62 -40 L0 6 L62 -40" class="ln"/>
        </g>
        <g id="bi-waves" class="sk">
          <path class="ln wv" d="M-1500 400 q40 -26 80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0"/>
          <path class="ln wv" d="M-1500 440 q40 -26 80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0"/>
        </g>`,
      fly: [{ transform: "translate(500px,270px)" }, { transform: "translate(2300px,-200px) rotate(14deg) scale(.45)" }]
    },
    site: {
      bg: "#fdfdf8", ink: "#9aa3ad", main: "#1f3a93", on: "#ffffff", word: "CHAUSIMA", sub: "BY HWL SYSTEMS", size: 150,
      font: "'Bricolage Grotesque', 'Atkinson Hyperlegible', 'Segoe UI', Arial, sans-serif",
      art: `
        <g class="sk" id="bi-subject" transform="translate(500 290)">
          <path class="ln" d="M0 -110 C-60 -130 -140 -125 -190 -100 L-190 120 C-140 95 -60 90 0 110 Z"/>
          <path class="ln" d="M0 -110 C60 -130 140 -125 190 -100 L190 120 C140 95 60 90 0 110 Z"/>
          <path class="ln" d="M0 -110 L0 110"/>
          <path class="ln" d="M-160 -60 L-40 -54 M-160 -20 L-40 -14 M-160 20 L-70 25"/>
          <path class="ln" d="M40 -54 L160 -60 M40 -14 L160 -20 M40 26 L120 22"/>
          <path class="ln" d="M150 -150 L210 -210 L226 -194 L166 -134 Z M150 -150 L142 -126 L166 -134"/>
        </g>
        <g id="bi-waves" class="sk"><path class="ln wv" d="M-1500 420 L2500 420"/><path class="ln wv" d="M-1500 446 L2500 446"/></g>`,
      fly: [{ transform: "translate(500px,290px)" }, { transform: "translate(500px,1200px) rotate(-8deg) scale(.6)" }]
    },
    hwl: {
      bg: "#ffffff", ink: "#9aa3ad", main: "#1f4fd8", on: "#ffffff", word: "HWL", sub: "LAUNCHPAD", size: 200,
      font: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
      art: `
        <g class="sk" id="bi-subject" transform="translate(500 300)">
          <path class="ln" d="M0 -170 C48 -120 58 -40 52 40 L-52 40 C-58 -40 -48 -120 0 -170 Z"/>
          <circle cy="-70" r="22" class="ln"/>
          <path class="ln" d="M-52 0 L-96 62 L-52 46 M52 0 L96 62 L52 46"/>
          <path class="ln" d="M-24 40 L-30 70 L30 70 L24 40"/>
        </g>
        <g id="bi-waves" class="sk"><path class="ln wv" d="M200 376 L800 376"/><path class="ln wv" d="M260 396 L740 396"/></g>
        <g id="bi-smoke"></g>`,
      fly: [{ transform: "translate(500px,300px)" }, { transform: "translate(500px,-1200px) scale(.7)" }]
    }
  };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  function play(name, opts) {
    opts = opts || {};
    const sc = SCENES[name];
    let seen = false;
    try { seen = sessionStorage.getItem("bi.seen." + name) === "1"; } catch (e) {}
    const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!sc || seen || reduce || !Element.prototype.animate) { if (opts.onDone) opts.onDone(); return; }
    try { sessionStorage.setItem("bi.seen." + name, "1"); } catch (e) {}

    const box = document.createElement("div");
    box.setAttribute("role", "presentation");
    box.style.cssText = `position:fixed;inset:0;z-index:2147483000;background:${sc.bg};overflow:hidden;cursor:pointer`;
    const vw = Math.max(560, Math.min(1000, 600 * innerWidth / innerHeight));
    box.innerHTML = `<svg xmlns="${NS}" viewBox="${500 - vw / 2} 0 ${vw} 600" preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%;display:block" aria-hidden="true">
      <style>
        .ln{fill:none;stroke:${sc.ink};stroke-width:4;stroke-linecap:round;stroke-linejoin:round}
        .wv{stroke-width:7}
        .big{font:900 ${sc.size}px ${sc.font};letter-spacing:4px;fill:transparent;stroke:${sc.on};stroke-width:3;stroke-dasharray:2400;stroke-dashoffset:2400}
        .small{font:700 34px ${sc.font};letter-spacing:22px;fill:${sc.on};opacity:0}
      </style>
      <rect id="bi-flood" x="-2500" y="-1500" width="6000" height="3600" fill="${sc.main}" style="transform-origin:-2500px 50%;transform:scaleX(0)"/>
      ${sc.art}
      <text id="bi-word" class="big" x="500" y="330" text-anchor="middle">${sc.word}</text>
      <text id="bi-sub" class="small" x="511" y="400" text-anchor="middle">${sc.sub}</text>
    </svg>
    <button type="button" style="position:absolute;right:18px;bottom:18px;border:0;border-radius:999px;padding:9px 16px;font:600 14px system-ui,sans-serif;background:rgba(0,0,0,.08);color:#333;cursor:pointer">Skip</button>`;
    document.body.appendChild(box);
    const $ = (id) => box.querySelector("#" + id);
    const lines = [...box.querySelectorAll(".ln")];
    lines.forEach((p) => { const L = p.getTotalLength ? Math.ceil(p.getTotalLength()) : 1500; p.style.strokeDasharray = L; p.style.strokeDashoffset = L; p.dataset.len = L; });
    const anims = [];
    const go = (el, kf, o) => { const a = el.animate(kf, Object.assign({ fill: "forwards", easing: "cubic-bezier(.45,.05,.2,1)" }, o)); anims.push(a); return a.finished.catch(() => {}); };
    let done = false;
    async function finish(fast) {
      if (done) return; done = true;
      anims.forEach((a) => { try { a.finish(); } catch (e) {} });
      await go(box, [{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(1.06)" }], { duration: fast ? 220 : 650, easing: "ease-in" });
      box.remove();
      if (opts.onDone) opts.onDone();
    }
    box.addEventListener("click", () => finish(true));
    const key = () => { document.removeEventListener("keydown", key); finish(true); };
    document.addEventListener("keydown", key);

    (async () => {
      const subject = $("bi-subject"), waves = box.querySelectorAll("#bi-waves .ln"), subjLines = subject.querySelectorAll(".ln");
      // 1. the pencil sketch draws itself
      subjLines.forEach((p, i) => go(p, [{ strokeDashoffset: p.dataset.len }, { strokeDashoffset: 0 }], { duration: 1000, delay: i * 120 }));
      await wait(1250); if (done) return;
      // 2. colour floods across, the sketch turns to ink on colour
      go($("bi-flood"), [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], { duration: 600, easing: "cubic-bezier(.7,0,.2,1)" });
      await wait(260);
      lines.forEach((p) => go(p, [{ stroke: sc.ink }, { stroke: sc.on }], { duration: 300 }));
      await wait(500); if (done) return;
      // 3. the subject flies off, leaving its trail
      waves.forEach((p, i) => go(p, [{ strokeDashoffset: p.dataset.len }, { strokeDashoffset: 0 }], { duration: 750, delay: i * 90 }));
      if (name === "hwl") {
        const smoke = $("bi-smoke");
        for (let i = 0; i < 14; i++) {
          const c = document.createElementNS(NS, "circle");
          const x = 500 + (Math.random() - .5) * 220, y = 390 + Math.random() * 40;
          c.setAttribute("cx", x); c.setAttribute("cy", y); c.setAttribute("r", 30 + Math.random() * 40);
          c.setAttribute("fill", "#ffffff"); c.style.opacity = 0; c.style.transformOrigin = `${x}px ${y}px`;
          smoke.appendChild(c);
          go(c, [{ opacity: 0, transform: "scale(.2)" }, { opacity: .95, transform: "scale(1)", offset: .35 }, { opacity: 0, transform: "scale(2.4) translateY(30px)" }], { duration: 1500, delay: 80 + i * 45, easing: "ease-out" });
        }
      }
      await go(subject, sc.fly, { duration: 900, easing: "cubic-bezier(.6,0,.4,1)" });
      if (done) return;
      go(box.querySelector("#bi-waves"), [{ opacity: 1 }, { opacity: .25 }], { duration: 400 });
      // 4. the name draws stroke by stroke, then fills
      const word = $("bi-word"), sub = $("bi-sub");
      try { await Promise.race([document.fonts.ready, wait(400)]); } catch (e) {}
      const fit = (el, base) => { const w = el.getComputedTextLength(), max = vw * 0.86; if (w > max) el.style.fontSize = (base * max / w) + "px"; };
      fit(word, sc.size);
      if (sub.getComputedTextLength() > vw * 0.86) { sub.style.letterSpacing = "8px"; fit(sub, 34); }
      await go(word, [{ strokeDashoffset: 2400 }, { strokeDashoffset: 0 }], { duration: 1300, easing: "ease-in-out" });
      if (done) return;
      go(word, [{ fill: "rgba(255,255,255,0)" }, { fill: sc.on }], { duration: 380 });
      const ls = parseFloat(sub.style.letterSpacing) || 22;
      await go(sub, [{ opacity: 0, letterSpacing: (ls + 18) + "px" }, { opacity: 1, letterSpacing: ls + "px" }], { duration: 500, easing: "ease-out" });
      await wait(550);
      // 5. reveal the page
      finish(false);
    })();
  }
  window.BrandIntro = { play };
})();
