/* =====================================================================
   avatar.js - draws a Launchpad profile picture. One file, used by the
   dashboard, the shop (shop.civilinitiatives.org) and anywhere else a
   picture appears.

   A look is: style ("emoji", "photo" or a DiceBear style) + that style's parts,
   background, pattern, frame, hat, sticker, name colour and theme. The catalogue (shop-catalog.json, built from
   shop-build/gen.mjs) says what each item id looks like.

     HEHAvatar.ready            -> Promise, resolves once the catalogue is in
     HEHAvatar.item(id)         -> the catalogue entry
     HEHAvatar.el(look, size, {initial})         -> an element
     HEHAvatar.nameEl(tag, text, look)           -> your name in its colour
     HEHAvatar.tagEl(look or tag id)             -> your tag (a little label), or null
     HEHAvatar.applyTheme(look) -> the dashboard theme you're wearing
     HEHAvatar.emojiImg(item, px)                -> Twemoji art for an emoji item

   Art: DiceBear styles (loaded on demand from jsDelivr; credits in the
   catalogue), Twemoji (CC-BY 4.0). Code: all rights reserved, like the
   rest of the Launchpad.
   ===================================================================== */
(function(){
  var BASE = "https://civilinitiatives.org/";
  var DB_VER = "9.4.2", TW = "https://cdn.jsdelivr.net/npm/@twemoji/svg@15.0.0/";
  var PKG = { adventurer:"adventurer", bigEars:"big-ears", pixelArt:"pixel-art", openPeeps:"open-peeps", lorelei:"lorelei", bottts:"bottts" };
  var CAT = null, BY = {}, styleMods = {}, core = null, svgCache = {};

  var ready = fetch(BASE + "shop-catalog.json?v=12", { cache:"force-cache" }).then(function(r){ return r.json(); }).then(function(c){
    CAT = c; c.items.forEach(function(i){ BY[i.id] = i; }); return c;
  });

  function el(tag, cls, text){ var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  /* DiceBear, one style at a time, only when someone is wearing it. */
  function loadStyle(key){
    if (!styleMods[key]) {
      if (!core) core = import("https://cdn.jsdelivr.net/npm/@dicebear/core@" + DB_VER + "/+esm");
      styleMods[key] = Promise.all([core, import("https://cdn.jsdelivr.net/npm/@dicebear/" + PKG[key] + "@" + DB_VER + "/+esm")]);
    }
    return styleMods[key];
  }
  function charSvg(key, c){
    var sig = key + JSON.stringify(c);
    if (svgCache[sig]) return Promise.resolve(svgCache[sig]);
    return loadStyle(key).then(function(m){
      var createAvatar = m[0].createAvatar, style = m[1], props = style.schema.properties, opts = { seed:"launchpad", backgroundColor:[] };
      Object.keys(c.parts || {}).forEach(function(opt){
        var v = c.parts[opt];
        if (props[opt + "Probability"]) opts[opt + "Probability"] = v === "none" ? 0 : 100;
        if (v !== "none") opts[opt] = [v];
      });
      Object.keys(c.colors || {}).forEach(function(opt){ opts[opt] = [c.colors[opt]]; });
      var uri = createAvatar(style, opts).toDataUri();
      svgCache[sig] = uri;
      return uri;
    });
  }

  function emojiImg(it, px){
    if (!it || !it.v) return null;
    var img = el("img", "hla-emo"); img.alt = ""; img.draggable = false;
    img.src = TW + it.art + ".svg";
    if (px) { img.width = px; img.height = px; }
    img.onerror = function(){ var s = el("span", "hla-emo-t", it.v); img.replaceWith(s); };
    return img;
  }

  function avatar(look, size, o){
    o = o || {}; look = look || {};
    var bg = BY[look.bg], pat = BY[look.pattern], frame = BY[look.frame], hat = BY[look.hat], stk = BY[look.sticker];
    var wrap = el("span", "hla"); wrap.style.setProperty("--s", size + "px"); wrap.setAttribute("aria-hidden", "true");
    var ring = el("span", "hla-ring");
    var f3 = frame && frame.v && frame.v.indexOf("3d:") === 0 ? frame.v.slice(3).split("|") : null;
    if (f3) {
      /* 3D frames: "3d:orbit|ring|colour", "3d:atom|ring|colour", "3d:holo|ring|colour" */
      ring.classList.add("on"); ring.style.background = f3[1];
      wrap.classList.add("hla-3d", "hla-k-" + f3[0]); wrap.style.setProperty("--oc", f3[2] || "#fde68a");
      var rings = f3[0] === "atom" ? 3 : f3[0] === "orbit" ? 1 : 0;
      /* Each orbit is drawn twice: the whole ring behind the picture, and its
         near half again in front - so the ring really goes round it. */
      for (var oi = 0; oi < rings * 2; oi++) {
        var front = oi >= rings, k = oi % rings;
        var orb = el("span", "hla-orbit" + (front ? " front" : "")); orb.style.setProperty("--tilt", (k * 60 - (rings > 1 ? 0 : 18)) + "deg");
        var mv = el("b"); mv.style.animationDelay = (-k * 1.1) + "s"; mv.appendChild(el("i")); orb.appendChild(mv);
        wrap.appendChild(orb);
      }
    } else if (frame && frame.v) {
      ring.classList.add("on");
      if (frame.v.indexOf("spin:") === 0) { var sp = el("span", "hla-spin"); sp.style.background = frame.v.slice(5); ring.appendChild(sp); }
      else ring.style.background = frame.v;
    }
    var disc = el("span", "hla-disc");
    var base = bg && bg.v ? bg.v : "linear-gradient(135deg,#60a5fa,#2563eb)";
    if (base.indexOf("3d:planet|") === 0) {
      /* A 3D planet: a map that rolls round behind a shaded ball. */
      disc.style.background = "#020617";
      var pl = el("span", "hla-layer hla-planet"); pl.style.backgroundImage = base.split("|")[1]; disc.appendChild(pl);
      disc.appendChild(el("span", "hla-layer hla-shade"));
    } else disc.style.background = pat && pat.v ? pat.v + "," + base : base;
    if (f3 && f3[0] === "holo") disc.appendChild(el("span", "hla-layer hla-scan"));
    var style = look.style || "emoji";
    /* An uploaded photo (only sent once the owner has approved it). */
    if (style === "photo" && typeof look.photo === "string" && /^data:image\/(jpeg|png|webp);base64,/.test(look.photo)) {
      var ph = el("img", "hla-char hla-photo"); ph.alt = ""; ph.draggable = false; ph.src = look.photo;
      disc.appendChild(ph);
    } else if (style !== "emoji" && PKG[style] && look.chars && look.chars[style]) {
      var ch = el("img", "hla-char"); ch.alt = "";
      disc.appendChild(ch);
      charSvg(style, look.chars[style]).then(function(uri){ ch.src = uri; }, function(){
        ch.replaceWith(el("span", "hla-init", o.initial || "?"));
      });
    } else {
      var face = BY[look.face];
      var art = face && face.v ? emojiImg(face) : null;
      if (art) { disc.classList.add("emoji"); disc.appendChild(art); }
      else disc.appendChild(el("span", "hla-init", o.initial || "?"));
    }
    ring.appendChild(disc); wrap.appendChild(ring);
    if (hat && hat.v) { var h = el("span", "hla-hat"); h.appendChild(emojiImg(hat)); wrap.appendChild(h); }
    if (stk && stk.v) { var s = el("span", "hla-stk"); s.appendChild(emojiImg(stk)); wrap.appendChild(s); }
    return wrap;
  }

  function nameEl(tag, text, look){
    var e = el(tag, "hla-nm", text), c = look && BY[look.name];
    if (c && c.v) {
      if (c.v.indexOf("gradient") >= 0) { e.style.backgroundImage = c.v; e.classList.add("grad"); }
      else e.style.color = c.v;
    }
    return e;
  }

  /* A tag: a small coloured label next to a name. */
  function tagEl(x){
    var t = BY[typeof x === "string" ? x : (x && x.tag)];
    if (!t || !t.v) return null;
    var e = el("span", "hla-tag", t.v);
    e.style.background = t.c || "#475569";
    e.title = t.name;
    return e;
  }

  /* The dashboard theme: an accent colour, and a decoration behind the page. */
  function applyTheme(look){
    var t = look && BY[look.theme], css = document.getElementById("hlaTheme"), deco = document.getElementById("hlaDeco");
    /* "Classic" (th-none) is stored as "|||" - nothing to change. */
    if (!t || !t.v || !t.v.split("|")[0]) { if (css) css.remove(); if (deco) deco.remove(); return; }
    var p = t.v.split("|");
    if (!css) { css = el("style"); css.id = "hlaTheme"; document.head.appendChild(css); }
    css.textContent =
      ":root{--accent:" + p[0] + " !important;--accent-soft:" + p[1] + " !important}" +
      "@media (prefers-color-scheme:dark){:root:not([data-theme=light]){--accent-soft:" + p[2] + " !important}}" +
      ":root[data-theme=dark]{--accent-soft:" + p[2] + " !important}";
    if (p[3]) {
      if (!deco) { deco = el("div"); deco.id = "hlaDeco"; deco.setAttribute("aria-hidden", "true"); document.body.insertBefore(deco, document.body.firstChild); }
      deco.style.background = p[3];
    } else if (deco) deco.remove();
  }

  var css = el("style");
  css.textContent =
    ".hla{position:relative;display:inline-block;width:var(--s);height:var(--s);flex:none;vertical-align:middle}" +
    ".hla-ring{position:relative;display:block;width:100%;height:100%;border-radius:50%;box-sizing:border-box;overflow:hidden}" +
    ".hla-ring.on{padding:calc(var(--s) * .07)}" +
    ".hla-spin{position:absolute;inset:-25%;animation:hlaspin 4s linear infinite}" +
    "@keyframes hlaspin{to{transform:rotate(1turn)}}" +
    ".hla-disc>*{position:relative;z-index:1}.hla-disc>.hla-layer{position:absolute;inset:0;z-index:0;pointer-events:none}" +
    ".hla-planet{background-size:calc(var(--s) * 2) 100%;background-repeat:repeat-x;animation:hlaroll 14s linear infinite}" +
    "@keyframes hlaroll{to{background-position:calc(var(--s) * -2) 0}}" +
    ".hla-shade{border-radius:50%;background:radial-gradient(circle at 34% 30%,rgba(255,255,255,.35),transparent 38%),radial-gradient(circle,transparent 52%,rgba(2,6,23,.85) 100%);box-shadow:inset 0 0 calc(var(--s) * .08) rgba(125,211,252,.8)}" +
    ".hla-disc>.hla-scan{z-index:2;background:repeating-linear-gradient(0deg,rgba(103,232,249,.28) 0 1px,transparent 1px 4px);animation:hlascan 1.6s linear infinite}" +
    "@keyframes hlascan{to{background-position:0 calc(var(--s) * .2)}}" +
    ".hla-3d .hla-ring{z-index:1}" +
    ".hla-orbit{position:absolute;inset:-16%;border-radius:50%;border:calc(var(--s) * .03 + 1px) solid var(--oc);box-shadow:0 0 calc(var(--s) * .08) var(--oc);pointer-events:none;" +
    "z-index:0;transform:perspective(calc(var(--s) * 4)) rotateZ(var(--tilt)) rotateX(72deg)}" +
    ".hla-orbit.front{z-index:2;clip-path:inset(50% -20% -20% -20%)}" +
    ".hla-orbit b{position:absolute;inset:0;animation:hlaorb 3.4s linear infinite}@keyframes hlaorb{to{transform:rotate(1turn)}}" +
    ".hla-orbit i{position:absolute;left:50%;top:0;width:18%;height:18%;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle at 35% 35%,#fff,var(--oc) 50%,rgba(0,0,0,.6))}" +
    ".hla-k-holo{animation:hlaholo 5s ease-in-out infinite}.hla-k-holo .hla-ring{box-shadow:0 0 calc(var(--s) * .14) var(--oc)}" +
    "@keyframes hlaholo{0%,100%{transform:perspective(calc(var(--s) * 3)) rotateY(-24deg) rotateX(6deg)}50%{transform:perspective(calc(var(--s) * 3)) rotateY(24deg) rotateX(-6deg)}}" +
    "@media (prefers-reduced-motion:reduce){.hla-spin,.hla-planet,.hla-scan,.hla-orbit b,.hla-k-holo{animation:none}}" +
    ".hla-disc{position:relative;display:grid;place-items:center;width:100%;height:100%;border-radius:50%;overflow:hidden;color:#fff}" +
    ".hla-init{font-weight:800;font-size:calc(var(--s) * .44);line-height:1;font-family:var(--font-display,system-ui);text-shadow:0 1px 2px rgba(0,0,0,.25)}" +
    ".hla-disc .hla-emo{width:62%;height:62%}" +
    ".hla-char{width:100%;height:100%;display:block}" +
    ".hla-photo{object-fit:cover}" +
    ".hla-hat{position:absolute;left:50%;top:calc(var(--s) * -.30);transform:translateX(-50%) rotate(-8deg);width:calc(var(--s) * .5);height:calc(var(--s) * .5);pointer-events:none}" +
    ".hla-stk{position:absolute;right:calc(var(--s) * -.08);bottom:calc(var(--s) * -.06);width:calc(var(--s) * .36);height:calc(var(--s) * .36);pointer-events:none;filter:drop-shadow(0 1px 1px rgba(0,0,0,.35))}" +
    ".hla-hat img,.hla-stk img{width:100%;height:100%;display:block}" +
    ".hla-emo-t{font-size:calc(var(--s) * .45);line-height:1}" +
    ".hla-nm.grad{background-clip:text;-webkit-background-clip:text;color:transparent;-webkit-text-fill-color:transparent}" +
    "#hlaDeco{position:fixed;inset:0;z-index:-1;pointer-events:none}" +
    ".hla-tag{display:inline-block;padding:1px 8px;border-radius:999px;font-size:.68rem;font-weight:800;line-height:1.5;color:#fff;" +
    "white-space:nowrap;vertical-align:middle;text-shadow:0 1px 1px rgba(0,0,0,.25);-webkit-text-fill-color:#fff;letter-spacing:.01em}";
  document.head.appendChild(css);

  window.HEHAvatar = {
    ready: ready,
    get catalog(){ return CAT; },
    item: function(id){ return BY[id]; },
    el: avatar, nameEl: nameEl, tagEl: tagEl, applyTheme: applyTheme, emojiImg: emojiImg,
    twemoji: TW
  };
})();
