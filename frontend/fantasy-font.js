/* Fantasy text styler for premium UI labels.
   Dynamic text stays real text so it remains readable. */
(() => {
  "use strict";

  const selectors = [
    "#bigwin-tier",
    "#hc-title",
    "#hc-sub",
    ".fs-counter label",
    // "#phase" intentionally NOT styled: it renders as the small live
    // free-spin pill, where gradient-clipped text turns muddy at ~10px.
  ];

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