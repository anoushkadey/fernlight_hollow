// Everything drawn in the DOM: HUD, visual-novel dialogue, comic cutscenes, the
// basket book, the witch's counter, title, character select, pause and game over.
// Panels sit on a layer stack; the top layer gets the keyboard.
(function (FH) {
  'use strict';

  const G = FH.game;
  const UI = FH.ui = { layers: [] };
  const $ = (sel, root) => (root || document).querySelector(sel);
  const el = (html) => { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstElementChild; };
  const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sfx = (n) => FH.audio.sfx(n);
  const pickLine = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const NAMES = { draco: 'Draco', sage: 'Sage', willow: 'Willow', grandma: 'Grandma Hazel', witch: 'Belladonna' };
  const PLAYABLE = ['draco', 'sage', 'willow'];

  function img(canvas, scale, key, cls) {
    return '<img class="px ' + (cls || '') + '" src="' + FH.spriteURL(canvas, scale, key) + '" width="' + canvas.width * scale + '" height="' + canvas.height * scale + '" alt="">';
  }
  const itemImg = (id, s, cls) => img(FH.itemSprite(id), s, 'item-' + id, cls);
  const itemBig = (id, s) => img(FH.itemSpriteHD(id), s, 'itemhd-' + id);
  UI.itemBig = itemBig;
  const iconImg = (n, s, cls) => img(FH.icon(n), s, 'icon-' + n, cls);
  // The three wanderers use their painted portraits; Hazel and Belladonna are drawn in code.
  UI.portraitURL = (who, mood) => PLAYABLE.includes(who) ? 'assets/portraits/' + who + '.png' : FH.spriteURL(FH.portraitHD(who, mood), 3, 'hd-' + who + '-' + (mood || 'open'));
  const portrait = (who, mood, cls) => '<img class="px portrait ' + (cls || '') + '" src="' + UI.portraitURL(who, mood) + '" alt="' + esc(NAMES[who] || '') + '">';
  UI.itemImg = itemImg; UI.iconImg = iconImg;
  const D = () => FH.decor;
  const vines = () => '<img class="px vine vine-l" src="' + D().vineL + '" alt=""><img class="px vine vine-r" src="' + D().vineR + '" alt="">';
  const flourish = () => '<img class="px flourish" src="' + D().flourish + '" alt="">';

  // Ragged paper edge, cut fresh for each element so no two notes match.
  UI.tear = function (node, jag) {
    const w = node.offsetWidth, h = node.offsetHeight;
    if (!w || !h) return;
    jag = jag || 6;
    const step = 9, snap = v => Math.round(v / 3) * 3;
    const pts = [];
    const r = Math.random;
    for (let x = 0; x <= w; x += step) pts.push([Math.min(x, w), snap(r() * jag)]);
    for (let y = step; y <= h; y += step) pts.push([w - snap(r() * jag * 0.6), Math.min(y, h)]);
    for (let x = w - step; x >= 0; x -= step) pts.push([Math.max(x, 0), h - snap(r() * jag)]);
    for (let y = h - step; y > 0; y -= step) pts.push([snap(r() * jag * 0.6), y]);
    node.style.clipPath = 'polygon(' + pts.map(p => p[0] + 'px ' + p[1] + 'px').join(',') + ')';
  };

  // ---------- layer stack ----------
  UI.push = function (layer) {
    UI.layers.push(layer);
    $('#layers').appendChild(layer.el);
    G.paused = true;
    document.body.classList.add('layer-open');
    requestAnimationFrame(() => layer.el.classList.add('in'));
    return layer;
  };
  UI.pop = function (layer) {
    const i = UI.layers.indexOf(layer || UI.top());
    if (i < 0) return;
    const L = UI.layers.splice(i, 1)[0];
    L.el.classList.remove('in');
    L.el.classList.add('out');
    setTimeout(() => L.el.remove(), 180);
    if (L.onClose) L.onClose();
    G.paused = UI.layers.length > 0;
    document.body.classList.toggle('layer-open', G.paused);
    UI.hud(true);
    if (!G.paused && G.mode === 'play') G.save();
  };
  UI.top = () => UI.layers[UI.layers.length - 1];
  UI.clear = function () { while (UI.layers.length) UI.pop(); };
  UI.handleKey = function (code) {
    const L = UI.top();
    if (!L) return false;
    if (L.onKey) L.onKey(code);
    return true;
  };

  // ---------- HUD ----------
  UI.buildHud = function () {
    const hud = $('#hud');
    hud.innerHTML = `
      <div class="vitals">
        <img class="px medal" src="${D().heartMedal}" alt="">
        <div class="vitals-bar">
          <div class="hearts" id="hud-hearts"></div>
          <div class="stam"><div class="stam-fill" id="hud-stam"></div><div class="stam-shine"></div></div>
        </div>
      </div>
      <div class="bag-chip" id="hud-bagchip">${iconImg('basket', 3)}<span id="hud-bag">0/15</span></div>
      <div class="clock">
        <div class="clock-pill"><div class="clock-time" id="hud-time">08:00 AM</div><div class="clock-sub"><span id="hud-day">Day 1</span> · <span id="hud-zone">Fernlight Meadow</span></div></div>
        <div class="clock-emblem" id="hud-sky"></div>
      </div>
      <div class="quest paper" id="hud-quest"><div class="q-ch" id="hud-qch"></div><div class="q-goal" id="hud-qgoal"></div></div>
      <div class="hud-ability" id="hud-ability"></div>
      <div class="hud-buffs" id="hud-buffs"></div>
      <div class="side-tabs">
        <button class="stab" data-a="basket" title="Basket (B)">${iconImg('basket', 3)}</button>
        <button class="stab" data-a="journal" title="Journal (J)">${iconImg('book', 3)}</button>
        <button class="stab" data-a="pause" title="Pause (Esc)"><span class="gear">II</span></button>
      </div>
      <div class="hud-keys"><span><b class="kbd">E</b> interact</span><span><b class="kbd">Q</b> ability</span><span><b class="kbd">Shift</b> run</span></div>`;
    hud.querySelectorAll('.stab').forEach(b => {
      b.onclick = () => {
        if (G.mode !== 'play' || G.paused) return;
        FH.audio.start();
        if (b.dataset.a === 'basket') UI.openBook('basket');
        else if (b.dataset.a === 'journal') UI.openBook('journal');
        else UI.pause();
      };
    });
  };

  let hudCache = {};
  UI.hud = function (force) {
    if (G.mode !== 'play' && G.mode !== 'over') return;
    const p = G.player;
    if (!p || !$('#hud-hearts')) return;
    if (force) hudCache.quest = null;
    const hearts = p.hearts + '|' + FH.MAX_HEARTS;
    if (hudCache.hearts !== hearts) {
      hudCache.hearts = hearts;
      let h = '';
      for (let i = 0; i < FH.MAX_HEARTS; i++) h += '<span class="heart ' + (i < p.hearts ? 'full' : 'empty') + '">' + iconImg(i < p.hearts ? 'heart' : 'heartEmpty', 3) + '</span>';
      $('#hud-hearts').innerHTML = h;
      $('#hud-hearts').classList.remove('bump'); void $('#hud-hearts').offsetWidth; $('#hud-hearts').classList.add('bump');
    }
    const pct = Math.round(p.stam / p.maxStam * 100);
    const st = $('#hud-stam');
    st.style.width = pct + '%';
    st.classList.toggle('low', pct < 25);
    $('#hud-bag').textContent = p.basket.length + '/' + FH.BASKET_MAX;
    $('#hud-bagchip').classList.toggle('full', p.basket.length >= FH.BASKET_MAX);
    $('#hud-time').textContent = FH.clockText();
    $('#hud-day').textContent = 'Day ' + G.day;
    const sky = FH.isNight() ? 'moon' : 'sun';
    if (hudCache.sky !== sky) { hudCache.sky = sky; $('#hud-sky').innerHTML = iconImg(sky, 4); $('#hud-sky').classList.toggle('night', sky === 'moon'); }
    const zone = G.zoneName();
    if (hudCache.zone !== zone) {
      hudCache.zone = zone; $('#hud-zone').textContent = zone;
      document.body.classList.toggle('in-dark', zone === 'The Dark Wood' || zone === "Belladonna's Den" || zone === 'The Old Glade');
    }
    // quest note
    const info = FH.story.info();
    const q = info.ch + info.title + info.goal;
    if (hudCache.quest !== q) {
      hudCache.quest = q;
      $('#hud-qch').textContent = (info.ch === '~' ? 'Epilogue' : 'Chapter ' + info.ch) + ' · ' + info.title;
      $('#hud-qgoal').textContent = info.goal;
      const qn = $('#hud-quest');
      qn.classList.remove('flash'); void qn.offsetWidth; qn.classList.add('flash');
      requestAnimationFrame(() => UI.tear(qn, 4));
    }
    // ability card
    const c = FH.CHARACTERS[p.who];
    if (hudCache.who !== p.who) {
      hudCache.who = p.who;
      $('#hud-ability').innerHTML = `<div class="ab-face">${portrait(p.who, 'open', 'face')}<div class="cd" id="hud-cd"></div><span class="kbd ab-key">Q</span></div>
        <div class="ab-text"><div class="ab-name">${esc(c.ability.name)}</div><div class="ab-state" id="hud-cdtext">Ready</div></div>`;
    }
    const cdPct = p.cd > 0 ? p.cd / c.ability.cooldown : 0;
    $('#hud-cd').style.setProperty('--cd', (cdPct * 360) + 'deg');
    $('#hud-cd').classList.toggle('on', p.cd > 0);
    $('#hud-cdtext').textContent = p.cd > 0 ? 'ready in ' + Math.ceil(p.cd) + 's' : 'Ready';
    $('#hud-cdtext').classList.toggle('ready', p.cd <= 0);
    const names = { swift: ["Hare's Step", 'swift'], owl: ["Owl's Eye", 'owl'], thorn: ['Thornward', 'thorn'], hiccup: ['Hiccups', 'murky'] };
    let b = '';
    Object.keys(p.buffs).forEach(k => { if (p.buffs[k] > 0) b += '<div class="buff">' + itemImg(names[k][1], 2) + '<span>' + names[k][0] + '</span><b>' + Math.ceil(p.buffs[k]) + 's</b></div>'; });
    if (p.stam <= 0) b += '<div class="buff warn">' + iconImg('bolt', 2) + '<span>Exhausted</span><b>eat!</b></div>';
    if (hudCache.buffs !== b) { hudCache.buffs = b; $('#hud-buffs').innerHTML = b; }
  };
  UI.resetHudCache = () => { hudCache = {}; };

  // floating prompt and speech bubble, following the world
  let barkState = null, promptTop = null;
  UI.bark = function (text, force) {
    if (barkState && !force && barkState.t > 0) return;
    barkState = { text, t: Math.min(6, 2 + text.length / 22) };
    const b = $('#bark');
    b.innerHTML = '<span>' + esc(text) + '</span>';
    b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
  };
  UI.frame = function (dt) {
    if (G.mode !== 'play') { $('#prompt').classList.remove('show'); $('#bark').classList.remove('show'); return; }
    const p = G.player;
    const pr = $('#prompt');
    if (G.prompt && !G.paused) {
      const target = G.prompt.ref && G.prompt.ref.x !== undefined ? G.prompt.ref : (G.prompt.kind === 'cauldron' ? G.world.cauldron : p);
      const s = G.worldToScreen(target.x, target.y - (G.prompt.kind === 'npc' ? 34 : G.prompt.kind === 'fernlight' ? 30 : 18));
      promptTop = s.y - pr.offsetHeight;
      pr.style.transform = 'translate(' + Math.round(s.x) + 'px,' + Math.round(s.y) + 'px) translate(-50%,-100%)';
      if (pr.dataset.label !== G.prompt.label) { pr.dataset.label = G.prompt.label; pr.innerHTML = '<span class="kbd">E</span>' + esc(G.prompt.label); }
      pr.classList.add('show');
    } else { pr.classList.remove('show'); promptTop = null; }
    const b = $('#bark');
    if (barkState) {
      barkState.t -= dt;
      const s = G.worldToScreen(p.x, p.y - 26);
      if (promptTop !== null) s.y = Math.min(s.y, promptTop - 12);
      b.style.transform = 'translate(' + Math.round(s.x) + 'px,' + Math.round(s.y) + 'px) translate(-50%,-100%)';
      if (barkState.t <= 0 || G.paused) { b.classList.remove('show'); if (barkState.t <= 0) barkState = null; }
      else b.classList.add('show');
    }
    UI.hud();
  };

  UI.toast = function (text, kind, itemId) {
    if (!text) return;
    const box = $('#toasts');
    const t = el('<div class="toast ' + (kind || '') + '">' + (itemId ? itemImg(itemId, 2) : '') + '<span>' + esc(text) + '</span></div>');
    box.appendChild(t);
    requestAnimationFrame(() => UI.tear(t, 3));
    while (box.children.length > 4) box.firstChild.remove();
    setTimeout(() => t.classList.add('out'), 2600);
    setTimeout(() => t.remove(), 3100);
  };

  UI.chapterCard = function (ch, title) {
    // wait for any dialogue or cutscene to finish first
    if (UI.layers.length) { setTimeout(() => UI.chapterCard(ch, title), 400); return; }
    const c = el('<div class="chapter-card"><div class="cc-plaque"><div class="cc-ch">' + (ch === '~' ? 'Epilogue' : 'Chapter ' + ch) + '</div><div class="cc-title">' + esc(title) + '</div></div>' + flourish() + '</div>');
    $('#app').appendChild(c);
    sfx('morning');
    setTimeout(() => c.classList.add('out'), 2800);
    setTimeout(() => c.remove(), 3500);
  };

  // ---------- dialogue (visual-novel layout) ----------
  UI.say = function (lines, onDone) {
    let i = 0, shown = 0, full = '', timer = null, choiceIdx = 0;
    const box = el(`<div class="layer vn-layer">
      <div class="vn-stage"><div class="vn-actor left"></div><div class="vn-actor right"></div></div>
      <div class="vn-box">
        <div class="vn-name"></div>
        <div class="vn-paper"><div class="vn-text"></div><div class="vn-more">▼</div></div>
        <div class="vn-choices"></div>
      </div></div>`);
    const layer = { el: box };
    const textEl = $('.vn-text', box), more = $('.vn-more', box), choicesEl = $('.vn-choices', box);
    const paper = $('.vn-paper', box);
    const actorL = $('.vn-actor.left', box), actorR = $('.vn-actor.right', box);
    const show = () => {
      const L = lines[i];
      const who = L.who;
      const side = PLAYABLE.includes(who) ? 'right' : 'left';
      [actorL, actorR].forEach(a => a.classList.remove('speaking'));
      if (who) {
        const a = side === 'left' ? actorL : actorR;
        const key = who + ':' + (L.mood || 'open');
        if (a.dataset.key !== key) {
          a.innerHTML = '<div class="actor-frame">' + portrait(who, L.mood) + '</div>';
          a.dataset.key = key;
        }
        a.classList.add('shown', 'speaking');
        $('.vn-name', box).textContent = NAMES[who] || who;
        $('.vn-name', box).className = 'vn-name ' + side + ' ' + who;
        box.classList.remove('narrator');
      } else {
        $('.vn-name', box).className = 'vn-name hide';
        box.classList.add('narrator');
      }
      full = L.text; shown = 0; textEl.textContent = '';
      more.style.visibility = 'hidden';
      choicesEl.classList.remove('show'); choicesEl.innerHTML = '';
      clearInterval(timer);
      timer = setInterval(() => {
        shown += 1;
        textEl.textContent = full.slice(0, shown);
        if (shown % 2 === 0 && full[shown - 1] !== ' ') sfx('blip');
        if (shown >= full.length) done();
      }, 22);
    };
    const done = () => {
      clearInterval(timer);
      shown = full.length; textEl.textContent = full;
      const L = lines[i];
      if (L.choices) {
        choiceIdx = 0;
        choicesEl.innerHTML = L.choices.map((c, k) => '<button class="choice" data-k="' + k + '"><span class="arrow">▸</span>' + esc(c.label) + '</button>').join('');
        choicesEl.classList.add('show');
        markChoice();
        choicesEl.querySelectorAll('.choice').forEach(b => {
          b.onclick = (e) => { e.stopPropagation(); choiceIdx = +b.dataset.k; pickChoice(); };
          b.onmouseenter = () => { choiceIdx = +b.dataset.k; markChoice(); };
        });
      } else more.style.visibility = 'visible';
    };
    const markChoice = () => choicesEl.querySelectorAll('.choice').forEach((b, k) => b.classList.toggle('sel', k === choiceIdx));
    const pickChoice = () => {
      const c = lines[i].choices[choiceIdx];
      sfx('select');
      UI.pop(layer);
      if (c.fn) c.fn();
    };
    const advance = () => {
      if (shown < full.length) { done(); return; }
      if (lines[i].choices) return;
      i++;
      if (i >= lines.length) { UI.pop(layer); if (onDone) onDone(); return; }
      show();
    };
    layer.onKey = (code) => {
      const L = lines[i];
      if (L.choices && shown >= full.length) {
        if (code === 'ArrowUp' || code === 'KeyW') { choiceIdx = (choiceIdx + L.choices.length - 1) % L.choices.length; markChoice(); sfx('tick'); }
        else if (code === 'ArrowDown' || code === 'KeyS') { choiceIdx = (choiceIdx + 1) % L.choices.length; markChoice(); sfx('tick'); }
        else if (code === 'Enter' || code === 'Space' || code === 'KeyE') pickChoice();
        else if (code === 'Escape') { choiceIdx = L.choices.length - 1; pickChoice(); }
        return;
      }
      if (code === 'Enter' || code === 'Space' || code === 'KeyE' || code === 'Escape') advance();
    };
    layer.onClose = () => clearInterval(timer);
    box.addEventListener('click', () => advance());
    UI.push(layer);
    requestAnimationFrame(() => UI.tear(paper, 6));
    show();
    return layer;
  };

  // ---------- comic cutscenes ----------
  UI.comic = function (panels, onDone) {
    const many = panels.length > 1;
    const box = el(`<div class="layer comic-layer"><div class="comic ${many ? 'grid' : 'single'}">${panels.map((p, k) =>
      '<figure class="cpanel" data-k="' + k + '"><canvas width="160" height="100"></canvas><figcaption></figcaption></figure>').join('')}</div>
      <div class="comic-hint"><span class="kbd">E</span> continue</div></div>`);
    const layer = { el: box, k: -1, typing: null };
    const figs = Array.from(box.querySelectorAll('.cpanel'));
    let raf = 0, t0 = performance.now(), timer = null, shown = 0, full = '';
    const draw = (now) => {
      const t = (now - t0) / 1000;
      figs.forEach((f, k) => {
        if (k > layer.k) return;
        const g = f.querySelector('canvas').getContext('2d');
        g.imageSmoothingEnabled = false;
        const art = FH.story.ART[panels[k].art];
        if (art) art(g, 160, 100, t + k);
      });
      raf = requestAnimationFrame(draw);
    };
    const reveal = () => {
      layer.k++;
      if (layer.k >= panels.length) { UI.pop(layer); if (onDone) onDone(); return; }
      const f = figs[layer.k];
      f.classList.add('on');
      sfx('page');
      full = panels[layer.k].text || ''; shown = 0;
      const cap = f.querySelector('figcaption');
      clearInterval(timer);
      timer = setInterval(() => {
        shown++;
        cap.textContent = full.slice(0, shown);
        if (shown % 3 === 0) sfx('blip');
        if (shown >= full.length) clearInterval(timer);
      }, 24);
    };
    const advance = () => {
      if (shown < full.length) { clearInterval(timer); shown = full.length; figs[layer.k].querySelector('figcaption').textContent = full; return; }
      reveal();
    };
    layer.onKey = (code) => { if (['Enter', 'Space', 'KeyE', 'Escape'].includes(code)) advance(); };
    layer.onClose = () => { cancelAnimationFrame(raf); clearInterval(timer); };
    box.addEventListener('click', advance);
    UI.push(layer);
    raf = requestAnimationFrame(draw);
    reveal();
    return layer;
  };

  // ---------- trading helpers ----------
  UI.discounted = function (cost) {
    const c = cost.map(x => Object.assign({}, x));
    if (G.player && G.player.who === 'willow') {
      let best = null;
      c.forEach(x => { if (x.n > 1 && (!best || x.n > best.n)) best = x; });
      if (best) best.n--;
    }
    return c;
  };
  // Which basket items would pay for this cost? Poison goes first: the witch likes it.
  UI.payPlan = function (cost, basket) {
    basket = basket || G.player.basket;
    const used = new Set();
    for (const c of cost) {
      const cands = basket.map((it, i) => ({ it, i, d: FH.ITEMS[it.id] }))
        .filter(o => !used.has(o.i) && o.d.tags.includes(c.tag) && o.d.kind !== 'Potion')
        .sort((a, b) => (b.d.toxic ? 1 : 0) - (a.d.toxic ? 1 : 0) || a.d.stam - b.d.stam);
      if (cands.length < c.n) return null;
      cands.slice(0, c.n).forEach(o => used.add(o.i));
    }
    return Array.from(used);
  };
  UI.canAfford = (cost) => !!UI.payPlan(UI.discounted(cost));
  const costText = (cost) => cost.map(c => c.n + ' ' + (c.n === 1 ? FH.SINGULAR[c.tag] : FH.TAG_NAMES[c.tag])).join(' · ');
  const removeIdx = (idxs) => { idxs.sort((a, b) => b - a).forEach(i => G.player.basket.splice(i, 1)); };
  UI.removeIdx = removeIdx;

  function needMatches(need, it, strict) {
    const d = FH.ITEMS[it.id];
    if (d.kind === 'Potion' || d.kind === 'Keepsake') return false;
    if (need.toxic) return !!d.toxic;
    if (need.id) return it.id === need.id;
    return d.tags.includes(need.tag) && !(strict && d.toxic);
  }
  function needLooksLike(need, it) {
    const d = FH.ITEMS[it.id];
    if (!d.toxic || d.kind === 'Potion') return false;
    if (need.id) return d.look === need.id;
    if (need.tag) return d.tags.includes(need.tag);
    return false;
  }
  function errandPlan(who) {
    const e = FH.ERRANDS[who][G.errands[who]];
    const strict = who === 'grandma';
    const used = new Set();
    const progress = [];
    let ok = true;
    e.need.forEach(n => {
      const cands = G.player.basket.map((it, i) => ({ it, i })).filter(o => !used.has(o.i) && needMatches(n, o.it, strict));
      const take = cands.slice(0, n.n);
      take.forEach(o => used.add(o.i));
      // what the player *thinks* they have (lookalikes included), for the progress readout
      const believed = G.player.basket.filter(it => needMatches(n, it, strict) || (strict && !FH.seesTruth() && needLooksLike(n, it))).length;
      progress.push({ n, have: Math.min(n.n, FH.seesTruth() || !strict ? take.length : believed) });
      if (take.length < n.n) ok = false;
    });
    const fakes = strict ? G.player.basket.map((it, i) => ({ it, i })).filter(o => e.need.some(n => needLooksLike(n, o.it))) : [];
    return { e, ok, idx: Array.from(used), progress, fakes };
  }
  const needLabel = (n) => {
    if (n.toxic) return n.n + ' poisonous thing' + (n.n > 1 ? 's' : '');
    if (n.id) return n.n + ' × ' + FH.ITEMS[n.id].name;
    return n.n + ' ' + (n.n === 1 ? FH.SINGULAR[n.tag] : FH.TAG_NAMES[n.tag]);
  };
  UI.errandPlan = errandPlan;
  UI.needLabel = needLabel;
  function newErrand(who) {
    const pool = FH.ERRANDS[who];
    let n = G.errands[who];
    if (pool.length > 1) while (n === G.errands[who]) n = Math.floor(Math.random() * pool.length);
    G.errands[who] = n;
  }

  // ---------- Grandma ----------
  UI.talkGrandma = function () {
    if (FH.story.onGrandma()) return;
    if (!G.flags.metGrandma) {
      G.flags.metGrandma = true;
      UI.say(FH.LINES.grandmaFirst.map(([mood, text]) => ({ who: 'grandma', mood, text })), () => UI.grandmaMenu());
      return;
    }
    UI.grandmaMenu();
  };
  UI.grandmaMenu = function (greet) {
    const h = FH.hour();
    const hello = greet || (h < 11 ? 'Morning, love. What can I do for you?' : h < 17 ? 'Afternoon, dear. Everything all right?' : "Evening. Mind the step, I can't see it either.");
    const choices = [
      { label: 'Just chatting', fn: () => UI.say([{ who: 'grandma', mood: Math.random() < 0.5 ? 'happy' : 'open', text: pickLine(FH.LINES.grandmaChat) }], () => UI.grandmaMenu('Anything else?')) },
    ];
    if (G.story.step >= 2) choices.push({ label: 'Any errands for me?', fn: () => UI.grandmaErrand() });
    choices.push(
      { label: 'Any vegetables to spare?', fn: () => UI.grandmaVeg() },
      { label: 'Could I rest by the stove?', fn: () => UI.grandmaRest() },
      { label: 'Goodbye', fn: () => UI.say([{ who: 'grandma', mood: 'happy', text: pickLine(['Off you go. Eat something green.', 'Bye, love. Mind the brambles.', "Come back before dark. Or after. I'm always up."]) }]) });
    UI.say([{ who: 'grandma', mood: 'happy', text: hello, choices }]);
  };
  UI.grandmaErrand = function () {
    const pl = errandPlan('grandma');
    const needStr = pl.e.need.map(needLabel).join(', ');
    if (pl.fakes.length && !pl.ok) {
      removeIdx(pl.fakes.map(o => o.i));
      UI.hud();
      UI.say([{ who: 'grandma', mood: 'wide', text: FH.LINES.grandmaPoison }, { who: 'grandma', mood: 'happy', text: 'Still after: ' + needStr + '. No rush.' }], () => UI.grandmaMenu('Anything else?'));
      return;
    }
    if (pl.ok) {
      UI.say([{ who: 'grandma', mood: 'open', text: pl.e.ask }, { who: G.player.who, mood: 'happy', text: 'Got them right here.', choices: [
        { label: 'Hand them over', fn: () => {
          removeIdx(pl.idx);
          G.stats.errands++;
          sfx('trade');
          const got = [];
          pl.e.reward.forEach(r => { if (G.addToBasket(r)) got.push(FH.ITEMS[r].name); });
          newErrand('grandma');
          UI.hud();
          UI.say([{ who: 'grandma', mood: 'happy', text: pickLine(FH.LINES.grandmaThanks) }, { who: null, text: got.length ? 'You got ' + got.join(' and ') + '.' : 'Your basket is too full to take what she offers. She tuts and keeps it warm for you.' }], () => UI.grandmaMenu('Anything else?'));
        } },
        { label: 'Not yet', fn: () => UI.grandmaMenu('Whenever you like.') },
      ] }]);
      return;
    }
    UI.say([{ who: 'grandma', mood: 'open', text: pl.e.ask }, { who: null, text: 'Errand: ' + needStr + '. You have ' + pl.progress.map(p => p.have + ' of ' + p.n.n).join(', ') + '.' }], () => UI.grandmaMenu('Anything else?'));
  };
  UI.grandmaVeg = function () {
    if (G.flags.giftDay === G.day) { UI.say([{ who: 'grandma', mood: 'open', text: FH.LINES.grandmaVegDone }], () => UI.grandmaMenu('Anything else?')); return; }
    const n = G.player.who === 'willow' ? 3 : 2;
    const pool = ['carrot', 'turnip', 'radish', 'pumpkin', 'carrot'];
    const got = [];
    for (let i = 0; i < n; i++) { const id = pool[Math.floor(Math.random() * pool.length)]; if (G.addToBasket(id)) got.push(FH.ITEMS[id].name); }
    if (!got.length) { UI.say([{ who: 'grandma', mood: 'open', text: "Your basket's stuffed full, love. Eat something first, then come back." }], () => UI.grandmaMenu('Anything else?')); return; }
    G.flags.giftDay = G.day;
    sfx('harvest');
    UI.hud();
    const extra = G.player.who === 'willow' ? ' And one more, because you asked so nicely.' : '';
    const blight = G.story.step < 7 ? ' They came out of the cold box. The garden hasn\'t given me much since the grey.' : '';
    UI.say([{ who: 'grandma', mood: 'happy', text: pickLine(FH.LINES.grandmaVeg) + extra + blight }, { who: null, text: 'You got ' + got.join(', ') + '.' }], () => UI.grandmaMenu('Anything else?'));
  };
  UI.grandmaRest = function () {
    if (G.flags.restDay === G.day) { UI.say([{ who: 'grandma', mood: 'open', text: FH.LINES.grandmaRestDone }], () => UI.grandmaMenu('Anything else?')); return; }
    G.flags.restDay = G.day;
    const evening = FH.hour() >= 18 || FH.hour() < 5;
    UI.say([{ who: null, text: FH.LINES.grandmaRest }], () => {
      UI.fade(() => {
        const p = G.player;
        p.stam = p.maxStam;
        p.hearts = Math.min(FH.MAX_HEARTS, p.hearts + 1);
        if (evening) {
          if (FH.hour() >= 8) G.day++;
          G.time = 0;
        } else G.time = Math.min(FH.DAY_LEN - 1, G.time + FH.DAY_LEN / 8);
        UI.hud();
        G.save();
      }, () => {
        sfx('morning');
        UI.say([{ who: 'grandma', mood: 'happy', text: evening ? "Morning, sleepyhead. There's porridge if you want it. There's always porridge." : "There. Colour's back in your cheeks." }]);
      }, evening ? 'The fire burns down. Somewhere, an owl.' : 'A quiet hour passes.');
    });
  };

  UI.fade = function (mid, after, caption) {
    const f = $('#fade');
    f.innerHTML = caption ? '<div class="fade-cap">' + esc(caption) + '</div>' : '';
    f.classList.add('on');
    G.paused = true;
    sfx('sleep');
    setTimeout(() => {
      if (mid) mid();
      setTimeout(() => { f.classList.remove('on'); G.paused = UI.layers.length > 0; setTimeout(() => after && after(), 500); }, 1400);
    }, 700);
  };

  // ---------- Witch ----------
  UI.talkWitch = function () {
    if (FH.story.onWitch()) return;
    if (!G.flags.metWitch) {
      G.flags.metWitch = true;
      UI.say(FH.LINES.witchFirst.map(([mood, text]) => ({ who: 'witch', mood, text })), () => UI.openWitch('trade'));
      return;
    }
    UI.openWitch('trade');
  };

  // A book-styled panel: wood frame, two paper pages, vines, ribbon, tabs on top.
  function bookShell(opts) {
    return el(`<div class="layer book-layer">
      <div class="book ${opts.cls || ''}">
        ${vines()}
        <img class="px ribbon" src="${opts.ribbon || D().ribbonRed}" alt="">
        <div class="book-tabs">${opts.tabs.map(t => '<button class="btab" data-t="' + t[0] + '">' + t[1] + '</button>').join('')}</div>
        <div class="book-title plaque"></div>
        <button class="close-x" title="Close (Esc)">✕</button>
        ${opts.head || ''}
        <div class="pages"><div class="page left"></div><div class="page right"></div></div>
      </div></div>`);
  }

  UI.openWitch = function (tab) {
    if (tab === 'cauldron') { FH.openCauldron(); return; }
    const box = bookShell({
      cls: 'witch-book', ribbon: D().ribbonGold,
      tabs: [['trade', 'Trade'], ['errand', 'Errand'], ['chat', 'Chat'], ['cauldron', 'Cauldron ›']],
      head: '<div class="witch-head"><div class="wh-por"></div><div class="wh-say"></div></div>',
    });
    const layer = { el: box, tab: tab || 'trade', sel: 0 };
    const say = (t, mood) => {
      $('.wh-say', box).textContent = t;
      $('.wh-por', box).innerHTML = portrait('witch', mood || 'lidded');
    };
    layer.say = say;
    const titles = { trade: 'Bottles on the Shelf', errand: "Belladonna's Errand", chat: 'Small Talk' };
    const render = () => {
      box.querySelectorAll('.btab').forEach(b => b.classList.toggle('on', b.dataset.t === layer.tab));
      $('.book-title', box).textContent = titles[layer.tab];
      const L = $('.page.left', box), R = $('.page.right', box);
      if (layer.tab === 'trade') renderTrade(layer, L, R);
      else if (layer.tab === 'errand') renderWitchErrand(layer, L, R);
      else renderWitchChat(layer, L, R);
    };
    layer.render = render;
    const tabs = ['trade', 'errand', 'chat'];
    const setTab = (t) => {
      if (t === 'cauldron') { UI.pop(layer); FH.openCauldron(); return; }
      layer.tab = t; layer.sel = 0; sfx('page'); render();
    };
    box.querySelectorAll('.btab').forEach(b => { b.onclick = () => setTab(b.dataset.t); });
    $('.close-x', box).onclick = () => { sfx('back'); UI.pop(layer); };
    layer.onKey = (code) => {
      if (code === 'Escape' || code === 'KeyB') { sfx('back'); UI.pop(layer); return; }
      const ti = tabs.indexOf(layer.tab);
      if (code === 'BracketLeft' || code === 'KeyQ') return setTab(tabs[(ti + tabs.length - 1) % tabs.length]);
      if (code === 'BracketRight' || code === 'Tab') return setTab(tabs[(ti + 1) % tabs.length]);
      if (code === 'KeyC') return setTab('cauldron');
      if (layer.keys) layer.keys(code);
    };
    say(pickLine(['What do you want, petal?', "Back again. I'd say I'm surprised.", 'Shop is open. Mostly.', 'Mind the cat. There is no cat. Mind it anyway.']), 'open');
    UI.push(layer);
    render();
  };

  function renderTrade(layer, L, R) {
    const trades = FH.TRADES;
    layer.sel = Math.min(layer.sel, trades.length - 1);
    const isWillow = G.player.who === 'willow';
    L.innerHTML = `<div class="trade-list">${trades.map((tr, i) => {
      const cost = UI.discounted(tr.cost);
      const ok = !!UI.payPlan(cost);
      return `<button class="trade-row ${i === layer.sel ? 'sel' : ''} ${ok ? 'ok' : 'poor'}" data-i="${i}"><span class="tr-art">${itemImg(tr.id, 3)}</span><span class="tr-name">${esc(FH.ITEMS[tr.id].name)}</span><span class="tr-cost">${isWillow ? '<s>' + costText(tr.cost) + '</s> ' : ''}${costText(cost)}</span></button>`;
    }).join('')}</div><p class="hint">She takes payment from your basket, oddest things first.${isWillow ? ' <b class="willow">Sweet Talk: one ingredient off.</b>' : ''}</p>`;
    const detail = () => {
      const tr = trades[layer.sel];
      const d = FH.ITEMS[tr.id];
      const cost = UI.discounted(tr.cost);
      const plan = UI.payPlan(cost);
      const recommended = G.player.who === 'draco' && G.dracoAdvice().includes(d.name);
      R.innerHTML = `<div class="item-card">
        <div class="ic-art kraft">${itemBig(tr.id, 4)}</div>
        <div class="ic-text"><h2>${esc(d.name)}</h2>${flourish()}<p class="desc">${esc(d.desc)}</p>${recommended ? '<p class="note-draco">Draco recommends this one.</p>' : ''}</div>
      </div>
      <div class="cost-box"><div class="lbl">She wants</div>${cost.map(c => {
        const have = G.player.basket.filter(it => FH.ITEMS[it.id].tags.includes(c.tag) && FH.ITEMS[it.id].kind !== 'Potion').length;
        return '<div class="cost-line ' + (have >= c.n ? 'ok' : '') + '"><span>' + c.n + ' ' + (c.n === 1 ? FH.SINGULAR[c.tag] : FH.TAG_NAMES[c.tag]) + '</span><b>' + Math.min(have, c.n) + '/' + c.n + '</b></div>';
      }).join('')}</div>
      <div class="actions"><button class="pbtn plum" id="do-trade" ${plan ? '' : 'disabled'}>Trade</button></div>`;
      $('#do-trade', R).onclick = () => doTrade();
    };
    const doTrade = () => {
      const tr = trades[layer.sel];
      const plan = UI.payPlan(UI.discounted(tr.cost));
      if (!plan) { sfx('deny'); layer.say(FH.LINES.witchPoor, 'lidded'); return; }
      removeIdx(plan);
      G.addToBasket(tr.id);
      G.stats.traded++;
      sfx('trade');
      layer.say(pickLine(['Pleasure doing business.', "Don't drink it all at once. Actually, do, it's one sip.", 'There. Now say thank you to the jar.', 'Lovely. I needed those for something awful.']), 'happy');
      UI.toast('+ ' + FH.ITEMS[tr.id].name, 'good', tr.id);
      UI.hud();
      layer.render();
    };
    const mark = () => L.querySelectorAll('.trade-row').forEach((x, k) => x.classList.toggle('sel', k === layer.sel));
    L.querySelectorAll('.trade-row').forEach(b => {
      b.onclick = () => { layer.sel = +b.dataset.i; sfx('tick'); mark(); detail(); };
      b.ondblclick = () => doTrade();
    });
    layer.keys = (code) => {
      if (code === 'ArrowUp' || code === 'KeyW') layer.sel = (layer.sel + trades.length - 1) % trades.length;
      else if (code === 'ArrowDown' || code === 'KeyS') layer.sel = (layer.sel + 1) % trades.length;
      else if (code === 'Enter' || code === 'KeyE' || code === 'Space') return doTrade();
      else return;
      sfx('tick'); mark(); detail();
    };
    detail();
  }

  function renderWitchErrand(layer, L, R) {
    const pl = errandPlan('witch');
    L.innerHTML = `<div class="ask-note paper"><p>“${esc(pl.e.ask)}”</p></div>
      <div class="cost-box">${pl.progress.map(p => '<div class="cost-line ' + (p.have >= p.n.n ? 'ok' : '') + '"><span>' + esc(needLabel(p.n)) + '</span><b>' + p.have + '/' + p.n.n + '</b></div>').join('')}</div>
      <p class="hint">${G.player.who === 'sage' ? 'Sage can see which things are poisonous. Handy, for once.' : "Can't tell what's poisonous? Sage could. Or an Owl's Eye."}</p>`;
    R.innerHTML = `<div class="lbl center">She'll pay</div><div class="reward">${pl.e.reward.map(r => '<div class="rw"><div class="kraft small">' + itemBig(r, 2) + '</div><span>' + FH.ITEMS[r].name + '</span></div>').join('')}</div>
      <div class="actions center"><button class="pbtn plum" id="give" ${pl.ok ? '' : 'disabled'}>Hand it over</button></div>
      <p class="hint center">Errands done so far: ${G.stats.errands}</p>`;
    const give = () => {
      const p2 = errandPlan('witch');
      if (!p2.ok) { sfx('deny'); layer.say("That's not it. Close, though. Not really.", 'lidded'); return; }
      removeIdx(p2.idx);
      const got = [];
      p2.e.reward.forEach(r => { if (G.addToBasket(r)) got.push(r); });
      G.stats.errands++;
      sfx('trade');
      newErrand('witch');
      layer.say(pickLine(FH.LINES.witchThanks), 'happy');
      got.forEach(r => UI.toast('+ ' + FH.ITEMS[r].name, 'good', r));
      UI.hud();
      renderWitchErrand(layer, L, R);
    };
    $('#give', R).onclick = give;
    requestAnimationFrame(() => L.querySelectorAll('.paper').forEach(n => UI.tear(n, 5)));
    layer.keys = (code) => { if (code === 'Enter' || code === 'KeyE' || code === 'Space') give(); };
  }

  function renderWitchChat(layer, L, R) {
    L.innerHTML = `<p class="desc">Belladonna is stirring something that is either soup or a curse. She seems happy to talk while she works.</p>
      <div class="actions"><button class="pbtn plum" id="chat">Ask her something</button></div>`;
    G.heard = G.heard || [];
    const paint = () => { R.innerHTML = '<div class="lbl">Things she has told you</div>' + (G.heard.length ? G.heard.slice(-5).map(t => '<p class="heard-line">“' + esc(t) + '”</p>').join('') : '<p class="muted">Nothing yet.</p>'); };
    const chat = () => {
      const pool = FH.LINES.witchChat.filter(t => !G.heard.includes(t));
      const t = pickLine(pool.length ? pool : FH.LINES.witchChat);
      if (!G.heard.includes(t)) G.heard.push(t);
      layer.say(t, Math.random() < 0.5 ? 'open' : 'lidded');
      sfx('blip');
      paint();
    };
    $('#chat', L).onclick = chat;
    layer.keys = (code) => { if (code === 'Enter' || code === 'KeyE' || code === 'Space') chat(); };
    paint();
  }

  // 15 basket slots in a 5x3 grid
  function slotsHTML(basket, sel) {
    let h = '';
    for (let i = 0; i < FH.BASKET_MAX; i++) {
      const it = basket[i];
      const v = it && FH.itemView(it);
      h += '<button class="slot ' + (i === sel ? 'sel ' : '') + (it ? 'filled ' : '') + (v && v.toxicKnown ? 'toxic' : '') + '" data-i="' + i + '" title="' + (v ? esc(v.name) : '') + '">' +
        (it ? itemImg(v.sprite, 3) + (v.toxicKnown ? '<span class="skull">' + iconImg('skull', 2) + '</span>' : '') : '') + '</button>';
    }
    return h;
  }
  function moveSlot(sel, code) {
    const cols = 5;
    if (code === 'ArrowLeft' || code === 'KeyA') return (sel + FH.BASKET_MAX - 1) % FH.BASKET_MAX;
    if (code === 'ArrowRight' || code === 'KeyD') return (sel + 1) % FH.BASKET_MAX;
    if (code === 'ArrowUp' || code === 'KeyW') return (sel + FH.BASKET_MAX - cols) % FH.BASKET_MAX;
    if (code === 'ArrowDown' || code === 'KeyS') return (sel + cols) % FH.BASKET_MAX;
    return null;
  }

  // ---------- the basket book ----------
  UI.openBook = function (tab) {
    const box = bookShell({ tabs: [['basket', 'Basket'], ['journal', 'Journal'], ['status', 'Status']] });
    const layer = { el: box, tab: tab || 'basket', sel: 0 };
    const tabs = ['basket', 'journal', 'status'];
    const titles = { basket: 'Your Basket', journal: 'Journal', status: FH.CHARACTERS[G.player.who].name };
    const render = () => {
      box.querySelectorAll('.btab').forEach(b => b.classList.toggle('on', b.dataset.t === layer.tab));
      $('.book-title', box).textContent = titles[layer.tab];
      const L = $('.page.left', box), R = $('.page.right', box);
      if (layer.tab === 'basket') renderBasket(layer, L, R);
      else if (layer.tab === 'journal') renderJournal(layer, L, R);
      else renderStatus(layer, L, R);
    };
    const setTab = (t) => { layer.tab = t; sfx('page'); render(); };
    box.querySelectorAll('.btab').forEach(b => { b.onclick = () => setTab(b.dataset.t); });
    $('.close-x', box).onclick = () => { sfx('back'); UI.pop(layer); };
    layer.onKey = (code) => {
      if (code === 'Escape' || code === 'KeyB' || code === 'KeyI' || code === 'KeyJ') { sfx('back'); UI.pop(layer); return; }
      const ti = tabs.indexOf(layer.tab);
      if (code === 'BracketLeft' || code === 'KeyQ') return setTab(tabs[(ti + tabs.length - 1) % tabs.length]);
      if (code === 'BracketRight' || code === 'Tab') return setTab(tabs[(ti + 1) % tabs.length]);
      if (layer.keys) layer.keys(code);
    };
    sfx('page');
    UI.push(layer);
    render();
  };

  function effectText(it) {
    const v = FH.itemView(it);
    const d = v.shownDef;
    if (it.id === 'murky') return v.effect ? v.effect : 'Could do anything. Good luck.';
    const parts = [];
    if (d.stam >= 999) parts.push('Fills your stamina to the top.');
    else if (d.stam > 0) parts.push('Restores ' + d.stam + ' stamina.');
    else if (d.stam < 0) parts.push('Costs ' + (-d.stam) + ' stamina.');
    if (d.hp > 0) parts.push('Mends ' + (d.hp === 1 ? 'a heart' : d.hp + ' hearts') + '.');
    if (d.hp < 0) parts.push('Costs a heart.');
    if (d.buff) parts.push('Lasts ' + d.dur + ' seconds.');
    return parts.join(' ');
  }

  function renderBasket(layer, L, R) {
    const basket = G.player.basket;
    layer.sel = Math.min(layer.sel, FH.BASKET_MAX - 1);
    L.innerHTML = `<div class="slots-board"><div class="slots">${slotsHTML(basket, layer.sel)}</div></div>
      <div class="bag-count"><span>${basket.length} of ${FH.BASKET_MAX} spaces used</span></div>
      <div class="legend"><span><b class="kbd small">E</b> eat or drink</span><span><b class="kbd small">X</b> drop</span><span><b class="kbd small">Tab</b> next page</span></div>`;
    const detail = () => {
      const it = basket[layer.sel];
      if (!it) {
        R.innerHTML = '<div class="empty-det"><div class="kraft">' + iconImg('basket', 8) + '</div><p>' + (basket.length ? 'An empty space. Room for one more thing.' : 'Nothing in here but crumbs. Go and find something.') + '</p></div>';
        return;
      }
      const v = FH.itemView(it);
      const isPotion = v.def.kind === 'Potion';
      const desc = v.toxicKnown && v.def.look ? FH.ITEMS[it.id].desc : v.desc;
      const eff = effectText(it);
      R.innerHTML = `<div class="item-card">
          <div class="ic-art kraft ${v.toxicKnown ? 'toxic' : ''}">${itemBig(v.sprite, 4)}</div>
          <div class="ic-text"><h2>${esc(v.name)}</h2>${flourish()}
            <p class="desc">${esc(desc)}</p>
            <p class="effect ${(v.shownDef.hp < 0 || v.shownDef.stam < 0) ? 'bad' : ''}">${esc(eff)}</p>
            ${v.toxicKnown ? '<p class="warn-line">' + iconImg('skull', 2) + (G.player.who === 'sage' ? ' Sage spotted it: poisonous lookalike.' : ' Poisonous.') + '</p>' : ''}
            ${v.hidden && G.player.who !== 'sage' ? '' : ''}
          </div>
        </div>
        <div class="actions center"><button class="pbtn green" id="eat">${isPotion ? 'Drink' : 'Eat'}</button><button class="pbtn pink" id="drop">Drop</button></div>`;
      $('#eat', R).onclick = eat;
      $('#drop', R).onclick = drop;
    };
    const eat = () => {
      if (!basket[layer.sel]) return;
      G.consume(layer.sel);
      if (G.mode !== 'play') { UI.pop(layer); return; }
      renderBasket(layer, L, R);
    };
    const drop = () => { if (!basket[layer.sel]) return; sfx('back'); G.dropItem(layer.sel); renderBasket(layer, L, R); };
    const mark = () => L.querySelectorAll('.slot').forEach((x, k) => x.classList.toggle('sel', k === layer.sel));
    L.querySelectorAll('.slot').forEach(s => {
      s.onclick = () => { layer.sel = +s.dataset.i; sfx('tick'); mark(); detail(); };
      s.ondblclick = eat;
    });
    layer.keys = (code) => {
      const m = moveSlot(layer.sel, code);
      if (m !== null) { layer.sel = m; sfx('tick'); mark(); detail(); return; }
      if (code === 'Enter' || code === 'KeyE' || code === 'Space') eat();
      else if (code === 'KeyX' || code === 'Delete' || code === 'Backspace') drop();
    };
    detail();
  }

  function renderJournal(layer, L, R) {
    const info = FH.story.info();
    const keys = Object.keys(G.story.keys).filter(k => G.story.keys[k] && FH.STORY.keyItems[k]);
    const keyIcon = { letter: 'pie', lantern: 'moonlantern', fernlight: 'tonic', tonic: 'tonic' };
    L.innerHTML = `<div class="story-note paper"><div class="sn-ch">${info.ch === '~' ? 'Epilogue' : 'Chapter ' + info.ch}</div><h3>${esc(info.title)}</h3><p>${esc(info.goal)}</p></div>
      <div class="lbl">Keepsakes</div>
      ${keys.length ? keys.map(k => '<div class="keepsake">' + itemImg(keyIcon[k] || 'tonic', 2) + '<div><b>' + FH.STORY.keyItems[k].name + '</b><span>' + esc(FH.STORY.keyItems[k].desc) + '</span></div></div>').join('') : '<p class="muted">Nothing yet.</p>'}`;
    const g = errandPlan('grandma'), w = errandPlan('witch');
    const errandCard = (who, pl, name) => `<div class="errand"><div class="er-head">${portrait(who, 'happy', 'mini')}<b>${name}</b></div><p class="ask">“${esc(pl.e.ask)}”</p>${pl.progress.map(p => '<div class="cost-line ' + (p.have >= p.n.n ? 'ok' : '') + '"><span>' + esc(needLabel(p.n)) + '</span><b>' + p.have + '/' + p.n.n + '</b></div>').join('')}</div>`;
    const tips = [
      ['strawberry', 'Meadow: strawberries, bilberries, crab apples, chanterelles, fiddleheads.'],
      ['nightberry', 'Dark Wood: nightberries, glowcaps and moonleaf. Wisps and brambles too.'],
      ['chanterelle', "Three kinds of forage have poisonous twins. Sage can tell. Jack-o'-lanterns glow faintly at night."],
      ['hearttonic', 'Hearts come back from potions, pie, and a rest at Hazel\'s.'],
    ];
    R.innerHTML = (G.story.step >= 2 ? '<div class="lbl">Errands</div>' + errandCard('grandma', g, 'Grandma Hazel') + (G.flags.metWitch ? errandCard('witch', w, 'Belladonna') : '') : '') +
      '<div class="lbl">Field notes</div>' + tips.map(t => '<div class="note">' + itemImg(t[0], 2) + '<span>' + esc(t[1]) + '</span></div>').join('');
    requestAnimationFrame(() => L.querySelectorAll('.paper').forEach(n => UI.tear(n, 5)));
    layer.keys = null;
  }

  function renderStatus(layer, L, R) {
    const p = G.player, c = FH.CHARACTERS[p.who];
    L.innerHTML = `<div class="status-left"><div class="big-por">${portrait(p.who, 'open')}</div><h2>${c.name}</h2><div class="subtitle">${c.title}</div><p class="desc">${esc(c.blurb)}</p></div>`;
    R.innerHTML = `
      <div class="abil"><div class="lbl">Ability · press Q</div><b>${esc(c.ability.name)}</b><p>${esc(c.ability.text)}</p></div>
      <div class="abil"><div class="lbl">Passive</div><b>${esc(c.passive.name)}</b><p>${esc(c.passive.text)}</p></div>
      <div class="stats">
        <div><span>Day</span><b>${G.day}</b></div><div><span>Gathered</span><b>${G.stats.gathered}</b></div>
        <div><span>Eaten</span><b>${G.stats.eaten}</b></div><div><span>Brewed</span><b>${G.stats.brewed}</b></div>
        <div><span>Trades</span><b>${G.stats.traded}</b></div><div><span>Errands</span><b>${G.stats.errands}</b></div>
      </div>`;
    layer.keys = null;
  }

  // ---------- title / select / pause / game over ----------
  UI.title = function () {
    UI.clear();
    $('#hud').classList.add('hidden');
    const hasSave = G.hasSave();
    const box = el(`<div class="layer title-layer">
      <div class="title-wrap">
        <div class="logo">
          ${vines()}
          <div class="logo-board">
            <div class="logo-small">a cozy forest story</div>
            <h1>Fernlight Hollow</h1>
            ${flourish()}
          </div>
        </div>
        <div class="menu">
          ${hasSave ? '<button class="wbtn" data-a="continue">Continue</button>' : ''}
          <button class="wbtn" data-a="new">New game</button>
          <button class="wbtn" data-a="help">How to play</button>
          <button class="wbtn small" data-a="sound">Music: <b>${FH.audio.musicOn ? 'on' : 'off'}</b></button>
        </div>
      </div>
      <div class="title-foot">Forage, brew, and bring the colour back to Hazel's garden.</div></div>`);
    const layer = { el: box, sel: 0 };
    const btns = () => Array.from(box.querySelectorAll('.menu .wbtn'));
    const mark = () => btns().forEach((b, i) => b.classList.toggle('sel', i === layer.sel));
    const act = (a) => {
      FH.audio.start();
      sfx('select');
      if (a === 'new') { UI.pop(layer); UI.select(); }
      else if (a === 'continue') { UI.pop(layer); if (G.load()) UI.startPlay(true); else UI.select(); }
      else if (a === 'help') UI.help();
      else if (a === 'sound') { FH.audio.setMusic(!FH.audio.musicOn); box.querySelector('[data-a=sound] b').textContent = FH.audio.musicOn ? 'on' : 'off'; }
    };
    btns().forEach((b, i) => { b.onclick = () => act(b.dataset.a); b.onmouseenter = () => { layer.sel = i; mark(); }; });
    layer.onKey = (code) => {
      FH.audio.start();
      const n = btns().length;
      if (code === 'ArrowUp' || code === 'KeyW') { layer.sel = (layer.sel + n - 1) % n; sfx('tick'); mark(); }
      else if (code === 'ArrowDown' || code === 'KeyS') { layer.sel = (layer.sel + 1) % n; sfx('tick'); mark(); }
      else if (code === 'Enter' || code === 'Space' || code === 'KeyE') act(btns()[layer.sel].dataset.a);
    };
    G.mode = 'title';
    UI.push(layer);
    G.paused = false;
    mark();
  };

  UI.help = function () {
    const box = el(`<div class="layer modal-layer"><div class="modal">
      <div class="modal-title plaque">How to Play</div>
      <div class="modal-body">
        <div class="help-grid">
          <div><span class="kbd">WASD</span><span class="kbd">← ↑ → ↓</span></div><p>Walk. Hold <span class="kbd small">Shift</span> to run, which uses stamina faster.</p>
          <div><span class="kbd">E</span><span class="kbd">Space</span></div><p>Pick things up, harvest, talk, read.</p>
          <div><span class="kbd">B</span><span class="kbd">J</span></div><p>Basket (15 spaces) and Journal. The gold arrow points to your next goal.</p>
          <div><span class="kbd">Q</span></div><p>Your character's ability.</p>
          <div><span class="kbd">Esc</span></div><p>Pause.</p>
        </div>
        <ul class="help-list">
          <li>${iconImg('heart', 2)}<span>You have <b>three hearts</b>. Lose them all and you start over.</span></li>
          <li>${iconImg('bolt', 2)}<span><b>Stamina</b> drains as you walk. At zero you slow down and lose hearts. Eat.</span></li>
          <li>${iconImg('skull', 2)}<span>Some berries and mushrooms are <b>poisonous lookalikes</b>.</span></li>
          <li>${itemImg('carrot', 2)}<span><b>Grandma Hazel</b> lives east. <b>Belladonna</b> brews potions in the Dark Wood, west.</span></li>
        </ul>
      </div>
      <div class="actions center"><button class="pbtn green" id="ok">Got it</button></div>
    </div></div>`);
    const layer = { el: box };
    $('#ok', box).onclick = () => { sfx('back'); UI.pop(layer); };
    layer.onKey = (code) => { if (['Escape', 'Enter', 'Space', 'KeyE'].includes(code)) { sfx('back'); UI.pop(layer); } };
    UI.push(layer);
  };

  UI.select = function () {
    G.mode = 'select';
    const order = ['draco', 'sage', 'willow'];
    const box = el(`<div class="layer select-layer">
      <div class="select-h plaque">Who walks into the woods?</div>
      <div class="cards">${order.map(id => {
        const c = FH.CHARACTERS[id];
        const pips = (v, max) => { let s = ''; for (let k = 0; k < 5; k++) s += '<i class="' + (k < Math.round(v / max * 5) ? 'on' : '') + '"></i>'; return '<span class="pips">' + s + '</span>'; };
        return `<button class="card" data-id="${id}">
          <div class="card-frame">${portrait(id, 'open')}<div class="card-walk">${img(FH.charSprite(id, 'down', 0), 3, 'walk-' + id)}</div></div>
          <div class="card-body">
            <h3>${c.name}</h3><div class="subtitle">${c.title}</div>
            <p class="blurb">${esc(c.blurb)}</p>
            <div class="statrow"><span>Stamina</span>${pips(c.maxStam, 120)}</div>
            <div class="statrow"><span>Speed</span>${pips(c.speed, 1.1)}</div>
            <div class="abil"><div class="lbl">Ability · Q</div><b>${esc(c.ability.name)}</b><p>${esc(c.ability.text)}</p></div>
            <div class="abil"><div class="lbl">Passive</div><b>${esc(c.passive.name)}</b><p>${esc(c.passive.text)}</p></div>
          </div>
        </button>`;
      }).join('')}</div>
      <div class="select-foot"><span class="kbd">←</span><span class="kbd">→</span> choose · <span class="kbd">Enter</span> begin · <span class="kbd">Esc</span> back</div>
    </div>`);
    const layer = { el: box, sel: 1 };
    const cards = Array.from(box.querySelectorAll('.card'));
    const mark = () => cards.forEach((c, i) => c.classList.toggle('sel', i === layer.sel));
    const go = () => {
      sfx('select');
      const who = order[layer.sel];
      UI.pop(layer);
      G.newGame(who);
      UI.startPlay(false);
    };
    cards.forEach((c, i) => {
      c.onclick = () => { if (layer.sel === i) go(); else { layer.sel = i; sfx('tick'); mark(); } };
      c.onmouseenter = () => { if (layer.sel !== i) { layer.sel = i; sfx('tick'); mark(); } };
    });
    layer.onKey = (code) => {
      if (code === 'ArrowLeft' || code === 'KeyA') { layer.sel = (layer.sel + 2) % 3; sfx('tick'); mark(); }
      else if (code === 'ArrowRight' || code === 'KeyD') { layer.sel = (layer.sel + 1) % 3; sfx('tick'); mark(); }
      else if (code === 'Enter' || code === 'Space' || code === 'KeyE') go();
      else if (code === 'Escape') { sfx('back'); UI.pop(layer); UI.title(); }
    };
    UI.push(layer);
    G.paused = false;
    mark();
  };

  UI.startPlay = function (resumed) {
    G.mode = 'play';
    UI.resetHudCache();
    $('#hud').classList.remove('hidden');
    UI.buildHud();
    UI.hud(true);
    if (resumed) {
      UI.toast('Welcome back. Day ' + G.day + ', ' + FH.clockText() + '.', 'good');
      return;
    }
    FH.story.prologue();
  };

  UI.pause = function () {
    const box = el(`<div class="layer modal-layer"><div class="modal pause">
      <div class="modal-title plaque">Paused</div>
      <div class="menu">
        <button class="wbtn" data-a="resume">Resume</button>
        <button class="wbtn" data-a="help">How to play</button>
        <button class="wbtn small" data-a="music">Music: <b>${FH.audio.musicOn ? 'on' : 'off'}</b></button>
        <button class="wbtn small" data-a="sfx">Sounds: <b>${FH.audio.sfxOn ? 'on' : 'off'}</b></button>
        <button class="wbtn small" data-a="quit">Save and quit</button>
      </div>
      <p class="hint center">The game saves itself as you play.</p>
    </div></div>`);
    const layer = { el: box, sel: 0 };
    const btns = () => Array.from(box.querySelectorAll('.menu .wbtn'));
    const mark = () => btns().forEach((b, i) => b.classList.toggle('sel', i === layer.sel));
    const act = (a) => {
      sfx('select');
      if (a === 'resume') UI.pop(layer);
      else if (a === 'help') UI.help();
      else if (a === 'music') { FH.audio.setMusic(!FH.audio.musicOn); box.querySelector('[data-a=music] b').textContent = FH.audio.musicOn ? 'on' : 'off'; }
      else if (a === 'sfx') { FH.audio.setSfx(!FH.audio.sfxOn); box.querySelector('[data-a=sfx] b').textContent = FH.audio.sfxOn ? 'on' : 'off'; }
      else if (a === 'quit') { G.save(); UI.title(); }
    };
    btns().forEach((b, i) => { b.onclick = () => act(b.dataset.a); b.onmouseenter = () => { layer.sel = i; mark(); }; });
    layer.onKey = (code) => {
      const n = btns().length;
      if (code === 'Escape') { sfx('back'); UI.pop(layer); }
      else if (code === 'ArrowUp' || code === 'KeyW') { layer.sel = (layer.sel + n - 1) % n; sfx('tick'); mark(); }
      else if (code === 'ArrowDown' || code === 'KeyS') { layer.sel = (layer.sel + 1) % n; sfx('tick'); mark(); }
      else if (code === 'Enter' || code === 'Space' || code === 'KeyE') act(btns()[layer.sel].dataset.a);
    };
    UI.push(layer);
    mark();
  };

  UI.gameOver = function (cause) {
    UI.clear();
    const why = {
      poison: 'Something you ate disagreed with you. Strongly.',
      bramble: 'The brambles won this one.',
      wisp: 'A wisp got its hug in. It was very, very cold.',
      hunger: 'You ran out of steam somewhere between one tree and the next.',
    }[cause] || 'The forest goes quiet.';
    const p = G.player;
    const box = el(`<div class="layer over-layer"><div class="over">
      <div class="over-por">${portrait(p.who, 'open')}</div>
      <h2>The forest goes quiet.</h2>
      <p class="why">${esc(why)}</p>
      <p class="sub">You wake at the edge of the meadow with an empty basket and a headache. Hazel will have heard about this.</p>
      <div class="stats">
        <div><span>Days</span><b>${G.day}</b></div><div><span>Gathered</span><b>${G.stats.gathered}</b></div><div><span>Brewed</span><b>${G.stats.brewed}</b></div><div><span>Errands</span><b>${G.stats.errands}</b></div>
      </div>
      <div class="menu row"><button class="pbtn green" data-a="again">Start over</button><button class="pbtn" data-a="title">Title</button></div>
    </div></div>`);
    const layer = { el: box, sel: 0 };
    const btns = Array.from(box.querySelectorAll('.pbtn'));
    const mark = () => btns.forEach((b, i) => b.classList.toggle('sel', i === layer.sel));
    const act = (a) => { sfx('select'); if (a === 'again') { UI.pop(layer); $('#hud').classList.add('hidden'); UI.select(); } else UI.title(); };
    btns.forEach((b, i) => { b.onclick = () => act(b.dataset.a); b.onmouseenter = () => { layer.sel = i; mark(); }; });
    layer.onKey = (code) => {
      if (code === 'ArrowLeft' || code === 'ArrowRight' || code === 'KeyA' || code === 'KeyD') { layer.sel = 1 - layer.sel; sfx('tick'); mark(); }
      else if (code === 'Enter' || code === 'Space' || code === 'KeyE') act(btns[layer.sel].dataset.a);
    };
    UI.push(layer);
    mark();
  };
})(window.FH);
