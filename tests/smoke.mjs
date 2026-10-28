// Test de fumée sans navigateur : DOM factice + simulation de plusieurs minutes de jeu.
// Lancer : node tests/smoke.mjs
function fakeEl() {
  const e = {
    style: {}, children: [], dataset: {}, className: '', textContent: '', clientWidth: 800, clientHeight: 500,
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    appendChild(c) { e.children.push(c); },
    remove() {}, addEventListener() {}, setAttribute() {}, blur() {},
    querySelector: () => fakeEl(), querySelectorAll: () => [],
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 500 }),
  };
  return e;
}
globalThis.document = {
  getElementById: () => fakeEl(),
  createElement: () => fakeEl(),
  querySelectorAll: () => [],
  documentElement: {},
  addEventListener() {},
};
globalThis.window = globalThis;
const store = {};
globalThis.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = v; },
};

const assert = (c, m) => { if (!c) { console.error('ÉCHEC :', m); process.exit(1); } };

const { state } = await import('../js/state.js');
const { input } = await import('../js/input.js');
const game = await import('../js/game.js');
const { WEAPONS } = await import('../js/config.js');

state.w = 800;
state.h = 500;
game.initGame();
assert(state.phase === 'ready', 'phase initiale');

game.startGame();
assert(state.phase === 'playing' && state.wave === 1, 'démarrage vague 1');

const dt = 1 / 60;
let maxWave = 1;
let games = 0;
const seenTypes = new Set();
const seenWeapons = new Set();

// Bot : se déplace en cercle, vise le zombie le plus proche, tire en continu, change d'arme.
for (let f = 0; f < 60 * 60 * 6; f++) {
  if (state.phase === 'over') { games++; game.startGame(); }
  const p = state.player;
  input.keys.clear();
  const phase = Math.floor(f / 90) % 4;
  input.keys.add(['KeyD', 'KeyS', 'KeyA', 'KeyW'][phase]);
  let best = null;
  let bd = Infinity;
  for (const z of state.zombies) {
    seenTypes.add(z.type);
    const d = Math.hypot(z.x - p.x, z.y - p.y);
    if (d < bd) { bd = d; best = z; }
  }
  if (best) { input.mouse.x = best.x; input.mouse.y = best.y; }
  input.aimSource = 'mouse';
  input.firing = true;
  input.clickBuffer = 0.15;
  if (f % 300 === 0) {
    const ids = Object.keys(WEAPONS).filter((id) => state.weapons[id].unlocked);
    state.current = ids[(f / 300) % ids.length | 0];
  }
  seenWeapons.add(state.current);
  game.update(dt);
  maxWave = Math.max(maxWave, state.wave);

  assert(Number.isFinite(p.x) && Number.isFinite(p.y), 'position joueur finie');
  assert(p.x >= 0 && p.x <= state.w && p.y >= 0 && p.y <= state.h, 'joueur dans l’arène');
  assert(p.hp >= 0 && p.hp <= 100, 'santé bornée');
  for (const w of Object.values(state.weapons)) assert(w.mag >= 0 && w.reserve >= 0, 'munitions positives');
  assert(state.zombies.length < 400, 'pas d’explosion du nombre de zombies');
}

console.log(`OK — vague max ${maxWave}, parties jouées ${games + 1}, score final ${state.score}`);
console.log(`Types vus : ${[...seenTypes].join(', ')} | armes utilisées : ${[...seenWeapons].join(', ')}`);
assert(maxWave >= 3, 'la progression de vagues fonctionne');
assert(seenTypes.has('runner'), 'des runners apparaissent');

// Pause / reprise
game.startGame();
game.togglePause();
assert(state.phase === 'paused', 'pause');
game.togglePause();
assert(state.phase === 'playing', 'reprise');
console.log('Pause/reprise OK');
