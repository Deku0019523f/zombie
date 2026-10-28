// Entrées : clavier, souris, tactile (joystick gauche + bouton de tir rouge à visée automatique).
import { $ } from './dom.js';
import { state } from './state.js';
import { WEAPONS } from './config.js';

export const input = {
  keys: new Set(),
  mouse: { x: 0, y: 0 },
  aimSource: 'auto',  // 'auto' = vise le zombie le plus proche ; 'mouse' = vise la souris
  firing: false,
  clickBuffer: 0,     // mémorise un appui pendant 150 ms (armes semi-auto)
  joy: { x: 0, y: 0 },
};

const JOY_R = 40;
let joyId = null;
let fireId = null;

export const isFiring = () => input.firing || input.keys.has('Space');

export function resetInput() {
  input.keys.clear();
  input.firing = false;
  input.clickBuffer = 0;
  input.joy.x = 0;
  input.joy.y = 0;
  joyId = null;
  fireId = null;
  const knob = $('joyKnob');
  if (knob) knob.style.transform = 'translate(0px,0px)';
  const fire = $('btnFire');
  if (fire) fire.classList.remove('down');
}

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

// handlers : onGesture, onReload, onSwitch(id), onCycle, onPause, onConfirm
export function initInput(stage, canvas, h) {
  const joy = $('joy');
  const knob = $('joyKnob');
  const fire = $('btnFire');
  const weaponIds = Object.keys(WEAPONS);

  const logical = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * state.w) / r.width, y: ((e.clientY - r.top) * state.h) / r.height };
  };

  // ---- Clavier (e.code = position physique : ZQSD sur AZERTY = WASD) ----
  window.addEventListener('keydown', (e) => {
    h.onGesture();
    const c = e.code;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(c)) e.preventDefault();
    input.keys.add(c);
    if (e.repeat) return;
    if (c === 'Space') input.clickBuffer = 0.15;
    if (c === 'KeyR') h.onReload();
    else if (c === 'KeyE') h.onCycle();
    else if (c === 'KeyP' || c === 'Escape') h.onPause();
    else if (c === 'Digit1' || c === 'Numpad1') h.onSwitch(weaponIds[0]);
    else if (c === 'Digit2' || c === 'Numpad2') h.onSwitch(weaponIds[1]);
    else if (c === 'Digit3' || c === 'Numpad3') h.onSwitch(weaponIds[2]);
    else if ((c === 'Enter' || c === 'Space') && !(e.target.closest && e.target.closest('button'))) h.onConfirm();
  });
  window.addEventListener('keyup', (e) => input.keys.delete(e.code));

  // ---- Souris : vise au curseur, clic = tir ----
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    h.onGesture();
    input.aimSource = 'mouse';
    Object.assign(input.mouse, logical(e));
    input.firing = true;
    input.clickBuffer = 0.15;
    try { canvas.setPointerCapture(e.pointerId); } catch { /* ignoré */ }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    input.aimSource = 'mouse';
    Object.assign(input.mouse, logical(e));
  });
  const mouseUp = (e) => { if (e.pointerType === 'mouse') input.firing = false; };
  canvas.addEventListener('pointerup', mouseUp);
  canvas.addEventListener('pointercancel', mouseUp);

  // ---- Tactile : joystick (moitié gauche de l'écran) ----
  const updateJoy = (e) => {
    const r = joy.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy);
    if (d > JOY_R) { dx = (dx / d) * JOY_R; dy = (dy / d) * JOY_R; }
    const mag = Math.hypot(dx, dy) / JOY_R;
    if (mag < 0.12) { input.joy.x = 0; input.joy.y = 0; }
    else { input.joy.x = dx / JOY_R; input.joy.y = dy / JOY_R; }
    knob.style.transform = `translate(${dx}px,${dy}px)`;
  };
  stage.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    if (e.target.closest && e.target.closest('button, .overlay')) return;
    h.onGesture();
    const r = stage.getBoundingClientRect();
    if (joyId !== null || e.clientX - r.left > r.width * 0.55) return;
    joyId = e.pointerId;
    updateJoy(e);
    try { stage.setPointerCapture(e.pointerId); } catch { /* ignoré */ }
    e.preventDefault();
  });
  stage.addEventListener('pointermove', (e) => { if (e.pointerId === joyId) updateJoy(e); });
  const joyEnd = (e) => {
    if (e.pointerId !== joyId) return;
    joyId = null;
    input.joy.x = 0;
    input.joy.y = 0;
    knob.style.transform = 'translate(0px,0px)';
  };
  stage.addEventListener('pointerup', joyEnd);
  stage.addEventListener('pointercancel', joyEnd);

  // ---- Tactile : bouton de tir rouge (maintenir = tirer, visée automatique) ----
  fire.addEventListener('pointerdown', (e) => {
    h.onGesture();
    fireId = e.pointerId;
    input.aimSource = 'auto';
    input.firing = true;
    input.clickBuffer = 0.15;
    fire.classList.add('down');
    try { fire.setPointerCapture(e.pointerId); } catch { /* ignoré */ }
    e.preventDefault();
    e.stopPropagation();
  });
  const fireEnd = (e) => {
    if (e.pointerId !== fireId) return;
    fireId = null;
    input.firing = false;
    fire.classList.remove('down');
  };
  fire.addEventListener('pointerup', fireEnd);
  fire.addEventListener('pointercancel', fireEnd);
}
