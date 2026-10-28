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

  var ready = fetch(BASE + "shop-catalog.json?v=9", { cache:"force-cache" }).then(function(r){ return r.json(); }).then(function(c){
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
    if (frame && frame.v) {
      ring.classList.add("on");
      if (frame.v.indexOf("spin:") === 0) { var sp = el("span", "hla-spin"); sp.style.background = frame.v.slice(5); ring.appendChild(sp); }
      else ring.style.background = frame.v;
    }
    var disc = el("span", "hla-disc");
    var base = bg && bg.v ? bg.v : "linear-gradient(135deg,#60a5fa,#2563eb)";
    disc.style.background = pat && pat.v ? pat.v + "," + base : base;
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
    "@media (prefers-reduced-motion:reduce){.hla-spin{animation:none}}" +
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
