// Entrées clavier / souris / tactile (joystick gauche, visée + tir à droite).
import { $ } from './dom.js';
import { WEAPONS } from './config.js';

export const input = {
  keys: new Set(),
  mouse: { x: 0, y: 0 },
  aim: { x: 0, y: 0 },
  aimSource: 'mouse',
  firing: false,
  clickBuffer: 0,     // mémorise un clic pendant 150 ms (armes semi-auto)
  joy: { x: 0, y: 0 },
};

const JOY_R = 50;
let joyId = null;
let aimId = null;
let joyOrigin = { x: 0, y: 0 };

export function resetInput() {
  input.keys.clear();
  input.firing = false;
  input.clickBuffer = 0;
  input.joy.x = 0;
  input.joy.y = 0;
  joyId = null;
  aimId = null;
  const joy = $('joy');
  if (joy) joy.classList.remove('show');
}

export const getAim = () => (input.aimSource === 'touch' ? input.aim : input.mouse);

export function getMove() {
  const k = input.keys;
  let x = 0;
  let y = 0;
  if (k.has('KeyW') || k.has('ArrowUp')) y--;
  if (k.has('KeyS') || k.has('ArrowDown')) y++;
  if (k.has('KeyA') || k.has('ArrowLeft')) x--;
  if (k.has('KeyD') || k.has('ArrowRight')) x++;
  if (x || y) {
    const l = Math.hypot(x, y);
    return { x: x / l, y: y / l };
  }
  return { x: input.joy.x, y: input.joy.y };
}

// handlers : onReload, onSwitch(id), onPause, onConfirm, onGesture
export function initInput(arena, h) {
  const joy = $('joy');
  const knob = $('joyKnob');
  const weaponIds = Object.keys(WEAPONS);

  const pos = (e) => {
    const r = arena.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width };
  };

  // ---- Clavier (e.code = position physique : ZQSD sur AZERTY = WASD) ----
  window.addEventListener('keydown', (e) => {
    h.onGesture();
    const c = e.code;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(c)) e.preventDefault();
    input.keys.add(c);
    if (e.repeat) return;
    if (c === 'KeyR') h.onReload();
    else if (c === 'KeyP' || c === 'Escape') h.onPause();
    else if (c === 'Digit1' || c === 'Numpad1') h.onSwitch(weaponIds[0]);
    else if (c === 'Digit2' || c === 'Numpad2') h.onSwitch(weaponIds[1]);
    else if (c === 'Digit3' || c === 'Numpad3') h.onSwitch(weaponIds[2]);
    else if ((c === 'Enter' || c === 'Space') && !(e.target.closest && e.target.closest('button'))) h.onConfirm();
  });
  window.addEventListener('keyup', (e) => input.keys.delete(e.code));

  // ---- Pointeur (souris + tactile) ----
  arena.addEventListener('contextmenu', (e) => e.preventDefault());

  arena.addEventListener('pointerdown', (e) => {
    h.onGesture();
    const p = pos(e);
    if (e.pointerType === 'mouse') {
      if (e.button !== 0) return;
      input.aimSource = 'mouse';
      input.mouse.x = p.x;
      input.mouse.y = p.y;
      input.firing = true;
      input.clickBuffer = 0.15;
    } else if (p.x < p.w / 2 && joyId === null) {
      joyId = e.pointerId;
      joyOrigin = { x: p.x, y: p.y };
      joy.style.left = `${p.x - JOY_R}px`;
      joy.style.top = `${p.y - JOY_R}px`;
      knob.style.transform = 'translate(0px,0px)';
      joy.classList.add('show');
    } else if (aimId === null) {
      aimId = e.pointerId;
      input.aimSource = 'touch';
      input.aim.x = p.x;
      input.aim.y = p.y;
      input.firing = true;
      input.clickBuffer = 0.15;
    } else {
      return;
    }
    try { arena.setPointerCapture(e.pointerId); } catch { /* ignoré */ }
    e.preventDefault();
  });

  arena.addEventListener('pointermove', (e) => {
    const p = pos(e);
    if (e.pointerType === 'mouse') {
      input.aimSource = 'mouse';
      input.mouse.x = p.x;
      input.mouse.y = p.y;
    } else if (e.pointerId === joyId) {
      let dx = p.x - joyOrigin.x;
      let dy = p.y - joyOrigin.y;
      const d = Math.hypot(dx, dy);
      if (d > JOY_R) { dx = (dx / d) * JOY_R; dy = (dy / d) * JOY_R; }
      const mag = Math.hypot(dx, dy) / JOY_R;
      if (mag < 0.15) { input.joy.x = 0; input.joy.y = 0; }
      else { input.joy.x = dx / JOY_R; input.joy.y = dy / JOY_R; }
      knob.style.transform = `translate(${dx}px,${dy}px)`;
    } else if (e.pointerId === aimId) {
      input.aim.x = p.x;
      input.aim.y = p.y;
    }
  });

  const end = (e) => {
    if (e.pointerType === 'mouse') {
      input.firing = false;
    } else if (e.pointerId === joyId) {
      joyId = null;
      input.joy.x = 0;
      input.joy.y = 0;
      joy.classList.remove('show');
    } else if (e.pointerId === aimId) {
      aimId = null;
      input.firing = false;
    }
  };
  arena.addEventListener('pointerup', end);
  arena.addEventListener('pointercancel', end);
}
