/* Stake's Huff & Puff: Piggy Richies -- synthesized sound cues (WebAudio).
 * No audio files needed; everything is generated. Cues make it obvious what is
 * happening (spin, the wolf's puff, wins, the bonus trigger, upgrades). */
(() => {
  "use strict";
  let ctx = null, muted = false;

  const ensure = () => {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
    if (ctx && ctx.state === "suspended") ctx.resume();
    return ctx;
  };

  // one note
  function tone(freq, t0, dur, type = "sine", gain = 0.2, slideTo = null) {
    if (!ctx) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(ctx.destination); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  // filtered noise burst (whoosh / puff)
  function noise(t0, dur, gain = 0.18, freq = 900, q = 0.7) {
    if (!ctx) return;
    const n = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.value = gain;
    src.connect(f).connect(g).connect(ctx.destination); src.start(t0);
  }
  const now = () => (ctx ? ctx.currentTime : 0);

  const API = {
    unlock() { ensure(); },
    setMuted(m) { muted = m; },
    toggle() { muted = !muted; if (!muted) ensure(); return muted; },

    spin() { if (muted || !ensure()) return; const t = now(); tone(520, t, 0.12, "triangle", 0.12, 280); noise(t, 0.18, 0.06, 1200); },
    puff() { if (muted || !ensure()) return; noise(now(), 0.32, 0.16, 700, 0.6); },
    drop() { if (muted || !ensure()) return; const t = now(); tone(180, t, 0.1, "sine", 0.1, 120); },

    // win escalates with cascade index / multiplier
    win(step = 0) { if (muted || !ensure()) return; const t = now();
      const base = [523, 587, 659, 784, 880, 988, 1047][Math.min(step, 6)];
      tone(base, t, 0.16, "triangle", 0.18); tone(base * 1.5, t + 0.04, 0.16, "sine", 0.1); },

    brick() { if (muted || !ensure()) return; const t = now(); tone(330, t, 0.09, "square", 0.12); tone(440, t + 0.06, 0.1, "square", 0.1); },

    trigger() { if (muted || !ensure()) return; const t = now();
      [523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.11, 0.3, "triangle", 0.2)); noise(t, 0.5, 0.08, 1600); },

    upgrade() { if (muted || !ensure()) return; const t = now();
      [392, 523, 659, 880].forEach((f, i) => tone(f, t + i * 0.08, 0.26, "sawtooth", 0.14)); },

    bigwin() { if (muted || !ensure()) return; const t = now();
      [523, 659, 784, 1047, 1319].forEach((f, i) => { tone(f, t + i * 0.09, 0.4, "triangle", 0.2); tone(f * 2, t + i * 0.09, 0.4, "sine", 0.08); }); },
  };

  window.PIGGY_AUDIO = API;
})();
