/* Piggy host animation controller. Keeps the host grounded and plays subtle idle plus a short win reaction. */
(() => {
  "use strict";

  const host = document.getElementById("pig-host");
  const winEl = document.getElementById("win-amount");
  const spinBtn = document.getElementById("spin");
  if (!host || !winEl) return;

  const sprite = host.querySelector(".pig-host-sprite");
  const idleAnim = "pigHostBreath 4.8s ease-in-out infinite, pigHostTinySway 6.2s ease-in-out infinite";
  host.style.setProperty("left", "5.2%");
  host.style.setProperty("top", "44.8%");
  host.style.setProperty("width", "15.2%");
  if (sprite) sprite.style.animation = idleAnim;

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

  function restoreIdle() {
    host.classList.remove("is-win");
    if (sprite) sprite.style.animation = idleAnim;
  }

  function playWin() {
    const now = performance.now();
    if (now - lastPlayAt < 760) return;
    lastPlayAt = now;
    host.classList.remove("is-win");
    if (sprite) sprite.style.animation = "";
    void host.offsetWidth;
    host.classList.add("is-win");
    window.clearTimeout(resetTimer);
    resetTimer = window.setTimeout(restoreIdle, 1180);
  }

  function checkWinMeter() {
    const value = parseMoney(winEl.textContent);
    if (value <= 0.001) {
      lastValue = 0;
      restoreIdle();
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
      restoreIdle();
    }, { passive: true });
  }

  window.PIGGY_HOST = { playWin, idle: restoreIdle };
})();
