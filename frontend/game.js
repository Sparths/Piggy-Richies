/* Stake's Huff & Puff: Piggy Richies -- front-end event player.
 *
 * Stake Web SDK model: NO game maths on the client. Each spin pulls a
 * predetermined "book" (here from the math-engine sample set, weighted by the
 * lookup table) and animates its event stream, with clear phase labels, sound
 * and count-up so it's obvious what is happening. */
(() => {
  "use strict";

  const CFG = window.PIGGY_CONFIG || fallbackConfig();
  const BOOKS = window.PIGGY_BOOKS || { base: [], bonus: [], bonus_vip: [] };
  const ART = window.PIGGY_ART, SND = window.PIGGY_AUDIO;
  const SYM = {}; CFG.symbols.forEach((s) => (SYM[s.id] = s));
  const REELS = CFG.numReels, ROWS = CFG.numRows;

  const $ = (id) => document.getElementById(id);
  const boardEl = $("board"), wolfEl = $("wolf"), overlay = $("overlay"), glow = $("board-glow");
  const phaseEl = $("phase"), msg = $("message"), winEl = $("win-amount");
  const multBadge = $("mult-badge"), ladderEl = $("mult-ladder");
  const balanceEl = $("balance"), betEl = $("bet"), spinBtn = $("spin");
  const housePanel = $("house-panel"), houseName = $("house-name"), houseEmoji = $("house-emoji");
  const brickFill = $("brick-fill"), brickLabel = $("brick-label"), fsCount = $("fs-count");
  const toastEl = $("toast"), fsFlash = $("fs-flash");

  const BETS = [0.1, 0.2, 0.5, 1, 2, 5, 10, 25, 50, 100];
  let betIdx = 3, balance = 1000, busy = false, muted = false;
  let cells = [], curBoard = [], dispWin = 0, bricksTarget = 5, curGametype = "basegame", houseLabel = "Stroh-Haus", fsNow = 0, fsTot = 0;

  const buyA = (CFG.betModes.find((m) => m.name === "bonus") || {}).cost || 79;
  const buyB = (CFG.betModes.find((m) => m.name === "bonus_vip") || {}).cost || 221;
  const bet = () => BETS[betIdx];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const fmt = (n) => n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ---- art ----------------------------------------------------------------
  function symInner(id) {
    return ART.hasImage(id) ? `<img src="${ART.imageUrl(id)}" alt="${id}">` : ART.svg(id);
  }
  function buildBoard() {
    boardEl.innerHTML = ""; cells = [];
    for (let row = 0; row < ROWS; row++) for (let col = 0; col < REELS; col++) {
      const c = document.createElement("div");
      c.className = "cell"; c.innerHTML = '<span class="sym"></span>';
      boardEl.appendChild(c); cells.push(c);
    }
  }
  const cellAt = (col, row) => cells[row * REELS + col];
  function paint(col, row, id, drop) {
    const c = cellAt(col, row), s = SYM[id] || { kind: "low" };
    c.dataset.kind = s.kind;
    c.classList.remove("win", "explode", "dim", "sticky");
    c.querySelectorAll(".wmult,.brick-pop").forEach((e) => e.remove());
    c.querySelector(".sym").innerHTML = symInner(id);
    if (drop) { c.classList.remove("drop"); void c.offsetWidth; c.classList.add("drop"); }
  }
  function setBoard(b, drop = true) {
    for (let col = 0; col < REELS; col++) for (let row = 0; row < ROWS; row++) {
      const changed = !curBoard[col] || curBoard[col][row] !== b[col][row];
      paint(col, row, b[col][row], drop && changed);
    }
    curBoard = b.map((c) => c.slice());
  }

  // ---- HUD ----------------------------------------------------------------
  function setPhase(extra) {
    if (curGametype === "freegame")
      phaseEl.textContent = extra || `FREISPIEL ${fsNow}/${fsTot} · ${houseLabel.toUpperCase()}`;
    else phaseEl.textContent = extra || "BASISSPIEL";
    phaseEl.classList.toggle("bonus", curGametype === "freegame");
  }
  function ladderFor() { return curGametype === "freegame" ? CFG.features.freeMultLadder : CFG.features.baseMultLadder; }
  function buildLadder() {
    const lad = ladderFor();
    ladderEl.innerHTML = lad.map((v) => `<div class="mult-rung" data-v="${v}">×${v}</div>`).join("");
  }
  function setMult(m) {
    multBadge.textContent = "×" + m;
    multBadge.classList.remove("bump"); void multBadge.offsetWidth; multBadge.classList.add("bump");
    [...ladderEl.children].forEach((r) => r.classList.toggle("active", +r.dataset.v <= m));
  }
  function setMessage(t) { msg.innerHTML = t; }
  function burst(text, cls = "") { const b = document.createElement("div"); b.className = "burst " + cls; b.textContent = text; overlay.appendChild(b); setTimeout(() => b.remove(), 1000); }
  let toastT;
  function toast(text, bonus = false) {
    toastEl.innerHTML = text; toastEl.className = "toast show" + (bonus ? " bonus" : "");
    clearTimeout(toastT); toastT = setTimeout(() => (toastEl.className = "toast hidden"), 1600);
  }
  function countWin(toMult) {
    const from = dispWin * bet(), to = toMult * bet(), t0 = performance.now(), dur = 420;
    dispWin = toMult;
    function step(t) { const k = Math.min(1, (t - t0) / dur); winEl.textContent = fmt(from + (to - from) * k); if (k < 1) requestAnimationFrame(step); }
    requestAnimationFrame(step);
    winEl.classList.remove("big"); void winEl.offsetWidth; if (toMult > 0) winEl.classList.add("big");
  }

  // ---- event player -------------------------------------------------------
  async function play(book, mode) {
    let roundWin = 0; dispWin = 0; winEl.textContent = "0.00";
    curGametype = mode === "base" ? "basegame" : "freegame";
    buildLadder(); setMult(1); setPhase();

    for (const ev of book.events) {
      switch (ev.type) {
        case "reveal":
          curGametype = ev.gametype; buildLadder(); setBoard(ev.board);
          glow.className = "board-glow" + (ev.gametype === "freegame" ? " bonus" : "");
          setPhase(); SND.spin(); await sleep(300); break;

        case "updateGlobalMult":
          setMult(ev.globalMult);
          if (ev.globalMult > 1) setPhase(curGametype === "freegame" ? `FREISPIEL ${fsNow}/${fsTot} · KASKADE ×${ev.globalMult}` : `KASKADE ×${ev.globalMult}`);
          break;

        case "wildLand":
          ev.wilds.forEach((w) => { if (w.multiplier > 1) { const c = cellAt(w.position[0], w.position[1]); const t = document.createElement("span"); t.className = "wmult"; t.textContent = "×" + w.multiplier; c.appendChild(t); c.classList.add("sticky"); } });
          break;

        case "winInfo": {
          const pos = []; ev.wins.forEach((w) => w.positions.forEach((p) => pos.push(p)));
          const keyset = new Set(pos.map((p) => p[0] + "," + p[1]));
          cells.forEach((c, i) => { const col = i % REELS, row = (i / REELS) | 0; c.classList.toggle("win", keyset.has(col + "," + row)); c.classList.toggle("dim", !keyset.has(col + "," + row)); });
          roundWin += ev.stepWin; countWin(roundWin); glow.classList.add("active");
          SND.win(Math.max(0, (ladderFor().indexOf(ev.multiplier))));
          await sleep(620); glow.classList.remove("active");
          cells.forEach((c) => c.classList.remove("dim")); break;
        }

        case "tumbleBoard":
          wolfEl.classList.add("blow"); SND.puff();
          ev.explodePositions.forEach(([col, row]) => cellAt(col, row).classList.add("explode"));
          await sleep(480); wolfEl.classList.remove("blow"); break;

        case "dropBoard": setBoard(ev.board); SND.drop(); await sleep(300); break;

        case "scatterPay":
          burst("🍲 SCATTER"); toast(`${ev.scatters}× 🍲 zahlt ${fmt(ev.amount * bet())}`, true);
          roundWin += 0; await sleep(550); break;

        case "freeSpinTrigger":
          if (curGametype === "freegame") { toast(`RETRIGGER · +${ev.spinsAwarded} 🍲`, true); SND.trigger(); await sleep(800); }
          break;

        case "enterFreeGame":
          await freeIntro(ev); housePanel.classList.remove("hidden");
          curGametype = "freegame"; houseLabel = ev.house; fsTot = ev.totalSpins; fsNow = 0;
          setHouse(1, ev.house, 0); fsCount.textContent = `0 / ${ev.totalSpins}`; buildLadder(); setPhase(); break;

        case "updateFreeSpin": fsNow = ev.current; fsTot = ev.total; fsCount.textContent = `${ev.current} / ${ev.total}`; setPhase(); break;

        case "collectBrick": {
          const c = cellAt(ev.position[0], ev.position[1]); const p = document.createElement("span"); p.className = "brick-pop"; p.textContent = "🧱"; c.appendChild(p);
          updateBricks(ev.bricks); SND.brick(); await sleep(220); break;
        }

        case "houseUpgrade":
          setHouse(ev.level, ev.house, ev.bricks); glow.className = "board-glow bonus";
          burst("🏠 " + ev.house.toUpperCase()); toast(`HAUS-UPGRADE: ${ev.house} · +${ev.extraSpins} Freispiele`, true);
          SND.upgrade(); buildLadder(); await sleep(1250); break;

        case "exitFreeGame":
          housePanel.classList.add("hidden"); glow.className = "board-glow"; curGametype = "basegame";
          if (ev.totalWin > 0) { burst("🐷 " + fmt(ev.totalWin * bet())); await sleep(900); } break;

        case "setTotalWin": roundWin = ev.amount; countWin(roundWin); break;

        case "finalWin": await settle(ev); break;
      }
    }
    return roundWin;
  }

  // ---- free-spin flourishes ----------------------------------------------
  function setHouse(level, name, bricks) {
    houseLabel = name;
    houseEmoji.textContent = { 1: "🌾", 2: "🪵", 3: "🏰" }[level] || "🏠";
    const levels = CFG.features.houseLevels, next = levels.find((l) => l.level === level + 1);
    bricksTarget = next ? next.bricks : levels[levels.length - 1].bricks;
    updateBricks(bricks);
  }
  function updateBricks(b) { brickFill.style.width = Math.min(100, (b / bricksTarget) * 100) + "%"; brickLabel.textContent = `🧱 ${b} / ${bricksTarget}`; }
  async function freeIntro(ev) {
    fsFlash.innerHTML = `<div class="big">🍲🐺</div><h1>HOUSE&nbsp;UPGRADE<br>FREE&nbsp;SPINS</h1><p>${ev.totalSpins} Freispiele · sammle 🧱 auf Walze 5</p>`;
    fsFlash.className = "fs-flash"; SND.trigger(); await sleep(1900); fsFlash.className = "fs-flash hidden";
  }

  async function settle(ev) {
    balance += ev.amount * bet(); balanceEl.textContent = fmt(balance); countWin(ev.amount);
    if (ev.wincapReached) { burst("MAX WIN! 15.000×"); toast("🐺 MAX WIN — die Festung fällt!", true); SND.bigwin(); }
    else if (ev.amount >= 100) { burst("MEGA WIN " + Math.round(ev.amount) + "×"); toast("MEGA WIN! " + fmt(ev.amount * bet()), true); SND.bigwin(); }
    else if (ev.amount >= 20) { burst("BIG WIN"); SND.bigwin(); setMessage("Großer Gewinn — " + fmt(ev.amount * bet()) + "!"); }
    else if (ev.amount > 0) setMessage("Gewonnen: <b>" + fmt(ev.amount * bet()) + "</b>");
    else setMessage("Kein Gewinn — nochmal pusten! 🐺");
    await sleep(ev.amount > 0 ? 550 : 120);
    setPhase();
  }

  // ---- weighted book pick -------------------------------------------------
  function pickBook(mode) {
    const list = BOOKS[mode] || []; if (!list.length) return demoBook();
    let total = 0; for (const b of list) total += b.weight || 1;
    let r = Math.random() * total; for (const b of list) { r -= b.weight || 1; if (r <= 0) return b; }
    return list[list.length - 1];
  }

  // ---- spin flow ----------------------------------------------------------
  async function doSpin(mode) {
    if (busy) return; SND.unlock();
    const cost = (mode === "base" ? 1 : mode === "bonus" ? buyA : buyB) * bet();
    if (balance < cost) { toast("Nicht genug Guthaben"); setMessage("Nicht genug Guthaben für diesen Einsatz."); return; }
    busy = true; spinBtn.disabled = true; spinBtn.classList.add("spinning"); ctlEnable(false);
    balance -= cost; balanceEl.textContent = fmt(balance);
    overlay.innerHTML = ""; setMult(1);
    setMessage(mode === "base" ? "Der Wolf holt Luft… 🌬️" : "Bonus gekauft — auf in die Häuser!");
    const book = pickBook(mode);
    if (book.serverSeedHash) $("seed-hash").textContent = book.serverSeedHash.slice(0, 22) + "…";
    await play(book, mode);
    busy = false; spinBtn.disabled = false; spinBtn.classList.remove("spinning"); ctlEnable(true);
  }
  function ctlEnable(on) { ["bet-up", "bet-down", "buy-a", "buy-b"].forEach((id) => ($(id).disabled = !on)); }

  // ---- paytable -----------------------------------------------------------
  function buildPaytable() {
    const order = ["W", "S", "P1", "P2", "P3", "M1", "M2", "M3", "A", "K", "Q", "J", "BR"];
    const grid = $("paytable-grid"); grid.innerHTML = "";
    order.forEach((id) => {
      const s = SYM[id]; if (!s) return;
      let pay = "";
      if (CFG.paytable[id]) { const t = CFG.paytable[id]; pay = `5× <b>${t[5]}</b> · 4× ${t[4]} · 3× ${t[3]}`; }
      else if (s.scatter) { const sp = CFG.scatterPays; pay = `5× <b>${sp[5]}</b> · 4× ${sp[4]} · 3× ${sp[3]}`; }
      else if (s.wild) pay = "<small>Wild — ersetzt alle Symbole</small>";
      else if (s.collectible) pay = "<small>Ziegel — Haus-Upgrade</small>";
      grid.insertAdjacentHTML("beforeend",
        `<div class="pt-row"><div class="pt-ico">${symInner(id)}</div><div class="pt-vals"><span class="pt-name">${s.name || id}</span><span class="pt-pay">${pay}</span></div></div>`);
    });
  }

  // ---- modals & buttons ---------------------------------------------------
  function openModal(id) { $(id).classList.remove("hidden"); }
  function wireModals() {
    document.querySelectorAll("[data-close]").forEach((b) => (b.onclick = () => b.closest(".modal").classList.add("hidden")));
    document.querySelectorAll(".modal").forEach((m) => (m.onclick = (e) => { if (e.target === m) m.classList.add("hidden"); }));
    $("btn-help").onclick = () => openModal("modal-help");
    $("btn-paytable").onclick = () => openModal("modal-paytable");
    $("btn-sound").onclick = () => { muted = SND.toggle(); $("btn-sound").textContent = muted ? "🔇" : "🔊"; $("btn-sound").classList.toggle("off", muted); };
  }
  function refreshBet() { betEl.textContent = fmt(bet()); $("buy-a-cost").textContent = buyA + "×"; $("buy-b-cost").textContent = buyB + "×"; }
  function wire() {
    spinBtn.onclick = () => doSpin("base");
    $("bet-up").onclick = () => { betIdx = Math.min(BETS.length - 1, betIdx + 1); refreshBet(); };
    $("bet-down").onclick = () => { betIdx = Math.max(0, betIdx - 1); refreshBet(); };
    $("buy-a").onclick = () => doSpin("bonus");
    $("buy-b").onclick = () => doSpin("bonus_vip");
    document.addEventListener("keydown", (e) => { if (e.code === "Space" && !busy) { e.preventDefault(); doSpin("base"); } });
  }

  // ---- boot ---------------------------------------------------------------
  function boot() {
    $("meta-rtp").textContent = (CFG.rtp * 100).toFixed(2) + "%";
    $("meta-max").textContent = CFG.wincap.toLocaleString("de-DE") + "×";
    $("brand-mark").innerHTML = ART.svg("W");
    buildBoard(); buildLadder(); setMult(1); setBoard(randomBoard(), false);
    balanceEl.textContent = fmt(balance); refreshBet(); buildPaytable(); wire(); wireModals();
    if (!localStorage.getItem("piggy_seen")) { openModal("modal-help"); localStorage.setItem("piggy_seen", "1"); }
    if (!window.PIGGY_BOOKS) setMessage("Demo-Modus: führe <b>python run.py build</b> aus, um echte Runden zu laden.");
    loadGeneratedAssets();
  }
  // Generated art is opt-in via assets/manifest.js -> no 404s when absent.
  function loadGeneratedAssets() {
    const A = window.PIGGY_ASSETS || {};
    if (A.symbols && Object.keys(A.symbols).length)
      ART.loadImages(A.symbols, () => { setBoard(curBoard, false); buildPaytable(); });
    if (A.background) { const im = new Image(); im.onload = () => { const bg = $("bg"); bg.style.backgroundImage = `url(${A.background})`; bg.querySelectorAll(".bg-stars,.bg-moon,.bg-hills").forEach((e) => (e.style.display = "none")); }; im.src = A.background; }
    if (A.logo) { const im = new Image(); im.onload = () => { $("brand-mark").innerHTML = `<img src="${A.logo}" alt="logo">`; }; im.src = A.logo; }
  }

  // ---- fallbacks ----------------------------------------------------------
  function randomBoard() {
    const reels = CFG.reels && CFG.reels.BR0;
    const pool = CFG.symbols.filter((s) => !s.scatter && !s.collectible && !s.wild).map((s) => s.id);
    const b = [];
    for (let col = 0; col < REELS; col++) { b.push([]); for (let row = 0; row < ROWS; row++) b[col].push(reels ? reels[col][(Math.random() * reels[col].length) | 0] : pool[(Math.random() * pool.length) | 0]); }
    return b;
  }
  function demoBook() { return { payoutMultiplier: 0, events: [{ type: "reveal", gametype: "basegame", board: randomBoard() }, { type: "setTotalWin", amount: 0 }, { type: "finalWin", amount: 0, wincapReached: false }] }; }
  function fallbackConfig() {
    return { gameName: "Piggy Richies", rtp: 0.9655, wincap: 15000, numReels: 5, numRows: 4, reels: null,
      paytable: {}, scatterPays: {},
      symbols: [{ id: "W", kind: "wild", wild: true, name: "Wolf" }, { id: "S", kind: "scatter", scatter: true, name: "Topf" },
        { id: "P1", kind: "premium", name: "Ziegel-Schwein" }, { id: "P2", kind: "premium", name: "Holz-Schwein" }, { id: "P3", kind: "premium", name: "Stroh-Schwein" },
        { id: "M1", kind: "mid", name: "Axt" }, { id: "M2", kind: "mid", name: "Kelle" }, { id: "M3", kind: "mid", name: "Gabel" },
        { id: "A", kind: "low", name: "Ass" }, { id: "K", kind: "low", name: "König" }, { id: "Q", kind: "low", name: "Dame" }, { id: "J", kind: "low", name: "Bube" },
        { id: "BR", kind: "collect", collectible: true, name: "Ziegel" }],
      betModes: [{ name: "bonus", cost: 79 }, { name: "bonus_vip", cost: 221 }],
      features: { baseMultLadder: [1, 2, 3, 5], freeMultLadder: [1, 2, 3, 5, 8], houseLevels: [{ level: 1, bricks: 0 }, { level: 2, bricks: 5 }, { level: 3, bricks: 10 }] } };
  }

  boot();
})();
