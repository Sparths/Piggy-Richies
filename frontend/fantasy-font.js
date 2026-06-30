/* Bitmap font renderer for premium fantasy UI labels. */
(() => {
  "use strict";

  const rows = [
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    "abcdefghijklmnopqrstuvwxyz",
    "0123456789!?.,:;+-×/%",
    "ÄÖÜäöüß€$£@#&()[]",
  ];
  const selectors = [
    ".fs-simple-caption",
    "#bigwin-tier",
    "#hc-title",
    "#hc-sub",
    "#phase",
    ".fs-counter label",
    ".fs-counter span",
  ];
  const narrow = new Set("Iil!.,:;[]() ".split(""));
  const wide = new Set("MWmw@#&%".split(""));
  const extraWide = new Set("W@&%".split(""));

  const ui = (window.PIGGY_ASSETS && window.PIGGY_ASSETS.ui) || {};
  const sheet = ui.fantasyFontSheet || "assets/ui/fontsheetasset.webp";
  document.documentElement.style.setProperty("--fantasy-font-sheet", `url("${sheet}")`);

  function glyphFor(ch) {
    for (let row = 0; row < rows.length; row += 1) {
      const col = rows[row].indexOf(ch);
      if (col >= 0) return { row, col, cols: rows[row].length };
    }
    return null;
  }

  function makeGlyph(ch) {
    if (ch === " ") {
      const space = document.createElement("span");
      space.className = "ff-space";
      space.textContent = " ";
      return space;
    }
    const data = glyphFor(ch);
    const span = document.createElement("span");
    span.textContent = ch;
    if (!data) {
      span.className = "ff-plain";
      return span;
    }
    const x = data.cols > 1 ? (data.col / (data.cols - 1)) * 100 : 0;
    const y = rows.length > 1 ? (data.row / (rows.length - 1)) * 100 : 0;
    span.className = "ff-glyph";
    if (narrow.has(ch)) span.classList.add("ff-narrow");
    if (wide.has(ch)) span.classList.add("ff-wide");
    if (extraWide.has(ch)) span.classList.add("ff-extra-wide");
    span.style.setProperty("--ff-bg-size", `${data.cols * 100}% ${rows.length * 100}%`);
    span.style.setProperty("--ff-bg-pos", `${x}% ${y}%`);
    return span;
  }

  function rawText(el) {
    return String(el.textContent || "").replace(/\s+/g, " ").trim();
  }

  function render(el) {
    if (!el || el.dataset.ffBusy === "1") return;
    const text = rawText(el);
    if (!text) return;
    if (el.dataset.ffReady === "1" && el.dataset.ffRaw === text) return;
    el.dataset.ffBusy = "1";
    el.dataset.ffRaw = text;
    el.dataset.ffReady = "1";
    el.classList.add("fantasy-atlas-text", "ff-ready");
    el.setAttribute("aria-label", text);
    el.replaceChildren(...Array.from(text, makeGlyph));
    el.dataset.ffBusy = "0";
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
