// Everything drawn in the DOM: HUD, dialogue, the basket book, the witch's table,
// title, character select, pause and game over. Panels sit on a layer stack;
// the top layer gets the keyboard.
(function (FH) {
  'use strict';

  const G = FH.game;
  const UI = FH.ui = { layers: [] };
  const $ = (sel, root) => (root || document).querySelector(sel);
  const el = (html) => { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstElementChild; };
  const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sfx = (n) => FH.audio.sfx(n);

  const NAMES = { draco: 'Draco', sage: 'Sage', willow: 'Willow', grandma: 'Grandma Hazel', witch: 'Belladonna' };

  function img(canvas, scale, key, cls) {
    return '<img class="px ' + (cls || '') + '" src="' + FH.spriteURL(canvas, scale, key) + '" width="' + canvas.width * scale + '" height="' + canvas.height * scale + '" alt="">';
  }
  const itemImg = (id, s, cls) => img(FH.itemSprite(id), s, 'item-' + id, cls);
  const iconImg = (n, s, cls) => img(FH.icon(n), s, 'icon-' + n, cls);
  const portraitImg = (who, mood, s, cls) => img(FH.portrait(who, mood), s, 'por-' + who + '-' + (mood || 'open'), cls);
  UI.itemImg = itemImg; UI.iconImg = iconImg;

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
    setTimeout(() => L.el.remove(), 160);
    if (L.onClose) L.onClose();
    G.paused = UI.layers.length > 0;
    document.body.classList.toggle('layer-open', G.paused);
    UI.hud();
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
      <div class="hud-left panel slim">
        <div class="hearts" id="hud-hearts"></div>
        <div class="stam-row"><span class="ico">${iconImg('bolt', 3)}</span><div class="bar"><div class="fill" id="hud-stam"></div><div class="ticks"></div></div></div>
        <div class="bag-row"><span class="ico">${iconImg('basket', 3)}</span><span id="hud-bag">0 / 15</span><span class="kbd small">B</span></div>
      </div>
      <div class="hud-clock wood">
        <div class="clock-inner">
          <span class="clock-ico" id="hud-sky"></span>
          <div><div class="clock-time" id="hud-time">08:00 AM</div><div class="clock-day" id="hud-day">DAY 1</div></div>
        </div>
        <div class="zone" id="hud-zone">Fernlight Meadow</div>
      </div>
      <div class="hud-ability" id="hud-ability"></div>
      <div class="hud-buffs" id="hud-buffs"></div>
      <div class="hud-keys">
        <span><b class="kbd">E</b> interact</span><span><b class="kbd">Q</b> ability</span><span><b class="kbd">B</b> basket</span><span><b class="kbd">Shift</b> run</span><span><b class="kbd">Esc</b> pause</span>
      </div>`;
  };

  let hudCache = {};
  UI.hud = function () {
    if (G.mode !== 'play' && G.mode !== 'over') return;
    const p = G.player;
    if (!p) return;
    const hearts = p.hearts + '|' + FH.MAX_HEARTS;
    if (hudCache.hearts !== hearts) {
      hudCache.hearts = hearts;
      let h = '';
      for (let i = 0; i < FH.MAX_HEARTS; i++) h += '<span class="heart ' + (i < p.hearts ? 'full' : 'empty') + '">' + iconImg(i < p.hearts ? 'heart' : 'heartEmpty', 3) + '</span>';
      $('#hud-hearts').innerHTML = h;
      $('#hud-hearts').classList.remove('bump'); void $('#hud-hearts').offsetWidth; $('#hud-hearts').classList.add('bump');
    }
    const st = $('#hud-stam');
    const pct = Math.round(p.stam / p.maxStam * 100);
    st.style.width = pct + '%';
    st.classList.toggle('low', pct < 25);
    st.classList.toggle('empty', pct <= 0);
    $('#hud-bag').textContent = p.basket.length + ' / ' + FH.BASKET_MAX;
    $('#hud-bag').classList.toggle('full', p.basket.length >= FH.BASKET_MAX);
    $('#hud-time').textContent = FH.clockText();
    $('#hud-day').textContent = 'DAY ' + G.day;
    const sky = FH.isNight() ? 'moon' : 'sun';
    if (hudCache.sky !== sky) { hudCache.sky = sky; $('#hud-sky').innerHTML = iconImg(sky, 4); }
    const zone = G.zoneName();
    if (hudCache.zone !== zone) {
      hudCache.zone = zone; $('#hud-zone').textContent = zone;
      $('#hud-clock-zone-dark');
      document.body.classList.toggle('in-dark', zone === 'The Dark Wood' || zone === "Belladonna's Den");
    }
    // ability card
    const c = FH.CHARACTERS[p.who];
    if (hudCache.who !== p.who) {
      hudCache.who = p.who;
      $('#hud-ability').innerHTML = `<div class="ab-face wood">${portraitImg(p.who, 'open', 2, 'face')}<div class="cd" id="hud-cd"></div><span class="kbd ab-key">Q</span></div>
        <div class="ab-text"><div class="ab-name">${esc(c.ability.name)}</div><div class="ab-state" id="hud-cdtext">Ready</div></div>`;
    }
    const cdPct = p.cd > 0 ? p.cd / c.ability.cooldown : 0;
    $('#hud-cd').style.setProperty('--cd', (cdPct * 360) + 'deg');
    $('#hud-cd').classList.toggle('on', p.cd > 0);
    $('#hud-cdtext').textContent = p.cd > 0 ? Math.ceil(p.cd) + 's' : 'Ready';
    $('#hud-cdtext').classList.toggle('ready', p.cd <= 0);
    // buffs
    const names = { swift: ["Hare's Step", 'swift'], owl: ["Owl's Eye", 'owl'], thorn: ['Thornward', 'thorn'], hiccup: ['Hiccups', 'murky'] };
    let b = '';
    Object.keys(p.buffs).forEach(k => { if (p.buffs[k] > 0) b += '<div class="buff panel slim">' + itemImg(names[k][1], 2) + '<span>' + names[k][0] + '</span><b>' + Math.ceil(p.buffs[k]) + 's</b></div>'; });
    if (p.stam <= 0) b += '<div class="buff panel slim warn">' + iconImg('bolt', 2) + '<span>Exhausted</span><b>eat!</b></div>';
    if (hudCache.buffs !== b) { hudCache.buffs = b; $('#hud-buffs').innerHTML = b; }
  };
  UI.resetHudCache = () => { hudCache = {}; };

  // floating prompt and speech bubble, following the world
  let barkState = null, promptTop = null;
  UI.bark = function (text, force) {
    if (barkState && !force && barkState.t > 0) return;
    barkState = { text, t: Math.min(6, 2 + text.length / 22) };
    const b = $('#bark');
    b.textContent = text;
    b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
  };
  UI.frame = function (dt) {
    if (G.mode !== 'play') { $('#prompt').classList.remove('show'); $('#bark').classList.remove('show'); return; }
    const p = G.player;
    // prompt
    const pr = $('#prompt');
    if (G.prompt && !G.paused) {
      const target = G.prompt.ref && G.prompt.ref.x !== undefined ? G.prompt.ref : (G.prompt.kind === 'cauldron' ? G.world.cauldron : p);
      const s = G.worldToScreen(target.x, target.y - (G.prompt.kind === 'npc' ? 34 : 18));
      promptTop = s.y - pr.offsetHeight;
      pr.style.transform = 'translate(' + Math.round(s.x) + 'px,' + Math.round(s.y) + 'px) translate(-50%,-100%)';
      if (pr.dataset.label !== G.prompt.label) { pr.dataset.label = G.prompt.label; pr.innerHTML = '<span class="kbd">E</span>' + esc(G.prompt.label); }
      pr.classList.add('show');
    } else { pr.classList.remove('show'); promptTop = null; }
    // bark, lifted clear of the prompt when both are up
    const b = $('#bark');
    if (barkState) {
      barkState.t -= dt;
      const s = G.worldToScreen(p.x, p.y - 26);
      if (promptTop !== null) s.y = Math.min(s.y, promptTop - 10);
      b.style.transform = 'translate(' + Math.round(s.x) + 'px,' + Math.round(s.y) + 'px) translate(-50%,-100%)';
      if (barkState.t <= 0 || G.paused) { b.classList.remove('show'); if (barkState.t <= 0) barkState = null; }
      else b.classList.add('show');
    }
    UI.hud();
  };

  UI.toast = function (text, kind, itemId) {
    if (!text) return;
    const box = $('#toasts');
    const t = el('<div class="toast panel slim ' + (kind || '') + '">' + (itemId ? itemImg(itemId, 2) : '') + '<span>' + esc(text) + '</span></div>');
    box.appendChild(t);
    while (box.children.length > 5) box.firstChild.remove();
    setTimeout(() => t.classList.add('out'), 2600);
    setTimeout(() => t.remove(), 3100);
  };

  // ---------- dialogue ----------
  UI.say = function (lines, onDone) {
    let i = 0, shown = 0, full = '', timer = null, choiceIdx = 0;
    const box = el(`<div class="layer dialog-layer">
      <div class="dialog">
        <div class="dlg-portrait wood"><div class="por"></div><div class="nameplate"></div></div>
        <div class="dlg-body panel"><div class="dlg-text"></div><div class="dlg-more">▼</div></div>
        <div class="dlg-choices panel"></div>
      </div></div>`);
    const layer = { el: box };
    const textEl = $('.dlg-text', box), more = $('.dlg-more', box), choicesEl = $('.dlg-choices', box);
    const show = () => {
      const L = lines[i];
      const who = L.who;
      const por = $('.dlg-portrait', box);
      if (who) {
        por.style.display = '';
        $('.por', box).innerHTML = portraitImg(who, L.mood || 'open', 4);
        $('.nameplate', box).textContent = NAMES[who] || who;
        $('.nameplate', box).style.setProperty('--tag', who === 'witch' ? '#4d3674' : who === 'grandma' ? '#4b6a34' : (FH.CHARACTERS[who] ? '#6b4428' : '#6b4428'));
        box.querySelector('.dialog').classList.remove('narrator');
      } else {
        por.style.display = 'none';
        box.querySelector('.dialog').classList.add('narrator');
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
    show();
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

  // errand matching
  function needMatches(need, it, strict) {
    const d = FH.ITEMS[it.id];
    if (d.kind === 'Potion') return false;
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
  const pickLine = (arr) => arr[Math.floor(Math.random() * arr.length)];
  UI.talkGrandma = function () {
    if (!G.flags.metGrandma) {
      G.flags.metGrandma = true;
      UI.say(FH.LINES.grandmaFirst.map(([mood, text]) => ({ who: 'grandma', mood, text })), () => UI.grandmaMenu());
      return;
    }
    UI.grandmaMenu();
  };
  UI.grandmaMenu = function (greet) {
    const h = FH.hour();
    const hello = greet || (h < 11 ? 'Morning, love. What can I do for you?' : h < 17 ? 'Afternoon, dear. You look peaky. Everything all right?' : "Evening. Mind the step, I can't see it either.");
    UI.say([{ who: 'grandma', mood: 'happy', text: hello, choices: [
      { label: 'Just chatting', fn: () => UI.say([{ who: 'grandma', mood: Math.random() < 0.5 ? 'happy' : 'open', text: pickLine(FH.LINES.grandmaChat) }], () => UI.grandmaMenu('Anything else?')) },
      { label: 'About that errand…', fn: () => UI.grandmaErrand() },
      { label: 'Any vegetables to spare?', fn: () => UI.grandmaVeg() },
      { label: 'Could I rest by the stove?', fn: () => UI.grandmaRest() },
      { label: 'Goodbye', fn: () => UI.say([{ who: 'grandma', mood: 'happy', text: pickLine(['Off you go. Eat something green.', 'Bye, love. Mind the brambles.', "Come back before dark. Or after. I'm always up."]) }]) },
    ] }]);
  };
  UI.grandmaErrand = function () {
    const pl = errandPlan('grandma');
    const needStr = pl.e.need.map(needLabel).join(', ');
    if (pl.fakes.length && !pl.ok) {
      // she catches the lookalikes
      removeIdx(pl.fakes.map(o => o.i));
      UI.hud();
      UI.say([{ who: 'grandma', mood: 'open', text: FH.LINES.grandmaPoison }, { who: 'grandma', mood: 'happy', text: 'Still after: ' + needStr + '. No rush.' }], () => UI.grandmaMenu('Anything else?'));
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
    UI.say([{ who: 'grandma', mood: 'open', text: pl.e.ask }, { who: null, text: 'Errand: ' + needStr + '. You have ' + pl.progress.map(p => p.have + '/' + p.n.n).join(', ') + '.' }], () => UI.grandmaMenu('Anything else?'));
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
    UI.say([{ who: 'grandma', mood: 'happy', text: pickLine(FH.LINES.grandmaVeg) + extra }, { who: null, text: 'You got ' + got.join(', ') + '.' }], () => UI.grandmaMenu('Anything else?'));
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
          // sleep through to the next morning
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
      mid && mid();
      setTimeout(() => { f.classList.remove('on'); G.paused = UI.layers.length > 0; setTimeout(() => after && after(), 500); }, 1400);
    }, 700);
  };

  // ---------- Witch ----------
  UI.talkWitch = function () {
    if (!G.flags.metWitch) {
      G.flags.metWitch = true;
      UI.say(FH.LINES.witchFirst.map(([mood, text]) => ({ who: 'witch', mood, text })), () => UI.openWitch('trade'));
      return;
    }
    UI.openWitch('trade');
  };

  UI.openWitch = function (tab) {
    const box = el(`<div class="layer book-layer">
      <div class="book witch-book">
        <div class="tabs"><button class="tab" data-t="trade">Trade</button><button class="tab" data-t="cauldron">Cauldron</button><button class="tab" data-t="errand">Errand</button><button class="tab" data-t="chat">Chat</button><button class="close" title="Close (Esc)">✕</button></div>
        <div class="witch-head"><div class="wh-por wood"></div><div class="wh-say panel slim"></div></div>
        <div class="pages"></div>
      </div></div>`);
    const layer = { el: box, tab: tab || 'trade', sel: 0, pot: [], roll: Math.random() };
    const say = (t, mood) => {
      $('.wh-say', box).textContent = t;
      $('.wh-por', box).innerHTML = portraitImg('witch', mood || 'lidded', 2);
    };
    layer.say = say;
    const render = () => {
      box.querySelectorAll('.tab').forEach(b => b.classList.toggle('on', b.dataset.t === layer.tab));
      const pages = $('.pages', box);
      if (layer.tab === 'trade') renderTrade(layer, pages);
      else if (layer.tab === 'cauldron') renderCauldron(layer, pages);
      else if (layer.tab === 'errand') renderWitchErrand(layer, pages);
      else renderWitchChat(layer, pages);
    };
    layer.render = render;
    const tabs = ['trade', 'cauldron', 'errand', 'chat'];
    const setTab = (t) => { layer.tab = t; layer.sel = 0; layer.pot = []; sfx('page'); render(); };
    box.querySelectorAll('.tab').forEach(b => { b.onclick = () => setTab(b.dataset.t); });
    $('.close', box).onclick = () => { sfx('back'); UI.pop(layer); };
    layer.onKey = (code) => {
      if (code === 'Escape' || code === 'KeyB') { sfx('back'); UI.pop(layer); return; }
      const ti = tabs.indexOf(layer.tab);
      if (code === 'BracketLeft' || code === 'KeyQ') return setTab(tabs[(ti + tabs.length - 1) % tabs.length]);
      if (code === 'BracketRight' || code === 'Tab') return setTab(tabs[(ti + 1) % tabs.length]);
      if (layer.keys) layer.keys(code);
    };
    say(tab === 'cauldron' ? 'Help yourself. If it explodes, it was your idea.' : pickLine(['What do you want, petal?', "Back again. I'd say I'm surprised.", 'Shop is open. Mostly.', 'Mind the cat. There is no cat. Mind it anyway.']), 'open');
    UI.push(layer);
    render();
  };

  function renderTrade(layer, pages) {
    const trades = FH.TRADES;
    layer.sel = Math.min(layer.sel, trades.length - 1);
    const isWillow = G.player.who === 'willow';
    pages.innerHTML = `<div class="page left"><h3 class="page-h">Bottles on the shelf</h3><div class="trade-list">${trades.map((tr, i) => {
      const cost = UI.discounted(tr.cost);
      const ok = !!UI.payPlan(cost);
      return `<button class="trade-row ${i === layer.sel ? 'sel' : ''} ${ok ? '' : 'poor'}" data-i="${i}">${itemImg(tr.id, 3)}<span class="tr-name">${esc(FH.ITEMS[tr.id].name)}</span><span class="tr-cost">${isWillow ? '<s>' + costText(tr.cost) + '</s> ' : ''}${costText(cost)}</span></button>`;
    }).join('')}</div><p class="hint">The witch takes payment from your basket, oddest things first. ${isWillow ? '<b class="willow">Willow’s Sweet Talk: one ingredient off.</b>' : ''}</p></div>
      <div class="page right"></div>`;
    const right = $('.page.right', pages);
    const detail = () => {
      const tr = trades[layer.sel];
      const d = FH.ITEMS[tr.id];
      const cost = UI.discounted(tr.cost);
      const plan = UI.payPlan(cost);
      const recommended = G.player.who === 'draco' && G.dracoAdvice().includes(d.name);
      right.innerHTML = `<div class="detail">
        <div class="det-top"><div class="det-icon slot big">${itemImg(tr.id, 5)}</div><div><h2>${esc(d.name)}</h2><span class="chip potion">Potion</span>${recommended ? '<span class="chip draco">Draco recommends</span>' : ''}</div></div>
        <p class="desc">${esc(d.desc)}</p>
        <div class="cost-box"><div class="lbl">She wants</div>${cost.map(c => {
          const have = G.player.basket.filter(it => FH.ITEMS[it.id].tags.includes(c.tag) && FH.ITEMS[it.id].kind !== 'Potion').length;
          return '<div class="cost-line ' + (have >= c.n ? 'ok' : '') + '"><span>' + c.n + ' ' + (c.n === 1 ? FH.SINGULAR[c.tag] : FH.TAG_NAMES[c.tag]) + '</span><b>' + Math.min(have, c.n) + '/' + c.n + '</b></div>';
        }).join('')}</div>
        ${plan ? '<div class="pay-preview"><div class="lbl">You would hand over</div><div class="pay-items">' + plan.map(i => { const v = FH.itemView(G.player.basket[i]); return '<span title="' + esc(v.name) + '">' + itemImg(v.sprite, 2) + '</span>'; }).join('') + '</div></div>' : ''}
        <div class="actions"><button class="btn green" id="do-trade" ${plan ? '' : 'disabled'}>Trade <span class="kbd small">E</span></button></div>
      </div>`;
      $('#do-trade', right).onclick = () => doTrade();
    };
    const doTrade = () => {
      const tr = trades[layer.sel];
      const cost = UI.discounted(tr.cost);
      const plan = UI.payPlan(cost);
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
    pages.querySelectorAll('.trade-row').forEach(b => {
      b.onclick = () => { layer.sel = +b.dataset.i; sfx('tick'); pages.querySelectorAll('.trade-row').forEach((x, k) => x.classList.toggle('sel', k === layer.sel)); detail(); };
      b.ondblclick = () => doTrade();
    });
    layer.keys = (code) => {
      if (code === 'ArrowUp' || code === 'KeyW') layer.sel = (layer.sel + trades.length - 1) % trades.length;
      else if (code === 'ArrowDown' || code === 'KeyS') layer.sel = (layer.sel + 1) % trades.length;
      else if (code === 'Enter' || code === 'KeyE' || code === 'Space') return doTrade();
      else return;
      sfx('tick');
      pages.querySelectorAll('.trade-row').forEach((x, k) => x.classList.toggle('sel', k === layer.sel));
      detail();
    };
    detail();
  }

  function renderCauldron(layer, pages) {
    const basket = G.player.basket;
    layer.pot = layer.pot.filter(i => i < basket.length);
    layer.sel = Math.min(layer.sel, Math.max(0, FH.BASKET_MAX - 1));
    const potItems = layer.pot.map(i => basket[i]);
    const result = potItems.length === 3 ? FH.brewResult(potItems, layer.roll) : null;
    const isDraco = G.player.who === 'draco';
    let preview;
    if (potItems.length < 3) preview = '<span class="muted">Three ingredients. ' + (3 - potItems.length) + ' to go.</span>';
    else if (isDraco) {
      const nm = FH.ITEMS[result.id].name + (result.outcome ? ' — ' + FH.MURKY[result.outcome].text.toLowerCase() : '');
      preview = '<span class="draco-read">Draco: “That makes <b>' + esc(nm) + '</b>.”</span>';
    } else preview = '<span class="muted">The pot gurgles. No telling what it\'ll be.</span>';
    const known = FH.RECIPE_HINTS.filter(r => G.known[r[0]] || isDraco);
    pages.innerHTML = `<div class="page left"><h3 class="page-h">Your basket <small>click to add or take out</small></h3>
      <div class="slots">${slotsHTML(basket, layer.sel, layer.pot)}</div>
      <p class="hint">Poison makes a Bitter Hex. One bad ingredient usually turns a brew murky.</p></div>
      <div class="page right"><div class="cauldron-box">
        <div class="pot-slots">${[0, 1, 2].map(k => { const it = potItems[k]; return '<div class="slot pot ' + (it ? 'filled' : '') + '">' + (it ? itemImg(FH.itemView(it).sprite, 3) : '') + '</div>'; }).join('<span class="plus">+</span>')}</div>
        <div class="cauldron-art">${img(G.world.cauldron.spr.img, 5, 'cauldron')}</div>
        <div class="preview">${preview}</div>
        <div class="actions"><button class="btn" id="pot-clear" ${potItems.length ? '' : 'disabled'}>Empty pot</button><button class="btn plum" id="pot-brew" ${potItems.length === 3 ? '' : 'disabled'}>Brew <span class="kbd small">R</span></button></div>
        <div class="notes"><div class="lbl">${isDraco ? 'Draco knows these by heart' : 'Your notes'}</div>${known.length ? known.map(r => '<div class="note">' + itemImg(r[0], 2) + '<b>' + FH.ITEMS[r[0]].name + '</b> ' + r[1] + '</div>').join('') : '<div class="note muted">Nothing yet. Brew something and you\'ll write it down.</div>'}</div>
      </div></div>`;
    const toggle = (i) => {
      if (i >= basket.length) return;
      const at = layer.pot.indexOf(i);
      if (at >= 0) layer.pot.splice(at, 1);
      else if (layer.pot.length < 3) {
        if (FH.ITEMS[basket[i].id].kind === 'Potion') { sfx('deny'); layer.say("Potions in potions? That's how I lost my eyebrows.", 'wide'); return; }
        layer.pot.push(i);
      } else { sfx('deny'); return; }
      sfx('tick');
      renderCauldron(layer, pages);
    };
    const brew = () => {
      if (layer.pot.length !== 3) return;
      const items = layer.pot.map(i => basket[i]);
      const res = FH.brewResult(items, layer.roll);
      removeIdx(layer.pot.slice());
      layer.pot = [];
      layer.roll = Math.random();
      const it = G.addToBasket(res.id, res.outcome ? { outcome: res.outcome } : null);
      G.stats.brewed++;
      if (res.id !== 'murky' && res.id !== 'hex') G.known[res.id] = true;
      sfx('brew');
      const v = FH.itemView(it || { id: res.id, outcome: res.outcome });
      const lines = { hex: ['Oh, that is foul. Well done. Do not drink it.', 'wide'], murky: ['Murky. Could be anything. Isn\'t that exciting.', 'lidded'] };
      const l = lines[res.id] || ['Look at that. A proper ' + FH.ITEMS[res.id].name + '. I might have to start charging you rent.', 'happy'];
      layer.say(l[0], l[1]);
      UI.toast('Brewed ' + v.name, res.id === 'hex' ? 'bad' : 'good', v.sprite);
      UI.hud();
      renderCauldron(layer, pages);
    };
    pages.querySelectorAll('.slots .slot').forEach(s => { s.onclick = () => { layer.sel = +s.dataset.i; toggle(+s.dataset.i); }; });
    $('#pot-clear', pages).onclick = () => { layer.pot = []; sfx('back'); renderCauldron(layer, pages); };
    $('#pot-brew', pages).onclick = brew;
    layer.keys = (code) => {
      const m = moveSlot(layer.sel, code);
      if (m !== null) { layer.sel = m; sfx('tick'); renderCauldron(layer, pages); return; }
      if (code === 'Enter' || code === 'KeyE' || code === 'Space') toggle(layer.sel);
      else if (code === 'KeyR') brew();
      else if (code === 'Backspace' || code === 'KeyX') { layer.pot = []; renderCauldron(layer, pages); }
    };
  }

  function renderWitchErrand(layer, pages) {
    const pl = errandPlan('witch');
    pages.innerHTML = `<div class="page left"><h3 class="page-h">What she's after</h3><blockquote class="ask">“${esc(pl.e.ask)}”</blockquote>
      <div class="cost-box">${pl.progress.map(p => '<div class="cost-line ' + (p.have >= p.n.n ? 'ok' : '') + '"><span>' + esc(needLabel(p.n)) + '</span><b>' + p.have + '/' + p.n.n + '</b></div>').join('')}</div>
      <p class="hint">${G.player.who === 'sage' ? 'Sage can see which things are poisonous. Handy, for once.' : "Can't tell what's poisonous? Sage could. Or an Owl's Eye."}</p></div>
      <div class="page right"><div class="lbl center">She'll pay</div><div class="reward">${pl.e.reward.map(r => '<div class="rw">' + itemImg(r, 4) + '<span>' + FH.ITEMS[r].name + '</span></div>').join('')}</div>
      <div class="actions"><button class="btn plum" id="give" ${pl.ok ? '' : 'disabled'}>Hand it over <span class="kbd small">E</span></button></div>
      <p class="hint center">Errands done: ${G.stats.errands}</p></div>`;
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
      renderWitchErrand(layer, pages);
    };
    $('#give', pages).onclick = give;
    layer.keys = (code) => { if (code === 'Enter' || code === 'KeyE' || code === 'Space') give(); };
  }

  function renderWitchChat(layer, pages) {
    pages.innerHTML = `<div class="page left"><h3 class="page-h">Small talk</h3><p class="desc">Belladonna is stirring something that is either soup or a curse. She seems happy to talk while she works.</p>
      <div class="actions"><button class="btn plum" id="chat">Ask her something <span class="kbd small">E</span></button></div></div>
      <div class="page right"><h3 class="page-h">Things she has told you</h3><div class="heard" id="heard"></div></div>`;
    G.heard = G.heard || [];
    const paint = () => { $('#heard', pages).innerHTML = G.heard.length ? G.heard.slice(-6).map(t => '<p class="heard-line">“' + esc(t) + '”</p>').join('') : '<p class="muted">Nothing yet.</p>'; };
    const chat = () => {
      const pool = FH.LINES.witchChat.filter(t => !G.heard.includes(t));
      const t = pickLine(pool.length ? pool : FH.LINES.witchChat);
      if (!G.heard.includes(t)) G.heard.push(t);
      layer.say(t, Math.random() < 0.5 ? 'open' : 'lidded');
      sfx('blip');
      paint();
    };
    $('#chat', pages).onclick = chat;
    layer.keys = (code) => { if (code === 'Enter' || code === 'KeyE' || code === 'Space') chat(); };
    paint();
  }

  // 15 basket slots in a 5x3 grid
  function slotsHTML(basket, sel, marked) {
    let h = '';
    for (let i = 0; i < FH.BASKET_MAX; i++) {
      const it = basket[i];
      const v = it && FH.itemView(it);
      const inPot = marked && marked.includes(i);
      h += '<button class="slot ' + (i === sel ? 'sel ' : '') + (it ? 'filled ' : '') + (inPot ? 'inpot ' : '') + (v && v.toxicKnown ? 'toxic' : '') + '" data-i="' + i + '" title="' + (v ? esc(v.name) : '') + '">' +
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
    const box = el(`<div class="layer book-layer">
      <div class="book">
        <div class="tabs"><button class="tab" data-t="basket">Basket</button><button class="tab" data-t="journal">Journal</button><button class="tab" data-t="status">Status</button><button class="close" title="Close (Esc)">✕</button></div>
        <div class="pages"></div>
      </div></div>`);
    const layer = { el: box, tab: tab || 'basket', sel: 0 };
    const tabs = ['basket', 'journal', 'status'];
    const render = () => {
      box.querySelectorAll('.tab').forEach(b => b.classList.toggle('on', b.dataset.t === layer.tab));
      const pages = $('.pages', box);
      if (layer.tab === 'basket') renderBasket(layer, pages);
      else if (layer.tab === 'journal') renderJournal(layer, pages);
      else renderStatus(layer, pages);
    };
    const setTab = (t) => { layer.tab = t; sfx('page'); render(); };
    box.querySelectorAll('.tab').forEach(b => { b.onclick = () => setTab(b.dataset.t); });
    $('.close', box).onclick = () => { sfx('back'); UI.pop(layer); };
    layer.onKey = (code) => {
      if (code === 'Escape' || code === 'KeyB' || code === 'KeyI') { sfx('back'); UI.pop(layer); return; }
      const ti = tabs.indexOf(layer.tab);
      if (code === 'BracketLeft' || code === 'KeyQ') return setTab(tabs[(ti + tabs.length - 1) % tabs.length]);
      if (code === 'BracketRight' || code === 'Tab') return setTab(tabs[(ti + 1) % tabs.length]);
      if (layer.keys) layer.keys(code);
    };
    sfx('page');
    UI.push(layer);
    render();
  };

  function effectLines(it) {
    const v = FH.itemView(it);
    const d = v.shownDef;
    const out = [];
    if (it.id === 'murky') {
      if (v.effect) out.push(['bolt', v.effect, FH.MURKY[it.outcome].good ? 'good' : 'bad']);
      else out.push(['bolt', 'Could be anything. Good luck.', 'unk']);
      return out;
    }
    if (d.stam) out.push(['bolt', d.stam >= 999 ? 'Stamina to full' : (d.stam > 0 ? '+' : '') + d.stam + ' stamina', d.stam > 0 ? 'good' : 'bad']);
    if (d.hp) out.push([d.hp > 0 ? 'heart' : 'heartEmpty', (d.hp > 0 ? '+' : '') + d.hp + ' heart', d.hp > 0 ? 'good' : 'bad']);
    if (d.buff) out.push(['sparkle', d.dur + ' second effect', 'good']);
    if (v.hidden && G.player.who !== 'sage') out.push(['skull', 'Looks fine to you.', 'unk']);
    return out;
  }

  function bagSummary(basket) {
    if (!basket.length) return '';
    const counts = {};
    let food = 0;
    basket.forEach(it => {
      const v = FH.itemView(it);
      counts[v.shownDef.kind] = (counts[v.shownDef.kind] || 0) + 1;
      if (v.shownDef.kind !== 'Potion' && v.shownDef.stam > 0) food += v.shownDef.stam;
    });
    return Object.keys(counts).map(k => '<span>' + k + ' <b>' + counts[k] + '</b></span>').join('') + (food ? '<span>Food worth <b>~' + food + '</b> stamina</span>' : '');
  }

  function renderBasket(layer, pages) {
    const basket = G.player.basket;
    layer.sel = Math.min(layer.sel, FH.BASKET_MAX - 1);
    pages.innerHTML = `<div class="page left"><h3 class="page-h">Basket <small>${basket.length} / ${FH.BASKET_MAX}</small></h3>
      <div class="slots">${slotsHTML(basket, layer.sel)}</div>
      <div class="legend"><span><b class="kbd small">E</b> eat / drink</span><span><b class="kbd small">X</b> drop</span><span><b class="kbd small">Q</b><b class="kbd small">Tab</b> pages</span></div>
      <div class="bag-sum">${bagSummary(basket)}</div></div>
      <div class="page right" id="det"></div>`;
    const det = $('#det', pages);
    const detail = () => {
      const it = basket[layer.sel];
      if (!it) {
        det.innerHTML = '<div class="empty-det">' + iconImg('basket', 8) + '<p>' + (basket.length ? 'An empty slot. Room for one more thing.' : 'Nothing in here but crumbs. Go and find something.') + '</p></div>';
        return;
      }
      const v = FH.itemView(it);
      const isPotion = v.def.kind === 'Potion';
      det.innerHTML = `<div class="detail">
        <div class="det-top"><div class="det-icon slot big ${v.toxicKnown ? 'toxic' : ''}">${itemImg(v.sprite, 5)}</div><div><h2>${esc(v.name)}</h2><span class="chip">${esc(v.shownDef.kind)}</span>${v.toxicKnown ? '<span class="chip bad">Poisonous</span>' : ''}${v.toxicKnown && G.player.who === 'sage' ? '<span class="chip sage">Sage spotted it</span>' : ''}</div></div>
        <p class="desc">${esc(v.toxicKnown && v.def.look ? FH.ITEMS[it.id].desc : v.desc)}</p>
        <div class="effects">${effectLines(it).map(([ic, t, k]) => '<div class="eff ' + k + '">' + iconImg(ic, 2) + '<span>' + esc(t) + '</span></div>').join('')}</div>
        <div class="actions"><button class="btn green" id="eat">${isPotion ? 'Drink' : 'Eat'} <span class="kbd small">E</span></button><button class="btn" id="drop">Drop <span class="kbd small">X</span></button></div>
      </div>`;
      $('#eat', det).onclick = eat;
      $('#drop', det).onclick = drop;
    };
    const eat = () => {
      if (!basket[layer.sel]) return;
      G.consume(layer.sel);
      if (G.mode !== 'play') { UI.pop(layer); return; }
      renderBasket(layer, pages);
    };
    const drop = () => { if (!basket[layer.sel]) return; sfx('back'); G.dropItem(layer.sel); renderBasket(layer, pages); };
    pages.querySelectorAll('.slots .slot').forEach(s => {
      s.onclick = () => { layer.sel = +s.dataset.i; sfx('tick'); pages.querySelectorAll('.slots .slot').forEach((x, k) => x.classList.toggle('sel', k === layer.sel)); detail(); };
      s.ondblclick = eat;
    });
    layer.keys = (code) => {
      const m = moveSlot(layer.sel, code);
      if (m !== null) { layer.sel = m; sfx('tick'); pages.querySelectorAll('.slots .slot').forEach((x, k) => x.classList.toggle('sel', k === layer.sel)); detail(); return; }
      if (code === 'Enter' || code === 'KeyE' || code === 'Space') eat();
      else if (code === 'KeyX' || code === 'Delete' || code === 'Backspace') drop();
    };
    detail();
  }

  function renderJournal(layer, pages) {
    const g = errandPlan('grandma'), w = errandPlan('witch');
    const errandCard = (who, pl, name) => `<div class="errand ${who}"><div class="er-head">${portraitImg(who, 'happy', 1, 'mini')}<b>${name}</b></div><p class="ask">“${esc(pl.e.ask)}”</p>${pl.progress.map(p => '<div class="cost-line ' + (p.have >= p.n.n ? 'ok' : '') + '"><span>' + esc(needLabel(p.n)) + '</span><b>' + p.have + '/' + p.n.n + '</b></div>').join('')}</div>`;
    const tips = [
      ['strawberry', 'Meadow: strawberries, bilberries, crab apples, chanterelles and fiddleheads.'],
      ['nightberry', 'Dark Wood: nightberries, glowcaps and moonleaf. Wisps and brambles too.'],
      ['jack', 'Some forage has a poisonous twin. Sage can tell them apart. Jack-o\'-lanterns glow faintly at night.'],
      ['carrot', 'Grandma\'s garden regrows. She hands out vegetables once a day, and lets you nap once a day.'],
      ['hearttonic', 'Hearts only come back from potions, pie, and a rest at Grandma\'s.'],
    ];
    pages.innerHTML = `<div class="page left"><h3 class="page-h">Errands</h3>
      ${G.flags.metGrandma ? errandCard('grandma', g, 'Grandma Hazel') : '<p class="muted">Someone lives in the cottage to the east. Smoke from the chimney, so they\'re home.</p>'}
      ${G.flags.metWitch ? errandCard('witch', w, 'Belladonna') : '<p class="muted">The sign by the crossroads points west to a "Den". Brave or hungry people only.</p>'}
      </div>
      <div class="page right"><h3 class="page-h">Field notes</h3>${tips.map(t => '<div class="note">' + itemImg(t[0], 2) + '<span>' + esc(t[1]) + '</span></div>').join('')}</div>`;
    layer.keys = null;
  }

  function renderStatus(layer, pages) {
    const p = G.player, c = FH.CHARACTERS[p.who];
    pages.innerHTML = `<div class="page left status-left"><div class="big-por wood">${portraitImg(p.who, 'open', 5)}</div><h2>${c.name} <small>${c.title}</small></h2><p class="desc">${esc(c.blurb)}</p></div>
      <div class="page right">
        <div class="abil"><div class="lbl">Ability · <span class="kbd small">Q</span></div><b>${esc(c.ability.name)}</b><p>${esc(c.ability.text)}</p></div>
        <div class="abil"><div class="lbl">Passive</div><b>${esc(c.passive.name)}</b><p>${esc(c.passive.text)}</p></div>
        <div class="stats">
          <div><span>Day</span><b>${G.day}</b></div><div><span>Things gathered</span><b>${G.stats.gathered}</b></div>
          <div><span>Eaten & drunk</span><b>${G.stats.eaten}</b></div><div><span>Potions brewed</span><b>${G.stats.brewed}</b></div>
          <div><span>Trades</span><b>${G.stats.traded}</b></div><div><span>Errands done</span><b>${G.stats.errands}</b></div>
        </div>
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
        <div class="logo"><div class="logo-small">a little forest game</div><h1><span>Fernlight</span><span>Hollow</span></h1><div class="logo-leaves">${itemImg('moonleaf', 3)}${itemImg('strawberry', 3)}${itemImg('glowcap', 3)}</div></div>
        <div class="menu">
          ${hasSave ? '<button class="btn wood-btn" data-a="continue">Continue</button>' : ''}
          <button class="btn wood-btn" data-a="new">New game</button>
          <button class="btn wood-btn" data-a="help">How to play</button>
          <button class="btn wood-btn small" data-a="sound">Music: <b>${FH.audio.musicOn ? 'on' : 'off'}</b></button>
        </div>
        <div class="title-foot">No ending. Stay as long as you like.</div>
      </div></div>`);
    const layer = { el: box, sel: 0 };
    const btns = () => Array.from(box.querySelectorAll('.menu .btn'));
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
    const box = el(`<div class="layer modal-layer"><div class="modal panel">
      <h2>How to play</h2>
      <div class="help-grid">
        <div><span class="kbd">WASD</span><span class="kbd">← ↑ → ↓</span></div><p>Walk. Hold <span class="kbd small">Shift</span> to run, which eats stamina faster.</p>
        <div><span class="kbd">E</span><span class="kbd">Space</span></div><p>Pick things up, harvest, talk, read signs.</p>
        <div><span class="kbd">B</span></div><p>Open your basket. It holds 15 things. Eat, drink or drop from here.</p>
        <div><span class="kbd">Q</span></div><p>Use your character's ability.</p>
        <div><span class="kbd">Esc</span></div><p>Pause.</p>
      </div>
      <ul class="help-list">
        <li>${iconImg('heart', 2)}<span>You have <b>three hearts</b>. Lose them all and you start over.</span></li>
        <li>${iconImg('bolt', 2)}<span><b>Stamina</b> drains as you walk. At zero you slow down and start losing hearts. Eat.</span></li>
        <li>${iconImg('skull', 2)}<span>Some berries and mushrooms are <b>poisonous lookalikes</b>. Eating one costs a heart.</span></li>
        <li>${itemImg('carrot', 2)}<span><b>Grandma Hazel</b> (east) grows vegetables, gives errands and lets you rest.</span></li>
        <li>${itemImg('hearttonic', 2)}<span><b>Belladonna</b> (west, in the Dark Wood) trades potions for food. Or brew your own.</span></li>
      </ul>
      <div class="actions center"><button class="btn green" id="ok">Got it</button></div>
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
      <h2 class="select-h">Who's walking into the woods?</h2>
      <div class="cards">${order.map(id => {
        const c = FH.CHARACTERS[id];
        const bar = (v, max) => '<div class="sbar"><i style="width:' + Math.round(v / max * 100) + '%"></i></div>';
        return `<button class="card panel" data-id="${id}">
          <div class="card-por wood">${portraitImg(id, 'open', 4, 'p-open')}${portraitImg(id, 'happy', 4, 'p-happy')}</div>
          <div class="card-walk">${img(FH.charSprite(id, 'down', 0), 3, 'walk-' + id)}</div>
          <h3>${c.name}</h3><div class="card-title">${c.title}</div>
          <p class="blurb">${esc(c.blurb)}</p>
          <div class="statrow"><span>Stamina</span>${bar(c.maxStam, 120)}</div>
          <div class="statrow"><span>Speed</span>${bar(c.speed, 1.15)}</div>
          <div class="abil"><div class="lbl">Ability · Q</div><b>${esc(c.ability.name)}</b><p>${esc(c.ability.text)}</p></div>
          <div class="abil"><div class="lbl">Passive</div><b>${esc(c.passive.name)}</b><p>${esc(c.passive.text)}</p></div>
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
      c.ondblclick = go;
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
    UI.hud();
    const p = G.player;
    if (resumed) {
      UI.toast('Welcome back. Day ' + G.day + ', ' + FH.clockText() + '.', 'good');
      return;
    }
    const intro = FH.LINES.start[p.who];
    UI.say([
      { who: null, text: 'Fernlight Hollow. A forest that is never in any hurry, and would prefer you weren\'t either.' },
      { who: p.who, mood: 'open', text: intro[0] },
      { who: p.who, mood: 'happy', text: intro[1] },
      { who: null, text: 'Your basket holds fifteen things. Keep your stamina up, keep your three hearts, and don\'t eat anything that looks too pleased with itself.' },
    ]);
  };

  UI.pause = function () {
    const box = el(`<div class="layer modal-layer"><div class="modal panel pause">
      <h2>Paused</h2>
      <div class="menu">
        <button class="btn wood-btn" data-a="resume">Resume</button>
        <button class="btn wood-btn" data-a="help">How to play</button>
        <button class="btn wood-btn small" data-a="music">Music: <b>${FH.audio.musicOn ? 'on' : 'off'}</b></button>
        <button class="btn wood-btn small" data-a="sfx">Sounds: <b>${FH.audio.sfxOn ? 'on' : 'off'}</b></button>
        <button class="btn wood-btn small" data-a="quit">Save &amp; quit to title</button>
      </div>
      <p class="hint center">Your game saves itself every so often, and when you close a menu.</p>
    </div></div>`);
    const layer = { el: box, sel: 0 };
    const btns = () => Array.from(box.querySelectorAll('.menu .btn'));
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
      <div class="over-por">${portraitImg(p.who, 'happy', 4)}</div>
      <h2>The forest goes quiet.</h2>
      <p class="why">${esc(why)}</p>
      <p class="sub">You wake at the edge of the meadow with an empty basket and a headache. Grandma will have heard about this.</p>
      <div class="stats">
        <div><span>Days</span><b>${G.day}</b></div><div><span>Gathered</span><b>${G.stats.gathered}</b></div><div><span>Brewed</span><b>${G.stats.brewed}</b></div><div><span>Errands</span><b>${G.stats.errands}</b></div>
      </div>
      <div class="menu row"><button class="btn green" data-a="again">Start over</button><button class="btn" data-a="title">Title</button></div>
    </div></div>`);
    const layer = { el: box, sel: 0 };
    const btns = Array.from(box.querySelectorAll('.btn'));
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
