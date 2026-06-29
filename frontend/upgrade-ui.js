/* Piggy Richies -- generated house-upgrade UI binding.
 *
 * The clean generated shell is used as the live screen background. The old
 * jackpot strip is replaced by three generated raster panels. Each house image
 * is revealed in five vertical pieces from the existing free-spin brick state.
 * The generated button art is also bound to the shell controls. */
(() => {
  "use strict";

  const ASSETS = window.PIGGY_ASSETS || {};
  const UI = ASSETS.ui || {};
  const $ = (id) => document.getElementById(id);
  const cssUrl = (url) => (url ? `url("${url}")` : "none");

  const STAGES = [
    { stage: 1, key: "upgradeHouseStraw", title: "STROH", label: "Stroh-Haus" },
    { stage: 2, key: "upgradeHouseBrick", title: "BRICK", label: "Brick-Haus" },
    { stage: 3, key: "upgradeHouseFortress", title: "FESTUNG", label: "Festung" },
  ];

  const CSS = `
/* --- generated top house upgrade meter ---------------------------------- */
.jackpots.house-upgrade-meter{
  left:15.0%;top:2.2%;width:65.5%;height:16.3%;z-index:18;pointer-events:none;
  display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1.65%;align-items:stretch;
  isolation:isolate;
}
.jackpots.house-upgrade-meter .jackpot{display:none!important;}
.upgrade-card{
  position:relative;z-index:1;min-width:0;height:100%;overflow:visible;
  background:var(--upgrade-frame) center/100% 100% no-repeat;
  filter:drop-shadow(0 7px 10px rgba(0,0,0,.38));
  isolation:isolate;
}
.upgrade-window{
  position:absolute;left:7.9%;right:7.9%;top:15.0%;bottom:20.8%;z-index:1;
  border-radius:10px;overflow:hidden;background:#064b16;
  box-shadow:inset 0 0 18px rgba(0,0,0,.66);
}
.upgrade-art{
  position:absolute;inset:0;z-index:1;background-image:var(--house-img);background-repeat:no-repeat;
  background-size:cover;background-position:center;
}
.upgrade-lock{
  position:absolute;top:0;bottom:0;width:20%;z-index:2;
  background:linear-gradient(180deg,rgba(2,14,16,.58),rgba(1,7,10,.78));
  box-shadow:inset 0 0 16px rgba(0,0,0,.45);
  transition:opacity .28s ease,filter .28s ease;
}
.upgrade-lock[data-i="0"]{left:0}.upgrade-lock[data-i="1"]{left:20%}.upgrade-lock[data-i="2"]{left:40%}.upgrade-lock[data-i="3"]{left:60%}.upgrade-lock[data-i="4"]{left:80%}
.upgrade-lock.revealed{opacity:0;animation:upgradePieceWake .42s cubic-bezier(.2,1.45,.35,1);}
.upgrade-window::after{
  content:"";position:absolute;inset:0;z-index:3;pointer-events:none;
  background:linear-gradient(90deg,transparent 0 19.4%,rgba(235,250,255,.44) 19.6% 20.1%,transparent 20.3% 39.4%,rgba(235,250,255,.44) 39.6% 40.1%,transparent 40.3% 59.4%,rgba(235,250,255,.44) 59.6% 60.1%,transparent 60.3% 79.4%,rgba(235,250,255,.44) 79.6% 80.1%,transparent 80.3%);
  box-shadow:inset 0 0 22px rgba(0,0,0,.45);
}
.upgrade-count{
  position:absolute;left:36%;right:36%;bottom:2.9%;z-index:4;height:16%;
  display:flex;align-items:center;justify-content:center;text-align:center;
  font-family:var(--font-title);font-weight:900;font-size:clamp(11px,1.65vw,28px);line-height:1;
  color:#fff8bf;text-shadow:0 2px 0 #1a4813,0 4px 5px rgba(0,0,0,.58);
  letter-spacing:.04em;
}
.upgrade-title{
  position:absolute;left:11%;right:11%;top:5.8%;z-index:4;text-align:center;
  font-family:var(--font-title);font-size:clamp(6px,.72vw,12px);font-weight:900;
  color:rgba(255,244,158,.0);text-shadow:none;pointer-events:none;
}
.upgrade-card.active{filter:drop-shadow(0 7px 10px rgba(0,0,0,.38)) drop-shadow(0 0 14px rgba(255,223,80,.38));}
.upgrade-card.complete .upgrade-window{box-shadow:inset 0 0 12px rgba(0,0,0,.38),0 0 8px rgba(255,231,92,.38);}
.upgrade-card.complete .upgrade-count{color:#ffffd8;}
.upgrade-card.idle .upgrade-window{filter:saturate(.82) brightness(.82);}
@keyframes upgradePieceWake{0%{opacity:.9;filter:brightness(2.25) drop-shadow(0 0 18px rgba(255,231,92,.95));}70%{opacity:.18;}100%{opacity:0;filter:none;}}

/* Hide legacy free-spin meter visuals, but keep its DOM alive as the existing
   brick state source and fly-to target. */
#house-panel:not(.hidden){opacity:0!important;pointer-events:none!important;z-index:14!important;}
#house-panel:not(.hidden) .brick-rack{display:grid!important;}
.phase-banner,#mult-tab{display:none!important;}

/* Generated control-button binding. */
#btn-menu,#btn-turbo,.bar-icon.buy,.spin-btn{
  background-position:center!important;background-size:contain!important;background-repeat:no-repeat!important;
  filter:drop-shadow(0 6px 8px rgba(0,0,0,.38))!important;
}
#btn-menu{left:3.15%!important;top:18.6%!important;width:6.15%!important;height:10.95%!important;background-image:var(--btn-menu)!important;}
#btn-turbo{left:3.15%!important;top:39.0%!important;width:6.15%!important;height:10.95%!important;background-image:var(--btn-turbo)!important;}
#btn-menu .ui-ico,#btn-turbo .ui-ico{display:none!important;}
.bar-icon.buy{right:15.0%!important;top:30.1%!important;width:6.2%!important;height:11.0%!important;background-image:var(--btn-coin)!important;}
.bar-icon.buy::before,.bar-icon.buy b,.bar-icon.buy small{display:none!important;}
.spin-btn{right:7.35%!important;top:41.8%!important;width:12.1%!important;height:21.5%!important;background-image:var(--btn-spin)!important;}
.spin-btn .spin-label{display:none!important;}
.spin-btn.spinning{animation:none!important;filter:brightness(1.08) drop-shadow(0 0 12px rgba(104,255,70,.45)) drop-shadow(0 8px 10px rgba(0,0,0,.45))!important;}

@media (max-aspect-ratio: 1/1){
  .jackpots.house-upgrade-meter{left:14.8%;top:3.1%;width:65.8%;height:14.3%;gap:1.1%;}
  .upgrade-window{left:8.5%;right:8.5%;top:17%;bottom:22%;border-radius:8px;}
  .upgrade-count{font-size:clamp(8px,2.7vw,18px);bottom:3.5%;}
}
`;

  function addCss() {
    if (document.getElementById("piggy-upgrade-ui-css")) return;
    const s = document.createElement("style");
    s.id = "piggy-upgrade-ui-css";
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function setCssVars() {
    const root = document.documentElement;
    root.style.setProperty("--ui-screenShell", cssUrl(UI.cleanScreenShell || UI.screenShell));
    root.style.setProperty("--upgrade-frame", cssUrl(UI.upgradePanelFrame));
    root.style.setProperty("--btn-menu", cssUrl(UI.upgradeBtnMenu));
    root.style.setProperty("--btn-turbo", cssUrl(UI.upgradeBtnTurbo));
    root.style.setProperty("--btn-coin", cssUrl(UI.upgradeBtnCoin));
    root.style.setProperty("--btn-spin", cssUrl(UI.upgradeBtnSpin));
  }

  function buildMeter() {
    const meter = document.querySelector(".jackpots");
    if (!meter) return null;
    if (meter.classList.contains("house-upgrade-meter")) return meter;
    meter.classList.add("house-upgrade-meter");
    meter.removeAttribute("aria-hidden");
    meter.setAttribute("aria-label", "Haus-Upgrade-Fortschritt");
    meter.innerHTML = STAGES.map((stage) => `
      <div class="upgrade-card idle" data-stage="${stage.stage}" aria-label="${stage.label}">
        <div class="upgrade-window">
          <div class="upgrade-art"></div>
          <span class="upgrade-lock" data-i="0"></span>
          <span class="upgrade-lock" data-i="1"></span>
          <span class="upgrade-lock" data-i="2"></span>
          <span class="upgrade-lock" data-i="3"></span>
          <span class="upgrade-lock" data-i="4"></span>
        </div>
        <div class="upgrade-title">${stage.title}</div>
        <div class="upgrade-count">0/5</div>
      </div>`).join("");

    STAGES.forEach((stage) => {
      const card = meter.querySelector(`[data-stage="${stage.stage}"]`);
      const art = UI[stage.key] || UI[`house${stage.stage}`] || "";
      if (card && art) card.style.setProperty("--house-img", cssUrl(art));
    });
    return meter;
  }

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function brickCount() {
    const slots = document.querySelectorAll("#brick-rack span.filled");
    if (slots.length) return slots.length;
    const txt = ($("brick-label") && $("brick-label").textContent) || "";
    const m = txt.match(/(\d+)\s*\/\s*(\d+)/);
    return m ? Number(m[1]) : 0;
  }

  function isFreeSpinActive() {
    const panel = $("house-panel");
    return !!(panel && !panel.classList.contains("hidden"));
  }

  function houseLevel() {
    const panel = $("house-panel");
    const fromPanel = Number(panel && panel.dataset.level);
    if (fromPanel) return fromPanel;
    const name = (($("house-name") && $("house-name").textContent) || "").toLowerCase();
    if (name.includes("fest")) return 3;
    if (name.includes("holz") || name.includes("brick") || name.includes("ziegel")) return 2;
    return 1;
  }

  function progressFor(stage, bricks, level, active) {
    if (!active) return 0;
    if (stage === 1) return 5;
    if (stage === 2) return level >= 2 ? 5 : clamp(bricks, 0, 5);
    if (stage === 3) return level >= 3 ? 5 : clamp(bricks - 5, 0, 5);
    return 0;
  }

  function paintMeter() {
    const meter = buildMeter();
    if (!meter) return;
    const active = isFreeSpinActive();
    const level = houseLevel();
    const bricks = brickCount();
    meter.querySelectorAll(".upgrade-card").forEach((card) => {
      const stage = Number(card.dataset.stage);
      const progress = progressFor(stage, bricks, level, active);
      card.classList.toggle("idle", !active);
      card.classList.toggle("active", active && stage === level);
      card.classList.toggle("complete", active && progress >= 5);
      const count = card.querySelector(".upgrade-count");
      if (count) count.textContent = `${progress}/5`;
      card.querySelectorAll(".upgrade-lock").forEach((lock, i) => {
        lock.classList.toggle("revealed", i < progress);
      });
    });
  }

  function watchState() {
    const nodes = [$("house-panel"), $("brick-rack"), $("house-name"), document.body].filter(Boolean);
    const mo = new MutationObserver(paintMeter);
    nodes.forEach((node) => mo.observe(node, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "data-level"] }));
    setInterval(paintMeter, 450);
  }

  function boot() {
    addCss();
    setCssVars();
    buildMeter();
    paintMeter();
    watchState();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
