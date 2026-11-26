import assert from 'node:assert/strict';
import { survivalMethods } from '../3d/js/survival.js';
import { SURVIVAL as S } from '../3d/js/config.js';
const mk = () => { const s = Object.assign({ t: 1, nextId: 1, yaw: 0, tipT: -10, events: [], pickups: [], player: { x: 0, z: 0 }, inv: { wood: 0, stone: 0, food: 0, water: 1, bandage: 0, ammo: 0 }, weapons: { knife: { ammo: 0 } }, cur: 'knife', rng: Math.random,
  emit(e) { this.events.push(e); }, addPickup(kind, x, z) { const pk = { id: this.nextId++, kind, x, z, t: 0 }; this.pickups.push(pk); return pk; }, setWeapon(id) { this.cur = id; } }, survivalMethods); return s; };
let ok = 0; const t = (n, f) => { f(); ok++; console.log('  ok', n); };
t('emplacements : 8 de base, piles, ammo gratuit', () => {
  const s = mk(); assert.equal(s.slotsMax(), 8); assert.equal(s.slotsUsed(), 1);         // 1 eau
  s.inv.wood = 11; assert.equal(s.slotsOf('wood'), 3); s.inv.ammo = 500; assert.equal(s.slotsUsed(), 4);
  assert.deepEqual(s.bagCells().map(c => c.id + c.n), ['wood5', 'wood5', 'wood1', 'water1']);
  assert.equal(s.room('ammo'), Infinity);
});
t('room : reste de pile + places libres', () => {
  const s = mk(); s.inv.wood = 4; s.inv.water = 0;            // 1 case (4/5)
  assert.equal(s.room('wood'), 1 + 7 * 5);
  s.inv.stone = 28; assert.equal(s.slotsUsed(), 1 + 7); assert.equal(s.room('wood'), 1); assert.equal(s.room('stone'), 0);
});
t('surplus : le dernier objet ramassé tombe au sol en un tas, un message', () => {
  const s = mk(); s.inv.water = 0; s.inv.stone = 16; s.capInventory(); s.events.length = 0;   // 4 cases de pierre
  s.inv.wood = 25;                                          // +5 cases → 9 > 8
  s.capInventory();
  assert.ok(s.slotsUsed() <= 8, 'cases : ' + s.slotsUsed());
  assert.equal(s.inv.stone, 16, 'on ne retire pas ce qu\'on possédait déjà'); assert.equal(s.inv.wood, 20);
  assert.equal(s.pickups.length, 1); assert.equal(s.pickups[0].n, 5); assert.ok(s.pickups[0].away);
  assert.ok(s.events.some(e => e.type === 'tip' && /Sac plein/.test(e.text)));
});
t('sac à dos : 20 cases, un seul', () => {
  const s = mk(); s.inv.backpack = 1; assert.equal(s.slotsMax(), S.slots.bag); s.inv.wood = 50; s.capInventory(); assert.equal(s.inv.wood, 50);
  s.inv.backpack = 3; s.capInventory(); assert.equal(s.inv.backpack, 1);
});
t('jeter : tas devant soi, pas ramassé tant qu\'on est dessus, repris en s\'éloignant puis revenant', () => {
  const s = mk(); s.inv.food = 2; assert.equal(s.dropItem('food', 5), 2); assert.equal(s.inv.food, 0);
  const pk = s.pickups[0]; assert.equal(pk.n, 2); assert.ok(pk.away);
  s.updatePickups(0.1); assert.equal(s.inv.food, 0, 'pas ramassé tout de suite');
  s.player.z = 5; s.updatePickups(0.1); assert.ok(!pk.away); s.player.z = pk.z; s.updatePickups(0.1);
  assert.equal(s.inv.food, 2); assert.equal(s.pickups.length, 0);
  assert.equal(s.dropItem('backpack', 1), 0);
});
t('ramassage partiel et prise à la main', () => {
  const s = mk(); s.inv.water = 0; s.inv.stone = 28;          // 7 cases de pierre, 1 libre
  const pk = s.addPickup('wood', 0, 0); pk.n = 12;
  s.updatePickups(0.1); assert.equal(s.inv.wood, 5); assert.equal(pk.n, 7); assert.equal(s.pickups.length, 1);
  s.updatePickups(0.1); assert.equal(s.inv.wood, 5, 'sac plein');
  assert.equal(s.takePickup(pk.id), 0); assert.ok(s.events.some(e => /Plus de place/.test(e.text)));
  s.inv.stone = 0; assert.equal(s.takePickup(pk.id), 7); assert.equal(s.pickups.length, 0);
});
t('équiper / au sol', () => {
  const s = mk(); s.weapons.axe = { ammo: 0 }; assert.ok(s.equip('axe')); assert.equal(s.cur, 'axe'); assert.ok(!s.equip('axe')); assert.ok(!s.equip('rifle'));
  const a = s.addPickup('food', 1, 0), b = s.addPickup('wood', 0.5, 0), c = s.addPickup('wood', 9, 0);
  assert.deepEqual(s.nearbyPickups().map(p => p.id), [b.id, a.id]);
});
console.log(`\n${ok} tests emplacements OK`);
