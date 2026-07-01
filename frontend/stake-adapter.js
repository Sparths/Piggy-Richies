/* Stake Engine RGS bridge.
 * Production mode follows the public StakeEngine RGS/client contract:
 * - launch URL provides sessionID + rgs_url
 * - authenticate through /wallet/authenticate
 * - play through /wallet/play with base bet amount + mode
 * - end through /wallet/end-round with sessionID only
 *
 * Standalone/local preview is still possible, but when a real Stake session is
 * active the adapter never falls back to client demo math.
 */
(() => {
  "use strict";

  const params = new URLSearchParams(window.location.search || "");
  const sessionID = params.get("sessionID") || params.get("sessionId") || params.get("session_id") || "";
  const rawRgsUrl = params.get("rgs_url") || params.get("rgsUrl") || params.get("rgs") || "";
  // i18n.js reads the same launch `lang` param, so start from its resolved
  // language; applyLang() below keeps both in sync on any live change.
  let lang = (window.PIGGY_I18N && window.PIGGY_I18N.getLang()) || params.get("lang") || params.get("language") || "en";
  const device = params.get("device") || "desktop";
  let currency = params.get("currency") || params.get("token") || "";
  const hasInjectedStake = !!(window.StakeEngine || window.stakeEngine || window.Stake || window.stake);
  const rgsUrl = normalizeRgsUrl(rawRgsUrl);
  const active = !!((sessionID && rgsUrl) || hasInjectedStake);
  const SCALE = 1000000;

  let balance = numberParam("balance", null);
  let muted = false;
  let ready = null;
  let connectionReady = !active;
  let currentRound = null;
  let replayBook = parseReplayParam();
  let authConfig = null;
  let jurisdiction = null;
  let roundActive = false;
  const balanceListeners = new Set();
  const replayListeners = new Set();
  const resetListeners = new Set();
  const configListeners = new Set();

  function normalizeRgsUrl(value) {
    const clean = String(value || "").trim().replace(/\/+$/, "");
    if (!clean) return "";
    if (/^https?:\/\//i.test(clean)) return clean;
    return `https://${clean}`;
  }

  function numberParam(name, fallback) {
    const v = params.get(name);
    if (v == null || v === "") return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  function log(...args) {
    console.warn("[stake-adapter]", ...args);
  }

  function safe(fn, fallback = null) {
    try {
      return fn();
    } catch (err) {
      log(err);
      return fallback;
    }
  }

  function endpoint(path) {
    return rgsUrl + path;
  }

  function parseBalanceValue(value) {
    if (value == null) return null;
    if (typeof value === "object") {
      if (value.currency) currency = value.currency;
      if (value.amount != null) return Number(value.amount) / SCALE;
      return null;
    }
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    return Math.abs(n) > 10000 ? n / SCALE : n;
  }

  function toStakeAmount(v) {
    return Math.max(0, Math.round((Number(v) || 0) * SCALE));
  }

  function normalizeMode(mode) {
    const raw = String(mode || "base");
    const key = raw.toLowerCase().replace(/[\s-]+/g, "_");
    const mapped = { base: "BASE", basegame: "BASE", bonus: "BONUS", bonus_vip: "BONUS_VIP", bonusvip: "BONUS_VIP" }[key];
    return mapped || raw.toUpperCase().replace(/[\s-]+/g, "_");
  }

  function setBalance(v, source = "stake") {
    const n = parseBalanceValue(v);
    if (n == null) return;
    balance = n;
    balanceListeners.forEach((fn) => safe(() => fn(balance, source)));
  }

  function bookFromEvents(events, meta = {}) {
    return finalizeBook({ ...meta, events, payoutMultiplier: Number(meta.payoutMultiplier) || 0 });
  }

  const STAKE_MONEY_KEYS = new Set(["amount", "baseGameWins", "freeGameWins", "payoutMultiplier", "stepWin", "totalWin", "win"]);

  function looksLikeStakeMoneyBook(book) {
    return !!(book && Array.isArray(book.events) && (book.criteria != null || book.baseGameWins != null || book.freeGameWins != null));
  }

  function normalizeStakeMoney(key, value) {
    if (typeof value === "number" && STAKE_MONEY_KEYS.has(key)) return value / 100;
    if (Array.isArray(value)) return value.map((item) => normalizeStakeMoney("", item));
    if (value && typeof value === "object") {
      const out = {};
      Object.keys(value).forEach((k) => { out[k] = normalizeStakeMoney(k, value[k]); });
      return out;
    }
    return value;
  }

  function finalizeBook(book) {
    if (!book || book.__piggyMoneyNormalized) return book;
    // In a live RGS session every /play book is in Stake's x100 integer money
    // format, so always normalize it back to frontend units -- the round object
    // does not reliably expose criteria/baseGameWins/freeGameWins. Outside a
    // session (standalone/replay dev) only touch books that look RGS-shaped so
    // raw demo books are never halved.
    if (!active && !looksLikeStakeMoneyBook(book)) return book;
    const normalized = normalizeStakeMoney("", book);
    Object.defineProperty(normalized, "__piggyMoneyNormalized", { value: true });
    return normalized;
  }

  function normalizeBook(round) {
    if (!round) return null;
    if (Array.isArray(round)) return bookFromEvents(round);
    if (Array.isArray(round.events)) return finalizeBook(round);
    if (round.state) {
      if (Array.isArray(round.state)) return bookFromEvents(round.state, round);
      const stateBook = normalizeBook(round.state);
      if (stateBook) return finalizeBook({ ...round, ...stateBook, events: stateBook.events });
    }
    if (round.event) {
      const eventBook = normalizeBook(round.event);
      if (eventBook) return finalizeBook({ ...round, ...eventBook, events: eventBook.events });
    }
    if (round.book && Array.isArray(round.book.events)) return finalizeBook(round.book);
    if (round.result && Array.isArray(round.result.events)) return finalizeBook(round.result);
    if (round.game && Array.isArray(round.game.events)) return finalizeBook(round.game);
    if (round.round && Array.isArray(round.round.events)) return finalizeBook(round.round);
    if (round.data && Array.isArray(round.data.events)) return finalizeBook(round.data);
    if (typeof round === "string") return safe(() => normalizeBook(JSON.parse(round)), null);
    return null;
  }

  function parseReplayParam() {
    const raw = params.get("replay") || params.get("round") || params.get("state");
    if (!raw) return null;
    return safe(() => normalizeBook(JSON.parse(decodeURIComponent(raw))), null);
  }

  function stakeError(path, status, data) {
    const detail = typeof data === "string" ? data : (data && (data.code || data.error || data.message || JSON.stringify(data))) || "unknown";
    return new Error(`${path} ${status}: ${detail}`);
  }

  async function post(path, payload) {
    const res = await fetch(endpoint(path), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(payload || {}),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw stakeError(path, res.status, data);
    return data;
  }

  async function postFirst(paths, payload) {
    let lastError = null;
    for (const path of paths) {
      try {
        return await post(path, payload);
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError || new Error("Stake endpoint unavailable");
  }

  async function injectedCall(method, payload) {
    const candidates = [window.StakeEngine, window.stakeEngine, window.Stake, window.stake].filter(Boolean);
    const names = method === "authenticate" ? ["Authenticate", "authenticate"] : method === "play" ? ["Play", "play"] : method === "endRound" ? ["EndRound", "endRound"] : [method];
    for (const api of candidates) {
      for (const name of names) {
        const fn = api && (api[name] || api[`_${name}`]);
        if (typeof fn !== "function") continue;
        try {
          return await fn.call(api, payload);
        } catch (err) {
          log(`${name} hook failed`, err);
        }
      }
    }
    return null;
  }

  function readConfig(data) {
    const cfg = data && (data.config || data.authenticateConfig || data.authConfig);
    if (cfg) {
      authConfig = {
        minBet: cfg.minBet,
        maxBet: cfg.maxBet,
        stepBet: cfg.stepBet,
        defaultBetLevel: cfg.defaultBetLevel,
        betLevels: Array.isArray(cfg.betLevels) ? cfg.betLevels.slice() : [],
        jurisdiction: cfg.jurisdiction || cfg.jurisdictionFlags || null,
      };
      jurisdiction = authConfig.jurisdiction || jurisdiction;
      configListeners.forEach((fn) => safe(() => fn(authConfig)));
    }
  }

  function emitParent(type, payload) {
    safe(() => {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type, payload, game: "piggy_richies" }, "*");
      }
    });
  }

  function emitReady(state) {
    const payload = { ready: true, active, connectionReady, sessionID: !!sessionID, rgs: !!rgsUrl, currency, lang, device, config: authConfig, jurisdiction, state: state || null };
    ["piggy:ready", "game:ready", "stake:ready", "ready"].forEach((type) => emitParent(type, payload));
    safe(() => window.dispatchEvent(new CustomEvent("piggy:ready", { detail: payload })));
  }

  async function bootStake() {
    if (!active) return null;
    if (ready) return ready;
    ready = (async () => {
      const data = await injectedCall("authenticate", { sessionID, language: lang, lang, device }) || (rgsUrl ? await post("/wallet/authenticate", { sessionID, language: lang }) : null);
      connectionReady = !!data || hasInjectedStake;
      if (data) {
        readConfig(data);
        applyLang(data.language || data.locale || (data.config && (data.config.language || data.config.locale)));
        if (data.balance != null) setBalance(data.balance, "authenticate");
        replayBook = normalizeBook(data.round || data.replay || data.lastRound || data.activeRound) || replayBook;
        roundActive = !!(data.round && data.round.active);
      }
      return data;
    })().catch((err) => {
      connectionReady = false;
      log("authenticate failed", err);
      return null;
    });
    return ready;
  }

  function requireStakeConnection() {
    if (!active) return;
    if (!connectionReady) throw new Error("Stake RGS connection is not ready");
    if (!hasInjectedStake && (!sessionID || !rgsUrl)) throw new Error("Missing Stake sessionID or rgs_url");
  }

  function assertValidStakeBet(stakeAmount) {
    if (!authConfig) return;
    const { minBet, maxBet, stepBet, betLevels } = authConfig;
    if (Number.isFinite(Number(minBet)) && stakeAmount < Number(minBet)) throw new Error("Bet below Stake minBet");
    if (Number.isFinite(Number(maxBet)) && stakeAmount > Number(maxBet)) throw new Error("Bet above Stake maxBet");
    if (Number.isFinite(Number(stepBet)) && Number(stepBet) > 0 && stakeAmount % Number(stepBet) !== 0) throw new Error("Bet does not match Stake stepBet");
    if (Array.isArray(betLevels) && betLevels.length && !betLevels.map(Number).includes(stakeAmount)) throw new Error("Bet is not in Stake betLevels");
  }

  function messageType(data) {
    return String((data && (data.type || data.event || data.name || data.action)) || "").toLowerCase();
  }

  // Push a language to the i18n layer (Stake may change it live) and keep the
  // adapter's own `lang` -- used for authenticate + number formatting -- in sync.
  function applyLang(value) {
    if (!value) return;
    safe(() => {
      if (window.PIGGY_I18N && typeof window.PIGGY_I18N.setLang === "function") {
        window.PIGGY_I18N.setLang(value);
        lang = window.PIGGY_I18N.getLang();
      }
    });
  }

  window.addEventListener("message", (ev) => safe(() => {
    const data = typeof ev.data === "string" ? safe(() => JSON.parse(ev.data), { type: ev.data }) : ev.data;
    const type = messageType(data);
    const payload = data && (data.payload || data.data || data);
    if (type.includes("balance") || payload && payload.balance != null) setBalance(payload.balance, "message");
    if (type.includes("replay") || type.includes("restore")) {
      const book = normalizeBook(payload && (payload.book || payload.round || payload));
      if (book) replayListeners.forEach((fn) => safe(() => fn(book)));
    }
    if (type.includes("reset") || type.includes("newsession")) resetListeners.forEach((fn) => safe(fn));
    const langValue = payload && (payload.language || payload.lang || payload.locale);
    if (type.includes("lang") || type.includes("locale")) applyLang(langValue || (typeof payload === "string" ? payload : data && data.value));
    else if (langValue && (type.includes("config") || type.includes("setting") || type.includes("update"))) applyLang(langValue);
    if (type.includes("mute") || type.includes("sound")) {
      muted = payload && (payload.muted === true || payload.sound === false);
      if (window.PIGGY_AUDIO && typeof window.PIGGY_AUDIO.setMuted === "function") window.PIGGY_AUDIO.setMuted(muted);
    }
  }));

  window.PIGGY_STAKE = {
    active,
    currency,
    language: lang,
    device,
    init(defaultBalance) {
      if (balance == null) balance = Number(defaultBalance) || 0;
      bootStake().then(() => emitReady());
      return balance;
    },
    getBalance() { return balance; },
    // Base bet from the launch/replay URL (`amount`), in frontend units. Stake
    // sends replay `amount` in x1e6 minor units; scale it back like the balance.
    getBetAmount() {
      const raw = params.get("amount") || params.get("betAmount") || params.get("bet");
      if (raw == null || raw === "") return null;
      const n = Number(raw);
      if (!Number.isFinite(n) || n <= 0) return null;
      return Math.abs(n) > 10000 ? n / SCALE : n;
    },
    getConfig() { return authConfig; },
    getBetLevels() { return authConfig && Array.isArray(authConfig.betLevels) ? authConfig.betLevels.map((v) => Number(v) / SCALE) : null; },
    setBalance,
    onBalance(fn) { if (typeof fn === "function") balanceListeners.add(fn); },
    onConfig(fn) {
      if (typeof fn === "function") configListeners.add(fn);
      if (authConfig && typeof fn === "function") setTimeout(() => safe(() => fn(authConfig)), 0);
    },
    onReplay(fn) {
      if (typeof fn === "function") replayListeners.add(fn);
      if (replayBook && typeof fn === "function") setTimeout(() => safe(() => fn(replayBook)), 0);
    },
    onReset(fn) { if (typeof fn === "function") resetListeners.add(fn); },
    format(value) {
      const opts = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
      const loc = (window.PIGGY_I18N && window.PIGGY_I18N.locale()) || lang || "en-US";
      return safe(() => new Intl.NumberFormat(loc, opts).format(Number(value) || 0), (Number(value) || 0).toFixed(2));
    },
    async play({ amount, mode, bet }) {
      if (!active) return null;
      await bootStake();
      requireStakeConnection();
      if (roundActive) await this.endRound({ quiet: true, reason: "pre-play-cleanup" });
      const baseBet = Number(bet || amount || 0);
      const stakeAmount = toStakeAmount(baseBet);
      assertValidStakeBet(stakeAmount);
      const stakeMode = normalizeMode(mode);
      let payload = { sessionID, mode: stakeMode, amount: stakeAmount };
      let data;
      try {
        data = await injectedCall("play", payload) || await post("/wallet/play", payload);
      } catch (err) {
        const rawMode = String(mode || "base");
        if (!/ERR_VAL|400/.test(String(err && (err.message || err))) || rawMode === stakeMode) throw err;
        payload = { sessionID, mode: rawMode, amount: stakeAmount };
        data = await injectedCall("play", payload) || await post("/wallet/play", payload);
      }
      connectionReady = true;
      if (data && data.balance != null) setBalance(data.balance, "play");
      currentRound = data && (data.round || data.game || data.result || data);
      const book = normalizeBook(currentRound);
      if (!book) {
        log("play response without event book", data);
        throw new Error("Stake play response did not include a playable event book");
      }
      roundActive = !!(currentRound && currentRound.active);
      emitParent("piggy:round-start", { mode: payload.mode, amount: stakeAmount, round: currentRound });
      return { book, round: currentRound, raw: data };
    },
    async endRound(context = {}) {
      if (!active) return null;
      await bootStake();
      requireStakeConnection();
      const payload = { sessionID };
      let data = null;
      try {
        data = await injectedCall("endRound", payload) || await postFirst(["/wallet/end-round", "/end-round"], payload);
      } catch (err) {
        if (!context.quiet) log("end-round failed, finishing visual round locally", err);
        emitParent("piggy:round-end", { round: currentRound, localFallback: true, reason: context.reason || "end-round-failed" });
        currentRound = null;
        roundActive = false;
        return { localFallback: true, error: String(err && (err.message || err)) };
      }
      if (data && data.balance != null) setBalance(data.balance, "end-round");
      emitParent("piggy:round-end", { round: currentRound });
      currentRound = null;
      roundActive = false;
      return data;
    },
    ready: emitReady,
    isLocalFallback() { return false; },
    recordState(state) { emitParent("piggy:state", state); },
  };
})();
