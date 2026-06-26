/* Stake's Huff & Puff: Piggy Richies -- canvas particle / juice engine.
 *
 * AAA "game feel": coin showers, sparkle bursts, symbol-explosion debris and
 * screen shake. One full-screen canvas, one RAF loop, particle-capped. All
 * coordinates are in screen (client) pixels so callers pass element rects. */
(() => {
  "use strict";
  let cv, ctx, W = 0, H = 0, dpr = 1, raf = 0;
  let parts = [];
  let shakeT = null, shakeAmp = 0, shakeUntil = 0;
  const MAX = 520;
  const G = 1700; // gravity px/s^2

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    // use the viewport (clientWidth can be 0 before layout -> coins clustered in a corner)
    W = window.innerWidth || cv.clientWidth; H = window.innerHeight || cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function init(canvas, shakeTarget) {
    cv = canvas; ctx = cv.getContext("2d"); shakeT = shakeTarget || null;
    resize(); window.addEventListener("resize", resize);
    last = performance.now(); loop(last);
  }

  const rnd = (a, b) => a + Math.random() * (b - a);

  function add(p) { if (parts.length < MAX) parts.push(p); }

  // ---- spawners -----------------------------------------------------------
  function coin(x, y, vx, vy) {
    const depth = Math.random();                       // 0 = far/small, 1 = near/big (depth of field)
    const r = 7 + depth * 13;
    add({ t: "coin", x, y, vx, vy, life: 0, max: rnd(1.1, 2.0), r, rot: rnd(0, 6.28), vr: rnd(-9, 9), spin: rnd(6, 15), tilt: rnd(-0.5, 0.5), depth, hue: Math.random() < 0.25 ? "p" : "g" });
  }
  function spark(x, y, color) {
    const a = rnd(0, 6.28), s = rnd(60, 360);
    add({ t: "spark", x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - rnd(0, 120), life: 0, max: rnd(0.4, 0.9), r: rnd(1.5, 3.5), color: color || "#ffe27a" });
  }
  function star(x, y) {
    add({ t: "star", x, y, vx: rnd(-40, 40), vy: rnd(-60, 10), life: 0, max: rnd(0.5, 1.1), r: rnd(6, 12), rot: rnd(0, 6.28), vr: rnd(-4, 4) });
  }

  const API = {
    init,
    // burst of coins + sparks from a point (e.g. a winning/exploding cell)
    burst(x, y, n = 14, power = 1) {
      for (let i = 0; i < n; i++) { const a = rnd(-2.4, -0.7), s = rnd(180, 520) * power; coin(x, y, Math.cos(a) * s, Math.sin(a) * s); }
      for (let i = 0; i < n; i++) spark(x, y);
    },
    // small puff of debris/sparks when a symbol is blown away
    explode(x, y, color) {
      for (let i = 0; i < 10; i++) spark(x, y, color);
      for (let i = 0; i < 4; i++) { const a = rnd(0, 6.28); coin(x, y, Math.cos(a) * rnd(120, 300), Math.sin(a) * rnd(120, 300) - 150); }
    },
    sparkle(x, y) { for (let i = 0; i < 6; i++) spark(x, y); star(x, y); },
    // rain coins from the top across the screen for `dur` seconds
    coinShower(dur = 2.2, rate = 26) {
      const end = performance.now() + dur * 1000;
      (function rain() {
        if (performance.now() > end) return;
        for (let i = 0; i < rate / 6; i++) coin(rnd(0, W), -20, rnd(-40, 40), rnd(60, 220));
        setTimeout(rain, 90);
      })();
    },
    confetti(x, y, n = 40) { for (let i = 0; i < n; i++) { const a = rnd(-3.14, 0); coin(x, y, Math.cos(a) * rnd(200, 620), Math.sin(a) * rnd(200, 620)); } },
    shake(amp = 10, dur = 0.4) { shakeAmp = Math.max(shakeAmp, amp); shakeUntil = performance.now() + dur * 1000; },
    clear() { parts = []; },
  };

  // ---- loop ---------------------------------------------------------------
  let last = 0;
  function loop(t) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    ctx.clearRect(0, 0, W, H);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.life += dt;
      if (p.life >= p.max) { parts.splice(i, 1); continue; }
      const k = p.life / p.max, fade = 1 - k;
      if (p.t === "coin") {
        p.vy += G * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.spin * dt;
        drawCoin(p, fade);
      } else if (p.t === "spark") {
        p.vy += 900 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        ctx.globalAlpha = fade; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * fade, 0, 6.28); ctx.fill();
      } else { // star
        p.vy += 500 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
        drawStar(p.x, p.y, p.r * fade, p.rot, fade);
      }
    }
    ctx.globalAlpha = 1;
    // screen shake
    if (shakeT) {
      if (t < shakeUntil) { const s = shakeAmp * ((shakeUntil - t) / 400); shakeT.style.transform = `translate(${rnd(-s, s)}px,${rnd(-s, s)}px)`; }
      else if (shakeAmp) { shakeAmp = 0; shakeT.style.transform = ""; }
    }
  }

  function drawCoin(p, fade) {
    const flip = Math.max(.12, Math.abs(Math.cos(p.rot))); // 1 face-on, ~0 edge-on
    const rx = p.r * flip, ry = p.r;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.tilt || 0); ctx.globalAlpha = fade * (0.55 + 0.45 * (p.depth ?? 1));
    // beveled rim -> coin thickness / 3D depth
    ctx.fillStyle = p.hue === "p" ? "#933a66" : "#956309";
    ctx.beginPath(); ctx.ellipse(0, 1.6, rx + 1.7, ry + 1.7, 0, 0, 6.28); ctx.fill();
    // face
    const grd = ctx.createLinearGradient(-rx, -ry, rx, ry);
    if (p.hue === "p") { grd.addColorStop(0, "#ffe1ee"); grd.addColorStop(.5, "#ff86b6"); grd.addColorStop(1, "#c14d86"); }
    else { grd.addColorStop(0, "#fff7c8"); grd.addColorStop(.45, "#ffd23f"); grd.addColorStop(1, "#b8780b"); }
    ctx.fillStyle = grd; ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, 6.28); ctx.fill();
    // milled inner ring
    ctx.strokeStyle = "rgba(255,255,255,.4)"; ctx.lineWidth = Math.max(.6, rx * .13);
    ctx.beginPath(); ctx.ellipse(0, 0, rx * .64, ry * .64, 0, 0, 6.28); ctx.stroke();
    // specular highlight
    ctx.fillStyle = "rgba(255,255,255,.82)"; ctx.beginPath(); ctx.ellipse(-rx * .32, -ry * .36, rx * .26, ry * .18, -.5, 0, 6.28); ctx.fill();
    ctx.restore();
  }
  function drawStar(x, y, r, rot, fade) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = fade; ctx.fillStyle = "#fff6c8";
    ctx.beginPath();
    for (let i = 0; i < 5; i++) { ctx.lineTo(Math.cos((i * 4 * Math.PI) / 5 - 1.57) * r, Math.sin((i * 4 * Math.PI) / 5 - 1.57) * r); }
    ctx.closePath(); ctx.fill(); ctx.restore();
  }

  // ---- ambient life: fireflies / warm embers drifting behind the reels ----
  function ambient(canvas) {
    const cv2 = canvas, c2 = cv2.getContext("2d");
    let aw = 0, ah = 0;
    function size() { aw = cv2.width = window.innerWidth; ah = cv2.height = window.innerHeight; }
    size(); window.addEventListener("resize", size);
    const flies = [];
    for (let i = 0; i < 24; i++) flies.push({
      x: Math.random(), y: rnd(0.12, 0.92), r: rnd(1, 2.6), ph: rnd(0, 6.28),
      sp: rnd(0.5, 1.4), drift: rnd(-0.03, 0.03), bob: rnd(0.015, 0.04),
      hue: Math.random() < 0.28 ? "#bfe0ff" : "#ffe08a",
    });
    let prev = performance.now();
    (function loop(t) {
      requestAnimationFrame(loop);
      const dt = Math.min(0.05, (t - prev) / 1000); prev = t;
      c2.clearRect(0, 0, aw, ah);
      for (const f of flies) {
        f.ph += dt * f.sp; f.x += f.drift * dt;
        if (f.x < -0.05) f.x = 1.05; else if (f.x > 1.05) f.x = -0.05;
        const px = f.x * aw, py = (f.y + Math.sin(f.ph) * f.bob) * ah;
        const a = 0.18 + 0.4 * (Math.sin(f.ph * 1.7) * 0.5 + 0.5);
        const g = c2.createRadialGradient(px, py, 0, px, py, f.r * 6);
        g.addColorStop(0, f.hue); g.addColorStop(1, "transparent");
        c2.globalAlpha = a * 0.5; c2.fillStyle = g; c2.beginPath(); c2.arc(px, py, f.r * 6, 0, 6.28); c2.fill();
        c2.globalAlpha = a; c2.fillStyle = f.hue; c2.beginPath(); c2.arc(px, py, f.r, 0, 6.28); c2.fill();
      }
      c2.globalAlpha = 1;
    })(prev);
  }
  API.ambient = ambient;

  window.PIGGY_FX = API;
})();
