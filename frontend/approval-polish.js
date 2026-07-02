(() => {
  "use strict";

  const GAME_ID = "bricked-up";
  const GAME_NAME = "Bricked Up";
  const params = new URLSearchParams(window.location.search || "");
  const currency = String(params.get("currency") || params.get("token") || "").trim().toUpperCase();
  const SOCIAL_CURRENCY_CODES = new Set(["GC", "SC", "COIN", "COINS", "TOKEN", "TOKENS", "FUN", "PLAY"]);
  let socialMode = detectSocialMode();
  let updating = false;

  function detectSocialMode(extra) {
    const values = [params.get("social"), params.get("socialMode"), params.get("mode"), params.get("wallet"), params.get("jurisdiction"), params.get("environment"), extra]
      .filter(Boolean).map((v) => String(v).toLowerCase());
    return values.some((v) => /social|sweep|sweeps|coin/.test(v)) || SOCIAL_CURRENCY_CODES.has(currency);
  }

  function amountWithCurrency(value) {
    const raw = String(value || "").trim().replace(/\s+[A-Z]{2,6}$/i, "");
    return currency ? `${raw} ${currency}` : raw;
  }

  function firstNumber(text) {
    const match = String(text || "").match(/[0-9][0-9.,]*/);
    return match ? match[0] : "";
  }

  function formatBonusCostLine() {
    const line = document.getElementById("bc-bet");
    const cost = document.getElementById("bc-cost");
    if (!line || !cost) return;

    const source = line.textContent || "";
    const match = source.match(/([0-9][0-9.,]*)(?:\s+[A-Z]{2,6})?\s*[×x]\s*([0-9][0-9.,]*)/i);
    const baseBet = match ? match[1] : firstNumber(source);
    const multiplier = match ? match[2] : "";
    const currentCost = amountWithCurrency(cost.textContent || "");
    const name = (document.getElementById("bc-name") || {}).textContent || "";
    const mode = /vip/i.test(name) ? "BONUS VIP" : "BONUS";
    const stakeLabel = socialMode ? "PLAY" : "BET";
    const costLabel = socialMode ? "PLAY AMOUNT" : "REAL COST";

    if (baseBet && multiplier) {
      line.textContent = `${mode} ${stakeLabel} ${amountWithCurrency(baseBet)} × ${multiplier} = ${costLabel} ${currentCost}`;
    } else if (baseBet) {
      line.textContent = `${mode} ${stakeLabel} ${amountWithCurrency(baseBet)} = ${costLabel} ${currentCost}`;
    }
    cost.textContent = currentCost;
  }

  function formatBuyPrices() {
    ["buy-a-price", "buy-b-price"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = amountWithCurrency(el.textContent);
    });
  }

  function removeDisplayedMetrics() {
    ["meta-rtp", "meta-max"].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.hidden = true;
      el.setAttribute("aria-hidden", "true");
      el.textContent = "";
    });

    const metricLine = [...document.querySelectorAll("#menu-pop .pop-info")]
      .find((el) => /\bRTP\b|\bMAX\b|VOLATILITY|HIT RATE|CHANCE|PROBABILITY/i.test(el.textContent || ""));
    if (metricLine) metricLine.remove();
  }

  function setText(selector, value) {
    document.querySelectorAll(selector).forEach((el) => { if (el.textContent !== value) el.textContent = value; });
  }

  function applySocialWording() {
    if (!socialMode) return;
    setText("[data-i18n='hud.balance']", "COINS");
    setText("[data-i18n='hud.bet']", "PLAY");
    setText("[data-i18n='btn.buyShort']", "GET");
    setText("[data-i18n='buy.title']", "Get Bonus");
    setText("[data-i18n='buy.cost']", "Can be played for:");
    setText("[data-i18n='buy.total']", "total play");
    setText("[data-i18n='confirm.title']", "Get Bonus?");
    setText("[data-i18n='confirm.realCost']", "PLAY AMOUNT");
    setText("[data-i18n='paytable.title']", "Win Table");
    setText("[data-act='paytable'] span[data-i18n='menu.paytable']", "Win Table");
    document.querySelectorAll("#btn-buy").forEach((el) => { el.setAttribute("title", "Get Bonus"); });
  }

  function applyApprovalPolish() {
    if (updating) return;
    updating = true;
    try {
      document.title = GAME_NAME;
      if (window.PIGGY_CONFIG) {
        window.PIGGY_CONFIG.gameId = GAME_ID;
        window.PIGGY_CONFIG.gameName = GAME_NAME;
      }
      removeDisplayedMetrics();
      formatBuyPrices();
      formatBonusCostLine();
      applySocialWording();
    } finally {
      updating = false;
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyApprovalPolish, { once: true });
  } else {
    applyApprovalPolish();
  }

  const observer = new MutationObserver(applyApprovalPolish);
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["class", "hidden"] });
  window.addEventListener("piggy:ready", (ev) => {
    socialMode = socialMode || detectSocialMode(ev && ev.detail && JSON.stringify(ev.detail.jurisdiction || ev.detail.config || ""));
    applyApprovalPolish();
  });
})();
