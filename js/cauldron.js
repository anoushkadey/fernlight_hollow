// Belladonna's brewing table: a full-screen scene. Candles, a chalk circle that
// wakes up as you add ingredients, and a pot whose colour follows what goes in.
(function (FH) {
  'use strict';

  const G = FH.game;
  const W = 320, H = 180;

  // what each ingredient does to the colour of the brew
  const TINT = {
    strawberry: '#e0463a', blueberry: '#5874d0', apple: '#d0503a', nightberry: '#8e4fc4',
    chanterelle: '#f0a33a', glowcap: '#7fe6f0', fiddlehead: '#79b552', moonleaf: '#c9d6e8',
    carrot: '#f07a2a', turnip: '#e9e0c9', radish: '#e86a9a', pumpkin: '#f0a33a', pie: '#c49a62',
    jack: '#b8c040', baneberry: '#4a6a3a', gloomberry: '#3a4a2a',
  };
  const BASE = '#c86aa8';

  function hexRgb(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
  function brewColour(items) {
    if (!items.length) return hexRgb(BASE);
    const cs = items.map(it => hexRgb(TINT[it.id] || BASE));
    return [0, 1, 2].map(i => cs.reduce((s, c) => s + c[i], 0) / cs.length);
  }
  const rgb = (c, k) => 'rgb(' + c.map(v => Math.max(0, Math.min(255, Math.round(v * (k || 1))))).join(',') + ')';

  // ---------- static table art ----------
  let tableCache = null;
  function table() {
    if (tableCache) return tableCache;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    const r = FH.rng(31);
    // planks running across
    for (let y = 0; y < H; y++) {
      const plank = Math.floor(y / 22);
      for (let x = 0; x < W; x++) {
        let col = ['#5a3420', '#62391f', '#5e3620', '#583221', '#603820'][plank % 5];
        if (y % 22 === 0) col = '#2a170c';
        else if (y % 22 === 1) col = '#7a4a2a';
        else if (Math.sin(x * 0.07 + plank * 3 + Math.sin(y * 0.3) * 2) > 0.93) col = '#4a2a18';
        if ((x + plank * 61) % 140 === 0 && y % 22) col = '#2a170c';
        g.fillStyle = col; g.fillRect(x, y, 1, 1);
      }
    }
    for (let i = 0; i < 300; i++) { g.fillStyle = r() < 0.5 ? '#4a2a18' : '#6e4226'; g.fillRect(Math.floor(r() * W), Math.floor(r() * H), 2, 1); }
    // runner cloth under the pot, zig-zag woven
    for (let y = 38; y < 130; y++) for (let x = 92; x < 228; x++) {
      const zz = Math.abs(((x + y) % 16) - 8);
      let col = (y - 38) % 18 < 2 ? '#3a2a1a' : zz < 2 ? '#c8a050' : zz < 4 ? '#8a6a3a' : '#5a7a5a';
      if (x < 95 || x > 224) col = '#d8c08a';
      g.fillStyle = col; g.fillRect(x, y, 1, 1);
    }
    // fringe
    for (let x = 92; x < 228; x += 2) { g.fillStyle = '#d8c08a'; g.fillRect(x, 130, 1, 4); g.fillRect(x, 34, 1, 4); }
    // open recipe book, top left
    g.fillStyle = '#24140a'; g.fillRect(10, 10, 74, 50);
    g.fillStyle = '#7a2a2a'; g.fillRect(12, 12, 70, 46);
    g.fillStyle = '#f3e6c4'; g.fillRect(15, 13, 31, 43); g.fillRect(49, 13, 31, 43);
    g.fillStyle = '#c9b07a'; g.fillRect(46, 13, 3, 43);
    g.fillStyle = '#6b4428';
    for (let i = 0; i < 6; i++) { g.fillRect(52, 18 + i * 6, 24 - (i % 2) * 8, 1); }
    // little drawing of a bottle
    [[28, 20], [29, 20], [28, 21], [29, 21], [27, 22], [30, 22], [26, 23], [31, 23], [25, 24], [32, 24], [25, 25], [32, 25], [25, 26], [32, 26], [25, 27], [32, 27], [26, 28], [31, 28], [27, 29], [28, 29], [29, 29], [30, 29]].forEach(([x, y]) => g.fillRect(x, y + 6, 1, 1));
    // scattered notes, bottom corners
    const note = (x, y, w, h) => {
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x + 2, y + 2, w, h);
      g.fillStyle = '#efe3c4'; g.fillRect(x, y, w, h);
      g.fillStyle = '#a89068'; for (let i = 0; i < h / 5 - 1; i++) g.fillRect(x + 3, y + 4 + i * 5, w - 6 - (i % 2) * 5, 1);
    };
    note(14, 128, 30, 36); note(276, 120, 30, 26); note(250, 150, 24, 20);
    // jars on the right
    const jar = (x, y, liquid) => {
      g.fillStyle = '#1a2030'; g.fillRect(x - 1, y - 1, 14, 20);
      g.fillStyle = '#a8c0d0'; g.fillRect(x, y, 12, 18);
      g.fillStyle = liquid; g.fillRect(x + 1, y + 7, 10, 10);
      g.fillStyle = '#e8f4ff'; g.fillRect(x + 2, y + 2, 1, 6);
      g.fillStyle = '#6b4428'; g.fillRect(x + 2, y - 4, 8, 4);
    };
    jar(258, 16, '#9ad05a'); jar(274, 22, '#e070c0'); jar(290, 14, '#7fe6f0');
    // a coil of twine and a feather
    g.fillStyle = '#c8a878'; g.beginPath(); g.arc(250, 64, 6, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#a88858'; g.beginPath(); g.arc(250, 64, 3, 0, Math.PI * 2); g.fill();
    // vignette
    const vg = g.createRadialGradient(W / 2, H / 2, 60, W / 2, H / 2, 200);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(10,4,2,0.6)');
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
    tableCache = c;
    return c;
  }

  function glow(g, x, y, r, col, a) {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(' + col + ',' + a + ')'); gr.addColorStop(1, 'rgba(' + col + ',0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  function candle(g, x, y, h, t, i) {
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x - 3, y + h - 1, 10, 3);
    g.fillStyle = '#e8dcc0'; g.fillRect(x - 3, y, 8, h);
    g.fillStyle = '#c8b898'; g.fillRect(x + 3, y, 2, h);
    g.fillStyle = '#fff4d8'; g.fillRect(x - 3, y, 8, 1); g.fillRect(x - 3, y + 1, 1, 3);
    const f = Math.sin(t * 11 + i * 2) > 0.2 ? 1 : 0;
    g.fillStyle = '#ffb84a'; g.fillRect(x, y - 6 - f, 3, 5 + f);
    g.fillStyle = '#fff6c8'; g.fillRect(x + 1, y - 4, 1, 3);
    g.fillStyle = '#2a170c'; g.fillRect(x + 1, y - 1, 1, 1);
  }

  // ---------- the scene ----------
  FH.openCauldron = function () {
    const UI = FH.ui;
    const box = document.createElement('div');
    box.className = 'layer brew-layer';
    box.innerHTML = `
      <canvas class="brew-canvas" width="${W}" height="${H}"></canvas>
      <div class="brew-top"><div class="brew-slots"></div></div>
      <button class="brew-close" title="Back (Esc)">✕</button>
      <div class="brew-notes paper-note"><div class="note-h">Recipe scraps</div><div class="note-body"></div></div>
      <div class="brew-side"><button class="pbtn plum big" id="brew-go">Brew</button><button class="pbtn" id="brew-empty">Empty pot</button></div>
      <div class="brew-bar"><div class="brew-say"></div></div>
      <div class="brew-cards"></div>
      <div class="brew-result"></div>`;
    const layer = { el: box, pot: [], roll: Math.random(), sel: 0, splash: [], flash: 0, t: 0 };
    const cv = box.querySelector('.brew-canvas');
    const g = cv.getContext('2d');
    const basket = () => G.player.basket;
    const potItems = () => layer.pot.map(i => basket()[i]);
    const isDraco = G.player.who === 'draco';

    const say = (text) => { box.querySelector('.brew-say').innerHTML = text; };
    const result = () => {
      const items = potItems();
      if (items.length < 3) return null;
      return (FH.story && FH.story.brewOverride(items)) || FH.brewResult(items, layer.roll);
    };
    const resName = (res) => res.id === 'moonlantern' ? 'a Moonlantern' : FH.ITEMS[res.id].name + (res.outcome ? ' (' + FH.MURKY[res.outcome].text.replace(/\.$/, '').toLowerCase() + ')' : '');

    function paint() {
      const items = potItems();
      // slots along the top
      box.querySelector('.brew-slots').innerHTML = [0, 1, 2].map(k => {
        const it = items[k];
        return '<div class="bslot ' + (it ? 'on' : '') + '">' + (it ? UI.itemImg(FH.itemView(it).sprite, 3) : '<span>' + (k + 1) + '</span>') + '</div>';
      }).join('<i class="dot"></i>');
      // cards from the basket
      const cards = basket().map((it, i) => ({ it, i })).filter(o => FH.ITEMS[o.it.id].kind !== 'Potion' && FH.ITEMS[o.it.id].kind !== 'Keepsake');
      layer.cards = cards;
      layer.sel = Math.min(layer.sel, Math.max(0, cards.length - 1));
      box.querySelector('.brew-cards').innerHTML = cards.length ? cards.map((o, k) => {
        const v = FH.itemView(o.it);
        const used = layer.pot.includes(o.i);
        return '<button class="icard ' + (used ? 'used ' : '') + (k === layer.sel ? 'sel ' : '') + (v.toxicKnown ? 'toxic' : '') + '" data-i="' + o.i + '" data-k="' + k + '"><div class="icard-art">' + UI.itemImg(v.sprite, 4) + '</div><div class="icard-name">' + v.name + '</div></button>';
      }).join('') : '<div class="no-cards">Your basket has nothing to brew with. Go and forage, then come back.</div>';
      box.querySelectorAll('.icard').forEach(b => {
        b.onclick = () => { layer.sel = +b.dataset.k; toggle(+b.dataset.i); };
      });
      // the witch's running commentary, or Draco's reading of the pot
      const res = result();
      if (items.length < 3) say(items.length ? 'In it goes. ' + (3 - items.length) + ' more.' : (G.story.step === 3 ? 'A glowcap, a moonleaf and nightberries. Then press <b>Brew</b>.' : 'Three things in, one bottle out. Pick from your basket below.'));
      else if (isDraco) say('<span class="draco-read">Draco: “This will make <b>' + resName(res) + '</b>.”</span>');
      else say('The pot is full. It gurgles like it knows something you don\'t.');
      box.querySelector('#brew-go').disabled = items.length < 3;
      box.querySelector('#brew-empty').disabled = !items.length;
      const known = FH.RECIPE_HINTS.filter(r => G.known[r[0]] || isDraco);
      box.querySelector('.note-body').innerHTML = (G.story.step === 3 ? '<p><b>Moonlantern</b>: glowcap, moonleaf, nightberries</p>' : '') +
        (known.length ? known.map(r => '<p><b>' + FH.ITEMS[r[0]].name + '</b>: ' + r[1] + '</p>').join('') : '<p class="muted">Nothing written down yet.</p>');
    }

    function toggle(i) {
      const at = layer.pot.indexOf(i);
      if (at >= 0) { layer.pot.splice(at, 1); FH.audio.sfx('back'); }
      else if (layer.pot.length < 3) {
        layer.pot.push(i);
        FH.audio.sfx('pickup');
        for (let k = 0; k < 14; k++) layer.splash.push({ x: 160 + (Math.random() - 0.5) * 30, y: 92, vx: (Math.random() - 0.5) * 60, vy: -40 - Math.random() * 50, life: 0.8 });
      } else { FH.audio.sfx('deny'); return; }
      paint();
    }

    function brew() {
      const items = potItems();
      if (items.length !== 3) return;
      const res = result();
      UI.removeIdx(layer.pot.slice());
      layer.pot = [];
      layer.roll = Math.random();
      layer.flash = 1.2;
      FH.audio.sfx('brew');
      G.stats.brewed++;
      let it = null;
      if (res.id === 'moonlantern') {
        showResult('moonlantern', 'Moonlantern', FH.STORY.keyItems.lantern.desc, () => { UI.pop(layer); FH.story.lanternBrewed(); });
        return;
      }
      it = G.addToBasket(res.id, res.outcome ? { outcome: res.outcome } : null);
      if (res.id !== 'murky' && res.id !== 'hex') G.known[res.id] = true;
      const v = FH.itemView(it || { id: res.id, outcome: res.outcome });
      const desc = res.id === 'hex' ? 'Foul, green-black and very pleased with itself. Do not drink this.' : FH.ITEMS[res.id].desc;
      showResult(v.sprite, v.name, desc + (it ? '' : ' Your basket was full, so it went on the shelf instead.'), null);
      UI.hud();
      paint();
    }

    function showResult(sprite, name, desc, after) {
      const r = box.querySelector('.brew-result');
      r.innerHTML = '<div class="result-card"><div class="rc-label">You brewed</div><div class="rc-art">' + UI.itemBig(sprite, 4) + '</div><h2>' + name + '</h2><p>' + desc + '</p><button class="pbtn green" id="rc-ok">Lovely</button></div>';
      r.classList.add('show');
      layer.resultOpen = () => { r.classList.remove('show'); layer.resultOpen = null; if (after) after(); };
      r.querySelector('#rc-ok').onclick = () => layer.resultOpen && layer.resultOpen();
    }

    box.querySelector('.brew-close').onclick = () => { FH.audio.sfx('back'); UI.pop(layer); };
    box.querySelector('#brew-go').onclick = brew;
    box.querySelector('#brew-empty').onclick = () => { layer.pot = []; FH.audio.sfx('back'); paint(); };
    layer.onKey = (code) => {
      if (layer.resultOpen) { if (['Enter', 'Space', 'KeyE', 'Escape'].includes(code)) layer.resultOpen(); return; }
      const n = (layer.cards || []).length;
      if (code === 'Escape') { FH.audio.sfx('back'); UI.pop(layer); }
      else if ((code === 'ArrowLeft' || code === 'KeyA') && n) { layer.sel = (layer.sel + n - 1) % n; FH.audio.sfx('tick'); paint(); }
      else if ((code === 'ArrowRight' || code === 'KeyD') && n) { layer.sel = (layer.sel + 1) % n; FH.audio.sfx('tick'); paint(); }
      else if ((code === 'Enter' || code === 'Space' || code === 'KeyE') && n) toggle(layer.cards[layer.sel].i);
      else if (code === 'KeyR') brew();
      else if (code === 'KeyX' || code === 'Backspace') { layer.pot = []; paint(); }
    };

    // animation
    let raf = 0, last = performance.now();
    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      layer.t += dt;
      const t = layer.t;
      g.imageSmoothingEnabled = false;
      g.drawImage(table(), 0, 0);
      const n = layer.pot.length;
      layer.flash = Math.max(0, layer.flash - dt);
      g.save(); g.translate(0, -22);
      // chalk circle: brighter with each ingredient, blazing on a brew
      const power = 0.25 + n * 0.22 + layer.flash * 0.8 + Math.sin(t * 2) * 0.05;
      g.save();
      g.globalCompositeOperation = 'lighter';
      glow(g, 160, 100, 90, '255,140,60', Math.min(0.6, power * 0.4));
      g.restore();
      g.strokeStyle = 'rgba(255,170,80,' + Math.min(1, power) + ')';
      g.lineWidth = 1;
      [[70, 1], [64, 1], [40, 0.6]].forEach(([rad, a]) => { g.globalAlpha = a; g.beginPath(); g.ellipse(160.5, 100.5, rad, rad * 0.55, 0, 0, Math.PI * 2); g.stroke(); });
      g.globalAlpha = 1;
      // triangle and rune ticks, slowly turning
      g.beginPath();
      for (let k = 0; k <= 3; k++) { const a = t * 0.15 + k * Math.PI * 2 / 3 - Math.PI / 2; const px = 160 + Math.cos(a) * 64, py = 100 + Math.sin(a) * 35; if (k) g.lineTo(px, py); else g.moveTo(px, py); }
      g.stroke();
      g.fillStyle = 'rgba(255,200,120,' + Math.min(1, power) + ')';
      for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2 - t * 0.1; g.fillRect(Math.round(160 + Math.cos(a) * 67), Math.round(100 + Math.sin(a) * 37), k % 3 ? 1 : 2, 1); }
      // candles
      [[40, 70, 16], [52, 78, 11], [30, 86, 9], [276, 74, 14], [288, 84, 10]].forEach(([x, y, h], i) => candle(g, x, y, h, t, i));
      g.save(); g.globalCompositeOperation = 'lighter';
      [[42, 66], [278, 70]].forEach(([x, y], i) => glow(g, x, y, 46, '255,190,100', 0.3 + Math.sin(t * 9 + i) * 0.03));
      g.restore();
      // the pot
      const col = brewColour(potItems());
      g.fillStyle = 'rgba(0,0,0,0.45)'; g.beginPath(); g.ellipse(160, 128, 48, 12, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#1a1220'; g.beginPath(); g.ellipse(160, 104, 46, 32, 0, 0, Math.PI); g.fill();
      g.fillStyle = '#2a1f36'; g.beginPath(); g.ellipse(150, 106, 30, 22, 0, 0.2, Math.PI * 0.9); g.fill();
      g.fillStyle = '#3e2e50'; g.fillRect(126, 108, 3, 8); g.fillRect(132, 116, 3, 5);
      // legs
      g.fillStyle = '#120c18'; g.fillRect(122, 126, 6, 6); g.fillRect(192, 126, 6, 6); g.fillRect(157, 132, 6, 4);
      // rim
      g.fillStyle = '#120c18'; g.beginPath(); g.ellipse(160, 92, 48, 15, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#4a3a5a'; g.beginPath(); g.ellipse(160, 91, 46, 13, 0, 0, Math.PI * 2); g.fill();
      // liquid
      g.fillStyle = rgb(col, 0.7); g.beginPath(); g.ellipse(160, 93, 40, 10, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = rgb(col); g.beginPath(); g.ellipse(158, 92, 36, 8, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = rgb(col.map(v => v + 60)); g.fillRect(140, 89, 10, 1); g.fillRect(164, 91, 6, 1);
      // bubbles
      for (let k = 0; k < 6; k++) {
        const ph = (t * (0.8 + k * 0.13) + k * 0.37) % 1;
        const bx = 160 + Math.sin(k * 2.3) * 26, by = 93 + Math.cos(k * 1.7) * 5;
        const rr = Math.round(1 + ph * 2);
        g.fillStyle = rgb(col.map(v => v + 80)); g.fillRect(Math.round(bx - rr), Math.round(by - rr), rr * 2, rr * 2);
        g.fillStyle = rgb(col, 0.6); g.fillRect(Math.round(bx - rr + 1), Math.round(by - rr + 1), rr * 2 - 2, rr * 2 - 2);
      }
      // steam
      for (let k = 0; k < 5; k++) {
        const ph = (t * 0.4 + k * 0.2) % 1;
        g.fillStyle = 'rgba(255,255,255,' + (0.18 * (1 - ph)) + ')';
        g.fillRect(Math.round(146 + k * 7 + Math.sin(t * 2 + k) * 3), Math.round(86 - ph * 40), 3, 3);
      }
      g.save(); g.globalCompositeOperation = 'lighter';
      glow(g, 160, 90, 40, col.map(Math.round).join(','), 0.25 + layer.flash * 0.4);
      g.restore();
      // splashes
      layer.splash = layer.splash.filter(s => {
        s.life -= dt; s.vy += 160 * dt; s.x += s.vx * dt; s.y += s.vy * dt;
        g.fillStyle = rgb(col.map(v => v + 40)); g.fillRect(Math.round(s.x), Math.round(s.y), 2, 2);
        return s.life > 0;
      });
      g.restore();
      if (layer.flash > 0) { g.fillStyle = 'rgba(255,240,200,' + (layer.flash * 0.35) + ')'; g.fillRect(0, 0, W, H); }
      raf = requestAnimationFrame(frame);
    }
    layer.onClose = () => cancelAnimationFrame(raf);
    UI.push(layer);
    paint();
    raf = requestAnimationFrame(frame);
    return layer;
  };
})(window.FH);
