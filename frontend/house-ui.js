(() => {
  "use strict";

  const PARTS = 5;
  const FALLBACK_ASSETS = {
    frame: "assets/ui/hausrahmen-cutout.webp",
    straw: "assets/ui/strohhaus.webp",
    stone: "assets/ui/steinhaus.webp",
    fortress: "assets/ui/festung.webp",
  };

  let container = null;
  let currentVisualTotal = 0;

  function guard(fn, fallback) {
    try {
      return fn();
    } catch (err) {
      console.warn("[house-ui] disabled:", err);
      return fallback;
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

  function totalFromRaw(rawBricks, active) {
    if (!active) return 0;
    return clamp(5 + Math.max(0, Number(rawBricks) || 0), 0, 15);
  }

  function progressFromTotal(total) {
    return [
      clamp(total, 0, PARTS),
      clamp(total - PARTS, 0, PARTS),
      clamp(total - PARTS * 2, 0, PARTS),
    ];
  }

  function createCard(stage) {
    const card = make("section", "house-upgrade-card");
    card.dataset.stage = stage.id;
    card.dataset.progress = "0";
    card.setAttribute("aria-label", stage.label);

    const art = make("div", "house-upgrade-art");
    const mask = make("div", "house-upgrade-mask");
    art.style.setProperty("--house-image", `url("${stage.image}")`);

    for (let i = 0; i < PARTS; i += 1) {
      const part = make("span", "house-upgrade-part is-locked");
      part.style.setProperty("--part-pos", `${i * 25}%`);
      part.dataset.part = String(i + 1);
      mask.appendChild(part);
    }

    const count = make("div", "house-upgrade-count");
    count.textContent = "0/5";

    art.appendChild(mask);
    card.appendChild(art);
    card.appendChild(count);
    return card;
  }

  function applyProgress(progress) {
    if (!container) return;
    const cards = [...container.querySelectorAll(".house-upgrade-card")];
    cards.forEach((card, cardIndex) => {
      const value = clamp(progress[cardIndex] || 0, 0, PARTS);
      const previous = Number.parseInt(card.dataset.progress || "0", 10);
      card.dataset.progress = String(value);
      card.classList.toggle("is-complete", value >= PARTS);
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
        card.classList.remove("is-tick");
        void card.offsetWidth;
        card.classList.add("is-tick");
      }
    });
  }

  function setState(state = {}) {
    guard(() => {
      const active = state.active !== false && state.gametype !== "basegame";
      const total = Number.isFinite(state.visualTotal) ? clamp(state.visualTotal, 0, 15) : totalFromRaw(state.rawBricks, active);
      currentVisualTotal = total;
      if (container) container.classList.toggle("is-base-preview", !active);
      applyProgress(progressFromTotal(total));
    });
  }

  function targetForRaw(rawBricksAfter) {
    if (!container) return null;
    const total = totalFromRaw(rawBricksAfter, true);
    const stageIndex = total <= 10 ? 1 : 2;
    const local = stageIndex === 1 ? clamp(total - 5, 1, 5) : clamp(total - 10, 1, 5);
    const card = container.querySelectorAll(".house-upgrade-card")[stageIndex];
    if (!card) return null;
    return card.querySelector(`[data-part="${local}"]`) || card;
  }

  function pulseTarget(rawBricksAfter) {
    guard(() => {
      const target = targetForRaw(rawBricksAfter);
      if (!target) return;
      const card = target.closest(".house-upgrade-card") || target;
      target.classList.remove("is-target-hit");
      card.classList.remove("is-target-hit");
      void target.offsetWidth;
      target.classList.add("is-target-hit");
      card.classList.add("is-target-hit");
    });
  }

  function completeStrawIntro() {
    guard(() => {
      currentVisualTotal = Math.max(currentVisualTotal, 5);
      applyProgress(progressFromTotal(currentVisualTotal));
      const card = container && container.querySelector('[data-stage="straw"]');
      if (card) {
        card.classList.remove("is-complete-pop");
        void card.offsetWidth;
        card.classList.add("is-complete-pop");
      }
    });
  }

  function completeStage(level) {
    guard(() => {
      const clamped = clamp(Number(level) || 1, 1, 3);
      currentVisualTotal = Math.max(currentVisualTotal, clamped * PARTS);
      applyProgress(progressFromTotal(currentVisualTotal));
      const card = container && container.querySelectorAll(".house-upgrade-card")[clamped - 1];
      if (card) {
        card.classList.remove("is-complete-pop");
        void card.offsetWidth;
        card.classList.add("is-complete-pop");
      }
    });
  }

  function init() {
    container = document.getElementById("house-upgrade-meter");
    if (!container || !window.PIGGY_ASSETS) return;

    const I18N = window.PIGGY_I18N;
    const hn = (lvl, fb) => (I18N && I18N.houseName ? I18N.houseName(lvl) : fb);
    const stages = [
      { id: "straw", label: hn(1, "Straw House"), image: asset("straw") },
      { id: "stone", label: hn(2, "Wood House"), image: asset("stone") },
      { id: "fortress", label: hn(3, "Brick Fortress"), image: asset("fortress") },
    ];

    container.textContent = "";
    stages.forEach((stage) => container.appendChild(createCard(stage)));
    applyProgress([0, 0, 0]);

    window.PIGGY_HOUSE_UI = {
      setState,
      getBrickTarget: (rawBricksAfter) => guard(() => targetForRaw(rawBricksAfter), null),
      pulseTarget,
      completeStrawIntro,
      completeStage,
    };
  }

  window.PIGGY_HOUSE_UI = window.PIGGY_HOUSE_UI || {
    setState() {},
    getBrickTarget() { return null; },
    pulseTarget() {},
    completeStrawIntro() {},
    completeStage() {},
  };

  onReady(init);
})();
