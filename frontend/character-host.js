/* Piggy host animation controller. Keeps idle running and plays a short win reaction when the win meter increases. */
(() => {
  "use strict";

  const host = document.getElementById("pig-host");
  const winEl = document.getElementById("win-amount");
  const spinBtn = document.getElementById("spin");
  if (!host || !winEl) return;

  let lastValue = 0;
  let lastPlayAt = 0;
  let resetTimer = 0;

  function parseMoney(text) {
    const normalized = String(text || "")
      .replace(/[^0-9,.-]/g, "")
      .replace(/\.(?=\d{3}(\D|$))/g, "")
      .replace(",", ".");
    const value = Number(normalized);
    return Number.isFinite(value) ? value : 0;
  }

  function playWin() {
    const now = performance.now();
    if (now - lastPlayAt < 760) return;
    lastPlayAt = now;
    host.classList.remove("is-win");
    void host.offsetWidth;
    host.classList.add("is-win");
    window.clearTimeout(resetTimer);
    resetTimer = window.setTimeout(() => host.classList.remove("is-win"), 1180);
  }

  function checkWinMeter() {
    const value = parseMoney(winEl.textContent);
    if (value <= 0.001) {
      lastValue = 0;
      host.classList.remove("is-win");
      return;
    }
    if (value > lastValue + 0.001) playWin();
    lastValue = value;
  }

  const observer = new MutationObserver(checkWinMeter);
  observer.observe(winEl, { childList: true, characterData: true, subtree: true });

  if (spinBtn) {
    spinBtn.addEventListener("click", () => {
      lastValue = 0;
      host.classList.remove("is-win");
    }, { passive: true });
  }

  window.PIGGY_HOST = { playWin, idle: () => host.classList.remove("is-win") };
})();
