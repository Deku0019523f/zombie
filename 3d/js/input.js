// Entrées : joystick flottant à gauche, glisser à droite pour regarder, boutons tactiles, clavier + souris.
const $ = (id) => document.getElementById(id);

export function createInput() {
  const st = { mx: 0, my: 0, fire: false, sprint: false, reload: false, swap: 0, select: 0, pause: false, lookX: 0, lookY: 0 };
  const keys = new Set();
  let stickOn = false, mouseFire = false, btnFire = false, btnSprint = false;

  // ----- joystick (toute la moitié gauche de l'écran) -----
  const zone = $('stickZone'), base = $('stickBase'), knob = $('stickKnob'), R = 56;
  let sid = null, ox = 0, oy = 0;
  zone.addEventListener('pointerdown', (e) => {
    if (sid !== null) return; sid = e.pointerId; zone.setPointerCapture(sid);
    ox = e.clientX; oy = e.clientY; stickOn = true;
    base.style.left = ox + 'px'; base.style.top = oy + 'px'; base.style.bottom = 'auto'; base.classList.add('on');
    e.preventDefault();
  });
  zone.addEventListener('pointermove', (e) => {
    if (e.pointerId !== sid) return;
    const dx = e.clientX - ox, dy = e.clientY - oy, l = Math.hypot(dx, dy), k = l > R ? R / l : 1;
    knob.style.transform = `translate(${dx * k}px,${dy * k}px)`;
    st.mx = (dx * k) / R; st.my = -(dy * k) / R;
  });
  const stickEnd = (e) => {
    if (e.pointerId !== sid) return; sid = null; stickOn = false; st.mx = st.my = 0;
    knob.style.transform = ''; base.classList.remove('on'); base.style.left = base.style.top = base.style.bottom = '';
  };
  zone.addEventListener('pointerup', stickEnd); zone.addEventListener('pointercancel', stickEnd);

  // ----- regard (glisser sur la moitié droite) -----
  const look = $('lookZone'); let lid = null, lx = 0, ly = 0;
  look.addEventListener('pointerdown', (e) => { if (lid !== null) return; lid = e.pointerId; look.setPointerCapture(lid); lx = e.clientX; ly = e.clientY; e.preventDefault(); });
  look.addEventListener('pointermove', (e) => { if (e.pointerId !== lid) return; st.lookX += e.clientX - lx; st.lookY += e.clientY - ly; lx = e.clientX; ly = e.clientY; });
  const lookEnd = (e) => { if (e.pointerId === lid) lid = null; };
  look.addEventListener('pointerup', lookEnd); look.addEventListener('pointercancel', lookEnd);

  // ----- boutons -----
  const hold = (el, on, off, drag) => {
    let id = null, px = 0, py = 0;
    el.addEventListener('pointerdown', (e) => { if (id !== null) return; id = e.pointerId; el.setPointerCapture(id); px = e.clientX; py = e.clientY; el.classList.add('down'); on(); e.preventDefault(); e.stopPropagation(); });
    el.addEventListener('pointermove', (e) => { if (e.pointerId !== id || !drag) return; st.lookX += e.clientX - px; st.lookY += e.clientY - py; px = e.clientX; py = e.clientY; });
    const end = (e) => { if (e.pointerId !== id) return; id = null; el.classList.remove('down'); off(); };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  };
  hold($('btnFire'), () => { btnFire = true; }, () => { btnFire = false; }, true);   // on peut viser en tirant
  hold($('btnSprint'), () => { btnSprint = true; }, () => { btnSprint = false; });
  hold($('btnReload'), () => { st.reload = true; }, () => {});
  hold($('btnSwap'), () => { st.swap = 1; }, () => {});
  hold($('btnPause'), () => { st.pause = true; }, () => {});

  // ----- clavier / souris (ordinateur) -----
  const canvas = $('gl');
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return; keys.add(e.code);
    if (e.code === 'KeyR') st.reload = true;
    else if (e.code === 'KeyE' || e.code === 'KeyX') st.swap = 1;
    else if (e.code === 'Escape' || e.code === 'KeyP') st.pause = true;
    else if (/^Digit[1-4]$/.test(e.code)) st.select = +e.code.slice(5);
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => { keys.clear(); mouseFire = false; });
  canvas.addEventListener('mousedown', (e) => { if (e.button === 0) { if (document.pointerLockElement !== canvas) canvas.requestPointerLock?.(); mouseFire = true; } });
  window.addEventListener('mouseup', (e) => { if (e.button === 0) mouseFire = false; });
  window.addEventListener('mousemove', (e) => { if (document.pointerLockElement === canvas) { st.lookX += e.movementX; st.lookY += e.movementY; } });
  window.addEventListener('wheel', (e) => { if (e.deltaY) st.swap = e.deltaY > 0 ? 1 : -1; }, { passive: true });
  window.addEventListener('contextmenu', (e) => e.preventDefault());

  return {
    isTouchLike: () => stickOn || sid !== null,
    poll() {
      let mx = st.mx, my = st.my;
      if (!stickOn) {
        const k = (...c) => (c.some(x => keys.has(x)) ? 1 : 0);   // ZQSD (AZERTY) et WASD (QWERTY) + flèches
        mx = k('KeyD', 'ArrowRight') - k('KeyA', 'KeyQ', 'ArrowLeft');
        my = k('KeyW', 'KeyZ', 'ArrowUp') - k('KeyS', 'ArrowDown');
      }
      const o = { mx, my, fire: btnFire || mouseFire || keys.has('Space'), sprint: btnSprint || keys.has('ShiftLeft') || keys.has('ShiftRight'), reload: st.reload, swap: st.swap, select: st.select, pause: st.pause };
      st.reload = false; st.swap = 0; st.select = 0; st.pause = false;
      return o;
    },
    takeLook() { const l = { x: st.lookX, y: st.lookY }; st.lookX = st.lookY = 0; return l; },
    clear() { keys.clear(); st.mx = st.my = 0; btnFire = btnSprint = mouseFire = false; },
  };
}
