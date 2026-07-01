/* Bricked Up -- front-end event player.
 * Stake Web SDK model: no game maths on the client. Each spin pulls a
 * predetermined "book" (from the math-engine sample, at true odds) and animates
 * its event stream, with phase labels, sound, count-up, turbo and autoplay. */
(() => {
  "use strict";
  const CFG = window.PIGGY_CONFIG || fallbackConfig();
  const BOOKS = window.PIGGY_BOOKS || { base: [], bonus: [], bonus_vip: [] };
  const ART = window.PIGGY_ART, SND = window.PIGGY_AUDIO;
  const STAKE = window.PIGGY_STAKE || fallbackStakeAdapter();
  const I18N = window.PIGGY_I18N || { t: (k) => k, locale: () => "en-US", symName: (id) => id, houseName: (l) => l, onChange() {}, applyStatic() {}, getLang: () => "en" };
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
  let betIdx = 3, balance = 1000, busy = false, muted = false, turbo = false, autoLeft = 0, betOverride = null, pendingBuy = null;
  let cells = [], curBoard = [], dispWin = 0, bricksTarget = 5, bricksFloor = 0, curGametype = "basegame", currentMode = "base", houseLabel = "Stroh-Haus", fsNow = 0, fsTot = 0, casc = 0, explodeMap = null, currentHouseLevel = 1, currentBricks = 0, roundHadBonusTrigger = false, currentPlayEvents = [], completedHouseStages = new Set(), stakeLocalRound = false, pendingCascadeMult = 0;

  const buyA = (CFG.betModes.find((m) => m.name === "bonus") || {}).cost || 70;
  const buyB = (CFG.betModes.find((m) => m.name === "bonus_vip") || {}).cost || 234;
  const bet = () => (betOverride != null ? betOverride : BETS[betIdx]);
  const SPD = () => (turbo ? 0.5 : 1); // one speed factor scales BOTH waits and animations
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms * SPD()));
  const sleepReal = (ms) => new Promise((r) => setTimeout(r, ms));
  const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100; // all balance mutations go through cents
  const fmt = (n) => (STAKE && STAKE.format ? STAKE.format(n) : n.toLocaleString(I18N.locale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  const fmtMult = (n) => Number(n || 0).toLocaleString(I18N.locale(), { maximumFractionDigits: 2 });
  const fmtPct = (n) => Number(n || 0).toLocaleString(I18N.locale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "%";
  function uiAsset(name) { const A = window.PIGGY_ASSETS || {}; return (A.ui || {})[name] || ""; }
  function safeHouse(method, ...args) {
    try {
      const api = window.PIGGY_HOUSE_UI;
      return api && typeof api[method] === "function" ? api[method](...args) : null;
    } catch (err) {
      console.warn("[house-ui bridge]", err);
      return null;
    }
  }
  function cloneBoard(b) { return (b || []).map((col) => (col || []).slice()); }
  function syncHouseUI(rawBricks = currentBricks) {
    safeHouse("setState", {
      active: curGametype === "freegame" && !housePanel.classList.contains("hidden"),
      gametype: curGametype,
      mode: currentMode,
      house: houseLabel,
      level: currentHouseLevel,
      rawBricks: Math.max(0, Number(rawBricks) || 0),
      visualTotal: curGametype === "freegame" ? Math.min(15, 5 + Math.max(0, Number(rawBricks) || 0)) : 0,
    });
  }

  // ---- art / board --------------------------------------------------------
  const symInner = (id) => (ART.hasImage(id) ? `<img src="${ART.imageUrl(id)}" alt="${id}">` : `<span class="sym-fallback">${id}</span>`);
  function buildBoard() {
    boardEl.innerHTML = ""; cells = [];
    for (let row = 0; row < ROWS; row++) for (let col = 0; col < REELS; col++) {
      const c = document.createElement("div"); c.className = "cell"; c.innerHTML = '<span class="sym"></span>';
      boardEl.appendChild(c); cells.push(c);
    }
  }
  const cellAt = (col, row) => cells[row * REELS + col];
  const DROP_DUR = 320, DROP_EASE = "cubic-bezier(.22,.9,.32,1.06)"; // firm fall, tiny overshoot; squash happens via .settle class on landing
  // full reel-spin slide (reveal): a rigid per-column strip with the incoming
  // symbols stacked directly above the outgoing ones -> one motion, no blink.
  // SPIN_EASE is quick but non-overshooting so Stake scaling does not add a rubbery snap.
  const SPIN_DUR = 430, SPIN_STAG = 96, SPIN_EASE = "cubic-bezier(.18,.82,.28,1)";
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
      sym.innerHTML = `<span class="sym-fallback">${id}</span>`;
    }
  }
  function paintCell(col, row, id) {
    const c = cellAt(col, row), s = SYM[id] || { kind: "low" };
    c.dataset.kind = s.kind; c.classList.remove("win", "explode", "dim", "sticky", "scat-hot", "collected");
    c.querySelectorAll(".wmult,.cascade-mult-chip").forEach((e) => e.remove());
    const sym = c.querySelector(".sym"); sym.style.transition = "none"; sym.style.transform = "none"; sym.style.animationDuration = "";
    if (c.dataset.sym !== id) { setSym(sym, id); c.dataset.sym = id; }  // only re-render on actual change
  }
  // wipe per-cell win/scatter FX from the previous spin (called at each reveal)
  function clearCellFx() {
    cells.forEach((c) => { c.classList.remove("win", "dim", "explode", "scat-hot", "collected"); c.querySelectorAll(".cascade-mult-chip").forEach((e) => e.remove()); const s = c.querySelector(".sym"); if (s) s.style.animationDuration = ""; });
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
    setTimeout(() => {
      anims.forEach(({ sym }) => {
        sym.style.transition = ""; sym.style.transform = "";
        const cell = sym.parentElement; if (!cell) return;
        cell.classList.remove("settle"); void cell.offsetWidth; cell.classList.add("settle");
        setTimeout(() => cell.classList.remove("settle"), 320);
      });
    }, dur + 80);
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
  const showSym = (c, on) => { const s = c.querySelector(".sym"); if (s) s.style.visibility = on ? "" : "hidden"; };
  function spinReels(b) {
    return new Promise((resolve) => {
      const sp = SPD(), pitch = rowPitch();
      // Hide the real cell symbols for the duration of the spin: the strip tiles
      // are transparent, so the static old symbols underneath would otherwise
      // show THROUGH the moving strip (the "new over old" double-vision, worst on
      // fractional mobile layouts). Each column is revealed again as it settles.
      cells.forEach((c) => showSym(c, false));
      const layer = document.createElement("div"); layer.className = "spin-layer";
      const scatterCols = [];
      for (let c = 0; c < REELS; c++) if (b[c].some((id) => SYM[id] && SYM[id].scatter)) scatterCols.push(c);
      const antiFrom = scatterCols.length >= 2 ? scatterCols[1] + 1 : REELS; // first reel of the "chase"
      const strips = [];
      for (let col = 0; col < REELS; col++) {
        const base = cellAt(col, 0), x = base.offsetLeft, w = base.offsetWidth, h = base.offsetHeight, top0 = base.offsetTop;
        const strip = document.createElement("div"); strip.className = "spin-strip"; strip.style.cssText = `left:${x}px;width:${w}px;`;
        for (let row = 0; row < ROWS; row++) {
          const top = top0 + row * pitch;   // UNIFORM pitch -> tiles stay contiguous (no per-cell offsetTop rounding gaps)
          strip.appendChild(makeSpinCell(curBoard[col] ? curBoard[col][row] : b[col][row], top, w, h)); // outgoing
          strip.appendChild(makeSpinCell(b[col][row], top - ROWS * pitch, w, h));                        // incoming (above)
        }
        layer.appendChild(strip); strips.push(strip);
      }
      boardEl.appendChild(layer); void boardEl.offsetHeight;

      const reveal = (col) => { for (let row = 0; row < ROWS; row++) paintCell(col, row, b[col][row]); for (let row = 0; row < ROWS; row++) showSym(cellAt(col, row), true); };
      let maxEnd = 0;
      for (let col = 0; col < REELS; col++) {
        let delay, dur;
        if (col < antiFrom) { delay = col * SPIN_STAG * sp; dur = SPIN_DUR * sp; }
        else { delay = (antiFrom * SPIN_STAG + (col - antiFrom + 1) * ANTICIP_GAP) * sp; dur = ANTICIP_DUR * sp; }
        strips[col].style.transition = `transform ${dur}ms ${SPIN_EASE} ${delay}ms`;
        strips[col].style.transform = `translateY(${ROWS * pitch}px)`;
        const end = delay + dur; maxEnd = Math.max(maxEnd, end);
        setTimeout(() => {
          reveal(col);              // paint the real cells with the new board + make them visible
          strips[col].remove();     // drop the strip (real cells now show, seamless)
          SND.reelStop(col, col >= antiFrom);
          if (b[col].some((id) => SYM[id] && SYM[id].scatter)) markScatterCol(col, b);
          if (col === antiFrom) { boardEl.classList.add("anticip"); SND.riser(0.9); } // chase begins
        }, end);
      }
      curBoard = b.map((c) => c.slice());
      setTimeout(() => { layer.remove(); cells.forEach((c) => showSym(c, true)); boardEl.classList.remove("anticip"); resolve(); }, maxEnd + 70);
    });
  }

  // ---- HUD ----------------------------------------------------------------
  function setPhase(extra) {
    phaseEl.textContent = extra || (curGametype === "freegame" ? I18N.t("phase.free", { n: fsNow, t: fsTot }) : I18N.t("phase.base"));
    phaseEl.classList.toggle("bonus", curGametype === "freegame");
  }
  let lastMult = 1;
  function setMult(m, celebrate = false) {
    multBadge.textContent = "x" + m;
    const multUrl = uiAsset("multX" + m) || uiAsset("multX1");
    if (multUrl) multTab.style.setProperty("--mult-img", `url("${multUrl}")`);
    multTab.classList.toggle("active", m > 1);
    multBadge.classList.remove("bump"); multTab.classList.remove("pump"); void multBadge.offsetWidth;
    multBadge.classList.add("bump");
    if (celebrate && m > 1) {
      pendingCascadeMult = m;
      multTab.classList.add("pump");
      if (FX) { const r = multTab.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2; FX.sparkle(cx, cy); FX.burst(cx, cy, 8, 0.55); FX.shake(4, 0.2); }
      SND.multUp(m);
    } else if (m <= 1) {
      pendingCascadeMult = 0;
    }
  }
  function multBadgeCenter() { const r = multTab.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
  function clearCascadeMultFliers() {
    document.querySelectorAll(".cascade-mult-fly").forEach((e) => e.remove());
  }
  function cascadeMultUrl(m) {
    const exact = Math.max(1, Math.round(Number(m) || 1));
    const capped = Math.max(1, Math.min(8, exact));
    return uiAsset("multX" + exact) || uiAsset("multX" + capped) || uiAsset("multX8") || uiAsset("multX5") || uiAsset("multX1");
  }
  function stickCascadeMultToCell(col, row, url) {
    const cell = cellAt(col, row);
    if (!cell) return;
    cell.querySelectorAll(".cascade-mult-chip").forEach((e) => e.remove());
    const chip = document.createElement("span");
    chip.className = "cascade-mult-chip";
    chip.setAttribute("aria-hidden", "true");
    chip.style.setProperty("--cascade-mult-img", `url("${url}")`);
    cell.appendChild(chip);
  }
  // The multiplier chips leave the badge on a rising arc, overshoot slightly and
  // slam onto their winning tiles (impact pulse + sparkle) -- not a straight lerp.
  async function flyCascadeMultToWins(mult, keys) {
    const url = cascadeMultUrl(mult);
    const unique = [...new Set(keys || [])];
    if (!url || !unique.length) return;
    clearCascadeMultFliers();
    const start = multBadgeCenter();
    const dur = Math.max(320, 560 * SPD());
    const jobs = unique.map((key, i) => new Promise((resolve) => {
      const [col, row] = key.split(",").map(Number);
      const target = cellCenter(col, row);
      const delay = Math.min(i * 55, 240);
      const fly = document.createElement("span");
      fly.className = "cascade-mult-fly";
      fly.setAttribute("aria-hidden", "true");
      fly.style.left = start.x + "px";
      fly.style.top = start.y + "px";
      fly.style.setProperty("--cascade-mult-img", `url("${url}")`);
      document.body.appendChild(fly);
      const dx = target.x - start.x, dy = target.y - start.y;
      const arc = Math.max(36, Math.min(130, Math.hypot(dx, dy) * 0.24)); // arc height scales with distance
      const land = () => {
        stickCascadeMultToCell(col, row, url);
        const cell = cellAt(col, row);
        if (cell) { cell.classList.remove("mult-hit"); void cell.offsetWidth; cell.classList.add("mult-hit"); setTimeout(() => cell.classList.remove("mult-hit"), 380); }
        if (FX) FX.sparkle(target.x, target.y);
        fly.remove();
        resolve();
      };
      if (typeof fly.animate === "function") {
        const anim = fly.animate([
          { transform: "translate(-50%,-50%) scale(.35) rotate(-12deg)", opacity: 0, offset: 0 },
          { transform: `translate(calc(-50% + ${dx * 0.18}px),calc(-50% + ${dy * 0.18 - arc * 0.7}px)) scale(1.1) rotate(-2deg)`, opacity: 1, offset: 0.22 },
          { transform: `translate(calc(-50% + ${dx * 0.62}px),calc(-50% + ${dy * 0.62 - arc}px)) scale(1) rotate(4deg)`, opacity: 1, offset: 0.6 },
          { transform: `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(.52) rotate(9deg)`, opacity: 1, offset: 1 },
        ], { duration: dur, delay, easing: "cubic-bezier(.32,.08,.24,1)", fill: "forwards" });
        anim.onfinish = land;
      } else {
        // ancient-webview fallback: straight transition
        fly.style.transition = `transform ${dur}ms cubic-bezier(.32,.08,.24,1) ${delay}ms,opacity .16s ease-out ${delay}ms`;
        void fly.offsetWidth;
        requestAnimationFrame(() => {
          fly.style.opacity = "1";
          fly.style.transform = `translate(calc(-50% + ${Math.round(dx)}px),calc(-50% + ${Math.round(dy)}px)) scale(.52) rotate(9deg)`;
        });
        setTimeout(land, dur + delay + 45);
      }
    }));
    await Promise.all(jobs);
    await sleep(120);
  }
  // a floating "xN" readout: rises and fades, or flies to the Wolf badge
  function floatMult(x, y, text, cls, toBadge) {
    const el = document.createElement("div"); el.className = "mfloat " + cls; el.textContent = text;
    el.style.left = x + "px"; el.style.top = y + "px"; document.body.appendChild(el);
    requestAnimationFrame(() => {
      if (toBadge) { const b = multBadgeCenter(); el.style.transform = `translate(calc(-50% + ${Math.round(b.x - x)}px),calc(-50% + ${Math.round(b.y - y)}px)) scale(.55)`; el.style.opacity = "0"; }
      else { el.style.transform = "translate(-50%,-150%) scale(1.12)"; el.style.opacity = "0"; }
    });
    setTimeout(() => el.remove(), 760);
  }
  // Premium celebration banner: gold-framed pill with icon, title and subline,
  // ray burst behind it and a shine sweep across -- replaces the old raw-text burst.
  function celebrate({ icon, title, sub, holdMs = 1100 }) {
    overlay.querySelectorAll(".celebrate").forEach((e) => e.remove());
    const el = document.createElement("div");
    el.className = "celebrate";
    el.innerHTML =
      '<div class="celebrate-rays" aria-hidden="true"></div>' +
      '<div class="celebrate-card">' +
      (icon ? `<span class="celebrate-ico">${icoHTML(icon)}</span>` : "") +
      `<span class="celebrate-txt${sub ? "" : " solo"}"><b>${title}</b>${sub ? `<small>${sub}</small>` : ""}</span>` +
      "</div>";
    overlay.appendChild(el);
    setTimeout(() => el.classList.add("out"), holdMs);
    setTimeout(() => el.remove(), holdMs + 400);
  }
  let toastT;
  function toast(t, bonus = false) { toastEl.innerHTML = t; toastEl.className = "toast show" + (bonus ? " bonus" : ""); clearTimeout(toastT); toastT = setTimeout(() => (toastEl.className = "toast hidden"), 1600); }
  function countWin(toMult) {
    const from = dispWin * bet(), to = toMult * bet(), t0 = performance.now(), dur = 420; dispWin = toMult;
    (function step(t) { const k = Math.min(1, (t - t0) / dur); winEl.textContent = fmt(from + (to - from) * k); if (k < 1) requestAnimationFrame(step); })(performance.now());
    winEl.classList.remove("big"); void winEl.offsetWidth; if (toMult > 0) winEl.classList.add("big");
  }

  // ---- event player -------------------------------------------------------
  async function play(book, mode) {
    let roundWin = 0; dispWin = 0; winEl.textContent = fmt(0); casc = 0; lastMult = 1; pendingCascadeMult = 0; clearCascadeMultFliers();
    currentMode = mode;
    roundHadBonusTrigger = false;
    curGametype = mode === "base" ? "basegame" : "freegame"; setMult(1); setPhase();
    syncHouseUI(curGametype === "freegame" ? currentBricks : 0);
    const events = book.events || [];
    currentPlayEvents = events;
    for (let eventIndex = 0; eventIndex < events.length; eventIndex += 1) {
      const ev = events[eventIndex];
      switch (ev.type) {
        case "reveal": {
          curGametype = ev.gametype; explodeMap = null; clearCellFx();
          glow.className = "board-glow" + (ev.gametype === "freegame" ? " bonus" : ""); setStorm(ev.gametype === "freegame"); setPhase(); SND.spin();
          await spinReels(ev.board);                 // reel-strip slide: reel-stops + anticipation built in
          const sc = ev.board.reduce((a, cA) => a + cA.filter((id) => SYM[id] && SYM[id].scatter).length, 0);
          if (sc >= 2) await sleep(300);             // let a 2+ pot board breathe before the next event
          await collectBoardBricks(ev.board, eventIndex, null, null, false);
          break;
        }
        case "updateGlobalMult": {
          const up = ev.globalMult > lastMult; lastMult = ev.globalMult;
          setMult(ev.globalMult, up);   // the prominent Wolf badge IS the multiplier display now
          break;
        }
        case "wildLand":
          ev.wilds.forEach((w) => {
            if (w.multiplier > 1) {
              const c = cellAt(w.position[0], w.position[1]);
              const t = document.createElement("span");
              t.className = "wmult";
              t.textContent = "x" + w.multiplier;
              const badge = uiAsset("wolfMultBadge");
              if (badge) t.style.setProperty("--wolf-mult-badge", `url("${badge}")`);
              c.appendChild(t);
              c.classList.add("sticky");
            }
          });
          break;
        case "winInfo": {
          const ks = new Set(); ev.wins.forEach((w) => w.positions.forEach((p) => ks.add(p[0] + "," + p[1])));
          const wd = 0.55 * SPD() + "s";
          cells.forEach((c, i) => { const col = i % REELS, row = (i / REELS) | 0; const w = ks.has(col + "," + row); if (w) { const s = c.querySelector(".sym"); if (s) s.style.animationDuration = wd; } c.classList.toggle("win", w); c.classList.toggle("dim", !w); });
          if (FX) {
            // particles are the accent, not the wallpaper: per-tile sparkles only for
            // small clusters; big clusters get ONE burst at the cluster centre.
            let sx = 0, sy = 0, n = 0;
            const pts = [...ks].map((key) => { const [col, row] = key.split(",").map(Number); return cellCenter(col, row); });
            pts.forEach((p) => { sx += p.x; sy += p.y; n++; });
            if (n && n <= 6) pts.forEach((p) => FX.sparkle(p.x, p.y));
            else if (n) { FX.sparkle(sx / n, sy / n); FX.burst(sx / n, sy / n, 10, 0.7); }
            const amp = Math.min(15, ev.stepWin * 0.7 + (lastMult - 1) * 2); // shake scales with win size AND wolf mult
            if (amp > 2.5) FX.shake(amp, 0.28);
            // show EXACTLY what multiplied what: each win's summed wild xN pops on its tiles.
            ev.wins.forEach((w) => {
              if (w.wildMult > 1) { let wx = 0, wy = 0; w.positions.forEach(([c, r]) => { const p = cellCenter(c, r); wx += p.x; wy += p.y; }); floatMult(wx / w.positions.length, wy / w.positions.length - 6, "x" + w.wildMult, "wild", false); }
            });
          }
          const cascadeMult = pendingCascadeMult || (ev.multiplier > 1 ? ev.multiplier : 0);
          pendingCascadeMult = 0;
          if (cascadeMult > 1 && ks.size) await flyCascadeMultToWins(cascadeMult, [...ks]);
          roundWin += ev.stepWin; countWin(roundWin); glow.classList.add("active"); SND.win(casc++); await sleep(620); glow.classList.remove("active"); cells.forEach((c) => c.classList.remove("dim")); break;
        }
        case "tumbleBoard":
          wolfEl.classList.add("blow"); SND.puff();
          explodeMap = {};
          { const bd = 0.42 * SPD() + "s"; ev.explodePositions.forEach(([c, r]) => { (explodeMap[c] || (explodeMap[c] = new Set())).add(r); const cell = cellAt(c, r); const s = cell.querySelector(".sym"); if (s) s.style.animationDuration = bd; cell.classList.add("explode"); if (FX) { const p = cellCenter(c, r); FX.explode(p.x, p.y); } }); }
          await sleep(430); wolfEl.classList.remove("blow"); break;
        case "dropBoard": {
          const prevBoard = cloneBoard(curBoard);
          const removedMap = explodeMap;
          if (explodeMap) animateColumns(ev.board, explodeMap); else setStatic(ev.board);
          explodeMap = null; SND.drop();
          // a soup-pot may have tumbled in -> glow every pot now showing (chase the 3rd)
          let sc = 0; for (let c = 0; c < REELS; c++) for (let r = 0; r < ROWS; r++) if (SYM[ev.board[c][r]] && SYM[ev.board[c][r]].scatter) { cellAt(c, r).classList.add("scat-hot"); sc++; }
          if (sc >= 2) SND.scatter();
          await sleep(400);
          await collectBoardBricks(ev.board, eventIndex, prevBoard, removedMap, true);
          break;
        }
        case "scatterPay":
          celebrate({ icon: "pot", title: "SCATTER", sub: `${ev.scatters}× ${I18N.t("word.pays")} ${fmt(ev.amount * bet())}` });
          SND.scatter(); if (FX) FX.shake(5, 0.3);
          await sleep(950); break;
        case "freeSpinTrigger":
          roundHadBonusTrigger = true;
          if (curGametype === "freegame") { // retrigger: full celebration, not a toast
            (ev.positions || []).forEach((p) => { const c = cellAt(p[0], p[1]); if (c) c.classList.add("scat-hot"); if (FX) { const cc = cellCenter(p[0], p[1]); FX.sparkle(cc.x, cc.y); } });
            celebrate({ icon: "pot", title: I18N.t("cine.extraSpins", { n: ev.spinsAwarded }), sub: I18N.t("retrigger.sub"), holdMs: 1250 });
            SND.trigger();
            if (FX) { FX.shake(8, 0.45); FX.confetti(innerWidth / 2, innerHeight * 0.42, 26); }
            await sleep(1450);
          } else { // base-game trigger: celebrate the pots before the bonus intro
            ev.positions.forEach((p) => { cellAt(p[0], p[1]).classList.add("scat-hot"); if (FX) { const c = cellCenter(p[0], p[1]); FX.sparkle(c.x, c.y); FX.burst(c.x, c.y, 8, 0.6); } });
            celebrate({ icon: "pot", title: `${ev.scatters}× SCATTER`, holdMs: 1000 });
            SND.scatter(); SND.trigger(); if (FX) FX.shake(8, 0.5);
            await sleep(1100);
          }
          break;
        case "enterFreeGame": {
          await freeIntro(ev);
          housePanel.classList.remove("hidden");
          curGametype = "freegame";
          houseLabel = ev.house;
          fsTot = ev.totalSpins;
          fsNow = 0;
          const lvl = { "Stroh-Haus": 1, "Holz-Haus": 2, "Ziegel-Festung": 3 }[ev.house] || 1;
          currentBricks = Math.max(0, Number.isFinite(Number(ev.bricks)) ? Number(ev.bricks) : (currentMode === "bonus_vip" ? 5 : 0));
          setHouse(lvl, ev.house, currentBricks);
          syncHouseUI(currentBricks);
          completedHouseStages = new Set([1]);
          safeHouse("completeStrawIntro");
          await completeReachedHouses(currentBricks, false);
          fsCount.textContent = `0 / ${ev.totalSpins}`;
          setPhase();
          break;
        }
        case "updateFreeSpin": fsNow = ev.current; fsTot = ev.total; fsCount.textContent = `${ev.current} / ${ev.total}`; setPhase(); break;
        case "collectBrick": {
          await collectBrickVisual(ev.position, ev.bricks, true);
          break;
        }
        case "houseUpgrade": {
          const level = Math.max(1, Math.min(3, Number(ev.level) || 1));
          if (!completedHouseStages.has(level)) await houseCine(ev); // full cinematic: house art slams in
          completedHouseStages.add(level);
          safeHouse("completeStage", level);
          setHouse(ev.level, ev.house, Math.max(Number(ev.bricks) || 0, currentBricks));               // update the panel ring to the new level
          const ring = $("house-ring"); if (ring) { ring.classList.remove("near"); ring.classList.add("flash"); setTimeout(() => ring.classList.remove("flash"), 900); }
          glow.className = "board-glow bonus";
          break;
        }
        case "exitFreeGame": {
          housePanel.classList.add("hidden"); setStorm(false); glow.className = "board-glow"; curGametype = "basegame"; syncHouseUI(0);
          if (ev.totalWin > 0) {
            celebrate({ icon: "pig", title: fmt(ev.totalWin * bet()), sub: I18N.t("fs.totalWin"), holdMs: 1300 });
            if (FX) { const c = winBarCenter(); FX.burst(c.x, c.y, 10, 0.8); }
            await sleep(1500);
          }
          completedHouseStages = new Set();
          break;
        }
        case "setTotalWin": roundWin = ev.amount; countWin(roundWin); break;
        case "finalWin": await settle(ev); break;
      }
    }
    return roundWin;
  }
  // ---- house upgrade meter (organic ring + level chips, no progress bar) ----
  function setHouse(level, name, bricks) {
    currentHouseLevel = level;
    houseLabel = name; houseName.textContent = I18N.houseName(level);
    houseEmoji.innerHTML = icoHTML("house" + level);
    housePanel.dataset.level = String(level);
    const L = CFG.features.houseLevels;
    const cur = L.find((l) => l.level === level) || L[0], nx = L.find((l) => l.level === level + 1);
    bricksFloor = cur.bricks || 0;
    bricksTarget = nx ? nx.bricks : cur.bricks;
    const chips = $("house-levels"); if (chips) chips.querySelectorAll(".hl").forEach((el) => el.classList.toggle("on", +el.dataset.l <= level));
    paintHouseStages(level);
    updateBricks(bricks);
  }
  function updateBricks(b) {
    currentBricks = Math.max(0, Number(b) || 0);
    const displayBricks = Math.max(bricksFloor, currentBricks);
    const span = bricksTarget - bricksFloor, p = span > 0 ? Math.min(1, Math.max(0, (displayBricks - bricksFloor) / span)) : 1;
    const ring = $("house-ring");
    if (ring) {
      ring.style.setProperty("--p", p);
      ring.classList.toggle("near", span > 0 && p >= 0.6);
    }
    brickLabel.innerHTML = span > 0 ? `${chip("brick")} ${displayBricks - bricksFloor} / ${span}` : `${chip("brick")} MAX`;
    paintBrickRack(currentBricks);
    syncHouseUI(currentBricks);
  }
  function paintHouseStages(level) {
    housePanel.querySelectorAll("[data-house-stage]").forEach((el) => {
      const l = +el.dataset.houseStage;
      el.classList.toggle("active", l === level);
      el.classList.toggle("complete", l < level);
      if (!el.dataset.painted) { el.dataset.painted = "1"; el.innerHTML = icoHTML("house" + l); }
    });
  }
  function paintBrickRack(bricks) {
    const slots = [...document.querySelectorAll("#brick-rack span")];
    slots.forEach((slot, i) => slot.classList.toggle("filled", i < Math.min(10, Math.max(0, bricks))));
  }
  function houseDisplayName(level, fallback) {
    return I18N.houseName(level) || fallback || "";
  }
  function houseCompleteEvent(level, bricks) {
    const lvl = Math.max(1, Math.min(3, Number(level) || 1));
    const cfg = (CFG.features.houseLevels || []).find((h) => h.level === lvl) || {};
    return { level: lvl, house: houseDisplayName(lvl, cfg.name), bricks: Math.max(Number(bricks) || 0, cfg.bricks || 0), extraSpins: cfg.extra_spins || 0 };
  }
  async function completeReachedHouses(rawBricks, playCine) {
    const raw = Math.max(0, Number(rawBricks) || 0);
    const stages = [];
    if (raw >= 5) stages.push(2);
    if (raw >= 10) stages.push(3);
    for (const level of stages) {
      if (completedHouseStages.has(level)) continue;
      completedHouseStages.add(level);
      const ev = houseCompleteEvent(level, raw);
      safeHouse("completeStage", level);
      if (playCine) await houseCine(ev);
      setHouse(level, ev.house, raw);
    }
  }
  function pulseRing() {
    safeHouse("pulseTarget", currentBricks);
    const target = getBrickSlot(currentBricks) || $("house-panel");
    if (!target) return;
    target.classList.remove("tick"); void target.offsetWidth; target.classList.add("tick");
  }
  function getBrickSlot(bricksAfter) {
    const uiTarget = safeHouse("getBrickTarget", bricksAfter);
    if (uiTarget) return uiTarget;
    const slots = document.querySelectorAll("#brick-rack span");
    if (!slots.length) return null;
    return slots[Math.max(0, Math.min(slots.length - 1, bricksAfter - 1))];
  }
  function flyBrickToHouse(cell, bricksAfter) {
    const target = getBrickSlot(bricksAfter) || $("house-panel");
    if (!target || !cell) return;
    const a = cell.getBoundingClientRect(), b = target.getBoundingClientRect();
    const ax = a.left + a.width / 2, ay = a.top + a.height / 2;
    const fly = document.createElement("div"); fly.className = "brick-fly"; fly.innerHTML = icoHTML("brick");
    fly.style.left = ax + "px"; fly.style.top = ay + "px"; document.body.appendChild(fly);
    const dx = b.left + b.width / 2 - ax, dy = b.top + b.height / 2 - ay;
    requestAnimationFrame(() => { fly.style.transform = `translate(${dx}px,${dy}px) scale(.45)`; fly.style.opacity = "0"; });
    setTimeout(() => fly.remove(), 720);
  }
  async function collectBrickVisual(position, bricksAfter, waitForArrival) {
    if (!position) return;
    const rawAfter = Math.max(Number(bricksAfter) || 0, currentBricks + 1);
    const c = cellAt(position[0], position[1]);
    flyBrickToHouse(c, rawAfter);
    if (c) c.classList.add("collected");
    if (FX) { const p = cellCenter(position[0], position[1]); FX.sparkle(p.x, p.y); }
    const land = async () => {
      updateBricks(rawAfter);
      pulseRing();
      SND.brick();
      await completeReachedHouses(rawAfter, true);
    };
    if (waitForArrival) {
      await sleep(420);
      await land();
      await sleep(170);
    } else {
      setTimeout(() => { land(); }, Math.max(80, 350 * SPD()));
    }
  }
  function nextBoardMutation(events, fromIndex) {
    for (let i = fromIndex + 1; i < events.length; i += 1) {
      if (["reveal", "dropBoard", "updateFreeSpin", "exitFreeGame"].includes(events[i].type)) return i;
    }
    return events.length;
  }
  function hasUpcomingExplicitCollect(events, fromIndex, col, row) {
    const end = nextBoardMutation(events, fromIndex);
    for (let i = fromIndex + 1; i < end; i += 1) {
      const ev = events[i];
      if (ev.type === "collectBrick" && ev.position && ev.position[0] === col && ev.position[1] === row) return true;
    }
    return false;
  }
  function isSurvivingBrick(prevBoard, removedMap, col, row) {
    if (!prevBoard || !prevBoard[col]) return false;
    if (!removedMap || !removedMap[col] || !removedMap[col].size) {
      return prevBoard[col][row] === "BR";
    }
    const removed = removedMap[col];
    const kept = [];
    for (let r = 0; r < ROWS; r += 1) if (!removed.has(r)) kept.push(r);
    const missing = removed.size;
    if (row < missing) return false;
    const oldRow = kept[row - missing];
    return oldRow != null && prevBoard[col][oldRow] === "BR";
  }
  async function collectBoardBricks(board, eventIndex, prevBoard, removedMap, fromDrop) {
    if (curGametype !== "freegame" || !board) return;
    const bookEvents = currentPlayEvents || [];
    const tasks = [];
    for (let col = 0; col < REELS; col += 1) {
      for (let row = 0; row < ROWS; row += 1) {
        if (!board[col] || board[col][row] !== "BR") continue;
        if (hasUpcomingExplicitCollect(bookEvents, eventIndex, col, row)) continue;
        if (fromDrop && isSurvivingBrick(prevBoard, removedMap, col, row)) continue;
        tasks.push([col, row]);
      }
    }
    let next = currentBricks;
    for (const pos of tasks) {
      next += 1;
      await collectBrickVisual(pos, next, false);
    }
  }
  // cinematic free-spin trigger: pot + wolf burst in, screen shake, confetti,
  // crossfade, then the storm rolls in for the bonus.
  async function freeIntro(ev) {
    fsFlash.innerHTML =
      `<div class="fs-splash-card">` +
      `<img class="fs-splash-img" src="${uiAsset("freeSpinsSplash") || "assets/ui/free-spins-splash.webp"}" alt="">` +
      `<div class="fs-splash-copy"><span>${I18N.t("fs.build")}</span><h1>${I18N.t("fs.freespins")}</h1><p>${I18N.t("fs.collect", { n: ev.totalSpins })}</p></div>` +
      `</div>`;
    fsFlash.className = "fs-flash zoom";
    SND.trigger();
    if (FX) { FX.shake(10, 0.6); const cx = innerWidth / 2, cy = innerHeight * 0.42; FX.confetti(cx, cy, 44); FX.coinShower(1.7, 18); }
    setStorm(true);
    await sleep(1950);
    fsFlash.className = "fs-flash hidden";
  }
  // ---- free-spins environment (warm glow + occasional flash) -------------
  let ltTimer = null;
  function setStorm(on) {
    const s = $("fs-storm"); if (s) s.classList.toggle("on", on);
    document.body.classList.toggle("fs-active", on);   // warm glowing reel frame etc.
    clearTimeout(ltTimer);
    if (on) ltTimer = setTimeout(lightning, 2200 + Math.random() * 3500);
  }
  function lightning() {
    const s = $("fs-storm"), el = $("fs-lightning");
    if (!s || !el || !s.classList.contains("on")) return;
    el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash");
    if (SND.thunder) SND.thunder();
    ltTimer = setTimeout(lightning, 6000 + Math.random() * 8000);
  }
  // cinematic house upgrade: rays + the new house art slams in + bold title
  async function houseCine(ev) {
    const ov = $("house-cine"); if (!ov) return;
    $("hc-house").innerHTML = houseFullHTML(ev.level);
    $("hc-title").textContent = houseDisplayName(ev.level, ev.house);
    $("hc-sub").textContent = ev.extraSpins ? I18N.t("cine.extraSpins", { n: ev.extraSpins }) : I18N.t("cine.complete");
    ov.classList.remove("hidden");
    const h = $("hc-house"); h.classList.remove("smash"); void h.offsetWidth; h.classList.add("smash");
    (SND.houseComplete || SND.upgrade).call(SND);
    if (FX) { FX.shake(12, 0.6); const cx = innerWidth / 2, cy = innerHeight * 0.45; setTimeout(() => { FX.explode(cx, cy, "#ffcaa0"); FX.confetti(cx, cy, 50); FX.coinShower(1.5, 16); SND.winTier(1); }, 260); }
    await sleep(1850);
    ov.classList.add("hidden");
  }
  async function settle(ev) {
    const m = ev.amount;
    if (STAKE.active && !stakeLocalRound) {
      const winAmount = m * bet();
      const shouldEndRound = winAmount > 0;
      const settled = shouldEndRound ? await STAKE.endRound({ win: winAmount, state: gameState() }) : null;
      const synced = STAKE.getBalance();
      if (synced != null) balance = synced;
      else if (settled && settled.localFallback) balance = r2(balance + winAmount);
    } else {
      balance = r2(balance + m * bet());
    }
    stakeLocalRound = false;
    balanceEl.textContent = fmt(balance); countWin(m);
    if (ev.wincapReached) await showBigWin(3, m, true);
    else if (m >= 150) await showBigWin(3, m);
    else if (m >= 50) await showBigWin(2, m);
    else if (m >= 15) await showBigWin(1, m);
    else {
      if (m > 0) {
        if (FX) { const c = winBarCenter(); FX.burst(c.x, c.y, 9, 0.7); if (m >= 4) FX.shake(Math.min(8, m * 0.5), 0.25); }
        if (!roundHadBonusTrigger && SND.smallWin) SND.smallWin(); else SND.win(2);
      }
      await sleep(m > 0 ? 420 : 90);
    }
    setMult(1); lastMult = 1; setPhase();
  }

  // ---- spin / auto --------------------------------------------------------
  function pickBook(mode) { const l = BOOKS[mode] || []; if (!l.length) return demoBook(); let t = 0; for (const b of l) t += b.weight || 1; let r = Math.random() * t; for (const b of l) { r -= b.weight || 1; if (r <= 0) return b; } return l[l.length - 1]; }
  async function doSpin(mode) {
    if (busy) return; SND.unlock(); closePops();
    const cost = r2((mode === "base" ? 1 : mode === "bonus" ? buyA : buyB) * bet());
    if (balance < cost) { toast(I18N.t("toast.noBalance")); autoLeft = 0; return; }
    busy = true; spinBtn.disabled = true; spinBtn.classList.add("spinning"); ctlEnable(false);
    let book = null;
    stakeLocalRound = false;
    try {
      if (STAKE.active) {
        const stakeRound = await STAKE.play({ amount: cost, mode, bet: bet() });
        book = stakeRound && stakeRound.book;
        stakeLocalRound = !!(stakeRound && stakeRound.localFallback);
        if (stakeLocalRound) balance = r2(balance - cost);
        else {
          const synced = STAKE.getBalance();
          if (synced != null) balance = synced;
        }
      } else {
        balance = r2(balance - cost);
      }
      balanceEl.textContent = fmt(balance); overlay.innerHTML = ""; setMult(1); clearCascadeMultFliers();
      book = book || pickBook(mode);
      if (book.serverSeedHash) $("seed-hash").textContent = book.serverSeedHash.slice(0, 22) + "...";
      await play(book, mode);
    } catch (err) {
      console.warn("[game] spin failed", err);
      toast(I18N.t("toast.notReady"));
      autoLeft = 0;
    }
    busy = false; spinBtn.disabled = false; spinBtn.classList.remove("spinning"); ctlEnable(true);
  }
  function ctlEnable(on) { ["bet-up", "bet-down", "btn-buy"].forEach((id) => ($(id).disabled = !on)); }
  async function runAuto() {
    while (autoLeft > 0) {
      while (busy) await sleepReal(120);      // wait for the running round instead of silently dying
      if (autoLeft <= 0) break;
      autoNEl.textContent = autoLeft; await doSpin("base"); autoLeft--;
      autoNEl.textContent = autoLeft > 0 ? autoLeft : ""; if (autoLeft <= 0) break; await sleep(280);
    }
    $("btn-auto").classList.remove("on"); autoNEl.textContent = "";
  }

  // ---- paytable -----------------------------------------------------------
  function buildPaytable() {
    const order = ["W", "S", "P1", "P2", "P3", "M1", "M2", "M3", "A", "K", "Q", "J", "BR"], grid = $("paytable-grid"); grid.innerHTML = "";
    const linePay = (t) => `5x <b>${fmtMult(t[5])}</b> &middot; 4x ${fmtMult(t[4])} &middot; 3x ${fmtMult(t[3])}`;
    order.forEach((id) => {
      const s = SYM[id]; if (!s) return; let pay = "";
      if (CFG.paytable[id]) pay = linePay(CFG.paytable[id]);
      else if (s.scatter) pay = linePay(CFG.scatterPays);
      else if (s.wild) pay = `<small>${I18N.t("pay.wild")}</small>`;
      else if (s.collectible) pay = `<small>${I18N.t("pay.brick")}</small>`;
      grid.insertAdjacentHTML("beforeend", `<div class="pt-row"><div class="pt-ico">${symInner(id)}</div><div class="pt-vals"><span class="pt-name">${I18N.symName(id) || s.name || id}</span><span class="pt-pay">${pay}</span></div></div>`);
    });
  }

  // ---- popovers / buttons -------------------------------------------------
  function closePops() { $("menu-pop").classList.add("hidden"); $("buy-pop").classList.add("hidden"); }
  function togglePop(id) { const p = $(id), open = p.classList.contains("hidden"); closePops(); if (open) p.classList.remove("hidden"); }
  function openModal(id) { closePops(); $(id).classList.remove("hidden"); }
  function refreshBet() {
    betEl.textContent = fmt(bet());
    $("buy-a-cost").textContent = fmtMult(buyA) + I18N.t("buy.xbet");
    $("buy-b-cost").textContent = fmtMult(buyB) + I18N.t("buy.xbet");
    const aPrice = $("buy-a-price"), bPrice = $("buy-b-price");
    if (aPrice) aPrice.textContent = fmt(bet() * buyA);
    if (bPrice) bPrice.textContent = fmt(bet() * buyB);
  }
  function openBuyConfirm(mode) {
    if (busy) return;                          // no buy flow while a round is running
    if (mode !== "bonus" && mode !== "bonus_vip") return;
    pendingBuy = mode;
    const mult = mode === "bonus" ? buyA : buyB, ico = mode === "bonus" ? "house1" : "house2";
    $("bc-name").textContent = mode === "bonus" ? I18N.t("buy.aName") : I18N.t("buy.bName");
    const bcIco = $("bc-ico"); bcIco.dataset.ico = ico; bcIco.dataset.painted = ""; bcIco.innerHTML = icoHTML(ico);
    $("bc-bet").textContent = I18N.t("confirm.betLine", { bet: fmt(bet()), mult: fmtMult(mult) });
    $("bc-cost").textContent = fmt(mult * bet());
    openModal("modal-buy-confirm");
  }
  function refreshMeta() {
    $("meta-rtp").textContent = fmtPct(CFG.rtp * 100);
    $("meta-max").textContent = CFG.wincap.toLocaleString(I18N.locale()) + "x";
  }
  function refreshPortraitGuard() {
    const ov = $("portrait-rotate"); if (!ov) return;
    const portrait = window.matchMedia && window.matchMedia("(orientation: portrait)").matches;
    const small = Math.min(innerWidth, innerHeight) <= 760 || (window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
    ov.classList.toggle("hidden", !(portrait && small));
  }

  function wire() {
    spinBtn.onclick = () => doSpin("base");
    $("bet-up").onclick = () => { betOverride = null; betIdx = Math.min(BETS.length - 1, betIdx + 1); refreshBet(); };
    $("bet-down").onclick = () => { betOverride = null; betIdx = Math.max(0, betIdx - 1); refreshBet(); };
    $("btn-turbo").onclick = () => { turbo = !turbo; $("btn-turbo").classList.toggle("on", turbo); };
    $("btn-auto").onclick = () => { if (autoLeft > 0) { autoLeft = 0; } else { autoLeft = 25; $("btn-auto").classList.add("on"); runAuto(); } };
    $("btn-menu").onclick = (e) => { e.stopPropagation(); togglePop("menu-pop"); };
    $("btn-buy").onclick = (e) => { e.stopPropagation(); togglePop("buy-pop"); };
    $("menu-pop").onclick = (e) => e.stopPropagation();
    $("buy-pop").onclick = (e) => { e.stopPropagation(); if (e.target === $("buy-pop")) closePops(); };
    $("menu-pop").querySelectorAll("button").forEach((b) => (b.onclick = () => {
      const a = b.dataset.act;
      if (a === "help") openModal("modal-help");
      else if (a === "paytable") openModal("modal-paytable");
      else if (a === "sound") { muted = SND.toggle(); $("sound-state").textContent = muted ? I18N.t("sound.off") : I18N.t("sound.on"); const si = $("sound-ico"); if (si) si.innerHTML = icoHTML(muted ? "soundOff" : "sound"); }
    }));
    $("buy-pop").querySelectorAll("[data-buy]").forEach((b) => (b.onclick = () => { closePops(); openBuyConfirm(b.dataset.buy); }));
    document.querySelectorAll("[data-pop-close]").forEach((b) => (b.onclick = (e) => { e.stopPropagation(); closePops(); }));
    // Explicit confirmation before spending a >2x bet-mode (Stake approval #14/#23):
    // a buy can never fire from a single button -- it always shows the real cost first.
    $("bc-confirm").onclick = () => { if (busy) return; const m = pendingBuy; pendingBuy = null; $("modal-buy-confirm").classList.add("hidden"); if (m) doSpin(m); }; // double-click safe: doSpin's busy latch + cleared pendingBuy
    $("bc-cancel").onclick = () => { pendingBuy = null; $("modal-buy-confirm").classList.add("hidden"); };
    document.querySelectorAll("[data-close]").forEach((b) => (b.onclick = () => { const m = b.closest(".modal"); if (m) m.classList.add("hidden"); }));
    document.querySelectorAll(".modal").forEach((m) => (m.onclick = (e) => { if (e.target === m) m.classList.add("hidden"); }));
    document.addEventListener("click", closePops);
    document.addEventListener("keydown", (e) => { if (e.code === "Space" && !busy) { e.preventDefault(); doSpin("base"); } });
    window.addEventListener("resize", refreshPortraitGuard);
    window.addEventListener("orientationchange", refreshPortraitGuard);
    refreshPortraitGuard();
  }

  // ---- juice helpers ------------------------------------------------------
  const FX = window.PIGGY_FX;
  // ---- UI icons (no emoji) ------------------------------------------------
  const IC = window.PIGGY_ICONS || {};
  function icoHTML(name) {
    if (!name) return "";
    const A = window.PIGGY_ASSETS || {}, ui = A.ui || {}, symbols = A.symbols || {};
    const img = (src, cls = "ico-img") => `<img class="${cls}" src="${src}" alt="">`;
    if (name.indexOf("house") === 0) {
      const lvl = +name.slice(5) || 1, url = ui["house" + lvl];
      return url ? img(url, "ico-img house-img") : (IC.house ? IC.house(lvl) : "");
    }
    const uiName = { bolt: "iconBolt", menu: "iconMenu", auto: "iconAuto", info: "iconInfo", table: "iconTable", sound: "iconSound", lock: "iconLock" }[name];
    if (uiName && ui[uiName]) return img(ui[uiName]);
    if (name === "brick" && ui.brickToken) return img(ui.brickToken);
    const symName = { wolf: "W", pot: "S", brick: "BR", pig: "P1" }[name];
    if (symName && symbols[symName]) return img(symbols[symName]);
    if (name === "coin" && ui.coin) return img(ui.coin);
    if (name === "wind" && ui.wind) return img(ui.wind);
    const v = IC[name]; return typeof v === "function" ? v() : (v || "");
  }
  const chip = (name) => `<span class="ui-ico">${icoHTML(name)}</span>`;
  function houseFullHTML(level) {
    const ui = ((window.PIGGY_ASSETS || {}).ui) || {};
    const url = {
      1: ui.strawHouseFull || "assets/ui/strohhaus.webp",
      2: ui.stoneHouseFull || "assets/ui/steinhaus.webp",
      3: ui.fortressHouseFull || "assets/ui/festung.webp",
    }[Math.max(1, Math.min(3, +level || 1))];
    return url ? `<img class="hc-house-full" src="${url}" alt="">` : icoHTML("house" + level);
  }
  function paintIcons(root) {
    (root || document).querySelectorAll("[data-ico]").forEach((el) => {
      if (el.dataset.painted) return; el.dataset.painted = "1"; el.innerHTML = icoHTML(el.dataset.ico);
    });
    const lv = $("house-levels"); if (lv) lv.querySelectorAll(".hl").forEach((el) => { if (!el.firstChild) el.innerHTML = icoHTML("house" + el.dataset.l); });
  }
  const easeOut = (k) => 1 - Math.pow(1 - k, 3);
  function cellCenter(col, row) { const r = cellAt(col, row).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
  function winBarCenter() { const r = winEl.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
  function gameState() {
    return {
      mode: currentMode,
      gametype: curGametype,
      bet: bet(),
      balance,
      board: cloneBoard(curBoard),
      multiplier: lastMult,
      freeSpins: { current: fsNow, total: fsTot },
      house: { label: houseLabel, level: currentHouseLevel, bricks: currentBricks, visualTotal: curGametype === "freegame" ? 5 + currentBricks : 0 },
      win: dispWin,
    };
  }

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
        // count-up coupled to a rumble that GROWS as the number climbs (proportional to tier)
        if (t - shT > 170) { shT = t; FX.shake(2.5 + tier * 1.5 + k * (3 + tier * 2.5), 0.2); }
        if (k < 1) requestAnimationFrame(step); else { aEl.textContent = fmt(target); aEl.classList.remove("land"); void aEl.offsetWidth; aEl.classList.add("land"); res(); }
      }
      requestAnimationFrame(step);
    });
    if (tier >= 2) { const c = { x: innerWidth / 2, y: innerHeight * 0.42 }; FX.confetti(c.x, c.y, 50); FX.shake(10, 0.4); }
    await sleepReal(skipBig ? 150 : [1200, 1350, 1550, 1800][Math.min(tier, 3)]);
    ov.classList.add("hidden");
  }
  async function replayBook(book) {
    if (!book || !Array.isArray(book.events) || busy) return;
    busy = true; spinBtn.disabled = true; spinBtn.classList.add("spinning"); ctlEnable(false);
    try {
      overlay.innerHTML = "";
      setMult(1); clearCascadeMultFliers();
      const replayMode = book.events.some((ev) => ev.type === "enterFreeGame") ? "bonus" : "base";
      await play(book, replayMode);
    } catch (err) {
      console.warn("[game] replay failed", err);
      toast(I18N.t("toast.replayUnavailable"));
    }
    busy = false; spinBtn.disabled = false; spinBtn.classList.remove("spinning"); ctlEnable(true);
  }

  // ---- boot / loading -----------------------------------------------------
  let started = false;
  function boot() {
    balance = STAKE.init(balance) || balance;
    // Honour the launch/replay `amount` parameter so replayed rounds show wins at
    // the original stake (Stake approval #21/#23), not the default bet.
    const launchBet = STAKE.getBetAmount ? STAKE.getBetAmount() : null;
    if (launchBet != null && launchBet > 0) {
      betOverride = launchBet;
      let bi = 0, bd = Infinity;
      BETS.forEach((v, i) => { const d = Math.abs(v - launchBet); if (d < bd) { bd = d; bi = i; } });
      betIdx = bi;
    }
    STAKE.onBalance((nextBalance) => {
      balance = nextBalance;
      if (balanceEl) balanceEl.textContent = fmt(balance);
    });
    STAKE.onReplay((book) => setTimeout(() => replayBook(book), 650));
    STAKE.onReset(() => {
      if (busy) return;
      curGametype = "basegame"; housePanel.classList.add("hidden"); currentBricks = 0; completedHouseStages = new Set(); setMult(1); clearCascadeMultFliers(); syncHouseUI(0); countWin(0);
    });
    window.PIGGY_GAME = {
      replay: replayBook,
      setBalance: (v) => STAKE.setBalance(v, "api"),
      state: gameState,
      celebrate, // exposed for visual QA tooling
    };
    refreshMeta();
    buildBoard(); setMult(1); balanceEl.textContent = fmt(balance); winEl.textContent = fmt(dispWin * bet()); refreshBet(); wire(); paintIcons();
    // Live language switch (Stake pushes a new lang): i18n has already re-applied
    // the static DOM; refresh the dynamic + icon-bearing bits and re-format numbers.
    I18N.onChange(() => {
      paintIcons(document);
      buildPaytable();
      setPhase();
      refreshBet();
      houseName.textContent = I18N.houseName(currentHouseLevel);
      $("sound-state").textContent = muted ? I18N.t("sound.off") : I18N.t("sound.on");
      refreshMeta();
      balanceEl.textContent = fmt(balance); winEl.textContent = fmt(dispWin * bet());
    });
    if (FX) FX.init($("fx"), document.querySelector(".stage"));
    if (FX && FX.ambient) FX.ambient($("ambient"));   // drifting fireflies behind the reels
    $("bigwin").addEventListener("click", () => (skipBig = true));
    preloadThenStart();
  }
  function preloadThenStart() {
    const A = window.PIGGY_ASSETS || {};
    const urls = [
      ...(A.symbols ? Object.values(A.symbols) : []),
      ...(A.ui ? Object.values(A.ui) : []),
      ...(A.background ? [A.background] : []),
      ...(A.logo ? [A.logo] : []),
    ];
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
    if (A.ui) Object.entries(A.ui).forEach(([name, url]) => {
      document.documentElement.style.setProperty(`--ui-${name}`, `url("${url}")`);
    });
    if (A.background) { const bg = $("bg"); bg.style.backgroundImage = `url(${A.background})`; const sc = bg.querySelector(".bg-scene"); if (sc) sc.style.display = "none"; }
    if (A.logo) { const m = $("logo-mark"); m.innerHTML = `<img src="${A.logo}" alt="Bricked Up">`; m.style.display = "block"; m.style.width = "auto"; m.style.height = "auto"; document.querySelector(".logo-txt").style.display = "none"; }
    setStatic(randomBoard()); buildPaytable();
    const ld = $("loader"); ld.classList.add("gone"); setTimeout(() => (ld.style.display = "none"), 600);
    if (STAKE.ready) STAKE.ready(gameState());
  }

  // ---- fallbacks ----------------------------------------------------------
  function randomBoard() {
    const reels = CFG.reels && CFG.reels.BR0, pool = CFG.symbols.filter((s) => !s.scatter && !s.collectible && !s.wild).map((s) => s.id), b = [];
    for (let c = 0; c < REELS; c++) { b.push([]); for (let r = 0; r < ROWS; r++) b[c].push(reels ? reels[c][(Math.random() * reels[c].length) | 0] : pool[(Math.random() * pool.length) | 0]); }
    return b;
  }
  function demoBook() { return { payoutMultiplier: 0, events: [{ type: "reveal", gametype: "basegame", board: randomBoard() }, { type: "setTotalWin", amount: 0 }, { type: "finalWin", amount: 0, wincapReached: false }] }; }
  function fallbackStakeAdapter() {
    return {
      active: false,
      init: (v) => v,
      getBalance: () => null,
      getBetAmount: () => null,
      setBalance() {},
      onBalance() {},
      onReplay() {},
      onReset() {},
      play: async () => null,
      endRound: async () => null,
      ready() {},
      isLocalFallback: () => false,
      recordState() {},
      format: (n) => n.toLocaleString(I18N.locale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    };
  }
  function fallbackConfig() {
    return { gameName: "Bricked Up", rtp: 0.9655, wincap: 15000, numReels: 5, numRows: 4, reels: null, paytable: {}, scatterPays: {},
      symbols: [{ id: "W", kind: "wild", wild: true, name: "Wolf" }, { id: "S", kind: "scatter", scatter: true, name: "Topf" }, { id: "P1", kind: "premium", name: "Ziegel-Schwein" }, { id: "P2", kind: "premium", name: "Holz-Schwein" }, { id: "P3", kind: "premium", name: "Stroh-Schwein" }, { id: "M1", kind: "mid", name: "Axt" }, { id: "M2", kind: "mid", name: "Kelle" }, { id: "M3", kind: "mid", name: "Gabel" }, { id: "A", kind: "low", name: "Ass" }, { id: "K", kind: "low", name: "Koenig" }, { id: "Q", kind: "low", name: "Dame" }, { id: "J", kind: "low", name: "Bube" }, { id: "BR", kind: "collect", collectible: true, name: "Ziegel" }],
      betModes: [{ name: "bonus", cost: 70 }, { name: "bonus_vip", cost: 234 }],
      features: { baseMultLadder: [1, 2, 3, 5], freeMultLadder: [1, 2, 3, 5, 8], houseLevels: [{ level: 1, bricks: 0 }, { level: 2, bricks: 5 }, { level: 3, bricks: 10 }] } };
  }
  boot();
})();
