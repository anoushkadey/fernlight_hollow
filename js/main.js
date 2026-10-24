// Boot, input and the frame loop.
(function (FH) {
  'use strict';

  const G = FH.game, UI = FH.ui;
  const GAME_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyE', 'KeyQ', 'KeyB', 'KeyI', 'Enter', 'Escape', 'ShiftLeft', 'ShiftRight', 'KeyX', 'KeyR', 'BracketLeft', 'BracketRight', 'Backspace'];

  function onKey(code) {
    if (UI.handleKey(code)) { G.keys = {}; return; }
    if (G.mode !== 'play' || G.paused) return;
    if (code === 'KeyE' || code === 'Space' || code === 'Enter') G.interact();
    else if (code === 'KeyQ') G.useAbility();
    else if (code === 'KeyB' || code === 'KeyI' || code === 'Tab') UI.openBook('basket');
    else if (code === 'KeyJ') UI.openBook('journal');
    else if (code === 'Escape') UI.pause();
  }

  window.addEventListener('keydown', (e) => {
    if (GAME_KEYS.includes(e.code)) e.preventDefault();
    FH.audio.start();
    if (e.repeat) { if (!UI.top()) G.keys[e.code] = true; return; }
    G.keys[e.code] = true;
    onKey(e.code);
  });
  window.addEventListener('keyup', (e) => { G.keys[e.code] = false; });
  window.addEventListener('blur', () => { G.keys = {}; });
  window.addEventListener('pointerdown', () => FH.audio.start(), { once: false });

  // ---------- touch controls ----------
  function setupTouch() {
    const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    if (!coarse && !('ontouchstart' in window)) return;
    document.body.classList.add('touch');
    const t = document.getElementById('touch');
    t.innerHTML = `<div class="stick"><div class="knob"></div></div>
      <div class="tbtns"><button data-k="KeyE" class="tb a">E</button><button data-k="KeyQ" class="tb q">Q</button><button data-k="KeyB" class="tb b">${UI.iconImg('basket', 2)}</button><button data-k="Escape" class="tb p">II</button><button data-k="run" class="tb r">Run</button></div>`;
    G.touch = { dx: 0, dy: 0, run: false };
    const stick = t.querySelector('.stick'), knob = t.querySelector('.knob');
    let id = null, ox = 0, oy = 0;
    stick.addEventListener('pointerdown', (e) => { id = e.pointerId; const r = stick.getBoundingClientRect(); ox = r.left + r.width / 2; oy = r.top + r.height / 2; stick.setPointerCapture(id); move(e); });
    const move = (e) => {
      if (e.pointerId !== id) return;
      let dx = e.clientX - ox, dy = e.clientY - oy;
      const m = Math.hypot(dx, dy), max = 44;
      if (m > max) { dx = dx / m * max; dy = dy / m * max; }
      knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
      G.touch.dx = Math.abs(dx) > 8 ? dx / max : 0; G.touch.dy = Math.abs(dy) > 8 ? dy / max : 0;
    };
    const end = (e) => { if (e.pointerId !== id) return; id = null; knob.style.transform = ''; G.touch.dx = G.touch.dy = 0; };
    stick.addEventListener('pointermove', move);
    stick.addEventListener('pointerup', end); stick.addEventListener('pointercancel', end);
    t.querySelectorAll('.tb').forEach(b => {
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        FH.audio.start();
        if (b.dataset.k === 'run') { G.touch.run = !G.touch.run; b.classList.toggle('on', G.touch.run); return; }
        onKey(b.dataset.k);
      });
    });
  }

  // ---------- loop ----------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    G.update(dt);
    G.render();
    UI.frame(dt);
    requestAnimationFrame(frame);
  }

  function boot() {
    G.init();
    setupTouch();
    UI.title();
    document.getElementById('loading').classList.add('done');
    requestAnimationFrame(frame);
  }
  window.addEventListener('beforeunload', () => G.save());
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 30));
  else setTimeout(boot, 30);
})(window.FH);
