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
state.vw = 360;
state.vh = 700;
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
const place = (type, x, y) => { spawnZombie(type, { elite: false }); const z = state.zombies[state.zombies.length - 1]; z.x = x; z.y = y; z.entered = true; return z; };

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
assert(Object.values(state.stats).filter((v) => typeof v === 'number').every(Number.isFinite), 'statistiques finies au niveau max');
// 100 + 20×5 (costaud) − 20 (pacte) = 180, puis ×0,7 (canon de verre) = 126
assert(state.stats.maxHp === 126 && state.stats.armor > 0.5, 'maxHp / armure au max cohérents (malus des perks risqués inclus)');

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


// ---- Tir : portée, modes (semi / auto / rafale / charge) ----
const weapons = await import('../js/weapons.js');
const { FIRE_MODES } = await import('../js/config.js');
const press = () => { input.firing = true; input.clickBuffer = 0.15; };
const release = () => { input.firing = false; };
const fireTest = (mode, fn) => {
  scenario();
  state.player.angle = -Math.PI / 2;           // vers le haut
  weapons.setMode('pistol', mode);
  state.weapons.pistol.mag = 12;
  state.bullets = [];
  fn();
};

// Portée : une balle disparaît après `range` px (elle ne touche pas un zombie plus loin)
fireTest('semi', () => {
  const far = place('walker', 180, 400 - WEAPONS.pistol.range - 60);   // hors de portée, droit devant
  far.speed = 0;
  state.player.angle = -Math.PI / 2;
  press(); run(2); release();
  run(90);
  assert(!far.dead && far.hp === far.maxHp, 'une balle n\'atteint pas un zombie hors de portée');
  assert(state.bullets.length === 0, 'les balles disparaissent en fin de portée');
});
fireTest('semi', () => {
  const near = place('walker', 180, 400 - WEAPONS.pistol.range + 40);
  near.speed = 0; near.hp = near.maxHp = 1;
  press(); run(2); release();
  run(60);
  assert(near.dead, 'une balle atteint un zombie dans la portée');
});

// Semi : maintenir ne tire qu'une fois
fireTest('semi', () => {
  press(); input.clickBuffer = 0.15;
  run(40, () => { input.firing = true; });     // bouton maintenu, un seul appui
  assert(state.weapons.pistol.mag === 11, `semi : un seul tir par appui (reste ${state.weapons.pistol.mag})`);
  release();
  press(); run(2); release();
  run(30);
  assert(state.weapons.pistol.mag === 10, 'semi : un second appui tire à nouveau');
});

// Auto : maintenir tire en continu
fireTest('auto', () => {
  input.firing = true; input.clickBuffer = 0.15;
  run(60, () => { input.firing = true; });
  release();
  assert(state.weapons.pistol.mag <= 12 - 4, `auto : tir continu (reste ${state.weapons.pistol.mag})`);
});

// Rafale : 3 balles par appui, puis pause
fireTest('burst', () => {
  press(); run(3); release();
  run(20);
  assert(state.weapons.pistol.mag === 9, `rafale : 3 balles par appui (reste ${state.weapons.pistol.mag})`);
});

// Charge : un tir chargé fait plus de dégâts, va plus loin et perfore ; un tap = tir normal
fireTest('charge', () => {
  press();
  run(Math.ceil((FIRE_MODES.charge.time + 0.1) / dt), () => { input.firing = true; });
  assert(state.charge >= FIRE_MODES.charge.time - 0.01, 'charge : la jauge se remplit en maintenant');
  release();
  run(1);
  const b = state.bullets[0];
  assert(b && b.big && b.dmg > 3 && b.pierce >= 2, 'charge : balle puissante et perforante');
  assert(b.maxLife * Math.hypot(b.vx, b.vy) > WEAPONS.pistol.range * 1.4, 'charge : portée augmentée');
  assert(state.charge === 0, 'charge : jauge remise à zéro');
});
fireTest('charge', () => {
  press(); run(3); release(); run(2);
  const b = state.bullets[0];
  assert(b && !b.big && state.weapons.pistol.mag === 11, 'charge : un simple appui = tir normal');
});

// Changer d'arme / pause annule la charge ; cycleMode parcourt les modes de l'arme
fireTest('charge', () => {
  press(); run(20, () => { input.firing = true; });
  game.pauseGame();
  assert(state.charge === 0, 'la pause annule la charge');
  game.resumeGame();
});
scenario();
const m0 = weapons.modeOf('pistol');
const seen = new Set([m0]);
for (let i = 0; i < 6; i++) seen.add(weapons.cycleMode('pistol'));
assert(WEAPONS.pistol.modes.every((m) => seen.has(m)), 'cycleMode parcourt tous les modes du pistolet');
assert(JSON.parse(store['zombie.modes']).pistol === weapons.modeOf('pistol'), 'le mode de tir est sauvegardé');
weapons.loadModes({ pistol: 'inconnu', smg: 'burst' });
assert(weapons.modeOf('pistol') === 'semi' && weapons.modeOf('smg') === 'burst', 'loadModes valide les modes enregistrés');

// ---- Campagne ----
const camp = await import('../js/campaign.js');
const { getProgress } = await import('../js/storage.js');
assert(camp.LEVELS.length === 10, '10 niveaux');
assert(camp.starsFor(1) === 3 && camp.starsFor(0.6) === 2 && camp.starsFor(0.2) === 1, 'étoiles selon les PV restants');

game.startGame('campaign', 2);
assert(state.mode === 'campaign' && state.level.id === 2 && state.wave === 2 && state.waveNo === 1, 'niveau 2 : démarre à la bonne difficulté');
const lv = state.level;
let guard = 0;
while (state.phase !== 'over' && guard++ < 20000) {
  // vague nettoyée instantanément : on vide la file et les zombies, on choisit toujours la 1re amélioration
  state.queue = []; state.zombies = [];
  if (state.phase === 'perk') game.choosePerk(0);
  game.update(dt);
}
assert(state.won && state.waveNo === lv.waves, `le niveau se termine après ${lv.waves} vagues (vague ${state.waveNo})`);
assert(state.stars === 3, 'victoire sans dégât = 3 étoiles');
let prog = getProgress();
assert(prog.unlocked === 3 && prog.stars[2] === 3, 'la victoire débloque le niveau suivant et enregistre les étoiles');

// Une victoire moins bonne n'écrase pas les étoiles
game.startGame('campaign', 2);
state.player.hp = state.stats.maxHp * 0.3;
guard = 0;
while (state.phase !== 'over' && guard++ < 20000) { state.queue = []; state.zombies = []; if (state.phase === 'perk') game.choosePerk(0); state.player.hp = Math.min(state.player.hp, 30); game.update(dt); }
prog = getProgress();
assert(state.won && state.stars === 1 && prog.stars[2] === 3, 'les étoiles ne baissent jamais');

// Niveau verrouillé / thèmes imposés / boss final
game.startGame('campaign', 5);
assert(state.level.boss === 1 && state.level.kit === 2, 'niveau 5 : boss et équipement de départ');
assert(Object.values(state.perks).reduce((a, b) => a + b, 0) === 2, 'l\'équipement de départ est appliqué');
state.waveNo = state.level.waves; state.wave = state.level.from + state.level.waves - 1;
game.startGame('campaign', 1);
// défaite
state.player.hp = 0.1;
hurtPlayer(50);
game.update(dt);
assert(state.phase === 'over' && !state.won, 'défaite en campagne');
game.goMenu();
assert(state.phase === 'ready', 'retour au menu principal');
game.startGame();
assert(state.mode === 'survival' && state.level === null, 'la survie reste disponible');


// =====================================================================
// v2.5 : critiques, esquive, élites, invocateur, événements, objectifs, pièces, atelier, synergies
// =====================================================================
const objectives = await import('../js/objectives.js');
const events = await import('../js/events.js');
const storage = await import('../js/storage.js');
const stats = await import('../js/stats.js');
const screens = await import('../js/screens.js');
const { startDash } = await import('../js/player.js');
const { synergyFor, rollChoices } = await import('../js/perks.js');
const { spawnPickup } = await import('../js/pickups.js');
const { INFUSE, DASH, OBJ, ELITE, COINS, SYNERGIES } = await import('../js/config.js');

// --- Tir critique : centre = ×critMult, bord = dégâts normaux ---
scenario();
let tk = place('tank', 180, 300);
state.bullets.push({ x: 180, y: 340, vx: 0, vy: -400, life: 1, dmg: 1, pierce: 0, hit: [], dead: false });
run(15);
assert(Math.abs((tk.maxHp - tk.hp) - state.stats.critMult) < 1e-6, `balle au centre = critique (${tk.maxHp - tk.hp})`);
state.zombies = [];
tk = place('tank', 180, 300);
state.bullets.push({ x: 189, y: 340, vx: 0, vy: -400, life: 1, dmg: 1, pierce: 0, hit: [], dead: false });
run(15);
assert(Math.abs((tk.maxHp - tk.hp) - 1) < 1e-6, 'balle sur le bord = dégâts normaux');

// --- Esquive ---
scenario();
const px0 = state.player.x;
input.keys.add('KeyD');
assert(startDash() === true, 'l\'esquive démarre');
assert(startDash() === false, 'pas de seconde esquive pendant la recharge');
assert(state.player.hitTimer >= DASH.invuln - 1e-6, 'invulnérable pendant l\'esquive');
run(14);
input.keys.clear();
assert(state.player.x - px0 > 40, `l'esquive déplace le joueur (${(state.player.x - px0).toFixed(1)} px)`);
const cd0 = state.dash.cd;
assert(cd0 > 2 && cd0 <= state.stats.dashCd, 'recharge de l\'esquive en cours');
run(60 * 4);
assert(state.dash.cd === 0 && startDash(), 'l\'esquive est de nouveau disponible');
// synergie « fantôme » : l'esquive blesse
scenario();
state.perks = { speed: 1, dash: 1 };
state.stats = stats.computeStats(state.perks);
assert(state.stats.syn.ghost, 'synergie fantôme active');
const gz = place('tank', state.player.x + 22, state.player.y);
input.keys.add('KeyD');
startDash();
run(12);
input.keys.clear();
assert(gz.hp < gz.maxHp, 'l\'esquive « fantôme » blesse les zombies traversés');

// --- Élites ---
scenario();
const ea = spawnZombie('walker', { elite: 'armored' });
assert(ea.elite === 'armored' && ea.maxHp >= 2 && ea.score === ZOMBIES.walker.score * ELITE.scoreMult, 'élite blindée : PV et score multipliés');
const en = spawnZombie('walker', { elite: false });
assert(en.elite === null, 'elite:false force un zombie normal');
state.zombies = [];
state.wave = 12;
let nElite = 0;
for (let i = 0; i < 300; i++) { const e = spawnZombie('walker'); if (e.elite) nElite++; }
assert(nElite > 15 && nElite < 120, `des élites apparaissent à haute vague (${nElite}/300)`);
state.zombies = [];
state.wave = 1;
assert(!spawnZombie('walker').elite, 'pas d\'élite avant la vague 4');
// volatile : explose à la mort
scenario();
const ev = place('walker', state.player.x + 20, state.player.y);
ev.elite = 'volatile'; ev.hp = 1;
const hpBefore = state.player.hp;
combat.explode; // (import utilisé ailleurs)
const { damageZombie } = await import('../js/zombies.js');
damageZombie(ev, 5, 1, 0);
assert(state.player.hp < hpBefore, 'l\'élite volatile explose à sa mort');
// soigneur : soigne les voisins
scenario();
const hl = place('walker', 100, 200); hl.elite = 'healer'; hl.healT = 0.01;
const hurt = place('tank', 120, 200); hurt.hp = 1;
run(5);
assert(hurt.hp > 1, 'l\'élite soigneuse soigne les zombies proches');

// --- Invocateur ---
scenario();
const sm = place('summoner', 180, 150);
sm.summT = 0.02; sm.hold = 100;
run(5);
assert(state.zombies.length >= 3, `l'invocateur fait surgir des zombies (${state.zombies.length})`);
assert(state.zombies.filter((q) => q.type !== 'summoner').every((q) => q.elite === null), 'les zombies invoqués ne sont jamais élites');

// --- Événements ---
scenario();
events.fireEvent('ambush');
assert(state.zombies.length >= 6, 'embuscade : des zombies surgissent');
state.zombies = [];
events.fireEvent('blackout');
assert(state.dark && state.darkT > 0, 'panne de courant : noir');
state.theme = 'normal'; state.waveState = 'perkwait';
run(60 * 13);
assert(!state.dark, 'la lumière revient après la panne');
events.fireEvent('airdrop');
assert(state.pickups.some((pk) => pk.kind === 'drop'), 'caisse larguée');
state.player.hp = 50;
const dp = state.pickups.find((pk) => pk.kind === 'drop');
state.player.x = dp.x; state.player.y = dp.y;
run(3);
assert(state.player.hp > 50 && !state.pickups.some((pk) => pk.kind === 'drop'), 'la caisse larguée donne soin et bonus');
state.waveState = 'spawning'; state.queue = ['walker'];
events.scheduleEvent(5, false);
assert(state.eventT >= 9 && state.eventT <= 16, 'un événement est programmé à partir de la vague 3');
events.scheduleEvent(5, true);
assert(state.eventT === 0, 'pas d\'événement sur une vague de boss');
events.scheduleEvent(2, false);
assert(state.eventT === 0, 'pas d\'événement avant la vague 3');

// --- Objectif : générateur ---
game.startGame('campaign', 4);
assert(state.gen && state.gen.hp === OBJ.generator.hp, 'niveau 4 : générateur à défendre');
state.waveState = 'perkwait'; state.queue = []; state.zombies = [];
state.player.x = 40; state.player.y = 560;
const gwk = place('walker', state.gen.x + 20, state.gen.y);
run(60 * 4);
assert(state.gen.hp < OBJ.generator.hp, 'les zombies attaquent le générateur');
state.zombies = [];
const lowHp = state.gen.hp;
state.player.x = state.gen.x + 20; state.player.y = state.gen.y;
run(60);
assert(state.gen.hp > lowHp, 'rester à côté répare le générateur');
state.gen.hp = 0.5;
const gx = place('walker', state.gen.x + 14, state.gen.y);
state.player.x = 40; state.player.y = 560;
run(60 * 3);
assert(state.phase === 'over' && state.deathCause === 'gen', 'générateur détruit = défaite');

// --- Objectif : zone à tenir ---
scenario();
state.mode = 'survival'; state.level = null; state.wave = 4;
objectives.startWaveObjectives(4, false);
assert(state.zone, 'survie vague 4 : zone à tenir');
const sc0 = state.score;
state.waveState = 'spawning'; state.queue = []; state.zombies = [];
state.player.x = state.zone.x; state.player.y = state.zone.y;
const need = state.zone.need;
run(Math.ceil(need * 60) + 30);
assert(!state.zone && state.score > sc0, 'zone tenue : récompense et objectif terminé');
// hors zone : la vague ne finit pas avant la fin de l'objectif
scenario();
state.wave = 4; state.waveState = 'spawning'; state.queue = []; state.zombies = [];
objectives.startWaveObjectives(4, false);
state.player.x = 20; state.player.y = 600;
run(60 * 5);
assert(state.waveState === 'spawning' && state.zombies.length > 0, 'zone active : la vague continue (renforts au compte-gouttes)');
state.zone.left = 0.01;
state.zombies = [];
run(5);
assert(!state.zone, 'la zone expire (pas de blocage définitif)');

// --- Objectif : survivant → allié ---
scenario();
state.mode = 'survival'; state.level = null; state.wave = 3;
objectives.startWaveObjectives(3, false);
assert(state.surv, 'survie vague 3 : survivant à secourir');
state.player.x = state.surv.x; state.player.y = state.surv.y;
run(60 * 3);
assert(!state.surv && state.ally, 'survivant secouru : un allié rejoint la partie');
state.player.x = 180; state.player.y = 400;
state.ally.x = 160; state.ally.y = 400;
const az = place('tank', 160, 330);
run(120);
assert(az.hp < az.maxHp, 'l\'allié tire sur les zombies');
state.ally.t = 0.01;
run(3);
assert(!state.ally, 'l\'allié repart au bout de sa durée');

// --- Balles infusées ---
scenario();
spawnPickup('fire', state.player.x, state.player.y, 10, 3);
run(2);
assert(state.ammoFx && state.ammoFx.kind === 'fire' && state.ammoFx.tier === 3, 'ramasser une infusion active les balles de feu');
const fz = place('tank', 180, 300);
state.bullets.push({ x: 180, y: 340, vx: 0, vy: -400, life: 1, dmg: 1, pierce: 0, hit: [], dead: false, fx: 'fire', tier: 3 });
run(15);
const hpAfterHit = fz.hp;
assert(fz.burnT > 0, 'les balles incendiaires enflamment');
run(90);
assert(fz.hp < hpAfterHit, 'la brûlure inflige des dégâts dans la durée');
scenario();
const v1 = place('walker', 180, 300); const v2 = place('tank', 200, 300);
state.bullets.push({ x: 180, y: 340, vx: 0, vy: -400, life: 1, dmg: 1, pierce: 0, hit: [], dead: false, fx: 'volt', tier: 2 });
run(15);
assert(v2.hp < v2.maxHp, 'les balles électriques font un éclair vers le voisin');

// --- Pièces, atelier, méta-progression ---
game.startGame();
Object.keys(store).forEach((k) => delete store[k]);
game.reloadMeta();
const kz = place('tank', 100, 100);
damageZombie(kz, 99, 1, 0);
assert(state.coins >= COINS.kill.tank, 'tuer un zombie rapporte des pièces');
const earned = Math.floor(state.coins);
game.goMenu();
assert(storage.getCoins() === earned && earned > 0, 'les pièces sont versées à la bourse en quittant');
storage.setCoins(1000);
storage.setMetaStore({ vigor: 2, kit: 1, arsenal: 2, power: 1 });
game.reloadMeta();
game.startGame();
assert(state.stats.maxHp >= 120 && state.player.hp === state.stats.maxHp, 'atelier « vigueur » : PV max augmentés');
assert(state.weapons.shotgun.unlocked && state.weapons.smg.unlocked, 'atelier « arsenal » : armes débloquées dès le départ');
assert(Object.values(state.perks).reduce((a, b) => a + b, 0) === 1, 'atelier « sac à dos » : une amélioration offerte');
assert(state.stats.dmg > 1, 'atelier « munitions renforcées » : dégâts +');
// écran d'atelier : s'affiche sans erreur
screens.showScreen('workshop');
assert(screens.currentScreen() === 'workshop', 'écran atelier');
screens.hideScreen();
storage.setMetaStore({}); game.reloadMeta();

// --- Améliorations risquées & synergies ---
scenario();
const hp0 = state.stats.maxHp;
applyPerk('glass');
assert(state.stats.maxHp < hp0 && state.stats.dmg > 1.4, 'canon de verre : dégâts + / PV max −');
assert(state.player.hp <= state.stats.maxHp, 'les PV actuels sont réduits au nouveau maximum');
scenario();
applyPerk('range');
assert(synergyFor('crit') === 'sniper', 'l\'amélioration qui complète une synergie est signalée');
const act = applyPerk('crit');
assert(act.includes('sniper') && state.stats.syn.sniper && state.stats.critZone > 0.3, 'synergie « tireur d\'élite » activée');
scenario();
for (let i = 0; i < 40; i++) assert(!rollChoices(3, { safe: true }).some((id) => PERKS[id].risk), 'équipement offert sans perk risqué');
for (const [sid, sy] of Object.entries(SYNERGIES)) assert(sy.needs.every((n) => PERKS[n]), `synergie ${sid} : améliorations existantes`);

// --- Séries de kills / hit-stop : aucun plantage, le temps ralentit ---
scenario();
for (let i = 0; i < 12; i++) damageZombie(place('walker', 100 + i * 10, 100), 5, 1, 0);
assert(state.combo.count >= 10 && state.hitStop > 0, 'série de 10 : annonce et micro-pause');
const hs = state.hitStop;
game.update(dt);
assert(state.hitStop < hs, 'le hit-stop s\'écoule');

// --- Tous les niveaux de la campagne se lancent (objectifs inclus) ---
for (const lv of (await import('../js/campaign.js')).LEVELS) {
  game.startGame('campaign', lv.id);
  for (let i = 0; i < 600; i++) {
    if (state.phase === 'perk') game.choosePerk(0);
    state.player.hp = state.stats.maxHp;
    if (state.gen) state.gen.hp = state.gen.max;
    game.update(dt);
  }
  assert(Number.isFinite(state.player.x), `niveau ${lv.id} (${lv.obj || 'classique'}) : simulation stable`);
}

// =====================================================================
// Mode ville : carte étendue, caméra, zones, checkpoints, population
// =====================================================================
{
  const cm = await import('../js/citymap.js');
  const city = await import('../js/city.js');
  const m = cm.buildCityMap();
  // tout point d'intérêt est atteignable par un joueur (rayon 10) depuis le départ
  const S = 4, R = 10;
  const gw = Math.floor(cm.WORLD_W / S), gh = Math.floor(cm.WORLD_H / S);
  const blocked = (x, y) => {
    if (x < R || y < R + 24 || x > cm.WORLD_W - R || y > cm.WORLD_H - R) return true;
    for (const o of m.solids) {
      const r = o.hit;
      const cx = Math.max(r.x, Math.min(x, r.x + r.w)), cy = Math.max(r.y, Math.min(y, r.y + r.h));
      if ((x - cx) ** 2 + (y - cy) ** 2 < R * R) return true;
    }
    for (const b of m.barrels) if ((x - b.x) ** 2 + (y - b.y) ** 2 < (R + b.r) ** 2) return true;
    return false;
  };
  const seen = new Uint8Array(gw * gh);
  const q = [[Math.round(m.start.x / S), Math.round(m.start.y / S)]];
  seen[q[0][1] * gw + q[0][0]] = 1;
  while (q.length) {
    const [cx, cy] = q.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= gw || ny >= gh || seen[ny * gw + nx] || blocked(nx * S, ny * S)) continue;
      seen[ny * gw + nx] = 1;
      q.push([nx, ny]);
    }
  }
  for (const o of [...m.checkpoints, ...m.supplies, ...m.caches]) {
    assert(!blocked(o.x, o.y) && seen[Math.round(o.y / S) * gw + Math.round(o.x / S)], `ville : ${o.id} libre et atteignable`);
  }
  assert(m.checkpoints.length === 6 && cm.ZONE_ORDER.length === 6, 'ville : 6 zones, 6 points de contrôle');

  storage.clearCity();
  game.startGame('city');
  assert(state.mode === 'city' && state.city && state.w === cm.WORLD_W && state.h === cm.WORLD_H, 'ville : monde étendu');
  assert(Math.hypot(state.player.x - m.start.x, state.player.y - m.start.y) < 1, 'ville : départ au premier point de contrôle');
  const camOk = () => state.cam.x >= -0.01 && state.cam.y >= -0.01 && state.cam.x <= state.w - state.vw + 0.01 && state.cam.y <= state.h - state.vh + 0.01;
  for (let i = 0; i < 120; i++) game.update(dt);
  assert(camOk() && Math.abs(state.cam.y - Math.max(0, Math.min(state.h - state.vh, state.player.y - state.vh * 0.55))) < 2, 'ville : la caméra suit le joueur et reste dans le monde');
  assert(state.zombies.length > 0 && state.zombies.every((z) => !z.aggro || Math.hypot(z.x - state.player.x, z.y - state.player.y) < 600), 'ville : zombies placés dans les zones');
  assert(!state.zombies.some((z) => Math.hypot(z.x - state.player.x, z.y - state.player.y) < 200), 'ville : personne sur le joueur au départ');

  // zombie au repos : ne suit pas le joueur de loin, repère de près, et le bruit d'un tir alerte
  state.zombies = [];
  const far = spawnZombie('walker', { x: state.player.x + 330, y: state.player.y - 40, elite: false });
  const near = spawnZombie('walker', { x: state.player.x - 150, y: state.player.y, elite: false });
  for (let i = 0; i < 30; i++) game.update(dt);
  assert(!far.aggro && near.aggro, 'ville : le zombie lointain dort, le proche chasse');
  const far2 = spawnZombie('walker', { x: state.player.x + 330, y: state.player.y - 40, elite: false });
  city.alertNoise(state.player.x, state.player.y);
  assert(!far2.aggro, 'ville : le bruit n\'alerte pas au-delà de son rayon');
  far2.x = state.player.x + 120; city.alertNoise(state.player.x, state.player.y);
  assert(far2.aggro, 'ville : le bruit alerte les zombies proches');

  // checkpoints : activation, sauvegarde, reprise après la mort
  state.zombies = [];
  const hop = m.checkpoints.find((c) => c.id === 'hopital');
  state.player.x = hop.x; state.player.y = hop.y; state.player.hp = 20;
  game.update(dt);
  assert(state.city.cps.hopital && state.city.cp === 'hopital' && state.player.hp > 20, 'ville : point de contrôle activé (soin)');
  const saved = storage.getCity();
  assert(saved && saved.cp === 'hopital' && saved.cps.includes('hopital'), 'ville : sauvegarde du point de contrôle');
  hurtPlayer(9999);
  game.update(dt);
  assert(state.phase === 'over', 'ville : mort -> écran de fin');
  game.startGame('city');
  assert(Math.hypot(state.player.x - hop.x, state.player.y - hop.y) < 1 && state.city.cps.hopital && state.player.hp === state.stats.maxHp, 'ville : reprise au dernier point de contrôle');

  // caches d'armes et ravitaillement
  assert(!state.weapons.shotgun.unlocked, 'ville : fusil à pompe verrouillé au départ');
  const sg = state.city.caches.find((k) => k.weapon === 'shotgun');
  state.zombies = [];
  state.player.x = sg.x; state.player.y = sg.y;
  game.update(dt);
  assert(state.weapons.shotgun.unlocked && sg.taken, 'ville : cache du commissariat -> fusil à pompe');
  assert(storage.getCity().weapons.shotgun, 'ville : arme sauvegardée');
  const sup = state.city.supplies.find((x) => x.kind === 'health');
  state.zombies = []; state.player.hp = 10; state.player.x = sup.x; state.player.y = sup.y;
  game.update(dt);
  assert(state.player.hp > 30 && sup.cd > 0, 'ville : ravitaillement soigne puis se recharge');

  // les 6 points de contrôle libèrent la ville
  for (const c of m.checkpoints) { state.zombies = []; state.player.x = c.x; state.player.y = c.y; game.update(dt); }
  assert(state.city.won && Object.keys(state.city.cps).length === 6, 'ville : 6 points de contrôle = ville reprise');

  // longue balade : population bornée, pas de NaN, joueur et caméra dans le monde
  game.startGame('city');
  let amax = 0;
  for (let f = 0; f < 60 * 120; f++) {
    if (state.phase === 'over') game.startGame('city');
    if (state.phase === 'perk') { game.choosePerk(0); continue; }
    const p = state.player;
    const tgt = m.checkpoints[Math.floor(f / 600) % 6];
    input.keys.clear();
    if (Math.abs(tgt.x - p.x) > 8) input.keys.add(tgt.x > p.x ? 'KeyD' : 'KeyA');
    if (Math.abs(tgt.y - p.y) > 8) input.keys.add(tgt.y > p.y ? 'KeyS' : 'KeyW');
    let bz = null, bd = 1e9;
    for (const z of state.zombies) { const d = Math.hypot(z.x - p.x, z.y - p.y); if (d < bd) { bd = d; bz = z; } }
    if (bz && bd < 240) { input.mouse.x = bz.x; input.mouse.y = bz.y; input.aimSource = 'mouse'; input.firing = true; input.clickBuffer = 0.15; } else input.firing = false;
    p.hp = Math.max(p.hp, 30);
    game.update(dt);
    amax = Math.max(amax, state.zombies.length);
    if (f % 60 === 0) {
      assert(Number.isFinite(p.x) && p.x >= 0 && p.x <= state.w && p.y >= 0 && p.y <= state.h, 'ville : joueur dans le monde');
      assert(camOk(), 'ville : caméra dans le monde');
      for (const z of state.zombies) assert(Number.isFinite(z.x) && Number.isFinite(z.y), 'ville : zombie fini');
    }
  }
  input.keys.clear(); input.firing = false;
  assert(amax < 90, `ville : population bornée (max ${amax})`);
  console.log(`Ville : population max ${amax}, kills ${state.kills}, zone ${state.city.zone}`);
  // retour à l'arène classique : le monde redevient de la taille de l'écran
  game.startGame();
  assert(!state.city && state.w === state.vw && state.cam.x === 0, 'retour à l\'arène : monde à la taille de l\'écran');
}

// Pause / reprise
game.startGame();
game.togglePause();
assert(state.phase === 'paused', 'pause');
game.togglePause();
assert(state.phase === 'playing', 'reprise');

if (failed) { console.error(`\n${failed} vérification(s) en échec`); process.exit(1); }
console.log('\nTous les scénarios passent');
