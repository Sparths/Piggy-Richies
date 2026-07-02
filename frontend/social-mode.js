(() => {
  "use strict";

  const params = new URLSearchParams(window.location.search || "");
  const SOCIAL_CURRENCIES = new Set(["GC", "SC", "COIN", "COINS", "TOKEN", "TOKENS", "FUN", "PLAY"]);
  const currency = String(params.get("currency") || params.get("token") || "").trim().toUpperCase();
  const COPY = {
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

  function looksSocial(value) {
    const text = String(value || "").toLowerCase();
    return /social|sweep|sweeps|coin/.test(text);
  }

  function isSocialMode(extra) {
    const values = [params.get("social"), params.get("socialMode"), params.get("wallet"), params.get("jurisdiction"), params.get("environment"), extra];
    return SOCIAL_CURRENCIES.has(currency) || values.some(looksSocial);
  }

  const i18n = window.PIGGY_I18N;
  if (!i18n || typeof i18n.t !== "function") return;

  let socialMode = isSocialMode();
  const normalT = i18n.t.bind(i18n);
  const normalSetLang = typeof i18n.setLang === "function" ? i18n.setLang.bind(i18n) : null;

  function table() {
    return COPY.en;
  }

  function fillVars(text, vars) {
    let out = String(text);
    if (vars) for (const key in vars) out = out.split("{" + key + "}").join(String(vars[key]));
    return out;
  }

  function socialT(key, vars) {
    const socialText = socialMode && table()[key];
    return socialText == null ? normalT(key, vars) : fillVars(socialText, vars);
  }

  function applySocialStatic(root) {
    if (!socialMode) return;
    const scope = root || document;
    scope.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (table()[key] != null) el.textContent = socialT(key);
    });
    scope.querySelectorAll("[data-i18n-html]").forEach((el) => {
      const key = el.getAttribute("data-i18n-html");
      if (table()[key] != null) el.innerHTML = socialT(key);
    });
    scope.querySelectorAll("[data-i18n-attr]").forEach((el) => {
      el.getAttribute("data-i18n-attr").split(";").forEach((pair) => {
        const idx = pair.indexOf(":");
        if (idx < 0) return;
        const attr = pair.slice(0, idx).trim();
        const key = pair.slice(idx + 1).trim();
        if (attr && table()[key] != null) el.setAttribute(attr, socialT(key));
      });
    });
  }

  i18n.t = socialT;
  i18n.isSocialMode = () => socialMode;
  i18n.setSocialMode = (value) => {
    const next = !!value;
    if (next === socialMode) return false;
    socialMode = next;
    if (socialMode) applySocialStatic();
    else if (typeof i18n.applyStatic === "function") i18n.applyStatic();
    return true;
  };
  if (normalSetLang) {
    i18n.setLang = (value) => {
      const changed = normalSetLang(value);
      if (socialMode) applySocialStatic();
      return changed;
    };
  }

  window.BRICKED_UP_SOCIAL_MODE = socialMode;
  window.BRICKED_UP_IS_SOCIAL_MODE = isSocialMode;
  window.PIGGY_SOCIAL_COPY = COPY;
  if (socialMode) applySocialStatic();

  window.addEventListener("message", (ev) => {
    try {
      const data = typeof ev.data === "string" ? JSON.parse(ev.data) : ev.data;
      const payload = data && (data.payload || data.data || data);
      if (!socialMode && isSocialMode(JSON.stringify(payload || ""))) i18n.setSocialMode(true);
    } catch (e) {}
  });
})();
