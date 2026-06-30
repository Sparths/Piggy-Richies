/* Fantasy text styler for premium UI labels.
   The uploaded font sheet is kept as an asset reference, but dynamic text stays
   real text so it remains readable and never slices the atlas incorrectly. */
(() => {
  "use strict";

  const selectors = [
    ".fs-simple-caption",
    "#bigwin-tier",
    "#hc-title",
    "#hc-sub",
    "#phase",
    ".fs-counter label",
  ];

  const ui = (window.PIGGY_ASSETS && window.PIGGY_ASSETS.ui) || {};
  const sheet = ui.fantasyFontSheet || "assets/ui/fontsheetasset.webp";
  document.documentElement.style.setProperty("--fantasy-font-sheet", `url("${sheet}")`);

  function render(el) {
    if (!el) return;
    const text = String(el.textContent || "").replace(/\s+/g, " ").trim();
    if (!text) return;
    el.classList.add("fantasy-atlas-text", "ff-ready");
    el.setAttribute("aria-label", text);
  }

  function scan(root = document) {
    for (const selector of selectors) {
      if (root.matches && root.matches(selector)) render(root);
      root.querySelectorAll?.(selector).forEach(render);
    }
  }

  let queued = false;
  function queueScan() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      scan();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => scan(), { once: true });
  else scan();

  new MutationObserver(queueScan).observe(document.documentElement, {
    childList: true,
    characterData: true,
    subtree: true,
  });

  window.PIGGY_FONT = { render, scan };
})();
