// Tests de la simulation 3D « survie » (sans three.js ni navigateur). Lancer : node tests/sim3d.mjs
import assert from 'node:assert/strict';
import { buildLayout } from '../3d/js/layout.js';
import { Sim } from '../3d/js/sim.js';
import { makeRng, pushOut, raySphere, cameraRig, wrapAngle, rayBoxes, blockedBetween } from '../3d/js/logic.js';
import { CAMERA, ZOMBIES, PLAYER, SURVIVAL as S, PIECES } from '../3d/js/config.js';

let ok = 0; const t = (name, fn) => { fn(); ok++; console.log('  ok', name); };
const L = buildLayout(1337);
// Partie neuve, déterministe, sans zombies (chaque test place les siens).
const mk = (seed = 1) => { const s = new Sim(L, makeRng(seed)); s.zombies.length = 0; s.popT = 1e9; return s; };
const step = (s, n, inp = {}, dt = 1 / 30) => { for (let i = 0; i < n; i++) s.update(dt, inp); };
const clear = (s) => { s.zombies.length = 0; s.popT = 1e9; };
const goOpen = (s) => { s.player.x = 0; s.player.z = 0; s.yaw = 0; };           // carrefour dégagé

t('raySphere : touche / rate', () => {
  assert.ok(Math.abs(raySphere(0, 0, 0, 0, 0, 1, 0, 0, 5, 1) - 4) < 1e-9);
  assert.equal(raySphere(0, 0, 0, 0, 0, 1, 3, 0, 5, 1), -1);
  assert.equal(raySphere(0, 0, 0, 0, 0, -1, 0, 0, 5, 1), -1);
});

t('pushOut : cercle, boîte, porte ouverte ignorée', () => {
  const p = { x: 0.3, z: 0 };
  assert.equal(pushOut(p, 0.4, [{ x: 0, z: 0, r: 0.5 }]), 1);
  const q = { x: 0, z: 0 }; pushOut(q, 0.4, [{ x: 0, z: 0, hw: 2, hd: 2 }]);
  assert.ok(Math.abs(q.x) >= 2.4 - 1e-9 || Math.abs(q.z) >= 2.4 - 1e-9);
  assert.equal(pushOut({ x: 0, z: 0 }, 0.4, [{ x: 0, z: 0, hw: 2, hd: 2, off: true }]), 0);
});

t('rayBoxes / blockedBetween : mur haut bloque, voiture basse laisse voir', () => {
  const wall = { x: 0, z: 5, hw: 2, hd: 0.2, h: 3 };
  assert.ok(Math.abs(rayBoxes(0, 1, 0, 0, 0, 1, 20, [wall]).t - 4.8) < 1e-6);
  assert.equal(rayBoxes(0, 3.5, 0, 0, 0, 1, 20, [wall]), null);
  assert.ok(blockedBetween(0, 0, 0, 10, [wall]) && !blockedBetween(5, 0, 5, 10, [wall]));
  assert.ok(!blockedBetween(0, 0, 0, 10, [{ ...wall, h: 1.2 }]), 'un obstacle bas ne bloque pas la vue');
  assert.ok(!blockedBetween(0, 0, 0, 10, [{ ...wall, off: true }]), 'une porte ouverte ne bloque pas');
});

t('cameraRig : derrière le joueur, à droite', () => {
  const c = cameraRig(0, 0, 0, 0, CAMERA);
  assert.ok(c.pos[2] < 0 && c.dir[2] > 0.99);
  const c2 = cameraRig(0, 0, Math.PI / 2, 0, CAMERA);
  assert.ok(c2.dir[0] > 0.99 && c2.pos[0] < 0);
});

t('layout : déterministe, cabane 6x6, maisons hors des routes, points de butin', () => {
  const a = buildLayout(1337), b = buildLayout(1337);
  assert.equal(JSON.stringify(a.items), JSON.stringify(b.items));
  assert.equal(a.cabin.n, 6);
  assert.ok(a.houses.length >= 8 && a.colliders.length > 40);
  for (const h of a.houses) assert.ok(Math.abs(h.z) > 6.5 && Math.abs(h.x) > 8);
  for (const m of a.models) assert.ok(/\.(gltf|glb)$|\.fbx#/.test(m), m);
  for (const k of ['cabin', 'tools', 'house', 'container', 'car', 'barrel', 'trash']) assert.ok(a.lootSpots.some(s => s.kind === k), 'point de butin manquant : ' + k);
});

t('layout : plusieurs graines (départ dans la cabane, arbres et rochers à portée)', () => {
  for (const seed of [1, 2, 3, 42, 999, 1337, 31337]) {
    const X = buildLayout(seed), p = { x: X.spawn.x, z: X.spawn.z };
    assert.equal(pushOut(p, PLAYER.radius, X.colliders), 0, 'départ bloqué, graine ' + seed);
    assert.ok(Math.abs(X.spawn.x - X.cabin.cx) < 1 && Math.abs(X.spawn.z - X.cabin.cz) < 1);
    const near = (l) => l.filter(o => Math.hypot(o.x - X.cabin.cx, o.z - X.cabin.cz) < 20).length;
    assert.ok(near(X.trees) >= 5 && near(X.rocks) >= 2, 'ressources trop loin, graine ' + seed);
  }
});

t('départ : dans la cabane, strict minimum (couteau + 1 eau), porte fermée', () => {
  const s = mk(); const P = s.player;
  assert.deepEqual(s.inv, { wood: 0, stone: 0, food: 0, water: 1, bandage: 0, ammo: 0 });
  assert.deepEqual(Object.keys(s.weapons), ['knife']); assert.equal(s.cur, 'knife');
  const cb = L.cabin;
  assert.ok(P.x > cb.a && P.x < cb.a + cb.n && P.z > cb.b && P.z < cb.b + cb.n, 'le joueur n\'est pas dans la cabane');
  const door = s.pieces.find(p => p.kind === 'door'); assert.ok(door && !door.open);
  s.yaw = 0; step(s, 150, { my: 1 });                                  // marcher droit vers la porte (+z)
  assert.ok(P.z < cb.b + cb.n, 'le joueur a traversé la porte fermée');
  assert.equal(s.prompt && s.prompt.kind, 'door');
  step(s, 1, { use: true }); assert.ok(door.open);
  step(s, 150, { my: 1 }); assert.ok(P.z > cb.b + cb.n + 1, 'porte ouverte : on doit pouvoir sortir');
  assert.ok(s.day() === 1 && Math.abs(s.hour() - 7.5) < 0.5);
});

t('mêée : le couteau tue un zombie, un mur entre les deux protège', () => {
  const s = mk(2); goOpen(s);
  const z = s.spawnZombie('basic'); z.x = 0; z.z = 1.5; z.state = 'idle'; z.speed = 0;
  let n = 0; while (!z.dead && n++ < 400) { z.x = 0; z.z = 1.5; step(s, 1, { fire: true }); }
  assert.ok(z.dead && s.kills === 1, 'zombie vivant après ' + n + ' images');
  assert.ok(s.drain().some(e => e.type === 'swing'));
  const s2 = mk(2); goOpen(s2); s2.addPiece('wall', 0, 1.0, 0);
  const z2 = s2.spawnZombie('basic'); z2.x = 0; z2.z = 1.7; z2.state = 'idle'; z2.speed = 0;
  step(s2, 120, { fire: true }); assert.equal(z2.hp, z2.maxHp, 'coup traversé le mur');
});

t('récolte : le couteau coupe un arbre (bois), un arbre épuisé devient souche', () => {
  const s = mk(3), tr = s.trees[0]; clear(s);
  let n = 0; while (!tr.felled && n++ < 600) { s.player.x = tr.x; s.player.z = tr.z - 1.4; s.yaw = 0; step(s, 1, { fire: true }); }
  assert.ok(tr.felled && s.inv.wood >= 4, 'bois : ' + s.inv.wood);
  assert.equal(s.cols.includes(tr.col), false, 'la souche ne doit plus bloquer');
  assert.ok(s.drain().some(e => e.type === 'treeFelled' && e.i === tr.i));
});

t('pierre : impossible sans pioche, la pioche donne de la pierre', () => {
  const s = mk(4), r = s.rocks[0]; clear(s);
  const aim = () => { s.player.x = r.x; s.player.z = r.z - 1.5; s.yaw = 0; };
  aim(); step(s, 60, { fire: true }); assert.equal(s.inv.stone, 0);
  assert.ok(s.drain().some(e => e.type === 'tip' && /pioche/.test(e.text)));
  s.giveItem('pick'); s.setWeapon('pick');
  let n = 0; while (!r.gone && n++ < 800) { aim(); step(s, 1, { fire: true }); }
  assert.ok(r.gone && s.inv.stone >= 4, 'pierre : ' + s.inv.stone);
});

t('besoins : faim et soif baissent, famine = perte de PV, manger / boire / bandage, saignement mortel', () => {
  const s = mk(5); clear(s); const P = s.player;
  const h0 = P.hunger, t0 = P.thirst; step(s, 300); assert.ok(P.hunger < h0 && P.thirst < t0);
  P.hunger = 0; P.hp = 80; step(s, 900); assert.ok(P.hp < 80 - 20, 'la famine doit blesser : ' + P.hp);
  P.hunger = 50; P.thirst = 40; s.inv.food = 1; s.inv.water = 1; s.inv.bandage = 1;
  step(s, 1, { slot: 2 }); assert.ok(P.hunger >= 50 + S.foodGain - 2 && s.inv.food === 0);
  step(s, 1, { slot: 3 }); assert.ok(P.thirst >= 40 + S.waterGain - 2 && s.inv.water === 0);
  P.bleed = true; P.hp = 50; step(s, 1, { slot: 1 }); assert.ok(!P.bleed && s.inv.bandage === 0);
  P.hunger = 100; P.thirst = 100; s.inv.food = 1; step(s, 1, { slot: 2 }); assert.equal(s.inv.food, 1, 'pas de gaspillage si rassasié');
  P.hp = 10; P.bleed = true; step(s, 300); assert.ok(P.dead, 'le saignement doit tuer');
  step(s, 100); assert.ok(s.over && s.drain().some(e => e.type === 'gameover'));
});

t('butin : caisse de la cabane (conserve + bandage), fouille unique puis remplissage, coffre à outils = pioche', () => {
  const s = mk(6); clear(s);
  const crate = s.spots.find(p => p.kind === 'cabin');
  s.player.x = crate.x; s.player.z = crate.z - 1.3;
  step(s, 1); assert.equal(s.prompt.kind, 'loot');
  step(s, 1, { use: true }); assert.equal(s.inv.food, 1); assert.equal(s.inv.bandage, 1);
  step(s, 2); assert.equal(s.prompt, null, 'déjà fouillé');
  const house = s.spots.find(p => p.kind === 'house'); s.player.x = house.x; s.player.z = house.z - 1; s.drain();
  step(s, 1, { use: true }); assert.ok(house.searched && s.drain().some(e => e.type === 'loot'));
  s.t += S.lootRespawn + 10; step(s, 400); assert.equal(house.searched, false, 'le butin doit se remplir à nouveau');
  assert.equal(crate.searched, true, 'la caisse de départ ne se remplit pas');
  const tools = s.spots.find(p => p.kind === 'tools'); s.player.x = tools.x; s.player.z = tools.z - 1; step(s, 1, { use: true });
  assert.ok(s.weapons.pick, 'le coffre à outils donne la pioche');
});

t('construction : bois (2), pierre (3, PV x3), emplacement occupé, matériaux insuffisants', () => {
  const s = mk(7); clear(s); goOpen(s);
  step(s, 1, { build: true }); assert.ok(s.build.on);
  s.inv.wood = 1; step(s, 1, { firePressed: true, fire: true });
  assert.equal(s.pieces.length, 1, 'pas assez de bois : rien ne doit être posé');          // 1 = la porte de la cabane
  s.inv.wood = 5; step(s, 1, { firePressed: true, fire: true });
  assert.equal(s.pieces.length, 2); assert.equal(s.inv.wood, 3);
  const w = s.pieces[1]; assert.equal(w.kind, 'wall'); assert.equal(w.hp, PIECES.wall.hp);
  step(s, 1, { firePressed: true, fire: true }); assert.equal(s.pieces.length, 2, 'emplacement occupé');
  s.player.z = -3; s.inv.stone = 3; step(s, 1, { piece: 2 }); assert.equal(s.build.piece, 'stone');
  step(s, 1, { firePressed: true, fire: true });
  const st = s.pieces.find(p => p.kind === 'stone'); assert.ok(st && s.inv.stone === 0);
  assert.equal(st.hp, PIECES.wall.hp * 3, 'la pierre doit durer 3 fois plus que le bois');
  step(s, 1, { build: true }); assert.ok(!s.build.on);
  assert.equal(s.drain().filter(e => e.type === 'build').length, 2);
});

t('construction : un mur bloque, une porte ouverte laisse passer, poser sur un obstacle est refusé', () => {
  const s = mk(8); clear(s); goOpen(s);
  s.addPiece('wall', 0, 2, 0); s.player.x = 0; s.player.z = 0; s.yaw = 0;
  step(s, 120, { my: 1 }); assert.ok(s.player.z < 2, 'le mur doit bloquer : z=' + s.player.z);
  const d = s.addPiece('door', 4, 2, 0); s.player.x = 4; s.player.z = 0;
  step(s, 60, { my: 1 }); assert.ok(s.player.z < 2);
  d.open = true; d.col.off = true; step(s, 120, { my: 1 }); assert.ok(s.player.z > 2.5, 'porte ouverte : passage libre');
  s.inv.wood = 9; s.player.x = L.cabin.cx; s.player.z = L.cabin.b + L.cabin.n - 2.6; s.yaw = 0;   // dans la cabane, face à la porte
  step(s, 1, { build: true }); step(s, 1);
  assert.ok(s.build.ghost && s.build.ghost.ok === false, 'poser sur la porte de la cabane doit être refusé');
});

t('balles : un mur arrête les tirs, sans mur le zombie est touché', () => {
  const run = (withWall) => {
    const s = mk(9); clear(s); goOpen(s); s.weapons.pistol = { ammo: 12 }; s.setWeapon('pistol'); s.pitch = 0;
    if (withWall) s.addPiece('wall', 0, 3, 0);
    const z = s.spawnZombie('basic'); z.x = 0; z.z = 7; z.speed = 0; z.state = 'idle';
    for (let i = 0; i < 8; i++) { s.fireCD = 0; z.x = 0; z.z = 7; s.update(0.016, { fire: true }); }
    return z;
  };
  assert.ok(run(false).hp < ZOMBIES.basic.hp, 'sans mur le zombie doit être touché');
  assert.equal(run(true).hp, ZOMBIES.basic.hp, 'le mur doit arrêter les balles');
});

t('zombies : repèrent un joueur qui marche, perdent la trace, ne voient pas à travers un mur, entendent les bruits', () => {
  const s = mk(10); clear(s); goOpen(s);
  const z = s.spawnZombie('basic'); z.x = 0; z.z = 9; z.state = 'idle'; z.speed = 0;
  step(s, 5, {}); assert.equal(z.state, 'idle', 'immobile à 9 m : trop discret');
  s.player.x = 0; s.player.z = 0; step(s, 2, { mx: 0.5 });
  assert.equal(z.state, 'chase', 'en marchant à 9 m il doit nous repérer');
  z.x = 0; z.z = 60; step(s, 30); assert.notEqual(z.state, 'chase', 'trop loin : il perd la trace');
  const s2 = mk(11); clear(s2); goOpen(s2); s2.addPiece('wall', 0, 3, 0);
  const z2 = s2.spawnZombie('basic'); z2.x = 0; z2.z = 8; z2.speed = 0; z2.state = 'idle';
  step(s2, 60, { mx: 0.15 }); assert.equal(z2.state, 'idle', 'un mur cache le joueur');
  s2.noise(0, 0, 20); step(s2, 2); assert.equal(z2.state, 'chase', 'un bruit alerte quand même');
});

t('abri : les zombies attaquent les murs et finissent par en détruire un ; le joueur est protégé jusque-là', () => {
  const s = mk(12); clear(s); goOpen(s);
  for (const [x, z, yaw] of [[-1, -2, 0], [1, -2, 0], [-1, 2, 0], [1, 2, 0], [-2, -1, Math.PI / 2], [-2, 1, Math.PI / 2], [2, -1, Math.PI / 2], [2, 1, Math.PI / 2]]) s.addPiece('wall', x, z, yaw);
  const z = s.spawnZombie('basic'); z.x = 6; z.z = 0; z.state = 'chase'; z.hp = z.maxHp = 1e9;
  let broke = 0, hitEv = 0, hurt = false;
  for (let i = 0; i < 30 * 150 && !hurt; i++) {
    s.update(1 / 30, {}); for (const e of s.drain()) { if (e.type === 'pieceHit') hitEv++; if (e.type === 'pieceBreak') broke++; }
    if (s.player.hp < PLAYER.hp) hurt = true;
    if (!broke) assert.equal(s.player.hp, PLAYER.hp, 'blessé à travers un mur intact');
  }
  assert.ok(hitEv > 3, 'le zombie doit frapper le mur (' + hitEv + ')');
  assert.ok(broke >= 1, 'un mur doit finir par céder');
});

t('abri en pierre : tient bien plus longtemps que le bois', () => {
  const time = (kind) => {
    const s = mk(13); clear(s); goOpen(s); const w = s.addPiece(kind, 0, 2.0, 0);
    s.player.x = 0; s.player.z = -1; s.player.hp = 1e9;
    const z = s.spawnZombie('basic'); z.x = 0; z.z = 3.6; z.state = 'chase'; z.hp = z.maxHp = 1e9; z.alerted = true;
    let n = 0; while (s.pieces.includes(w) && n++ < 30 * 600) { s.update(1 / 30, {}); s.drain(); } return n;
  };
  const tw = time('wall'), ts = time('stone');
  assert.ok(ts > tw * 2.2, `pierre ${ts} vs bois ${tw} images`);
});

t('jour / nuit : l\'heure avance, la nuit tombe, davantage de zombies la nuit', () => {
  const s = mk(14);
  assert.ok(s.daylight() > 0.9 && !s.isNight());
  s.clock = 22 * 3600; assert.ok(s.isNight() && s.daylight() < 0.2);
  s.clock = 12 * 3600; assert.ok(!s.isNight());
  s.clock = 17.9 * 3600; const c0 = s.clock; step(s, 30 * 60, {}); assert.ok(s.clock > c0 + 3600, 'le temps doit avancer vite');
  const pop = (hour) => { const q = mk(15); q.player.x = 0; q.player.z = 0; q.clock = hour * 3600; for (let i = 0; i < 200; i++) { q.popT = 0; q.updatePopulation(0.01); } return q.alive; };
  const aDay = pop(12), aNight = pop(23);
  assert.ok(aNight > aDay && aDay <= S.popDay && aNight <= S.popNight, `jour ${aDay} / nuit ${aNight}`);
});

t('sauvegarde : aller-retour JSON (position, besoins, inventaire, abris, arbres, rochers, butin, heure)', () => {
  const a = mk(16); clear(a); goOpen(a);
  a.inv.wood = 7; a.inv.stone = 2; a.player.hunger = 33; a.player.bleed = true; a.clock = 15 * 3600; a.kills = 4;
  a.giveItem('axe'); a.addPiece('stone', 4, 5, 0); const d = a.pieces.find(p => p.kind === 'door'); d.open = true; d.col.off = true; d.hp = 50;
  const tr = a.trees[3]; tr.felled = true; a.cols.splice(a.cols.indexOf(tr.col), 1); a.rocks[1].gone = true;
  a.spots[5].searched = true; a.spots[5].at = a.t - 40;
  const data = JSON.parse(JSON.stringify(a.serialize()));
  const b = new Sim(L, makeRng(99)); b.reset(data);
  assert.equal(b.inv.wood, 7); assert.equal(b.player.hunger, 33); assert.equal(b.player.bleed, true); assert.equal(b.kills, 4);
  assert.ok(Math.abs(b.clock - 15 * 3600) < 1e-6); assert.ok(b.weapons.axe);
  assert.equal(b.pieces.length, 2); assert.ok(b.pieces.some(p => p.kind === 'stone'));
  const d2 = b.pieces.find(p => p.kind === 'door'); assert.ok(d2.open && d2.col.off && d2.hp === 50);
  assert.ok(b.trees[3].felled && !b.cols.includes(b.trees[3].col)); assert.ok(b.rocks[1].gone && b.spots[5].searched);
  assert.equal(b.zombies.length, 0, 'une partie reprise ne remplit pas la carte de zombies d\'un coup');
});

t('simulation longue : un bot survit 6 min de jeu, aucune valeur NaN, population bornée, aucun zombie dans un mur', () => {
  const s = new Sim(L, makeRng(7)); let tm = 0, maxAlive = 0; const dtm = 1 / 30;
  s.giveItem('pistol'); s.inv.ammo = 999; s.setWeapon('pistol'); const dr = s.pieces.find(p => p.kind === 'door'); dr.open = true; dr.col.off = true;   // le bot sort de la cabane
  while (tm < 360 && !s.over) {
    tm += dtm; s.player.hp = Math.max(s.player.hp, 40); s.player.hunger = s.player.thirst = 80;
    const near = s.zombies.filter(z => !z.dead).sort((a, b) => Math.hypot(a.x - s.player.x, a.z - s.player.z) - Math.hypot(b.x - s.player.x, b.z - s.player.z))[0];
    let inp = { mx: Math.sin(tm / 7) * 0.6, my: 0.7, sprint: false };
    if (near && Math.hypot(near.x - s.player.x, near.z - s.player.z) < 12) { s.yaw = Math.atan2(near.x - s.player.x, near.z - s.player.z); s.pitch = 0.05; inp = { mx: 0, my: -0.3, fire: true }; }
    else s.yaw += 0.01;
    if (s.weapons.pistol.ammo === 0) inp.reload = true;
    s.update(dtm, inp); s.drain(); maxAlive = Math.max(maxAlive, s.alive);
    for (const z of s.zombies) {
      assert.ok(Number.isFinite(z.x) && Number.isFinite(z.z), 'NaN zombie');
      if (!z.dead) { const p = { x: z.x, z: z.z }; pushOut(p, ZOMBIES[z.type].radius * 0.6, s.cols); assert.ok(Math.hypot(p.x - z.x, p.z - z.z) < 0.35, 'zombie coincé dans un obstacle'); }
    }
    assert.ok(Number.isFinite(s.player.x) && Number.isFinite(s.player.z) && Number.isFinite(s.clock));
  }
  assert.ok(maxAlive <= S.popMax + 2, 'trop de zombies : ' + maxAlive);
  console.log('    kills', s.kills, 'max vivants', maxAlive, 'heure', s.hour().toFixed(1), 'jour', s.day());
});

t('wrapAngle', () => { assert.ok(Math.abs(wrapAngle(7) - (7 - 2 * Math.PI)) < 1e-9); });

console.log(`\n${ok} tests OK`);
