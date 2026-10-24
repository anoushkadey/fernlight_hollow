// Lo-fi music and sound effects, all synthesised with WebAudio so the game ships no audio files.
(function (FH) {
  'use strict';

  const A = FH.audio = {
    ctx: null, master: null, musicBus: null, sfxBus: null,
    musicOn: true, sfxOn: true, started: false,
    mood: 'day', step: 0, nextTime: 0, timer: null,
  };

  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

  A.init = function () {
    if (A.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = A.ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 3;
    A.master = ctx.createGain(); A.master.gain.value = 0.8;
    A.master.connect(comp); comp.connect(ctx.destination);

    // music runs through a warm low-pass and a slow wobble, like a tired cassette
    A.tone = ctx.createBiquadFilter(); A.tone.type = 'lowpass'; A.tone.frequency.value = 2300; A.tone.Q.value = 0.4;
    A.musicBus = ctx.createGain(); A.musicBus.gain.value = 0.0;
    A.musicBus.connect(A.tone); A.tone.connect(A.master);
    A.sfxBus = ctx.createGain(); A.sfxBus.gain.value = 0.55; A.sfxBus.connect(A.master);

    // a short room echo for the piano
    A.delay = ctx.createDelay(1.0); A.delay.delayTime.value = 0.36;
    const fb = ctx.createGain(); fb.gain.value = 0.25;
    const dlp = ctx.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 1400;
    A.delay.connect(dlp); dlp.connect(fb); fb.connect(A.delay); dlp.connect(A.musicBus);

    // noise buffer reused by drums, crackle and rustles
    const len = ctx.sampleRate * 2;
    A.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = A.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    // vinyl crackle
    const crackle = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
    const cd = crackle.getChannelData(0);
    for (let i = 0; i < cd.length; i++) cd[i] = Math.random() < 0.0009 ? (Math.random() * 2 - 1) * 0.8 : (Math.random() * 2 - 1) * 0.012;
    const cs = ctx.createBufferSource(); cs.buffer = crackle; cs.loop = true;
    const cg = ctx.createGain(); cg.gain.value = 0.22;
    const cf = ctx.createBiquadFilter(); cf.type = 'bandpass'; cf.frequency.value = 3000;
    cs.connect(cf); cf.connect(cg); cg.connect(A.musicBus); cs.start();

    // tape wobble on the filter
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.23;
    const lg = ctx.createGain(); lg.gain.value = 260;
    lfo.connect(lg); lg.connect(A.tone.frequency); lfo.start();
  };

  A.start = function () {
    A.init();
    if (!A.ctx) return;
    if (A.ctx.state === 'suspended') A.ctx.resume();
    if (A.started) return;
    A.started = true;
    A.nextTime = A.ctx.currentTime + 0.1;
    A.musicBus.gain.setTargetAtTime(A.musicOn ? 0.5 : 0, A.ctx.currentTime, 1.5);
    A.timer = setInterval(A.schedule, 80);
  };

  A.setMusic = function (on) {
    A.musicOn = on;
    if (A.ctx) A.musicBus.gain.setTargetAtTime(on ? 0.5 : 0, A.ctx.currentTime, 0.4);
  };
  A.setSfx = function (on) { A.sfxOn = on; };

  // ---------- music ----------
  // Each chord: root bass note + voicing (midi). Day is warm major 7ths; dark is minor 9ths.
  const SONGS = {
    day: {
      bpm: 74,
      chords: [
        { bass: 41, notes: [57, 60, 64, 67] },   // Fmaj7
        { bass: 40, notes: [55, 59, 62, 67] },   // Em7
        { bass: 38, notes: [57, 60, 62, 65] },   // Dm7
        { bass: 43, notes: [55, 59, 62, 65] },   // G7
      ],
      scale: [60, 62, 64, 67, 69, 72, 74, 76],
    },
    night: {
      bpm: 66,
      chords: [
        { bass: 45, notes: [55, 60, 64, 71] },   // Am(add9)
        { bass: 41, notes: [57, 60, 64, 67] },   // Fmaj7
        { bass: 38, notes: [57, 60, 64, 65] },   // Dm9
        { bass: 40, notes: [56, 59, 62, 64] },   // E7
      ],
      scale: [57, 60, 62, 64, 67, 69, 72],
    },
    dark: {
      bpm: 60,
      chords: [
        { bass: 38, notes: [53, 57, 60, 64] },   // Dm9
        { bass: 46, notes: [53, 57, 62, 65] },   // Bbmaj7
        { bass: 43, notes: [55, 58, 62, 65] },   // Gm7
        { bass: 45, notes: [55, 61, 64, 67] },   // A7
      ],
      scale: [62, 65, 67, 69, 72, 74],
    },
  };

  A.setMood = function (m) { A.mood = m; };

  function epiano(t, midi, vel, dur) {
    const ctx = A.ctx;
    const f = mtof(midi);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vel, t + 0.012);
    g.gain.exponentialRampToValueAtTime(vel * 0.35, t + 0.4);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    const o1 = ctx.createOscillator(); o1.type = 'sine'; o1.frequency.value = f;
    const o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.value = f * 2.001;
    const g2 = ctx.createGain(); g2.gain.value = 0.18;
    o1.connect(g); o2.connect(g2); g2.connect(g);
    g.connect(A.musicBus); g.connect(A.delay);
    o1.start(t); o2.start(t); o1.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
  }
  function bass(t, midi, dur) {
    const ctx = A.ctx;
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = mtof(midi);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.32, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(A.musicBus);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function kick(t) {
    const ctx = A.ctx;
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.42, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o.connect(g); g.connect(A.musicBus); o.start(t); o.stop(t + 0.32);
  }
  function noiseHit(t, freq, type, vol, dur, bus) {
    const ctx = A.ctx;
    const s = ctx.createBufferSource(); s.buffer = A.noise;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(bus || A.musicBus);
    s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.02);
  }

  let lastMelody = 0;
  A.schedule = function () {
    const ctx = A.ctx;
    if (!ctx) return;
    while (A.nextTime < ctx.currentTime + 0.25) {
      const song = SONGS[A.mood] || SONGS.day;
      const sixteenth = 60 / song.bpm / 4;
      const s = A.step % 64;           // 4 bars of 16ths
      const bar = Math.floor(s / 16), pos = s % 16;
      const chord = song.chords[bar];
      // lazy swing on the off-beats
      const t = A.nextTime + (pos % 2 === 1 ? sixteenth * 0.18 : 0);
      if (A.musicOn) {
        if (pos === 0) {
          chord.notes.forEach((n, i) => epiano(t + i * 0.025, n, 0.07, sixteenth * 15));
          bass(t, chord.bass, sixteenth * 7);
        }
        if (pos === 10) bass(t, chord.bass + (bar % 2 ? 7 : 12), sixteenth * 5);
        if (pos === 8 && bar % 2 === 1) chord.notes.slice(1).forEach((n, i) => epiano(t + i * 0.03, n, 0.04, sixteenth * 7));
        if (A.mood !== 'dark') {
          if (pos === 0 || pos === 7 || pos === 10) kick(t);
          if (pos === 4 || pos === 12) noiseHit(t, 1800, 'bandpass', 0.12, 0.16);
          if (pos % 2 === 0) noiseHit(t, 7000, 'highpass', pos % 4 === 0 ? 0.035 : 0.02, 0.05);
        } else {
          if (pos === 0) kick(t);
          if (pos === 8) noiseHit(t, 900, 'bandpass', 0.05, 0.4);
        }
        // sparse melody, mostly stepwise
        if (pos % 4 === 2 && Math.random() < (A.mood === 'day' ? 0.42 : 0.3)) {
          const sc = song.scale;
          let idx = lastMelody + Math.floor(Math.random() * 3) - 1;
          if (Math.random() < 0.2) idx += Math.random() < 0.5 ? 2 : -2;
          idx = Math.max(0, Math.min(sc.length - 1, idx));
          lastMelody = idx;
          epiano(t, sc[idx] + 12, 0.05, sixteenth * 6);
        }
      }
      A.nextTime += sixteenth;
      A.step++;
    }
  };

  // ---------- sound effects ----------
  function tone(type, f0, f1, dur, vol, delay) {
    if (!A.ctx || !A.sfxOn) return;
    const ctx = A.ctx, t = ctx.currentTime + (delay || 0);
    const o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(A.sfxBus); o.start(t); o.stop(t + dur + 0.02);
  }
  function rustle(vol, dur, freq) {
    if (!A.ctx || !A.sfxOn) return;
    noiseHit(A.ctx.currentTime, freq || 2500, 'bandpass', vol, dur, A.sfxBus);
  }

  A.sfx = function (name) {
    if (!A.ctx || !A.sfxOn) return;
    switch (name) {
      case 'pickup': tone('triangle', 660, 0, 0.09, 0.18); tone('triangle', 990, 0, 0.14, 0.16, 0.07); break;
      case 'harvest': tone('triangle', 520, 0, 0.08, 0.16); tone('triangle', 780, 0, 0.08, 0.14, 0.06); tone('triangle', 1040, 0, 0.16, 0.12, 0.12); rustle(0.15, 0.15, 1500); break;
      case 'eat': rustle(0.25, 0.06, 1200); setTimeout(() => rustle(0.22, 0.06, 1000), 90); setTimeout(() => rustle(0.2, 0.08, 900), 180); break;
      case 'drink': [0, 1, 2, 3].forEach(i => tone('sine', 300 + i * 70, 500 + i * 90, 0.08, 0.14, i * 0.07)); break;
      case 'hurt': tone('square', 330, 110, 0.25, 0.14); rustle(0.2, 0.12, 600); break;
      case 'poison': tone('sawtooth', 220, 90, 0.5, 0.08); tone('square', 233, 95, 0.5, 0.05); break;
      case 'tick': tone('square', 1200, 0, 0.025, 0.04); break;
      case 'select': tone('triangle', 700, 0, 0.06, 0.14); tone('triangle', 1050, 0, 0.1, 0.12, 0.05); break;
      case 'back': tone('triangle', 600, 400, 0.1, 0.12); break;
      case 'page': rustle(0.18, 0.18, 3500); break;
      case 'blip': tone('square', 380 + Math.random() * 90, 0, 0.03, 0.025); break;
      case 'shake': rustle(0.3, 0.35, 1800); setTimeout(() => rustle(0.2, 0.25, 2200), 120); break;
      case 'pulse': tone('sine', 300, 900, 0.5, 0.12); tone('sine', 450, 1350, 0.5, 0.06, 0.05); break;
      case 'think': tone('triangle', 520, 0, 0.08, 0.1); tone('triangle', 660, 0, 0.08, 0.1, 0.09); tone('triangle', 880, 0, 0.14, 0.1, 0.18); break;
      case 'brew': for (let i = 0; i < 8; i++) tone('sine', 200 + Math.random() * 300, 500 + Math.random() * 400, 0.09, 0.1, i * 0.08); break;
      case 'trade': tone('triangle', 784, 0, 0.1, 0.14); tone('triangle', 988, 0, 0.1, 0.14, 0.08); tone('triangle', 1175, 0, 0.2, 0.14, 0.16); break;
      case 'deny': tone('square', 200, 0, 0.08, 0.08); tone('square', 160, 0, 0.12, 0.08, 0.09); break;
      case 'heal': [523, 659, 784, 1047].forEach((f, i) => tone('triangle', f, 0, 0.18, 0.12, i * 0.08)); break;
      case 'gameover': [392, 330, 262, 196].forEach((f, i) => tone('triangle', f, 0, 0.5, 0.14, i * 0.35)); break;
      case 'sleep': [523, 392, 330, 262].forEach((f, i) => tone('sine', f, 0, 0.6, 0.1, i * 0.3)); break;
      case 'morning': [392, 494, 587, 784].forEach((f, i) => tone('triangle', f, 0, 0.3, 0.1, i * 0.12)); break;
      case 'step': rustle(0.035, 0.04, 900); break;
    }
  };
})(window.FH);
