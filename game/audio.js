(function (CV) {
  // Sound effects, synthesised with Web Audio so no asset files are needed.
  const VOLUME_KEY = 'chillvibes.volume.v1';
  let ctx = null, master = null, volume = 0.6;

  try {
    const v = parseFloat(localStorage.getItem(VOLUME_KEY));
    if (Number.isFinite(v)) volume = Math.min(1, Math.max(0, v));
  } catch (e) { /* storage unavailable */ }

  // Created lazily: browsers only allow audio after a user gesture.
  function init() {
    if (!ctx) {
      const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = volume;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return true;
  }

  // One enveloped oscillator note. freq may be [from, to] for a glide.
  function tone(freq, start, dur, { type = 'sine', gain = 0.4 } = {}) {
    const t0 = ctx.currentTime + start;
    const osc = ctx.createOscillator(), env = ctx.createGain();
    osc.type = type;
    if (Array.isArray(freq)) {
      osc.frequency.setValueAtTime(freq[0], t0);
      osc.frequency.exponentialRampToValueAtTime(freq[1], t0 + dur);
    } else osc.frequency.setValueAtTime(freq, t0);
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(gain, t0 + 0.015);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(env); env.connect(master);
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  }

  const SOUNDS = {
    // Rising major arpeggio with a held top note.
    project() { [523.25, 659.25, 783.99].forEach((f, i) => tone(f, i * 0.09, 0.3, { type: 'triangle' })); tone(1046.5, 0.27, 0.5, { type: 'triangle', gain: 0.35 }); },
    // Short two-note chime: a project is available.
    projectReady() { tone(783.99, 0, 0.25, { type: 'sine', gain: 0.35 }); tone(1174.66, 0.12, 0.45, { type: 'sine', gain: 0.35 }); },
    // Two low thuds, like stones being set down.
    city() { tone([220, 110], 0, 0.18, { type: 'square', gain: 0.25 }); tone([330, 165], 0.12, 0.25, { type: 'square', gain: 0.25 }); tone(659.25, 0.2, 0.3, { type: 'triangle', gain: 0.25 }); },
    // Soft upward sweep.
    explore() { tone([300, 900], 0, 0.35, { type: 'sine', gain: 0.3 }); tone([450, 1350], 0.05, 0.3, { type: 'sine', gain: 0.12 }); },
    // Sweep plus a bright shimmer of sparkles.
    exploreFeature() {
      SOUNDS.explore();
      [1318.5, 1760, 2093].forEach((f, i) => tone(f, 0.18 + i * 0.07, 0.22, { type: 'triangle', gain: 0.18 }));
    },
    // Deep resonant gong, then a mysterious rising minor chord with a shimmering top.
    exploreSite() {
      tone([110, 98], 0, 1.4, { type: 'sine', gain: 0.4 });
      tone([220, 196], 0, 1.0, { type: 'triangle', gain: 0.18 });
      [293.66, 349.23, 440, 587.33].forEach((f, i) => tone(f, 0.25 + i * 0.12, 0.9, { type: 'triangle', gain: 0.22 }));
      [1174.7, 1396.9, 1760].forEach((f, i) => tone(f, 0.75 + i * 0.1, 0.7, { type: 'sine', gain: 0.12 }));
    },
    blip() { tone(660, 0, 0.08, { type: 'sine', gain: 0.3 }); },
  };

  CV.audio = {
    get volume() { return volume; },
    setVolume(v) {
      volume = Math.min(1, Math.max(0, v));
      if (master) master.gain.value = volume;
      try { localStorage.setItem(VOLUME_KEY, String(volume)); } catch (e) { /* storage unavailable */ }
    },
    play(name) { if (volume > 0 && init()) SOUNDS[name](); },
  };
})(globalThis.CV = globalThis.CV || {});
