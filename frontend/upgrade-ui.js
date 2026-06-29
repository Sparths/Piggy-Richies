/* Piggy Richies -- top house-upgrade UI overlay.
 * Replaces the jackpot strip with three house upgrade targets. Each target is
 * split into five darkened image pieces, and collected bricks reveal pieces. */
(() => {
  "use strict";

  const CSS = `
/* --- top house upgrade meter ------------------------------------------- */
.jackpots.upgrade-meter{
  left:17.3%;top:3.25%;width:57.4%;height:13.65%;z-index:16;pointer-events:none;
  display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:2.2%;align-items:stretch;
}
.jackpots.upgrade-meter .jackpot{display:none;}
.upgrade-card{
  position:relative;min-width:0;height:100%;overflow:hidden;border-radius:14px;
  display:grid;grid-template-columns:42% 1fr;grid-template-rows:1fr;align-items:center;
  padding:5.5% 6.5% 5.5% 4.6%;
  background:
    radial-gradient(circle at 50% 4%,rgba(255,255,177,.36),transparent 25%),
    linear-gradient(180deg,rgba(42,97,22,.98),rgba(13,57,18,.96) 54%,rgba(12,42,19,.98));
  border:2px solid rgba(255,218,86,.96);
  box-shadow:
    inset 0 0 0 2px rgba(110,59,15,.78),
    inset 0 7px 14px rgba(255,234,119,.16),
    inset 0 -10px 18px rgba(4,23,7,.42),
    0 7px 12px rgba(0,0,0,.38);
  isolation:isolate;
}
.upgrade-card::before,
.upgrade-card::after{
  content:"";position:absolute;top:43%;width:15px;height:15px;border-radius:50%;z-index:3;
  background:radial-gradient(circle at 34% 30%,#fff3ff 0 14%,#ff45c5 22%,#9b005a 72%,#410026 100%);
  box-shadow:0 0 0 2px #ffe26b,0 2px 5px rgba(0,0,0,.52),0 0 10px rgba(255,67,196,.5);
}
.upgrade-card::before{left:-6px}.upgrade-card::after{right:-6px}
.upgrade-frame{
  position:relative;height:92%;min-height:0;display:flex;align-items:center;justify-content:center;
  filter:drop-shadow(0 6px 8px rgba(0,0,0,.54));
}
.upgrade-house{position:relative;width:100%;height:100%;max-height:84px;aspect-ratio:1/1;}
.upgrade-house img{display:block;width:100%;height:100%;object-fit:contain;}
.upgrade-base{filter:brightness(.33) saturate(.58) contrast(.92);opacity:.9;}
.upgrade-piece{position:absolute;top:0;bottom:0;width:20%;overflow:hidden;opacity:0;transition:opacity .26s ease,filter .26s ease;filter:drop-shadow(0 0 8px rgba(255,223,93,.28));}
.upgrade-piece img{position:absolute;top:0;width:500%;height:100%;object-fit:contain;left:calc(var(--i) * -100%);}
.upgrade-piece[data-i="0"]{left:0}.upgrade-piece[data-i="1"]{left:20%}.upgrade-piece[data-i="2"]{left:40%}.upgrade-piece[data-i="3"]{left:60%}.upgrade-piece[data-i="4"]{left:80%}
.upgrade-piece.revealed{opacity:1;animation:pieceWake .42s cubic-bezier(.2,1.4,.35,1);}
@keyframes pieceWake{0%{opacity:0;filter:brightness(2) drop-shadow(0 0 16px rgba(255,232,95,.9));transform:scale(1.12)}100%{opacity:1;filter:drop-shadow(0 0 8px rgba(255,223,93,.28));transform:scale(1)}}
.upgrade-text{min-width:0;text-align:center;line-height:1;display:flex;flex-direction:column;gap:6px;align-items:center;justify-content:center;}
.upgrade-title{font-family:var(--font-title);font-weight:900;font-size:clamp(8px,1.08vw,18px);color:#ffe35a;text-shadow:0 2px 0 #542500,0 4px 8px rgba(0,0,0,.62);white-space:nowrap;}
.upgrade-sub{font-weight:900;font-size:clamp(5px,.58vw,10px);color:#dcffd3;text-shadow:0 1px 2px rgba(0,0,0,.82);letter-spacing:.02em;}
.upgrade-count{min-width:42px;padding:2px 7px;border-radius:999px;background:rgba(255,235,91,.86);color:#18460e;font-weight:900;font-size:clamp(7px,.82vw,13px);box-shadow:inset 0 0 0 1px rgba(255,255,255,.34),0 3px 5px rgba(0,0,0,.28);}
.upgrade-card.active{box-shadow:inset 0 0 0 2px rgba(110,59,15,.78),0 0 0 2px rgba(255,232,101,.34),0 0 18px rgba(255,217,76,.42),0 7px 12px rgba(0,0,0,.38)}
.upgrade-card.complete .upgrade-title{color:#fff6bf}.upgrade-card.complete .upgrade-count{background:#6cff7d;color:#0f3b0b;}
.upgrade-card.complete .upgrade-house{animation:houseDone 1.15s ease-in-out infinite;}
@keyframes houseDone{50%{transform:translateY(-1px) scale(1.035)}}
.upgrade-meter.idle .upgrade-card{filter:saturate(.82) brightness(.82)}

/* Keep the legacy free-spin house panel alive as a hidden animation target so
   existing brick fly code still travels to the new top meter area. */
#house-panel:not(.hidden){left:17.3%!important;top:3.25%!important;width:57.4%!important;height:13.65%!important;opacity:0!important;pointer-events:none!important;z-index:15!important;}
#house-panel:not(.hidden) .brick-rack{left:34%!important;right:2%!important;top:20%!important;height:60%!important;display:grid!important;grid-template-columns:repeat(10,1fr)!important;}
#house-panel:not(.hidden) .house-stage-slots{inset:0!important;}

/* Button alignment pass: lock the controls into the art-design sockets. */
#btn-menu{left:3.9%!important;top:13.0%!important;width:5.45%!important;height:9.75%!important;}
#btn-turbo{left:3.9%!important;top:39.25%!important;width:5.45%!important;height:9.75%!important;}
.spin-btn{right:8.35%!important;top:40.85%!important;width:10.75%!important;height:19.05%!important;}
.bar-icon.buy{right:15.45%!important;top:28.25%!important;width:5.75%!important;height:10.25%!important;}
#btn-menu .ui-ico,#btn-turbo .ui-ico{width:46%!important;height:46%!important;}
.bar-icon.buy::before{inset:15%!important;}
@media (max-aspect-ratio: 1/1){
  .jackpots.upgrade-meter{top:4%;height:12.4%;gap:1.5%;}
  .upgrade-card{border-radius:10px;padding:4% 4.5%;grid-template-columns:44% 1fr;}
  .upgrade-title{font-size:clamp(7px,2.3vw,13px)}
  .upgrade-sub{display:none}.upgrade-count{font-size:clamp(7px,2vw,11px);padding:1px 5px;}
}
`;

  const STAGES = [
    { level: 1, key: "house1", title: "STROH HAUS", sub: "Start-Haus" },
    { level: 2, key: "house2", title: "BRICK HAUS", sub: "+5 Bricks" },
    { level: 3, key: "house3", title: "FESTUNG", sub: "+10 Bricks" },
  ];

  function addCss() {
    if (document.getElementById("upgrade-ui-css")) return;
    const s = document.createElement("style");
    s.id = "upgrade-ui-css";
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function uiAsset(name) {
    const A = window.PIGGY_ASSETS || {};
    return (A.ui || {})[name] || "";
  }

  function houseMarkup(url, title) {
    if (!url) return `<div class="upgrade-fallback">${title}</div>`;
    let pieces = "";
    for (let i = 0; i < 5; i++) {
      pieces += `<span class="upgrade-piece" data-i="${i}" style="--i:${i}"><img src="${url}" alt=""></span>`;
    }
    return `<div class="upgrade-house"><img class="upgrade-base" src="${url}" alt="${title}">${pieces}</div>`;
  }

  function buildMeter() {
    const meter = document.querySelector(".jackpots");
    if (!meter || meter.classList.contains("upgrade-meter")) return meter;
    meter.classList.add("upgrade-meter", "idle");
    meter.removeAttribute("aria-hidden");
    meter.setAttribute("aria-label", "Haus Upgrade Fortschritt");
    meter.innerHTML = STAGES.map((st) => {
      const url = uiAsset(st.key);
      return `<div class="upgrade-card" data-upgrade-level="${st.level}">
        <div class="upgrade-frame">${houseMarkup(url, st.title)}</div>
        <div class="upgrade-text"><div class="upgrade-title">${st.title}</div><div class="upgrade-sub">${st.sub}</div><div class="upgrade-count">0/5</div></div>
      </div>`;
    }).join("");
    return meter;
  }

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function filledBricks() {
    return [...document.querySelectorAll("#brick-rack span.filled")].length;
  }
  function inFreeSpins() {
    const panel = document.getElementById("house-panel");
    return !!(panel && !panel.classList.contains("hidden"));
  }
  function houseLevel() {
    const panel = document.getElementById("house-panel");
    return Number((panel && panel.dataset.level) || 1);
  }
  function stageProgress(stage, bricks, level, active) {
    if (!active) return 0;
    if (stage === 1) return 5;                 // the bonus starts in the straw house
    if (stage === 2) return level >= 2 ? 5 : clamp(bricks, 0, 5);
    if (stage === 3) return level >= 3 ? 5 : clamp(bricks - 5, 0, 5);
    return 0;
  }

  function paintMeter() {
    const meter = buildMeter();
    if (!meter) return;
    const active = inFreeSpins();
    const bricks = filledBricks();
    const lvl = houseLevel();
    meter.classList.toggle("idle", !active);
    meter.querySelectorAll(".upgrade-card").forEach((card) => {
      const stage = Number(card.dataset.upgradeLevel);
      const p = stageProgress(stage, bricks, lvl, active);
      card.classList.toggle("active", active && stage === lvl);
      card.classList.toggle("complete", p >= 5);
      card.querySelector(".upgrade-count").textContent = `${p}/5`;
      card.querySelectorAll(".upgrade-piece").forEach((piece, i) => piece.classList.toggle("revealed", i < p));
    });
  }

  function observe() {
    const watched = [document.getElementById("house-panel"), document.getElementById("brick-rack"), document.body].filter(Boolean);
    const mo = new MutationObserver(paintMeter);
    watched.forEach((node) => mo.observe(node, { attributes: true, childList: true, subtree: true, attributeFilter: ["class", "data-level"] }));
    setInterval(paintMeter, 600);
  }

  function boot() {
    addCss();
    buildMeter();
    paintMeter();
    observe();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
