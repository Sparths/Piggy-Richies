/* Defensive Stake/RGS bridge.
 * Standalone play stays local. When Stake Engine injects query params or
 * postMessage balance/replay events, this adapter keeps the UI in sync without
 * blocking the loader if an endpoint is unavailable.
 */
(() => {
  "use strict";

  const params = new URLSearchParams(window.location.search || "");
  const sessionID = params.get("sessionID") || params.get("sessionId") || params.get("session_id") || "";
  const rgsUrl = params.get("rgs_url") || params.get("rgsUrl") || params.get("rgs") || "";
  const lang = params.get("language") || params.get("lang") || navigator.language || "de-DE";
  const currency = params.get("currency") || params.get("token") || "";
  const active = !!(sessionID && rgsUrl);
  const SCALE = 1000000;

  let balance = numberParam("balance", null);
  let muted = false;
  let ready = null;
  let currentRound = null;
  let replayBook = parseReplayParam();
  const balanceListeners = new Set();
  const replayListeners = new Set();
  const resetListeners = new Set();

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
    return rgsUrl.replace(/\/+$/, "") + path;
  }

  function toUnits(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    return Math.abs(n) > 10000 ? n / SCALE : n;
  }

  function toStakeAmount(v) {
    return Math.max(0, Math.round((Number(v) || 0) * SCALE));
  }

  function setBalance(v, source = "stake") {
    const n = toUnits(v);
    if (n == null) return;
    balance = n;
    balanceListeners.forEach((fn) => safe(() => fn(balance, source)));
  }

  function normalizeBook(round) {
    if (!round) return null;
    if (Array.isArray(round.events)) return round;
    if (round.book && Array.isArray(round.book.events)) return round.book;
    if (round.result && Array.isArray(round.result.events)) return round.result;
    if (round.game && Array.isArray(round.game.events)) return round.game;
    if (typeof round === "string") {
      return safe(() => JSON.parse(round), null);
    }
    return null;
  }

  function parseReplayParam() {
    const raw = params.get("replay") || params.get("round") || params.get("state");
    if (!raw) return null;
    return safe(() => normalizeBook(JSON.parse(decodeURIComponent(raw))), null);
  }

  async function post(path, payload) {
    const res = await fetch(endpoint(path), {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload || {}),
    });
    if (!res.ok) throw new Error(path + " " + res.status);
    return res.json();
  }

  function bootStake() {
    if (!active) return Promise.resolve(null);
    if (ready) return ready;
    ready = post("/wallet/authenticate", { sessionID })
      .then((data) => {
        if (data && data.balance != null) setBalance(data.balance, "authenticate");
        replayBook = normalizeBook(data && (data.replay || data.round || data.lastRound || data.activeRound)) || replayBook;
        return data;
      })
      .catch((err) => {
        log("authenticate failed, continuing standalone-safe", err);
        return null;
      });
    return ready;
  }

  function emitParent(type, payload) {
    safe(() => {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type, payload, game: "piggy_richies" }, "*");
      }
    });
  }

  function messageType(data) {
    return String((data && (data.type || data.event || data.name || data.action)) || "").toLowerCase();
  }

  window.addEventListener("message", (ev) => safe(() => {
    const data = typeof ev.data === "string" ? safe(() => JSON.parse(ev.data), { type: ev.data }) : ev.data;
    const type = messageType(data);
    const payload = data && (data.payload || data.data || data);
    if (type.includes("balance") || payload && payload.balance != null) {
      setBalance(payload.balance, "message");
    }
    if (type.includes("replay") || type.includes("restore")) {
      const book = normalizeBook(payload && (payload.book || payload.round || payload));
      if (book) replayListeners.forEach((fn) => safe(() => fn(book)));
    }
    if (type.includes("reset") || type.includes("newsession")) {
      resetListeners.forEach((fn) => safe(fn));
    }
    if (type.includes("mute") || type.includes("sound")) {
      muted = payload && (payload.muted === true || payload.sound === false);
      if (window.PIGGY_AUDIO && typeof window.PIGGY_AUDIO.setMuted === "function") {
        window.PIGGY_AUDIO.setMuted(muted);
      }
    }
  }));

  window.PIGGY_STAKE = {
    active,
    currency,
    language: lang,
    init(defaultBalance) {
      if (balance == null) balance = Number(defaultBalance) || 0;
      bootStake();
      return balance;
    },
    getBalance() {
      return balance;
    },
    setBalance,
    onBalance(fn) {
      if (typeof fn === "function") balanceListeners.add(fn);
    },
    onReplay(fn) {
      if (typeof fn === "function") replayListeners.add(fn);
      if (replayBook && typeof fn === "function") setTimeout(() => safe(() => fn(replayBook)), 0);
    },
    onReset(fn) {
      if (typeof fn === "function") resetListeners.add(fn);
    },
    format(value) {
      const opts = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
      return safe(() => new Intl.NumberFormat(lang || "de-DE", opts).format(Number(value) || 0), (Number(value) || 0).toFixed(2));
    },
    async play({ amount, mode, bet }) {
      if (!active) return null;
      await bootStake();
      const payload = { sessionID, amount: toStakeAmount(amount), mode, bet: toStakeAmount(bet || 0), currency };
      const data = await post("/wallet/play", payload);
      if (data && data.balance != null) setBalance(data.balance, "play");
      currentRound = data && (data.round || data.game || data.result || data);
      emitParent("piggy:round-start", { mode, amount, round: currentRound });
      return { book: normalizeBook(currentRound), round: currentRound, raw: data };
    },
    async endRound({ win, state }) {
      if (!active) return null;
      const payload = { sessionID, amount: toStakeAmount(win || 0), win: toStakeAmount(win || 0), round: currentRound, state };
      const data = await post("/wallet/end-round", payload).catch((err) => {
        log("end-round failed", err);
        return null;
      });
      if (data && data.balance != null) setBalance(data.balance, "end-round");
      emitParent("piggy:round-end", { win, state, round: currentRound });
      currentRound = null;
      return data;
    },
    recordState(state) {
      emitParent("piggy:state", state);
    },
  };
})();
