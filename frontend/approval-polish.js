(() => {
  "use strict";

  const GAME_ID = "bricked-up";
  const GAME_NAME = "Bricked Up";
  const params = new URLSearchParams(window.location.search || "");
  const currency = String(params.get("currency") || params.get("token") || "").trim().toUpperCase();
  let updating = false;

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

    if (baseBet && multiplier) {
      line.textContent = `${mode} BET ${amountWithCurrency(baseBet)} × ${multiplier} = REAL COST ${currentCost}`;
    } else if (baseBet) {
      line.textContent = `${mode} BET ${amountWithCurrency(baseBet)} = REAL COST ${currentCost}`;
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
  window.addEventListener("piggy:ready", applyApprovalPolish);
})();
