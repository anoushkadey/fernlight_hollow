// Core simulation and rendering. UI panels live in ui.js; this file owns the world.
(function (FH) {
  'use strict';

  const T = FH.TILE;
  const DAY_LEN = 480;          // seconds for a full day
  const BASKET_MAX = 15;
  const MAX_HEARTS = 3;
  FH.BASKET_MAX = BASKET_MAX;
  FH.MAX_HEARTS = MAX_HEARTS;
  FH.DAY_LEN = DAY_LEN;

  const G = FH.game = {
    mode: 'title',      // title | select | play | over
    paused: false,      // true while any panel or dialogue is open
    t: 0, scale: 3, W: 400, H: 225,
    cam: { x: 0, y: 0, shake: 0 },
    keys: {}, pressed: {},
    particles: [], drops: [], pings: [], wisps: [],
    flash: 0,
  };

  // ---------- helpers ----------
  const rand = Math.random;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  FH.clamp = clamp;

  FH.hour = function () { return (8 + (G.time / DAY_LEN) * 24) % 24; };
  FH.clockText = function () {
    const h = FH.hour();
    let hh = Math.floor(h), mm = Math.floor((h - hh) * 60 / 10) * 10;
    const ap = hh >= 12 ? 'PM' : 'AM';
    hh = hh % 12; if (hh === 0) hh = 12;
    return (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm + ' ' + ap;
  };
  function nightAmount() {
    const h = FH.hour();
    if (h >= 21 || h < 4.5) return 1;
    if (h >= 17.5) return (h - 17.5) / 3.5;
    if (h < 7) return 1 - (h - 4.5) / 2.5;
    return 0;
  }
  FH.nightAmount = nightAmount;
  FH.isNight = () => nightAmount() > 0.6;

  // What the player believes an item is.
  FH.seesTruth = function () {
    const p = G.player;
    return p && (p.who === 'sage' || (p.buffs.owl > 0));
  };
  FH.itemView = function (it) {
    const d = FH.ITEMS[it.id];
    const hidden = d.toxic && d.look && !FH.seesTruth();
    const base = hidden ? FH.ITEMS[d.look] : d;
    let name = base.name, desc = base.desc;
    let effect = null;
    if (it.id === 'murky') {
      if (G.player.who === 'draco' && it.outcome) {
        name = 'Murky Brew';
        effect = FH.MURKY[it.outcome].text;
        desc = 'Draco squints at it. "' + FH.MURKY[it.outcome].text.replace(/\.$/, '') + '. Probably. Ninety percent."';
      }
    }
    return { name, desc, sprite: d.look || it.id, hidden, toxicKnown: d.toxic && !hidden, def: d, shownDef: base, effect };
  };

  // ---------- setup ----------
  G.init = function () {
    G.canvas = document.getElementById('game');
    G.ctx = G.canvas.getContext('2d');
    G.light = document.createElement('canvas');
    G.lctx = G.light.getContext('2d');
    G.world = new FH.World();
    G.world.bake();
    G.npcs = [
      { who: 'grandma', name: 'Grandma Hazel', x: (FH.LANDMARKS.garden.x + 3) * T + 2, y: (FH.LANDMARKS.garden.y + FH.LANDMARKS.garden.h + 1) * T + 6, spr: FH.npcSprite('grandma'), r: 7 },
      { who: 'witch', name: 'Belladonna', x: (FH.LANDMARKS.den.x + 2) * T - 2, y: (FH.LANDMARKS.den.y + 2) * T + 6, spr: FH.npcSprite('witch'), r: 7 },
    ];
    window.addEventListener('resize', G.resize);
    G.resize();
  };

  G.resize = function () {
    const iw = window.innerWidth, ih = window.innerHeight;
    let s = Math.floor(Math.min(iw / 380, ih / 214));
    s = Math.max(2, s);
    if (iw < 500) s = 2;
    G.scale = s;
    G.W = Math.ceil(iw / s); G.H = Math.ceil(ih / s);
    G.canvas.width = G.W; G.canvas.height = G.H;
    G.canvas.style.width = G.W * s + 'px'; G.canvas.style.height = G.H * s + 'px';
    G.light.width = G.W; G.light.height = G.H;
    G.ctx.imageSmoothingEnabled = false;
    document.documentElement.style.setProperty('--px', s + 'px');
    if (G.player) G.snapCamera();
  };

  G.newGame = function (who) {
    const c = FH.CHARACTERS[who];
    const L = FH.LANDMARKS;
    G.player = {
      who, x: L.start.x * T + 8, y: L.start.y * T + 8, dir: 'down', frame: 0, animT: 0, moving: false,
      stam: c.maxStam, maxStam: c.maxStam, hearts: MAX_HEARTS, invuln: 0, kx: 0, ky: 0,
      buffs: { swift: 0, owl: 0, thorn: 0, hiccup: 0 }, cd: 0, starve: 0, basket: [],
    };
    G.time = 0; G.day = 1;
    G.stats = { gathered: 0, eaten: 0, brewed: 0, traded: 0, errands: 0, hurt: 0 };
    G.flags = { metGrandma: false, metWitch: false, sawDark: false, saidNight: -1, giftDay: 0, restDay: 0, hungryBark: 0 };
    G.errands = { grandma: Math.floor(rand() * FH.ERRANDS.grandma.length), witch: Math.floor(rand() * FH.ERRANDS.witch.length) };
    G.known = {};
    G.drops = []; G.particles = []; G.pings = [];
    G.world.spawns.forEach(s => { s.item = null; s.timer = rand() * 3; });
    G.world.crops.forEach(c2 => { c2.growth = 0.4 + rand() * 0.7; });
    G.makeWisps();
    G.mode = 'play';
    G.snapCamera();
    // fill the world straight away so the first screen isn't empty
    G.world.spawns.forEach(s => { if (rand() < 0.8) s.item = G.world.rollItem(s.table, rand); });
  };

  G.makeWisps = function () {
    G.wisps = [];
    const den = FH.LANDMARKS.den;
    const homes = G.world.spawns.filter(s => s.dark && Math.hypot(s.x / T - den.x, s.y / T - den.y) > 9);
    for (let i = 0; i < 9; i++) {
      const h = homes[Math.floor(rand() * homes.length)] || { x: 200, y: 200 };
      G.wisps.push({ x: h.x, y: h.y, hx: h.x, hy: h.y, ph: rand() * 6, cool: 0, nightOnly: i >= 4, alpha: 0 });
    }
  };

  // ---------- save / load ----------
  const SAVE_KEY = 'fernlight-hollow-save-v1';
  G.save = function () {
    if (G.mode !== 'play' || !G.player) return;
    const p = G.player;
    const data = {
      who: p.who, x: p.x, y: p.y, stam: p.stam, hearts: p.hearts, basket: p.basket, buffs: p.buffs,
      time: G.time, day: G.day, stats: G.stats, flags: G.flags, errands: G.errands, known: G.known,
      crops: G.world.crops.map(c => c.growth),
    };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (e) { /* storage unavailable */ }
  };
  G.hasSave = function () {
    try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; }
  };
  G.clearSave = function () { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ } };
  G.load = function () {
    let d;
    try { d = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { return false; }
    if (!d || !FH.CHARACTERS[d.who]) return false;
    G.newGame(d.who);
    const p = G.player;
    Object.assign(p, { x: d.x, y: d.y, stam: d.stam, hearts: d.hearts, basket: (d.basket || []).filter(i => FH.ITEMS[i.id]) });
    Object.assign(p.buffs, d.buffs || {});
    G.time = d.time || 0; G.day = d.day || 1;
    Object.assign(G.stats, d.stats || {});
    Object.assign(G.flags, d.flags || {});
    Object.assign(G.errands, d.errands || {});
    G.known = d.known || {};
    (d.crops || []).forEach((g, i) => { if (G.world.crops[i]) G.world.crops[i].growth = g; });
    G.snapCamera();
    return true;
  };

  // ---------- player actions ----------
  G.bark = function (key, force) {
    const p = G.player;
    const b = FH.LINES.barks[key];
    const text = typeof b === 'string' ? b : b && b[p.who];
    if (text) FH.ui.bark(text, force);
  };

  G.hurt = function (amount, cause) {
    const p = G.player;
    if (p.invuln > 0 || p.dead || G.mode !== 'play') return;
    p.hearts -= amount;
    p.invuln = 1.6;
    G.cam.shake = 0.35;
    G.flash = 0.5;
    G.stats.hurt++;
    FH.audio.sfx(cause === 'poison' ? 'poison' : 'hurt');
    if (cause !== 'poison') G.bark('ouch', true);
    for (let i = 0; i < 10; i++) G.particles.push({ x: p.x, y: p.y - 10, vx: (rand() - 0.5) * 60, vy: -rand() * 50, life: 0.6, col: '#e8455a', size: 1 });
    FH.ui.hud();
    if (p.hearts <= 0) {
      p.hearts = 0;
      p.dead = true;
      setTimeout(() => G.gameOver(cause), 900);
    }
  };

  G.gameOver = function (cause) {
    if (G.mode !== 'play') return;
    G.mode = 'over';
    G.clearSave();
    FH.audio.sfx('gameover');
    FH.ui.gameOver(cause);
  };

  G.addToBasket = function (id, extra) {
    const p = G.player;
    if (p.basket.length >= BASKET_MAX) { G.bark('full', true); FH.audio.sfx('deny'); return false; }
    const it = Object.assign({ id }, extra || {});
    p.basket.push(it);
    return it;
  };

  G.consume = function (index) {
    const p = G.player;
    const it = p.basket[index];
    if (!it) return;
    const d = FH.ITEMS[it.id];
    p.basket.splice(index, 1);
    G.stats.eaten++;
    const isPotion = d.kind === 'Potion';
    FH.audio.sfx(isPotion ? 'drink' : 'eat');
    let msg = null;
    if (it.id === 'murky') {
      const o = it.outcome || 'hiccup';
      if (o === 'heal') { p.hearts = Math.min(MAX_HEARTS, p.hearts + 1); FH.audio.sfx('heal'); msg = 'The brew tastes like pennies. A heart comes back.'; }
      if (o === 'stam') { p.stam = p.maxStam; msg = 'Murky, but you feel ready to run up a hill.'; }
      if (o === 'swift') { p.buffs.swift = 60; msg = 'Your feet feel lighter. Suspiciously lighter.'; }
      if (o === 'hiccup') { p.buffs.hiccup = 45; msg = 'Hic. Bubbles. Hic.'; }
      if (o === 'drain') { p.stam = Math.max(0, p.stam - 40); msg = 'Ugh. That one took more than it gave.'; }
      if (o === 'hurt') { G.hurt(1, 'poison'); msg = 'That was a bad bottle.'; }
      FH.ui.toast(msg, o === 'hurt' || o === 'drain' ? 'bad' : 'good');
      FH.ui.hud();
      return;
    }
    if (d.stam) p.stam = clamp(p.stam + d.stam, 0, p.maxStam);
    if (d.buff) p.buffs[d.buff] = d.dur;
    if (d.hp > 0) {
      const before = p.hearts;
      p.hearts = Math.min(MAX_HEARTS, p.hearts + d.hp);
      if (p.hearts > before) FH.audio.sfx('heal');
    }
    if (d.hp < 0) {
      G.hurt(-d.hp, 'poison');
      G.bark('poisoned', true);
      FH.ui.toast(d.look && !FH.seesTruth() ? "That wasn't " + FH.ITEMS[d.look].name + '. That was ' + d.name + '.' : 'You ate ' + d.name + '. You knew better.', 'bad');
    } else {
      const v = FH.itemView(it);
      FH.ui.toast(isPotion ? 'Drank ' + v.name : 'Ate ' + v.name, 'good');
    }
    for (let i = 0; i < 6; i++) G.particles.push({ x: p.x + (rand() - 0.5) * 8, y: p.y - 14, vx: (rand() - 0.5) * 20, vy: -20 - rand() * 20, life: 0.7, col: isPotion ? '#f7a8e0' : '#fff2b0', size: 1 });
    FH.ui.hud();
  };

  G.dropItem = function (index) {
    const p = G.player;
    const it = p.basket.splice(index, 1)[0];
    if (!it) return;
    G.drops.push({ it, x: p.x + (rand() - 0.5) * 10, y: p.y + 4, z: 8, vz: 30, life: 180 });
    FH.ui.hud();
  };

  // ---------- abilities ----------
  G.useAbility = function () {
    const p = G.player;
    if (p.cd > 0) { FH.audio.sfx('deny'); return; }
    const c = FH.CHARACTERS[p.who];
    if (p.who === 'draco') {
      FH.audio.sfx('think');
      p.cd = c.ability.cooldown;
      FH.ui.say([{ who: 'draco', mood: 'open', text: G.dracoAdvice() }]);
    } else if (p.who === 'sage') {
      FH.audio.sfx('pulse');
      p.cd = c.ability.cooldown;
      G.pings.push({ x: p.x, y: p.y - 6, r: 0, life: 1.2 });
      let n = 0, bad = 0;
      const found = [];
      G.world.spawns.forEach(s => { if (s.item && Math.hypot(s.x - p.x, s.y - p.y) < 200) found.push({ x: s.x, y: s.y, id: s.item }); });
      G.drops.forEach(d => { if (Math.hypot(d.x - p.x, d.y - p.y) < 200) found.push({ x: d.x, y: d.y, id: d.it.id }); });
      found.forEach(f => {
        n++; const tox = FH.ITEMS[f.id].toxic; if (tox) bad++;
        G.pings.push({ x: f.x, y: f.y, r: 0, life: 6, marker: true, toxic: tox, delay: Math.hypot(f.x - p.x, f.y - p.y) / 180 });
      });
      const words = ['Nothing', 'One thing', 'Two things', 'Three things', 'Four things', 'Five things', 'Six things', 'Seven things', 'Eight things', 'Nine things'];
      let text = n === 0 ? 'Nothing to eat around here. The ground is keeping secrets.' :
        (n < words.length ? words[n] + ' nearby.' : 'Plenty to eat around here.') + (bad ? ' ' + (bad === 1 ? 'One of them is' : (words[bad] || 'Several').split(' ')[0] + ' of them are') + ' lying.' : ' All honest.');
      FH.ui.bark(text, true);
    } else if (p.who === 'willow') {
      let best = null, bd = 30;
      G.world.shakeables.forEach(s => {
        const d = Math.hypot(s.x - p.x, s.y - 4 - p.y);
        if (d < bd) { bd = d; best = s; }
      });
      if (!best) { G.bark('nothingToShake', true); FH.audio.sfx('deny'); return; }
      p.cd = c.ability.cooldown;
      FH.audio.sfx('shake');
      best.shake = 0.6;
      const dark = best.dark || G.world.darkAt(best.x, best.y) > 0.5;
      const table = dark ? [['nightberry', 3], ['moonleaf', 2], ['glowcap', 2]] :
        best.type === 'bush' ? [['strawberry', 3], ['blueberry', 3], ['fiddlehead', 1]] : [['apple', 4], ['blueberry', 1], ['chanterelle', 2]];
      const count = rand() < 0.45 ? 2 : 1;
      for (let i = 0; i < count; i++) {
        let id = G.world.rollItem(table, rand);
        if (FH.ITEMS[id].toxic && rand() < 0.5) id = FH.ITEMS[id].look; // luck is on her side
        const it = { id };
        G.drops.push({ it, x: best.x + (rand() - 0.5) * 20, y: best.y + 4 + rand() * 6, z: 18 + rand() * 10, vz: 10, life: 150 });
      }
      for (let i = 0; i < 8; i++) G.particles.push({ x: best.x + (rand() - 0.5) * 20, y: best.y - 20 - rand() * 14, vx: (rand() - 0.5) * 20, vy: 10 + rand() * 20, life: 1.2, col: dark ? '#634a92' : '#79b552', size: 1, leaf: true });
      FH.ui.bark(count === 2 ? 'Two for one!' : 'Ooh, something fell out.', true);
    }
    FH.ui.hud();
  };

  // Draco's read of the situation.
  G.dracoAdvice = function () {
    const p = G.player;
    const L = [];
    const have = (id) => FH.ui.canAfford(FH.TRADES.find(t => t.id === id).cost);
    const recipe = (id) => {
      const tr = FH.TRADES.find(t => t.id === id);
      return FH.ui.discounted(tr.cost).map(c => c.n + ' ' + (c.n === 1 ? FH.SINGULAR[c.tag] : FH.TAG_NAMES[c.tag])).join(' and ');
    };
    const owned = (id) => p.basket.some(i => i.id === id);
    const pot = (id) => FH.ITEMS[id].name;
    const toxicCount = p.basket.filter(i => FH.ITEMS[i.id].toxic && FH.ITEMS[i.id].kind !== 'Potion').length;
    let need = null;
    if (p.hearts <= 1) need = 'hearttonic';
    else if (p.stam < p.maxStam * 0.25) need = 'vigor';
    else if (G.world.darkAt(p.x, p.y) > 0.5 || (FH.isNight() && p.hearts < 3)) need = 'thorn';
    else if (FH.isNight()) need = 'owl';
    else if (p.hearts < MAX_HEARTS) need = 'hearttonic';
    if (!need) {
      L.push("You're fine. Annoyingly fine.");
      L.push('If I had to pick, bank a ' + pot('hearttonic') + ' for later: ' + recipe('hearttonic') + '.');
    } else {
      if (owned(need)) return 'You already have a ' + pot(need) + ' in the basket. Drink it, that is what it is for.';
      const why = { hearttonic: p.hearts <= 1 ? 'One heart left. That is not a number I like.' : 'You are down a heart.',
        vigor: 'You are running on fumes.', thorn: FH.isNight() ? 'Dark woods at night. Brambles, wisps, both awake.' : 'Brambles and wisps out here.', owl: 'It is dark, and the lookalikes are harder to spot at night.' }[need];
      L.push(why + ' You want ' + pot(need) + '.');
      if (have(need)) L.push('Belladonna wants ' + recipe(need) + ' for it. You have all of that. Go.');
      else L.push('Belladonna trades it for ' + recipe(need) + '. You are not there yet.');
    }
    if (toxicCount) L.push('Also: ' + toxicCount + ' thing' + (toxicCount > 1 ? 's' : '') + ' in your basket smell wrong. Don\'t eat ' + (toxicCount > 1 ? 'those' : 'that') + '. The witch might want ' + (toxicCount > 1 ? 'them' : 'it') + '.');
    return L.join(' ');
  };

  // ---------- interaction ----------
  G.findInteract = function () {
    const p = G.player;
    const fx = p.x + ({ left: -8, right: 8 }[p.dir] || 0), fy = p.y + ({ up: -8, down: 6 }[p.dir] || 0) - 3;
    let best = null, bd = 22;
    const consider = (x, y, obj, range) => {
      const d = Math.min(Math.hypot(x - fx, y - fy), Math.hypot(x - p.x, y - p.y) + 4);
      if (d < (range || bd) && (!best || d < best.d)) best = Object.assign({ d }, obj);
    };
    G.world.spawns.forEach(s => { if (s.item) consider(s.x, s.y, { kind: 'spawn', ref: s, label: 'Pick up ' + FH.itemView({ id: s.item }).name }); });
    G.drops.forEach(dr => { if (dr.z <= 0) consider(dr.x, dr.y, { kind: 'drop', ref: dr, label: 'Pick up ' + FH.itemView(dr.it).name }); });
    G.world.crops.forEach(c => { if (c.growth >= 1) consider(c.x, c.y - 4, { kind: 'crop', ref: c, label: 'Harvest ' + FH.ITEMS[c.kind].name }); });
    G.npcs.forEach(n => consider(n.x, n.y - 6, { kind: 'npc', ref: n, label: 'Talk to ' + n.name }, 28));
    const cd = G.world.cauldron;
    consider(cd.x, cd.y - 6, { kind: 'cauldron', label: 'Use the cauldron' }, 26);
    G.world.props.forEach(pr => { if (pr.type === 'sign') consider(pr.x, pr.y - 6, { kind: 'sign', ref: pr, label: 'Read the sign' }, 24); });
    return best;
  };

  G.interact = function () {
    const p = G.player;
    const it = G.findInteract();
    if (!it) return;
    if (it.kind === 'spawn' || it.kind === 'drop') {
      const id = it.kind === 'spawn' ? it.ref.item : it.ref.it.id;
      const extra = it.kind === 'drop' ? it.ref.it : null;
      const added = G.addToBasket(id, extra && extra.outcome ? { outcome: extra.outcome } : null);
      if (!added) return;
      if (it.kind === 'spawn') { it.ref.item = null; it.ref.timer = 45 + rand() * 70; }
      else G.drops.splice(G.drops.indexOf(it.ref), 1);
      G.stats.gathered++;
      FH.audio.sfx('pickup');
      const v = FH.itemView(added);
      FH.ui.toast('+ ' + v.name, v.toxicKnown ? 'bad' : 'good', v.sprite);
      if (v.toxicKnown && p.who === 'sage' && rand() < 0.5) G.bark('toxicSpotted');
      for (let i = 0; i < 5; i++) G.particles.push({ x: it.ref.x, y: it.ref.y - 4, vx: (rand() - 0.5) * 30, vy: -20 - rand() * 30, life: 0.5, col: '#fff2b0', size: 1 });
      FH.ui.hud();
    } else if (it.kind === 'crop') {
      const added = G.addToBasket(it.ref.kind);
      if (!added) return;
      it.ref.growth = 0;
      G.stats.gathered++;
      FH.audio.sfx('harvest');
      FH.ui.toast('+ ' + FH.ITEMS[it.ref.kind].name, 'good', it.ref.kind);
      for (let i = 0; i < 6; i++) G.particles.push({ x: it.ref.x, y: it.ref.y - 4, vx: (rand() - 0.5) * 30, vy: -20 - rand() * 30, life: 0.6, col: '#6e4a30', size: 1 });
      FH.ui.hud();
    } else if (it.kind === 'npc') {
      const n = it.ref;
      n.face = p.x < n.x ? -1 : 1;
      if (n.who === 'grandma') FH.ui.talkGrandma();
      else FH.ui.talkWitch();
    } else if (it.kind === 'cauldron') {
      FH.ui.openWitch('cauldron');
    } else if (it.kind === 'sign') {
      FH.ui.say([{ who: null, text: 'The sign has two arrows. West: "Dark Wood. Belladonna\'s Den. Mind the brambles." East: "Hazel\'s. Wipe your boots."' }]);
    }
  };

  // ---------- update ----------
  G.update = function (dt) {
    G.t += dt;
    if (G.mode !== 'play') { G.updateAmbient(dt, true); return; }
    const p = G.player;
    if (G.paused || p.dead) { G.updateAmbient(dt, false); if (p.dead) G.updateCamera(dt); return; }
    const c = FH.CHARACTERS[p.who];

    // clock
    const prevNight = FH.isNight();
    G.time += dt;
    if (G.time >= DAY_LEN) { G.time -= DAY_LEN; G.day++; FH.ui.toast('Day ' + G.day + '. The birds are at it again.', 'good'); FH.audio.sfx('morning'); G.save(); }
    if (!prevNight && FH.isNight() && G.flags.saidNight !== G.day) { G.flags.saidNight = G.day; G.bark('night'); }

    // input -> movement
    let mx = 0, my = 0;
    const k = G.keys;
    if (k.ArrowLeft || k.KeyA) mx -= 1;
    if (k.ArrowRight || k.KeyD) mx += 1;
    if (k.ArrowUp || k.KeyW) my -= 1;
    if (k.ArrowDown || k.KeyS) my += 1;
    if (G.touch && (G.touch.dx || G.touch.dy)) { mx = G.touch.dx; my = G.touch.dy; }
    const len = Math.hypot(mx, my);
    if (len > 1) { mx /= len; my /= len; }
    const running = (k.ShiftLeft || k.ShiftRight || (G.touch && G.touch.run)) && p.stam > 0;
    let speed = 54 * c.speed * (running ? 1.55 : 1);
    if (p.buffs.swift > 0) speed *= 1.45;
    if (p.stam <= 0) speed *= 0.6;
    const inDark = G.world.darkAt(p.x, p.y) > 0.5;
    p.moving = len > 0.1;
    if (p.moving) {
      if (Math.abs(mx) > Math.abs(my)) p.dir = mx < 0 ? 'left' : 'right'; else p.dir = my < 0 ? 'up' : 'down';
      p.animT += dt * (running ? 11 : 7.5);
      p.frame = Math.floor(p.animT) % 4;
      if (Math.floor(p.animT) !== Math.floor(p.animT - dt * (running ? 11 : 7.5)) && p.frame % 2 === 1) {
        FH.audio.sfx('step');
        if (rand() < 0.6) G.particles.push({ x: p.x + (rand() - 0.5) * 4, y: p.y, vx: (rand() - 0.5) * 10, vy: -6, life: 0.4, col: inDark ? '#3a3046' : '#c8a878', size: 1 });
      }
    } else { p.frame = 0; p.animT = 0; }
    G.moveBody(p, (mx * speed + p.kx) * dt, (my * speed + p.ky) * dt);
    p.kx *= Math.pow(0.002, dt); p.ky *= Math.pow(0.002, dt);

    // stamina
    let drain = p.moving ? (running ? 1.5 : 0.5) : 0.12;
    if (inDark) drain *= 1.4;
    if (p.who === 'sage') drain *= 0.9;
    p.stam = Math.max(0, p.stam - drain * dt);
    if (p.stam <= 0) {
      p.starve += dt;
      if (p.starve > 14) { p.starve = 0; G.hurt(1, 'hunger'); G.bark('starving', true); }
    } else p.starve = 0;
    if (p.stam < p.maxStam * 0.2 && G.t - G.flags.hungryBark > 40) { G.flags.hungryBark = G.t; G.bark('hungry'); }

    // timers
    p.invuln = Math.max(0, p.invuln - dt);
    p.cd = Math.max(0, p.cd - dt);
    Object.keys(p.buffs).forEach(b => { p.buffs[b] = Math.max(0, p.buffs[b] - dt); });
    if (p.buffs.hiccup > 0 && rand() < dt * 0.7) {
      for (let i = 0; i < 3; i++) G.particles.push({ x: p.x + (rand() - 0.5) * 6, y: p.y - 20, vx: (rand() - 0.5) * 10, vy: -15 - rand() * 10, life: 1.4, col: '#c8f0ff', size: 2, bubble: true });
      FH.audio.sfx('blip');
    }

    if (inDark && !G.flags.sawDark) { G.flags.sawDark = true; G.bark('darkwood'); }

    // brambles
    if (inDark && p.buffs.thorn <= 0) {
      for (const b of G.world.brambles) {
        if (Math.abs(b.x - p.x) < 8 && Math.abs(b.y - 2 - p.y) < 6) {
          const a = Math.atan2(p.y - b.y, p.x - b.x);
          p.kx = Math.cos(a) * 160; p.ky = Math.sin(a) * 160;
          G.hurt(1, 'bramble');
          break;
        }
      }
    }

    // wisps
    const night = FH.isNight();
    G.wisps.forEach(w => {
      const active = !w.nightOnly || night;
      w.alpha += ((active ? 1 : 0) - w.alpha) * Math.min(1, dt * 1.5);
      w.ph += dt;
      w.cool = Math.max(0, w.cool - dt);
      const dp = Math.hypot(p.x - w.x, p.y - 8 - w.y);
      const playerInDark = G.world.darkAt(p.x, p.y) > 0.45;
      let tx = w.hx + Math.cos(w.ph * 0.6) * 24, ty = w.hy + Math.sin(w.ph * 0.9) * 14;
      let sp = 14;
      if (active && playerInDark && dp < (night ? 110 : 75) && w.cool <= 0) { tx = p.x; ty = p.y - 8; sp = night ? 30 : 24; }
      const a = Math.atan2(ty - w.y, tx - w.x);
      const dd = Math.hypot(tx - w.x, ty - w.y);
      if (dd > 1) { w.x += Math.cos(a) * Math.min(sp * dt, dd); w.y += Math.sin(a) * Math.min(sp * dt, dd); }
      if (active && w.alpha > 0.6 && dp < 8 && w.cool <= 0) {
        w.cool = 4;
        if (p.buffs.thorn > 0) { FH.ui.bark('The wisp slides off like rain off glass.', false); return; }
        G.hurt(1, 'wisp');
        const ka = Math.atan2(p.y - w.y, p.x - w.x);
        p.kx = Math.cos(ka) * 120; p.ky = Math.sin(ka) * 120;
      }
      if (rand() < dt * 6 * w.alpha) G.particles.push({ x: w.x + (rand() - 0.5) * 4, y: w.y + (rand() - 0.5) * 4, vx: 0, vy: -8, life: 0.8, col: '#bfefff', size: 1, glow: true });
    });

    // world regrowth
    G.world.spawns.forEach(s => {
      if (s.item) return;
      s.timer -= dt;
      if (s.timer <= 0) { s.item = G.world.rollItem(s.table, rand); s.pop = 0.4; }
    });
    G.world.crops.forEach(cr => { cr.growth = Math.min(1, cr.growth + cr.rate * dt); });

    // drops: bounce, then sit
    G.drops = G.drops.filter(d => {
      d.vz -= 160 * dt; d.z += d.vz * dt;
      if (d.z <= 0) { d.z = 0; d.vz = 0; }
      d.life -= dt;
      return d.life > 0;
    });

    G.prompt = G.findInteract();
    G.updateAmbient(dt, false);
    G.updateCamera(dt);

    // music mood follows the place and the hour
    FH.audio.setMood(inDark ? 'dark' : night ? 'night' : 'day');
    G.saveTimer = (G.saveTimer || 0) + dt;
    if (G.saveTimer > 20) { G.saveTimer = 0; G.save(); }
  };

  G.moveBody = function (b, dx, dy) {
    const w = G.world;
    const blocked = (x, y) => {
      if (w.isSolidPx(x - 4, y - 3) || w.isSolidPx(x + 4, y - 3) || w.isSolidPx(x - 4, y) || w.isSolidPx(x + 4, y)) return true;
      for (const n of G.npcs) if (Math.hypot(n.x - x, n.y - y) < n.r + 3) return true;
      if (w.cauldron && Math.hypot(w.cauldron.x - x, w.cauldron.y - y) < 9) return true;
      return false;
    };
    const steps = Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 3) || 1;
    for (let i = 0; i < steps; i++) {
      const sx = dx / steps, sy = dy / steps;
      if (!blocked(b.x + sx, b.y)) b.x += sx;
      else if (Math.abs(sy) < 0.01 && sx !== 0) { // slide around corners
        if (!blocked(b.x + sx, b.y - 1.2)) { b.x += sx; b.y -= 1.2; } else if (!blocked(b.x + sx, b.y + 1.2)) { b.x += sx; b.y += 1.2; }
      }
      if (!blocked(b.x, b.y + sy)) b.y += sy;
      else if (Math.abs(sx) < 0.01 && sy !== 0) {
        if (!blocked(b.x - 1.2, b.y + sy)) { b.y += sy; b.x -= 1.2; } else if (!blocked(b.x + 1.2, b.y + sy)) { b.y += sy; b.x += 1.2; }
      }
    }
  };

  G.updateCamera = function (dt) {
    const p = G.player;
    const tx = p.x - G.W / 2, ty = p.y - 10 - G.H / 2;
    G.cam.x += (tx - G.cam.x) * Math.min(1, dt * 5);
    G.cam.y += (ty - G.cam.y) * Math.min(1, dt * 5);
    G.cam.x = clamp(G.cam.x, 0, FH.MW * T - G.W);
    G.cam.y = clamp(G.cam.y, 0, FH.MH * T - G.H);
    G.cam.shake = Math.max(0, G.cam.shake - dt);
    G.flash = Math.max(0, G.flash - dt);
  };
  G.snapCamera = function () {
    if (!G.player) return;
    G.cam.x = clamp(G.player.x - G.W / 2, 0, FH.MW * T - G.W);
    G.cam.y = clamp(G.player.y - 10 - G.H / 2, 0, FH.MH * T - G.H);
  };

  // particles, fireflies, leaves, chimney smoke
  G.updateAmbient = function (dt, titleMode) {
    const cx = G.cam.x, cy = G.cam.y;
    const night = nightAmount();
    if (titleMode) {
      G.cam.x = 760 + Math.sin(G.t * 0.05) * 200; G.cam.y = 360 + Math.cos(G.t * 0.04) * 60;
      G.cam.x = clamp(G.cam.x, 0, FH.MW * T - G.W); G.cam.y = clamp(G.cam.y, 0, FH.MH * T - G.H);
    }
    if (rand() < dt * 3) {
      const x = cx + rand() * G.W, y = cy + rand() * G.H;
      const dark = G.world.darkAt(x, y) > 0.5;
      if (dark) G.particles.push({ x, y, vx: (rand() - 0.5) * 6, vy: -4 - rand() * 4, life: 4, col: rand() < 0.5 ? '#b58cff' : '#7fe6f0', size: 1, glow: true, spore: true });
      else if (night > 0.5) G.particles.push({ x, y, vx: (rand() - 0.5) * 8, vy: (rand() - 0.5) * 8, life: 5, col: '#f4f08a', size: 1, glow: true, firefly: true });
      else G.particles.push({ x, y: cy - 4, vx: 6 + rand() * 8, vy: 10 + rand() * 6, life: 9, col: rand() < 0.5 ? '#d0612a' : '#e89a3a', size: 1, leaf: true, ph: rand() * 6 });
    }
    const ch = G.world.chimney;
    if (ch && rand() < dt * 3) G.particles.push({ x: ch.x + (rand() - 0.5) * 3, y: ch.y, vx: 4 + rand() * 3, vy: -10 - rand() * 5, life: 3, col: '#d8d2c8', size: 2, smoke: true });
    const cd = G.world.cauldron;
    if (cd && rand() < dt * 5) G.particles.push({ x: cd.x + (rand() - 0.5) * 10, y: cd.y - 14, vx: (rand() - 0.5) * 4, vy: -12 - rand() * 8, life: 1.4, col: rand() < 0.5 ? '#f7a8e0' : '#e070c0', size: rand() < 0.3 ? 2 : 1, glow: true, bubble: true });

    G.particles = G.particles.filter(pt => {
      pt.life -= dt;
      if (pt.leaf && pt.ph !== undefined) { pt.ph += dt * 2; pt.vx = 8 + Math.sin(pt.ph) * 12; }
      if (pt.firefly) { pt.vx += (rand() - 0.5) * 30 * dt; pt.vy += (rand() - 0.5) * 30 * dt; }
      pt.x += pt.vx * dt; pt.y += pt.vy * dt;
      if (!pt.leaf && !pt.firefly && !pt.spore && !pt.smoke && !pt.bubble && !pt.glow) pt.vy += 60 * dt;
      return pt.life > 0;
    });
    if (G.particles.length > 400) G.particles.splice(0, G.particles.length - 400);
    G.pings = G.pings.filter(pg => {
      if (pg.delay > 0) { pg.delay -= dt; return true; }
      pg.life -= dt; pg.r += dt * (pg.marker ? 20 : 240);
      return pg.life > 0;
    });
    G.world.props.forEach(pr => { if (pr.shake) pr.shake = Math.max(0, pr.shake - dt); });
  };

  // ---------- render ----------
  G.render = function () {
    const g = G.ctx, W = G.W, H = G.H;
    const sx = G.cam.shake > 0 ? Math.round((rand() - 0.5) * 4) : 0;
    const sy = G.cam.shake > 0 ? Math.round((rand() - 0.5) * 4) : 0;
    const cx = Math.round(G.cam.x) + sx, cy = Math.round(G.cam.y) + sy;
    g.fillStyle = '#0c0a14';
    g.fillRect(0, 0, W, H);
    g.drawImage(G.world.ground, cx, cy, W, H, 0, 0, W, H);

    const inView = (x, y, m) => x > cx - m && x < cx + W + m && y > cy - m && y < cy + H + m * 2;

    // water sparkle
    const t = G.t;
    const wr = FH.rng(Math.floor(t * 2));
    for (let i = 0; i < 40; i++) {
      const x = cx + Math.floor(wr() * W), y = cy + Math.floor(wr() * H);
      if (G.world.tile(Math.floor(x / T), Math.floor(y / T)) === 2 && G.world.waterVal(x, y) < 0.7) {
        g.fillStyle = 'rgba(220,240,255,0.7)';
        g.fillRect(x - cx, y - cy, 2, 1);
      }
    }

    // flat decorations sit under everything
    const draws = [];
    G.world.props.forEach(pr => {
      if (!inView(pr.x, pr.y, 80)) return;
      if (pr.flat) { g.drawImage(pr.spr.img, Math.round(pr.x - pr.spr.ox - cx), Math.round(pr.y - pr.spr.oy - cy)); return; }
      draws.push({ y: pr.y, kind: 'prop', pr });
    });
    G.world.crops.forEach(cr => {
      if (!inView(cr.x, cr.y, 20)) return;
      const stage = cr.growth >= 1 ? 2 : cr.growth > 0.45 ? 1 : 0;
      cr.sprs = cr.sprs || [0, 1, 2].map(s => FH.makeCrop(cr.kind, s));
      draws.push({ y: cr.y - 2, kind: 'crop', cr, spr: cr.sprs[stage], ripe: stage === 2 });
    });
    G.world.spawns.forEach(s => { if (s.item && inView(s.x, s.y, 20)) draws.push({ y: s.y, kind: 'item', s, id: s.item }); });
    G.drops.forEach(d => { if (inView(d.x, d.y, 20)) draws.push({ y: d.y, kind: 'drop', d }); });
    if (G.npcs) G.npcs.forEach(n => draws.push({ y: n.y, kind: 'npc', n }));
    if (G.mode === 'play' || G.mode === 'over') draws.push({ y: G.player.y, kind: 'player' });
    draws.sort((a, b) => a.y - b.y);

    const p = G.player;
    const shadow = (x, y, w) => {
      g.fillStyle = 'rgba(10,8,20,0.28)';
      g.fillRect(Math.round(x - w / 2 - cx), Math.round(y - 1 - cy), w, 2);
      g.fillRect(Math.round(x - w / 2 + 1 - cx), Math.round(y - 2 - cy), w - 2, 1);
      g.fillRect(Math.round(x - w / 2 + 1 - cx), Math.round(y + 1 - cy), w - 2, 1);
    };
    const showTruth = G.mode === 'play' && FH.seesTruth();

    for (const d of draws) {
      if (d.kind === 'prop') {
        const pr = d.pr, s = pr.spr;
        let ox = 0;
        if (pr.shake) ox = Math.round(Math.sin(pr.shake * 40) * 2 * pr.shake);
        let alpha = 1;
        if (p && (pr.type === 'tree' || pr.type === 'building') && G.mode === 'play') {
          // fade a canopy when the player walks behind it
          const top = pr.y - s.oy, left = pr.x - s.ox;
          if (p.y < pr.y - 4 && p.y > top + 4 && p.x > left + 2 && p.x < left + s.img.width - 2) alpha = 0.55;
        }
        if (pr.type === 'tree' || pr.type === 'bush') shadow(pr.x, pr.y, pr.type === 'tree' ? 18 : 14);
        if (alpha < 1) g.globalAlpha = alpha;
        g.drawImage(s.img, Math.round(pr.x - s.ox - cx + ox), Math.round(pr.y - s.oy - cy));
        g.globalAlpha = 1;
      } else if (d.kind === 'crop') {
        const cr = d.cr;
        const bob = d.ripe ? Math.round(Math.sin(t * 2 + cr.x) * 0.5) : 0;
        g.drawImage(d.spr.img, Math.round(cr.x - d.spr.ox - cx), Math.round(cr.y - d.spr.oy - cy + bob));
        if (d.ripe && Math.sin(t * 3 + cr.x) > 0.95) drawSparkle(g, cr.x - cx + 4, cr.y - cy - 12);
      } else if (d.kind === 'item' || d.kind === 'drop') {
        const id = d.kind === 'item' ? d.id : d.d.it.id;
        const def = FH.ITEMS[id];
        const x = d.kind === 'item' ? d.s.x : d.d.x, y = d.kind === 'item' ? d.s.y : d.d.y;
        const z = d.kind === 'drop' ? d.d.z : 0;
        const bob = Math.round(Math.sin(t * 2.4 + x * 0.1) * 1);
        let pop = 1;
        if (d.kind === 'item' && d.s.pop) { d.s.pop = Math.max(0, d.s.pop - 1 / 60); pop = 1 - d.s.pop; }
        shadow(x, y + 3, 8);
        const spr = FH.itemSprite(def.look || id);
        if (pop < 1) {
          const s = Math.max(0.2, pop);
          g.drawImage(spr, Math.round(x - 6 * s - cx), Math.round(y - 12 * s - cy + 3), Math.round(12 * s), Math.round(12 * s));
        } else g.drawImage(spr, Math.round(x - 6 - cx), Math.round(y - 10 - cy + bob - z));
        if (showTruth && def.toxic) {
          g.drawImage(FH.icon('skull'), Math.round(x - 3 - cx), Math.round(y - 19 - cy + bob - z));
        }
        if (Math.sin(t * 1.7 + x * 0.37 + y) > 0.97) drawSparkle(g, x - cx + 4, y - cy - 10 - z);
      } else if (d.kind === 'npc') {
        const n = d.n;
        const bob = Math.round(Math.sin(t * 2 + n.x) * 0.6 + 0.4);
        shadow(n.x, n.y, 12);
        const sp = n.spr;
        g.save();
        if (n.face === -1) { g.translate(Math.round(n.x - cx), 0); g.scale(-1, 1); g.drawImage(sp, -8, Math.round(n.y - sp.height - cy + 1 - bob)); }
        else g.drawImage(sp, Math.round(n.x - 8 - cx), Math.round(n.y - sp.height - cy + 1 - bob));
        g.restore();
        if (G.mode === 'play' && Math.hypot(p.x - n.x, p.y - n.y) < 70) {
          // a little bobbing marker when you're close
          const my = Math.round(n.y - sp.height - cy - 6 + Math.sin(t * 4) * 1.5);
          g.fillStyle = '#2b1d16'; g.fillRect(Math.round(n.x - cx) - 2, my - 1, 5, 6);
          g.fillStyle = '#f5d76e'; g.fillRect(Math.round(n.x - cx) - 1, my, 3, 3); g.fillRect(Math.round(n.x - cx) - 1, my + 4, 3, 1);
        }
      } else if (d.kind === 'player') {
        drawPlayer(g, cx, cy, shadow);
      }
    }

    // particles that sit in the world
    for (const pt of G.particles) {
      if (pt.glow) continue;
      const x = Math.round(pt.x - cx), y = Math.round(pt.y - cy);
      if (x < -4 || y < -4 || x > W + 4 || y > H + 4) continue;
      g.globalAlpha = pt.smoke ? Math.min(0.5, pt.life / 3) : Math.min(1, pt.life * 2);
      g.fillStyle = pt.col;
      g.fillRect(x, y, pt.size, pt.size);
      if (pt.leaf) g.fillRect(x + 1, y + (Math.sin(pt.ph || 0) > 0 ? 1 : 0), 1, 1);
    }
    g.globalAlpha = 1;

    // wisps
    G.wisps.forEach(w => {
      if (w.alpha < 0.05 || !inView(w.x, w.y, 20)) return;
      const x = Math.round(w.x - cx), y = Math.round(w.y - cy + Math.sin(w.ph * 3) * 2);
      g.globalAlpha = w.alpha * 0.35;
      g.fillStyle = '#7fd8ff'; g.fillRect(x - 3, y - 3, 7, 7);
      g.globalAlpha = w.alpha;
      g.fillStyle = '#c8f4ff'; g.fillRect(x - 2, y - 2, 5, 5);
      g.fillStyle = '#ffffff'; g.fillRect(x - 1, y - 1, 3, 3);
      g.fillStyle = '#1a2a40'; g.fillRect(x - 1, y - 1, 1, 1); g.fillRect(x + 1, y - 1, 1, 1);
      g.fillStyle = '#c8f4ff'; g.fillRect(x - 1 + Math.round(Math.sin(w.ph * 5)), y + 3, 1, 2);
      g.globalAlpha = 1;
    });

    G.renderLighting(cx, cy);

    // glowing particles go on top of the darkness
    g.globalCompositeOperation = 'lighter';
    for (const pt of G.particles) {
      if (!pt.glow) continue;
      const x = Math.round(pt.x - cx), y = Math.round(pt.y - cy);
      if (x < -4 || y < -4 || x > W + 4 || y > H + 4) continue;
      const a = Math.min(1, pt.life) * (pt.firefly ? (0.5 + Math.sin(G.t * 6 + pt.x) * 0.5) : 0.8);
      g.globalAlpha = a * 0.35; g.fillStyle = pt.col; g.fillRect(x - 1, y - 1, 3, 3);
      g.globalAlpha = a; g.fillRect(x, y, pt.size, pt.size);
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';

    // Sage's pings
    G.pings.forEach(pg => {
      if (pg.delay > 0) return;
      const x = Math.round(pg.x - cx), y = Math.round(pg.y - cy);
      if (!pg.marker) {
        g.strokeStyle = 'rgba(160,240,140,' + Math.max(0, pg.life / 1.2) * 0.8 + ')';
        g.lineWidth = 1;
        g.beginPath(); g.arc(x + 0.5, y + 0.5, pg.r, 0, Math.PI * 2); g.stroke();
      } else {
        const a = Math.min(1, pg.life);
        const col = pg.toxic ? '200,120,255' : '170,250,140';
        g.strokeStyle = 'rgba(' + col + ',' + a * 0.9 + ')';
        g.beginPath(); g.arc(x + 0.5, y - 4.5, 6 + (pg.r % 6), 0, Math.PI * 2); g.stroke();
        g.fillStyle = 'rgba(' + col + ',' + a + ')';
        const by = y - 18 + Math.round(Math.sin(G.t * 5) * 1.5);
        g.fillRect(x - 1, by, 3, 3); g.fillRect(x, by + 3, 1, 2);
      }
    });

    // vignette when hurt or low
    if (G.mode === 'play') {
      if (G.flash > 0) { g.fillStyle = 'rgba(200,40,60,' + G.flash * 0.35 + ')'; g.fillRect(0, 0, W, H); }
      if (p.hearts === 1) {
        const a = 0.18 + Math.sin(G.t * 3) * 0.06;
        const grd = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.7);
        grd.addColorStop(0, 'rgba(120,0,30,0)'); grd.addColorStop(1, 'rgba(120,0,30,' + a + ')');
        g.fillStyle = grd; g.fillRect(0, 0, W, H);
      }
    }
  };

  function drawSparkle(g, x, y) {
    g.drawImage(FH.icon('sparkle'), Math.round(x - 2), Math.round(y - 2));
  }

  function drawPlayer(g, cx, cy, shadow) {
    const p = G.player;
    if (!p) return;
    shadow(p.x, p.y, 12);
    if (p.invuln > 0 && Math.floor(p.invuln * 12) % 2 === 0 && G.mode === 'play') return;
    const spr = FH.charSprite(p.who, p.dir, p.moving ? p.frame : 0);
    const bob = p.moving && (p.frame % 2 === 1) ? -1 : 0;
    g.drawImage(spr, Math.round(p.x - 8 - cx), Math.round(p.y - 19 - cy + bob));
    if (p.buffs.thorn > 0) {
      g.strokeStyle = 'rgba(154,208,90,' + (0.35 + Math.sin(G.t * 5) * 0.15) + ')';
      g.beginPath(); g.arc(Math.round(p.x - cx) + 0.5, Math.round(p.y - 9 - cy) + 0.5, 12, 0, Math.PI * 2); g.stroke();
    }
    if (p.buffs.swift > 0 && p.moving && Math.random() < 0.5) G.particles.push({ x: p.x, y: p.y - 2, vx: 0, vy: -4, life: 0.3, col: '#7ee0b0', size: 1 });
  }

  // Darkness: an ambient layer cut by lights, then warm glows added on top.
  G.renderLighting = function (cx, cy) {
    const lg = G.lctx, W = G.W, H = G.H;
    const night = nightAmount();
    const p = G.player;
    lg.clearRect(0, 0, W, H);
    lg.globalCompositeOperation = 'source-over';
    const cell = 8;
    let any = false;
    for (let y = 0; y < H + cell; y += cell) for (let x = 0; x < W + cell; x += cell) {
      const d = G.world.darkSmooth((x + cx) / T, (y + cy) / T);
      const dk = Math.max(0, Math.min(1, (d - 0.3) / 0.5));
      const a = Math.min(0.86, night * 0.68 + dk * (0.34 + night * 0.18));
      if (a < 0.01) continue;
      any = true;
      const r = Math.round(12 + dk * 22 - night * 4), gg = Math.round(10 + dk * 2), b = Math.round(38 + dk * 22);
      lg.fillStyle = 'rgba(' + r + ',' + gg + ',' + b + ',' + a.toFixed(3) + ')';
      lg.fillRect(x, y, cell, cell);
    }
    if (!any) return;
    // cut holes for lights
    lg.globalCompositeOperation = 'destination-out';
    const hole = (x, y, r, s) => {
      const grd = lg.createRadialGradient(x, y, 0, x, y, r);
      grd.addColorStop(0, 'rgba(0,0,0,' + s + ')'); grd.addColorStop(0.55, 'rgba(0,0,0,' + s * 0.6 + ')'); grd.addColorStop(1, 'rgba(0,0,0,0)');
      lg.fillStyle = grd; lg.fillRect(x - r, y - r, r * 2, r * 2);
    };
    const flick = (i) => 1 + Math.sin(G.t * 9 + i * 3) * 0.04 + Math.sin(G.t * 23 + i) * 0.03;
    const glows = [];
    G.world.lights.forEach((L, i) => {
      const x = L.x - cx, y = L.y - cy;
      if (x < -80 || y < -80 || x > W + 80 || y > H + 80) return;
      const r = L.r * flick(i);
      hole(x, y, r, 0.9);
      glows.push([x, y, r * 0.8, L.col, 0.22]);
    });
    if (p && (G.mode === 'play' || G.mode === 'over')) {
      const owl = p.buffs.owl > 0;
      const r = owl ? 150 : 46 + night * 10;
      hole(p.x - cx, p.y - 12 - cy, r * flick(99), owl ? 0.95 : 0.85);
      glows.push([p.x - cx, p.y - 12 - cy, 30, '255,220,150', 0.12 * night]);
    }
    G.wisps.forEach(w => {
      if (w.alpha < 0.1) return;
      hole(w.x - cx, w.y - cy, 26, 0.8 * w.alpha);
      glows.push([w.x - cx, w.y - cy, 20, '140,220,255', 0.3 * w.alpha]);
    });
    G.world.spawns.forEach(s => {
      if (!s.item) return;
      const d = FH.ITEMS[s.item];
      if (d.glow) { hole(s.x - cx, s.y - 4 - cy, 22, 0.7); glows.push([s.x - cx, s.y - 4 - cy, 14, '127,230,240', 0.25]); }
      // jack-o'-lanterns give themselves away at night, if you know to look
      if (s.item === 'jack' && night > 0.5) { hole(s.x - cx, s.y - 4 - cy, 12, 0.5); glows.push([s.x - cx, s.y - 4 - cy, 9, '255,150,60', 0.25]); }
    });
    G.particles.forEach(pt => { if (pt.firefly || pt.bubble) hole(pt.x - cx, pt.y - cy, 7, 0.5); });
    lg.globalCompositeOperation = 'source-over';
    G.ctx.drawImage(G.light, 0, 0);
    // coloured glow
    const g = G.ctx;
    g.globalCompositeOperation = 'lighter';
    glows.forEach(([x, y, r, col, a]) => {
      const grd = g.createRadialGradient(x, y, 0, x, y, r);
      grd.addColorStop(0, 'rgba(' + col + ',' + (a * (0.4 + night * 0.6)).toFixed(3) + ')'); grd.addColorStop(1, 'rgba(' + col + ',0)');
      g.fillStyle = grd; g.fillRect(x - r, y - r, r * 2, r * 2);
    });
    g.globalCompositeOperation = 'source-over';
  };

  G.worldToScreen = function (x, y) {
    return { x: (x - G.cam.x) * G.scale, y: (y - G.cam.y) * G.scale };
  };

  G.zoneName = function () {
    const p = G.player, L = FH.LANDMARKS;
    const tx = p.x / T, ty = p.y / T;
    if (Math.hypot(tx - L.den.x, ty - L.den.y) < 8) return "Belladonna's Den";
    if (Math.hypot(tx - (L.cottage.x - 3), ty - (L.cottage.y + 5)) < 11) return "Hazel's Garden";
    if (G.world.darkAt(p.x, p.y) > 0.5) return 'The Dark Wood';
    if (Math.hypot(tx - L.pond.x, ty - L.pond.y) < 9) return 'Mirror Pond';
    return 'Fernlight Meadow';
  };
})(window.FH);
