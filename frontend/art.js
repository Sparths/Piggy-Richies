/* Huff & Puff: Piggy Richies -- bitmap artwork loader.
 * Visible game art is raster-only (PNG/WebP) through assets/manifest.js. */
(() => {
  "use strict";

  const IMG = {};
  const LOAD_TIMEOUT_MS = 2500;

  function loadImages(map, done) {
    const ids = Object.keys(map || {}).filter((id) => !!map[id]);
    if (!ids.length) {
      if (done) done();
      return;
    }

    let pending = ids.length;
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      if (done) done();
    };

    const settle = () => {
      if (finished) return;
      pending -= 1;
      if (pending <= 0) finish();
    };

    ids.forEach((id) => {
      const im = new Image();
      let settled = false;
      const once = (ok) => {
        if (settled) return;
        settled = true;
        if (ok) IMG[id] = map[id];
        settle();
      };
      im.onload = () => once(true);
      im.onerror = () => once(false);
      im.src = map[id];
      setTimeout(() => once(false), LOAD_TIMEOUT_MS);
    });

    setTimeout(finish, LOAD_TIMEOUT_MS + 600);
  }

  window.PIGGY_ART = {
    loadImages,
    hasImage: (id) => !!IMG[id],
    imageUrl: (id) => IMG[id],
    fallback: (id) => `<span class="sym-fallback">${id}</span>`,
  };
  window.PIGGY_ICONS = {};
})();
