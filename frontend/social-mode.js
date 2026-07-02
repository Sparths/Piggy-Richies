(() => {
  "use strict";

  const params = new URLSearchParams(window.location.search || "");
  const SOCIAL_CURRENCIES = new Set(["GC", "SC", "COIN", "COINS", "TOKEN", "TOKENS", "FUN", "PLAY"]);
  const currency = String(params.get("currency") || params.get("token") || "").trim().toUpperCase();

  function looksSocial(value) {
    const text = String(value || "").toLowerCase();
    return /social|sweep|sweeps|coin/.test(text);
  }

  function isSocialMode(extra) {
    const values = [
      params.get("social"),
      params.get("socialMode"),
      params.get("wallet"),
      params.get("jurisdiction"),
      params.get("environment"),
      extra,
    ];
    return SOCIAL_CURRENCIES.has(currency) || values.some(looksSocial);
  }

  window.BRICKED_UP_SOCIAL_MODE = isSocialMode();

  window.PIGGY_SOCIAL_COPY = {
    en: {
      "hud.balance": "COINS",
      "hud.bet": "PLAY",
      "btn.buy": "Get bonus",
      "btn.buyShort": "GET",
      "a11y.betUp": "Increase play",
      "a11y.betDown": "Decrease play",
      "menu.paytable": "Win Table",
      "buy.title": "Get Bonus",
      "buy.cost": "Can be played for:",
      "buy.xbet": "× play",
      "buy.total": "total play",
      "buy.note": "Starts the House-Building Free Spins directly.",
      "help.li1": "<b>5x4 reels, 1024 ways.</b> Matching symbols on adjacent reels from the left win.",
      "ctrl.bet": "<b>Play up / down</b> - raise or lower your play amount.",
      "ctrl.buy": "<b>Get Bonus</b> - play to start the House-Building Free Spins instantly (asks you to confirm first).",
      "ctrl.menu": "<b><span class=\"ui-ico\" data-ico=\"menu\"></span> Menu</b> - how to play, win table and the sound toggle.",
      "confirm.title": "Get Bonus?",
      "confirm.realCost": "PLAY AMOUNT",
      "confirm.betLine": "Play {bet} × {mult}",
      "paytable.title": "Win Table",
      "paytable.sub": "(x play, per winning way)",
      "paytable.note": "Wild <span class=\"ui-ico\" data-ico=\"wolf\"></span> substitutes every symbol except Scatter <span class=\"ui-ico\" data-ico=\"pot\"></span>. Scatter wins anywhere.",
      "word.pays": "wins",
      "toast.noBalance": "Not enough coins"
    }
  };

  window.BRICKED_UP_IS_SOCIAL_MODE = isSocialMode;
})();
