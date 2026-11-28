// PNJ avec métiers (simulation pure, greffée sur Sim comme survival.js / vehicles.js) :
//   gangs  (hostiles : couteau/batte, pistolet, chiens) qui tiennent un camp ;
//   police (alliée : tient un poste de contrôle et tire sur les zombies proches) ;
//   marchands (troc : on échange du bois / de la pierre / des vivres contre des objets).
// Les PNJ hostiles se frappent et se tirent comme les zombies (sim.targets()). Ils ont un cercle de collision dans sim.cols.
import { clamp, lerpAngle, pushOut, blockedBetween } from './logic.js';
import { ZOMBIES, WEAPONS, ITEMS, SURVIVAL as S } from './config.js';

const CH = 'characters/Characters_';
// Champs communs avec ZOMBIES (h, radius, hp, stagger, model, scale) pour que le combat du joueur fonctionne tel quel.
export const NPC_TYPES = {
  gang_melee: { role: 'gang', name: 'Pillard', model: CH + 'Sam_SingleWeapon.gltf', builtin: 'WoodenBat_Saw', scale: 1.1, h: 1.75, radius: 0.4, hp: 75, speed: 3.0, dmg: 14, range: 1.4, cycle: 1.0, hitAt: 0.45, stagger: 0.3, sight: 17 },
  gang_gun:   { role: 'gang', name: 'Pillard armé', model: CH + 'Matt_SingleWeapon.gltf', gun: true, scale: 1.1, h: 1.75, radius: 0.4, hp: 65, speed: 2.6, dmg: 9, range: 11, cycle: 1.5, hitAt: 0, stagger: 0.3, sight: 20 },
  gang_dog:   { role: 'gang', name: 'Chien de garde', model: 'characters/Characters_GermanShepherd.gltf', dog: true, scale: 1.0, h: 0.9, radius: 0.38, hp: 40, speed: 4.4, dmg: 9, range: 1.25, cycle: 0.8, hitAt: 0.3, stagger: 0.2, sight: 18 },
  police:     { role: 'police', name: 'Policier', model: CH + 'Shaun_SingleWeapon.gltf', gun: true, scale: 1.1, h: 1.75, radius: 0.4, hp: 200, speed: 2.4, dmg: 30, range: 16, cycle: 1.1, hitAt: 0, stagger: 0.2, sight: 16 },
  merchant:   { role: 'merchant', name: 'Marchand', model: CH + 'Lis_SingleWeapon.gltf', scale: 1.1, h: 1.7, radius: 0.4, hp: 100, speed: 0, dmg: 0, range: 0, cycle: 1, hitAt: 0, stagger: 0.2, sight: 8 },
};
export const npcDef = (n) => NPC_TYPES[n.type];
export const NPC_MODELS = [...new Set(Object.values(NPC_TYPES).map(t => t.model))];

// Échanges : give → get. Les armes se donnent par leur identifiant d'arme (config WEAPONS).
export const DEALS = {
  general: { title: 'Marchand', deals: [
    { give: { wood: 6 }, get: { food: 1 } }, { give: { wood: 6 }, get: { water: 1 } },
    { give: { wood: 10, stone: 4 }, get: { bandage: 1 } }, { give: { stone: 8 }, get: { ammo: 12 } },
    { give: { wood: 15, stone: 10 }, get: { backpack: 1 } },
  ] },
  farm: { title: 'Fermier', deals: [
    { give: { wood: 4 }, get: { food: 2 } }, { give: { wood: 4 }, get: { water: 2 } },
    { give: { wood: 8 }, get: { bandage: 1 } }, { give: { stone: 4 }, get: { match: 1 } },
  ] },
  arms: { title: 'Marchand d’armes', deals: [
    { give: { stone: 10 }, get: { ammo: 18 } }, { give: { food: 2 }, get: { bandage: 1 } },
    { give: { wood: 15, stone: 10 }, get: { pistol: 1 } }, { give: { wood: 20, stone: 15 }, get: { shotgun: 1 } },
    { give: { wood: 25, stone: 20 }, get: { smg: 1 } }, { give: { wood: 30, stone: 25 }, get: { rifle: 1 } },
  ] },
};
export const GANG = { respawn: 480, away: 70, active: 95, leash: 48, dogAlert: 24, hit: 0.55 };

export const npcMethods = {
  initNpcs() {
    this.npcs = (this.layout.npcs || []).map(d => {
      const T = NPC_TYPES[d.type];
      const n = { id: d.id, npc: true, type: d.type, role: T.role, kind: d.kind || null, x: d.x, z: d.z, face: d.yaw || 0, home: { x: d.x, z: d.z }, hp: T.hp, maxHp: T.hp,
        hostile: T.role === 'gang', state: 'idle', alerted: false, anim: 'idle', atkT: 0, hitDone: false, shootT: 1 + (d.id % 5) * 0.3, stagger: 0, dead: false, deadT: 0, wanderT: 2 + (d.id % 7), target: null, lostT: 0, spawnAt: 0 };
      n.col = { x: n.x, z: n.z, r: T.radius + 0.05, npc: n }; this.cols.push(n.col);
      return n;
    });
  },
  // cibles du joueur : zombies + PNJ hostiles vivants
  targets() { return this.npcs.length ? this.zombies.concat(this.npcs.filter(n => n.hostile && !n.dead)) : this.zombies; },

  alertGang(x, z, r) { for (const n of this.npcs) if (n.hostile && !n.dead && Math.hypot(n.x - x, n.z - z) < r) n.alerted = true; },

  damageNpc(n, dmg, head, pt) {
    const T = NPC_TYPES[n.type];
    n.hp -= dmg; n.alerted = true; n.state = 'chase'; n.lostT = 0;
    this.emit({ type: 'hit', id: n.id, pt, head, dmg, kill: n.hp <= 0 });
    this.alertGang(n.x, n.z, GANG.dogAlert);
    if (n.hp <= 0) { this.killNpc(n, head); return; }
    if (dmg >= T.hp * 0.2 || this.rng() < 0.25) { n.stagger = T.stagger; n.atkT = 0; n.hitDone = false; }
  },
  killNpc(n, head) {
    n.dead = true; n.deadT = 0; n.anim = 'death'; n.col.off = true; n.spawnAt = this.t + GANG.respawn; this.kills++;
    this.emit({ type: 'kill', id: n.id, head, x: n.x, z: n.z });
    if (NPC_TYPES[n.type].dog) return;
    const r = this.rng();
    const pk = this.addPickup(r < 0.45 ? 'ammo' : r < 0.7 ? 'bandage' : r < 0.9 ? 'food' : 'water', n.x, n.z);
    if (pk.kind === 'ammo') pk.n = 6 + Math.floor(this.rng() * 8);
  },

  // ---------------------------------------------------------------- boucle des PNJ
  updateNpcs(dt) {
    const P = this.player, cols = this.cols, H = this.layout.half - 1;
    for (const n of this.npcs) {
      const T = NPC_TYPES[n.type], d = Math.hypot(P.x - n.x, P.z - n.z);
      if (n.dead) {
        n.deadT += dt;
        if (this.t > n.spawnAt && d > GANG.away) { n.dead = false; n.hp = n.maxHp; n.x = n.home.x; n.z = n.home.z; n.state = 'idle'; n.col.off = false; n.anim = 'idle'; n.alerted = false; this.syncNpcCol(n); }
        continue;
      }
      if (d > GANG.active) continue;                       // trop loin : figé (économie de calcul)
      if (n.stagger > 0) { n.stagger -= dt; n.anim = 'hit'; continue; }
      if (T.role === 'merchant') this.merchantAI(n, d, dt);
      else if (T.role === 'police') this.policeAI(n, T, dt, cols, H);
      else this.gangAI(n, T, d, dt, cols, H);
      this.syncNpcCol(n);
    }
  },
  syncNpcCol(n) { n.col.x = n.x; n.col.z = n.z; },

  // déplacement avec collisions (le cercle du PNJ lui-même est ignoré le temps du calcul)
  stepNpc(n, T, ux, uz, sp, dt, cols, H) {
    const p = { x: clamp(n.x + ux * sp * dt, -H, H), z: clamp(n.z + uz * sp * dt, -H, H) };
    n.col.off = true; pushOut(p, T.radius, cols); n.col.off = false;
    n.x = p.x; n.z = p.z; n.face = lerpAngle(n.face, Math.atan2(ux, uz), Math.min(1, 10 * dt));
  },
  wanderNpc(n, T, dt, cols, H, rad, speedK) {
    n.wanderT -= dt;
    if (!n.target && n.wanderT <= 0) n.target = { x: n.home.x + (this.rng() * 2 - 1) * rad, z: n.home.z + (this.rng() * 2 - 1) * rad };
    if (!n.target) { n.anim = 'idle'; return; }
    const dx = n.target.x - n.x, dz = n.target.z - n.z, dd = Math.hypot(dx, dz);
    if (dd < 0.5 || n.wanderT < -10) { n.target = null; n.wanderT = 3 + this.rng() * 6; n.anim = 'idle'; return; }
    this.stepNpc(n, T, dx / dd, dz / dd, T.speed * speedK, dt, cols, H); n.anim = 'walk';
  },

  merchantAI(n, d, dt) {
    if (d < 7) n.face = lerpAngle(n.face, Math.atan2(this.player.x - n.x, this.player.z - n.z), Math.min(1, 5 * dt));
    n.anim = d < 5 ? 'wave' : 'idle';
  },

  policeAI(n, T, dt, cols, H) {
    n.shootT -= dt;
    let best = null, bd = T.range;
    for (const z of this.zombies) {
      if (z.dead) continue;
      const d = Math.hypot(z.x - n.x, z.z - n.z);
      if (d < bd && !blockedBetween(n.x, n.z, z.x, z.z, cols, 1.0)) { bd = d; best = z; }
    }
    if (best) {
      n.face = lerpAngle(n.face, Math.atan2(best.x - n.x, best.z - n.z), Math.min(1, 10 * dt)); n.anim = 'aim';
      if (n.shootT <= 0) {
        n.shootT = T.cycle; const Z = ZOMBIES[best.type], pt = [best.x, Z.h * 0.62, best.z];
        if (Math.hypot(n.x - this.player.x, n.z - this.player.z) < 45) this.emit({ type: 'shot', w: 'pistol', from: [n.x + Math.sin(n.face) * 0.5, 1.35, n.z + Math.cos(n.face) * 0.5], to: pt, hit: true, first: true });
        if (this.rng() < 0.8) this.policeHit(best, T.dmg, pt);
      }
    } else this.wanderNpc(n, T, dt, cols, H, 2.5, 0.5);
  },
  // Dégâts des policiers sur un zombie : ni butin ni compteur de victimes du joueur.
  policeHit(z, dmg, pt) {
    z.hp -= dmg; z.stagger = 0.3; z.atkT = 0; z.hitDone = false;
    this.emit({ type: 'hit', id: z.id, pt, head: false, dmg, kill: z.hp <= 0 });
    if (z.hp <= 0) { z.dead = true; z.deadT = 0; z.anim = 'death'; this.emit({ type: 'kill', id: z.id, head: false, x: z.x, z: z.z }); }
  },

  gangAI(n, T, d, dt, cols, H) {
    const P = this.player;
    if (P.dead) { n.anim = 'idle'; return; }
    if (n.state !== 'chase') {
      const sight = T.sight * (this.isNight() ? 0.75 : 1) * (P.sprinting ? 1.4 : P.moving ? 1 : 0.6) * (P.crouch ? 0.6 : 1);
      if (n.alerted || (d < sight && !blockedBetween(n.x, n.z, P.x, P.z, cols))) { n.state = 'chase'; n.alerted = false; n.lostT = 0; if (!T.dog) this.alertGang(n.x, n.z, GANG.dogAlert); }
      else { this.wanderNpc(n, T, dt, cols, H, 5, 0.45); return; }
    }
    const dx = P.x - n.x, dz = P.z - n.z, hd = Math.hypot(n.x - n.home.x, n.z - n.home.z);
    const los = !blockedBetween(n.x, n.z, P.x, P.z, cols, 1.0);
    n.lostT = los ? 0 : n.lostT + dt;
    if (d > GANG.leash + 8 || hd > GANG.leash || n.lostT > 8) {            // retour au camp
      n.state = 'idle'; n.target = null; const hx = n.home.x - n.x, hz = n.home.z - n.z, hl = Math.hypot(hx, hz) || 1;
      if (hl > 1) { this.stepNpc(n, T, hx / hl, hz / hl, T.speed, dt, cols, H); n.anim = 'run'; } return;
    }
    if (T.gun) {                                                           // tireur : garde ses distances et tire
      n.face = lerpAngle(n.face, Math.atan2(dx, dz), Math.min(1, 10 * dt));
      if (d > T.range - 2 || !los) { this.stepNpc(n, T, dx / d, dz / d, T.speed * 1.3, dt, cols, H); n.anim = 'walkgun'; }
      else if (d < 4) { this.stepNpc(n, T, -dx / d, -dz / d, T.speed, dt, cols, H); n.anim = 'walkgun'; }
      else n.anim = 'aim';
      n.shootT -= dt;
      if (los && d < T.range + 2 && n.shootT <= 0) {
        n.shootT = T.cycle * (0.8 + this.rng() * 0.5);
        const acc = GANG.hit * (P.sprinting ? 0.55 : P.moving ? 0.8 : 1) * (P.crouch ? 0.7 : 1) * (this.driving ? 0.5 : 1);
        const hit = this.rng() < acc, ey = 1.1 + (P.y || 0), spread = hit ? 0 : (this.rng() < 0.5 ? -1 : 1) * (0.8 + this.rng());
        this.emit({ type: 'shot', w: 'pistol', from: [n.x + Math.sin(n.face) * 0.5, 1.35, n.z + Math.cos(n.face) * 0.5], to: [P.x - dz / d * spread, ey, P.z + dx / d * spread], hit, first: true });
        if (hit) this.hurtPlayer(T.dmg, n);
        this.alertGang(n.x, n.z, 14); this.noise(n.x, n.z, 20);
      }
      return;
    }
    // mêlée (pillard ou chien)
    if (d < T.range && los) {
      n.anim = 'attack'; n.atkT += dt; n.face = lerpAngle(n.face, Math.atan2(dx, dz), Math.min(1, 12 * dt));
      if (!n.hitDone && n.atkT >= T.hitAt) { n.hitDone = true; if (d < T.range + 0.5 && (P.y || 0) < 0.5) this.hurtPlayer(T.dmg, n); }
      if (n.atkT >= T.cycle) { n.atkT = 0; n.hitDone = false; }
      return;
    }
    n.atkT = 0; n.hitDone = false;
    this.stepNpc(n, T, dx / d, dz / d, T.speed, dt, cols, H); n.anim = 'run';
  },

  // ---------------------------------------------------------------- commerce
  npcById(id) { return this.npcs.find(n => n.id === id); },
  dealsOf(id) { const n = this.npcById(id); return n && n.kind ? DEALS[n.kind] : null; },
  dealState(deal) {
    const gets = Object.entries(deal.get);
    if (!this.canAfford(deal.give)) return { ok: false, why: 'Il vous manque des ressources' };
    for (const [id, k] of gets) {
      if (id === 'backpack' && this.hasBag()) return { ok: false, why: 'Vous avez déjà un sac' };
      if (!WEAPONS[id] && this.room(id) < k) return { ok: false, why: 'Plus de place dans le sac' };
    }
    return { ok: true, why: '' };
  },
  doDeal(id, k) {
    const set = this.dealsOf(id), deal = set && set.deals[k]; if (!deal) return false;
    const st = this.dealState(deal);
    if (!st.ok) { this.emit({ type: 'tip', text: st.why }); return false; }
    this.pay(deal.give);
    for (const [it, q] of Object.entries(deal.get)) this.giveItem(it, q);
    this.emit({ type: 'trade-done', id, k });
    return true;
  },
  itemLabel(id) { return WEAPONS[id] ? WEAPONS[id].name : (ITEMS[id] ? ITEMS[id].name : id); },
};
