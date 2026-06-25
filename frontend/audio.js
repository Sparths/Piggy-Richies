/* Stake's Huff & Puff: Piggy Richies -- synthesized sound (WebAudio).
 * No audio files; everything generated. Layered, escalating cues so wins feel
 * satisfying: reel stops, the wolf's puff, per-cascade rises, coin ticks for
 * the count-up, anticipation risers and tiered win fanfares. */
(() => {
  "use strict";
  let ctx = null, muted = false, master = null;

  const ensure = () => {
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination); } catch (e) {}
    }
    if (ctx && ctx.state === "suspended") ctx.resume();
    return ctx;
  };
  const now = () => (ctx ? ctx.currentTime : 0);

  function tone(freq, t0, dur, type = "sine", gain = 0.2, slideTo = null) {
    if (!ctx) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(master); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function noise(t0, dur, gain = 0.18, freq = 900, q = 0.7, type = "bandpass") {
    if (!ctx) return;
    const n = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.value = gain;
    src.connect(f).connect(g).connect(master); src.start(t0);
  }

  const API = {
    unlock() { ensure(); },
    setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.9; },
    toggle() { muted = !muted; if (!muted) ensure(); if (master) master.gain.value = muted ? 0 : 0.9; return muted; },

    spin() { if (muted || !ensure()) return; const t = now(); tone(440, t, 0.13, "triangle", 0.1, 240); noise(t, 0.2, 0.05, 1400); },
    reelStop() { if (muted || !ensure()) return; const t = now(); tone(150, t, 0.08, "sine", 0.13, 90); noise(t, 0.05, 0.06, 500); },
    puff() { if (muted || !ensure()) return; noise(now(), 0.34, 0.17, 650, 0.5); noise(now() + 0.02, 0.28, 0.08, 1500); },
    drop() { if (muted || !ensure()) return; const t = now(); tone(190, t, 0.09, "sine", 0.09, 120); },

    win(step = 0) { if (muted || !ensure()) return; const t = now(); const base = [523, 587, 659, 784, 880, 988, 1175, 1319][Math.min(step, 7)]; tone(base, t, 0.16, "triangle", 0.16); tone(base * 1.5, t + 0.04, 0.16, "sine", 0.08); },
    brick() { if (muted || !ensure()) return; const t = now(); tone(330, t, 0.09, "square", 0.1); tone(494, t + 0.06, 0.1, "square", 0.09); },

    scatter() { if (muted || !ensure()) return; const t = now(); tone(660, t, 0.18, "sine", 0.18); tone(990, t + 0.06, 0.2, "triangle", 0.12); noise(t, 0.3, 0.05, 2000); },
    riser(dur = 1.0) { if (muted || !ensure()) return; const t = now(); const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "sawtooth"; o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(1100, t + dur); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.12, t + dur * 0.8); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.05); noise(t, dur, 0.04, 1200); },

    coinTick() { if (muted || !ensure()) return; const t = now(); tone(1320 + Math.random() * 220, t, 0.07, "triangle", 0.09); tone(1980, t + 0.01, 0.05, "sine", 0.04); },
    trigger() { if (muted || !ensure()) return; const t = now(); [523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.11, 0.32, "triangle", 0.18)); noise(t, 0.5, 0.07, 1600); },
    upgrade() { if (muted || !ensure()) return; const t = now(); [392, 523, 659, 880, 1047].forEach((f, i) => tone(f, t + i * 0.08, 0.28, "sawtooth", 0.12)); },

    // tier: 0 nice, 1 big, 2 mega, 3 epic/max -- ascending fanfare, brighter & longer with tier
    winTier(tier = 0) {
      if (muted || !ensure()) return; const t = now();
      const scales = [[523, 659, 784], [523, 659, 784, 1047], [523, 659, 784, 1047, 1319], [392, 523, 659, 784, 1047, 1319, 1568]];
      const s = scales[Math.min(tier, 3)], step = tier >= 2 ? 0.13 : 0.1;
      s.forEach((f, i) => { tone(f, t + i * step, 0.45, "triangle", 0.2); tone(f * 2, t + i * step, 0.4, "sine", 0.07); });
      if (tier >= 1) noise(t, 0.6, 0.06, 1800);
      if (tier >= 2) tone(130, t, 0.5, "sine", 0.18); // sub boom
    },
    bigwin() { this.winTier(2); },
  };
  window.PIGGY_AUDIO = API;
})();
