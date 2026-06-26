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

  const $ = (id) => document.getElementById(id);
  const boardEl = $("board"), wolfEl = $("wolf"), overlay = $("overlay"), glow = $("board-glow");
  const phaseEl = $("phase"), winEl = $("win-amount"), multBadge = $("mult-badge");
  const balanceEl = $("balance"), betEl = $("bet"), spinBtn = $("spin");
  const housePanel = $("house-panel"), houseName = $("house-name"), houseEmoji = $("house-emoji");
  const brickFill = $("brick-fill"), brickLabel = $("brick-label"), fsCount = $("fs-count");
  const toastEl = $("toast"), fsFlash = $("fs-flash"), autoNEl = $("auto-n");

  const BETS = [0.1, 0.2, 0.5, 1, 2, 5, 10, 25, 50, 100];
  let betIdx = 3, balance = 1000, busy = false, muted = false, turbo = false, autoLeft = 0;
  let cells = [], curBoard = [], dispWin = 0, bricksTarget = 5, curGametype = "basegame", houseLabel = "Stroh-Haus", fsNow = 0, fsTot = 0, casc = 0, explodeMap = null;

  const buyA = (CFG.betModes.find((m) => m.name === "bonus") || {}).cost || 70;
  const buyB = (CFG.betModes.find((m) => m.name === "bonus_vip") || {}).cost || 234;
  const bet = () => BETS[betIdx];
  const SPD = () => (turbo ? 0.5 : 1); // one speed factor scales BOTH waits and animations
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms * SPD()));
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
  const DROP_DUR = 330, COL_STAGGER = 58, DROP_EASE = "cubic-bezier(.3,1.03,.43,1)";
  const rowPitch = () => { const a = cellAt(0, 0), b = cellAt(0, 1); return a && b ? b.getBoundingClientRect().top - a.getBoundingClientRect().top : (a ? a.offsetHeight : 60); };

  // Reuse the <img> and just swap src (no element recreation -> no flicker).
  function setSym(sym, id) {
    if (ART.hasImage(id)) {
      let img = sym.firstElementChild;
      if (!img || img.tagName !== "IMG") { sym.textContent = ""; img = document.createElement("img"); img.alt = id; sym.appendChild(img); }
      const url = ART.imageUrl(id);
      if (img.getAttribute("src") !== url) img.setAttribute("src", url);
    } else {
      sym.innerHTML = ART.svg(id);
    }
  }
  function paintCell(col, row, id) {
    const c = cellAt(col, row), s = SYM[id] || { kind: "low" };
    c.dataset.kind = s.kind; c.classList.remove("win", "explode", "dim", "sticky");
    c.querySelectorAll(".wmult,.brick-pop").forEach((e) => e.remove());
    const sym = c.querySelector(".sym"); sym.style.transition = "none"; sym.style.transform = "none";
    if (c.dataset.sym !== id) { setSym(sym, id); c.dataset.sym = id; }  // only re-render on actual change
  }
  // instant repaint (no motion) for changed cells
  function setStatic(b) {
    for (let col = 0; col < REELS; col++) for (let row = 0; row < ROWS; row++)
      if (!curBoard[col] || curBoard[col][row] !== b[col][row]) paintCell(col, row, b[col][row]);
    curBoard = b.map((c) => c.slice());
  }
  // Position-based gravity: every symbol slides from where it came to its final
  // cell -- survivors visibly slide DOWN into the gaps, new symbols fall from
  // above -- so you clearly see what falls. `removed` is 'all' (whole reels, for
  // the spin) or {col: Set(rows)} (the cells the wolf blew away).
  function animateColumns(b, removed, opts = {}) {
    const { colStagger = 0 } = opts, pitch = rowPitch(), anims = [], sp = SPD(), dur = DROP_DUR * sp;
    if (removed === "all") reelExit(colStagger * sp, dur, pitch); // old board scrolls out (no blink)
    for (let col = 0; col < REELS; col++) {
      const rem = removed === "all" ? new Set([0, 1, 2, 3]) : (removed[col] || new Set());
      if (!rem.size) { for (let row = 0; row < ROWS; row++) if (!curBoard[col] || curBoard[col][row] !== b[col][row]) paintCell(col, row, b[col][row]); continue; }
      const missing = rem.size, oldKept = [];
      for (let r = 0; r < ROWS; r++) if (!rem.has(r)) oldKept.push(r);
      for (let row = 0; row < ROWS; row++) {
        paintCell(col, row, b[col][row]);
        const sym = cellAt(col, row).querySelector(".sym");
        const startRows = removed === "all" ? ROWS + 0.5 : (row >= missing ? row - oldKept[row - missing] : missing);
        sym.style.transition = "none"; sym.style.transform = `translateY(${-startRows * pitch}px)`;
        anims.push({ sym, delay: col * colStagger * sp });
      }
    }
    void boardEl.offsetHeight; // one reflow, then release them all together
    let end = 0;
    anims.forEach(({ sym, delay }) => { sym.style.transition = `transform ${dur}ms ${DROP_EASE} ${delay}ms`; sym.style.transform = "translateY(0)"; end = Math.max(end, delay + dur); });
    curBoard = b.map((c) => c.slice());
    setTimeout(() => anims.forEach(({ sym }) => { sym.style.transition = ""; sym.style.transform = ""; }), end + 80);
    return end;
  }
  // clone current symbols and scroll them down out of the board while the new
  // ones drop in -> a continuous reel spin, never an empty/blinking board.
  function reelExit(colStaggerScaled, dur, pitch) {
    const layer = document.createElement("div"); layer.className = "exit-layer";
    const d = (ROWS + 1) * pitch;
    for (let col = 0; col < REELS; col++) for (let row = 0; row < ROWS; row++) {
      const cell = cellAt(col, row), sc = cell.querySelector(".sym");
      if (!sc || !sc.firstChild) continue;
      const c = document.createElement("div"); c.className = "exit-cell";
      c.style.cssText = `left:${cell.offsetLeft}px;top:${cell.offsetTop}px;width:${cell.offsetWidth}px;height:${cell.offsetHeight}px;`;
      const inner = document.createElement("div"); inner.className = "exit-sym"; inner.innerHTML = sc.innerHTML;
      c.appendChild(inner); layer.appendChild(c);
      const delay = col * colStaggerScaled;
      inner.style.transition = `transform ${dur}ms ${DROP_EASE} ${delay}ms, opacity ${dur}ms linear ${delay}ms`;
      requestAnimationFrame(() => { inner.style.transform = `translateY(${d}px)`; inner.style.opacity = "0"; });
    }
    boardEl.appendChild(layer);
    setTimeout(() => layer.remove(), dur + REELS * colStaggerScaled + 160);
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
        case "reveal": {
          curGametype = ev.gametype; explodeMap = null; animateColumns(ev.board, "all", { colStagger: COL_STAGGER });
          glow.className = "board-glow" + (ev.gametype === "freegame" ? " bonus" : ""); setPhase(); SND.spin();
          for (let c = 0; c < REELS; c++) setTimeout(() => SND.reelStop(), c * COL_STAGGER + DROP_DUR - 40);
          let sc = 0; ev.board.forEach((cA) => cA.forEach((id) => { if (SYM[id] && SYM[id].scatter) sc++; }));
          if (sc >= 2) { SND.riser(0.7); cells.forEach((c, i) => { const col = i % REELS, row = (i / REELS) | 0; if (SYM[ev.board[col][row]] && SYM[ev.board[col][row]].scatter) c.classList.add("scat-hot"); }); setTimeout(() => cells.forEach((c) => c.classList.remove("scat-hot")), 2400); }
          await sleep(600); break;
        }
        case "updateGlobalMult":
          setMult(ev.globalMult);
          if (ev.globalMult > 1) setPhase(curGametype === "freegame" ? `FREISPIEL ${fsNow}/${fsTot} · KASKADE ×${ev.globalMult}` : `KASKADE ×${ev.globalMult}`);
          break;
        case "wildLand":
          ev.wilds.forEach((w) => { if (w.multiplier > 1) { const c = cellAt(w.position[0], w.position[1]); const t = document.createElement("span"); t.className = "wmult"; t.textContent = "×" + w.multiplier; c.appendChild(t); c.classList.add("sticky"); } }); break;
        case "winInfo": {
          const ks = new Set(); ev.wins.forEach((w) => w.positions.forEach((p) => ks.add(p[0] + "," + p[1])));
          const wd = 0.55 * SPD() + "s";
          cells.forEach((c, i) => { const col = i % REELS, row = (i / REELS) | 0; const w = ks.has(col + "," + row); if (w) { const s = c.querySelector(".sym"); if (s) s.style.animationDuration = wd; } c.classList.toggle("win", w); c.classList.toggle("dim", !w); });
          if (FX) { let n = 0; ks.forEach((key) => { if (n++ > 7) return; const [col, row] = key.split(",").map(Number); const p = cellCenter(col, row); FX.sparkle(p.x, p.y); }); if (ev.stepWin >= 4) FX.shake(3 + Math.min(7, ev.stepWin / 3), 0.25); }
          roundWin += ev.stepWin; countWin(roundWin); glow.classList.add("active"); SND.win(casc++); await sleep(620); glow.classList.remove("active"); cells.forEach((c) => c.classList.remove("dim")); break;
        }
        case "tumbleBoard":
          wolfEl.classList.add("blow"); SND.puff();
          explodeMap = {};
          { const bd = 0.42 * SPD() + "s"; ev.explodePositions.forEach(([c, r]) => { (explodeMap[c] || (explodeMap[c] = new Set())).add(r); const cell = cellAt(c, r); const s = cell.querySelector(".sym"); if (s) s.style.animationDuration = bd; cell.classList.add("explode"); if (FX) { const p = cellCenter(c, r); FX.explode(p.x, p.y); } }); }
          await sleep(430); wolfEl.classList.remove("blow"); break;
        case "dropBoard": animateColumns(ev.board, explodeMap || "all"); explodeMap = null; SND.drop(); await sleep(400); break;
        case "scatterPay": burst("🍲 SCATTER"); toast(`${ev.scatters}× 🍲 zahlt ${fmt(ev.amount * bet())}`, true); await sleep(550); break;
        case "freeSpinTrigger": if (curGametype === "freegame") { toast(`RETRIGGER · +${ev.spinsAwarded} 🍲`, true); SND.trigger(); await sleep(800); } break;
        case "enterFreeGame": { await freeIntro(ev); housePanel.classList.remove("hidden"); curGametype = "freegame"; houseLabel = ev.house; fsTot = ev.totalSpins; fsNow = 0; const lvl = { "Stroh-Haus": 1, "Holz-Haus": 2, "Ziegel-Festung": 3 }[ev.house] || 1; setHouse(lvl, ev.house, 0); fsCount.textContent = `0 / ${ev.totalSpins}`; setPhase(); break; }
        case "updateFreeSpin": fsNow = ev.current; fsTot = ev.total; fsCount.textContent = `${ev.current} / ${ev.total}`; setPhase(); break;
        case "collectBrick": { const c = cellAt(ev.position[0], ev.position[1]); const p = document.createElement("span"); p.className = "brick-pop"; p.textContent = "🧱"; c.appendChild(p); setTimeout(() => p.remove(), 1000); updateBricks(ev.bricks); SND.brick(); await sleep(220); break; }
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
    const m = ev.amount;
    balance += m * bet(); balanceEl.textContent = fmt(balance); countWin(m);
    if (ev.wincapReached) await showBigWin(3, m, true);
    else if (m >= 150) await showBigWin(3, m);
    else if (m >= 50) await showBigWin(2, m);
    else if (m >= 15) await showBigWin(1, m);
    else {
      if (m > 0 && FX) { const c = winBarCenter(); FX.burst(c.x, c.y, 9, 0.7); SND.win(2); }
      await sleep(m > 0 ? 420 : 90);
    }
    setMult(1); setPhase();
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

  // ---- juice helpers ------------------------------------------------------
  const FX = window.PIGGY_FX;
  const easeOut = (k) => 1 - Math.pow(1 - k, 3);
  function cellCenter(col, row) { const r = cellAt(col, row).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
  function winBarCenter() { const r = winEl.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }

  let skipBig = false;
  async function showBigWin(tier, mult, isCap = false) {
    if (!FX) return;
    const labels = ["NICE WIN", "BIG WIN", "MEGA WIN", "EPIC WIN"];
    const ov = $("bigwin"), tEl = $("bigwin-tier"), aEl = $("bigwin-amount");
    tEl.textContent = isCap ? "MAX WIN!" : labels[tier];
    aEl.textContent = fmt(0); ov.classList.remove("hidden"); skipBig = false;
    SND.winTier(tier); FX.shake(6 + tier * 4, 0.5); FX.coinShower(1.4 + tier * 0.7, 16 + tier * 10);
    const target = mult * bet(), dur = 850 + tier * 650, t0 = performance.now();
    let coinT = 0;
    await new Promise((res) => {
      function step(t) {
        const k = skipBig ? 1 : Math.min(1, (t - t0) / dur), v = target * easeOut(k);
        aEl.textContent = fmt(v);
        if (t - coinT > 95) { coinT = t; SND.coinTick(); }
        if (k < 1) requestAnimationFrame(step); else { aEl.textContent = fmt(target); res(); }
      }
      requestAnimationFrame(step);
    });
    if (tier >= 2) { const c = { x: innerWidth / 2, y: innerHeight * 0.42 }; FX.confetti(c.x, c.y, 50); FX.shake(10, 0.4); }
    await sleep(skipBig ? 150 : 850);
    ov.classList.add("hidden");
  }

  // ---- boot / loading -----------------------------------------------------
  let started = false;
  function boot() {
    $("meta-rtp").textContent = (CFG.rtp * 100).toFixed(2) + "%"; $("meta-max").textContent = CFG.wincap.toLocaleString("de-DE") + "×";
    buildBoard(); setMult(1); balanceEl.textContent = fmt(balance); refreshBet(); wire();
    if (FX) FX.init($("fx"), document.querySelector(".stage"));
    $("bigwin").addEventListener("click", () => (skipBig = true));
    preloadThenStart();
  }
  function preloadThenStart() {
    const A = window.PIGGY_ASSETS || {};
    const urls = [...(A.symbols ? Object.values(A.symbols) : []), ...(A.background ? [A.background] : []), ...(A.logo ? [A.logo] : [])];
    const fill = $("loader-fill"), pct = $("loader-pct");
    if (!urls.length) { afterPreload(); return; }
    let loaded = 0;
    const tick = () => { loaded++; const p = Math.min(100, Math.round((loaded / urls.length) * 100)); fill.style.width = p + "%"; pct.textContent = p + "%"; if (loaded >= urls.length) afterPreload(); };
    urls.forEach((u) => { const im = new Image(); im.onload = tick; im.onerror = tick; im.src = u; });
    setTimeout(() => { if (!started) afterPreload(); }, 6000);
  }
  function afterPreload() {
    const A = window.PIGGY_ASSETS || {};
    if (A.symbols && Object.keys(A.symbols).length) ART.loadImages(A.symbols, finishLoad); else finishLoad();
  }
  function finishLoad() {
    if (started) return; started = true;
    const A = window.PIGGY_ASSETS || {};
    if (A.background) { const bg = $("bg"); bg.style.backgroundImage = `url(${A.background})`; const sc = bg.querySelector(".bg-scene"); if (sc) sc.style.display = "none"; }
    if (A.logo) { const m = $("logo-mark"); m.innerHTML = `<img src="${A.logo}" alt="Piggy Richies">`; m.style.display = "block"; m.style.width = "auto"; m.style.height = "auto"; document.querySelector(".logo-txt").style.display = "none"; }
    setStatic(randomBoard()); buildPaytable();
    const ld = $("loader"); ld.classList.add("gone"); setTimeout(() => (ld.style.display = "none"), 600);
    if (!localStorage.getItem("piggy_seen3")) { setTimeout(() => openModal("modal-help"), 400); localStorage.setItem("piggy_seen3", "1"); }
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
