/* Clean generated house-upgrade UI overlay.
 * Keeps the known-working slot code intact and only swaps the visible shell,
 * top house-progress panels, and generated control button art. */
(() => {
  "use strict";

  const ASSETS = window.PIGGY_ASSETS || {};
  const UI = ASSETS.ui || {};
  const $ = (id) => document.getElementById(id);
  const url = (value) => value ? `url("${value}")` : "none";

  const STAGES = [
    { stage: 1, key: "upgradeHouseStraw", label: "Stroh-Haus" },
    { stage: 2, key: "upgradeHouseBrick", label: "Steinhaus" },
    { stage: 3, key: "upgradeHouseFortress", label: "Festung" },
  ];

  const CSS = `
.jackpots.house-upgrade-meter{
  left:15.0%;top:2.2%;width:65.5%;height:16.3%;z-index:18;pointer-events:none;
  display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1.65%;align-items:stretch;
}
.jackpots.house-upgrade-meter .jackpot{display:none!important;}
.upgrade-card{
  position:relative;min-width:0;height:100%;overflow:visible;
  background:var(--upgrade-frame) center/100% 100% no-repeat;
  filter:drop-shadow(0 7px 10px rgba(0,0,0,.36));
}
.upgrade-window{
  position:absolute;left:7.9%;right:7.9%;top:15.0%;bottom:20.8%;z-index:1;
  border-radius:10px;overflow:hidden;background:#064b16;
  box-shadow:inset 0 0 18px rgba(0,0,0,.62);
}
.upgrade-art{
  position:absolute;inset:0;z-index:1;background-image:var(--house-img);
  background-repeat:no-repeat;background-size:cover;background-position:center;
}
.upgrade-lock{
  position:absolute;top:0;bottom:0;width:20%;z-index:2;
  background:linear-gradient(180deg,rgba(2,14,16,.56),rgba(1,7,10,.78));
  box-shadow:inset 0 0 16px rgba(0,0,0,.45);
}
.upgrade-lock[data-i="0"]{left:0}.upgrade-lock[data-i="1"]{left:20%}.upgrade-lock[data-i="2"]{left:40%}.upgrade-lock[data-i="3"]{left:60%}.upgrade-lock[data-i="4"]{left:80%}
.upgrade-lock.revealed{opacity:0;transition:opacity .25s ease;}
.upgrade-window::after{
  content:"";position:absolute;inset:0;z-index:3;pointer-events:none;
  background:linear-gradient(90deg,transparent 0 19.4%,rgba(235,250,255,.42) 19.6% 20.1%,transparent 20.3% 39.4%,rgba(235,250,255,.42) 39.6% 40.1%,transparent 40.3% 59.4%,rgba(235,250,255,.42) 59.6% 60.1%,transparent 60.3% 79.4%,rgba(235,250,255,.42) 79.6% 80.1%,transparent 80.3%);
  box-shadow:inset 0 0 22px rgba(0,0,0,.43);
}
.upgrade-count{
  position:absolute;left:36%;right:36%;bottom:2.9%;z-index:4;height:16%;
  display:flex;align-items:center;justify-content:center;text-align:center;
  font-family:var(--font-title);font-weight:900;font-size:clamp(11px,1.65vw,28px);line-height:1;
  color:#fff8bf;text-shadow:0 2px 0 #1a4813,0 4px 5px rgba(0,0,0,.58);letter-spacing:.04em;
}
#house-panel:not(.hidden){opacity:0!important;pointer-events:none!important;z-index:14!important;}
#house-panel:not(.hidden) .brick-rack{display:grid!important;}
.phase-banner,#mult-tab{display:none!important;}
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
`;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function setVars() {
    const root = document.documentElement;
    root.style.setProperty("--upgrade-frame", url(UI.upgradePanelFrame));
    root.style.setProperty("--btn-menu", url(UI.upgradeBtnMenu));
    root.style.setProperty("--btn-turbo", url(UI.upgradeBtnTurbo));
    root.style.setProperty("--btn-coin", url(UI.upgradeBtnCoin));
    root.style.setProperty("--btn-spin", url(UI.upgradeBtnSpin));
  }

  function addCss() {
    if (document.getElementById("piggy-upgrade-ui-css")) return;
    const style = document.createElement("style");
    style.id = "piggy-upgrade-ui-css";
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  function buildMeter() {
    const meter = document.querySelector(".jackpots");
    if (!meter) return null;
    if (meter.classList.contains("house-upgrade-meter")) return meter;
    meter.classList.add("house-upgrade-meter");
    meter.removeAttribute("aria-hidden");
    meter.innerHTML = STAGES.map((stage) => `
      <div class="upgrade-card" data-stage="${stage.stage}" aria-label="${stage.label}">
        <div class="upgrade-window">
          <div class="upgrade-art"></div>
          <span class="upgrade-lock" data-i="0"></span>
          <span class="upgrade-lock" data-i="1"></span>
          <span class="upgrade-lock" data-i="2"></span>
          <span class="upgrade-lock" data-i="3"></span>
          <span class="upgrade-lock" data-i="4"></span>
        </div>
        <div class="upgrade-count">0/5</div>
      </div>`).join("");

    STAGES.forEach((stage) => {
      const card = meter.querySelector(`[data-stage="${stage.stage}"]`);
      const art = UI[stage.key] || "";
      if (card && art) card.style.setProperty("--house-img", url(art));
    });
    return meter;
  }

  function brickCount() {
    const filled = document.querySelectorAll("#brick-rack span.filled").length;
    if (filled) return filled;
    const text = ($("brick-label") && $("brick-label").textContent) || "";
    const match = text.match(/(\d+)\s*\/\s*(\d+)/);
    return match ? Number(match[1]) : 0;
  }

  function houseLevel() {
    const panel = $("house-panel");
    const level = Number(panel && panel.dataset.level);
    if (level) return level;
    const name = (($("house-name") && $("house-name").textContent) || "").toLowerCase();
    if (name.includes("fest")) return 3;
    if (name.includes("holz") || name.includes("stein") || name.includes("ziegel")) return 2;
    return 1;
  }

  function isFreeSpinActive() {
    const panel = $("house-panel");
    return !!(panel && !panel.classList.contains("hidden"));
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
      const count = card.querySelector(".upgrade-count");
      if (count) count.textContent = `${progress}/5`;
      card.querySelectorAll(".upgrade-lock").forEach((lock, i) => lock.classList.toggle("revealed", i < progress));
    });
  }

  function watch() {
    const nodes = [$("house-panel"), $("brick-rack"), $("house-name"), document.body].filter(Boolean);
    const observer = new MutationObserver(paintMeter);
    nodes.forEach((node) => observer.observe(node, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "data-level"] }));
    setInterval(paintMeter, 500);
  }

  function boot() {
    addCss();
    setVars();
    buildMeter();
    paintMeter();
    watch();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
