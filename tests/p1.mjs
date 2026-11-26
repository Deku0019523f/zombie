// Tests P1 (capacité d'inventaire, sac à dos, allumettes, butin, armes ajustées, présence des modèles). Lancer : node tests/p1.mjs (depuis la racine du dépôt)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildLayout } from '../3d/js/layout.js';
import { Sim } from '../3d/js/sim.js';
import { makeRng } from '../3d/js/logic.js';
import { SURVIVAL as S, PIECES, LOOT, ITEMS, WEAPONS, WEAPON_ORDER, ZOMBIES, PLAYER, BACKPACK_VIEW } from '../3d/js/config.js';

let ok = 0; const t = (name, fn) => { fn(); ok++; console.log('  ok', name); };
const L = buildLayout(1337);
const mk = (seed = 1) => { const s = new Sim(L, makeRng(seed)); s.zombies.length = 0; s.popT = 1e9; return s; };
const step = (s, n, inp = {}, dt = 1 / 30) => { for (let i = 0; i < n; i++) s.update(dt, inp); };
const goOpen = (s) => { s.player.x = 0; s.player.z = 0; s.yaw = 0; };

t('capacité : le surplus tombe au sol (4 objets au plus) et un message est émis', () => {
  const s = mk(21); goOpen(s); s.drain();
  s.giveItem('wood', 15); step(s, 1);
  assert.equal(s.inv.wood, S.cap.wood);
  assert.equal(s.pickups.filter(p => p.kind === 'wood').length, 4);
  assert.ok(s.drain().some(e => e.type === 'tip' && /Sac plein/.test(e.text)));
  assert.equal(s.capOf('ammo'), Infinity, 'les munitions ne sont pas plafonnées');
});

t('ramassage : refusé quand le sac est plein, repris dès qu\'il y a de la place', () => {
  const s = mk(22); goOpen(s);
  s.giveItem('wood', 14); step(s, 3);
  assert.equal(s.inv.wood, S.cap.wood); const left = s.pickups.length; assert.ok(left > 0);
  step(s, 30); assert.equal(s.pickups.length, left, 'sac plein : rien ne doit être ramassé');
  s.inv.wood = 5; step(s, 3);
  assert.equal(s.inv.wood, 5 + left); assert.equal(s.pickups.length, 0);
});

t('sac à dos : capacité doublée, un seul exemplaire, jamais perdu à la sauvegarde', () => {
  const s = mk(23); goOpen(s);
  assert.equal(s.hasBag(), false); s.giveItem('backpack');
  assert.ok(s.hasBag()); assert.equal(s.capOf('wood'), S.cap.wood * S.capBag);
  s.giveItem('wood', 15); step(s, 2); assert.equal(s.inv.wood, 15); assert.equal(s.pickups.length, 0);
  s.giveItem('backpack'); step(s, 1); assert.equal(s.inv.backpack, 1, 'un seul sac à dos');
  const b = new Sim(L, makeRng(5)); b.reset(JSON.parse(JSON.stringify(s.serialize())));
  assert.ok(b.hasBag()); assert.equal(b.inv.wood, 15);
  // une table de butin qui propose un sac à dos ne le redonne pas
  const sp = s.spots.find(p => p.kind === 'container'); const rng0 = s.rng; s.rng = () => 0; s.inv.wood = 0;
  s.search(sp); s.rng = rng0; assert.equal(s.inv.backpack, 1);
});

t('feu de camp : une allumette et du bois, sinon refus avec le bon message', () => {
  assert.deepEqual(PIECES.fire.cost, { wood: 3, match: 1 });
  const s = mk(24); goOpen(s); step(s, 1, { build: true }); step(s, 1, { piece: 4 });
  assert.equal(s.build.piece, 'fire');
  s.inv.wood = 3; s.inv.match = 0; step(s, 1);
  assert.equal(s.build.ghost.ok, false); assert.match(s.build.ghost.why, /allumette/);
  const n0 = s.pieces.length; step(s, 1, { firePressed: true, fire: true }); assert.equal(s.pieces.length, n0, 'sans allumette : rien posé');
  s.inv.match = 1; step(s, 1, { firePressed: true, fire: true });
  assert.equal(s.pieces.length, n0 + 1); assert.equal(s.inv.match, 0); assert.equal(s.inv.wood, 0);
});

t('butin : la cabane donne des allumettes, toutes les tables ne citent que des objets ou armes connus', () => {
  const s = mk(25); const crate = s.spots.find(p => p.kind === 'cabin');
  s.player.x = crate.x; s.player.z = crate.z - 1.3; step(s, 1); step(s, 1, { use: true });
  assert.ok(s.inv.match >= 2 && s.inv.match <= 3, 'allumettes : ' + s.inv.match);
  for (const [kind, tb] of Object.entries(LOOT)) for (const [id, a, b, ch] of tb.rolls) {
    assert.ok(WEAPONS[id] || ITEMS[id], `${kind} : objet inconnu ${id}`); assert.ok(a <= b && ch > 0 && ch <= 1, `${kind}/${id}`);
  }
  for (const id of Object.keys(S.cap)) assert.ok(ITEMS[id], 'plafond pour un objet inconnu : ' + id);
  for (const id of ['guitar', 'club', 'spear']) assert.ok(Object.values(LOOT).some(tb => tb.rolls.some(r => r[0] === id)), id + ' doit être trouvable');
});

t('armes de mêlée ajustées : fit complet et cohérent, ordre des armes sans doublon', () => {
  assert.equal(new Set(WEAPON_ORDER).size, WEAPON_ORDER.length);
  for (const id of WEAPON_ORDER) assert.ok(WEAPONS[id], 'arme manquante ' + id);
  for (const [id, W] of Object.entries(WEAPONS)) if (W.fit) {
    assert.ok(W.melee && W.fit.len > 0.3 && W.fit.len < 2.5, id + ' longueur'); assert.equal(W.fit.rot.length, 3); assert.ok(W.fit.grip >= 0, id + ' prise');
  }
  const s = mk(26); for (const id of ['guitar', 'club', 'spear']) { s.giveItem(id); assert.ok(s.weapons[id]); }
  assert.deepEqual(s.owned(), ['knife', 'guitar', 'club', 'spear']);
});

t('les nouvelles armes de mêlée tuent un zombie (lance : portée plus longue)', () => {
  for (const id of ['guitar', 'club', 'spear']) {
    const s = mk(27); goOpen(s); s.giveItem(id); s.setWeapon(id);
    const z = s.spawnZombie('basic'); z.x = 0; z.z = id === 'spear' ? 2.6 : 1.6; z.state = 'idle'; z.speed = 0;
    let n = 0; while (!z.dead && n++ < 600) { z.x = 0; z.z = id === 'spear' ? 2.6 : 1.6; step(s, 1, { fire: true }); }
    assert.ok(z.dead, id + ' : zombie vivant');
  }
});

t('modèles : tous les fichiers cités par la configuration existent dans assets/models', () => {
  const base = path.resolve('assets/models'); if (!fs.existsSync(base)) { console.log('    (dossier assets/models absent : test ignoré)'); return; }
  const list = new Set([PLAYER.model, BACKPACK_VIEW.model, 'props/WoodLog.glb', 'props/Matchbox.glb', 'props/Bandages.glb', 'props/Can_Closed.glb', 'props/WaterBottle_1.glb', 'props/Bonfire.glb', 'props/Bonfire_Fire.glb', 'village/Door_1_Flat.gltf', 'village/Prop_WoodenFence_Single.gltf', 'village/Wall_UnevenBrick_Straight.gltf']);
  for (const W of Object.values(WEAPONS)) if (W.model) list.add(W.model);
  for (const Z of Object.values(ZOMBIES)) list.add(Z.model);
  for (const m of L.models) list.add(m);
  // `sources/…` = dossier assets/sources (FBX) ; `fichier#Partie` = une arme détachée du pack de mêlée
  const missing = [...list].filter(m => !fs.existsSync(path.join(m.startsWith('sources/') ? path.resolve('assets') : base, m.split('#')[0])));
  assert.deepEqual(missing, [], 'modèles manquants : ' + missing.join(', '));
});

console.log(`\n${ok} tests P1 OK`);
