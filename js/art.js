// Procedural pixel art: trees, buildings, props. Everything is drawn pixel by
// pixel with a few hand-tuned palettes, then outlined, so it sits next to the
// hand-drawn sprites without looking smoothed.
(function (FH) {
  'use strict';

  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  FH.rng = rng;

  // Tiny pixel buffer with an outline pass.
  function Buf(w, h) {
    this.w = w; this.h = h;
    this.px = new Array(w * h).fill(null);
  }
  Buf.prototype.set = function (x, y, c) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.px[y * this.w + x] = c;
  };
  Buf.prototype.get = function (x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null;
    return this.px[y * this.w + x];
  };
  Buf.prototype.rect = function (x, y, w, h, c) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
  };
  Buf.prototype.outline = function (c, diag) {
    const add = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.get(x, y)) continue;
      const n = this.get(x - 1, y) || this.get(x + 1, y) || this.get(x, y - 1) || this.get(x, y + 1) ||
        (diag && (this.get(x - 1, y - 1) || this.get(x + 1, y - 1) || this.get(x - 1, y + 1) || this.get(x + 1, y + 1)));
      if (n && n !== c) add.push([x, y]);
    }
    add.forEach(p => this.set(p[0], p[1], c));
    return this;
  };
  Buf.prototype.canvas = function () {
    const c = document.createElement('canvas');
    c.width = this.w; c.height = this.h;
    const g = c.getContext('2d');
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const col = this.px[y * this.w + x];
      if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); }
    }
    return c;
  };
  FH.Buf = Buf;

  const BAYER = [[0, 2], [3, 1]];
  function pick(levels, v, x, y) {
    // v in 0..1 -> palette index, with 2x2 ordered dither between neighbours
    const n = levels.length;
    const f = Math.max(0, Math.min(0.999, v)) * n;
    const i = Math.floor(f);
    const frac = f - i;
    const th = (BAYER[y & 1][x & 1] + 0.5) / 4;
    if (frac > 0.5 + th * 0.5 && i + 1 < n) return levels[i + 1];
    return levels[i];
  }

  // Puffy clustered canopy: clumps drawn back-to-front, each lit from top-left.
  function canopy(buf, clumps, levels, r) {
    clumps.sort((a, b) => a.y - b.y);
    for (const cl of clumps) {
      for (let y = Math.floor(cl.y - cl.r); y <= cl.y + cl.r; y++) {
        for (let x = Math.floor(cl.x - cl.r); x <= cl.x + cl.r; x++) {
          const dx = (x - cl.x) / cl.r, dy = (y - cl.y) / cl.r;
          const d = dx * dx + dy * dy;
          if (d > 1) continue;
          let l = 0.47 - dx * 0.3 - dy * 0.42 + (r() - 0.5) * 0.18;
          if (d > 0.72 && dy > 0.1) l -= 0.25; // dark rim on the underside
          buf.set(x, y, pick(levels, l, x, y));
        }
      }
    }
  }

  const TREE_PAL = {
    oak: { leaves: ['#24452a', '#356b34', '#4f8f3f', '#79b552', '#a9d36a'], trunk: ['#4a2f1f', '#6b4428', '#8a5c34'], out: '#1a2416' },
    birch: { leaves: ['#3c5a24', '#5f8a34', '#86b048', '#b3d36a', '#dbe89a'], trunk: ['#7a7468', '#d8d2c0', '#efeadc'], out: '#1c2414' },
    autumn: { leaves: ['#5a2414', '#a53200', '#d0612a', '#e89a3a', '#f4c46a'], trunk: ['#4a2f1f', '#6b4428', '#8a5c34'], out: '#2a140c' },
    pine: { leaves: ['#13261c', '#1f3d2a', '#2f5a36', '#4a7a44', '#6f9a58'], trunk: ['#3a2418', '#5a3a24', '#7a5034'], out: '#0c1610' },
    dark: { leaves: ['#1a1230', '#2c1f4d', '#45306e', '#634a92', '#8a6db8'], trunk: ['#1e1526', '#33243f', '#4a3658'], out: '#0c0814' },
    darkpine: { leaves: ['#0d1626', '#16263a', '#21384e', '#33506a', '#4f6e86'], trunk: ['#1e1526', '#33243f', '#4a3658'], out: '#070a12' },
  };
  FH.TREE_PAL = TREE_PAL;

  function trunk(buf, cx, top, bottom, w, pal, r) {
    for (let y = top; y <= bottom; y++) {
      const flare = y > bottom - 3 ? (y - (bottom - 3)) : 0;
      const x0 = Math.round(cx - w / 2) - flare, x1 = Math.round(cx + w / 2) + flare;
      for (let x = x0; x < x1; x++) {
        const t = (x - x0) / Math.max(1, x1 - x0);
        let c = t < 0.3 ? pal[2] : t < 0.7 ? pal[1] : pal[0];
        if (r() < 0.12) c = pal[0];
        buf.set(x, y, c);
      }
    }
  }

  FH.makeTree = function (kind, seed) {
    const r = rng(seed * 7919 + 13);
    const pal = TREE_PAL[kind];
    if (kind === 'pine' || kind === 'darkpine') {
      const w = 30, h = 50;
      const buf = new Buf(w, h);
      trunk(buf, 15, 38, 47, 4, pal.trunk, r);
      const tiers = 4;
      for (let t = 0; t < tiers; t++) {
        const ty = 4 + t * 9, th = 14, half = 5 + t * 3;
        for (let y = 0; y < th; y++) {
          const span = Math.round((y / th) * half) + 1;
          const jag = y === th - 1 ? 0 : 0;
          for (let x = -span; x <= span; x++) {
            if (y >= th - 2 && ((x + t) & 1)) continue;
            const l = 0.62 - (x / (half + 1)) * 0.45 - (y / th) * 0.3 + (r() - 0.5) * 0.2 + jag;
            buf.set(15 + x, ty + y, pick(pal.leaves, l, 15 + x, ty + y));
          }
        }
      }
      buf.set(15, 3, pal.leaves[3]);
      buf.outline(pal.out);
      return { img: buf.canvas(), ox: 15, oy: 47 };
    }
    if (kind === 'dead') {
      const w = 34, h = 48;
      const buf = new Buf(w, h);
      const bark = ['#160f1e', '#2a1f36', '#3d2f4c'];
      trunk(buf, 17, 20, 45, 4, bark, r);
      const branch = (x, y, ang, len, thick) => {
        for (let i = 0; i < len; i++) {
          x += Math.cos(ang); y += Math.sin(ang);
          ang += (r() - 0.5) * 0.35;
          for (let t = 0; t < thick; t++) buf.set(x + t, y, bark[t === 0 ? 2 : 1]);
          if (len > 6 && i === Math.floor(len * 0.6) && r() < 0.8) branch(x, y, ang + (r() < 0.5 ? -0.8 : 0.8), Math.floor(len * 0.5), 1);
        }
      };
      branch(17, 22, -Math.PI / 2 - 0.15, 16, 2);
      branch(17, 26, -Math.PI + 0.5, 14, 2);
      branch(18, 25, -0.5, 14, 2);
      branch(16, 30, -Math.PI + 0.25, 8, 1);
      buf.outline('#07040c');
      return { img: buf.canvas(), ox: 17, oy: 45 };
    }
    const w = 38, h = 46;
    const buf = new Buf(w, h);
    trunk(buf, 19, 22, 43, kind === 'birch' ? 4 : 6, pal.trunk, r);
    if (kind === 'birch') for (let y = 24; y < 41; y += 3) buf.set(18 + (y % 2), y, '#2a2a24');
    const clumps = [];
    const n = 9 + Math.floor(r() * 4);
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 11;
      clumps.push({ x: 19 + Math.cos(a) * d * 1.15, y: 15 + Math.sin(a) * d * 0.8, r: 6 + r() * 3.5 });
    }
    clumps.push({ x: 19, y: 13, r: 9 });
    canopy(buf, clumps, pal.leaves, r);
    // a few fruit or blossoms on some trees
    if (kind === 'oak' && r() < 0.35) {
      for (let i = 0; i < 6; i++) {
        const x = 8 + Math.floor(r() * 22), y = 6 + Math.floor(r() * 16);
        if (buf.get(x, y) && buf.get(x, y + 1)) { buf.set(x, y, '#e0463a'); }
      }
    }
    if (kind === 'dark') {
      for (let i = 0; i < 5; i++) {
        const x = 8 + Math.floor(r() * 22), y = 6 + Math.floor(r() * 18);
        if (buf.get(x, y)) buf.set(x, y, '#c8a2ff');
      }
    }
    buf.outline(pal.out);
    return { img: buf.canvas(), ox: 19, oy: 43 };
  };

  FH.makeBush = function (kind, seed, berries) {
    const r = rng(seed * 31 + 7);
    const pal = TREE_PAL[kind === 'dark' ? 'dark' : 'oak'];
    const buf = new Buf(20, 16);
    const clumps = [{ x: 6, y: 9, r: 5 }, { x: 13, y: 9, r: 5.5 }, { x: 10, y: 6, r: 5 }];
    canopy(buf, clumps, pal.leaves, r);
    if (berries) {
      for (let i = 0; i < 7; i++) {
        const x = 3 + Math.floor(r() * 14), y = 3 + Math.floor(r() * 9);
        if (buf.get(x, y)) buf.set(x, y, berries);
      }
    }
    buf.outline(pal.out);
    return { img: buf.canvas(), ox: 10, oy: 14 };
  };

  FH.makeRock = function (seed, dark) {
    const r = rng(seed * 17 + 3);
    const lv = dark ? ['#1d1a2e', '#2e2a44', '#45405e', '#615b7c'] : ['#4a4a46', '#6b6a62', '#8e8c80', '#b3b0a0'];
    const buf = new Buf(16, 12);
    canopy(buf, [{ x: 6, y: 7, r: 4.5 }, { x: 10, y: 7, r: 4 }], lv, r);
    if (!dark && r() < 0.7) for (let i = 0; i < 4; i++) buf.set(4 + Math.floor(r() * 8), 3 + Math.floor(r() * 3), '#6f9a4a');
    buf.outline(dark ? '#0a0812' : '#24221e');
    return { img: buf.canvas(), ox: 8, oy: 11 };
  };

  FH.makeBramble = function (seed) {
    const r = rng(seed * 13 + 5);
    const buf = new Buf(18, 14);
    const vine = ['#2a1530', '#4a2448', '#6e3460'];
    for (let k = 0; k < 9; k++) {
      let x = 2 + r() * 14, y = 12, a = -Math.PI / 2 + (r() - 0.5) * 1.8;
      for (let i = 0; i < 10; i++) {
        x += Math.cos(a); y += Math.sin(a) * 0.9; a += (r() - 0.5) * 0.9;
        buf.set(x, y, vine[Math.floor(r() * 3)]);
        if (r() < 0.25) buf.set(x + (r() < 0.5 ? -1 : 1), y, '#d8c0e0');
      }
    }
    buf.outline('#0d0610');
    return { img: buf.canvas(), ox: 9, oy: 13 };
  };

  FH.makeFlowers = function (seed, dark) {
    const r = rng(seed * 101 + 9);
    const cols = dark ? ['#b58cff', '#7fe6f0', '#e0a0ff'] : ['#f4f0e0', '#f2a6c0', '#f5d76e', '#e8784a', '#a8c8ff'];
    const buf = new Buf(12, 10);
    const n = 3 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) {
      const x = 2 + Math.floor(r() * 8), y = 3 + Math.floor(r() * 5);
      const c = cols[Math.floor(r() * cols.length)];
      buf.set(x, y + 1, dark ? '#2d4a40' : '#3e7d34');
      buf.set(x, y + 2, dark ? '#2d4a40' : '#3e7d34');
      buf.set(x, y - 1, c); buf.set(x - 1, y, c); buf.set(x + 1, y, c); buf.set(x, y + 0, dark ? '#fff' : '#f5d76e');
    }
    return { img: buf.canvas(), ox: 6, oy: 9 };
  };

  FH.makeShroomDecor = function (seed) {
    const r = rng(seed * 57 + 1);
    const buf = new Buf(12, 10);
    const n = 2 + Math.floor(r() * 2);
    for (let i = 0; i < n; i++) {
      const x = 2 + Math.floor(r() * 7), y = 4 + Math.floor(r() * 3);
      buf.rect(x, y, 1, 3, '#e8dcc8');
      buf.rect(x - 1, y - 1, 3, 1, '#b55aa8'); buf.set(x, y - 2, '#e07ad0'); buf.set(x - 1, y - 1, '#e07ad0');
    }
    buf.outline('#140a18');
    return { img: buf.canvas(), ox: 6, oy: 9 };
  };

  FH.makeStump = function () {
    const buf = new Buf(16, 12);
    buf.rect(3, 5, 10, 6, '#6b4428');
    buf.rect(3, 5, 3, 6, '#8a5c34');
    buf.rect(10, 5, 3, 6, '#4a2f1f');
    buf.rect(3, 3, 10, 3, '#c9a06a');
    buf.rect(5, 4, 6, 1, '#a87c4a');
    buf.set(7, 4, '#8a5c34'); buf.set(2, 10, '#6b4428'); buf.set(13, 10, '#4a2f1f');
    buf.outline('#24160e');
    return { img: buf.canvas(), ox: 8, oy: 11 };
  };

  // ---------- grandma's cottage ----------
  FH.makeCottage = function () {
    const W = 72, H = 64;
    const b = new Buf(W, H);
    const r = rng(42);
    // walls: plaster with timber frame
    const wallTop = 30, wallBot = 61;
    for (let y = wallTop; y <= wallBot; y++) for (let x = 6; x < 66; x++) {
      let c = (x + y * 3) % 11 === 0 ? '#d6c49a' : '#e9dcb4';
      if (x < 9) c = '#d6c49a';
      b.set(x, y, c);
    }
    // stone base
    for (let y = 55; y <= wallBot; y++) for (let x = 6; x < 66; x++) {
      const brick = ((Math.floor(x / 5) + (y > 58 ? 1 : 0)) % 2);
      b.set(x, y, (x % 5 === 0 || y === 58) ? '#5f5a52' : brick ? '#8e877a' : '#a39b8c');
    }
    // timber beams
    const beam = '#6b4428';
    for (const x of [6, 7, 36, 37, 64, 65]) for (let y = wallTop; y < 55; y++) b.set(x, y, beam);
    for (let x = 6; x < 66; x++) { b.set(x, wallTop, beam); b.set(x, 54, beam); }
    // door
    for (let y = 40; y < 62; y++) for (let x = 29; x < 43; x++) {
      const top = y < 43 && (x < 31 || x > 40);
      if (top) continue;
      b.set(x, y, (x - 29) % 4 === 0 ? '#5a3a24' : '#8a5c34');
    }
    b.set(40, 51, '#f5d76e'); b.set(40, 52, '#c09a3a');
    // windows (warm glow)
    const win = (wx, wy) => {
      b.rect(wx - 1, wy - 1, 14, 12, '#4a2f1f');
      for (let y = 0; y < 10; y++) for (let x = 0; x < 12; x++) b.set(wx + x, wy + y, y < 4 ? '#ffe9a8' : '#f5c96a');
      b.rect(wx + 5, wy, 2, 10, '#4a2f1f'); b.rect(wx, wy + 4, 12, 2, '#4a2f1f');
      b.rect(wx - 2, wy + 10, 16, 2, '#8a5c34');
      for (let i = 0; i < 6; i++) b.set(wx - 1 + i * 2 + (i & 1), wy + 9, ['#e0463a', '#f2a6c0', '#f4f0e0'][i % 3]);
    };
    win(13, 39); win(48, 39);
    // roof: shingles in rust red
    const roof = ['#5a1e08', '#7e2a06', '#a53200', '#c4521c', '#dc7a3a'];
    for (let y = 2; y < 33; y++) {
      const inset = Math.max(0, 30 - y) * 1.05;
      for (let x = Math.round(1 + inset * 0.6); x < Math.round(W - 1 - inset * 0.6); x++) {
        if (y < 6 && (x < 18 || x > 54)) continue;
        const row = Math.floor((y - 2) / 3);
        const shingle = ((x + (row % 2) * 3) % 6 === 0);
        let l = 0.75 - (y / 33) * 0.35 + (r() - 0.5) * 0.1;
        if ((y - 2) % 3 === 2) l -= 0.3;
        if (shingle) l -= 0.25;
        b.set(x, y, pick(roof, l, x, y));
      }
    }
    // eave shadow
    for (let x = 4; x < 68; x++) { b.set(x, 33, '#3e1404'); b.set(x, 34, '#b8a47e'); }
    // chimney
    for (let y = 0; y < 14; y++) for (let x = 52; x < 59; x++) b.set(x, y, (x + y) % 3 === 0 ? '#6a625a' : '#8e877a');
    b.rect(51, 0, 9, 2, '#4f4a44');
    // flower bed by the door
    for (let x = 10; x < 27; x++) { b.set(x, 62, '#4a2f1f'); if (x % 2) b.set(x, 61, ['#e0463a', '#f5d76e', '#f2a6c0'][x % 3]); }
    b.outline('#24160e');
    return { img: b.canvas(), ox: 36, oy: 63 };
  };

  // ---------- witch's den ----------
  FH.makeDen = function () {
    const W = 64, H = 84;
    const b = new Buf(W, H);
    const r = rng(77);
    const plank = ['#1c1428', '#2a1f3a', '#3a2c50', '#4b3a64'];
    // crooked tower body
    for (let y = 30; y < 82; y++) {
      const lean = Math.round(Math.sin(y * 0.06) * 2);
      const x0 = 12 + lean, x1 = 52 + lean;
      for (let x = x0; x < x1; x++) {
        const t = (x - x0) / (x1 - x0);
        let l = 0.75 - t * 0.55 + (r() - 0.5) * 0.12;
        if ((x - x0) % 6 === 0) l -= 0.3;
        b.set(x, y, pick(plank, l, x, y));
      }
    }
    // moss at the base
    for (let x = 10; x < 56; x++) for (let y = 77; y < 82; y++) if (r() < 0.5 - (82 - y) * 0.08) b.set(x, y, r() < 0.5 ? '#2d4a40' : '#3f6a52');
    // door (arched)
    for (let y = 58; y < 82; y++) for (let x = 26; x < 38; x++) {
      const dy = y - 63, dx = x - 31.5;
      if (y < 63 && dx * dx + dy * dy * 1.4 > 36) continue;
      b.set(x, y, (x - 26) % 3 === 0 ? '#120c18' : '#2a1428');
    }
    b.set(35, 70, '#f4d36d');
    // round window
    for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++) {
      const d = x * x + y * y;
      if (d <= 36) b.set(32 + x, 44 + y, d > 25 ? '#120c18' : (y < 0 ? '#ffe9a0' : '#f5c060'));
    }
    b.rect(31, 38, 2, 13, '#120c18'); b.rect(26, 43, 13, 2, '#120c18');
    // pointed, bent roof
    const roof = ['#140c22', '#22163a', '#33224f', '#4d3674', '#6a4c96'];
    for (let y = 0; y < 34; y++) {
      const half = Math.round((y / 34) * 30) + 1;
      const bend = Math.round(Math.pow((34 - y) / 34, 2) * 12);
      for (let x = -half; x <= half; x++) {
        let l = 0.6 - (x / half) * 0.35 + (r() - 0.5) * 0.15;
        if (y % 4 === 3) l -= 0.25;
        b.set(32 + x + bend, y + 2, pick(roof, l, x, y));
      }
    }
    for (let x = 1; x < 63; x++) { b.set(x, 36, '#0c0814'); }
    // star & moon charms hanging off the eave
    b.set(14, 37, '#cdbbea'); b.set(14, 38, '#cdbbea'); b.set(14, 39, '#f4d36d'); b.set(13, 39, '#f4d36d'); b.set(15, 39, '#f4d36d'); b.set(14, 40, '#f4d36d');
    b.set(50, 37, '#cdbbea'); b.set(50, 38, '#cdbbea'); b.set(50, 39, '#cdbbea'); b.set(49, 40, '#f4d36d'); b.set(50, 41, '#f4d36d'); b.set(49, 42, '#f4d36d');
    b.outline('#06030a');
    return { img: b.canvas(), ox: 32, oy: 82 };
  };

  FH.makeCauldron = function () {
    const b = new Buf(22, 18);
    const body = ['#120c18', '#24182e', '#3a2a48', '#5a4670'];
    canopy(b, [{ x: 11, y: 10, r: 7.5 }], body, rng(5));
    for (let x = 3; x < 19; x++) { b.set(x, 3, '#4a3a5a'); b.set(x, 4, '#2a1f36'); }
    for (let x = 5; x < 17; x++) b.set(x, 4, x % 3 ? '#e070c0' : '#f7a8e0');
    b.set(5, 17, '#24182e'); b.set(16, 17, '#24182e'); b.set(5, 16, '#24182e'); b.set(16, 16, '#24182e');
    b.outline('#06030a');
    return { img: b.canvas(), ox: 11, oy: 17 };
  };

  FH.makeLamp = function () {
    const b = new Buf(9, 30);
    b.rect(4, 8, 1, 21, '#2a2220');
    b.rect(3, 27, 3, 2, '#2a2220');
    b.rect(1, 1, 7, 1, '#2a2220');
    b.rect(2, 2, 5, 5, '#ffe28a'); b.rect(3, 3, 3, 3, '#fff5c8');
    b.rect(1, 7, 7, 1, '#2a2220'); b.set(4, 0, '#2a2220');
    b.outline('#120c0a');
    return { img: b.canvas(), ox: 4, oy: 29 };
  };

  FH.makeFence = function (vertical) {
    const b = new Buf(16, 16);
    const wood = '#9a6a3a', dark = '#5a3a20', lite = '#c08a50';
    if (!vertical) {
      for (const px of [1, 13]) { b.rect(px, 4, 2, 11, wood); b.rect(px, 4, 1, 11, lite); b.set(px, 3, dark); b.set(px + 1, 3, dark); }
      b.rect(0, 7, 16, 2, wood); b.rect(0, 7, 16, 1, lite);
      b.rect(0, 11, 16, 2, wood); b.rect(0, 11, 16, 1, lite);
    } else {
      b.rect(7, 0, 2, 15, wood); b.rect(7, 0, 1, 15, lite);
    }
    b.outline('#2e1c10');
    return { img: b.canvas(), ox: 8, oy: 15 };
  };

  FH.makeSign = function () {
    const b = new Buf(16, 18);
    b.rect(7, 8, 2, 9, '#6b4428');
    b.rect(1, 2, 14, 7, '#c08a50'); b.rect(1, 2, 14, 1, '#dcae74'); b.rect(1, 8, 14, 1, '#8a5c34');
    for (let x = 3; x < 13; x += 2) b.set(x, 5, '#5a3a20');
    b.outline('#2e1c10');
    return { img: b.canvas(), ox: 8, oy: 17 };
  };

  // garden crops by growth stage (0 seedling .. 2 ripe)
  FH.makeCrop = function (kind, stage) {
    const b = new Buf(14, 14);
    const leaf = '#4f8f3f', leaf2 = '#79b552';
    if (stage === 0) {
      b.set(6, 11, leaf); b.set(7, 10, leaf2); b.set(5, 10, leaf2); b.set(6, 12, leaf);
    } else if (stage === 1) {
      for (let i = 0; i < 4; i++) { b.set(6, 12 - i, leaf); }
      b.rect(3, 7, 3, 2, leaf2); b.rect(8, 7, 3, 2, leaf2); b.rect(5, 5, 4, 2, leaf);
    } else {
      const fruit = { carrot: ['#f07a2a', '#b54a14'], turnip: ['#e9e0c9', '#c86a9a'], pumpkin: ['#f0a33a', '#c06a1c'], radish: ['#e86a9a', '#a83a6a'] }[kind];
      if (kind === 'pumpkin') {
        b.rect(2, 7, 10, 6, fruit[0]); b.rect(2, 11, 10, 2, fruit[1]);
        b.rect(6, 7, 1, 6, fruit[1]); b.rect(6, 5, 2, 2, leaf); b.rect(9, 4, 4, 2, leaf2);
      } else {
        b.rect(4, 2, 2, 5, leaf); b.rect(8, 2, 2, 5, leaf2); b.rect(6, 1, 2, 6, leaf);
        b.rect(4, 7, 6, 4, fruit[0]); b.rect(4, 10, 6, 1, fruit[1]); b.rect(5, 11, 4, 2, fruit[0]);
        if (kind === 'turnip') b.rect(4, 7, 6, 2, fruit[1]);
        b.set(6, 13, fruit[1]);
      }
    }
    b.outline('#1c2414');
    return { img: b.canvas(), ox: 7, oy: 13 };
  };

  FH.makeLog = function () {
    const b = new Buf(26, 10);
    b.rect(2, 2, 21, 6, '#6b4428'); b.rect(2, 2, 21, 2, '#8a5c34'); b.rect(2, 7, 21, 1, '#4a2f1f');
    b.rect(22, 2, 3, 6, '#c9a06a'); b.set(23, 4, '#8a5c34'); b.set(23, 5, '#a87c4a');
    b.rect(8, 1, 4, 1, '#4f8f3f'); b.rect(15, 1, 3, 1, '#79b552');
    b.outline('#24160e');
    return { img: b.canvas(), ox: 13, oy: 9 };
  };
})(window.FH);
