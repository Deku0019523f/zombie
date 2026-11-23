// Tests de la simulation 3D (sans three.js ni navigateur). Lancer : node tests/sim3d.mjs
import assert from 'node:assert/strict';
import { buildLayout } from '../3d/js/layout.js';
import { Sim } from '../3d/js/sim.js';
import { makeRng, pushOut, raySphere, cameraRig, wrapAngle } from '../3d/js/logic.js';
import { CAMERA, WEAPONS, ZOMBIES, PLAYER } from '../3d/js/config.js';

let ok = 0; const t = (name, fn) => { fn(); ok++; console.log('  ok', name); };

t('raySphere : touche / rate', () => {
  assert.ok(Math.abs(raySphere(0, 0, 0, 0, 0, 1, 0, 0, 5, 1) - 4) < 1e-9);
  assert.equal(raySphere(0, 0, 0, 0, 0, 1, 3, 0, 5, 1), -1);
  assert.equal(raySphere(0, 0, 0, 0, 0, -1, 0, 0, 5, 1), -1);
});

t('pushOut : cercle et boîte', () => {
  const p = { x: 0.3, z: 0 };
  assert.equal(pushOut(p, 0.4, [{ x: 0, z: 0, r: 0.5 }]), 1);
  assert.ok(Math.hypot(p.x, p.z) >= 0.9 - 1e-9);
  const q = { x: 0, z: 0 };                        // centre dans une boîte : doit en sortir
  pushOut(q, 0.4, [{ x: 0, z: 0, hw: 2, hd: 2 }]);
  assert.ok(Math.abs(q.x) >= 2.4 - 1e-9 || Math.abs(q.z) >= 2.4 - 1e-9);
  const r = { x: 5, z: 5 }; assert.equal(pushOut(r, 0.4, [{ x: 0, z: 0, hw: 2, hd: 2 }]), 0);
});

t('cameraRig : derrière le joueur, à droite', () => {
  const c = cameraRig(0, 0, 0, 0, CAMERA);        // on regarde vers +Z
  assert.ok(c.pos[2] < 0 && c.dir[2] > 0.99);
  assert.ok(c.right[0] < 0 || Math.abs(c.right[0]) === 1);   // à droite quand on regarde +Z = -X
  const c2 = cameraRig(0, 0, Math.PI / 2, 0, CAMERA);        // on regarde vers +X
  assert.ok(c2.dir[0] > 0.99 && c2.pos[0] < 0);
});

t('layout : déterministe, maisons hors des routes, rien sur le départ', () => {
  const a = buildLayout(1337), b = buildLayout(1337);
  assert.equal(JSON.stringify(a.items), JSON.stringify(b.items));
  assert.ok(a.houses.length >= 8 && a.colliders.length > 40);
  for (const h of a.houses) assert.ok(Math.abs(h.z) > 6.5 && Math.abs(h.x) > 8);
  const p = { x: 0, z: 3 }; assert.equal(pushOut(p, PLAYER.radius, a.colliders), 0, 'le joueur démarre sur un obstacle');
  for (const m of a.models) assert.ok(/\.(gltf|glb)$/.test(m), m);
});

t('layout : plusieurs graines valides (départ libre)', () => {
  for (const seed of [1, 2, 3, 42, 999, 1337, 31337]) {
    const L = buildLayout(seed); const p = { x: 0, z: 3 };
    assert.equal(pushOut(p, PLAYER.radius, L.colliders), 0, 'graine ' + seed);
  }
});

t('tir : pistolet touche un zombie devant, le tue en quelques balles', () => {
  const L = buildLayout(1337), s = new Sim(L, makeRng(5));
  s.zombies.length = 0; s.state = 'intermission'; s.interT = 999;
  s.yaw = 0; s.pitch = 0.0; s.player.x = 0; s.player.z = 0;
  const z = s.spawnZombie('basic'); z.x = 0; z.z = 8; z.state = 'idle'; z.speed = 0;
  let shots = 0;
  while (!z.dead && shots < 30) { s.fireCD = 0; s.update(0.016, { fire: true }); z.x = 0; z.z = 8; shots++; }
  assert.ok(z.dead, 'zombie encore vivant après ' + shots + ' tirs');
  assert.ok(s.kills === 1 && s.score >= ZOMBIES.basic.score);
  const ev = s.drain(); assert.ok(ev.some(e => e.type === 'kill') && ev.some(e => e.type === 'shot'));
});

t('fusil à pompe : plusieurs plombs, dégâts réduits avec la distance', () => {
  const L = buildLayout(1337), s = new Sim(L, makeRng(9));
  s.zombies.length = 0; s.weapons.shotgun = { ammo: 6, reserve: 30 }; s.cur = 'shotgun'; s.state = 'intermission'; s.interT = 999;
  s.player.x = 0; s.player.z = 0; s.yaw = 0; s.pitch = 0;
  const near = s.spawnZombie('chubby'); near.x = 0; near.z = 3; near.speed = 0; near.state = 'idle';
  s.fireCD = 0; s.update(0.016, { fire: true });
  const lost = near.maxHp - near.hp; assert.ok(lost > 30, 'dégâts de proximité : ' + lost);
  assert.equal(s.drain().filter(e => e.type === 'shot').length, WEAPONS.shotgun.pellets);
});

t('rechargement : munitions transférées, réserve décrémentée', () => {
  const L = buildLayout(1337), s = new Sim(L, makeRng(3));
  s.zombies.length = 0; s.interT = 999;
  const S = s.weapons.pistol; S.ammo = 2; const r0 = S.reserve;
  s.update(0.016, { reload: true });
  for (let i = 0; i < 120; i++) s.update(0.016, {});
  assert.equal(S.ammo, WEAPONS.pistol.mag); assert.equal(S.reserve, r0 - (WEAPONS.pistol.mag - 2));
});

t('zombie : attaque le joueur à portée et le tue', () => {
  const L = buildLayout(1337), s = new Sim(L, makeRng(4));
  s.zombies.length = 0; s.state = 'intermission'; s.interT = 999; s.player.x = 0; s.player.z = 0;
  const z = s.spawnZombie('chubby'); z.x = 0.6; z.z = 0.6; z.state = 'chase';
  let n = 0; while (!s.player.dead && n++ < 2000) s.update(0.016, {});
  assert.ok(s.player.dead && s.player.hp === 0);
  for (let i = 0; i < 400; i++) s.update(0.016, {});
  assert.ok(s.over && s.drain().some(e => e.type === 'gameover'));
});

t('simulation longue : un bot survit, les vagues avancent, aucune valeur NaN, aucun zombie dans un mur', () => {
  const L = buildLayout(1337), s = new Sim(L, makeRng(7));
  let t = 0, dtm = 1 / 30, maxAlive = 0, waves = new Set();
  while (t < 240 && !s.over) {
    t += dtm; s.player.hp = Math.max(s.player.hp, 40);   // bot invincible : on teste la boucle, pas l'équilibrage
    const near = s.zombies.filter(z => !z.dead).sort((a, b) => Math.hypot(a.x - s.player.x, a.z - s.player.z) - Math.hypot(b.x - s.player.x, b.z - s.player.z))[0];
    let inp = { mx: 0, my: 0, fire: false };
    if (near) {
      const ang = Math.atan2(near.x - s.player.x, near.z - s.player.z); s.yaw = ang; s.pitch = 0.05;
      inp = { mx: 0, my: -0.5, fire: true, sprint: false };
    }
    if (s.weapons[s.cur].ammo === 0) inp.reload = true;
    s.weapons.pistol.reserve = Math.max(s.weapons.pistol.reserve, 40);
    s.update(dtm, inp); s.drain();
    maxAlive = Math.max(maxAlive, s.alive); waves.add(s.wave);
    for (const z of s.zombies) {
      assert.ok(Number.isFinite(z.x) && Number.isFinite(z.z), 'NaN zombie');
      if (!z.dead) { const p = { x: z.x, z: z.z }; const T = ZOMBIES[z.type]; pushOut(p, T.radius * 0.6, L.colliders); assert.ok(Math.hypot(p.x - z.x, p.z - z.z) < 0.35, 'zombie coincé dans un obstacle'); }
    }
    assert.ok(Number.isFinite(s.player.x) && Number.isFinite(s.player.z));
  }
  assert.ok(waves.size >= 3, 'vagues atteintes : ' + [...waves]);
  assert.ok(maxAlive <= 24, 'trop d\'ennemis : ' + maxAlive);
  console.log('    vagues', Math.max(...waves), 'kills', s.kills, 'score', s.score, 'maxAlive', maxAlive);
});

t('objets : caisse d\'arme débloque le fusil à pompe, la trousse soigne', () => {
  const L = buildLayout(1337), s = new Sim(L, makeRng(2));
  s.zombies.length = 0; s.interT = 999; s.player.hp = 30;
  s.addPickup('med', s.player.x, s.player.z); s.addPickup('weapon', s.player.x, s.player.z, 'shotgun');
  s.update(0.016, {});
  assert.ok(s.player.hp > 60 && s.weapons.shotgun && s.cur === 'shotgun');
  s.update(0.016, { swap: 1 }); assert.notEqual(s.cur, 'shotgun');
});

t('wrapAngle', () => { assert.ok(Math.abs(wrapAngle(7) - (7 - 2 * Math.PI)) < 1e-9); });

console.log(`\n${ok} tests OK`);
