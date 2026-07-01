/* Lightweight i18n layer for Bricked Up.
 *
 * Stake launches the game with a `lang` URL parameter (and may push a live
 * language change via postMessage -- see stake-adapter.js). This module owns the
 * active language, a EN (default) + DE dictionary, and the DOM plumbing:
 *   - [data-i18n]       -> element.textContent   (pure-text nodes only)
 *   - [data-i18n-html]  -> element.innerHTML      (may contain icon markup)
 *   - [data-i18n-attr]  -> "attr:key;attr2:key2"  (title, aria-label, ...)
 * Dynamic strings in game.js go through PIGGY_I18N.t(key, vars).
 *
 * English is the default/fallback for any language Stake sends that we do not
 * translate, so the language switch always resolves to a complete UI.
 */
(() => {
  "use strict";

  const DICT = {
    en: {
      // --- static HUD / chrome ---
      "hud.balance": "BALANCE",
      "hud.win": "WIN",
      "hud.bet": "BET",
      "hud.freespin": "FREE SPIN",
      "btn.turbo": "Turbo",
      "btn.menu": "Menu",
      "btn.autoplay": "Autoplay",
      "btn.buy": "Buy bonus",
      "btn.buyShort": "BUY",
      "label.turbo": "TURBO",
      "label.menu": "MENU",
      "label.auto": "AUTO",
      "label.buy": "BONUS",
      "a11y.houseProgress": "House upgrade progress",
      "a11y.betUp": "Increase bet",
      "a11y.betDown": "Decrease bet",
      "a11y.close": "Close",
      // --- menu popover ---
      "menu.title": "MENU",
      "menu.help": "How to play",
      "menu.paytable": "Paytable",
      "menu.sound": "Sound:",
      "meta.rtp": "RTP",
      "meta.max": "Max",
      "meta.vol": "Volatility",
      "meta.volHigh": "very high",
      // --- buy popover ---
      "buy.title": "Buy Bonus",
      "buy.aName": "Straw House Bonus",
      "buy.bName": "Wood House VIP",
      "buy.aInfo": "10 Free Spins · starts at the Straw House",
      "buy.bInfo": "10 Free Spins · 5-brick head start (Wood House)",
      "buy.cost": "Cost:",
      "buy.xbet": "× bet",
      "buy.total": "total",
      "buy.note": "Starts the House-Building Free Spins directly. Prices reflect the feature's exact expected value.",
      // --- how-to-play modal ---
      "help.title": "How to play",
      "help.li1": "<b>5x4 reels, 1024 ways.</b> Matching symbols on adjacent reels from the left pay.",
      "help.li2": "<b>Wolf cascades.</b> The wolf blows winning symbols away, new ones fall in.",
      "help.li3": "<b>Wolf multiplier.</b> Every cascade in a row raises the multiplier.",
      "help.li4": "<b>3x <span class=\"ui-ico\" data-ico=\"pot\"></span> Soup Pot</b> starts the House-Building Free Spins.",
      "help.li5": "<b>Level up your house.</b> Collect <span class=\"ui-ico\" data-ico=\"brick\"></span>: Straw → Wood → Brick Fortress.",
      "help.cta": "Let's go",
      "help.ctrlTitle": "Controls",
      "ctrl.spin": "<b>Spin</b> - start a spin (or press the Spacebar).",
      "ctrl.bet": "<b>Bet up / down</b> - raise or lower your stake.",
      "ctrl.turbo": "<b><span class=\"ui-ico\" data-ico=\"bolt\"></span> Turbo</b> - faster spins and cascades.",
      "ctrl.auto": "<b><span class=\"ui-ico\" data-ico=\"auto\"></span> Autoplay</b> - spins a batch of rounds automatically.",
      "ctrl.buy": "<b>Buy Bonus</b> - pay to start the House-Building Free Spins instantly (asks you to confirm first).",
      "ctrl.menu": "<b><span class=\"ui-ico\" data-ico=\"menu\"></span> Menu</b> - how to play, paytable and the sound toggle.",
      // --- buy confirmation ---
      "confirm.title": "Buy Bonus?",
      "confirm.realCost": "REAL COST",
      "confirm.confirm": "Confirm",
      "confirm.cancel": "Cancel",
      "confirm.betLine": "Bet {bet} × {mult}",
      // --- paytable modal ---
      "paytable.title": "Paytable",
      "paytable.sub": "(x bet, per winning way)",
      "paytable.note": "Wild <span class=\"ui-ico\" data-ico=\"wolf\"></span> substitutes every symbol except Scatter <span class=\"ui-ico\" data-ico=\"pot\"></span>. Scatter pays anywhere.",
      "paytable.close": "Close",
      "pay.wild": "Wild - substitutes all symbols",
      "pay.brick": "Brick - House Upgrade",
      // --- dynamic phase / state ---
      "phase.base": "BASE GAME",
      "phase.free": "FREE SPIN {n}/{t}",
      "sound.on": "on",
      "sound.off": "off",
      "word.pays": "pays",
      // --- toasts ---
      "toast.noBalance": "Not enough balance",
      "toast.notReady": "Connection not ready",
      "toast.replayUnavailable": "Replay not available",
      // --- free-spins intro / house cinematic ---
      "fs.build": "HOUSE BUILD",
      "fs.freespins": "FREE SPINS",
      "fs.collect": "{n} Free Spins &middot; Collect bricks on the reels",
      "cine.extraSpins": "+{n} FREE SPINS",
      "cine.complete": "HOUSE COMPLETE",
      // --- portrait ---
      "portrait.title": "Rotate to play",
      "portrait.body": "Turn your device sideways for the full Bricked Up experience.",
      // --- house names (by level) ---
      "house.1": "Straw House",
      "house.2": "Wood House",
      "house.3": "Brick Fortress",
      // --- symbol names (by id) ---
      "sym.W": "The Big Bad Wolf",
      "sym.S": "Boiling Soup Pot",
      "sym.P1": "Brick Piggy",
      "sym.P2": "Wood Piggy",
      "sym.P3": "Straw Piggy",
      "sym.M1": "Axe",
      "sym.M2": "Trowel",
      "sym.M3": "Pitchfork",
      "sym.A": "Ace",
      "sym.K": "King",
      "sym.Q": "Queen",
      "sym.J": "Jack",
      "sym.BR": "Brick",
    },
    de: {
      "hud.balance": "GUTHABEN",
      "hud.win": "GEWINN",
      "hud.bet": "EINSATZ",
      "hud.freespin": "FREISPIEL",
      "btn.turbo": "Turbo",
      "btn.menu": "Menü",
      "btn.autoplay": "Autoplay",
      "btn.buy": "Bonus kaufen",
      "btn.buyShort": "KAUFEN",
      "label.turbo": "TURBO",
      "label.menu": "MENÜ",
      "label.auto": "AUTO",
      "label.buy": "BONUS",
      "a11y.houseProgress": "Haus-Upgrade-Fortschritt",
      "a11y.betUp": "Einsatz erhöhen",
      "a11y.betDown": "Einsatz verringern",
      "a11y.close": "Schließen",
      "menu.title": "MENÜ",
      "menu.help": "So funktioniert's",
      "menu.paytable": "Auszahlungen",
      "menu.sound": "Ton:",
      "meta.rtp": "RTP",
      "meta.max": "Max",
      "meta.vol": "Volatilität",
      "meta.volHigh": "sehr hoch",
      "buy.title": "Bonus kaufen",
      "buy.aName": "Strohhaus-Bonus",
      "buy.bName": "Holzhaus-VIP",
      "buy.aInfo": "10 Freispiele · Start im Strohhaus",
      "buy.bInfo": "10 Freispiele · 5 Ziegel Vorsprung (Holzhaus)",
      "buy.cost": "Kosten:",
      "buy.xbet": "× Einsatz",
      "buy.total": "gesamt",
      "buy.note": "Startet direkt die Hausbau-Freispiele. Die Preise entsprechen dem exakten Erwartungswert des Features.",
      "help.title": "So funktioniert's",
      "help.li1": "<b>5x4 Walzen, 1024 Wege.</b> Gleiche Symbole auf benachbarten Walzen von links zahlen.",
      "help.li2": "<b>Wolf-Kaskaden.</b> Der Wolf pustet Gewinnsymbole weg, neue fallen nach.",
      "help.li3": "<b>Wolf-Multiplikator.</b> Jede Kaskade in Folge erhöht den Multiplikator.",
      "help.li4": "<b>3x <span class=\"ui-ico\" data-ico=\"pot\"></span> Suppentopf</b> startet die Hausbau-Freispiele.",
      "help.li5": "<b>Häuser aufleveln.</b> Sammle <span class=\"ui-ico\" data-ico=\"brick\"></span>: Stroh → Holz → Ziegel-Festung.",
      "help.cta": "Los geht's",
      "help.ctrlTitle": "Steuerung",
      "ctrl.spin": "<b>Spin</b> - startet einen Dreh (oder Leertaste).",
      "ctrl.bet": "<b>Einsatz hoch / runter</b> - Einsatz erhöhen oder verringern.",
      "ctrl.turbo": "<b><span class=\"ui-ico\" data-ico=\"bolt\"></span> Turbo</b> - schnellere Drehs und Kaskaden.",
      "ctrl.auto": "<b><span class=\"ui-ico\" data-ico=\"auto\"></span> Autoplay</b> - dreht automatisch mehrere Runden.",
      "ctrl.buy": "<b>Bonus kaufen</b> - startet die Hausbau-Freispiele sofort gegen Bezahlung (mit Bestätigung).",
      "ctrl.menu": "<b><span class=\"ui-ico\" data-ico=\"menu\"></span> Menü</b> - Anleitung, Auszahlungen und Ton.",
      "confirm.title": "Bonus kaufen?",
      "confirm.realCost": "ECHTE KOSTEN",
      "confirm.confirm": "Bestätigen",
      "confirm.cancel": "Abbrechen",
      "confirm.betLine": "Einsatz {bet} × {mult}",
      "paytable.title": "Auszahlungen",
      "paytable.sub": "(x Einsatz, pro Gewinnweg)",
      "paytable.note": "Wild <span class=\"ui-ico\" data-ico=\"wolf\"></span> ersetzt alle Symbole außer Scatter <span class=\"ui-ico\" data-ico=\"pot\"></span>. Scatter zahlt überall.",
      "paytable.close": "Schließen",
      "pay.wild": "Wild - ersetzt alle Symbole",
      "pay.brick": "Ziegel - Haus-Upgrade",
      "phase.base": "BASISSPIEL",
      "phase.free": "FREISPIEL {n}/{t}",
      "sound.on": "an",
      "sound.off": "aus",
      "word.pays": "zahlt",
      "toast.noBalance": "Nicht genug Guthaben",
      "toast.notReady": "Verbindung nicht bereit",
      "toast.replayUnavailable": "Replay nicht verfügbar",
      "fs.build": "HAUSBAU",
      "fs.freespins": "FREISPIELE",
      "fs.collect": "{n} Freispiele &middot; Sammle Ziegel auf den Walzen",
      "cine.extraSpins": "+{n} FREISPIELE",
      "cine.complete": "HAUS FERTIG",
      "portrait.title": "Zum Spielen drehen",
      "portrait.body": "Drehe dein Gerät quer für das volle Bricked-Up-Erlebnis.",
      "house.1": "Strohhaus",
      "house.2": "Holzhaus",
      "house.3": "Ziegel-Festung",
      "sym.W": "Der Große Böse Wolf",
      "sym.S": "Kochender Suppentopf",
      "sym.P1": "Ziegel-Schweinchen",
      "sym.P2": "Holz-Schweinchen",
      "sym.P3": "Stroh-Schweinchen",
      "sym.M1": "Axt",
      "sym.M2": "Kelle",
      "sym.M3": "Gabel",
      "sym.A": "Ass",
      "sym.K": "König",
      "sym.Q": "Dame",
      "sym.J": "Bube",
      "sym.BR": "Ziegelstein",
    },
  };

  const LOCALES = { en: "en-US", de: "de-DE" };

  function normLang(value) {
    const s = String(value || "").trim().toLowerCase();
    if (s.startsWith("de")) return "de";
    return "en"; // English is the default + fallback for everything else
  }

  function initialLang() {
    const p = new URLSearchParams(window.location.search || "");
    const raw = p.get("lang") || p.get("language") || p.get("locale");
    return normLang(raw || "en");
  }

  let lang = initialLang();
  const listeners = new Set();

  function t(key, vars) {
    const table = DICT[lang] || DICT.en;
    let s = table[key];
    if (s == null) s = DICT.en[key];
    if (s == null) return key;
    if (vars) for (const k in vars) s = s.split("{" + k + "}").join(String(vars[k]));
    return s;
  }

  function applyStatic(root) {
    const scope = root || document;
    scope.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.getAttribute("data-i18n")); });
    scope.querySelectorAll("[data-i18n-html]").forEach((el) => { el.innerHTML = t(el.getAttribute("data-i18n-html")); });
    scope.querySelectorAll("[data-i18n-attr]").forEach((el) => {
      el.getAttribute("data-i18n-attr").split(";").forEach((pair) => {
        const idx = pair.indexOf(":");
        if (idx < 0) return;
        const attr = pair.slice(0, idx).trim(), key = pair.slice(idx + 1).trim();
        if (attr && key) el.setAttribute(attr, t(key));
      });
    });
    try { document.documentElement.lang = lang; } catch (e) {}
  }

  function setLang(value) {
    const next = normLang(value);
    if (next === lang) return false;
    lang = next;
    applyStatic();
    listeners.forEach((fn) => { try { fn(lang); } catch (e) {} });
    return true;
  }

  window.PIGGY_I18N = {
    t,
    setLang,
    getLang: () => lang,
    normLang,
    locale: () => LOCALES[lang] || "en-US",
    applyStatic,
    symName: (id) => t("sym." + id),
    houseName: (level) => t("house." + Math.max(1, Math.min(3, Number(level) || 1))),
    onChange(fn) { if (typeof fn === "function") listeners.add(fn); },
  };

  // Scripts sit at the end of <body>, so the DOM is ready: translate immediately
  // (before game.js boots and paints icons) to avoid a first-paint flash.
  applyStatic();
})();
