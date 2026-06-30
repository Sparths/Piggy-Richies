(() => {
  "use strict";
  window.PIGGY_VIP_NORMALIZER = {
    normalizeVipBook(book) { return book; },
    install() {},
    disabled: true,
  };

  const stake = window.PIGGY_STAKE;
  if (!stake || stake.__activeRoundRecovery) return;
  stake.__activeRoundRecovery = true;

  const originalPlay = typeof stake.play === "function" ? stake.play.bind(stake) : null;
  const originalEndRound = typeof stake.endRound === "function" ? stake.endRound.bind(stake) : null;
  if (!originalPlay || !originalEndRound) return;

  stake.play = async function recoveredPlay(payload) {
    try {
      return await originalPlay(payload);
    } catch (err) {
      const msg = String(err && (err.message || err) || "");
      if (!/round.*active|active.*round/i.test(msg)) throw err;
      await originalEndRound({ recovery: true });
      return originalPlay(payload);
    }
  };
})();
