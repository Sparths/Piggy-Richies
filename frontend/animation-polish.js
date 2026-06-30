/* Piggy Richies animation polish: asset-driven free-spins transition + lightweight win sparks. */
(() => {
  "use strict";

  const proto = Element.prototype;
  const desc = Object.getOwnPropertyDescriptor(proto, "innerHTML") || Object.getOwnPropertyDescriptor(HTMLElement.prototype, "innerHTML");
  if (!desc || !desc.get || !desc.set) return;

  const nativeGet = desc.get;
  const nativeSet = desc.set;

  function esc(value) {
    return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  }

  function ui(name, fallback) {
    const assets = (window.PIGGY_ASSETS && window.PIGGY_ASSETS.ui) || {};
    return assets[name] || fallback || "";
  }

  function freeSpinCountFrom(html) {
    const text = typeof html === "string" ? html : "";
    return (text.match(/<p>\s*(\d+)\s*Free Spins/i) || text.match(/(\d+)\s*Free Spins/i) || [null, ""])[1];
  }

  function transitionMarkup(html) {
    if (typeof html !== "string" || (!html.includes("fs-splash-img") && !html.includes("FREE SPINS"))) return html;
    const spins = freeSpinCountFrom(html);
    const count = spins ? `${spins} FREISPIELE` : "FREISPIELE";
    const src = {
      dim: ui("transitionDimmingOverlay", "assets/ui/chat8.png"),
      burst: ui("transitionBurstBg", "assets/ui/chat2.png"),
      wind: ui("transitionWindOverlay", "assets/ui/chat3.png"),
      pot: ui("transitionPotSeal", "assets/ui/chat4.png"),
      brick: ui("transitionBrickBurst", "assets/ui/chat5.png"),
      portal: ui("transitionPortalRing", "assets/ui/chat7.png"),
      banner: ui("transitionFreeSpinsBanner", "assets/ui/chat1.png"),
    };

    return [
      '<div class="fsfx-shell" aria-hidden="true">',
      `  <img class="fsfx-layer fsfx-dim" src="${esc(src.dim)}" alt="">`,
      `  <img class="fsfx-layer fsfx-burst" src="${esc(src.burst)}" alt="">`,
      `  <img class="fsfx-layer fsfx-wind" src="${esc(src.wind)}" alt="">`,
      `  <img class="fsfx-layer fsfx-bricks" src="${esc(src.brick)}" alt="">`,
      `  <img class="fsfx-layer fsfx-pot" src="${esc(src.pot)}" alt="">`,
      `  <img class="fsfx-layer fsfx-portal" src="${esc(src.portal)}" alt="">`,
      `  <img class="fsfx-layer fsfx-banner" src="${esc(src.banner)}" alt="FREE SPINS">`,
      `  <div class="fsfx-count">${esc(count)} &middot; Ziegel sammeln</div>`,
      '</div>',
    ].join("");
  }

  function armFreeSpinTransition(node) {
    if (!node || !node.querySelector || !node.querySelector(".fsfx-shell")) return;
    requestAnimationFrame(() => {
      const shell = node.querySelector(".fsfx-shell");
      if (!shell) return;
      node.classList.add("asset-free-transition");
      shell.classList.remove("is-running");
      void shell.offsetWidth;
      shell.classList.add("is-running");
    });
  }

  Object.defineProperty(proto, "innerHTML", {
    configurable: true,
    enumerable: desc.enumerable,
    get() {
      return nativeGet.call(this);
    },
    set(value) {
      const isFreeFlash = this && this.id === "fs-flash";
      if (isFreeFlash) value = transitionMarkup(value);
      const result = nativeSet.call(this, value);
      if (isFreeFlash) armFreeSpinTransition(this);
      return result;
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
