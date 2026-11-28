// Tests des PNJ (gangs, police, marchands) : node tests/npc.mjs
import { buildLayout } from '../3d/js/layout.js';
import { Sim } from '../3d/js/sim.js';
import assert from 'node:assert/strict';
const L = buildLayout(1337);
let s0 = 7; const rng = () => ((s0 = (s0 * 16807) % 2147483647) / 2147483647);
const sim = new Sim(L, rng);
const ok = (n) => console.log('  ok', n);
assert(L.npcs.length >= 25); ok('PNJ placés : ' + L.npcs.length);
for (const r of ['gang', 'police', 'merchant']) assert(L.camps.some(c => c.role === r), r); ok('camps, postes, marchands');
const m = sim.npcs.find(n => n.role === 'merchant');
sim.player.x = m.x + Math.sin(m.face) * 2.6; sim.player.z = m.z + Math.cos(m.face) * 2.6; sim.update(0.05, { mx: 0, my: 0 });
assert.equal(sim.prompt && sim.prompt.label, 'Commercer'); ok('invite « Commercer »');
sim.inv.wood = 12; assert(sim.doDeal(m.id, 0)); assert.equal(sim.inv.wood, 6); assert.equal(sim.inv.food, 1); ok('troc : 6 bois → 1 conserve');
assert(!sim.doDeal(m.id, 4)); ok('troc refusé sans ressources');
const g = sim.npcs.find(n => n.type === 'gang_gun'); sim.player.x = g.x + 9; sim.player.z = g.z; sim.player.hp = 100;
let shots = 0; for (let i = 0; i < 200; i++) { sim.update(0.05, { mx: 0, my: 0 }); shots += sim.drain().filter(e => e.type === 'shot').length; }
assert(shots > 0); ok('un tireur de gang ouvre le feu');
sim.player.dead = false; sim.over = false; sim.player.hp = 100;
const mel = sim.npcs.find(n => n.type === 'gang_melee'); const pk = sim.pickups.length;
sim.damageZombie(mel, 999, true, [mel.x, 1, mel.z]); assert(mel.dead && mel.col.off && sim.pickups.length > pk); ok('un pillard tué lâche du butin');
const sim2 = new Sim(L, rng); assert(sim2.restore(sim.serialize())); assert(sim2.npcs.find(n => n.id === mel.id).dead); ok('sauvegarde des PNJ');
const po = sim.npcs.find(n => n.type === 'police'); const z = sim.spawnZombie('basic', {}); z.x = po.x + 6; z.z = po.z; z.state = 'idle'; sim.player.x = po.x + 10; sim.player.z = po.z + 5;
for (let i = 0; i < 160; i++) sim.update(0.05, { mx: 0, my: 0 }); assert(z.dead); ok('la police abat les zombies proches');
console.log('\nPNJ OK');
