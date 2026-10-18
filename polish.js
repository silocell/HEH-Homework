/* ==================================================================
   POLISH - shared by the dashboard and the admin panel

   1. toast(text, kind, options) - notifications that slide in at the
      corner (the top on a phone) and slide away by themselves.
   2. The gliding cursor - in text boxes the cursor slides from letter
      to letter, like Word online. If the computer struggles to keep up,
      it quietly goes back to the normal jumping cursor on that computer,
      for good. Nobody is asked and nothing is shown.
   ================================================================== */
(function(){
  "use strict";
  var calm = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  /* ---------------- 1. notifications ---------------- */
  var host = null, byKey = {};

  function ensureHost(){
    if(host && host.isConnected) return host;
    host = document.createElement("div");
    host.className = "toasts";
    host.setAttribute("role", "status");
    host.setAttribute("aria-live", "polite");
    document.body.appendChild(host);
    return host;
  }

  function dismiss(t){
    if(!t || t._gone) return;
    t._gone = true;
    clearTimeout(t._timer);
    if(t._key && byKey[t._key] === t) delete byKey[t._key];
    t.classList.remove("in");
    t.classList.add("out");
    setTimeout(function(){ if(t.parentNode) t.parentNode.removeChild(t); }, calm ? 150 : 320);
  }

  function arm(t){
    clearTimeout(t._timer);
    if(t._stay) return;
    t._timer = setTimeout(function(){ dismiss(t); }, t._ms);
  }

  /* kind: "ok", "err" or nothing. options: { key, action, onAction, stay, ms }
     A toast with the same key is updated in place rather than stacked,
     so a message that changes ("Sending..." -> "Sent") is one card. */
  function toast(text, kind, opts){
    opts = opts || {};
    if(!text){
      if(opts.key && byKey[opts.key]) dismiss(byKey[opts.key]);
      return null;
    }
    var h = ensureHost();
    var t = opts.key && byKey[opts.key];
    if(t && (!t.isConnected || t._gone)) t = null;
    if(!t){
      t = document.createElement("div");
      var p = document.createElement("p");
      p.className = "toast-text";
      t.appendChild(p);
      var x = document.createElement("button");
      x.type = "button";
      x.className = "toast-x";
      x.setAttribute("aria-label", "Dismiss");
      x.textContent = "×";
      x.addEventListener("click", function(){ dismiss(t); });
      t.appendChild(x);
      t.addEventListener("mouseenter", function(){ clearTimeout(t._timer); });
      t.addEventListener("mouseleave", function(){ arm(t); });
      h.appendChild(t);
      /* Never more than three at once - the oldest makes way. */
      var live = Array.prototype.filter.call(h.children, function(c){ return !c._gone; });
      while(live.length > 3){ dismiss(live.shift()); }
      requestAnimationFrame(function(){ requestAnimationFrame(function(){ t.classList.add("in"); }); });
      if(opts.key){ t._key = opts.key; byKey[opts.key] = t; }
    }
    t.className = "toast" + (kind ? " " + kind : "") + (t.classList.contains("in") ? " in" : "");
    t.querySelector(".toast-text").textContent = text;
    var old = t.querySelector(".toast-act");
    if(old) old.remove();
    if(opts.action && opts.onAction){
      var a = document.createElement("button");
      a.type = "button";
      a.className = "toast-act";
      a.textContent = opts.action;
      a.addEventListener("click", function(){ dismiss(t); opts.onAction(); });
      t.insertBefore(a, t.querySelector(".toast-x"));
    }
    t._stay = !!opts.stay;
    t._ms = opts.ms || (kind === "err" ? 6500 : 4000);
    arm(t);
    return t;
  }
  window.toast = toast;
  window.toastClear = function(key){ if(byKey[key]) dismiss(byKey[key]); };

  /* ---------------- 2. the gliding cursor ---------------- */
  var CARET_KEY = "hl-caret";
  var glideOn = !calm;
  try{ if(localStorage.getItem(CARET_KEY) === "off") glideOn = false; }catch(e){}

  var caret = null, field = null, loop = 0, lastKey = "", typingTimer = 0;
  var canvas = null, mirror = null;
  var lastInput = 0, slowFrames = [], prevFrame = 0, slowCalls = 0;

  function textField(el){
    if(!el || el.disabled || el.readOnly) return false;
    if(el.hasAttribute && el.hasAttribute("data-plain-caret")) return false;
    if(el.tagName === "TEXTAREA") return true;
    if(el.tagName !== "INPUT") return false;
    var t = (el.getAttribute("type") || "text").toLowerCase();
    /* Not "email": the browser gives no cursor position for those, so the
       glide can't follow and the box would show no cursor at all. */
    return t === "text" || t === "search" || t === "url" || t === "tel";
  }

  function caretEl(){
    if(caret && caret.isConnected) return caret;
    caret = document.createElement("div");
    caret.className = "hl-caret";
    caret.setAttribute("aria-hidden", "true");
    document.body.appendChild(caret);
    return caret;
  }

  function lineHeightOf(cs){
    var size = parseFloat(cs.fontSize) || 16;
    var lh = parseFloat(cs.lineHeight);
    if(!lh || isNaN(lh)) lh = size * 1.25;
    return { size:size, lh:lh, h:Math.min(lh, Math.round(size * 1.3)) };
  }

  function measureInput(el, pos, cs){
    if(!canvas) canvas = document.createElement("canvas");
    var ctx = canvas.getContext("2d");
    ctx.font = cs.font || (cs.fontStyle + " " + cs.fontWeight + " " + cs.fontSize + " " + cs.fontFamily);
    var before = el.value.slice(0, pos);
    var w = ctx.measureText(before).width;
    var ls = parseFloat(cs.letterSpacing);
    if(ls && !isNaN(ls)) w += ls * before.length;
    var r = el.getBoundingClientRect();
    var m = lineHeightOf(cs);
    var x = r.left + (parseFloat(cs.borderLeftWidth) || 0) + (parseFloat(cs.paddingLeft) || 0) + w - el.scrollLeft;
    var y = r.top + (r.height - m.h) / 2;
    return { x:x, y:y, h:m.h, box:r };
  }

  var MIRROR_PROPS = ["boxSizing","width","fontFamily","fontSize","fontWeight","fontStyle","letterSpacing",
    "lineHeight","textTransform","wordSpacing","textIndent","paddingTop","paddingRight","paddingBottom",
    "paddingLeft","borderTopWidth","borderRightWidth","borderBottomWidth","borderLeftWidth","tabSize"];

  function measureArea(el, pos, cs){
    if(!mirror){
      mirror = document.createElement("div");
      mirror.setAttribute("aria-hidden", "true");
      mirror.style.cssText = "position:absolute;visibility:hidden;left:-9999px;top:0;white-space:pre-wrap;" +
        "word-wrap:break-word;overflow-wrap:break-word;border-style:solid;height:auto";
      document.body.appendChild(mirror);
    }
    MIRROR_PROPS.forEach(function(p){ mirror.style[p] = cs[p]; });
    mirror.style.width = el.getBoundingClientRect().width + "px";
    mirror.style.overflowY = el.scrollHeight > el.clientHeight ? "scroll" : "hidden";
    mirror.textContent = el.value.slice(0, pos);
    var mark = document.createElement("span");
    mark.textContent = "​";
    mirror.appendChild(mark);
    var r = el.getBoundingClientRect();
    var m = lineHeightOf(cs);
    var x = r.left + (parseFloat(cs.borderLeftWidth) || 0) + mark.offsetLeft - el.scrollLeft;
    var y = r.top + (parseFloat(cs.borderTopWidth) || 0) + mark.offsetTop - el.scrollTop + (m.lh - m.h) / 2;
    return { x:x, y:y, h:m.h, box:r };
  }

  function hide(){ if(caret) caret.classList.remove("show"); }

  function place(force){
    if(!field || !glideOn) return;
    if(document.activeElement !== field){ stop(); return; }
    var s = field.selectionStart, e = field.selectionEnd;
    if(s == null){ stop(); return; }   /* no position available: back to the normal cursor */
    if(s !== e){ hide(); lastKey = ""; return; }   /* a selection: the browser's own highlight shows it */
    var r0 = field.getBoundingClientRect();
    var key = s + "|" + field.value.length + "|" + field.scrollLeft + "|" + field.scrollTop + "|" +
              Math.round(r0.left) + "|" + Math.round(r0.top) + "|" + Math.round(r0.width) + "|" + field.value.slice(-3);
    if(!force && key === lastKey) return;
    lastKey = key;

    var t0 = performance.now();
    var cs = getComputedStyle(field);
    var p = field.tagName === "TEXTAREA" ? measureArea(field, s, cs) : measureInput(field, s, cs);
    var spent = performance.now() - t0;
    /* Measuring is meant to take well under a millisecond. If this
       computer keeps taking far longer, the plain cursor is kinder. */
    if(spent > 12){ if(++slowCalls >= 3){ giveUp(); return; } }

    var c = caretEl();
    /* Outside the box (scrolled away inside a long field): hide it. */
    if(p.x < p.box.left - 1 || p.x > p.box.right + 1 || p.y < p.box.top - 2 || p.y + p.h > p.box.bottom + 2){
      hide(); return;
    }
    c.style.height = p.h + "px";
    c.style.transform = "translate(" + Math.round(p.x * 2) / 2 + "px," + Math.round(p.y * 2) / 2 + "px)";
    if(!c.classList.contains("show")){
      c.classList.add("jump");          /* arrive in place, then glide from there */
      c.classList.add("show");
      c.getBoundingClientRect();
      c.classList.remove("jump");
    }
    c.classList.add("typing");          /* steady while moving, blink when still */
    clearTimeout(typingTimer);
    typingTimer = setTimeout(function(){ if(caret) caret.classList.remove("typing"); }, 550);
  }

  function frame(now){
    if(!field) return;
    /* Watch how smoothly the page is drawing while someone types. A few
       long stutters within a few seconds of typing and it switches off. */
    /* A single huge gap is a script loading or a tab coming back, not a
       slow machine; sustained stutter while typing is. */
    if(prevFrame && now - lastInput < 1200){
      if(now - prevFrame > 70 && now - prevFrame < 400){
        slowFrames.push(now);
        slowFrames = slowFrames.filter(function(t){ return now - t < 4000; });
        if(slowFrames.length >= 6){ giveUp(); return; }
      }
    }
    prevFrame = now;
    place(false);
    loop = requestAnimationFrame(frame);
  }

  function start(el){
    if(!glideOn || !textField(el)) return;
    stop();
    field = el;
    field.classList.add("glide");
    lastKey = ""; prevFrame = 0;
    place(true);
    loop = requestAnimationFrame(frame);
  }

  function stop(){
    cancelAnimationFrame(loop); loop = 0;
    if(field) field.classList.remove("glide");
    field = null;
    hide();
  }

  function giveUp(){
    glideOn = false;
    try{ localStorage.setItem(CARET_KEY, "off"); }catch(e){}
    stop();
  }

  document.addEventListener("focusin", function(e){ start(e.target); });
  document.addEventListener("focusout", function(e){ if(e.target === field) stop(); });
  document.addEventListener("input", function(e){ if(e.target === field){ lastInput = performance.now(); place(true); } }, true);
  document.addEventListener("keydown", function(e){ if(e.target === field) lastInput = performance.now(); }, true);
  /* The very first field might already have focus (autofocus). */
  if(document.activeElement && document.activeElement !== document.body) start(document.activeElement);

  window.hlCaret = {
    on:function(){ return glideOn; },
    reset:function(){ try{ localStorage.removeItem(CARET_KEY); }catch(e){} glideOn = !calm; slowCalls = 0; slowFrames = []; },
    _giveUp:giveUp
  };
})();
