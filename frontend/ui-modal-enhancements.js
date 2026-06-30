/* Small runtime polish for modal-like popovers. */
(() => {
  "use strict";

  function enhanceBuyModal() {
    const buy = document.getElementById("buy-pop");
    if (!buy || buy.dataset.enhanced === "1") return;
    buy.dataset.enhanced = "1";

    const close = document.createElement("button");
    close.type = "button";
    close.className = "modal-x buy-modal-x";
    close.setAttribute("aria-label", "Schliessen");
    close.textContent = "x";
    close.addEventListener("click", (event) => {
      event.stopPropagation();
      buy.classList.add("hidden");
    });
    buy.insertBefore(close, buy.firstChild);

    buy.addEventListener("click", (event) => {
      if (event.target === buy) buy.classList.add("hidden");
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", enhanceBuyModal, { once: true });
  else enhanceBuyModal();
})();
