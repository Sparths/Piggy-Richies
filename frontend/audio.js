/* Huff & Puff: Piggy Richies -- sample-backed WebAudio.
 * User-provided WAVs are used for the premium cues. Short synth layers remain
 * as fallback and for tiny ticks/risers that need to stay tight. */
(() => {
  "use strict";

  const SAMPLE_URLS = {
    spin: "assets/audio/ui-crisp-casino.wav",
    reelStop: "assets/audio/vault-drop.wav",
    puff: "assets/audio/deep-cartoon-hit.wav",
    drop: "assets/audio/vault-drop.wav",
    win: "assets/audio/win-celebration.wav",
    winBig: "assets/audio/premium-casino-win.wav",
    brick: "assets/audio/brick-impact.wav",
    scatter: "assets/audio/pot-bubble.wav",
    trigger: "assets/audio/bonus-trigger.wav",
    upgrade: "assets/audio/magic-upgrade.wav",
    smallWin: "assets/audio/small-win-chime.wav",
    houseComplete: "assets/audio/house-complete.wav",
    music: "assets/audio/background-music.wav",
  };

  const MUSIC_GAIN = 0.22;
  let ctx = null, muted = false, master = null, sampleBus = null, musicBus = null, musicSource = null, musicWanted = false;
  const buffers = Object.create(null);
  const loading = Object.create(null);

  const ensure = () => {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        master = ctx.createGain();
        sampleBus = ctx.createGain();
        musicBus = ctx.createGain();
        master.gain.value = 0.88;
        sampleBus.gain.value = 0.92;
        musicBus.gain.value = MUSIC_GAIN;
        sampleBus.connect(master);
        musicBus.connect(master);
        master.connect(ctx.destination);
      } catch (e) {}
    }
    if (ctx && ctx.state === "suspended") ctx.resume();
    return ctx;
  };
  const now = () => (ctx ? ctx.currentTime : 0);

  function loadSample(name) {
    if (!ctx || !SAMPLE_URLS[name]) return null;
    if (buffers[name]) return Promise.resolve(buffers[name]);
    if (loading[name]) return loading[name];
    loading[name] = fetch(SAMPLE_URLS[name], { cache: "force-cache" })
      .then((r) => {
        if (!r.ok) throw new Error("audio " + r.status + " " + name);
        return r.arrayBuffer();
      })
      .then((data) => ctx.decodeAudioData(data))
      .then((buffer) => (buffers[name] = buffer))
      .catch(() => null);
    return loading[name];
  }

  function preloadSamples() {
    if (!ensure()) return;
    Object.keys(SAMPLE_URLS).forEach(loadSample);
  }

  function sample(name, opts = {}) {
    if (muted || !ensure()) return true;
    const buffer = buffers[name];
    if (!buffer) {
      loadSample(name);
      return false;
    }
    const delay = opts.delay || 0;
    const offset = Math.min(opts.offset || 0, Math.max(0, buffer.duration - 0.02));
    const duration = Math.max(0.02, Math.min(opts.duration || (buffer.duration - offset), buffer.duration - offset));
    const t = now() + delay;
    const src = ctx.createBufferSource();
    const g = ctx.createGain();
    src.buffer = buffer;
    src.playbackRate.setValueAtTime(opts.rate || 1, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(opts.gain == null ? 0.35 : opts.gain, t + 0.012);
    g.gain.setValueAtTime(opts.gain == null ? 0.35 : opts.gain, Math.max(t + 0.016, t + duration - 0.05));
    g.gain.linearRampToValueAtTime(0.0001, t + duration);
    src.connect(g).connect(sampleBus || master);
    src.start(t, offset, duration);
    src.stop(t + duration + 0.03);
    return true;
  }

  function startMusic() {
    musicWanted = true;
    if (muted || !ensure()) return;
    loadSample("music").then((buffer) => {
      if (!buffer || muted || !ctx || musicSource) return;
      try {
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.loop = true;
        src.connect(musicBus || sampleBus || master);
        src.start(now());
        musicSource = src;
      } catch (e) {}
    });
  }

  function tone(freq, t0, dur, type = "sine", gain = 0.2, slideTo = null) {
    if (!ctx || muted) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(master);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  function noise(t0, dur, gain = 0.18, freq = 900, q = 0.7, type = "bandpass") {
    if (!ctx || muted) return;
    const n = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ctx.createBufferSource();
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    src.buffer = buf;
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    g.gain.value = gain;
    src.connect(f).connect(g).connect(master);
    src.start(t0);
  }

  function synthSpin() {
    const t = now();
    tone(440, t, 0.13, "triangle", 0.1, 240);
    noise(t, 0.2, 0.05, 1400);
  }

  function synthReelStop(col = 0, anticip = false) {
    const t = now();
    const f = anticip ? 92 : 178 - col * 13;
    tone(f, t, anticip ? 0.17 : 0.08, "sine", anticip ? 0.18 : 0.12, f * 0.62);
    noise(t, 0.05, 0.06, anticip ? 360 : 520);
    if (anticip) tone(f * 2.2, t, 0.12, "triangle", 0.05);
  }

  function synthWin(step = 0) {
    const t = now();
    const base = [523, 587, 659, 784, 880, 988, 1175, 1319][Math.min(step, 7)];
    tone(base, t, 0.16, "triangle", 0.16);
    tone(base * 1.5, t + 0.04, 0.16, "sine", 0.08);
  }

  function synthFanfare(tier = 0) {
    const t = now();
    const scales = [
      [523, 659, 784],
      [523, 659, 784, 1047],
      [523, 659, 784, 1047, 1319],
      [392, 523, 659, 784, 1047, 1319, 1568],
    ];
    const s = scales[Math.min(tier, 3)], step = tier >= 2 ? 0.13 : 0.1;
    s.forEach((f, i) => {
      tone(f, t + i * step, 0.45, "triangle", 0.2);
      tone(f * 2, t + i * step, 0.4, "sine", 0.07);
    });
    if (tier >= 1) noise(t, 0.6, 0.06, 1800);
    if (tier >= 2) tone(130, t, 0.5, "sine", 0.18);
  }

  const API = {
    unlock() { preloadSamples(); startMusic(); },
    setMuted(m) {
      muted = m;
      if (master) master.gain.value = m ? 0 : 0.88;
      if (!m) { preloadSamples(); if (musicWanted) startMusic(); }
    },
    toggle() {
      muted = !muted;
      if (!muted) { preloadSamples(); startMusic(); }
      if (master) master.gain.value = muted ? 0 : 0.88;
      return muted;
    },

    spin() {
      if (muted || !ensure()) return;
      if (!sample("spin", { gain: 0.2, rate: 1.08, offset: 0.03, duration: 0.42 })) synthSpin();
    },
    reelStop(col = 0, anticip = false) {
      if (muted || !ensure()) return;
      const ok = sample("reelStop", {
        gain: anticip ? 0.22 : 0.13,
        rate: anticip ? 0.82 : 1 + col * 0.055,
        offset: 0.02,
        duration: anticip ? 0.33 : 0.14,
      });
      if (!ok) synthReelStop(col, anticip);
      else if (anticip) tone(210, now(), 0.12, "triangle", 0.04);
    },
    puff() {
      if (muted || !ensure()) return;
      if (!sample("puff", { gain: 0.23, rate: 0.78, offset: 0.04, duration: 0.52 })) {
        noise(now(), 0.34, 0.17, 650, 0.5);
        noise(now() + 0.02, 0.28, 0.08, 1500);
      } else {
        noise(now(), 0.24, 0.045, 1500);
      }
    },
    drop() {
      if (muted || !ensure()) return;
      if (!sample("drop", { gain: 0.2, rate: 0.88, offset: 0.01, duration: 0.18 })) {
        tone(190, now(), 0.09, "sine", 0.09, 120);
      }
    },

    win(step = 0) {
      if (muted || !ensure()) return;
      const ok = sample("win", {
        gain: Math.min(0.32, 0.16 + step * 0.025),
        rate: 1 + Math.min(step, 6) * 0.025,
        offset: 0.05,
        duration: 0.58,
      });
      if (!ok) synthWin(step);
    },
    smallWin() {
      if (muted || !ensure()) return;
      if (!sample("smallWin", { gain: 0.34, rate: 1, offset: 0.0, duration: 1.25 })) synthWin(1);
    },
    multUp(m = 2) {
      if (muted || !ensure()) return;
      const ok = sample("win", { gain: 0.2, rate: 1.05 + Math.min(m, 8) * 0.015, offset: 0.2, duration: 0.38 });
      if (!ok) {
        const t = now(), base = 520 + Math.min(7, m) * 64;
        tone(base, t, 0.16, "triangle", 0.16, base * 1.5);
        tone(base * 1.5, t + 0.05, 0.15, "sine", 0.08);
        noise(t, 0.12, 0.035, 2600);
      }
    },
    brick() {
      if (muted || !ensure()) return;
      if (!sample("brick", { gain: 0.34, rate: 0.96, offset: 0.0, duration: 0.5 })) {
        const t = now();
        tone(330, t, 0.09, "square", 0.1);
        tone(494, t + 0.06, 0.1, "square", 0.09);
      }
    },

    scatter() {
      if (muted || !ensure()) return;
      if (!sample("scatter", { gain: 0.34, rate: 1, offset: 0.05, duration: 0.72 })) {
        const t = now();
        tone(660, t, 0.18, "sine", 0.18);
        tone(990, t + 0.06, 0.2, "triangle", 0.12);
        noise(t, 0.3, 0.05, 2000);
      }
    },
    riser(dur = 1.0) {
      if (muted || !ensure()) return;
      const t = now(), o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(180, t);
      o.frequency.exponentialRampToValueAtTime(1100, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.12, t + dur * 0.8);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(master);
      o.start(t);
      o.stop(t + dur + 0.05);
      noise(t, dur, 0.04, 1200);
    },

    coinTick() {
      if (muted || !ensure()) return;
      const t = now();
      tone(1320 + Math.random() * 220, t, 0.07, "triangle", 0.09);
      tone(1980, t + 0.01, 0.05, "sine", 0.04);
    },
    trigger() {
      if (muted || !ensure()) return;
      if (!sample("trigger", { gain: 0.5, rate: 1, offset: 0.0, duration: 2.2 })) {
        const t = now();
        [523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.11, 0.32, "triangle", 0.18));
        noise(t, 0.5, 0.07, 1600);
      }
    },
    upgrade() {
      if (muted || !ensure()) return;
      if (!sample("upgrade", { gain: 0.48, rate: 1, offset: 0.0, duration: 1.45 })) {
        const t = now();
        [392, 523, 659, 880, 1047].forEach((f, i) => tone(f, t + i * 0.08, 0.28, "sawtooth", 0.12));
      }
    },
    houseComplete() {
      if (muted || !ensure()) return;
      if (!sample("houseComplete", { gain: 0.48, rate: 1, offset: 0.0, duration: 1.55 })) {
        const t = now();
        [330, 440, 554, 740, 988].forEach((f, i) => tone(f, t + i * 0.07, 0.24, "triangle", 0.13));
        noise(t, 0.32, 0.05, 1800);
      }
    },
    startMusic,
    thunder() {
      if (muted || !ensure()) return;
      sample("puff", { gain: 0.2, rate: 0.55, offset: 0.05, duration: 0.82 });
      const t = now();
      noise(t, 0.75, 0.11, 130, 0.4, "lowpass");
      noise(t + 0.06, 0.5, 0.07, 320, 0.6);
      tone(58, t, 0.6, "sine", 0.1, 38);
    },

    winTier(tier = 0) {
      if (muted || !ensure()) return;
      const name = tier >= 2 ? "winBig" : "win";
      const ok = sample(name, {
        gain: [0.34, 0.43, 0.52, 0.6][Math.min(tier, 3)],
        rate: tier >= 3 ? 0.98 : 1,
        offset: 0.0,
        duration: [1.1, 1.65, 2.35, 2.85][Math.min(tier, 3)],
      });
      if (!ok) synthFanfare(tier);
      else if (tier >= 2) tone(130, now(), 0.38, "sine", 0.11);
    },
    bigwin() { this.winTier(2); },
  };

  window.addEventListener("pointerdown", () => { preloadSamples(); startMusic(); }, { once: true, capture: true });
  window.PIGGY_AUDIO = API;
})();
