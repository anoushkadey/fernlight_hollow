// Hand-placed pixel art. Every sprite is a grid of palette letters; '.' is empty.
// Overlays are drawn on top of a base, so characters share one face and body.
window.FH = window.FH || {};

(function (FH) {
  'use strict';

  // ---------- palettes ----------
  const OUT = '#2b1d16';

  const PAL = {
    draco: {
      k: OUT, h: '#e8b65a', H: '#a8702f', L: '#fbe2a2',
      s: '#f6d3b3', d: '#dfa486', e: '#c2402f', E: '#4f1010', w: '#fff6e6',
      b: '#f2998a', m: '#9c4a40',
      c: '#c9a879', C: '#93744c', x: '#e5cf9f', n: '#26222e', N: '#3b3546',
      p: '#3b3546', f: '#5a3a2a',
    },
    sage: {
      k: '#1f2a1a', h: '#86d651', H: '#3e9440', L: '#cdf28f',
      s: '#f7d7bd', d: '#e3ae95', e: '#2f8a62', E: '#123824', w: '#f4fff0',
      b: '#f2a08d', m: '#9c5046',
      c: '#e1ded6', C: '#a9a499', o: '#3d3c46', O: '#26252c', y: '#e0b84f',
      p: '#3d3c46', f: '#24232a',
    },
    willow: {
      k: '#24182e', h: '#9d70d4', H: '#62409c', L: '#d0aef4',
      s: '#f8d5be', d: '#e5aa94', e: '#7d4fc0', E: '#2e1652', w: '#fff7ff',
      b: '#f297a0', m: '#a04a58',
      c: '#2e3a5e', C: '#1c2442', x: '#f3eee4', a: '#e8c35a', y: '#efc04d',
      p: '#2e3a5e', f: '#1b1b26',
    },
    grandma: {
      k: OUT, h: '#ece7de', H: '#b6ad9f', L: '#ffffff',
      s: '#f3d0b5', d: '#d9a98e', e: '#4a3426', E: '#2a1c14', w: '#fffaf0',
      b: '#ef9e8e', m: '#a0564a', g: '#b07d36',
      c: '#6f904e', C: '#4b6a34', a: '#c2402f', r: '#7c4b5c', R: '#583445', f: '#3a2a22',
    },
    witch: {
      k: '#1c1226', h: '#cdbbea', H: '#9580c2', L: '#efe6ff',
      s: '#efd8d2', d: '#d3aca6', e: '#a55ad6', E: '#36115e', w: '#fff6ff',
      b: '#e3a0c0', m: '#8e3f6a',
      p: '#4d3674', P: '#33224f', B: '#a34a7d', y: '#f4d36d',
      c: '#2b2338', C: '#1b1526',
    },
  };

  // ---------- helpers ----------
  function grid(rows, w) {
    return rows.map(r => {
      if (r.length > w) r = r.slice(0, w);
      while (r.length < w) r += '.';
      return r.split('');
    });
  }
  function mirrorHalf(halfRows) {
    return halfRows.map(r => r + r.split('').reverse().join(''));
  }
  function overlay(base, rows, ox, oy) {
    ox = ox || 0; oy = oy || 0;
    rows.forEach((r, y) => {
      for (let x = 0; x < r.length; x++) {
        const ch = r[x];
        if (ch === '.' || ch === ' ') continue;
        const yy = y + oy, xx = x + ox;
        if (base[yy] && xx < base[yy].length) base[yy][xx] = ch === '_' ? '.' : ch;
      }
    });
    return base;
  }

  const cache = new Map();
  function render(cells, pal, opts) {
    opts = opts || {};
    const h = cells.length, w = cells[0].length;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const ch = cells[opts.flip ? y : y][opts.flip ? w - 1 - x : x];
        if (ch === '.') continue;
        const col = pal[ch];
        if (!col) continue;
        g.fillStyle = col;
        g.fillRect(x, y, 1, 1);
      }
    }
    return c;
  }
  FH.renderCells = render;
  FH.grid = grid;
  FH.PAL = PAL;
  FH.OUT = OUT;

  // ---------- portraits (32x32) ----------
  const FACE_HALF = [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '..........kkkkkk',
    '........kkssssss',
    '.......kssssssss',
    '......ksssssssss',
    '......ksssssssss',
    '.....kssssssssss',
    '.....kssssssssss',
    '.....kssssssssss',
    '.....kssssssssss',
    '.....kssssssssss',
    '.....kssssssssss',
    '.....kssssssssss',
    '.....kssssssssss',
    '.....kssssssssss',
    '......ksssssssss',
    '.......kssssssss',
    '........kkssssss',
    '..........kkksss',
    '............kdss',
    '........kkkkkdss',
    '......kkcccccCdd',
    '.....kcccccccCCC',
    '....kcccccccccCc',
    '...kccccccccccCc',
    '..kcccccccccccCc',
    '..kcccccccccccCc',
  ];

  const EYES = {
    open: ['kkkk', 'ewEe', 'eEEe', '.ee.'],
    happy: ['....', '.kk.', 'k..k', '....'],
    lidded: ['....', 'kkkk', 'eEEe', '.ee.'],
    wide: ['kkkk', 'weEe', 'eEEe', 'eeee'],
  };

  const HAIR = {
    draco: [
      '................................',
      '................kk..............',
      '..........kkkkkkLhk.............',
      '........kkLLhhhhhhhhhhkkk.......',
      '.......kLLhhhhhhhhhhhhhhk.......',
      '......kLhhhhhhhhhhhhhhhhhk......',
      '.....kLhhhhhhhhhhhhhhhhhhhk.....',
      '.....kLhhhhhhhhhhhhhhhhhhhhk....',
      '....kLhhhhhhhhhhhhhhhhhhhhhhk...',
      '....khhhhhhhhhhhhhhhhhhhhhhhk...',
      '....khhhhHhhhhhHhhhhhHhhhhhhk...',
      '...khhhhhHhhhhHhhHhhhhHhhhhhk...',
      '...khhhhH.HhhH.hh.HhhH.Hhhhhk...',
      '...khhH....HH..HH..HH....Hhhk...',
      '...khhH..................Hhhk...',
      '...khhH..................Hhhk...',
      '...khhH..................Hhhk...',
      '...khhH..................Hhhk...',
      '...khhH..................Hhhk...',
      '....khH..................Hhk....',
      '.....kH..................Hk.....',
    ],
    sage: [
      '................................',
      '..............k.....k...........',
      '.........kk..kLk...kLk..........',
      '........kLhkkhhhkkkhhkk.........',
      '.......kLhhhhhhhhhhhhhhhk.......',
      '......kLhhhhhhhhhhhhhhhhhk......',
      '.....kLhhhhhhhhhhhhhhhhhhhk.....',
      '....kLhhhhhhhhhhhhhhhhhhhhhk....',
      '...kLhhhhhhhhhhhhhhhhhhhhhhhk...',
      '...khhhhhhhhhhhhhhhhhhhhhhhhk...',
      '..khhhhhhHhhhhhhhhHhhhhhhHhhhk..',
      '..khhhhhhhhhHhhhhhhHHhhhhhHhhk..',
      '..khhhhhhhhhhhH.HhH..H.Hhhhhhk..',
      '..khhhhhhhhhH....H........Hhhk..',
      '..khhhH...................Hhhk..',
      '..khhhH...................Hhhk..',
      '..khhhH...................Hhhk..',
      '..khhhH...................Hhhk..',
      '..khhhH...................Hhhk..',
      '..khhhH...................Hhhk..',
      '..khhhH...................Hhhk..',
      '..khhhhH................Hhhhhk..',
      '..khhhhhH..............Hhhhhhk..',
      '..khhhhhhk............khhhhhhk..',
      '...khhhhhhk..........khhhhhhk...',
      '...khhhhhHk..........kHhhhhhk...',
      '....khhhhHk..........kHhhhhk....',
      '....khhhHk............kHhhhk....',
      '.....khHk..............kHhk.....',
      '......kk................kk......',
    ],
    willow: [
      '................................',
      '....................kkkk........',
      '...........kkkk....kLhhhk.......',
      '.........kkLhhhkkk.kLhhhhk......',
      '........kLhhhhhhhhkhhhhhhhk.....',
      '.......kLhhhhhhhhhhhhhhhhhhk....',
      '......kLhhhhhhhhhhhhhhhhhhhhk...',
      '.....kLhhhhhhhhhhhhhhhhHhhhhhk..',
      '....kLhhhhhhhhhhhhhhhhhHhhhhhhk.',
      '...khhhhhhhhhhhhhhhhhhhhhhHhhhhk',
      '...khhHhhhhHhhhhhHhhhhhHhhHhhhhk',
      '...khHkHhhHkHhhhHkHhhhHkhHhhhhhk',
      '...khhH.kHHk.kHHk.kHHk.Hhhhhhhk.',
      '...khH..................Hhhhhhk.',
      '...khH...................Hhhhhk.',
      '..khhH...................Hhhhhk.',
      '..kHhk...................HhhhHhk',
      '...khH...................HhhHhhk',
      '..khhH...................Hhhhhk.',
      '..kHhk...................kHhhhk.',
      '..y..y....................khhhk.',
      '..y..y....................kHhk..',
      '...yy.....................khHk..',
      '...........................kk...',
    ],
    grandma: [
      '................................',
      '..............kkkk..............',
      '.............kLhhhk.............',
      '.............khhhHk.............',
      '...........kkkHHHkkk............',
      '.........kkLhhhhhhhhkk..........',
      '........kLhhhhhhhhhhhhk.........',
      '.......kLhhhhhhhhhhhhhhk........',
      '......kLhhhhhhhhhhhhhhhhk.......',
      '......khhhhhhhhhhhhhhhhhhk......',
      '.....khhhhhhhhhHHhhhhhhhhhk.....',
      '.....khhhhhHk......kHhhhhhk.....',
      '.....khhhHk..........kHhhhk.....',
      '.....khHk..............kHhk.....',
      '.....kH..................Hk.....',
    ],
    witch: [
      '....................kk..........',
      '..................kkpk..........',
      '.................kpPk...........',
      '................kppPk...........',
      '...............kpppPk...........',
      '..............kpppppPk..........',
      '.............kppyppppPk.........',
      '............kppyyppppPPk........',
      '...........kkBBBBBBBBBBBkk......',
      '...kkkkkkppppppppppppppppkkkkkk.',
      '.kPPPppppppppppppppppppppppPPPk.',
      '..kkkkPPPPPPPPPPPPPPPPPPPPkkkk..',
      '.....khhhhhhhhhhhhhhhhhhhhk.....',
      '.....khhhhhHk.....kHhhhhhhk.....',
      '....khhH................Hhhk....',
      '....khhH................Hhhk....',
      '....khhH................Hhhk....',
      '....khhH................Hhhk....',
      '....khhH................Hhhk....',
      '....khhH................Hhhk....',
      '....khhH................Hhhk....',
      '....khhH................Hhhk....',
      '....khhH................Hhhk....',
      '....khhhk..............khhhk....',
      '....khhhhk............khhhhk....',
      '....khhhhHk..........kHhhhhk....',
      '....khhhhHk..........kHhhhhk....',
      '.....khhHk............kHhhk.....',
      '......kk..............kk........',
    ],
  };

  const CLOTHES = {
    draco: { y: 24, rows: [
      '............knnnnnnk............',
      '........kkkkknnnnnnkkkkk........',
      '......kkcccccnnnnnncccccckk.....',
      '.....kcccccxCnnnnnnCxccccck.....',
      '....kccccccxCnnnnnnCxcccccck....',
      '...kcccccccxCnnnnnnCxccccccck...',
      '..kccccccccxCnnNnnnCxcccccccck..',
      '..kccccccccxCnnnnnnCxcccccccck..',
    ] },
    sage: { y: 27, rows: [
      '.........oo..........oo.........',
      '..........oo........oo..........',
      '..........oyooooooooyo..........',
      '..........oOooooooooOo..........',
      '..........oOooooooooOo..........',
    ] },
    willow: { y: 26, rows: [
      '.............xxxxxx.............',
      '...........CxxxxxxxxC...........',
      '............CxxxxxxC............',
      '.............CxxxxC....a........',
      '..............CxxC..............',
      '...............CC...............',
    ] },
    grandma: { y: 26, rows: [
      '.............wwwwww.............',
      '............CwwwwwwC............',
      '...........CccwwwwccC...........',
      '...............aa...............',
    ] },
    witch: { y: 26, rows: [
      '.............pppppp.............',
      '............pPccccPp............',
      '.............pccccp.............',
      '...............yy...............',
    ] },
  };

  const GLASSES = [
    '........gggggg....gggggg........',
    '.......g......g..g......g.......',
    '.......g......gggg......g.......',
    '.......g......g..g......g.......',
    '.......g......g..g......g.......',
    '........gggggg....gggggg........',
  ];

  function portraitCells(who, mood) {
    const base = grid(mirrorHalf(FACE_HALF), 32);
    const eyeKey = mood === 'happy' ? 'happy' : (who === 'witch' && mood !== 'wide' ? 'lidded' : (mood || 'open'));
    let eyes = EYES[eyeKey] || EYES.open;
    if (who === 'grandma' && mood !== 'wide') eyes = EYES.happy;
    overlay(base, eyes, 9, 14);
    overlay(base, eyes, 19, 14);
    // nose, blush, mouth
    overlay(base, ['d'], 15, 18);
    overlay(base, ['bb'], 8, 18);
    overlay(base, ['bb'], 22, 18);
    if (mood === 'happy') overlay(base, ['m..m', '.mm.'], 14, 20);
    else if (mood === 'wide') overlay(base, ['.m.', 'm.m', '.m.'], 14, 20);
    else if (who === 'witch') overlay(base, ['...m', 'mmm.'], 14, 20);
    else overlay(base, ['mm'], 15, 21);
    if (who === 'grandma') {
      overlay(base, GLASSES, 0, 13);
      overlay(base, ['d....d'], 13, 22);
    }
    const cl = CLOTHES[who];
    if (cl) overlay(base, cl.rows, 0, cl.y);
    overlay(base, HAIR[who] || [], 0, 0);
    return base;
  }

  FH.portrait = function (who, mood) {
    const key = 'p:' + who + ':' + (mood || 'open');
    if (!cache.has(key)) cache.set(key, render(portraitCells(who, mood), PAL[who]));
    return cache.get(key);
  };

  // ---------- HD portraits (64x64) ----------
  // The 32px portrait is the sketch. It is upscaled with Scale2x, then shaded:
  // a hair sheen ring, strand lines, bang shadows on the skin, cloth folds, and
  // coloured outlines inside the silhouette. Eyes and mouths are drawn at full size.
  function hexRgb(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
  function rgbHex(c) { return '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join(''); }
  function mix(a, b, t) { const x = hexRgb(a), y = hexRgb(b); return rgbHex(x.map((v, i) => v + (y[i] - v) * t)); }
  FH.mix = mix;
  function extPal(pal) {
    const p = Object.assign({}, pal);
    p.q = p.q || mix(p.H, '#1a1020', 0.35);         // deep hair shadow / inner outline
    p.D = p.D || mix(p.d, '#5a2a30', 0.3);          // deep skin shadow / inner outline
    p.i = p.i || mix(p.e, '#ffffff', 0.4);          // lower iris glow
    p.R = p.R || mix(p.m, '#3a0a14', 0.4);          // inside of the mouth
    p.r = p.r || mix(p.c || '#888888', '#ffffff', 0.18);
    p.Q = p.Q || mix(p.C || '#444444', '#10080c', 0.3);
    p.W = p.W || '#ffffff';
    return p;
  }

  function scale2x(cells) {
    const h = cells.length, w = cells[0].length;
    const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? '.' : cells[y][x];
    const out = [];
    for (let y = 0; y < h * 2; y++) out.push(new Array(w * 2).fill('.'));
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const P = at(x, y), A = at(x, y - 1), B = at(x + 1, y), C = at(x - 1, y), D = at(x, y + 1);
      out[y * 2][x * 2] = (C === A && C !== D && A !== B) ? A : P;
      out[y * 2][x * 2 + 1] = (A === B && A !== C && B !== D) ? B : P;
      out[y * 2 + 1][x * 2] = (D === C && D !== B && C !== A) ? C : P;
      out[y * 2 + 1][x * 2 + 1] = (B === D && B !== A && D !== C) ? D : P;
    }
    return out;
  }

  const HD_EYES = {
    open: {
      L: ['..kkkkk.', '.kkkkkkk', 'kkWWeEek', '.kWWEEek', '.keEEEek', '.keEEEik', '.keiiiik', '..kiiik.', '...kk...'],
      R: ['.kkkkk..', 'kkkkkkk.', 'keWWEekk', 'keWWEEk.', 'keEEEEk.', 'kieEEek.', 'kiiiiek.', '.kiiik..', '...kk...'],
    },
    wide: {
      L: ['..kkkkk.', '.kkkkkkk', 'kWWeEEek', '.kWWEEek', '.keEEEek', '.keEEEik', '.keiiiik', '.kkiiikk', '..kkkk..'],
      R: ['.kkkkk..', 'kkkkkkk.', 'keWWEEek', 'keWWEEk.', 'keEEEEk.', 'kieEEek.', 'kiiiiek.', 'kkiiikk.', '..kkkk..'],
    },
    lidded: {
      L: ['........', '........', '........', '.kkkkkkk', 'kkkkkkkk', '.keWEEek', '.keEEiik', '..kiiik.', '...kk...'],
      R: ['........', '........', '........', 'kkkkkkk.', 'kkkkkkkk', 'keWEEek.', 'kiiEEek.', '.kiiik..', '...kk...'],
    },
    happy: {
      L: ['........', '........', '........', '..kkkk..', '.kk..kk.', 'kk....kk', 'k......k', '........', '........'],
      R: ['........', '........', '........', '..kkkk..', '.kk..kk.', 'kk....kk', 'k......k', '........', '........'],
    },
  };
  const HD_MOUTH = {
    open: ['.mmm.', '..mm.'],
    happy: ['mm..mm', '.mRRm.', '..mm..'],
    wide: ['.mm.', 'mRRm', 'mRRm', '.mm.'],
    smirk: ['.....m', '.mmmm.'],
  };

  const isHair = c => c === 'h' || c === 'H' || c === 'L';
  function shadeHD(g, who) {
    const h = g.length, w = g[0].length;
    const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? '.' : g[y][x];
    const cx = who === 'witch' ? 32 : 31, cy = who === 'witch' ? 30 : 26;
    const copy = g.map(r => r.slice());
    const src = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? '.' : copy[y][x];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const c = src(x, y);
      if (c === 'h') {
        const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy);
        // anime sheen ring across the crown
        if (y < cy - 2 && d > 15 && d < 17.6 && dx < 4 && dx > -14) g[y][x] = 'L';
        // strand lines
        else if ((x * 2 + y) % 11 === 0 && y > 8 && dx < 10) g[y][x] = 'H';
        // shade the far side
        else if (dx > 12) g[y][x] = 'H';
        if (!isHair(src(x, y + 1)) && src(x, y + 1) !== 'k' && src(x, y + 1) !== '.') g[y][x] = 'H';
        if (!isHair(src(x, y + 2)) && src(x, y + 2) === 's') g[y][x] = g[y][x] === 'L' ? 'h' : 'H';
      } else if (c === 's') {
        // bangs cast a shadow on the forehead and cheeks
        let shade = false;
        for (let k = 1; k <= 3; k++) { const a = src(x, y - k); if (isHair(a) || (a === 'k' && k === 1 && y > 20)) { shade = true; break; } }
        if (shade && y > 18) g[y][x] = 'd';
        if (isHair(src(x - 1, y)) || isHair(src(x + 1, y))) g[y][x] = 'd';
        // right cheek in shadow, neck under the chin
        if ((src(x + 1, y) === 'k' || src(x + 2, y) === 'k') && x > 34 && y > 26) g[y][x] = 'd';
        if (y >= 47 && y <= 49) g[y][x] = 'd';
      } else if (c === 'c') {
        if (x > 43) g[y][x] = 'C';
        else if (x < 16 && y > 56) g[y][x] = 'r';
      }
    }
    // coloured outlines inside the silhouette (sel-out)
    const copy2 = g.map(r => r.slice());
    const s2 = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? '.' : copy2[y][x];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (copy2[y][x] !== 'k') continue;
      const ns = [s2(x - 1, y), s2(x + 1, y), s2(x, y - 1), s2(x, y + 1)];
      if (ns.includes('.')) continue;
      const hair = ns.filter(isHair).length, skin = ns.filter(c => c === 's' || c === 'd').length;
      if (hair >= 2 && !skin) g[y][x] = 'q';
      else if (skin >= 2 && !hair) g[y][x] = 'D';
    }
    return g;
  }

  function portraitHDCells(who, mood) {
    // base without the face details, so they can be drawn at full resolution
    const base = grid(mirrorHalf(FACE_HALF), 32);
    if (who === 'witch') for (let y = 0; y < 12; y++) for (let x = 0; x < 32; x++) base[y][x] = '.';
    const cl = CLOTHES[who];
    if (cl) overlay(base, cl.rows, 0, cl.y);
    overlay(base, HAIR[who] || [], 0, 0);
    let g = shadeHD(scale2x(base), who);
    let em = mood || 'open';
    if (who === 'witch' && em === 'open') em = 'lidded';
    if (who === 'grandma' && em !== 'wide') em = 'happy';
    const E = HD_EYES[em] || HD_EYES.open;
    overlay(g, E.L, 17, 26);
    overlay(g, E.R, 38, 26);
    // brows peek through the bangs for some moods
    // nose and blush
    overlay(g, ['d', 'D'], 32, 36);
    overlay(g, ['b.b.b.', '.b.b.b'], 15, 38);
    overlay(g, ['b.b.b.', '.b.b.b'], 42, 38);
    const mk = em === 'happy' ? 'happy' : em === 'wide' ? 'wide' : who === 'witch' ? 'smirk' : 'open';
    const M = HD_MOUTH[mk];
    overlay(g, M, 32 - Math.floor(M[0].length / 2), 42);
    if (who === 'grandma') {
      const gl = grid(['', '', '', '', '', '', '', '', '', '', '', '', ''].concat(GLASSES), 32);
      overlay(g, scale2x(gl).map(r => r.join('')), 0, 0);
    }
    return g;
  }

  // painted backdrops so every portrait sits in a place, like the hand-drawn ones
  function backdrop(g, who) {
    const W = 64, H = 64;
    const B4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
    const ramp = who === 'witch' ? ['#1a1230', '#2a1c48', '#3d2a62', '#57407e'] : ['#5a3a24', '#7a5232', '#a07040', '#c8955a'];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const v = (who === 'witch' ? 0.75 - y / H * 0.6 : 0.25 + y / H * 0.3) + Math.sin(x * 0.3) * 0.03;
      const f = v * ramp.length;
      let i = Math.floor(f);
      if (f - i > (B4[y & 3][x & 3] + 0.5) / 16) i++;
      g.fillStyle = ramp[Math.max(0, Math.min(ramp.length - 1, i))];
      g.fillRect(x, y, 1, 1);
    }
    if (who === 'grandma') {
      // kitchen: window with morning light, a shelf, a plant
      g.fillStyle = '#4a2f1f'; g.fillRect(38, 4, 22, 20);
      g.fillStyle = '#ffe9a8'; g.fillRect(40, 6, 18, 16);
      g.fillStyle = '#f5c96a'; g.fillRect(40, 14, 18, 8);
      g.fillStyle = '#4a2f1f'; g.fillRect(48, 6, 2, 16); g.fillRect(40, 13, 18, 2);
      g.fillStyle = '#6b4428'; g.fillRect(0, 22, 20, 2);
      g.fillStyle = '#c0392b'; g.fillRect(3, 16, 4, 6); g.fillStyle = '#e8c35a'; g.fillRect(9, 17, 3, 5); g.fillStyle = '#6f904e'; g.fillRect(14, 15, 4, 7);
      g.fillStyle = '#4b6a34'; g.fillRect(52, 0, 1, 4); g.fillRect(55, 1, 1, 3);
      g.fillStyle = 'rgba(255,220,150,0.18)'; g.fillRect(30, 0, 34, 64);
    } else if (who === 'witch') {
      // stars, a crescent moon and jars on a shelf
      g.fillStyle = '#f4d36d';
      [[6, 6], [14, 12], [50, 8], [58, 18], [44, 3], [4, 20]].forEach(([x, y]) => g.fillRect(x, y, 1, 1));
      g.fillRect(55, 4, 3, 1); g.fillRect(54, 5, 2, 3); g.fillRect(55, 8, 3, 1);
      g.fillStyle = '#2a1f36'; g.fillRect(0, 30, 14, 2); g.fillRect(50, 30, 14, 2);
      g.fillStyle = '#e070c0'; g.fillRect(2, 25, 3, 5); g.fillStyle = '#7fe6f0'; g.fillRect(7, 26, 3, 4);
      g.fillStyle = '#9ad05a'; g.fillRect(53, 25, 3, 5); g.fillStyle = '#f4d36d'; g.fillRect(58, 27, 2, 3);
    }
  }

  FH.portraitFigure = function (who, mood) {
    const key = 'F:' + who + ':' + (mood || 'open');
    if (!cache.has(key)) cache.set(key, render(portraitHDCells(who, mood), extPal(PAL[who])));
    return cache.get(key);
  };

  FH.portraitHD = function (who, mood) {
    const key = 'P:' + who + ':' + (mood || 'open');
    if (!cache.has(key)) {
      const fig = render(portraitHDCells(who, mood), extPal(PAL[who]));
      const c = document.createElement('canvas');
      c.width = 64; c.height = 64;
      const g = c.getContext('2d');
      backdrop(g, who);
      g.drawImage(fig, 0, 0);
      cache.set(key, c);
    }
    return cache.get(key);
  };

  // ---------- overworld characters (16x20) ----------
  const BODY_DOWN = [
    '................',
    '................',
    '................',
    '....kkkkkkkk....',
    '...kssssssssk...',
    '..kssssssssssk..',
    '..kssssssssssk..',
    '..kssEssssEssk..',
    '..kssEssssEssk..',
    '..kbssssssssbk..',
    '...kssssssssk...',
    '....kkkkkkkk....',
    '...kcccccccck...',
    '..ksccccccccsk..',
    '..kdccccccccdk..',
    '...kCCCCCCCCk...',
  ];
  const BODY_SIDE = [
    '................',
    '................',
    '................',
    '.....kkkkkk.....',
    '....kssssssk....',
    '...kssssssssk...',
    '...kssssssssk...',
    '...ksssssEssk...',
    '...ksssssEssk...',
    '...kssssssbsk...',
    '....ksssssk.....',
    '.....kkkkk......',
    '.....kcccck.....',
    '....kcccccck....',
    '....kccsccck....',
    '....kCCdCCCk....',
  ];
  const LEGS = {
    down: [
      ['....kppkkppk....', '....kffkkffk....', '....kkk..kkk....'],
      ['....kppkkppk....', '....kffk.kkk....', '....kkk.........'],
      ['....kppkkppk....', '....kffkkffk....', '....kkk..kkk....'],
      ['....kppkkppk....', '....kkk.kffk....', '.........kkk....'],
    ],
    side: [
      ['.....kppppk.....', '.....kffffk.....', '.....kkkkkk.....'],
      ['....kppkppk.....', '...kffk.kffk....', '...kkk...kkk....'],
      ['.....kppppk.....', '.....kffffk.....', '.....kkkkkk.....'],
      ['.....kpkppk.....', '....kffkffk.....', '....kkkkkkk.....'],
    ],
  };

  const OW_HAIR = {
    draco: {
      down: [
        '................',
        '......kLk.......',
        '....kkkhhkkk....',
        '...khhhhhhhhk...',
        '..khLhhhhhhhhk..',
        '..khhhhhhhhhhk..',
        '.khhHhhHhhHhhhk.',
        '.khH........Hhk.',
        '.khH........Hhk.',
      ],
      up: [
        '................',
        '......kLk.......',
        '....kkkhhkkk....',
        '...khhhhhhhhk...',
        '..khLhhhhhhhhk..',
        '..khhhhhhhhhhk..',
        '.khhhhhhhhhhhhk.',
        '.khhhhHhhhhhhhk.',
        '.khhhhhhhHhhhhk.',
        '..khhHhhhhHhhk..',
        '...kHhhhhhhHk...',
      ],
      side: [
        '................',
        '.......kLk......',
        '.....kkkhhkk....',
        '....khhhhhhhk...',
        '...khhhLhhhhhk..',
        '..khhhhhhhhhhhk.',
        '..khhhhhhhhhHk..',
        '..khhhhhH...Hk..',
        '..khhhhH........',
        '...khhH.........',
        '....kk..........',
      ],
    },
    sage: {
      down: [
        '........kk......',
        '.......kLk......',
        '....kkkhhkkk....',
        '...khhhhhhhhk...',
        '..khLhhhhhhhhk..',
        '..khhhhhhhhhhk..',
        '.khhhhhhhHhHhhk.',
        '.khhH......Hhhk.',
        '.khH........Hhk.',
        '.khH........Hhk.',
        '.khhk......khhk.',
        '.khhk......khhk.',
        '..kk........kk..',
      ],
      up: [
        '........kk......',
        '.......kLk......',
        '....kkkhhkkk....',
        '...khhhhhhhhk...',
        '..khLhhhhhhhhk..',
        '..khhhhhhhhhhk..',
        '.khhhhhhhhhhhhk.',
        '.khhhHhhhhHhhhk.',
        '.khhhhhhhhhhhhk.',
        '.khhHhhhhhhHhhk.',
        '.khhhhhhhhhhhhk.',
        '.kHhhhhhhhhhhHk.',
        '..kkHhhhhhhHkk..',
        '....kHhhhhHk....',
        '.....kkkkkk.....',
      ],
      side: [
        '.......k........',
        '......kLk.......',
        '.....kkhhkk.....',
        '....khhhhhhk....',
        '...khhhLhhhhk...',
        '..khhhhhhhhhhk..',
        '..khhhhhhhhhHk..',
        '..khhhhhH...Hk..',
        '..khhhhH........',
        '..khhhhH........',
        '..khhhhk........',
        '..khhhk.........',
        '...kk...........',
      ],
    },
    willow: {
      down: [
        '..........kk....',
        '.....kkk.kLhk...',
        '....kLhhkhhhhk..',
        '...khhhhhhhhhhk.',
        '..khLhhhhhhhhhk.',
        '..khhhhhhhhhhhhk',
        '.khHhkHhkHhkhhhk',
        '.khk........Hhhk',
        '.kHk........HhHk',
        '.khk........khhk',
        '..y.........khk.',
        '............kk..',
      ],
      up: [
        '..........kk....',
        '.....kkk.kLhk...',
        '....kLhhkhhhhk..',
        '...khhhhhhhhhhk.',
        '..khLhhhhhhhhhk.',
        '..khhhhhhhhhhhhk',
        '.khhhhhhhhhhhhhk',
        '.khHhhhhhhhhHhhk',
        '.khhhhhhhhhhhhhk',
        '.khhHhhhhhhHhhk.',
        '..khhhhhhhhhhk..',
        '...kkHhhhhhkk...',
      ],
      side: [
        '..kk............',
        '.kLhk..kkkk.....',
        '.khhhkkhhhhk....',
        '.kHhkhhhhhhhk...',
        '..kkhhhLhhhhhk..',
        '..khhhhhhhhhhhk.',
        '..khhhhhhhHkHk..',
        '..khhhhhH.......',
        '..kHhhhH........',
        '..khHhk.........',
        '...kk...........',
      ],
    },
  };

  // Shirt colours for the tiny sprites (the portrait clothes are too detailed at 16px)
  const OW_TORSO = {
    draco: { down: ['...kcnnnnnnck...', '..kscxnnnnxcsk..', '..kdcxnnnnxcdk..', '...kCCCCCCCCk...'],
             side: ['.....kcnnk.....', '....kccnnnck....', '....kccsnnck....', '....kCCdCCCk....'] },
    sage: { down: ['...kcoccccock...', '..ksoyccccyosk..', '..kdooooooookdk.', '...kOOOOOOOOk...'],
            side: ['.....kcock.....', '....kccocck....', '....kccsooOk....', '....kOOdOOOk....'] },
    willow: { down: ['...kccxxxxcck...', '..ksccxxxxccsk..', '..kdcccxxcccdk..', '...kCCCCCCCCk...'],
              side: ['.....kcxck.....', '....kccxxck....', '....kccscack....', '....kCCdCCCk....'] },
  };

  function ownerCells(who, dir, frame) {
    const isSide = dir === 'left' || dir === 'right';
    const base = grid(isSide ? BODY_SIDE : BODY_DOWN, 16).concat(grid(['', '', '', ''], 16));
    if (dir === 'up') {
      // no face from behind
      for (let y = 4; y <= 10; y++) for (let x = 0; x < 16; x++) if ('Eb'.includes(base[y][x])) base[y][x] = 's';
    }
    const torso = OW_TORSO[who] && OW_TORSO[who][isSide ? 'side' : 'down'];
    if (torso) overlay(base, torso, 0, 12);
    const legs = LEGS[isSide ? 'side' : 'down'][frame % 4];
    overlay(base, legs, 0, 16);
    const hair = OW_HAIR[who][dir === 'up' ? 'up' : isSide ? 'side' : 'down'];
    overlay(base, hair, 0, 0);
    return base;
  }

  FH.charSprite = function (who, dir, frame) {
    const key = 'c:' + who + ':' + dir + ':' + frame;
    if (!cache.has(key)) {
      const cells = ownerCells(who, dir, frame);
      cache.set(key, render(cells, PAL[who], { flip: dir === 'left' }));
    }
    return cache.get(key);
  };

  // ---------- NPCs ----------
  const NPC = {
    grandma: [
      '................',
      '......kkkk......',
      '.....kLhhhk.....',
      '......khhk......',
      '....kkhhhhkk....',
      '...khLhhhhhhk...',
      '..khhhhHHhhhhk..',
      '..khssssssssshk.',
      '..ksgEgssgEgsk..',
      '..kbssssssssbk..',
      '...kssssssssk...',
      '....kkwwwwkk....',
      '...kccccccccck..',
      '..kcccccccccck..',
      '..ksccccccccsk..',
      '..krrrrrrrrrrk..',
      '..krRrrrrrrRrk..',
      '..krrrrrrrrrrk..',
      '...kkkkkkkkkk...',
      '....kff..ffk....',
    ],
    witch: [
      '..........kk....',
      '.........kpk....',
      '........kppk....',
      '.......kpPk.....',
      '......kppPk.....',
      '.....kpypppk....',
      '.....kpppPPk....',
      '....kBBBBBBBk...',
      '.kkpppppppppppkk',
      'kPPPPPPPPPPPPPPk',
      '.kkkhhhhhhhhkkk.',
      '..khsssssssshk..',
      '..khsEssssEshk..',
      '..khssssmssshk..',
      '..khhkkkkkkhhk..',
      '..kccppppppcck..',
      '.kccccccccccccck',
      '.kscccccyccccsk.',
      '..kcccccccccck..',
      '..kcccccccccck..',
      '..kcCcccccCcck..',
      '..kcccccccccck..',
      '..kkkkkkkkkkkk..',
    ],
  };
  FH.npcSprite = function (who) {
    const key = 'n:' + who;
    if (!cache.has(key)) cache.set(key, render(grid(NPC[who], 16), PAL[who]));
    return cache.get(key);
  };

  // ---------- items (12x12) ----------
  const IPAL = {
    k: OUT, w: '#fff8e8', r: '#e0463a', R: '#a52a2a', y: '#f5d76e', g: '#6cbf4a', G: '#3e7d34',
    b: '#5874d0', B: '#34449a', o: '#f0a33a', O: '#c06a1c', t: '#d9c8a0', T: '#a89068',
    p: '#8e4fc4', P: '#5a2a8a', c: '#7fe6f0', C: '#3aa6c0', s: '#c9d6e8', S: '#8ea0c0',
    n: '#2f2340', u: '#e9e0c9', U: '#b8a88a', v: '#f07a2a', V: '#b54a14', l: '#ffffff',
    m: '#c49a62', M: '#8a6236', e: '#f2b6d0', E: '#c86a9a', z: '#a8d860',
  };
  const ITEM_ART = {
    strawberry: [
      '............',
      '.....kk.....',
      '...kkggkk...',
      '..kgggggGk..',
      '.kRrrgrrrRk.',
      '.krwyrrryrk.',
      '.krrrrrrrRk.',
      '..kryrrryk..',
      '..krrrrrRk..',
      '...krryRk...',
      '....kRRk....',
      '.....kk.....',
    ],
    blueberry: [
      '............',
      '.......kk...',
      '......kgGk..',
      '..kkk..kk...',
      '.kbwbk.kkk..',
      '.kbbBkkbwbk.',
      '.kBBBkbbbBk.',
      '..kkkkkBBBk.',
      '...kbwbkkk..',
      '...kbbBk....',
      '...kBBBk....',
      '....kkk.....',
    ],
    apple: [
      '......k.....',
      '.....kMkk...',
      '..kkkkkgGk..',
      '.krrrrrkk...',
      'krwrrrrrrk..',
      'krwrrrrrrRk.',
      'krrrrrrrrRk.',
      'krrrrrrrRRk.',
      '.krrrrrRRk..',
      '.kRrrrRRRk..',
      '..kkRRRkk...',
      '....kkk.....',
    ],
    chanterelle: [
      '............',
      '..kkk..kkk..',
      '.kyyokkoyyk.',
      'kyooooooooOk',
      'koooooooooOk',
      '.kOOoOoOOOk.',
      '..kkOoOOkk..',
      '....kooOk...',
      '....kooOk...',
      '...kooOOk...',
      '...koooOk...',
      '....kkkk....',
    ],
    fiddlehead: [
      '............',
      '...kkkk.....',
      '..kgzzgk....',
      '.kgkkkzgk...',
      '.kgk.kgzk...',
      '.kzgkgzgk...',
      '..kGzzgk....',
      '...kkgGk....',
      '.....kgk....',
      '.....kgGk...',
      '......kgk...',
      '.......k....',
    ],
    moonleaf: [
      '.........kk.',
      '.......kkSk.',
      '.....kksssk.',
      '....kslsssk.',
      '...ksllssSk.',
      '..kslssssk..',
      '..ksssSSSk..',
      '.kssSSSSk...',
      '.ksSSSkk....',
      '.kSSkk......',
      'kkkk........',
      'k...........',
    ],
    nightberry: [
      '............',
      '......kk....',
      '.....kgGk...',
      '...kk.kk.kk.',
      '..kpekkkkpek',
      '..kppPkkppPk',
      '...kkkpekkk.',
      '.kpek.kppPk.',
      '.kppPk.kkk..',
      '..kkkpek....',
      '....kppPk...',
      '.....kkk....',
    ],
    glowcap: [
      '............',
      '...kkkkkk...',
      '..kclcccCk..',
      '.kclcccccCk.',
      '.kcccclcCCk.',
      '.kkCCCCCCkk.',
      '...kkuukk...',
      '....kuUk....',
      '....kuUk....',
      '...kuuUUk...',
      '....kkkk....',
      '............',
    ],
    carrot: [
      '.......k.k..',
      '......kgkgk.',
      '.....kgGgk..',
      '....kkkGk...',
      '...kvvvkk...',
      '...kvwvVk...',
      '..kvvvVk....',
      '..kvVvVk....',
      '.kvvVVk.....',
      '.kvVVk......',
      '.kVVk.......',
      '.kkk........',
    ],
    turnip: [
      '....k.k.....',
      '...kgkgk....',
      '....kGk.....',
      '..kkkkkkk...',
      '.keeeeeeEk..',
      'kewueeeeEEk.',
      'kuuuuuuuuUk.',
      'kuwuuuuuuUk.',
      '.kuuuuuuUk..',
      '..kuuuuUk...',
      '...kkUkk....',
      '.....k......',
    ],
    pumpkin: [
      '.....kk.....',
      '.....kGk....',
      '..kkkkMkkk..',
      '.koovkvvoOk.',
      'kovwvkvvvoOk',
      'kovvvkvvvoOk',
      'kovvvkvvvoOk',
      'kovvvkvvvoOk',
      'kOovvkvvoOOk',
      '.kOOokooOOk.',
      '..kkkkkkkk..',
      '............',
    ],
    radish: [
      '...k...k....',
      '..kgk.kgk...',
      '...kgkgk....',
      '....kGk.....',
      '...kkkkk....',
      '..kEeeeEk...',
      '.kEwweeEEk..',
      '.kEeeeeeEk..',
      '..kEeeeEk...',
      '...kEEEk....',
      '....kuk.....',
      '.....k......',
    ],
    pie: [
      '............',
      '............',
      '...kkkkkk...',
      '..kmmmmmmk..',
      '.kmmpmmpmmk.',
      'kmmmmmmmmmmk',
      'kmpmmpmmpmmk',
      'kMmmmmmmmmMk',
      'kTkMMMMMMkTk',
      '.kTTTTTTTTk.',
      '..kkkkkkkk..',
      '............',
    ],
  };

  // potion bottle; 'q' liquid, 'Q' liquid shade
  const POTION = [
    '....kkkk....',
    '....kmMk....',
    '....kkkk....',
    '.....kk.....',
    '....kssk....',
    '...kslssk...',
    '..kslqqqSk..',
    '.kslqqqqQSk.',
    '.ksqqqqqQSk.',
    '.ksqqqqQQSk.',
    '..kSQQQQSk..',
    '...kkkkkk...',
  ];
  const POTION_COL = {
    hearttonic: ['#ef5a6f', '#a8304a'],
    vigor: ['#f2c94c', '#c08a1c'],
    swift: ['#7ee0b0', '#2f9a6c'],
    owl: ['#9fb4ff', '#5560c0'],
    thorn: ['#9ad05a', '#4f8a2a'],
    murky: ['#8a7a5a', '#4f4430'],
    hex: ['#6a2a6a', '#3a1040'],
    moonlantern: ['#9fe8ff', '#3a7ac0'],
    tonic: ['#9cf07a', '#3e9a3a'],
  };

  FH.itemSprite = function (id) {
    const key = 'i:' + id;
    if (cache.has(key)) return cache.get(key);
    let c;
    if (POTION_COL[id]) {
      const pal = Object.assign({}, IPAL, { q: POTION_COL[id][0], Q: POTION_COL[id][1] });
      c = render(grid(POTION, 12), pal);
    } else {
      c = render(grid(ITEM_ART[id] || ITEM_ART.strawberry, 12), IPAL);
    }
    cache.set(key, c);
    return c;
  };

  // Large item art: the 12px sprite upscaled with Scale2x, then given a lit
  // edge, a shaded edge, a little grain, and outlines tinted from the colour inside.
  FH.itemSpriteHD = function (id) {
    const key = 'I:' + id;
    if (cache.has(key)) return cache.get(key);
    let cells, pal;
    if (POTION_COL[id]) { cells = grid(POTION, 12); pal = Object.assign({}, IPAL, { q: POTION_COL[id][0], Q: POTION_COL[id][1] }); }
    else { cells = grid(ITEM_ART[id] || ITEM_ART.strawberry, 12); pal = IPAL; }
    const big = scale2x(cells);
    const n = big.length;
    const c = document.createElement('canvas');
    c.width = n; c.height = n;
    const g = c.getContext('2d');
    const at = (x, y) => (x < 0 || y < 0 || x >= n || y >= n) ? '.' : big[y][x];
    const solid = ch => ch !== '.' && ch !== 'k';
    const r = rng32(id.length * 977 + id.charCodeAt(0));
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const ch = big[y][x];
      if (ch === '.') continue;
      let col = pal[ch];
      if (!col) continue;
      if (ch === 'k') {
        // outline takes a dark version of what it wraps, except on the outer edge
        const inner = [at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)].find(solid);
        const outer = [at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)].includes('.');
        if (inner && !outer) col = mix(pal[inner], '#1a0e08', 0.6);
      } else {
        const lit = !solid(at(x - 1, y)) || !solid(at(x, y - 1));
        const shade = !solid(at(x + 1, y)) || !solid(at(x, y + 1)) || !solid(at(x + 1, y + 1));
        if (lit && !shade) col = mix(col, '#fff8e0', 0.28);
        else if (shade && !lit) col = mix(col, '#1a0e08', 0.22);
        const k = r();
        if (k < 0.08) col = mix(col, '#fff8e0', 0.12);
        else if (k < 0.16) col = mix(col, '#1a0e08', 0.1);
      }
      g.fillStyle = col; g.fillRect(x, y, 1, 1);
    }
    cache.set(key, c);
    return c;
  };
  function rng32(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  // ---------- small UI icons ----------
  const ICONS = {
    heart: { pal: { k: '#3a1420', r: '#e8455a', R: '#a82a40', w: '#ffd6dc' }, rows: [
      '.kk...kk.',
      'kwrk.krrk',
      'kwrrkrrRk',
      'krrrrrrRk',
      '.krrrrRk.',
      '..krrRk..',
      '...kRk...',
      '....k....',
    ] },
    heartEmpty: { pal: { k: '#3a1420', r: '#5a3a44', R: '#43283a' }, rows: [
      '.kk...kk.',
      'krrk.krrk',
      'krrrkrrRk',
      'krrrrrrRk',
      '.krrrrRk.',
      '..krrRk..',
      '...kRk...',
      '....k....',
    ] },
    bolt: { pal: { k: '#3a2410', y: '#f5d14a', Y: '#c08a1c' }, rows: [
      '....kkk',
      '...kyyk',
      '..kyyk.',
      '.kyyykk',
      'kkkyyYk',
      '..kyYk.',
      '.kyYk..',
      '.kYk...',
      'kkk....',
    ] },
    basket: { pal: { k: OUT, m: '#c99a5a', M: '#8a6236', t: '#e9c88a' }, rows: [
      '...kkkkk...',
      '..k.....k..',
      '.k.......k.',
      'kkkkkkkkkkk',
      'ktmtmtmtmtk',
      'kmMmMmMmMmk',
      '.kmtmtmtmk.',
      '.kMmMmMmMk.',
      '..kkkkkkk..',
    ] },
    skull: { pal: { k: '#1e0f28', w: '#e8d8ff', W: '#a890d0' }, rows: [
      '.kkkkk.',
      'kwwwwwk',
      'kwkwkWk',
      'kwwwwWk',
      '.kwkWk.',
      '..kkk..',
    ] },
    sun: { pal: { k: '#5a3010', y: '#f8d860', o: '#f0a030' }, rows: [
      '...k...',
      '.k.y.k.',
      '..yyy..',
      'kyyoyyk',
      '..yoy..',
      '.k.y.k.',
      '...k...',
    ] },
    moon: { pal: { k: '#2a2050', y: '#f4e3a0', Y: '#c8b070' }, rows: [
      '..kkk..',
      '.kyyk..',
      'kyyk...',
      'kyYk...',
      'kyyYk..',
      '.kyyYkk',
      '..kkkk.',
    ] },
    sparkle: { pal: { y: '#fff2b0', w: '#ffffff' }, rows: [
      '..y..',
      '..w..',
      'yw.wy',
      '..w..',
      '..y..',
    ] },
    arrow: { pal: { k: OUT, w: '#fff6e0' }, rows: [
      'k....',
      'kk...',
      'kwk..',
      'kwwk.',
      'kwwwk',
      'kwwk.',
      'kwk..',
      'kk...',
      'k....',
    ] },
    book: { pal: { k: '#24140a', r: '#a8323a', R: '#7a1e28', p: '#f3e6c4', g: '#e0b04a' }, rows: [
      '.kkkkkkkk.',
      'krrrrrrrkk',
      'krRgggRrkp',
      'krRgRgRrkp',
      'krRgggRrkp',
      'krRRRRRrkp',
      'krrrrrrrkp',
      'kRRRRRRRkp',
      '.kkkkkkkkk',
    ] },
    cursor: { pal: { k: '#000', w: '#fff', g: '#c8c8c8' }, rows: [
      'k.........',
      'kk........',
      'kgk.......',
      'kgwk......',
      'kgwwk.....',
      'kgwwwk....',
      'kgwwwwk...',
      'kgwwwwwk..',
      'kgwwwwwwk.',
      'kgwwwggggk',
      'kgwwgkkkkk',
      'kgwkgk....',
      'kgk.kgk...',
      'kk..kgk...',
      'k....kgk..',
      '.....kkk..',
    ] },
  };
  FH.icon = function (name) {
    const key = 'u:' + name;
    if (!cache.has(key)) {
      const ic = ICONS[name];
      const w = Math.max.apply(null, ic.rows.map(r => r.length));
      cache.set(key, render(grid(ic.rows, w), ic.pal));
    }
    return cache.get(key);
  };

  // Scaled data URL, for <img> tags in the DOM UI.
  const urlCache = new Map();
  FH.spriteURL = function (canvas, scale, key) {
    const k = key ? key + '@' + scale : null;
    if (k && urlCache.has(k)) return urlCache.get(k);
    const c = document.createElement('canvas');
    c.width = canvas.width * scale; c.height = canvas.height * scale;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(canvas, 0, 0, c.width, c.height);
    const url = c.toDataURL();
    if (k) urlCache.set(k, url);
    return url;
  };
})(window.FH);
