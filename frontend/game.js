/* Stake's Huff & Puff: Piggy Richies -- front-end event player.
 *
 * Faithful to the Stake Web SDK model: the front-end contains NO game maths.
 * On every spin it pulls a predetermined round (a "book") -- here selected from
 * the sample set emitted by the math engine, weighted by the lookup table -- and
 * animates its event stream (reveal -> winInfo -> tumbleBoard -> dropBoard ...).
 * The RGS would supply the book in production; the proof seed travels with it.
 */
(() => {
  "use strict";

  // ---- config + books (emitted by `python run.py build`) -------------------
  const CFG = window.PIGGY_CONFIG || fallbackConfig();
  const BOOKS = window.PIGGY_BOOKS || { base: [], bonus: [], bonus_vip: [] };

  const SYM = {};
  CFG.symbols.forEach((s) => (SYM[s.id] = s));
  const REELS = CFG.numReels, ROWS = CFG.numRows;

  // ---- DOM -----------------------------------------------------------------
  const $ = (id) => document.getElementById(id);
  const boardEl = $("board"), wolfEl = $("wolf"), overlay = $("overlay");
  const glow = $("board-glow"), msg = $("message");
  const balanceEl = $("balance"), betEl = $("bet"), winEl = $("win-amount");
  const multEl = $("mult-value"), spinBtn = $("spin");
  const housePanel = $("house-panel"), houseName = $("house-name"), houseIcon = $("house-icon");
  const brickFill = $("brick-fill"), brickLabel = $("brick-label"), fsCount = $("fs-count");

  // ---- state ---------------------------------------------------------------
  const BETS = [0.1, 0.2, 0.5, 1, 2, 5, 10, 25, 50, 100];
  let betIdx = 3, balance = 1000, busy = false;
  let cells = [];           // DOM cells, indexed row*REELS+col
  let curBoard = [];        // current symbols [reel][row]
  let bricksTarget = 5;

  const buyA = (CFG.betModes.find((m) => m.name === "bonus") || {}).cost || 100;
  const buyB = (CFG.betModes.find((m) => m.name === "bonus_vip") || {}).cost || 300;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const fmt = (n) => n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ---- board rendering -----------------------------------------------------
  function buildBoard() {
    boardEl.innerHTML = "";
    cells = [];
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < REELS; col++) {
        const c = document.createElement("div");
        c.className = "cell";
        c.innerHTML = '<span class="glyph"></span>';
        boardEl.appendChild(c);
        cells.push(c);
      }
    }
  }
  const cellAt = (col, row) => cells[row * REELS + col];

  function paintCell(col, row, symId, { drop = false } = {}) {
    const c = cellAt(col, row), s = SYM[symId] || { emoji: "?", kind: "low" };
    c.dataset.kind = s.kind;
    c.classList.toggle("card", s.kind === "low");
    c.classList.remove("win", "explode");
    const glyph = c.querySelector(".glyph");
    glyph.textContent = s.emoji;
    c.querySelectorAll(".wmult,.brickpop").forEach((e) => e.remove());
    if (drop) {
      c.classList.remove("drop"); void c.offsetWidth; c.classList.add("drop");
    }
  }

  function setBoard(board, { drop = true } = {}) {
    for (let col = 0; col < REELS; col++)
      for (let row = 0; row < ROWS; row++) {
        const sym = board[col][row];
        const changed = !curBoard[col] || curBoard[col][row] !== sym;
        paintCell(col, row, sym, { drop: drop && changed });
      }
    curBoard = board.map((c) => c.slice());
  }

  // ---- HUD -----------------------------------------------------------------
  function setMult(m) {
    multEl.textContent = "×" + m;
    multEl.classList.add("bump");
    setTimeout(() => multEl.classList.remove("bump"), 220);
  }
  function setWin(v) { winEl.textContent = fmt(v * curBet()); }
  function curBet() { return BETS[betIdx]; }
  function setMessage(t) { msg.textContent = t; }
  function burst(text, cls = "") {
    const b = document.createElement("div");
    b.className = "burst " + cls; b.textContent = text;
    overlay.appendChild(b);
    setTimeout(() => b.remove(), 900);
  }

  // ---- event player --------------------------------------------------------
  async function play(book, gametype) {
    let roundWin = 0;
    for (const ev of book.events) {
      switch (ev.type) {
        case "reveal":
          setBoard(ev.board);
          glow.className = "board-glow" + (ev.gametype === "freegame" ? " bonus" : "");
          await sleep(260);
          break;

        case "updateGlobalMult":
          setMult(ev.globalMult);
          break;

        case "wildLand":
          ev.wilds.forEach((w) => {
            if (w.multiplier > 1) {
              const c = cellAt(w.position[0], w.position[1]);
              const tag = document.createElement("span");
              tag.className = "wmult"; tag.textContent = "×" + w.multiplier;
              c.appendChild(tag);
            }
          });
          break;

        case "winInfo": {
          const pos = [];
          ev.wins.forEach((w) => w.positions.forEach((p) => pos.push(p)));
          pos.forEach(([col, row]) => cellAt(col, row).classList.add("win"));
          roundWin += ev.stepWin;
          setWin(roundWin);
          glow.classList.add("active");
          await sleep(520);
          glow.classList.remove("active");
          break;
        }

        case "tumbleBoard":
          wolfEl.classList.add("blow");
          ev.explodePositions.forEach(([col, row]) => cellAt(col, row).classList.add("explode"));
          await sleep(430);
          wolfEl.classList.remove("blow");
          break;

        case "dropBoard":
          setBoard(ev.board);
          await sleep(280);
          break;

        case "scatterPay":
          burst("🍲 ×" + ev.scatters, "");
          setMessage("Suppentopf-Scatter zahlt " + fmt(ev.amount * curBet()));
          await sleep(500);
          break;

        case "freeSpinTrigger":
          if (gametype === "freegame") {
            burst("+" + ev.spinsAwarded + " 🍲");
            setMessage("Retrigger! +" + ev.spinsAwarded + " Freispiele");
            await sleep(700);
          }
          break;

        case "enterFreeGame":
          await freeSpinIntro(ev);
          housePanel.classList.remove("hidden");
          setHouse(1, ev.house, 0);
          fsCount.textContent = "0 / " + ev.totalSpins;
          break;

        case "updateFreeSpin":
          fsCount.textContent = ev.current + " / " + ev.total;
          break;

        case "collectBrick": {
          const c = cellAt(ev.position[0], ev.position[1]);
          const pop = document.createElement("span");
          pop.className = "brickpop"; pop.textContent = "+🧱";
          c.appendChild(pop);
          updateBricks(ev.bricks);
          await sleep(160);
          break;
        }

        case "houseUpgrade":
          await houseUpgrade(ev);
          break;

        case "exitFreeGame":
          housePanel.classList.add("hidden");
          glow.className = "board-glow";
          if (ev.totalWin > 0) { burst("🐷 " + fmt(ev.totalWin * curBet())); await sleep(900); }
          break;

        case "setTotalWin":
          roundWin = ev.amount;
          setWin(roundWin);
          break;

        case "finalWin":
          await settle(ev, roundWin);
          break;
      }
    }
    return roundWin;
  }

  // ---- free-spin flourishes ------------------------------------------------
  function setHouse(level, name, bricks) {
    const icons = { 1: "🥧", 2: "🪵", 3: "🏰" };
    houseIcon.textContent = icons[level] || "🏠";
    houseName.textContent = name;
    const levels = CFG.features.houseLevels;
    const next = levels.find((l) => l.level === level + 1);
    bricksTarget = next ? next.bricks : (levels[levels.length - 1].bricks);
    updateBricks(bricks);
  }
  function updateBricks(bricks) {
    const pct = Math.min(100, (bricks / bricksTarget) * 100);
    brickFill.style.width = pct + "%";
    brickLabel.textContent = "🧱 " + bricks + " / " + bricksTarget;
  }
  async function houseUpgrade(ev) {
    setHouse(ev.level, ev.house, ev.bricks);
    glow.className = "board-glow bonus";
    burst("🏠 " + ev.house.toUpperCase());
    setMessage("Haus-Upgrade! " + ev.house + " · +" + ev.extraSpins + " Freispiele");
    await sleep(1100);
  }
  async function freeSpinIntro(ev) {
    const flash = document.createElement("div");
    flash.className = "fs-flash";
    flash.innerHTML =
      '<div class="big-emoji">🍲🐺</div><h1>HOUSE UPGRADE<br>FREE SPINS</h1>' +
      "<p>" + ev.totalSpins + " Freispiele · Sammle 🧱 auf Walze 5</p>";
    document.body.appendChild(flash);
    await sleep(1700);
    flash.remove();
  }

  // ---- settle --------------------------------------------------------------
  async function settle(ev, roundWin) {
    balance += ev.amount * curBet();
    balanceEl.textContent = fmt(balance);
    setWin(ev.amount);
    if (ev.wincapReached) { burst("MAX WIN! 15.000×"); setMessage("🐺 MAX WIN — die Festung fällt!"); }
    else if (ev.amount >= 50) { burst("MEGA WIN " + Math.round(ev.amount) + "×"); setMessage("Mega-Gewinn!"); }
    else if (ev.amount >= 10) { burst("BIG WIN"); setMessage("Großer Gewinn!"); }
    else if (ev.amount > 0) setMessage("Gewonnen: " + fmt(ev.amount * curBet()));
    else setMessage("Kein Gewinn — nochmal pusten!");
    await sleep(ev.amount > 0 ? 500 : 100);
  }

  // ---- weighted book selection (the lookup table at work) ------------------
  function pickBook(mode) {
    const list = BOOKS[mode] || [];
    if (!list.length) return demoBook();
    let total = 0;
    for (const b of list) total += b.weight || 1;
    let r = Math.random() * total;
    for (const b of list) { r -= b.weight || 1; if (r <= 0) return b; }
    return list[list.length - 1];
  }

  // ---- spin flow -----------------------------------------------------------
  async function doSpin(mode) {
    if (busy) return;
    const cost = (mode === "base" ? 1 : mode === "bonus" ? buyA : buyB) * curBet();
    if (balance < cost) { setMessage("Nicht genug Guthaben für diesen Einsatz."); return; }
    busy = true; spinBtn.disabled = true; spinBtn.classList.add("spinning");
    setControls(false);
    balance -= cost; balanceEl.textContent = fmt(balance);
    winEl.textContent = "0.00"; overlay.innerHTML = ""; setMult(1);
    setMessage(mode === "base" ? "Der Wolf holt Luft…" : "Bonus gekauft!");

    const book = pickBook(mode);
    if (book.serverSeedHash) $("seed-hash").textContent = book.serverSeedHash.slice(0, 24) + "…";
    await play(book, mode === "base" ? "basegame" : "freegame");

    busy = false; spinBtn.disabled = false; spinBtn.classList.remove("spinning");
    setControls(true);
  }

  function setControls(on) {
    ["bet-up", "bet-down", "buy-a", "buy-b"].forEach((id) => ($(id).disabled = !on));
  }

  // ---- bet + buttons -------------------------------------------------------
  function refreshBet() {
    betEl.textContent = fmt(curBet());
    $("buy-a-cost").textContent = buyA + "×";
    $("buy-b-cost").textContent = buyB + "×";
  }

  function wire() {
    spinBtn.onclick = () => doSpin("base");
    $("bet-up").onclick = () => { betIdx = Math.min(BETS.length - 1, betIdx + 1); refreshBet(); };
    $("bet-down").onclick = () => { betIdx = Math.max(0, betIdx - 1); refreshBet(); };
    $("buy-a").onclick = () => doSpin("bonus");
    $("buy-b").onclick = () => doSpin("bonus_vip");
    document.addEventListener("keydown", (e) => { if (e.code === "Space") { e.preventDefault(); doSpin("base"); } });
  }

  // ---- meta + boot ---------------------------------------------------------
  function boot() {
    $("meta-rtp").textContent = (CFG.rtp * 100).toFixed(2) + "%";
    $("meta-max").textContent = CFG.wincap.toLocaleString("de-DE") + "×";
    buildBoard();
    setBoard(randomBoard(), { drop: false });
    balanceEl.textContent = fmt(balance);
    refreshBet();
    wire();
    if (!window.PIGGY_BOOKS)
      setMessage("Demo-Modus: führe `python run.py build` aus, um echte Runden zu laden.");
  }

  // ---- fallbacks (so the page is alive before the math build) --------------
  function randomBoard() {
    const reels = (CFG.reels && CFG.reels.BR0) || null;
    const pool = CFG.symbols.filter((s) => !s.scatter && !s.collectible).map((s) => s.id);
    const b = [];
    for (let col = 0; col < REELS; col++) {
      b.push([]);
      for (let row = 0; row < ROWS; row++) {
        if (reels) b[col].push(reels[col][(Math.random() * reels[col].length) | 0]);
        else b[col].push(pool[(Math.random() * pool.length) | 0]);
      }
    }
    return b;
  }
  function demoBook() {
    return { payoutMultiplier: 0, wincap: false, events: [
      { type: "reveal", gametype: "basegame", board: randomBoard() },
      { type: "setTotalWin", amount: 0 },
      { type: "finalWin", amount: 0, wincapReached: false },
    ] };
  }
  function fallbackConfig() {
    return {
      gameName: "Piggy Richies", rtp: 0.9655, wincap: 15000, numReels: 5, numRows: 4,
      reels: null,
      symbols: [
        { id: "W", kind: "wild", emoji: "🐺", wild: true }, { id: "S", kind: "scatter", emoji: "🍲", scatter: true },
        { id: "P1", kind: "premium", emoji: "🐷" }, { id: "P2", kind: "premium", emoji: "🐽" },
        { id: "P3", kind: "premium", emoji: "🐖" }, { id: "M1", kind: "mid", emoji: "🪓" },
        { id: "M2", kind: "mid", emoji: "🥄" }, { id: "M3", kind: "mid", emoji: "🔱" },
        { id: "A", kind: "low", emoji: "A" }, { id: "K", kind: "low", emoji: "K" },
        { id: "Q", kind: "low", emoji: "Q" }, { id: "J", kind: "low", emoji: "J" },
        { id: "BR", kind: "collect", emoji: "🧱", collectible: true },
      ],
      betModes: [{ name: "bonus", cost: 100 }, { name: "bonus_vip", cost: 300 }],
      features: { houseLevels: [{ level: 1, bricks: 0 }, { level: 2, bricks: 5 }, { level: 3, bricks: 10 }] },
    };
  }

  boot();
})();
