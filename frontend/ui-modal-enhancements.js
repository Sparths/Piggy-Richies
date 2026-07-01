/* Small runtime polish for modal-like popovers. */
(() => {
  "use strict";

  function enhanceBuyModal() {
    const buy = document.getElementById("buy-pop");
    if (!buy || buy.dataset.enhanced === "1") return;
    buy.dataset.enhanced = "1";

    let close = buy.querySelector("[data-pop-close]");
    if (!close) {
      close = document.createElement("button");
      close.type = "button";
      close.className = "modal-x buy-modal-x";
      close.setAttribute("data-pop-close", "");
      close.setAttribute("data-i18n-attr", "aria-label:a11y.close");
      close.textContent = "x";
      buy.insertBefore(close, buy.firstChild);
      if (window.PIGGY_I18N && window.PIGGY_I18N.applyStatic) window.PIGGY_I18N.applyStatic(close);
    }
    close.addEventListener("click", (event) => {
      event.stopPropagation();
      buy.classList.add("hidden");
    });

    buy.addEventListener("click", (event) => {
      if (event.target === buy) buy.classList.add("hidden");
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", enhanceBuyModal, { once: true });
  else enhanceBuyModal();
})();
