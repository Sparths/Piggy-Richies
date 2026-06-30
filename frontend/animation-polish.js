/* Piggy Richies animation polish: sharp Free Spins trigger + lightweight win sparks. */
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

  function freeSpinCountFrom(html) {
    const text = typeof html === "string" ? html : "";
    return (text.match(/<p>\s*(\d+)\s*Free Spins/i) || text.match(/(\d+)\s*Free Spins/i) || [null, ""])[1];
  }

  function simpleFreeSpinMarkup(html) {
    if (typeof html !== "string" || (!html.includes("fs-splash-img") && !html.includes("FREE SPINS"))) return html;
    const spins = freeSpinCountFrom(html);
    const caption = spins ? `${spins} FREISPIELE` : "FREISPIELE";
    return [
      '<div class="fs-simple-shell fs-clean-shell">',
      '  <div class="fs-clean-badge" role="img" aria-label="FREE SPINS">',
      '    <span class="fs-crown">◆</span>',
      '    <span class="fs-word fs-word-free">FREE</span>',
      '    <span class="fs-word fs-word-spins">SPINS</span>',
      '    <i class="fs-ribbon fs-ribbon-left"></i>',
      '    <i class="fs-ribbon fs-ribbon-right"></i>',
      '  </div>',
      `  <div class="fs-simple-caption">${esc(caption)}</div>`,
      '</div>',
    ].join("");
  }

  function armSimpleFreeSpin(node) {
    if (!node || !node.querySelector || !node.querySelector(".fs-simple-shell")) return;
    requestAnimationFrame(() => {
      const shell = node.querySelector(".fs-simple-shell");
      if (!shell) return;
      node.classList.add("simple-free-transition");
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
      if (isFreeFlash) value = simpleFreeSpinMarkup(value);
      const result = nativeSet.call(this, value);
      if (isFreeFlash) armSimpleFreeSpin(this);
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
