// The UI kit: pixel frames for CSS border-image, paper and wood textures, and
// the little decorations (vines, leaves, ribbons, corner plates) that dress the
// panels. Everything is painted once at boot and handed to CSS as variables.
(function (FH) {
  'use strict';

  const K = 3; // screen pixels per art pixel
  FH.UI_SCALE = K;

  function canvasOf(w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    draw((x, y, col, ww, hh) => { g.fillStyle = col; g.fillRect(x, y, ww || 1, hh || 1); }, g);
    return c;
  }
  function scaled(c, k) {
    const o = document.createElement('canvas');
    o.width = c.width * k; o.height = c.height * k;
    const g = o.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(c, 0, 0, o.width, o.height);
    return o;
  }
  const url = (c, k) => 'url(' + scaled(c, k || K).toDataURL() + ')';
  const rnd = FH.rng(2024);

  // ---------- frames (9-slice) ----------
  // Wood band with a gold inlay and corner plates. 24x24 source, 8px slice.
  function ornate(wood, gold) {
    return canvasOf(24, 24, (p) => {
      const S = 24;
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        const e = Math.min(x, y, S - 1 - x, S - 1 - y);
        if (e >= 8) continue;
        let c;
        if (e === 0) c = wood.out;
        else if (e <= 4) {
          c = wood.base;
          if (e === 1 && (y < x ? y : x) === 1 && (x < S - 2 && y < S - 2)) c = wood.hi;
          if (e === 1 && (x === S - 2 || y === S - 2)) c = wood.lo;
          if (e === 4) c = wood.lo;
          if (rnd() < 0.12) c = wood.grain;
        } else if (e === 5) c = gold.hi;
        else if (e === 6) c = gold.base;
        else c = wood.out;
        p(x, y, c);
      }
      // corner plates: a gold diamond with a rivet
      [[0, 0], [S - 8, 0], [0, S - 8], [S - 8, S - 8]].forEach(([ox, oy]) => {
        for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
          const d = Math.abs(x - 3.5) + Math.abs(y - 3.5);
          if (d < 3.6) p(ox + x, oy + y, d < 1.6 ? gold.hi : (x + y < 7 ? gold.base : gold.lo));
          else if (d < 4.6) p(ox + x, oy + y, wood.out);
        }
        p(ox + 3, oy + 3, '#fff2c0');
      });
    });
  }
  const WOOD = { out: '#24140a', base: '#7a4a26', hi: '#a8703e', lo: '#4e2c14', grain: '#643a1c' };
  const PLUM = { out: '#140a1e', base: '#3e2a5a', hi: '#5e4684', lo: '#28183e', grain: '#33224c' };
  const GOLD = { base: '#d8a23a', hi: '#ffe08a', lo: '#8a5a18' };

  // Thin gold-edged board, for green panels and slots. 12x12, 4px slice.
  function thin(fill, edge, hi) {
    return canvasOf(12, 12, (p) => {
      for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) {
        const e = Math.min(x, y, 11 - x, 11 - y);
        if ((x === 0 || x === 11) && (y === 0 || y === 11)) continue;
        let c = fill;
        if (e === 0) c = '#24140a';
        else if (e === 1) c = edge;
        else if (e === 2) c = (y <= 2 || x <= 2) ? '#1c2a12' : hi;
        p(x, y, c);
      }
    });
  }

  // Torn paper: ragged edges, a fold shadow underneath. 30x30, 10px slice.
  function torn(paper, shade) {
    const r = FH.rng(77);
    return canvasOf(30, 30, (p) => {
      const S = 30;
      const edgeT = [], edgeB = [], edgeL = [], edgeR = [];
      for (let i = 0; i < S; i++) { edgeT.push(r() < 0.5 ? 1 : (r() < 0.5 ? 0 : 2)); edgeB.push(r() < 0.5 ? 1 : (r() < 0.5 ? 0 : 2)); edgeL.push(r() < 0.5 ? 1 : 0); edgeR.push(r() < 0.5 ? 1 : 0); }
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        if (y < edgeT[x] || S - 1 - y < edgeB[x] + 1 || x < edgeL[y] || S - 1 - x < edgeR[y] + 1) {
          // drop shadow on the bottom/right edge
          if ((S - 1 - y <= edgeB[x] + 1 && S - 1 - y >= edgeB[x] && y > 3) || (S - 1 - x <= edgeR[y] + 1 && x > 3 && S - 1 - x >= edgeR[y])) p(x, y, 'rgba(40,20,10,0.35)');
          continue;
        }
        let c = paper;
        const e = Math.min(x - edgeL[y], y - edgeT[x], S - 2 - x - edgeR[y], S - 2 - y - edgeB[x]);
        if (e <= 0) c = shade;
        else if (r() < 0.05) c = shade;
        p(x, y, c);
      }
    });
  }

  // Plaque for titles: gold ends, green middle. 30x14, slice 10/5.
  function plaque() {
    return canvasOf(30, 14, (p) => {
      for (let y = 0; y < 14; y++) for (let x = 0; x < 30; x++) {
        const e = Math.min(y, 13 - y);
        const ex = Math.min(x, 29 - x);
        if (ex < 3 && e < 3 - ex) continue; // clipped corners
        let c;
        if (e === 0 || ex === 0) c = '#24140a';
        else if (e === 1 || ex === 1) c = (y < 7 ? '#ffe08a' : '#a8741e');
        else if (e === 2 || ex === 2) c = '#d8a23a';
        else if (e === 3 || ex === 3) c = '#24140a';
        else c = y < 6 ? '#3f6a32' : '#2e5226';
        p(x, y, c);
      }
    });
  }

  // ---------- textures (tiled backgrounds) ----------
  function paperTex(base, specks, size) {
    const r = FH.rng(size * 13);
    return canvasOf(size, size, (p) => {
      p(0, 0, base, size, size);
      for (let i = 0; i < size * size * 0.06; i++) p(Math.floor(r() * size), Math.floor(r() * size), specks[Math.floor(r() * specks.length)]);
      // fibres
      for (let i = 0; i < size / 6; i++) {
        let x = r() * size, y = r() * size;
        const c = specks[0];
        for (let k = 0; k < 4; k++) { p(Math.floor(x) % size, Math.floor(y) % size, c); x += 1; y += r() < 0.5 ? 0 : 1; }
      }
    });
  }
  function woodTex() {
    const r = FH.rng(9);
    return canvasOf(48, 24, (p) => {
      for (let y = 0; y < 24; y++) {
        const plank = Math.floor(y / 8);
        for (let x = 0; x < 48; x++) {
          let c = ['#6b4022', '#734626', '#6e4324'][plank];
          if (y % 8 === 0) c = '#3e2210';
          else if (y % 8 === 1) c = '#8a5630';
          else if (Math.sin(x * 0.35 + plank * 2 + y * 0.6) > 0.86) c = '#5a341a';
          else if (r() < 0.04) c = '#5e381c';
          if ((x + plank * 17) % 48 === 0 && y % 8 !== 0) c = '#3e2210';
          p(x, y, c);
        }
      }
    });
  }

  // ---------- decorations ----------
  const LEAF = ['#2f5a24', '#4f8a34', '#7ab84a', '#a8d86a'];
  function leaf(p, x, y, dir, size) {
    // a small teardrop leaf with a vein
    const pts = size === 2 ? [[0, 0], [1, 0], [-1, 1], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2], [1, 3]]
      : [[0, 0], [0, 1], [1, 1], [1, 2]];
    pts.forEach(([a, b]) => {
      const xx = x + (dir < 0 ? -a : a), yy = y + b;
      const c = b === 0 ? LEAF[3] : (a <= 0 ? LEAF[2] : LEAF[1]);
      p(xx, yy, c);
    });
  }
  function vine(w, h, seed, hang) {
    const r = FH.rng(seed);
    return canvasOf(w, h, (p) => {
      // a drooping stem from the top-left, curling down
      let x = 0, y = 2, a = 0.15;
      const stem = [];
      for (let i = 0; i < w * 1.3; i++) {
        x += Math.cos(a); y += Math.sin(a);
        a += (hang ? 0.022 : 0.01) + (r() - 0.5) * 0.12;
        if (x >= w - 2 || y >= h - 3) break;
        stem.push([Math.round(x), Math.round(y)]);
      }
      stem.forEach(([sx, sy], i) => {
        p(sx, sy, '#2a4a1c');
        if (i % 5 === 2) leaf(p, sx, sy + 1, r() < 0.5 ? 1 : -1, 2);
        if (i % 7 === 4) leaf(p, sx + 1, sy - 3, 1, 2);
        if (i % 11 === 6 && r() < 0.6) { p(sx, sy - 2, '#f2a6c0'); p(sx - 1, sy - 1, '#f2a6c0'); p(sx + 1, sy - 1, '#f2a6c0'); p(sx, sy - 1, '#ffe08a'); }
      });
      // a hanging tendril
      if (hang) {
        const [hx, hy] = stem[Math.floor(stem.length * 0.4)] || [8, 4];
        for (let k = 0; k < h - hy - 2; k++) { p(hx + Math.round(Math.sin(k * 0.5)), hy + k, '#2a4a1c'); if (k % 4 === 2) leaf(p, hx + 1, hy + k, k % 8 === 2 ? 1 : -1, 2); }
      }
    });
  }
  function ribbon(col, dark) {
    return canvasOf(9, 34, (p) => {
      for (let y = 0; y < 34; y++) for (let x = 0; x < 9; x++) {
        if (y > 28 && Math.abs(x - 4) < (y - 28)) continue; // notched tail
        let c = col;
        if (x === 0 || x === 8) c = '#24140a';
        else if (x === 1) c = '#ffffff40';
        else if (x >= 6) c = dark;
        if (y === 33 || (y > 28 && Math.abs(x - 4) === (y - 28))) c = '#24140a';
        if (x === 1) c = mixHi(col);
        p(x, y, c);
      }
    });
  }
  function mixHi(c) { return FH.mix ? FH.mix(c, '#ffffff', 0.35) : c; }
  function sprig() {
    return canvasOf(22, 14, (p) => {
      for (let x = 2; x < 20; x++) p(x, 9 + Math.round(Math.sin(x * 0.4)), '#2a4a1c');
      leaf(p, 5, 4, 1, 2); leaf(p, 9, 6, -1, 2); leaf(p, 13, 3, 1, 2); leaf(p, 17, 6, 1, 2);
      leaf(p, 3, 10, -1, 2); leaf(p, 14, 10, 1, 2);
    });
  }
  function flourish() {
    // gold swirl used under headings
    return canvasOf(40, 7, (p) => {
      for (let x = 0; x < 40; x++) {
        const y = 3 + Math.round(Math.sin(x * 0.32) * (x < 6 || x > 33 ? 2 : 1));
        if (x > 15 && x < 25) continue;
        p(x, y, '#a8741e');
      }
      [[18, 2], [19, 1], [20, 2], [21, 3], [20, 4], [19, 5], [18, 4], [17, 3], [22, 3]].forEach(([x, y]) => p(x, y, '#d8a23a'));
      p(19, 3, '#ffe08a'); p(20, 3, '#ffe08a');
    });
  }
  function heartMedal() {
    return canvasOf(20, 20, (p) => {
      for (let y = 0; y < 20; y++) for (let x = 0; x < 20; x++) {
        const d = Math.hypot(x - 9.5, y - 9.5);
        if (d > 9.6) continue;
        p(x, y, d > 8.6 ? '#24140a' : d > 7.4 ? (y < 10 ? '#ffe08a' : '#a8741e') : d > 6.4 ? '#24140a' : '#7a4a26');
      }
      const H = ['.kk.kk.', 'krrkrrk', 'krrrrrk', '.krrrk.', '..krk..', '...k...'];
      H.forEach((row, y) => row.split('').forEach((ch, x) => { if (ch !== '.') p(6 + x, 7 + y, ch === 'k' ? '#3a1420' : '#e8455a'); }));
      p(7, 8, '#ffd6dc');
    });
  }

  // ---------- boot ----------
  FH.buildUIKit = function () {
    const st = document.documentElement.style;
    const set = (k, v) => st.setProperty(k, v);
    set('--fr-wood', url(ornate(WOOD, GOLD)));
    set('--fr-plum', url(ornate(PLUM, GOLD)));
    set('--fr-green', url(thin('#3a5a2a', '#d8a23a', '#4b6e36')));
    set('--fr-slot', url(thin('#2e4a22', '#8a6a34', '#3e5e2c')));
    set('--fr-paper', url(torn('#f6ecd2', '#d9c49a')));
    set('--fr-paper-dark', url(torn('#e8d6ae', '#c4a878')));
    set('--fr-plaque', url(plaque()));
    set('--tex-paper', url(paperTex('#f3e6c4', ['#e4d2a8', '#fbf3dc', '#e9d9b4'], 48), 3));
    set('--tex-paper-plum', url(paperTex('#f1e6f2', ['#e2d4e6', '#fbf5fc', '#e8dcec'], 48), 3));
    set('--tex-green', url(paperTex('#3a5a2a', ['#34522a', '#42642f', '#2f4c22'], 32), 3));
    set('--tex-wood', url(woodTex(), 3));
    FH.decor = {
      vineL: scaled(vine(70, 44, 3, true), K).toDataURL(),
      vineR: scaled(vine(70, 44, 8, true), K).toDataURL(),
      vineS: scaled(vine(48, 20, 5, false), K).toDataURL(),
      ribbonRed: scaled(ribbon('#d0485a', '#94283a'), K).toDataURL(),
      ribbonGreen: scaled(ribbon('#6f904e', '#4b6a34'), K).toDataURL(),
      ribbonGold: scaled(ribbon('#e0b04a', '#a8741e'), K).toDataURL(),
      sprig: scaled(sprig(), K).toDataURL(),
      flourish: scaled(flourish(), K).toDataURL(),
      heartMedal: scaled(heartMedal(), K).toDataURL(),
    };
  };
})(window.FH);
