/* Huff & Puff: Piggy Richies -- bitmap artwork loader.
 * Visible game art is raster-only (PNG/WebP) through assets/manifest.js. */
(() => {
  "use strict";

  const IMG = {};

  function loadImages(map, done) {
    const ids = Object.keys(map || {});
    let pending = ids.length;
    if (!pending) { if (done) done(); return; }
    ids.forEach((id) => {
      const im = new Image();
      im.onload = () => { IMG[id] = map[id]; if (--pending === 0 && done) done(); };
      im.onerror = () => { if (--pending === 0 && done) done(); };
      im.src = map[id];
    });
  }

  window.PIGGY_ART = {
    loadImages,
    hasImage: (id) => !!IMG[id],
    imageUrl: (id) => IMG[id],
    fallback: (id) => `<span class="sym-fallback">${id}</span>`,
  };
  window.PIGGY_ICONS = {};
})();
