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
