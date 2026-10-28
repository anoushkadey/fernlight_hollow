// The story: who to talk to next, the beats that move it along, and the
// comic-panel cutscenes that open and close it.
(function (FH) {
  'use strict';

  const G = FH.game;
  const S = FH.STORY;
  const st = FH.story = {};
  const T = FH.TILE;

  const lines = (arr) => arr.map(([who, mood, text]) => {
    const me = G.player.who;
    return { who: who === 'me' ? me : who, mood: mood || 'open', text: typeof text === 'object' ? text[me] : text };
  });

  st.step = () => G.story.step;
  st.info = () => S.steps[Math.min(G.story.step, S.steps.length - 1)];

  st.target = function () {
    const t = st.info().target;
    if (!t) return null;
    if (t === 'grandma') return G.npcs[0];
    if (t === 'witch') return G.npcs[1];
    if (t === 'cauldron') return G.world.cauldron;
    if (t === 'glade') return G.world.fernlight;
    return null;
  };

  function advance(to) {
    const before = st.info();
    G.story.step = to;
    const now = st.info();
    FH.ui.hud(true);
    if (now.ch !== before.ch) setTimeout(() => FH.ui.chapterCard(now.ch, now.title), 300);
    else FH.ui.toast('Journal updated', 'good');
    G.save();
  }

  // ---------- Hazel ----------
  st.onGrandma = function () {
    const step = G.story.step;
    const p = G.player;
    if (step === 0) {
      G.flags.metGrandma = true;
      FH.ui.say(lines(S.hazelArrive), () => advance(1));
      return true;
    }
    if (step === 1) {
      const fakes = p.basket.map((it, i) => ({ it, i })).filter(o => ['jack', 'baneberry', 'gloomberry'].includes(o.it.id));
      const ch = p.basket.map((it, i) => ({ it, i })).filter(o => o.it.id === 'chanterelle');
      const be = p.basket.map((it, i) => ({ it, i })).filter(o => ['strawberry', 'blueberry', 'nightberry'].includes(o.it.id));
      if (ch.length >= 2 && be.length >= 2) {
        const take = ch.slice(0, 2).concat(be.slice(0, 2)).map(o => o.i).sort((a, b) => b - a);
        take.forEach(i => p.basket.splice(i, 1));
        FH.audio.sfx('trade');
        FH.ui.say(lines(S.hazelSoup), () => {
          G.story.keys.letter = true;
          p.stam = p.maxStam;
          advance(2);
        });
        return true;
      }
      if (fakes.length) {
        fakes.map(o => o.i).sort((a, b) => b - a).forEach(i => p.basket.splice(i, 1));
        FH.ui.say([{ who: 'grandma', mood: 'wide', text: FH.LINES.grandmaPoison }, { who: 'grandma', mood: 'open', text: S.hazelWaiting }]);
        return true;
      }
      FH.ui.say([{ who: 'grandma', mood: 'happy', text: S.hazelWaiting + ' You have ' + Math.min(2, ch.length) + ' of 2 chanterelles and ' + Math.min(2, be.length) + ' of 2 berries.' }],
        () => FH.ui.grandmaMenu('Anything else, love?'));
      return true;
    }
    if (step === 6 && G.story.keys.tonic) {
      delete G.story.keys.tonic;
      FH.ui.say(lines(S.hazelCure), () => {
        st.cutscene(S.ending, () => {
          p.hearts = FH.MAX_HEARTS; p.stam = p.maxStam;
          G.world.crops.forEach(c => { c.growth = 1; });
          advance(7);
        });
      });
      return true;
    }
    return false;
  };

  // ---------- Belladonna ----------
  st.onWitch = function () {
    const step = G.story.step;
    if (step === 2 && G.story.keys.letter) {
      delete G.story.keys.letter;
      G.flags.metWitch = true;
      FH.ui.say(lines(S.witchLetter), () => { advance(3); FH.ui.openWitch('cauldron'); });
      return true;
    }
    if (step === 5 && G.story.keys.fernlight) {
      delete G.story.keys.fernlight;
      FH.ui.say(lines(S.witchCure), () => { G.story.keys.tonic = true; advance(6); });
      return true;
    }
    return false;
  };

  // The cauldron knows one extra recipe while the story needs it.
  st.brewOverride = function (items) {
    if (G.story.step !== 3) return null;
    const ids = items.map(i => i.id);
    if (ids.includes('glowcap') && ids.includes('moonleaf') && ids.includes('nightberry')) return { id: 'moonlantern', story: true };
    return null;
  };
  st.lanternBrewed = function () {
    G.story.keys.lantern = true;
    FH.ui.say(lines(S.witchLantern), () => advance(4));
  };

  st.fernlight = function () {
    const step = G.story.step;
    const night = FH.isNight();
    if (step === 4 && night) {
      G.story.picked = true;
      G.story.keys.fernlight = true;
      FH.audio.sfx('heal');
      st.cutscene([{ art: 'bloom', text: S.bloomPicked }], () => advance(5));
      return;
    }
    if (step >= 7) {
      FH.ui.say([{ who: null, text: night ? 'The fernlight glows quietly to itself. You leave it be. It has done enough.' : 'The bud is closed for the day. It has earned the rest.' }]);
      return;
    }
    FH.ui.say([{ who: null, text: S.budClosed + (step < 4 ? '' : ' Come back after dark.') }]);
  };

  // ---------- cutscenes ----------
  // Panels appear one at a time in a comic grid, each with a typed caption.
  st.cutscene = function (panels, onDone) {
    const layer = FH.ui.comic(panels, onDone);
    return layer;
  };

  st.prologue = function (onDone) {
    const pr = S.prologue;
    const panels = pr.panels.map(p => p.art === 'walk' ? { art: 'walk', text: pr.walk[G.player.who] } : p);
    st.cutscene(panels, () => {
      FH.ui.chapterCard(S.steps[0].ch, S.steps[0].title);
      if (onDone) onDone();
    });
  };

  // ---------- panel art (160x100 each, animated) ----------
  const B4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
  function grad(g, w, h, cols, vert) {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const v = (vert ? y / h : x / w) * (cols.length - 1);
      let i = Math.floor(v);
      if (v - i > (B4[y & 3][x & 3] + 0.5) / 16) i++;
      g.fillStyle = cols[Math.min(cols.length - 1, i)];
      g.fillRect(x, y, 1, 1);
    }
  }
  function woodBg(g, w, h) {
    for (let y = 0; y < h; y++) {
      const plank = Math.floor(y / 12);
      g.fillStyle = ['#4a2c18', '#52321c', '#4e2e1a'][plank % 3];
      g.fillRect(0, y, w, 1);
      if (y % 12 === 0) { g.fillStyle = '#2a170c'; g.fillRect(0, y, w, 1); }
    }
    const r = FH.rng(5);
    for (let i = 0; i < 160; i++) { g.fillStyle = '#3e2414'; g.fillRect(Math.floor(r() * w), Math.floor(r() * h), 3, 1); }
  }
  function glow(g, x, y, r, col, a) {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(' + col + ',' + a + ')'); gr.addColorStop(1, 'rgba(' + col + ',0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  function candle(g, x, y, t) {
    g.fillStyle = '#e8dcc0'; g.fillRect(x - 3, y, 7, 14);
    g.fillStyle = '#c8b898'; g.fillRect(x + 2, y, 2, 14);
    g.fillStyle = '#fff4d8'; g.fillRect(x - 3, y, 7, 1);
    const f = Math.sin(t * 12) > 0 ? 1 : 0;
    g.fillStyle = '#ffd86a'; g.fillRect(x - 1, y - 5 - f, 3, 4 + f);
    g.fillStyle = '#fff6c8'; g.fillRect(x, y - 3, 1, 2);
    glow(g, x, y - 3, 26, '255,200,110', 0.35 + Math.sin(t * 9) * 0.04);
  }
  function stars(g, w, h, t, n) {
    const r = FH.rng(11);
    for (let i = 0; i < n; i++) {
      const x = Math.floor(r() * w), y = Math.floor(r() * h * 0.6), ph = r() * 6;
      g.fillStyle = Math.sin(t * 2 + ph) > 0.6 ? '#ffffff' : '#c8c0f0';
      g.fillRect(x, y, 1, 1);
    }
  }
  function sketchFlower(g, x, y, col) {
    g.fillStyle = col;
    for (let i = 0; i < 22; i++) g.fillRect(x + Math.round(Math.sin(i * 0.2) * 1.5), y + i, 1, 1);
    [[-1, 0], [1, 0], [-3, 2], [3, 2], [-4, 4], [4, 4], [-4, 6], [4, 6], [-3, 8], [3, 8], [-1, 9], [0, 9], [1, 9]].forEach(([a, b]) => g.fillRect(x + a, y - 10 + b, 1, 1));
    for (let k = 0; k < 4; k++) { const yy = y + 8 + k * 3; g.fillRect(x - 6 + k, yy, 5 - k, 1); g.fillRect(x + 2, yy + 1, 5 - k, 1); }
  }
  function worldRegion(g, wx, wy, w, h, extra) {
    const W = G.world;
    g.drawImage(W.ground, wx, wy, w, h, 0, 0, w, h);
    const items = [];
    W.props.forEach(pr => { if (pr.x > wx - 40 && pr.x < wx + w + 40 && pr.y > wy - 10 && pr.y < wy + h + 50) items.push({ y: pr.y, draw: () => g.drawImage(pr.spr.img, Math.round(pr.x - pr.spr.ox - wx), Math.round(pr.y - pr.spr.oy - wy)) }); });
    W.crops.forEach(cr => { if (cr.sprs && cr.x > wx - 20 && cr.x < wx + w + 20 && cr.y > wy && cr.y < wy + h + 20) { const sp = cr.sprs[2]; items.push({ y: cr.y, draw: () => g.drawImage(sp.img, Math.round(cr.x - sp.ox - wx), Math.round(cr.y - sp.oy - wy)) }); } });
    (extra || []).forEach(e => items.push(e));
    items.sort((a, b) => a.y - b.y).forEach(i => i.draw());
  }

  const ART = {
    book(g, w, h, t) {
      woodBg(g, w, h);
      // open book
      g.fillStyle = '#24140a'; g.fillRect(22, 18, 116, 70);
      g.fillStyle = '#7a2a2a'; g.fillRect(24, 20, 112, 66);
      g.fillStyle = '#f3e6c4'; g.fillRect(28, 22, 50, 60); g.fillRect(82, 22, 50, 60);
      g.fillStyle = '#e2cfa0'; g.fillRect(74, 22, 4, 60); g.fillRect(82, 22, 3, 60);
      g.fillStyle = '#c9b07a'; g.fillRect(78, 22, 4, 60);
      sketchFlower(g, 52, 40, '#6b4428');
      g.fillStyle = '#b88a5a';
      for (let i = 0; i < 8; i++) g.fillRect(88, 30 + i * 6, 34 - (i % 3) * 6, 1);
      g.fillStyle = '#a53200'; g.fillRect(88, 26, 20, 2);
      // the drawing glows faintly
      glow(g, 52, 34, 16, '160,240,255', 0.18 + Math.sin(t * 2) * 0.06);
      candle(g, 146, 58, t);
      g.fillStyle = 'rgba(10,6,4,0.35)'; g.fillRect(0, 88, w, 12);
    },
    bloom(g, w, h, t) {
      grad(g, w, h, ['#0e0a24', '#1c1640', '#2c2458', '#3e3270'], true);
      stars(g, w, h, t, 40);
      g.fillStyle = '#f4e3a0'; g.beginPath(); g.arc(128, 20, 9, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#1c1640'; g.beginPath(); g.arc(124, 17, 8, 0, Math.PI * 2); g.fill();
      // treeline silhouettes
      g.fillStyle = '#0a0818';
      for (let x = 0; x < w; x += 6) { const th = 18 + ((x * 37) % 13); g.fillRect(x, h - th - 18, 6, th + 18); g.fillRect(x + 2, h - th - 22, 2, 4); }
      g.fillStyle = '#141028'; g.fillRect(0, h - 16, w, 16);
      G.fernSprBig = G.fernSprBig || FH.makeFernlight(true);
      const sp = G.fernSprBig;
      glow(g, 80, 60, 46, '150,240,255', 0.32 + Math.sin(t * 2) * 0.08);
      g.imageSmoothingEnabled = false;
      g.drawImage(sp.img, 80 - sp.ox * 2, 92 - sp.oy * 2, sp.img.width * 2, sp.img.height * 2);
      const r = FH.rng(Math.floor(t * 3));
      for (let i = 0; i < 6; i++) { g.fillStyle = '#e8fff8'; g.fillRect(56 + Math.floor(r() * 48), 30 + Math.floor(r() * 40), 1, 1); }
    },
    letter(g, w, h, t) {
      woodBg(g, w, h);
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(36, 14, 92, 80);
      g.fillStyle = '#f6ecd2'; g.fillRect(32, 10, 92, 80);
      g.fillStyle = '#e4d2a8'; g.fillRect(32, 10, 92, 2); g.fillRect(122, 10, 2, 80);
      const r = FH.rng(3);
      g.fillStyle = '#3b3a6a';
      for (let line = 0; line < 4; line++) {
        let x = 40;
        const y = 26 + line * 11 + (line === 0 ? -4 : 0);
        while (x < 112 - (line === 3 ? 30 : 0)) {
          const len = 3 + Math.floor(r() * 7);
          for (let k = 0; k < len; k++) g.fillRect(x + k, y + Math.round(Math.sin((x + k) * 0.9) * 1.2 + (r() - 0.5)), 1, 1);
          x += len + 2;
        }
      }
      g.fillStyle = '#3e6b2e'; g.beginPath(); g.arc(104, 78, 7, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#6aa145'; g.beginPath(); g.arc(103, 77, 4, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#2a170c'; g.fillRect(132, 40, 2, 44); g.fillStyle = '#e8dcc0'; g.fillRect(131, 36, 4, 6);
      candle(g, 16, 64, t);
    },
    walk(g, w, h, t) {
      const L = FH.LANDMARKS;
      const wx = L.start.x * T + 8 - w / 2, wy = L.start.y * T - h / 2 - 6;
      const spr = FH.charSprite(G.player.who, 'right', Math.floor(t * 6) % 4);
      worldRegion(g, wx, wy, w, h, [{ y: L.start.y * T + 8, draw: () => {
        g.fillStyle = 'rgba(10,8,20,0.3)'; g.fillRect(w / 2 - 6, h / 2 + 15, 12, 2);
        g.drawImage(spr, Math.round(w / 2 - 8), Math.round(h / 2 - 3));
      } }]);
      g.fillStyle = 'rgba(255,200,120,0.08)'; g.fillRect(0, 0, w, h);
    },
    garden(g, w, h, t) {
      const Gd = FH.LANDMARKS.garden;
      worldRegion(g, Gd.x * T - 8, Gd.y * T - 18, w, h);
      const r = FH.rng(Math.floor(t * 2));
      for (let i = 0; i < 10; i++) { g.fillStyle = '#fff2b0'; const x = Math.floor(r() * w), y = Math.floor(r() * h); g.fillRect(x, y, 1, 1); g.fillRect(x - 1, y, 3, 1); g.fillRect(x, y - 1, 1, 3); }
      g.fillStyle = 'rgba(255,230,160,0.12)'; g.fillRect(0, 0, w, h);
    },
    door(g, w, h, t) {
      const L = FH.LANDMARKS;
      const wx = L.cottage.x * T + 8 - w / 2, wy = L.cottage.y * T - 64;
      const sp = FH.npcSprite('witch');
      worldRegion(g, wx, wy, w, h, [{ y: L.cottage.y * T + 30, draw: () => g.drawImage(sp, Math.round(w / 2 - 8), Math.round(L.cottage.y * T + 30 - sp.height - wy + Math.round(Math.sin(t * 3) * 0.6))) }]);
    },
    sisters(g, w, h, t) {
      grad(g, w, h, ['#5a3a24', '#7a5232', '#a07040'], true);
      g.fillStyle = '#4a2f1f'; g.fillRect(58, 6, 44, 30);
      g.fillStyle = '#ffe9a8'; g.fillRect(60, 8, 40, 26);
      g.fillStyle = '#4a2f1f'; g.fillRect(79, 8, 2, 26); g.fillRect(60, 20, 40, 2);
      g.imageSmoothingEnabled = false;
      const a = FH.portraitFigure('grandma', 'happy'), b = FH.portraitFigure('witch', Math.sin(t * 0.8) > 0.7 ? 'happy' : 'lidded');
      g.drawImage(a, 8, 36); g.drawImage(b, 88, 36);
      g.fillStyle = '#6b4428'; g.fillRect(0, 92, w, 8);
      g.fillStyle = '#e8dcc0'; g.fillRect(72, 84, 6, 6); g.fillRect(82, 84, 6, 6);
      glow(g, 80, 40, 40, '255,220,150', 0.18);
    },
    card(g, w, h, t) {
      grad(g, w, h, ['#16261a', '#1f3424', '#2a4430'], true);
      stars(g, w, h, t, 14);
      G.fernSprBig = G.fernSprBig || FH.makeFernlight(true);
      const sp = G.fernSprBig;
      glow(g, 80, 54, 36, '150,240,255', 0.25 + Math.sin(t * 2) * 0.06);
      g.drawImage(sp.img, 80 - sp.ox, 74 - sp.oy);
    },
  };
  st.ART = ART;
})(window.FH);
