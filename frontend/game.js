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
  const phaseEl = $("phase"), winEl = $("win-amount"), multBadge = $("mult-badge"), multTab = $("mult-tab");
  const balanceEl = $("balance"), betEl = $("bet"), spinBtn = $("spin");
  const housePanel = $("house-panel"), houseName = $("house-name"), houseEmoji = $("house-emoji");
  const brickLabel = $("brick-label"), fsCount = $("fs-count");
  const toastEl = $("toast"), fsFlash = $("fs-flash"), autoNEl = $("auto-n");

  const BETS = [0.1, 0.2, 0.5, 1, 2, 5, 10, 25, 50, 100];
  let betIdx = 3, balance = 1000, busy = false, muted = false, turbo = false, autoLeft = 0;
  let cells = [], curBoard = [], dispWin = 0, bricksTarget = 5, bricksFloor = 0, curGametype = "basegame", houseLabel = "Stroh-Haus", fsNow = 0, fsTot = 0, casc = 0, explodeMap = null;

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
  const DROP_DUR = 320, DROP_EASE = "cubic-bezier(.3,1.42,.5,1)";   // overshoot = bounce on impact
  // full reel-spin slide (reveal): a rigid per-column strip with the incoming
  // symbols stacked directly above the outgoing ones -> one motion, no blink.
  // SPIN_EASE overshoots slightly so each reel "bounces" as it settles.
  const SPIN_DUR = 360, SPIN_STAG = 88, SPIN_EASE = "cubic-bezier(.22,1.34,.42,1)";
  const ANTICIP_DUR = 560, ANTICIP_GAP = 300; // "2 pots showing -> chase" crawl
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
    c.dataset.kind = s.kind; c.classList.remove("win", "explode", "dim", "sticky", "scat-hot", "collected");
    c.querySelectorAll(".wmult").forEach((e) => e.remove());
    const sym = c.querySelector(".sym"); sym.style.transition = "none"; sym.style.transform = "none"; sym.style.animationDuration = "";
    if (c.dataset.sym !== id) { setSym(sym, id); c.dataset.sym = id; }  // only re-render on actual change
  }
  // wipe per-cell win/scatter FX from the previous spin (called at each reveal)
  function clearCellFx() {
    cells.forEach((c) => { c.classList.remove("win", "dim", "explode", "scat-hot", "collected"); const s = c.querySelector(".sym"); if (s) s.style.animationDuration = ""; });
  }
  // instant repaint (no motion) for changed cells
  function setStatic(b) {
    for (let col = 0; col < REELS; col++) for (let row = 0; row < ROWS; row++)
      if (!curBoard[col] || curBoard[col][row] !== b[col][row]) paintCell(col, row, b[col][row]);
    curBoard = b.map((c) => c.slice());
  }
  // Cascade gravity (partial removal only): survivors slide DOWN into the gaps,
  // new symbols fall from above -- you clearly see what falls. `removed` is a
  // {col: Set(rows)} map of the cells the wolf just blew away.
  function animateColumns(b, removed) {
    const pitch = rowPitch(), anims = [], sp = SPD(), dur = DROP_DUR * sp;
    for (let col = 0; col < REELS; col++) {
      const rem = removed[col] || new Set();
      if (!rem.size) { for (let row = 0; row < ROWS; row++) if (!curBoard[col] || curBoard[col][row] !== b[col][row]) paintCell(col, row, b[col][row]); continue; }
      const missing = rem.size, oldKept = [];
      for (let r = 0; r < ROWS; r++) if (!rem.has(r)) oldKept.push(r);
      for (let row = 0; row < ROWS; row++) {
        paintCell(col, row, b[col][row]);
        const sym = cellAt(col, row).querySelector(".sym");
        const startRows = row >= missing ? row - oldKept[row - missing] : missing;
        sym.style.transition = "none"; sym.style.transform = `translateY(${-startRows * pitch}px)`;
        anims.push({ sym });
      }
    }
    void boardEl.offsetHeight; // one reflow, then release them all together
    anims.forEach(({ sym }) => { sym.style.transition = `transform ${dur}ms ${DROP_EASE}`; sym.style.transform = "translateY(0)"; });
    curBoard = b.map((c) => c.slice());
    setTimeout(() => anims.forEach(({ sym }) => { sym.style.transition = ""; sym.style.transform = ""; }), dur + 80);
    return dur;
  }

  // Full reel replacement (a fresh spin). Each column becomes ONE rigid strip
  // holding the incoming symbols stacked directly above the outgoing ones;
  // sliding the strip down by exactly ROWS rows lands the new board and ejects
  // the old in a single motion -- never a blank frame, never an overlap flicker
  // (the user's "blinkt zwischen symbolen" bug). Columns stop left->right; once
  // two soup-pots are showing, the remaining reels drop into a slow anticipation
  // crawl. Resolves only after the LAST column has fully settled.
  function makeSpinCell(id, top, w, h) {
    const d = document.createElement("div"); d.className = "spin-cell";
    d.style.cssText = `top:${top}px;width:${w}px;height:${h}px;`;
    d.innerHTML = `<span class="sym">${symInner(id)}</span>`;
    return d;
  }
  function markScatterCol(col, b) {
    for (let row = 0; row < ROWS; row++) if (SYM[b[col][row]] && SYM[b[col][row]].scatter) cellAt(col, row).classList.add("scat-hot");
  }
  function spinReels(b) {
    return new Promise((resolve) => {
      const sp = SPD(), pitch = rowPitch();
      const layer = document.createElement("div"); layer.className = "spin-layer";
      const scatterCols = [];
      for (let c = 0; c < REELS; c++) if (b[c].some((id) => SYM[id] && SYM[id].scatter)) scatterCols.push(c);
      const antiFrom = scatterCols.length >= 2 ? scatterCols[1] + 1 : REELS; // first reel of the "chase"
      const strips = [];
      for (let col = 0; col < REELS; col++) {
        const base = cellAt(col, 0), x = base.offsetLeft, w = base.offsetWidth, h = base.offsetHeight;
        const strip = document.createElement("div"); strip.className = "spin-strip"; strip.style.cssText = `left:${x}px;width:${w}px;`;
        for (let row = 0; row < ROWS; row++) {
          const top = cellAt(col, row).offsetTop;
          strip.appendChild(makeSpinCell(curBoard[col] ? curBoard[col][row] : b[col][row], top, w, h)); // outgoing
          strip.appendChild(makeSpinCell(b[col][row], top - ROWS * pitch, w, h));                        // incoming (above)
        }
        layer.appendChild(strip); strips.push(strip);
      }
      boardEl.appendChild(layer); void boardEl.offsetHeight;

      let maxEnd = 0;
      for (let col = 0; col < REELS; col++) {
        let delay, dur;
        if (col < antiFrom) { delay = col * SPIN_STAG * sp; dur = SPIN_DUR * sp; }
        else { delay = (antiFrom * SPIN_STAG + (col - antiFrom + 1) * ANTICIP_GAP) * sp; dur = ANTICIP_DUR * sp; }
        strips[col].style.transition = `transform ${dur}ms ${SPIN_EASE} ${delay}ms`;
        strips[col].style.transform = `translateY(${ROWS * pitch}px)`;
        const end = delay + dur; maxEnd = Math.max(maxEnd, end);
        setTimeout(() => {
          for (let row = 0; row < ROWS; row++) paintCell(col, row, b[col][row]); // real cells now hold the new board
          strips[col].remove();                                                  // reveal them (identical, seamless)
          SND.reelStop(col, col >= antiFrom);
          if (b[col].some((id) => SYM[id] && SYM[id].scatter)) markScatterCol(col, b);
          if (col === antiFrom) { boardEl.classList.add("anticip"); SND.riser(0.9); } // chase begins
        }, end);
      }
      curBoard = b.map((c) => c.slice());
      setTimeout(() => { layer.remove(); boardEl.classList.remove("anticip"); resolve(); }, maxEnd + 70);
    });
  }

  // ---- HUD ----------------------------------------------------------------
  function setPhase(extra) {
    phaseEl.textContent = extra || (curGametype === "freegame" ? `FREISPIEL ${fsNow}/${fsTot} · ${houseLabel.toUpperCase()}` : "BASISSPIEL");
    phaseEl.classList.toggle("bonus", curGametype === "freegame");
  }
  let lastMult = 1;
  function setMult(m, celebrate = false) {
    multBadge.textContent = "×" + m;
    multBadge.classList.remove("bump"); multTab.classList.remove("pump"); void multBadge.offsetWidth;
    multBadge.classList.add("bump");
    if (celebrate && m > 1) {
      multTab.classList.add("pump");
      if (FX) { const r = multTab.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2; FX.sparkle(cx, cy); FX.burst(cx, cy, 7, 0.55); }
      SND.multUp(m);
    }
  }
  function burst(t, cls = "") { const b = document.createElement("div"); b.className = "burst " + cls; b.innerHTML = t; overlay.appendChild(b); setTimeout(() => b.remove(), 1000); }
  let toastT;
  function toast(t, bonus = false) { toastEl.innerHTML = t; toastEl.className = "toast show" + (bonus ? " bonus" : ""); clearTimeout(toastT); toastT = setTimeout(() => (toastEl.className = "toast hidden"), 1600); }
  function countWin(toMult) {
    const from = dispWin * bet(), to = toMult * bet(), t0 = performance.now(), dur = 420; dispWin = toMult;
    (function step(t) { const k = Math.min(1, (t - t0) / dur); winEl.textContent = fmt(from + (to - from) * k); if (k < 1) requestAnimationFrame(step); })(performance.now());
    winEl.classList.remove("big"); void winEl.offsetWidth; if (toMult > 0) winEl.classList.add("big");
  }

  // ---- event player -------------------------------------------------------
  async function play(book, mode) {
    let roundWin = 0; dispWin = 0; winEl.textContent = "0.00"; casc = 0; lastMult = 1;
    curGametype = mode === "base" ? "basegame" : "freegame"; setMult(1); setPhase();
    for (const ev of book.events) {
      switch (ev.type) {
        case "reveal": {
          curGametype = ev.gametype; explodeMap = null; clearCellFx();
          glow.className = "board-glow" + (ev.gametype === "freegame" ? " bonus" : ""); setStorm(ev.gametype === "freegame"); setPhase(); SND.spin();
          await spinReels(ev.board);                 // reel-strip slide: reel-stops + anticipation built in
          const sc = ev.board.reduce((a, cA) => a + cA.filter((id) => SYM[id] && SYM[id].scatter).length, 0);
          if (sc >= 2) await sleep(300);             // let a 2+ pot board breathe before the next event
          break;
        }
        case "updateGlobalMult": {
          const up = ev.globalMult > lastMult; lastMult = ev.globalMult;
          setMult(ev.globalMult, up);
          if (ev.globalMult > 1) setPhase(curGametype === "freegame" ? `FREISPIEL ${fsNow}/${fsTot} · WOLF ×${ev.globalMult}` : `WOLF ×${ev.globalMult}`);
          break;
        }
        case "wildLand":
          ev.wilds.forEach((w) => { if (w.multiplier > 1) { const c = cellAt(w.position[0], w.position[1]); const t = document.createElement("span"); t.className = "wmult"; t.textContent = "×" + w.multiplier; c.appendChild(t); c.classList.add("sticky"); } }); break;
        case "winInfo": {
          const ks = new Set(); ev.wins.forEach((w) => w.positions.forEach((p) => ks.add(p[0] + "," + p[1])));
          const wd = 0.55 * SPD() + "s";
          cells.forEach((c, i) => { const col = i % REELS, row = (i / REELS) | 0; const w = ks.has(col + "," + row); if (w) { const s = c.querySelector(".sym"); if (s) s.style.animationDuration = wd; } c.classList.toggle("win", w); c.classList.toggle("dim", !w); });
          if (FX) {
            // a sparkle dead-centre on EVERY winning tile (no 8-cell cap -> no lopsided gaps)
            ks.forEach((key) => { const [col, row] = key.split(",").map(Number); const p = cellCenter(col, row); FX.sparkle(p.x, p.y); });
            const amp = Math.min(15, ev.stepWin * 0.7 + (lastMult - 1) * 2); // shake scales with win size AND wolf mult
            if (amp > 2.5) FX.shake(amp, 0.28);
          }
          roundWin += ev.stepWin; countWin(roundWin); glow.classList.add("active"); SND.win(casc++); await sleep(620); glow.classList.remove("active"); cells.forEach((c) => c.classList.remove("dim")); break;
        }
        case "tumbleBoard":
          wolfEl.classList.add("blow"); SND.puff();
          explodeMap = {};
          { const bd = 0.42 * SPD() + "s"; ev.explodePositions.forEach(([c, r]) => { (explodeMap[c] || (explodeMap[c] = new Set())).add(r); const cell = cellAt(c, r); const s = cell.querySelector(".sym"); if (s) s.style.animationDuration = bd; cell.classList.add("explode"); if (FX) { const p = cellCenter(c, r); FX.explode(p.x, p.y); } }); }
          await sleep(430); wolfEl.classList.remove("blow"); break;
        case "dropBoard": {
          if (explodeMap) animateColumns(ev.board, explodeMap); else setStatic(ev.board);
          explodeMap = null; SND.drop();
          // a soup-pot may have tumbled in -> glow every pot now showing (chase the 3rd)
          let sc = 0; for (let c = 0; c < REELS; c++) for (let r = 0; r < ROWS; r++) if (SYM[ev.board[c][r]] && SYM[ev.board[c][r]].scatter) { cellAt(c, r).classList.add("scat-hot"); sc++; }
          if (sc >= 2) SND.scatter();
          await sleep(400); break;
        }
        case "scatterPay": burst(chip("pot") + " SCATTER"); toast(`${ev.scatters}× ${chip("pot")} zahlt ${fmt(ev.amount * bet())}`, true); await sleep(550); break;
        case "freeSpinTrigger":
          if (curGametype === "freegame") { toast(`RETRIGGER · +${ev.spinsAwarded} ${chip("pot")}`, true); SND.trigger(); if (FX) FX.shake(7, 0.4); await sleep(800); }
          else { // base-game trigger: celebrate the pots before the bonus intro
            ev.positions.forEach((p) => { cellAt(p[0], p[1]).classList.add("scat-hot"); if (FX) { const c = cellCenter(p[0], p[1]); FX.sparkle(c.x, c.y); FX.burst(c.x, c.y, 8, 0.6); } });
            burst(`${ev.scatters}× ${chip("pot")}`, "scatter"); SND.scatter(); SND.trigger(); if (FX) FX.shake(8, 0.5);
            await sleep(750);
          }
          break;
        case "enterFreeGame": { await freeIntro(ev); housePanel.classList.remove("hidden"); curGametype = "freegame"; houseLabel = ev.house; fsTot = ev.totalSpins; fsNow = 0; const lvl = { "Stroh-Haus": 1, "Holz-Haus": 2, "Ziegel-Festung": 3 }[ev.house] || 1; setHouse(lvl, ev.house, 0); fsCount.textContent = `0 / ${ev.totalSpins}`; setPhase(); break; }
        case "updateFreeSpin": fsNow = ev.current; fsTot = ev.total; fsCount.textContent = `${ev.current} / ${ev.total}`; setPhase(); break;
        case "collectBrick": {
          const c = cellAt(ev.position[0], ev.position[1]);
          flyBrickToHouse(c); c.classList.add("collected");     // brick arcs to the meter; the cell dims (banked)
          if (FX) { const p = cellCenter(ev.position[0], ev.position[1]); FX.sparkle(p.x, p.y); }
          updateBricks(ev.bricks); pulseRing(); SND.brick();
          await sleep(260); break;
        }
        case "houseUpgrade": {
          const ring = $("house-ring"), build = ring ? ring.querySelector(".house-build") : null;
          if (build) build.classList.add("crumble");            // old house shakes apart
          if (FX) { const r = ring.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2; FX.explode(cx, cy, "#ffcaa0"); FX.shake(10, 0.5); }
          SND.upgrade(); await sleep(360);
          setHouse(ev.level, ev.house, ev.bricks);               // swap to the new house
          if (build) { build.classList.remove("crumble"); void build.offsetWidth; build.classList.add("smash"); }
          if (ring) { ring.classList.remove("near"); ring.classList.add("flash"); }
          if (FX) { const r = ring.getBoundingClientRect(); FX.confetti(r.left + r.width / 2, r.top + r.height / 2, 28); }
          glow.className = "board-glow bonus"; burst(chip("house" + ev.level) + " " + ev.house.toUpperCase(), "scatter");
          toast(`HAUS-UPGRADE: <b>${ev.house}</b> · +${ev.extraSpins} Freispiele`, true);
          await sleep(1000);
          if (build) build.classList.remove("smash"); if (ring) ring.classList.remove("flash");
          break;
        }
        case "exitFreeGame": housePanel.classList.add("hidden"); setStorm(false); glow.className = "board-glow"; curGametype = "basegame"; if (ev.totalWin > 0) { burst(chip("pig") + " " + fmt(ev.totalWin * bet())); await sleep(900); } break;
        case "setTotalWin": roundWin = ev.amount; countWin(roundWin); break;
        case "finalWin": await settle(ev); break;
      }
    }
    return roundWin;
  }
  // ---- house upgrade meter (organic ring + level chips, no progress bar) ----
  function setHouse(level, name, bricks) {
    houseLabel = name; houseName.textContent = name;
    houseEmoji.innerHTML = icoHTML("house" + level);
    const L = CFG.features.houseLevels;
    const cur = L.find((l) => l.level === level) || L[0], nx = L.find((l) => l.level === level + 1);
    bricksFloor = cur.bricks || 0;
    bricksTarget = nx ? nx.bricks : cur.bricks;
    const chips = $("house-levels"); if (chips) chips.querySelectorAll(".hl").forEach((el) => el.classList.toggle("on", +el.dataset.l <= level));
    updateBricks(bricks);
  }
  function updateBricks(b) {
    const ring = $("house-ring"); if (!ring) return;
    const span = bricksTarget - bricksFloor, p = span > 0 ? Math.min(1, (b - bricksFloor) / span) : 1;
    ring.style.setProperty("--p", p);
    ring.classList.toggle("near", span > 0 && p >= 0.6);   // glow intensifies near an upgrade
    brickLabel.innerHTML = span > 0 ? `${chip("brick")} ${b - bricksFloor} / ${span}` : `${chip("brick")} MAX`;
  }
  function pulseRing() { const r = $("house-ring"); if (!r) return; r.classList.remove("tick"); void r.offsetWidth; r.classList.add("tick"); }
  function flyBrickToHouse(cell) {
    const ring = $("house-ring"); if (!ring || !cell) return;
    const a = cell.getBoundingClientRect(), b = ring.getBoundingClientRect();
    const ax = a.left + a.width / 2, ay = a.top + a.height / 2;
    const fly = document.createElement("div"); fly.className = "brick-fly"; fly.innerHTML = icoHTML("brick");
    fly.style.left = ax + "px"; fly.style.top = ay + "px"; document.body.appendChild(fly);
    const dx = b.left + b.width / 2 - ax, dy = b.top + b.height / 2 - ay;
    requestAnimationFrame(() => { fly.style.transform = `translate(${dx}px,${dy}px) scale(.45)`; fly.style.opacity = "0"; });
    setTimeout(() => fly.remove(), 720);
  }
  // cinematic free-spin trigger: pot + wolf burst in, screen shake, confetti,
  // crossfade, then the storm rolls in for the bonus.
  async function freeIntro(ev) {
    fsFlash.innerHTML =
      `<div class="fi-chars"><span class="fi-ico pot">${icoHTML("pot")}</span><span class="fi-ico wolf">${icoHTML("wolf")}</span></div>` +
      `<h1>HOUSE&nbsp;UPGRADE<br>FREE&nbsp;SPINS</h1>` +
      `<p>${ev.totalSpins} Freispiele · sammle ${chip("brick")} überall auf den Walzen</p>`;
    fsFlash.className = "fs-flash zoom";
    SND.trigger();
    if (FX) { FX.shake(10, 0.6); const cx = innerWidth / 2, cy = innerHeight * 0.42; FX.confetti(cx, cy, 44); FX.coinShower(1.7, 18); }
    setStorm(true);
    await sleep(1950);
    fsFlash.className = "fs-flash hidden";
  }
  // ---- free-spins environment (storm tint + lightning) -------------------
  let ltTimer = null;
  function setStorm(on) {
    const s = $("fs-storm"); if (s) s.classList.toggle("on", on);
    clearTimeout(ltTimer);
    if (on) ltTimer = setTimeout(lightning, 1600 + Math.random() * 2600);
  }
  function lightning() {
    const s = $("fs-storm"), el = $("fs-lightning");
    if (!s || !el || !s.classList.contains("on")) return;
    el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash");
    if (SND.thunder) SND.thunder();
    ltTimer = setTimeout(lightning, 4500 + Math.random() * 6500);
  }
  async function settle(ev) {
    const m = ev.amount;
    balance += m * bet(); balanceEl.textContent = fmt(balance); countWin(m);
    if (ev.wincapReached) await showBigWin(3, m, true);
    else if (m >= 150) await showBigWin(3, m);
    else if (m >= 50) await showBigWin(2, m);
    else if (m >= 15) await showBigWin(1, m);
    else {
      if (m > 0 && FX) { const c = winBarCenter(); FX.burst(c.x, c.y, 9, 0.7); if (m >= 4) FX.shake(Math.min(8, m * 0.5), 0.25); SND.win(2); }
      await sleep(m > 0 ? 420 : 90);
    }
    setMult(1); lastMult = 1; setPhase();
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
      else if (a === "sound") { muted = SND.toggle(); $("sound-state").textContent = muted ? "aus" : "an"; const si = $("sound-ico"); if (si) si.innerHTML = icoHTML(muted ? "soundOff" : "sound"); }
    }));
    $("buy-pop").querySelectorAll("button").forEach((b) => (b.onclick = () => { closePops(); doSpin(b.dataset.buy); }));
    document.querySelectorAll("[data-close]").forEach((b) => (b.onclick = () => b.closest(".modal").classList.add("hidden")));
    document.querySelectorAll(".modal").forEach((m) => (m.onclick = (e) => { if (e.target === m) m.classList.add("hidden"); }));
    document.addEventListener("click", closePops);
    document.addEventListener("keydown", (e) => { if (e.code === "Space" && !busy) { e.preventDefault(); doSpin("base"); } });
  }

  // ---- juice helpers ------------------------------------------------------
  const FX = window.PIGGY_FX;
  // ---- UI icons (no emoji) ------------------------------------------------
  const IC = window.PIGGY_ICONS || {};
  function icoHTML(name) {
    if (!name) return "";
    if (name.indexOf("house") === 0) return IC.house ? IC.house(+name.slice(5) || 1) : "";
    const v = IC[name]; return typeof v === "function" ? v() : (v || "");
  }
  const chip = (name) => `<span class="ui-ico">${icoHTML(name)}</span>`;
  function paintIcons(root) {
    (root || document).querySelectorAll("[data-ico]").forEach((el) => {
      if (el.dataset.painted) return; el.dataset.painted = "1"; el.innerHTML = icoHTML(el.dataset.ico);
    });
    const lv = $("house-levels"); if (lv) lv.querySelectorAll(".hl").forEach((el) => { if (!el.firstChild) el.innerHTML = icoHTML("house" + el.dataset.l); });
  }
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
    let coinT = 0, shT = 0;
    await new Promise((res) => {
      function step(t) {
        const k = skipBig ? 1 : Math.min(1, (t - t0) / dur), v = target * easeOut(k);
        aEl.textContent = fmt(v);
        if (t - coinT > 95) { coinT = t; SND.coinTick(); }
        // count-up coupled to a rumble that GROWS as the number climbs (∝ tier)
        if (t - shT > 170) { shT = t; FX.shake(2.5 + tier * 1.5 + k * (3 + tier * 2.5), 0.2); }
        if (k < 1) requestAnimationFrame(step); else { aEl.textContent = fmt(target); aEl.classList.remove("land"); void aEl.offsetWidth; aEl.classList.add("land"); res(); }
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
    buildBoard(); setMult(1); balanceEl.textContent = fmt(balance); refreshBet(); wire(); paintIcons();
    if (FX) FX.init($("fx"), document.querySelector(".stage"));
    if (FX && FX.ambient) FX.ambient($("ambient"));   // drifting fireflies behind the reels
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
