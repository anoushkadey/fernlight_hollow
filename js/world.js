// The map: a meadow in the middle, Grandma's cottage to the east, and the dark
// wood with the witch's den in the west. Ground is baked once to a big canvas;
// props are depth-sorted every frame.
(function (FH) {
  'use strict';

  const T = 16;
  const MW = 92, MH = 64;
  FH.TILE = T; FH.MW = MW; FH.MH = MH;

  // value noise
  function makeNoise(seed) {
    const r = FH.rng(seed);
    const N = 256, perm = [], vals = [];
    for (let i = 0; i < N; i++) { perm[i] = i; vals[i] = r(); }
    for (let i = N - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
    const h = (x, y) => vals[(perm[(perm[x & 255] + y) & 255])];
    const sm = t => t * t * (3 - 2 * t);
    const n = (x, y) => {
      const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
      const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
      const u = sm(xf), v = sm(yf);
      return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    };
    return (x, y) => n(x, y) * 0.6 + n(x * 2.1 + 17, y * 2.1 + 9) * 0.3 + n(x * 4.3 + 3, y * 4.3 + 31) * 0.1;
  }

  // Landmarks, in tiles
  const L = {
    start: { x: 47, y: 38 },
    cottage: { x: 72, y: 22 },
    garden: { x: 64, y: 27, w: 9, h: 5 },
    pond: { x: 52, y: 47, rx: 5.5, ry: 3.6 },
    den: { x: 14, y: 17 },
  };
  FH.LANDMARKS = L;

  function World() {
    this.seed = 1337;
    this.noise = makeNoise(this.seed);
    this.noise2 = makeNoise(this.seed + 99);
    this.tiles = new Uint8Array(MW * MH);   // 0 grass, 1 path, 2 water, 3 soil, 4 dark grass, 5 dark path
    this.solid = new Uint8Array(MW * MH);
    this.dark = new Float32Array(MW * MH); // 0..1 how far into the dark wood
    this.props = [];
    this.spawns = [];
    this.lights = [];
    this.crops = [];
    this.shakeables = [];
    this.build();
  }
  FH.World = World;

  World.prototype.idx = function (x, y) { return y * MW + x; };
  World.prototype.inb = function (x, y) { return x >= 0 && y >= 0 && x < MW && y < MH; };
  World.prototype.tile = function (x, y) { return this.inb(x, y) ? this.tiles[this.idx(x, y)] : 0; };
  World.prototype.darkAt = function (px, py) {
    const x = Math.floor(px / T), y = Math.floor(py / T);
    return this.inb(x, y) ? this.dark[this.idx(x, y)] : 0;
  };
  World.prototype.isSolidPx = function (px, py) {
    const x = Math.floor(px / T), y = Math.floor(py / T);
    if (!this.inb(x, y)) return true;
    return this.solid[this.idx(x, y)] === 1;
  };

  World.prototype.build = function () {
    const r = FH.rng(this.seed);
    const nz = this.noise;
    const self = this;

    // darkness field: the west and north-west are the dark wood
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
      const edge = 29 + Math.sin(y * 0.16 + 1) * 3.5 + Math.sin(y * 0.41) * 1.5 + (nz(x * 0.09 + 7, y * 0.09) - 0.5) * 14 + Math.max(0, 12 - y) * 0.9;
      const d = Math.max(0, Math.min(1, (edge - x) / 6 + 0.5));
      this.dark[this.idx(x, y)] = d;
      this.tiles[this.idx(x, y)] = d > 0.5 ? 4 : 0;
    }

    // paths: smooth curves through landmarks, measured per pixel
    this.segs = [];
    this.segGrid = Array.from({ length: MW * MH }, () => []);
    const addPath = (pts, w) => {
      const P = pts.map(q => ({ x: q.x * T + 8, y: q.y * T + 8 }));
      const out = [];
      for (let i = 0; i < P.length - 1; i++) {
        const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
        for (let k = 0; k < 8; k++) {
          const t = k / 8, t2 = t * t, t3 = t2 * t;
          const f = (a, b, c, d) => 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
          out.push({ x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) });
        }
      }
      out.push(P[P.length - 1]);
      for (let i = 0; i < out.length - 1; i++) {
        const sg = { ax: out[i].x, ay: out[i].y, bx: out[i + 1].x, by: out[i + 1].y, w };
        this.segs.push(sg);
        const pad = w + 10;
        const x0 = Math.floor((Math.min(sg.ax, sg.bx) - pad) / T), x1 = Math.floor((Math.max(sg.ax, sg.bx) + pad) / T);
        const y0 = Math.floor((Math.min(sg.ay, sg.by) - pad) / T), y1 = Math.floor((Math.max(sg.ay, sg.by) + pad) / T);
        for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (this.inb(tx, ty)) this.segGrid[this.idx(tx, ty)].push(sg);
      }
    };
    addPath([{ x: 46, y: 39 }, { x: 52, y: 35.5 }, { x: 58, y: 33.5 }, { x: 63, y: 34.6 }, { x: 68, y: 34.2 }, { x: 74.6, y: 32 }, { x: 75, y: 27 }, { x: 72.5, y: 23.6 }], 10);
    addPath([{ x: 46, y: 39 }, { x: 40, y: 36 }, { x: 33, y: 32 }, { x: 26, y: 27 }, { x: 20, y: 22 }, { x: 15, y: 19 }], 10);
    addPath([{ x: 46, y: 39 }, { x: 47, y: 46 }, { x: 45, y: 53 }, { x: 42, y: 60 }], 7);
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
      if (this.pathDist(x * T + 8, y * T + 8) < 3) this.tiles[this.idx(x, y)] = this.dark[this.idx(x, y)] > 0.5 ? 5 : 1;
    }

    // ponds, also per pixel
    this.ponds = [
      { x: L.pond.x * T + 8, y: L.pond.y * T + 8, rx: L.pond.rx * T, ry: L.pond.ry * T },
      { x: 8.5 * T + 8, y: 24 * T + 8, rx: 2.8 * T, ry: 1.9 * T, dark: true },
    ];
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
      if (this.waterVal(x * T + 8, y * T + 8) < 1.0) { this.tiles[this.idx(x, y)] = 2; this.solid[this.idx(x, y)] = 1; }
    }

    // garden soil
    const G = L.garden;
    for (let y = G.y; y < G.y + G.h; y++) for (let x = G.x; x < G.x + G.w; x++) this.tiles[this.idx(x, y)] = 3;

    // ---------- reserved areas (no trees) ----------
    const reserved = new Uint8Array(MW * MH);
    const reserve = (x0, y0, x1, y1) => {
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (this.inb(x, y)) reserved[this.idx(x, y)] = 1;
    };
    reserve(L.cottage.x - 7, L.cottage.y - 6, L.cottage.x + 7, L.cottage.y + 3);
    reserve(G.x - 2, G.y - 2, G.x + G.w + 1, G.y + G.h + 1);
    reserve(L.den.x - 6, L.den.y - 6, L.den.x + 6, L.den.y + 5);
    reserve(L.start.x - 3, L.start.y - 3, L.start.x + 3, L.start.y + 3);
    for (let i = 0; i < MW * MH; i++) if (this.tiles[i] === 1 || this.tiles[i] === 2 || this.tiles[i] === 3 || this.tiles[i] === 5) reserved[i] = 1;
    const near = (x, y, rad) => {
      for (let oy = -rad; oy <= rad; oy++) for (let ox = -rad; ox <= rad; ox++) {
        if (!this.inb(x + ox, y + oy)) continue;
        if (reserved[this.idx(x + ox, y + oy)]) return true;
      }
      return false;
    };

    const occupied = new Uint8Array(MW * MH);
    const addProp = (p) => { this.props.push(p); return p; };

    // buildings
    const cottage = FH.makeCottage();
    addProp({ type: 'building', x: L.cottage.x * T + 8, y: (L.cottage.y + 1) * T, spr: cottage, name: 'cottage' });
    for (let y = L.cottage.y - 2; y <= L.cottage.y; y++) for (let x = L.cottage.x - 2; x <= L.cottage.x + 2; x++) this.solid[this.idx(x, y)] = 1;
    this.lights.push({ x: L.cottage.x * T - 13, y: L.cottage.y * T - 9, r: 34, col: '255,200,110', flick: 1 });
    this.lights.push({ x: L.cottage.x * T + 30, y: L.cottage.y * T - 9, r: 34, col: '255,200,110', flick: 1 });
    this.chimney = { x: L.cottage.x * T + 27, y: L.cottage.y * T - 46 };

    const den = FH.makeDen();
    addProp({ type: 'building', x: L.den.x * T + 8, y: (L.den.y + 1) * T, spr: den, name: 'den' });
    for (let y = L.den.y - 2; y <= L.den.y; y++) for (let x = L.den.x - 1; x <= L.den.x + 1; x++) this.solid[this.idx(x, y)] = 1;
    this.lights.push({ x: L.den.x * T + 8, y: L.den.y * T - 22, r: 40, col: '255,210,120', flick: 1 });
    this.cauldron = addProp({ type: 'cauldron', x: (L.den.x + 3) * T + 8, y: (L.den.y + 2) * T + 4, spr: FH.makeCauldron() });
    this.solid[this.idx(L.den.x + 3, L.den.y + 2)] = 1;
    this.lights.push({ x: this.cauldron.x, y: this.cauldron.y - 10, r: 46, col: '240,120,210', flick: 2 });

    // lamp by the cottage gate and one at the dark wood's edge
    const lamp = FH.makeLamp();
    [[61, 31], [31, 31], [19, 21]].forEach(([lx, ly]) => {
      addProp({ type: 'deco', x: lx * T + 8, y: ly * T + 12, spr: lamp, solid: true });
      this.solid[this.idx(lx, ly)] = 1;
      this.lights.push({ x: lx * T + 8, y: ly * T + 12 - 25, r: 44, col: '255,226,140', flick: 1 });
    });

    // garden fence
    const fenceH = FH.makeFence(false), fenceV = FH.makeFence(true);
    for (let x = G.x - 1; x <= G.x + G.w; x++) {
      for (const y of [G.y - 1, G.y + G.h]) {
        if (y === G.y + G.h && (x === G.x + 4)) continue; // gate gap
        addProp({ type: 'deco', x: x * T + 8, y: y * T + 15, spr: fenceH });
        this.solid[this.idx(x, y)] = 1; occupied[this.idx(x, y)] = 1;
      }
    }
    for (let y = G.y; y < G.y + G.h; y++) {
      for (const x of [G.x - 1, G.x + G.w]) {
        addProp({ type: 'deco', x: x * T + 8, y: y * T + 15, spr: fenceV });
        this.solid[this.idx(x, y)] = 1; occupied[this.idx(x, y)] = 1;
      }
    }
    // crops in rows
    const cropKinds = ['carrot', 'turnip', 'radish', 'pumpkin'];
    for (let row = 0; row < 2; row++) for (let i = 0; i < 4; i++) {
      const cx = G.x + 1 + i * 2, cy = G.y + 1 + row * 2;
      const kind = cropKinds[(i + row) % 4];
      this.crops.push({ x: cx * T + 8, y: cy * T + 12, kind, growth: 0.4 + r() * 0.6, rate: 1 / (70 + r() * 50) });
    }

    // signpost at the crossroads
    addProp({ type: 'sign', x: 44 * T + 8, y: 36 * T + 14, spr: FH.makeSign(), text: '← Dark Wood · Belladonna\'s Den        Grandma Hazel\'s →' });
    this.solid[this.idx(44, 36)] = 1;

    // ---------- trees ----------
    const variants = {
      oak: [0, 1, 2, 3, 4].map(i => FH.makeTree('oak', i + 1)),
      birch: [0, 1].map(i => FH.makeTree('birch', i + 10)),
      autumn: [0, 1].map(i => FH.makeTree('autumn', i + 20)),
      pine: [0, 1, 2].map(i => FH.makeTree('pine', i + 30)),
      dark: [0, 1, 2].map(i => FH.makeTree('dark', i + 40)),
      darkpine: [0, 1, 2].map(i => FH.makeTree('darkpine', i + 50)),
      dead: [0, 1].map(i => FH.makeTree('dead', i + 60)),
    };
    const pickTree = (d, x, y) => {
      if (d > 0.5) {
        const k = r();
        return k < 0.45 ? variants.dark : k < 0.85 ? variants.darkpine : variants.dead;
      }
      const k = r();
      if (y < 12 || x > 80) return k < 0.6 ? variants.pine : variants.oak;
      return k < 0.55 ? variants.oak : k < 0.7 ? variants.birch : k < 0.82 ? variants.autumn : variants.pine;
    };

    for (let y = 1; y < MH - 1; y++) for (let x = 1; x < MW - 1; x++) {
      const i = this.idx(x, y);
      if (reserved[i] || occupied[i] || this.solid[i]) continue;
      const border = Math.min(x, y, MW - 1 - x, MH - 1 - y);
      const d = this.dark[i];
      const grove = nz(x * 0.12 + 40, y * 0.12);
      let dens = 0.04 + Math.max(0, grove - 0.48) * 0.9;
      if (d > 0.5) dens += 0.12;
      if (border < 4) dens = 0.75 - border * 0.12;
      if (near(x, y, 1)) dens *= 0.2;
      if (r() < dens) {
        // keep trees from touching each other too much
        let crowded = false;
        for (let oy = -1; oy <= 1 && !crowded; oy++) for (let ox = -1; ox <= 1; ox++) if (this.inb(x + ox, y + oy) && occupied[this.idx(x + ox, y + oy)] === 2) crowded = true;
        if (crowded && border >= 4) continue;
        const set = pickTree(d, x, y);
        const spr = set[Math.floor(r() * set.length)];
        const p = addProp({ type: 'tree', x: x * T + 8 + Math.floor((r() - 0.5) * 6), y: y * T + 14, spr, dark: d > 0.5 });
        this.solid[i] = 1; occupied[i] = 2;
        this.shakeables.push(p);
      }
    }
    // fill the very edge of the map with a wall of pines so it reads as "the forest goes on"
    for (let x = 0; x < MW; x++) for (const y of [0, MH - 1]) this.solid[this.idx(x, y)] = 1;
    for (let y = 0; y < MH; y++) for (const x of [0, MW - 1]) this.solid[this.idx(x, y)] = 1;

    // ---------- small props ----------
    const bushLight = [0, 1, 2].map(i => FH.makeBush('oak', i + 70, i === 0 ? '#e0463a' : null));
    const bushDark = [0, 1].map(i => FH.makeBush('dark', i + 80, i === 0 ? '#c8a2ff' : null));
    const rocks = [0, 1].map(i => FH.makeRock(i + 90)), rocksDark = [0, 1].map(i => FH.makeRock(i + 95, true));
    const flowers = [0, 1, 2, 3].map(i => FH.makeFlowers(i + 100)), flowersDark = [0, 1].map(i => FH.makeFlowers(i + 110, true));
    const shrooms = [0, 1].map(i => FH.makeShroomDecor(i + 120));
    const stump = FH.makeStump(), log = FH.makeLog();
    this.brambleSprites = [0, 1, 2].map(i => FH.makeBramble(i + 130));
    this.brambles = [];

    for (let y = 2; y < MH - 2; y++) for (let x = 2; x < MW - 2; x++) {
      const i = this.idx(x, y);
      if (this.solid[i] || occupied[i] || this.tiles[i] === 2 || this.tiles[i] === 3) continue;
      const onPath = this.tiles[i] === 1 || this.tiles[i] === 5;
      const d = this.dark[i];
      const k = r();
      const px = x * T + 8, py = y * T + 14;
      if (onPath) continue;
      if (reserved[i] && k > 0.02) continue;
      if (d > 0.5) {
        if (k < 0.035 && !near(x, y, 1)) {
          const b = addProp({ type: 'bramble', x: px, y: py, spr: this.brambleSprites[Math.floor(r() * 3)] });
          this.brambles.push(b); occupied[i] = 1;
        } else if (k < 0.07) { const p = addProp({ type: 'bush', x: px, y: py, spr: bushDark[Math.floor(r() * 2)] }); this.solid[i] = 1; occupied[i] = 1; this.shakeables.push(p); }
        else if (k < 0.1) { addProp({ type: 'deco', x: px, y: py, spr: shrooms[Math.floor(r() * 2)], flat: true }); }
        else if (k < 0.13) { addProp({ type: 'deco', x: px, y: py, spr: flowersDark[Math.floor(r() * 2)], flat: true }); }
        else if (k < 0.145) { addProp({ type: 'deco', x: px, y: py, spr: rocksDark[Math.floor(r() * 2)] }); this.solid[i] = 1; occupied[i] = 1; }
      } else {
        if (k < 0.04) { const p = addProp({ type: 'bush', x: px, y: py, spr: bushLight[Math.floor(r() * 3)] }); this.solid[i] = 1; occupied[i] = 1; this.shakeables.push(p); }
        else if (k < 0.15) { addProp({ type: 'deco', x: px, y: py, spr: flowers[Math.floor(r() * 4)], flat: true }); }
        else if (k < 0.165) { addProp({ type: 'deco', x: px, y: py, spr: rocks[Math.floor(r() * 2)] }); this.solid[i] = 1; occupied[i] = 1; }
        else if (k < 0.172) { addProp({ type: 'deco', x: px, y: py, spr: stump }); this.solid[i] = 1; occupied[i] = 1; }
        else if (k < 0.176 && x < MW - 4) { addProp({ type: 'deco', x: px + 8, y: py, spr: log }); this.solid[i] = 1; this.solid[i + 1] = 1; occupied[i] = 1; occupied[i + 1] = 1; }
      }
    }

    // ---------- forage spawn points ----------
    const meadowTable = [['strawberry', 4], ['blueberry', 4], ['apple', 3], ['chanterelle', 3], ['fiddlehead', 3]];
    const edgeTable = [['chanterelle', 3], ['blueberry', 2], ['fiddlehead', 2], ['moonleaf', 1], ['glowcap', 1]];
    const darkTable = [['nightberry', 4], ['glowcap', 3], ['moonleaf', 3], ['chanterelle', 1]];
    for (let y = 2; y < MH - 2; y++) for (let x = 2; x < MW - 2; x++) {
      const i = this.idx(x, y);
      if (this.solid[i] || occupied[i] || this.tiles[i] === 2 || this.tiles[i] === 3) continue;
      if (this.tiles[i] === 1 || this.tiles[i] === 5) continue;
      const d = this.dark[i];
      const chance = d > 0.5 ? 0.05 : (d > 0.1 ? 0.04 : 0.028);
      if (r() > chance) continue;
      const table = d > 0.5 ? darkTable : d > 0.1 ? edgeTable : meadowTable;
      this.spawns.push({ x: x * T + 8, y: y * T + 9, table, dark: d > 0.5, item: null, timer: r() * 4 });
      occupied[i] = 1;
    }
  };

  // Pick an item for a spawn point, including the lookalikes.
  World.prototype.rollItem = function (table, rand) {
    let tot = 0;
    table.forEach(e => { tot += e[1]; });
    let k = rand() * tot, id = table[0][0];
    for (const e of table) { if ((k -= e[1]) <= 0) { id = e[0]; break; } }
    const twin = { chanterelle: 'jack', blueberry: 'baneberry', nightberry: 'gloomberry' }[id];
    if (twin && rand() < 0.3) id = twin;
    return id;
  };

  // ---------- ground baking ----------
  const GROUND = {
    grass: ['#3e6b2e', '#4c7d34', '#5a8f3c', '#6aa145', '#7fb352'],
    path: ['#8a6a44', '#a07c50', '#b8925e', '#ccaa74'],
    dgrass: ['#1c1830', '#241f3c', '#2d2748', '#373056', '#433a66'],
    dpath: ['#2e2638', '#3a3046', '#463a54', '#544662'],
    soil: ['#4a2f1f', '#5c3b26', '#6e4a30'],
    water: ['#2d5b7a', '#3a7090', '#4f8aa8', '#8fc4d8'],
    dwater: ['#141430', '#1c1c44', '#28285a', '#5a4a9a'],
  };

  World.prototype.bake = function () {
    const W = MW * T, H = MH * T;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    const img = g.createImageData(W, H);
    const data = img.data;
    const nz = this.noise, nz2 = this.noise2;
    const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    const P = {};
    Object.keys(GROUND).forEach(k => { P[k] = GROUND[k].map(hex); });
    const r = FH.rng(7);
    const B4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
    const q = (pal, v, x, y) => {
      const n = pal.length;
      const f = Math.max(0, Math.min(0.999, v)) * n;
      let i = Math.floor(f);
      if (f - i > (B4[y & 3][x & 3] + 0.5) / 16 && i + 1 < n) i++;
      return pal[i];
    };
    const tileAt = (px, py) => this.tile(Math.floor(px / T), Math.floor(py / T));

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const tx = Math.floor(x / T), ty = Math.floor(y / T);
        const t = this.tile(tx, ty);
        // blend field for the dark wood edge, sampled smoothly
        const d = this.darkSmooth(x / T, y / T);
        const n = nz(x / 40, y / 40), n2 = nz2(x / 9, y / 9);
        let col;
        const wv = (t === 2 || this.tile(tx + 1, ty) === 2 || this.tile(tx - 1, ty) === 2 || this.tile(tx, ty + 1) === 2 || this.tile(tx, ty - 1) === 2) ? this.waterVal(x, y) : 9;
        if (t === 3) {
          const furrow = (y % 16 < 3) ? 0 : (y % 16 < 5 ? 2 : 1);
          col = P.soil[Math.min(2, furrow + (n2 > 0.6 ? 1 : 0)) % 3];
        } else if (wv < 1) {
          const pal = d > 0.5 ? P.dwater : P.water;
          let v = 0.3 + n * 0.25 + (wv > 0.72 ? 0.25 : 0);
          if (wv > 0.88) v = 0.97;
          col = q(pal, v, x, y);
        } else if (wv < 1.1) {
          col = d > 0.5 ? [28, 22, 40] : [92, 78, 52]; // muddy bank
          if ((x + y) % 3 === 0) col = d > 0.5 ? [44, 36, 64] : [122, 104, 66];
        } else {
          const pd = this.pathDist(x, y) + (n2 - 0.5) * 7;
          if (pd < 0) {
            const pal = d > 0.5 ? P.dpath : P.path;
            let v = 0.38 + n2 * 0.35 + (n - 0.5) * 0.3;
            if (pd > -2.5) v -= 0.22;
            if (r() < 0.015) v = 0.95;
            col = q(pal, v, x, y);
          } else {
            const pal = d > 0.5 ? P.dgrass : P.grass;
            let v = 0.3 + n * 0.45 + (n2 - 0.5) * 0.25;
            if (pd < 3) v -= 0.12;
            col = q(pal, v, x, y);
            if (d > 0.35 && d < 0.65) {
              const alt = d > 0.5 ? P.grass : P.dgrass;
              const th = Math.abs(d - 0.5) * 6.6;
              if ((B4[y & 3][x & 3] / 16) > th) col = q(alt, v, x, y);
            }
          }
        }
        const o = (y * W + x) * 4;
        data[o] = col[0]; data[o + 1] = col[1]; data[o + 2] = col[2]; data[o + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);

    // grass tufts and tiny pebbles
    const tr = FH.rng(11);
    for (let i = 0; i < 4200; i++) {
      const x = Math.floor(tr() * W), y = Math.floor(tr() * H);
      const t = tileAt(x, y);
      if ((t !== 0 && t !== 4) || this.pathDist(x, y) < 2 || this.waterVal(x, y) < 1.2) continue;
      const dk = t === 4;
      g.fillStyle = dk ? (tr() < 0.5 ? '#4a4078' : '#151226') : (tr() < 0.5 ? '#8fc45c' : '#2f5624');
      g.fillRect(x, y, 1, 2); g.fillRect(x - 1, y + 1, 1, 1); g.fillRect(x + 1, y, 1, 1);
    }
    for (let i = 0; i < 700; i++) {
      const x = Math.floor(tr() * W), y = Math.floor(tr() * H);
      const t = tileAt(x, y);
      if ((t !== 1 && t !== 5) || this.pathDist(x, y) > -3) continue;
      g.fillStyle = t === 5 ? '#5e5070' : '#d8bc88';
      g.fillRect(x, y, 2, 1);
      g.fillStyle = t === 5 ? '#201a2a' : '#6e5232';
      g.fillRect(x, y + 1, 2, 1);
    }
    this.ground = c;
  };

  World.prototype.pathDist = function (px, py) {
    const tx = Math.floor(px / T), ty = Math.floor(py / T);
    if (!this.inb(tx, ty)) return 99;
    let best = 99;
    for (const sg of this.segGrid[this.idx(tx, ty)]) {
      const vx = sg.bx - sg.ax, vy = sg.by - sg.ay;
      const l2 = vx * vx + vy * vy || 1;
      let t = ((px - sg.ax) * vx + (py - sg.ay) * vy) / l2;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const dx = px - (sg.ax + vx * t), dy = py - (sg.ay + vy * t);
      const d = Math.sqrt(dx * dx + dy * dy) - sg.w;
      if (d < best) best = d;
    }
    return best;
  };
  World.prototype.waterVal = function (px, py) {
    let best = 9;
    for (const pd of this.ponds) {
      const dx = (px - pd.x) / pd.rx, dy = (py - pd.y) / pd.ry;
      const v = dx * dx + dy * dy;
      if (v < best) best = v;
    }
    return best + (this.noise(px / 26, py / 26) - 0.5) * 0.45;
  };

  World.prototype.darkSmooth = function (fx, fy) {
    const x0 = Math.floor(fx - 0.5), y0 = Math.floor(fy - 0.5);
    const tx = fx - 0.5 - x0, ty = fy - 0.5 - y0;
    const g = (x, y) => this.inb(x, y) ? this.dark[this.idx(x, y)] : 0.5;
    const a = g(x0, y0), b = g(x0 + 1, y0), c = g(x0, y0 + 1), d = g(x0 + 1, y0 + 1);
    return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
  };
  World.prototype.shoreDist = function (x, y) {
    for (let r = 1; r <= 3; r++) {
      if (this.tile(Math.floor((x + r) / T), Math.floor(y / T)) !== 2 ||
          this.tile(Math.floor((x - r) / T), Math.floor(y / T)) !== 2 ||
          this.tile(Math.floor(x / T), Math.floor((y + r) / T)) !== 2 ||
          this.tile(Math.floor(x / T), Math.floor((y - r) / T)) !== 2) return r;
    }
    return 9;
  };
  World.prototype.pathEdge = function (x, y, tileAt) {
    let s = 0, n = 0;
    for (let oy = -4; oy <= 4; oy += 2) for (let ox = -4; ox <= 4; ox += 2) {
      const t = tileAt(x + ox, y + oy);
      s += (t === 1 || t === 5) ? 1 : 0; n++;
    }
    return s / n - 0.45 + (this.noise2(x / 3, y / 3) - 0.5) * 0.25;
  };
})(window.FH);
