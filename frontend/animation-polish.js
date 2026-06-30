/* Piggy Richies animation polish: remove large image splash overlays and replace them with procedural UI. */
(() => {
  "use strict";

  const proto = Element.prototype;
  const desc = Object.getOwnPropertyDescriptor(proto, "innerHTML") || Object.getOwnPropertyDescriptor(HTMLElement.prototype, "innerHTML");
  if (!desc || !desc.get || !desc.set) return;

  const nativeGet = desc.get;
  const nativeSet = desc.set;

  function escapeAttr(value) {
    return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  }

  function buildCleanFreeSpinIntro(html) {
    if (typeof html !== "string" || !html.includes("fs-splash-img")) return html;
    const spins = (html.match(/<p>\s*(\d+)\s*Free Spins/i) || [null, ""])[1];
    const ui = ((window.PIGGY_ASSETS || {}).ui) || {};
    const badge = ui.freeSpinBadge || "assets/ui/free-spin-badge.svg";
    const spinCopy = spins ? `${spins} Free Spins` : "Free Spins";

    return [
      '<div class="fs-splash-card fs-splash-card--clean">',
      '  <div class="fs-streaks" aria-hidden="true"><span></span><span></span><span></span><span></span></div>',
      `  <div class="fs-badge-wrap"><img class="fs-badge-img" src="${escapeAttr(badge)}" alt=""></div>`,
      '  <div class="fs-splash-copy">',
      '    <span class="fs-transition-topline">HOUSE BUILD MODE</span>',
      '    <h1>FREE SPINS</h1>',
      `    <p>${spinCopy} &middot; Bricks collect directly from the reels</p>`,
      '    <i class="fs-rule" aria-hidden="true"></i>',
      '  </div>',
      '</div>',
    ].join("");
  }

  Object.defineProperty(proto, "innerHTML", {
    configurable: true,
    enumerable: desc.enumerable,
    get() {
      return nativeGet.call(this);
    },
    set(value) {
      if (this && this.id === "fs-flash") value = buildCleanFreeSpinIntro(value);
      return nativeSet.call(this, value);
    },
  });

  function attachBigWinSparks() {
    const overlay = document.getElementById("bigwin");
    if (!overlay || overlay.querySelector(".bigwin-sparks")) return;
    const sparks = document.createElement("div");
    sparks.className = "bigwin-sparks";
    sparks.setAttribute("aria-hidden", "true");
    for (let i = 0; i < 20; i += 1) {
      const spark = document.createElement("i");
      spark.style.setProperty("--x", `${(i * 37 + 11) % 100}%`);
      spark.style.setProperty("--y", `${(i * 53 + 17) % 100}%`);
      spark.style.setProperty("--s", `${6 + (i % 5) * 2}px`);
      spark.style.setProperty("--t", `${1.8 + (i % 6) * 0.18}s`);
      spark.style.setProperty("--d", `${-(i % 9) * 0.16}s`);
      sparks.appendChild(spark);
    }
    overlay.insertBefore(sparks, overlay.firstChild);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", attachBigWinSparks, { once: true });
  else attachBigWinSparks();
})();
