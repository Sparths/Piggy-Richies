/* Normalizes VIP feature-buy books so the Stone House is already complete.
   The UI should start at Holz-Haus with 5 bricks and continue building toward the fortress. */
(() => {
  "use strict";

  function cloneEvent(ev) {
    return ev && typeof ev === "object" ? { ...ev } : ev;
  }

  function normalizeBrickCount(value, isEnter) {
    const n = Number(value);
    if (!Number.isFinite(n)) return isEnter ? 5 : value;
    if (isEnter) return Math.max(5, n);
    if (n > 0 && n < 5) return n + 5;
    return n;
  }

  function normalizeVipBook(book, mode) {
    if (mode !== "bonus_vip" || !book || !Array.isArray(book.events)) return book;
    let sawEnter = false;
    return {
      ...book,
      events: book.events.map((event) => {
        const ev = cloneEvent(event);
        if (!ev || typeof ev !== "object") return ev;

        if (ev.type === "enterFreeGame") {
          sawEnter = true;
          ev.house = "Holz-Haus";
          ev.bricks = normalizeBrickCount(ev.bricks, true);
        } else if (Object.prototype.hasOwnProperty.call(ev, "bricks")) {
          ev.bricks = normalizeBrickCount(ev.bricks, false);
        }

        return ev;
      }).map((ev, index, arr) => {
        if (sawEnter || index !== 0) return ev;
        return ev;
      }),
    };
  }

  function install() {
    const stake = window.PIGGY_STAKE;
    if (!stake || typeof stake.play !== "function" || stake.__vipNormalizerInstalled) return;
    const nativePlay = stake.play.bind(stake);
    stake.play = async (payload) => {
      const result = await nativePlay(payload);
      const mode = payload && payload.mode;
      if (mode === "bonus_vip" && result) {
        if (result.book) result.book = normalizeVipBook(result.book, mode);
        if (result.round && Array.isArray(result.round.events)) result.round = normalizeVipBook(result.round, mode);
        if (result.raw && result.raw.book && Array.isArray(result.raw.book.events)) result.raw.book = normalizeVipBook(result.raw.book, mode);
      }
      return result;
    };
    stake.__vipNormalizerInstalled = true;
  }

  install();
  window.PIGGY_VIP_NORMALIZER = { normalizeVipBook, install };
})();
