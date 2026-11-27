// Systèmes de SURVIE greffés sur la classe Sim (sim.js) : temps, besoins, inventaire, fouille, interactions,
// construction d'abris, sauvegarde. Aucune dépendance à three.js ni au DOM (testable sous Node).
import { PLAYER, WEAPONS, SURVIVAL as S, PIECES, PIECE_ORDER, LOOT, ITEMS, PICKUP } from './config.js';
import { pushOut, distToBox } from './logic.js';

const SLOT_ITEMS = ['bandage', 'food', 'water'];   // barre rapide : touches / boutons 1 2 3

export const survivalMethods = {
  // ---------------------------------------------------------------- initialisation (appelée par reset())
  initSurvival() {
    const L = this.layout;
    this.trees = L.trees.map((t, i) => ({ i, x: t.x, z: t.z, s: t.s, col: t.col, wood: 4 + Math.floor(this.rng() * 3), felled: false }));
    this.rocks = L.rocks.map((r, i) => ({ i, x: r.x, z: r.z, s: r.s, col: r.col, stone: 4 + Math.floor(this.rng() * 4), gone: false }));
    this.spots = L.lootSpots.map(s => ({ ...s, searched: false, at: 0 }));
    this.pieces = []; this.nextPid = 1;
    this.build = { on: false, piece: 'wall', ghost: null };
    this.prompt = null; this.tipT = -10; this.popT = 2; this.lootT = 0; this.warn = { h: false, t: false };
    this._prev = {};
    const d = L.cabin.door; this.addPiece('door', d.x, d.z, d.yaw);       // la porte de la cabane : fermée au départ
    this.nightFlag = this.isNight();
  },

  // ---------------------------------------------------------------- temps : jour / nuit
  hour() { return (this.clock / 3600) % 24; },
  day() { return Math.floor(this.clock / 86400) + 1; },
  daylight() {                       // 0.06 (nuit noire) → 1 (plein jour)
    const h = this.hour(), ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const up = ss(5, 7.2, h), down = 1 - ss(18, 20.5, h);
    return 0.06 + 0.94 * Math.min(up, down);
  },
  isNight() { return this.daylight() < 0.35; },
  tickClock(dt) {
    this.clock += dt * 86400 / (S.dayMinutes * 60);
    const n = this.isNight();
    if (n !== this.nightFlag) { this.nightFlag = n; this.emit({ type: 'phase', night: n, day: this.day() }); }
  },

  // ---------------------------------------------------------------- besoins
  updateNeeds(dt) {
    const P = this.player;
    P.hunger = Math.max(0, P.hunger - S.hungerPerSec * dt);
    P.thirst = Math.max(0, P.thirst - S.thirstPerSec * dt);
    if (P.hunger < 20 && !this.warn.h) { this.warn.h = true; this.emit({ type: 'tip', text: 'Vous avez faim…' }); } else if (P.hunger >= 25) this.warn.h = false;
    if (P.thirst < 20 && !this.warn.t) { this.warn.t = true; this.emit({ type: 'tip', text: 'Vous avez soif…' }); } else if (P.thirst >= 25) this.warn.t = false;
    let dmg = 0;
    if (P.hunger <= 0 || P.thirst <= 0) dmg += S.starveDmg;
    if (P.bleed) dmg += S.bleedDmg;
    if (dmg > 0) { P.hp -= dmg * dt; P.hurtT = Math.max(P.hurtT, 0.05); if (P.hp <= 0) this.killPlayer(P.bleed ? 'bleed' : 'starve'); }
    else if (P.hunger > 40 && P.thirst > 40 && P.hp < PLAYER.hp) P.hp = Math.min(PLAYER.hp, P.hp + S.regen * dt);
  },
  killPlayer(cause) {
    const P = this.player; if (P.dead) return;
    P.hp = 0; P.dead = true; P.deadT = 0; P.bleed = false; this.emit({ type: 'death', cause });
  },

  // ---------------------------------------------------------------- inventaire à emplacements
  canAfford(cost) { return Object.entries(cost).every(([k, n]) => (this.inv[k] || 0) >= n); },
  pay(cost) { for (const [k, n] of Object.entries(cost)) this.inv[k] -= n; },

  hasBag() { return (this.inv.backpack || 0) > 0; },
  slotsMax() { return this.hasBag() ? S.slots.bag : S.slots.base; },
  // emplacements pris par `n` objets de l'espèce `id` (0 pour les munitions et le sac à dos : pas de pile)
  slotsOf(id, n = this.inv[id] || 0) { const st = ITEMS[id] && ITEMS[id].stack; return st ? Math.ceil(n / st) : 0; },
  slotsUsed() { let u = 0; for (const id in ITEMS) u += this.slotsOf(id); return u; },
  // combien d'objets `id` peut-on encore ajouter (places libres + fin de la dernière pile) ; Infinity pour les munitions
  room(id) {
    const st = ITEMS[id] && ITEMS[id].stack; if (!st) return Infinity;
    const n = this.inv[id] || 0;
    return Math.max(0, (this.slotsMax() - this.slotsUsed()) * st + st * Math.ceil(n / st) - n);
  },
  // cases du sac, dans l'ordre d'affichage : [{ id, n }] (une case par pile entamée)
  bagCells() {
    const out = [];
    for (const id in ITEMS) {
      const st = ITEMS[id].stack, n = this.inv[id] || 0; if (!st) continue;
      for (let left = n; left > 0; left -= st) out.push({ id, n: Math.min(st, left) });
    }
    return out;
  },

  // Trop d'objets d'un coup (récolte, fouille, don) : ce qui dépasse tombe au sol à côté du joueur, en un seul tas.
  // On retire d'abord les objets qui viennent d'augmenter (le dernier ramassé), jamais les munitions.
  capInventory() {
    const prev = this._prev || (this._prev = {}), P = this.player, lost = {};
    if (this.slotsUsed() > this.slotsMax()) {
      const ids = Object.keys(ITEMS).filter(id => ITEMS[id].stack).sort((a, b) => ((this.inv[b] || 0) - (prev[b] || 0)) - ((this.inv[a] || 0) - (prev[a] || 0)));
      for (const id of ids) {
        while (this.slotsUsed() > this.slotsMax() && (this.inv[id] || 0) > 0) { this.inv[id]--; lost[id] = (lost[id] || 0) + 1; }
        if (this.slotsUsed() <= this.slotsMax()) break;
      }
    }
    let first = null;
    for (const id in lost) {
      first = first || id;
      const a = this.t * 3 + (this.nextId || 0), pk = this.addPickup(id, P.x + Math.sin(a) * 1.1, P.z + Math.cos(a) * 1.1);
      pk.n = lost[id]; pk.away = true;
    }
    if (first && this.t - this.tipT > 1.5) { this.tipT = this.t; this.emit({ type: 'tip', text: 'Sac plein : ' + ITEMS[first].name.toLowerCase() + ' laissé au sol' }); }
    if ((this.inv.backpack || 0) > 1) this.inv.backpack = 1;
    for (const id in ITEMS) prev[id] = this.inv[id] || 0;
  },

  // Donne un objet (ressource) ou une arme. Renvoie le libellé pour l'interface.
  giveItem(id, n = 1) {
    const W = WEAPONS[id];
    if (W) {
      if (!this.weapons[id]) this.weapons[id] = { ammo: W.melee ? 0 : Math.min(W.mag, 4 + (this.rng() * 4 | 0)) };
      else if (!W.melee) this.inv.ammo += 4;
      return { id, n: 1, weapon: true };
    }
    this.inv[id] = (this.inv[id] || 0) + n; return { id, n };
  },

  // Jeter `n` objets devant soi (menu inventaire). Le tas ne se ramasse pas tant qu'on ne s'en est pas éloigné.
  dropItem(id, n = 1) {
    const it = ITEMS[id]; if (!it || id === 'backpack') return 0;
    const k = Math.min(n, this.inv[id] || 0); if (k <= 0) return 0;
    const P = this.player, pk = this.addPickup(id, P.x + Math.sin(this.yaw) * S.dropGap, P.z + Math.cos(this.yaw) * S.dropGap);
    this.inv[id] -= k; pk.n = k; pk.away = true;
    this.emit({ type: 'drop', id, n: k });
    return k;
  },

  // Objets lâchés ou jetés dans un rayon r autour du joueur (liste « Au sol » de l'inventaire), les plus proches d'abord.
  nearbyPickups(r = 3.5) {
    const P = this.player;
    return this.pickups.map(p => ({ p, d: Math.hypot(p.x - P.x, p.z - P.z) })).filter(o => o.d < r).sort((a, b) => a.d - b.d).map(o => o.p);
  },
  // Ramasse à la main (inventaire) : prend ce qui rentre, le reste reste au sol.
  takePickup(pid) {
    const i = this.pickups.findIndex(p => p.id === pid); if (i < 0) return 0;
    const pk = this.pickups[i], want = pk.n || 1, k = Math.min(want, this.room(pk.kind));
    if (k <= 0) { this.emit({ type: 'tip', text: 'Plus de place dans le sac' }); return 0; }
    this.inv[pk.kind] = (this.inv[pk.kind] || 0) + k; pk.n = want - k;
    if (pk.n <= 0) this.pickups.splice(i, 1);
    this.emit({ type: 'pickup', kind: pk.kind, id: pk.id, n: k });
    return k;
  },

  // Ramassage automatique en marchant dessus (remplace la version de sim.js) : seulement ce qui rentre.
  updatePickups(dt) {
    const P = this.player;
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pk = this.pickups[i]; pk.t += dt;
      const d = Math.hypot(pk.x - P.x, pk.z - P.z);
      if (pk.away) { if (d > PICKUP.radius + 0.4) pk.away = false; continue; }   // objet qu'on vient de jeter : il faut s'éloigner d'abord
      if (d > PICKUP.radius) continue;
      const want = pk.n || 1, k = Math.min(want, this.room(pk.kind));
      if (k <= 0) continue;                                                     // sac plein : l'objet reste au sol
      this.inv[pk.kind] = (this.inv[pk.kind] || 0) + k; pk.n = want - k;
      if (pk.n <= 0) this.pickups.splice(i, 1);
      this.emit({ type: 'pickup', kind: pk.kind, id: pk.id, n: k });
    }
  },

  equip(id) { if (this.weapons[id] && this.cur !== id) { this.setWeapon(id); return true; } return false; },

  useItem(id) {
    const P = this.player;
    if (!(this.inv[id] > 0)) { this.emit({ type: 'tip', text: 'Vous n\'en avez pas' }); return; }
    if (id === 'bandage') {
      if (!P.bleed && P.hp >= PLAYER.hp) { this.emit({ type: 'tip', text: 'Pas besoin de bandage' }); return; }
      P.bleed = false; P.hp = Math.min(PLAYER.hp, P.hp + S.bandageHeal);
    } else if (id === 'food') {
      if (P.hunger >= 98) { this.emit({ type: 'tip', text: 'Vous n\'avez pas faim' }); return; }
      P.hunger = Math.min(100, P.hunger + S.foodGain);
    } else if (id === 'water') {
      if (P.thirst >= 98) { this.emit({ type: 'tip', text: 'Vous n\'avez pas soif' }); return; }
      P.thirst = Math.min(100, P.thirst + S.waterGain);
    } else return;
    this.inv[id]--; this.emit({ type: 'use', id });
  },
  updateItems(inp) {
    if (inp.slot && !this.build.on && SLOT_ITEMS[inp.slot - 1]) this.useItem(SLOT_ITEMS[inp.slot - 1]);
    this.capInventory();
  },

  // ---------------------------------------------------------------- fouille et interactions
  search(sp) {
    const table = LOOT[sp.kind] || LOOT.house, got = [];
    for (const [id, a, b, ch] of table.rolls) {
      if (id === 'backpack' && this.hasBag()) continue;                  // un seul sac à dos
      if (this.rng() < ch) got.push(this.giveItem(id, a + Math.floor(this.rng() * (b - a + 1))));
    }
    sp.searched = true; sp.at = this.t;
    this.emit({ type: 'loot', got, spot: sp.id });
  },

  updateInteract(inp) {
    const P = this.player; let best = null, bd = 1e9;
    for (const pc of this.pieces) {
      if (pc.kind !== 'door') continue;
      const d = Math.hypot(P.x - pc.x, P.z - pc.z);
      if (d < 2.3 && d < bd) { bd = d; best = { kind: 'door', pc, label: pc.open ? 'Fermer' : 'Ouvrir' }; }
    }
    for (const sp of this.spots) {
      if (sp.searched) continue;
      const d = distToBox(P.x, P.z, { x: sp.x, z: sp.z, hw: sp.hw, hd: sp.hd });
      if (d < 1.6 && d < bd) { bd = d; best = { kind: 'loot', sp, label: 'Fouiller' }; }
    }
    if (this.driving) best = { kind: 'exit', label: 'Descendre' };
    else for (const V of this.vehicles) {
      if (V.wrecked) continue;
      const d = this.vehicleDist(V, P.x, P.z);
      if (d < 1.7 && d < bd) { bd = d; best = { kind: 'vehicle', V, label: 'Conduire' }; }
    }
    this.prompt = this.build.on ? null : best;
    if (!inp.use || !this.prompt) return;
    if (best.kind === 'exit') this.exitVehicle();
    else if (best.kind === 'vehicle') this.enterVehicle(best.V);
    else if (best.kind === 'door') {
      best.pc.open = !best.pc.open; best.pc.col.off = best.pc.open;
      this.emit({ type: 'door', open: best.pc.open, id: best.pc.id });
    } else this.search(best.sp);
  },

  updateLootRespawn() {
    if (this.t - this.lootT < 5) return; this.lootT = this.t;
    for (const sp of this.spots) if (sp.searched && sp.kind !== 'cabin' && sp.kind !== 'tools' && this.t - sp.at > S.lootRespawn) sp.searched = false;
  },

  // ---------------------------------------------------------------- construction
  addPiece(kind, x, z, yaw) {
    const D = PIECES[kind], pc = { id: this.nextPid++, kind, x, z, yaw, hp: D.hp, max: D.hp, open: false };
    let col;
    if (kind === 'trap') { col = { x, z, hw: 0, hd: 0, off: true, piece: pc }; pc.col = col; this.pieces.push(pc); return pc; }   // le piège ne bloque rien : pas de collision
    if (kind === 'fire') col = { x, z, r: 0.45, piece: pc };
    else { const ax = Math.abs(Math.sin(yaw)) < 0.5; col = { x, z, hw: ax ? 1 : 0.2, hd: ax ? 0.2 : 1, h: D.h, piece: pc }; }
    pc.col = col; this.cols.push(col); this.pieces.push(pc); return pc;
  },
  removePiece(pc) {
    const i = this.pieces.indexOf(pc); if (i >= 0) this.pieces.splice(i, 1);
    const j = this.cols.indexOf(pc.col); if (j >= 0) this.cols.splice(j, 1);
  },
  damagePiece(pc, dmg) {
    pc.hp -= dmg; this.emit({ type: 'pieceHit', id: pc.id, x: pc.x, z: pc.z });
    if (pc.hp <= 0) { this.removePiece(pc); this.emit({ type: 'pieceBreak', id: pc.id, kind: pc.kind, x: pc.x, z: pc.z }); }
  },
  // Pièce de construction (fermée) touchée par un cercle (x, z, r) : sert aux zombies bloqués contre un mur.
  touchedPiece(x, z, r) {
    let best = null, bd = 1e9;
    for (const pc of this.pieces) {
      if (pc.col.off || pc.kind === 'trap') continue;
      const d = pc.kind === 'fire' ? Math.hypot(x - pc.x, z - pc.z) - pc.col.r : distToBox(x, z, pc.col);
      if (d < r && d < bd) { bd = d; best = pc; }
    }
    return best;
  },

  computeGhost() {
    const k = this.build.piece, P = this.player, g = S.grid, D = PIECES[k];
    const tx = P.x + Math.sin(this.yaw) * S.reach, tz = P.z + Math.cos(this.yaw) * S.reach;
    let x, z, yaw = 0;
    const dot = k === 'fire' || k === 'trap';                                                  // pièces « ponctuelles » (pas de mur)
    if (dot) { x = Math.round(tx * 2) / 2; z = Math.round(tz * 2) / 2; }
    else if (Math.abs(Math.cos(this.yaw)) >= Math.abs(Math.sin(this.yaw))) { x = Math.floor(tx / g) * g + g / 2; z = Math.round(tz / g) * g; }
    else { x = Math.round(tx / g) * g; z = Math.floor(tz / g) * g + g / 2; yaw = Math.PI / 2; }
    let ok = true, why = '';
    if (!this.canAfford(D.cost)) { ok = false; why = 'Pas assez de ' + Object.keys(D.cost).filter(c => (this.inv[c] || 0) < D.cost[c]).map(c => ITEMS[c].name.toLowerCase()).join(', '); }
    else if (this.pieces.some(p => Math.abs(p.x - x) < 0.3 && Math.abs(p.z - z) < 0.3)) { ok = false; why = 'Emplacement occupé'; }
    else {
      const ax = Math.abs(Math.sin(yaw)) < 0.5, pts = dot ? [[0, 0]] : [-0.5, 0, 0.5].map(o => (ax ? [o, 0] : [0, o]));
      for (const [ox, oz] of pts) { const p = { x: x + ox, z: z + oz }; if (pushOut(p, dot ? 0.5 : 0.2, this.cols) > 0) { ok = false; why = 'Un obstacle bloque'; break; } }
      if (ok) {
        const hw = dot ? 0.45 : ax ? 1 : 0.2, hd = dot ? 0.45 : ax ? 0.2 : 1;
        if (distToBox(P.x, P.z, { x, z, hw, hd }) < PLAYER.radius + 0.15) { ok = false; why = 'Écartez-vous'; }
      }
    }
    return { kind: k, x, z, yaw, ok, why };
  },

  updateBuildMode(inp) {
    const B = this.build;
    if (inp.build) { B.on = !B.on; this.emit({ type: 'buildMode', on: B.on }); }
    if (!B.on) { B.ghost = null; return; }
    if (inp.slot && PIECE_ORDER[inp.slot - 1]) B.piece = PIECE_ORDER[inp.slot - 1];
    if (inp.piece && PIECE_ORDER[inp.piece - 1]) B.piece = PIECE_ORDER[inp.piece - 1];
    B.ghost = this.computeGhost();
    if (inp.firePressed) {
      const g = B.ghost;
      if (!g.ok) { this.emit({ type: 'tip', text: g.why }); return; }
      this.pay(PIECES[g.kind].cost); this.addPiece(g.kind, g.x, g.z, g.yaw);
      this.noise(this.player.x, this.player.z, 14);
      this.emit({ type: 'build', kind: g.kind, x: g.x, z: g.z });
    }
  },

  // Piège à ours : un zombie qui marche dessus prend des dégâts et reste clé quelques secondes ; le piège casse après `hp` déclenchements.
  updateTraps() {
    for (const pc of [...this.pieces]) {
      if (pc.kind !== 'trap') continue;
      for (const z of this.zombies) {
        if (z.dead || (z.trapT || 0) > this.t) continue;
        if (Math.hypot(z.x - pc.x, z.z - pc.z) > S.trapR) continue;
        z.trapT = this.t + S.trapStun + 1;
        this.damageZombie(z, S.trapDmg, false, [z.x, 0.4, z.z]);
        if (!z.dead) z.stagger = Math.max(z.stagger || 0, S.trapStun);      // après damageZombie, qui remet un court étourdissement
        this.emit({ type: 'trap', x: pc.x, z: pc.z, id: pc.id });
        pc.hp--; if (pc.hp <= 0) { this.removePiece(pc); this.emit({ type: 'pieceBreak', id: pc.id, kind: 'trap', x: pc.x, z: pc.z }); break; }
      }
    }
  },

  updateFires(dt) {
    const P = this.player;
    this.updateTraps();
    for (const pc of this.pieces) {
      if (pc.kind !== 'fire') continue;
      if (!P.bleed && P.hp < PLAYER.hp && Math.hypot(P.x - pc.x, P.z - pc.z) < S.fireRadius) P.hp = Math.min(PLAYER.hp, P.hp + S.fireHeal * dt);
    }
  },

  // ---------------------------------------------------------------- sauvegarde
  serialize() {
    const P = this.player;
    return {
      v: 1, clock: this.clock, kills: this.kills, yaw: this.yaw, cur: this.cur, nextPid: this.nextPid,
      P: { x: P.x, z: P.z, hp: P.hp, stamina: P.stamina, hunger: P.hunger, thirst: P.thirst, bleed: P.bleed, face: P.face },
      inv: { ...this.inv }, weapons: JSON.parse(JSON.stringify(this.weapons)),
      felled: this.trees.filter(t => t.felled).map(t => t.i), mined: this.rocks.filter(r => r.gone).map(r => r.i),
      looted: this.spots.filter(s => s.searched).map(s => ({ id: s.id, age: Math.round(this.t - s.at) })),
      pieces: this.pieces.map(p => ({ kind: p.kind, x: p.x, z: p.z, yaw: p.yaw, hp: p.hp, open: p.open })),
      vehicles: this.vehicles.map(V => ({ x: V.x, z: V.z, yaw: V.yaw, hp: V.hp, wrecked: V.wrecked })),
    };
  },
  restore(d) {
    if (!d || d.v !== 1) return false;
    this.clock = d.clock; this.kills = d.kills || 0; this.yaw = d.yaw || 0; this.nextPid = 1;
    Object.assign(this.player, d.P, { dead: false, deadT: 0, moving: false, sprinting: false, hurtT: 0 });
    Object.assign(this.inv, d.inv); this.weapons = d.weapons; this.cur = this.weapons[d.cur] ? d.cur : 'knife';
    for (const i of d.felled || []) { const t = this.trees[i]; if (t && !t.felled) { t.felled = true; t.wood = 0; const j = this.cols.indexOf(t.col); if (j >= 0) this.cols.splice(j, 1); } }
    for (const i of d.mined || []) { const r = this.rocks[i]; if (r && !r.gone) { r.gone = true; r.stone = 0; const j = this.cols.indexOf(r.col); if (j >= 0) this.cols.splice(j, 1); } }
    for (const l of d.looted || []) { const s = this.spots[l.id]; if (s) { s.searched = true; s.at = this.t - l.age; } }
    for (const p of [...this.pieces]) this.removePiece(p);
    for (const p of d.pieces || []) { const pc = this.addPiece(p.kind, p.x, p.z, p.yaw); pc.hp = p.hp; pc.open = !!p.open; pc.col.off = pc.open; }
    (d.vehicles || []).forEach((o, i) => { const V = this.vehicles[i]; if (V) { V.x = o.x; V.z = o.z; V.yaw = o.yaw; V.hp = o.hp; V.wrecked = !!o.wrecked; V.v = 0; this.syncVehicleCols(V); } });
    this._prev = {}; for (const id in ITEMS) this._prev[id] = this.inv[id] || 0;
    this.nightFlag = this.isNight();
    return true;
  },
};
