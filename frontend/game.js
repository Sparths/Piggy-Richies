/* Stake's Huff & Puff: Piggy Richies -- front-end event player.
 * Stake Web SDK model: no game maths on the client. Each spin pulls a
 * predetermined "book" (from the math-engine sample, at true odds) and animates
 * its event stream, with phase labels, sound, count-up, turbo and autoplay. */
(() => {
  "use strict";
  const CFG = window.PIGGY_CONFIG || fallbackConfig();
  const BOOKS = window.PIGGY_BOOKS || { base: [], bonus: [], bonus_vip: [] };
  const ART = window.PIGGY_ART, SND = window.PIGGY_AUDIO;
  const SYM = {}; CFG.symbols.forEach((s) => (SYM[s.id] = s));
  const REELS = CFG.numReels, ROWS = CFG.numRows;
  const ALLCOLS = new Set(Array.from({ length: REELS }, (_, i) => i));

  const $ = (id) => document.getElementById(id);
  const boardEl = $("board"), wolfEl = $("wolf"), overlay = $("overlay"), glow = $("board-glow");
  const phaseEl = $("phase"), winEl = $("win-amount"), multBadge = $("mult-badge");
  const balanceEl = $("balance"), betEl = $("bet"), spinBtn = $("spin");
  const housePanel = $("house-panel"), houseName = $("house-name"), houseEmoji = $("house-emoji");
  const brickFill = $("brick-fill"), brickLabel = $("brick-label"), fsCount = $("fs-count");
  const toastEl = $("toast"), fsFlash = $("fs-flash"), autoNEl = $("auto-n");

  const BETS = [0.1, 0.2, 0.5, 1, 2, 5, 10, 25, 50, 100];
  let betIdx = 3, balance = 1000, busy = false, muted = false, turbo = false, autoLeft = 0;
  let cells = [], curBoard = [], dispWin = 0, bricksTarget = 5, curGametype = "basegame", houseLabel = "Stroh-Haus", fsNow = 0, fsTot = 0, casc = 0, explodeCols = null;

  const buyA = (CFG.betModes.find((m) => m.name === "bonus") || {}).cost || 70;
  const buyB = (CFG.betModes.find((m) => m.name === "bonus_vip") || {}).cost || 234;
  const bet = () => BETS[betIdx];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms * (turbo ? 0.4 : 1)));
  const fmt = (n) => n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ---- art / board --------------------------------------------------------
  const symInner = (id) => (ART.hasImage(id) ? `<img src="${ART.imageUrl(id)}" alt="${id}">` : ART.svg(id));
  function buildBoard() {
    boardEl.innerHTML = ""; cells = [];
    for (let row = 0; row < ROWS; row++) for (let col = 0; col < REELS; col++) {
      const c = document.createElement("div"); c.className = "cell"; c.innerHTML = '<span class="sym"></span>';
      boardEl.appendChild(c); cells.push(c);
    }
  }
  const cellAt = (col, row) => cells[row * REELS + col];
  function paint(col, row, id, drop, delay = 0) {
    const c = cellAt(col, row), s = SYM[id] || { kind: "low" };
    c.dataset.kind = s.kind; c.classList.remove("win", "explode", "dim", "sticky", "drop");
    c.querySelectorAll(".wmult,.brick-pop").forEach((e) => e.remove());
    c.querySelector(".sym").innerHTML = symInner(id);
    c.style.animationDelay = (drop ? delay : 0) + "ms";
    if (drop) { void c.offsetWidth; c.classList.add("drop"); }
  }
  // cols: Set of columns to force-animate (whole column refills, lower rows land
  // first like gravity); null => only changed cells animate.
  function setBoard(b, opts = {}) {
    const { drop = true, cols = null } = opts;
    for (let col = 0; col < REELS; col++) for (let row = 0; row < ROWS; row++) {
      const changed = !curBoard[col] || curBoard[col][row] !== b[col][row];
      const animate = drop && (cols ? cols.has(col) : changed);
      if (animate || changed) paint(col, row, b[col][row], animate, cols && cols.has(col) ? (ROWS - 1 - row) * 45 : 0);
    }
    curBoard = b.map((c) => c.slice());
  }

  // ---- HUD ----------------------------------------------------------------
  function setPhase(extra) {
    phaseEl.textContent = extra || (curGametype === "freegame" ? `FREISPIEL ${fsNow}/${fsTot} · ${houseLabel.toUpperCase()}` : "BASISSPIEL");
    phaseEl.classList.toggle("bonus", curGametype === "freegame");
  }
  function setMult(m) { multBadge.textContent = "×" + m; multBadge.classList.remove("bump"); void multBadge.offsetWidth; multBadge.classList.add("bump"); }
  function burst(t, cls = "") { const b = document.createElement("div"); b.className = "burst " + cls; b.textContent = t; overlay.appendChild(b); setTimeout(() => b.remove(), 1000); }
  let toastT;
  function toast(t, bonus = false) { toastEl.innerHTML = t; toastEl.className = "toast show" + (bonus ? " bonus" : ""); clearTimeout(toastT); toastT = setTimeout(() => (toastEl.className = "toast hidden"), 1600); }
  function countWin(toMult) {
    const from = dispWin * bet(), to = toMult * bet(), t0 = performance.now(), dur = 420; dispWin = toMult;
    (function step(t) { const k = Math.min(1, (t - t0) / dur); winEl.textContent = fmt(from + (to - from) * k); if (k < 1) requestAnimationFrame(step); })(performance.now());
    winEl.classList.remove("big"); void winEl.offsetWidth; if (toMult > 0) winEl.classList.add("big");
  }

  // ---- event player -------------------------------------------------------
  async function play(book, mode) {
    let roundWin = 0; dispWin = 0; winEl.textContent = "0.00"; casc = 0;
    curGametype = mode === "base" ? "basegame" : "freegame"; setMult(1); setPhase();
    for (const ev of book.events) {
      switch (ev.type) {
        case "reveal":
          curGametype = ev.gametype; explodeCols = null; setBoard(ev.board, { cols: ALLCOLS });
          glow.className = "board-glow" + (ev.gametype === "freegame" ? " bonus" : ""); setPhase(); SND.spin(); await sleep(380); break;
        case "updateGlobalMult":
          setMult(ev.globalMult);
          if (ev.globalMult > 1) setPhase(curGametype === "freegame" ? `FREISPIEL ${fsNow}/${fsTot} · KASKADE ×${ev.globalMult}` : `KASKADE ×${ev.globalMult}`);
          break;
        case "wildLand":
          ev.wilds.forEach((w) => { if (w.multiplier > 1) { const c = cellAt(w.position[0], w.position[1]); const t = document.createElement("span"); t.className = "wmult"; t.textContent = "×" + w.multiplier; c.appendChild(t); c.classList.add("sticky"); } }); break;
        case "winInfo": {
          const ks = new Set(); ev.wins.forEach((w) => w.positions.forEach((p) => ks.add(p[0] + "," + p[1])));
          cells.forEach((c, i) => { const col = i % REELS, row = (i / REELS) | 0; const w = ks.has(col + "," + row); c.classList.toggle("win", w); c.classList.toggle("dim", !w); });
          roundWin += ev.stepWin; countWin(roundWin); glow.classList.add("active"); SND.win(casc++); await sleep(620); glow.classList.remove("active"); cells.forEach((c) => c.classList.remove("dim")); break;
        }
        case "tumbleBoard":
          wolfEl.classList.add("blow"); SND.puff();
          explodeCols = new Set(ev.explodePositions.map((p) => p[0]));
          ev.explodePositions.forEach(([c, r]) => { const el = cellAt(c, r); el.style.animationDelay = "0ms"; el.classList.add("explode"); });
          await sleep(470); wolfEl.classList.remove("blow"); break;
        case "dropBoard": setBoard(ev.board, { cols: explodeCols || ALLCOLS }); explodeCols = null; SND.drop(); await sleep(380); break;
        case "scatterPay": burst("🍲 SCATTER"); toast(`${ev.scatters}× 🍲 zahlt ${fmt(ev.amount * bet())}`, true); await sleep(550); break;
        case "freeSpinTrigger": if (curGametype === "freegame") { toast(`RETRIGGER · +${ev.spinsAwarded} 🍲`, true); SND.trigger(); await sleep(800); } break;
        case "enterFreeGame": { await freeIntro(ev); housePanel.classList.remove("hidden"); curGametype = "freegame"; houseLabel = ev.house; fsTot = ev.totalSpins; fsNow = 0; const lvl = { "Stroh-Haus": 1, "Holz-Haus": 2, "Ziegel-Festung": 3 }[ev.house] || 1; setHouse(lvl, ev.house, 0); fsCount.textContent = `0 / ${ev.totalSpins}`; setPhase(); break; }
        case "updateFreeSpin": fsNow = ev.current; fsTot = ev.total; fsCount.textContent = `${ev.current} / ${ev.total}`; setPhase(); break;
        case "collectBrick": { const c = cellAt(ev.position[0], ev.position[1]); const p = document.createElement("span"); p.className = "brick-pop"; p.textContent = "🧱"; c.appendChild(p); updateBricks(ev.bricks); SND.brick(); await sleep(220); break; }
        case "houseUpgrade": setHouse(ev.level, ev.house, ev.bricks); glow.className = "board-glow bonus"; burst("🏠 " + ev.house.toUpperCase()); toast(`HAUS-UPGRADE: ${ev.house} · +${ev.extraSpins} Freispiele`, true); SND.upgrade(); await sleep(1250); break;
        case "exitFreeGame": housePanel.classList.add("hidden"); glow.className = "board-glow"; curGametype = "basegame"; if (ev.totalWin > 0) { burst("🐷 " + fmt(ev.totalWin * bet())); await sleep(900); } break;
        case "setTotalWin": roundWin = ev.amount; countWin(roundWin); break;
        case "finalWin": await settle(ev); break;
      }
    }
    return roundWin;
  }
  function setHouse(level, name, bricks) {
    houseLabel = name; houseName.textContent = name; houseEmoji.textContent = { 1: "🌾", 2: "🪵", 3: "🏰" }[level] || "🏠";
    const L = CFG.features.houseLevels, nx = L.find((l) => l.level === level + 1); bricksTarget = nx ? nx.bricks : L[L.length - 1].bricks; updateBricks(bricks);
  }
  function updateBricks(b) { brickFill.style.width = Math.min(100, (b / bricksTarget) * 100) + "%"; brickLabel.textContent = `🧱 ${b} / ${bricksTarget}`; }
  async function freeIntro(ev) { fsFlash.innerHTML = `<div class="big">🍲🐺</div><h1>HOUSE&nbsp;UPGRADE<br>FREE&nbsp;SPINS</h1><p>${ev.totalSpins} Freispiele · sammle 🧱 auf Walze 5</p>`; fsFlash.className = "fs-flash"; SND.trigger(); await sleep(1900); fsFlash.className = "fs-flash hidden"; }
  async function settle(ev) {
    balance += ev.amount * bet(); balanceEl.textContent = fmt(balance); countWin(ev.amount);
    if (ev.wincapReached) { burst("MAX WIN! 15.000×"); toast("🐺 MAX WIN!", true); SND.bigwin(); }
    else if (ev.amount >= 100) { burst("MEGA WIN " + Math.round(ev.amount) + "×"); toast("MEGA WIN! " + fmt(ev.amount * bet()), true); SND.bigwin(); }
    else if (ev.amount >= 20) { burst("BIG WIN"); SND.bigwin(); }
    await sleep(ev.amount > 0 ? 500 : 90); setPhase();
  }

  // ---- spin / auto --------------------------------------------------------
  function pickBook(mode) { const l = BOOKS[mode] || []; if (!l.length) return demoBook(); let t = 0; for (const b of l) t += b.weight || 1; let r = Math.random() * t; for (const b of l) { r -= b.weight || 1; if (r <= 0) return b; } return l[l.length - 1]; }
  async function doSpin(mode) {
    if (busy) return; SND.unlock(); closePops();
    const cost = (mode === "base" ? 1 : mode === "bonus" ? buyA : buyB) * bet();
    if (balance < cost) { toast("Nicht genug Guthaben"); autoLeft = 0; return; }
    busy = true; spinBtn.disabled = true; spinBtn.classList.add("spinning"); ctlEnable(false);
    balance -= cost; balanceEl.textContent = fmt(balance); overlay.innerHTML = ""; setMult(1);
    const book = pickBook(mode); if (book.serverSeedHash) $("seed-hash").textContent = book.serverSeedHash.slice(0, 22) + "…";
    await play(book, mode);
    busy = false; spinBtn.disabled = false; spinBtn.classList.remove("spinning"); ctlEnable(true);
  }
  function ctlEnable(on) { ["bet-up", "bet-down", "btn-buy"].forEach((id) => ($(id).disabled = !on)); }
  async function runAuto() {
    while (autoLeft > 0) {
      if (busy) return; autoNEl.textContent = autoLeft; await doSpin("base"); autoLeft--;
      autoNEl.textContent = autoLeft > 0 ? autoLeft : ""; if (autoLeft <= 0) break; await sleep(280);
    }
    $("btn-auto").classList.remove("on"); autoNEl.textContent = "";
  }

  // ---- paytable -----------------------------------------------------------
  function buildPaytable() {
    const order = ["W", "S", "P1", "P2", "P3", "M1", "M2", "M3", "A", "K", "Q", "J", "BR"], grid = $("paytable-grid"); grid.innerHTML = "";
    order.forEach((id) => {
      const s = SYM[id]; if (!s) return; let pay = "";
      if (CFG.paytable[id]) { const t = CFG.paytable[id]; pay = `5× <b>${t[5]}</b> · 4× ${t[4]} · 3× ${t[3]}`; }
      else if (s.scatter) { const sp = CFG.scatterPays; pay = `5× <b>${sp[5]}</b> · 4× ${sp[4]} · 3× ${sp[3]}`; }
      else if (s.wild) pay = "<small>Wild — ersetzt alle Symbole</small>";
      else if (s.collectible) pay = "<small>Ziegel — Haus-Upgrade</small>";
      grid.insertAdjacentHTML("beforeend", `<div class="pt-row"><div class="pt-ico">${symInner(id)}</div><div class="pt-vals"><span class="pt-name">${s.name || id}</span><span class="pt-pay">${pay}</span></div></div>`);
    });
  }

  // ---- popovers / buttons -------------------------------------------------
  function closePops() { $("menu-pop").classList.add("hidden"); $("buy-pop").classList.add("hidden"); }
  function togglePop(id) { const p = $(id), open = p.classList.contains("hidden"); closePops(); if (open) p.classList.remove("hidden"); }
  function openModal(id) { closePops(); $(id).classList.remove("hidden"); }
  function refreshBet() { betEl.textContent = fmt(bet()); $("buy-a-cost").textContent = buyA + "×"; $("buy-b-cost").textContent = buyB + "×"; }

  function wire() {
    spinBtn.onclick = () => doSpin("base");
    $("bet-up").onclick = () => { betIdx = Math.min(BETS.length - 1, betIdx + 1); refreshBet(); };
    $("bet-down").onclick = () => { betIdx = Math.max(0, betIdx - 1); refreshBet(); };
    $("btn-turbo").onclick = () => { turbo = !turbo; $("btn-turbo").classList.toggle("on", turbo); };
    $("btn-auto").onclick = () => { if (autoLeft > 0) { autoLeft = 0; } else { autoLeft = 25; $("btn-auto").classList.add("on"); runAuto(); } };
    $("btn-menu").onclick = (e) => { e.stopPropagation(); togglePop("menu-pop"); };
    $("btn-buy").onclick = (e) => { e.stopPropagation(); togglePop("buy-pop"); };
    $("menu-pop").onclick = (e) => e.stopPropagation();
    $("buy-pop").onclick = (e) => e.stopPropagation();
    $("menu-pop").querySelectorAll("button").forEach((b) => (b.onclick = () => {
      const a = b.dataset.act;
      if (a === "help") openModal("modal-help");
      else if (a === "paytable") openModal("modal-paytable");
      else if (a === "sound") { muted = SND.toggle(); $("sound-state").textContent = muted ? "aus" : "an"; }
    }));
    $("buy-pop").querySelectorAll("button").forEach((b) => (b.onclick = () => { closePops(); doSpin(b.dataset.buy); }));
    document.querySelectorAll("[data-close]").forEach((b) => (b.onclick = () => b.closest(".modal").classList.add("hidden")));
    document.querySelectorAll(".modal").forEach((m) => (m.onclick = (e) => { if (e.target === m) m.classList.add("hidden"); }));
    document.addEventListener("click", closePops);
    document.addEventListener("keydown", (e) => { if (e.code === "Space" && !busy) { e.preventDefault(); doSpin("base"); } });
  }

  // ---- boot ---------------------------------------------------------------
  function boot() {
    $("meta-rtp").textContent = (CFG.rtp * 100).toFixed(2) + "%"; $("meta-max").textContent = CFG.wincap.toLocaleString("de-DE") + "×";
    buildBoard(); setMult(1); setBoard(randomBoard(), { drop: false }); balanceEl.textContent = fmt(balance); refreshBet(); buildPaytable(); wire();
    if (!localStorage.getItem("piggy_seen2")) { openModal("modal-help"); localStorage.setItem("piggy_seen2", "1"); }
    loadGeneratedAssets();
  }
  function loadGeneratedAssets() {
    const A = window.PIGGY_ASSETS || {};
    if (A.symbols && Object.keys(A.symbols).length) ART.loadImages(A.symbols, () => { setBoard(curBoard, { drop: false }); buildPaytable(); });
    if (A.background) { const im = new Image(); im.onload = () => { const bg = $("bg"); bg.style.backgroundImage = `url(${A.background})`; const sc = bg.querySelector(".bg-scene"); if (sc) sc.style.display = "none"; }; im.src = A.background; }
    if (A.logo) { const im = new Image(); im.onload = () => { const m = $("logo-mark"); m.innerHTML = `<img src="${A.logo}" alt="Piggy Richies">`; m.style.display = "block"; m.style.width = "auto"; m.style.height = "auto"; document.querySelector(".logo-txt").style.display = "none"; }; im.src = A.logo; }
  }

  // ---- fallbacks ----------------------------------------------------------
  function randomBoard() {
    const reels = CFG.reels && CFG.reels.BR0, pool = CFG.symbols.filter((s) => !s.scatter && !s.collectible && !s.wild).map((s) => s.id), b = [];
    for (let c = 0; c < REELS; c++) { b.push([]); for (let r = 0; r < ROWS; r++) b[c].push(reels ? reels[c][(Math.random() * reels[c].length) | 0] : pool[(Math.random() * pool.length) | 0]); }
    return b;
  }
  function demoBook() { return { payoutMultiplier: 0, events: [{ type: "reveal", gametype: "basegame", board: randomBoard() }, { type: "setTotalWin", amount: 0 }, { type: "finalWin", amount: 0, wincapReached: false }] }; }
  function fallbackConfig() {
    return { gameName: "Piggy Richies", rtp: 0.9655, wincap: 15000, numReels: 5, numRows: 4, reels: null, paytable: {}, scatterPays: {},
      symbols: [{ id: "W", kind: "wild", wild: true, name: "Wolf" }, { id: "S", kind: "scatter", scatter: true, name: "Topf" }, { id: "P1", kind: "premium", name: "Ziegel-Schwein" }, { id: "P2", kind: "premium", name: "Holz-Schwein" }, { id: "P3", kind: "premium", name: "Stroh-Schwein" }, { id: "M1", kind: "mid", name: "Axt" }, { id: "M2", kind: "mid", name: "Kelle" }, { id: "M3", kind: "mid", name: "Gabel" }, { id: "A", kind: "low", name: "Ass" }, { id: "K", kind: "low", name: "König" }, { id: "Q", kind: "low", name: "Dame" }, { id: "J", kind: "low", name: "Bube" }, { id: "BR", kind: "collect", collectible: true, name: "Ziegel" }],
      betModes: [{ name: "bonus", cost: 70 }, { name: "bonus_vip", cost: 234 }],
      features: { baseMultLadder: [1, 2, 3, 5], freeMultLadder: [1, 2, 3, 5, 8], houseLevels: [{ level: 1, bricks: 0 }, { level: 2, bricks: 5 }, { level: 3, bricks: 10 }] } };
  }
  boot();
})();
