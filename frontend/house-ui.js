(() => {
  "use strict";

  const PARTS = 5;
  const FALLBACK_ASSETS = {
    frame: "assets/ui/hausrahmen-cutout.png",
    straw: "assets/ui/strohhaus.png",
    stone: "assets/ui/steinhaus.png",
    fortress: "assets/ui/festung.png",
  };

  function guard(fn) {
    try {
      fn();
    } catch (err) {
      console.warn("[house-ui] disabled:", err);
    }
  }

  function onReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => guard(fn), { once: true });
    } else {
      guard(fn);
    }
  }

  function asset(name) {
    const ui = (window.PIGGY_ASSETS && window.PIGGY_ASSETS.ui) || {};
    return ui[name] || FALLBACK_ASSETS[name];
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function make(tag, className) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    return el;
  }

  function createCard(stage) {
    const card = make("section", "house-upgrade-card");
    card.dataset.stage = stage.id;
    card.setAttribute("aria-label", stage.label);

    const art = make("div", "house-upgrade-art");
    art.style.setProperty("--house-image", `url("${stage.image}")`);

    for (let i = 0; i < PARTS; i += 1) {
      const part = make("span", "house-upgrade-part is-locked");
      part.style.setProperty("--part-pos", `${i * 25}%`);
      part.dataset.part = String(i + 1);
      art.appendChild(part);
    }

    const count = make("div", "house-upgrade-count");
    count.textContent = "0/5";

    card.appendChild(art);
    card.appendChild(count);
    return card;
  }

  function readGameProgress() {
    const housePanel = document.getElementById("house-panel");
    const rack = document.getElementById("brick-rack");
    const inFreeSpins = !!housePanel && !housePanel.classList.contains("hidden");

    if (!inFreeSpins) {
      return [0, 0, 0];
    }

    const levelRaw = Number.parseInt(housePanel.dataset.level || "1", 10);
    const level = Number.isFinite(levelRaw) ? clamp(levelRaw, 1, 3) : 1;
    const filled = rack ? rack.querySelectorAll("span.filled").length : 0;

    let total = Math.max(filled, (level - 1) * PARTS);
    if (level >= 3 && total <= 10) {
      total = 11;
    }

    return [
      clamp(total, 0, PARTS),
      clamp(total - PARTS, 0, PARTS),
      clamp(total - PARTS * 2, 0, PARTS),
    ];
  }

  function applyProgress(container, progress) {
    const cards = [...container.querySelectorAll(".house-upgrade-card")];
    cards.forEach((card, cardIndex) => {
      const value = clamp(progress[cardIndex] || 0, 0, PARTS);
      const previous = Number.parseInt(card.dataset.progress || "0", 10);
      card.dataset.progress = String(value);
      card.classList.toggle("is-active", value > 0 && value < PARTS);

      const parts = [...card.querySelectorAll(".house-upgrade-part")];
      parts.forEach((part, partIndex) => {
        const open = partIndex < value;
        part.classList.toggle("is-open", open);
        part.classList.toggle("is-locked", !open);
      });

      const count = card.querySelector(".house-upgrade-count");
      if (count) count.textContent = `${value}/5`;

      if (value !== previous) {
        card.classList.remove("is-active");
        void card.offsetWidth;
        card.classList.toggle("is-active", value > 0 && value < PARTS);
      }
    });
  }

  function init() {
    const container = document.getElementById("house-upgrade-meter");
    if (!container || !window.PIGGY_ASSETS) {
      return;
    }

    const stages = [
      { id: "straw", label: "Strohhaus", image: asset("straw") },
      { id: "stone", label: "Steinhaus", image: asset("stone") },
      { id: "fortress", label: "Festung", image: asset("fortress") },
    ];

    container.textContent = "";
    stages.forEach((stage) => container.appendChild(createCard(stage)));

    let queued = false;
    const sync = () => guard(() => applyProgress(container, readGameProgress()));
    const scheduleSync = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        sync();
      });
    };

    sync();

    const housePanel = document.getElementById("house-panel");
    const rack = document.getElementById("brick-rack");
    const observer = new MutationObserver(scheduleSync);

    if (housePanel) {
      observer.observe(housePanel, { attributes: true, attributeFilter: ["class", "data-level"] });
    }
    if (rack) {
      observer.observe(rack, { subtree: true, attributes: true, attributeFilter: ["class"] });
    }
  }

  onReady(init);
})();
