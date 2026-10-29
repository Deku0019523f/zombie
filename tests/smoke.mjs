// Test de fumée sans navigateur : DOM factice + simulation déterministe de plusieurs minutes de jeu,
// puis scénarios ciblés sur chaque mécanique (ennemis spéciaux, barils, perks, bonus...).
// Lancer : node tests/smoke.mjs

// ---- Aléatoire reproductible ----
let seed = 20261028;
Math.random = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

// ---- DOM factice ----
function fakeEl() {
  const e = {
    style: { setProperty() {} }, children: [], dataset: {}, className: '', textContent: '', clientWidth: 800, clientHeight: 500,
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    appendChild(c) { e.children.push(c); }, append(...c) { e.children.push(...c); },
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

let failed = 0;
const assert = (c, m) => {
  if (!c) { console.error('ÉCHEC :', m); failed++; }
};

const { state } = await import('../js/state.js');
const { input } = await import('../js/input.js');
const game = await import('../js/game.js');
const combat = await import('../js/combat.js');
const { spawnZombie, hurtPlayer } = await import('../js/zombies.js');
const { applyPerk } = await import('../js/perks.js');
const { PERKS, WEAPONS, ZOMBIES } = await import('../js/config.js');
const { pushOut } = await import('../js/layout.js');

const dt = 1 / 60;
state.w = 360;
state.h = 700;
game.initGame();
assert(state.phase === 'ready', 'phase initiale');
game.startGame();
assert(state.phase === 'playing' && state.wave === 1, 'démarrage vague 1');

// =====================================================================
// 1) Simulation d'un « bot » sur 10 minutes
// =====================================================================
let maxWave = 1;
let games = 0;
let perksChosen = 0;
const seenTypes = new Set();
const seenWeapons = new Set();
const seenThemes = new Set();
const seenPickups = new Set();
let sawDark = false;
let grenades = 0;

for (let f = 0; f < 60 * 60 * 10; f++) {
  if (state.phase === 'over') { games++; game.startGame(); }
  if (state.phase === 'perk') {
    assert(state.perkChoices.length > 0 && state.perkChoices.length <= 3, 'choix d\'amélioration valides');
    assert(new Set(state.perkChoices).size === state.perkChoices.length, 'choix tous différents');
    game.choosePerk(Math.floor(Math.random() * state.perkChoices.length));
    perksChosen++;
    continue;
  }
  const p = state.player;
  input.keys.clear();
  let best = null;
  let bd = Infinity;
  for (const z of state.zombies) {
    seenTypes.add(z.type);
    const d = Math.hypot(z.x - p.x, z.y - p.y);
    if (d < bd) { bd = d; best = z; }
  }
  // fuit le zombie le plus proche s'il est trop près, sinon tourne en rond
  if (best && bd < 75) {
    const fx = p.x - best.x;
    const fy = p.y - best.y;
    if (Math.abs(fx) > 8) input.keys.add(fx > 0 ? 'KeyD' : 'KeyA');
    if (Math.abs(fy) > 8) input.keys.add(fy > 0 ? 'KeyS' : 'KeyW');
  } else {
    input.keys.add(['KeyD', 'KeyS', 'KeyA', 'KeyW'][Math.floor(f / 90) % 4]);
  }
  if (best) { input.mouse.x = best.x; input.mouse.y = best.y; }
  input.aimSource = 'mouse';
  input.firing = true;
  input.clickBuffer = 0.15;
  if (f % 300 === 0) {
    const ids = Object.keys(WEAPONS).filter((id) => state.weapons[id].unlocked);
    state.current = ids[(f / 300) % ids.length | 0];
  }
  if (f % 240 === 0 && state.zombies.length >= 4 && combat.throwGrenade()) grenades++;
  seenWeapons.add(state.current);
  seenThemes.add(state.theme);
  for (const pk of state.pickups) seenPickups.add(pk.kind);
  if (state.dark) sawDark = true;

  game.update(dt);
  maxWave = Math.max(maxWave, state.wave);

  assert(Number.isFinite(p.x) && Number.isFinite(p.y), 'position joueur finie');
  assert(p.x >= 0 && p.x <= state.w && p.y >= 0 && p.y <= state.h, 'joueur dans l\'arène');
  assert(p.hp >= 0 && p.hp <= state.stats.maxHp + 1e-6, 'santé bornée');
  for (const w of Object.values(state.weapons)) assert(w.mag >= 0 && w.reserve >= 0, 'munitions positives');
  assert(state.zombies.length < 400, 'pas d\'explosion du nombre de zombies');
  for (const z of state.zombies) {
    assert(Number.isFinite(z.x) && Number.isFinite(z.y), 'position zombie finie');
    if (z.entered) {
      for (const s of state.solids) {
        const r = s.hit;
        assert(!(z.x > r.x && z.x < r.x + r.w && z.y > r.y && z.y < r.y + r.h), `zombie ${z.type} coincé dans un obstacle`);
      }
    }
  }
  if (failed > 5) break;
}

console.log(`Bot : vague max ${maxWave}, parties ${games + 1}, score ${state.score}, améliorations choisies ${perksChosen}, grenades ${grenades}`);
console.log(`  types : ${[...seenTypes].join(', ')}`);
console.log(`  thèmes : ${[...seenThemes].join(', ')} | nuit vue : ${sawDark}`);
console.log(`  bonus au sol : ${[...seenPickups].join(', ')} | armes : ${[...seenWeapons].join(', ')}`);
assert(maxWave >= 5, 'la progression de vagues fonctionne (vague 5 atteinte)');
assert(perksChosen >= 3, 'l\'écran d\'amélioration apparaît entre les vagues');
assert(seenTypes.has('runner') && seenTypes.has('spitter') && seenTypes.has('exploder'), 'ennemis spéciaux présents');
assert(seenThemes.size >= 3, 'plusieurs thèmes de vague différents');
assert(grenades > 0, 'la grenade est utilisable');

// =====================================================================
// 2) Scénarios ciblés
// =====================================================================
function scenario() {
  game.startGame();
  input.keys.clear();
  input.firing = false;
  input.clickBuffer = 0;
  input.aimSource = 'auto';
  state.waveState = 'perkwait';   // gèle le système de vagues
  state.queue = [];
  state.zombies = [];
  state.barrels = [];
  state.player.x = 180; state.player.y = 400;
}
const run = (n, fn) => { for (let i = 0; i < n; i++) { game.update(dt); if (fn) fn(i); } };
const place = (type, x, y) => { spawnZombie(type); const z = state.zombies[state.zombies.length - 1]; z.x = x; z.y = y; z.entered = true; return z; };

// Cracheur : lance de l'acide à distance
scenario();
let z = place('spitter', 180, 250);
z.shootT = 0.05;
let acidSeen = false;
run(180, () => { if (state.acid.length) acidSeen = true; });
assert(acidSeen, 'le cracheur lance de l\'acide');

// Cracheur : l'acide blessé le joueur
scenario();
state.acid.push({ x: 180, y: 380, vx: 0, vy: 90, life: 3, dead: false });
run(30);
assert(state.player.hp < 100, 'l\'acide blesse le joueur');

// Brute : préparation -> charge -> récupération
scenario();
z = place('charger', 180, 250);
z.chT = 0;
const sts = new Set();
run(240, () => sts.add(z.st));
assert(sts.has('tele') && sts.has('dash') && sts.has('recover'), `la brute enchaîne préparation/charge/récupération (${[...sts].join(',')})`);

// Explosif : explose au contact et blesse le joueur
scenario();
z = place('exploder', 190, 400);
run(10);
assert(z.dead && state.blasts.length > 0, 'l\'explosif explose au contact');
assert(state.player.hp < 100, 'l\'explosion blesse le joueur');

// Explosif tué à distance : pas de dégât au joueur, réaction en chaîne sur les voisins
scenario();
z = place('exploder', 180, 200);
const w1 = place('walker', 200, 205);
combat.explode(z.x, z.y, 46, { zDmg: 6, pDmg: 22 });
assert(w1.dead, 'l\'explosion tue les zombies proches');
assert(state.player.hp === 100, 'pas de dégât hors du rayon d\'explosion');

// Baril explosif : une balle le fait exploser, avec réaction en chaîne
scenario();
state.barrels = [
  { x: 180, y: 300, r: 9, hp: 1, dead: false, flash: 0 },
  { x: 215, y: 300, r: 9, hp: 3, dead: false, flash: 0 },
];
const near = place('walker', 200, 330);
state.bullets.push({ x: 150, y: 300, vx: 400, vy: 0, life: 1, dmg: 1, pierce: 0, hit: [], dead: false });
run(20);
assert(state.barrels.length === 0 || state.barrels.every((b) => b.dead), 'les barils en chaîne ont explosé');
assert(near.dead, 'le baril tue les zombies proches');

// Obstacles : bloquent le joueur et les balles
scenario();
const crate = state.solids.find((s) => s.kind === 'crate');
state.player.x = crate.hit.x + crate.hit.w / 2;
state.player.y = crate.hit.y + crate.hit.h / 2;
pushOut(state.player, state.solids, state.barrels);
const r = crate.hit;
assert(!(state.player.x > r.x && state.player.x < r.x + r.w && state.player.y > r.y && state.player.y < r.y + r.h), 'le joueur est repoussé hors d\'un obstacle');
state.bullets.push({ x: r.x - 10, y: r.y + r.h / 2, vx: 400, vy: 0, life: 1, dmg: 1, pierce: 0, hit: [], dead: false });
const behind = place('walker', r.x + r.w + 12, r.y + r.h / 2);
run(15);
assert(!behind.dead, 'un obstacle arrête les balles (couvert)');

// Améliorations : balles perforantes
scenario();
applyPerk('pierce');
assert(state.stats.pierce === 1, 'amélioration « perforantes » appliquée');
const a1 = place('walker', 180, 300);
const a2 = place('walker', 180, 270);
state.bullets.push({ x: 180, y: 340, vx: 0, vy: -400, life: 1, dmg: 1, pierce: state.stats.pierce, hit: [], dead: false });
run(20);
assert(a1.dead && a2.dead, 'une balle perforante traverse 2 zombies');

// Toutes les améliorations montent au maximum sans valeur absurde
scenario();
for (const [id, d] of Object.entries(PERKS)) for (let i = 0; i < d.max + 2; i++) { if ((state.perks[id] || 0) < d.max) applyPerk(id); }
assert(Object.values(state.stats).every(Number.isFinite), 'statistiques finies au niveau max');
assert(state.stats.maxHp === 200 && state.stats.armor > 0.5, 'maxHp / armure au max cohérents');

// Bouclier : aucun dégât
scenario();
state.buffs.shield = 5;
hurtPlayer(50);
assert(state.player.hp === 100, 'le bouclier bloque les dégâts');

// Gel : zombies ralentis
scenario();
z = place('walker', 180, 100);
const y0 = z.y;
run(60);
const freeFall = z.y - y0;
scenario();
state.buffs.freeze = 5;
z = place('walker', 180, 100);
const y1 = z.y;
run(60);
assert(z.y - y1 < freeFall * 0.6, 'le gel ralentit les zombies');

// Bombe nucléaire : tue tout sauf le boss
scenario();
const ws = [place('walker', 50, 100), place('runner', 300, 120), place('tank', 200, 150)];
const boss = place('boss', 180, 200);
combat.nuke();
assert(ws.every((q) => q.dead), 'la bombe tue tous les zombies');
assert(!boss.dead && boss.hp < ZOMBIES.boss.hp, 'le boss survit mais perd des PV');

// Combo : le multiplicateur augmente puis retombe
scenario();
for (let i = 0; i < 12; i++) { const q = place('walker', 20 + i * 5, 100); q.hp = 0.1; combat.explode(q.x, q.y, 5, { zDmg: 1 }); }
assert(state.combo.count >= 10, 'le combo compte les kills');
hurtPlayer(10);
assert(state.combo.count === 0, 'se faire toucher casse le combo');

// Grenade : tue un groupe
scenario();
const grp = [place('walker', 180, 300), place('walker', 195, 305), place('walker', 170, 310)];
assert(combat.throwGrenade(), 'lancer de grenade');
assert(state.grenadeCd > 0 && !combat.throwGrenade(), 'la grenade a un temps de recharge');
run(60);
assert(grp.every((q) => q.dead), 'la grenade tue le groupe visé');

// Pause / reprise
game.startGame();
game.togglePause();
assert(state.phase === 'paused', 'pause');
game.togglePause();
assert(state.phase === 'playing', 'reprise');

if (failed) { console.error(`\n${failed} vérification(s) en échec`); process.exit(1); }
console.log('\nTous les scénarios passent');
