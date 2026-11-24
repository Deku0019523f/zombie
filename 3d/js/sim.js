// Simulation du jeu (aucune dépendance à three.js ni au DOM) : joueur, armes, zombies, vagues, objets.
// Le rendu lit l'état (sim.player, sim.zombies, sim.pickups) et consomme sim.drain() (événements).
import { CAMERA, PLAYER, WEAPONS, WEAPON_ORDER, ASSIST, HEAD_MULT, ZOMBIES, ZOMBIE_AGGRO, ALERT_RADIUS, RUN_ABOVE, WAVE, PICKUP } from './config.js';
import { clamp, lerpAngle, wrapAngle, pushOut, raySphere, normalize3, cameraRig } from './logic.js';

export class Sim {
  constructor(layout, rng = Math.random) {
    this.layout = layout; this.rng = rng; this.events = [];
    this.reset();
  }

  emit(e) { this.events.push(e); }
  drain() { const e = this.events; this.events = []; return e; }

  reset() {
    this.t = 0; this.nextId = 1; this.events = [];
    this.player = { x: 0, z: 3, hp: PLAYER.hp, stamina: PLAYER.stamina, face: 0, moving: false, speed: 0, sprinting: false, hurtT: 0, dead: false, deadT: 0, regenLock: 0 };
    this.yaw = 0; this.pitch = 0.14;
    this.weapons = { pistol: { ammo: WEAPONS.pistol.mag, reserve: WEAPONS.pistol.reserve } };
    this.cur = 'pistol'; this.fireCD = 0; this.reloadT = 0; this.reloadTotal = 0;
    this.zombies = []; this.pickups = [];
    this.score = 0; this.kills = 0; this.wave = 0; this.queue = []; this.spawnT = 0;
    this.state = 'intermission'; this.interT = 3; this.over = false; this.shots = 0; this.hits = 0;
    for (let i = 0; i < WAVE.ambient; i++) this.spawnZombie(this.pickType(1), { ambient: true });
  }

  get hostiles() { return this.zombies.filter(z => !z.dead && !z.ambient).length + this.queue.length; }
  get alive() { return this.zombies.filter(z => !z.dead).length; }
  get camera() { return cameraRig(this.player.x, this.player.z, this.yaw, this.pitch, CAMERA); }
  look(dyaw, dpitch) { this.yaw += dyaw; this.pitch = clamp(this.pitch + dpitch, CAMERA.pitchMin, CAMERA.pitchMax); }

  update(dt, inp) {
    if (this.over) return;
    dt = Math.min(dt, 0.05); this.t += dt;
    const P = this.player;
    if (P.dead) {
      P.deadT += dt; this.updateZombies(dt);
      if (P.deadT > 2.2) { this.over = true; this.emit({ type: 'gameover', score: this.score, wave: this.wave, kills: this.kills }); }
      return;
    }
    this.updatePlayer(dt, inp); this.updateWeapon(dt, inp);
    this.updateZombies(dt); this.updatePickups(dt); this.updateWaves(dt);
  }

  // ---------------------------------------------------------------- joueur
  updatePlayer(dt, inp) {
    const P = this.player, H = this.layout.half - 0.8;
    const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    let mx = inp.mx || 0, my = inp.my || 0;
    const m = Math.hypot(mx, my);
    if (m > 1) { mx /= m; my /= m; }
    const mag = Math.min(1, m);
    P.sprinting = !!inp.sprint && mag > 0.2 && P.stamina > 4;
    if (P.sprinting) { P.stamina = Math.max(0, P.stamina - PLAYER.drain * dt); P.regenLock = 0.7; }
    else { P.regenLock = Math.max(0, P.regenLock - dt); if (P.regenLock === 0) P.stamina = Math.min(PLAYER.stamina, P.stamina + PLAYER.regen * dt); }
    const speed = (P.sprinting ? PLAYER.sprint : PLAYER.speed) * mag;
    const vx = (sy * my + -cy * mx) * speed, vz = (cy * my + sy * mx) * speed;
    const p = { x: P.x + vx * dt, z: P.z + vz * dt };
    p.x = clamp(p.x, -H, H); p.z = clamp(p.z, -H, H);
    pushOut(p, PLAYER.radius, this.layout.colliders);
    P.x = p.x; P.z = p.z; P.speed = speed; P.moving = mag > 0.1;
    // Le corps suit la direction de marche, mais jamais dos à la caméra : en reculant on garde le regard vers l'avant (pas de face à la caméra).
    let target = P.face;
    if (inp.fire || this.reloadT > 0) target = this.yaw;
    else if (P.moving) {
      const am = Math.atan2(vx, vz);
      target = Math.abs(wrapAngle(am - this.yaw)) > Math.PI / 2 ? am + Math.PI : am;
    }
    P.face = lerpAngle(P.face, target, Math.min(1, PLAYER.turn * dt));
    P.hurtT = Math.max(0, P.hurtT - dt);
  }

  // ---------------------------------------------------------------- armes
  owned() { return WEAPON_ORDER.filter(w => this.weapons[w]); }

  updateWeapon(dt, inp) {
    this.fireCD = Math.max(0, this.fireCD - dt);
    const W = WEAPONS[this.cur], S = this.weapons[this.cur];
    if (inp.swap) this.swapWeapon(inp.swap === -1 ? -1 : 1);
    if (inp.select) {
      const id = WEAPON_ORDER[inp.select - 1];
      if (id && this.weapons[id] && id !== this.cur) { this.cur = id; this.reloadT = 0; this.fireCD = 0.2; this.emit({ type: 'swap', w: id }); }
    }
    if (this.reloadT > 0) {
      this.reloadT -= dt;
      if (this.reloadT <= 0) {
        const cw = WEAPONS[this.cur], cs = this.weapons[this.cur];
        const take = Math.min(cw.mag - cs.ammo, cs.reserve);
        cs.ammo += take; cs.reserve -= take; this.reloadT = 0;
        this.emit({ type: 'reloaded', w: this.cur });
      }
      return;
    }
    if (inp.reload) this.startReload();
    // Maintenir le bouton tire à la cadence de l'arme (plus simple au tactile que de marteler l'écran).
    if (inp.fire && this.fireCD <= 0) {
      if (S.ammo > 0) this.shoot();
      else if (S.reserve > 0) this.startReload();
      else if (inp.firePressed) this.emit({ type: 'empty' });
    }
  }

  startReload() {
    const W = WEAPONS[this.cur], S = this.weapons[this.cur];
    if (this.reloadT > 0 || S.ammo >= W.mag || S.reserve <= 0) return false;
    this.reloadT = this.reloadTotal = W.reload;
    this.emit({ type: 'reload', w: this.cur, t: W.reload });
    return true;
  }

  swapWeapon(dir = 1) {
    const list = this.owned(); if (list.length < 2) return;
    const i = list.indexOf(this.cur);
    this.cur = list[(i + dir + list.length) % list.length];
    this.reloadT = 0; this.fireCD = 0.2;
    this.emit({ type: 'swap', w: this.cur });
  }

  muzzle() {
    const P = this.player, sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    return [P.x + sy * 0.55 - cy * 0.2, 1.38, P.z + cy * 0.55 + sy * 0.2];
  }

  hitSpheres(z) {
    const T = ZOMBIES[z.type];
    return [
      { k: 'head', y: T.h - 0.2, r: 0.22 },
      { k: 'torso', y: T.h * 0.62, r: Math.max(0.42, T.radius + 0.06) },
      { k: 'legs', y: T.h * 0.28, r: Math.max(0.34, T.radius) },
    ];
  }

  // Visée assistée : zombie vivant le plus proche de l'axe de la caméra (dans un cône), sinon point lointain.
  aimPoint(cam, range) {
    let best = null, bestAng = ASSIST;
    const mz = this.muzzle();
    for (const z of this.zombies) {
      if (z.dead) continue;
      const T = ZOMBIES[z.type], y = T.h * 0.62;
      const vx = z.x - cam.pos[0], vy = y - cam.pos[1], vz = z.z - cam.pos[2];
      const l = Math.hypot(vx, vy, vz) || 1;
      const ang = Math.acos(clamp((vx * cam.dir[0] + vy * cam.dir[1] + vz * cam.dir[2]) / l, -1, 1));
      const dm = Math.hypot(z.x - mz[0], z.z - mz[2]);
      if (ang < bestAng && dm < range) { bestAng = ang; best = [z.x, y + (T.h * 0.18), z.z]; }
    }
    return best || [cam.pos[0] + cam.dir[0] * 60, cam.pos[1] + cam.dir[1] * 60, cam.pos[2] + cam.dir[2] * 60];
  }

  shoot() {
    const W = WEAPONS[this.cur], S = this.weapons[this.cur], P = this.player;
    S.ammo--; this.fireCD = W.interval; this.shots++;
    const cam = this.camera, mz = this.muzzle();
    const aim = this.aimPoint(cam, W.range);
    const base = normalize3([aim[0] - mz[0], aim[1] - mz[1], aim[2] - mz[2]]);
    const ay = Math.atan2(base[0], base[2]), ap = Math.asin(clamp(base[1], -1, 1));
    const spread = W.spread * (P.moving ? 1.5 : 1) * (P.sprinting ? 1.4 : 1);
    let anyHit = false;
    for (let i = 0; i < W.pellets; i++) {
      const y2 = ay + (this.rng() * 2 - 1) * spread, p2 = ap + (this.rng() * 2 - 1) * spread;
      const d = [Math.sin(y2) * Math.cos(p2), Math.sin(p2), Math.cos(y2) * Math.cos(p2)];
      const r = this.hitscan(mz, d, W);
      anyHit = anyHit || r.hit;
      this.emit({ type: 'shot', w: this.cur, from: mz, to: r.end, hit: r.hit, first: i === 0 });
    }
    if (anyHit) this.hits++;
    for (const z of this.zombies) if (!z.dead && Math.hypot(z.x - P.x, z.z - P.z) < ALERT_RADIUS) z.alerted = true;
    this.emit({ type: 'recoil', amount: W.kick });
  }

  hitscan(o, d, W) {
    const cand = [];
    for (const z of this.zombies) {
      if (z.dead) continue;
      let bt = -1, bk = null;
      for (const s of this.hitSpheres(z)) {
        const t = raySphere(o[0], o[1], o[2], d[0], d[1], d[2], z.x, s.y, z.z, s.r);
        if (t >= 0 && t <= W.range && (bt < 0 || t < bt)) { bt = t; bk = s.k; }
      }
      if (bt >= 0) cand.push({ z, t: bt, k: bk });
    }
    cand.sort((a, b) => a.t - b.t);
    let end = W.range, n = 0;
    for (const c of cand) {
      if (n >= W.pierce) break;
      const head = c.k === 'head';
      const fall = W.pellets > 1 ? 1 - 0.55 * (c.t / W.range) : 1;
      const dmg = W.dmg * fall * (head ? HEAD_MULT : 1);
      const pt = [o[0] + d[0] * c.t, o[1] + d[1] * c.t, o[2] + d[2] * c.t];
      this.damageZombie(c.z, dmg, head, pt);
      end = c.t; n++;
    }
    return { hit: n > 0, end: [o[0] + d[0] * end, o[1] + d[1] * end, o[2] + d[2] * end] };
  }

  damageZombie(z, dmg, head, pt) {
    const T = ZOMBIES[z.type];
    z.hp -= dmg; z.alerted = true; z.state = 'chase'; z.ambient = false;
    this.emit({ type: 'hit', id: z.id, pt, head, dmg, kill: z.hp <= 0 });
    if (z.hp <= 0) { this.killZombie(z, head); return; }
    if (dmg >= T.hp * 0.18 || this.rng() < 0.25) { z.stagger = T.stagger; z.atkT = 0; z.hitDone = false; }
  }

  killZombie(z, head) {
    const T = ZOMBIES[z.type];
    z.dead = true; z.deadT = 0; z.anim = 'death'; this.kills++;
    this.score += T.score + (head ? 5 : 0);
    this.emit({ type: 'kill', id: z.id, head, x: z.x, z: z.z, score: T.score });
    const r = this.rng();
    if (r < PICKUP.dropMed) this.addPickup('med', z.x, z.z);
    else if (r < PICKUP.dropMed + PICKUP.dropAmmo) this.addPickup('ammo', z.x, z.z);
  }

  // ---------------------------------------------------------------- zombies
  pickType(wave) {
    const w = [['basic', 1]];
    if (wave >= 2) w.push(['arm', 0.5 + 0.04 * wave]);
    if (wave >= 3) w.push(['ribcage', 0.35 + 0.03 * wave]);
    if (wave >= 4) w.push(['chubby', 0.2 + 0.03 * wave]);
    const tot = w.reduce((s, x) => s + x[1], 0);
    let r = this.rng() * tot;
    for (const [t, v] of w) { if ((r -= v) <= 0) return t; }
    return 'basic';
  }

  spawnZombie(type, opts = {}) {
    const P = this.player, H = this.layout.half - 3, T = ZOMBIES[type];
    let x = 0, z = 0, ok = false;
    for (let i = 0; i < 25 && !ok; i++) {
      const a = this.rng() * Math.PI * 2;
      const r = opts.ambient ? 18 + this.rng() * (H - 10) : WAVE.spawnMin + this.rng() * (WAVE.spawnMax - WAVE.spawnMin);
      x = clamp(P.x + Math.sin(a) * r, -H, H); z = clamp(P.z + Math.cos(a) * r, -H, H);
      const p = { x, z };
      ok = pushOut(p, T.radius + 0.3, this.layout.colliders) === 0 && Math.hypot(x - P.x, z - P.z) > (opts.ambient ? 14 : 16);
    }
    if (!ok) return null;
    const speed = T.speed * (0.9 + this.rng() * 0.25);
    const zb = { id: this.nextId++, type, x, z, hp: T.hp, maxHp: T.hp, face: this.rng() * 6.28, speed, state: opts.ambient ? 'idle' : 'chase', ambient: !!opts.ambient, alerted: false, anim: 'idle', atkT: 0, hitDone: false, stagger: 0, dead: false, deadT: 0, progT: 0, detourT: 0, detourDir: 1 };
    this.zombies.push(zb);
    return zb;
  }

  updateZombies(dt) {
    const P = this.player, Z = this.zombies, cols = this.layout.colliders, H = this.layout.half - 1;
    for (let i = Z.length - 1; i >= 0; i--) {
      const z = Z[i];
      if (z.dead) { z.deadT += dt; if (z.deadT > 6) Z.splice(i, 1); continue; }
      const T = ZOMBIES[z.type];
      const dx = P.x - z.x, dz = P.z - z.z, d = Math.hypot(dx, dz) || 0.001;
      if (z.state === 'idle') {
        if (!P.dead && (d < ZOMBIE_AGGRO || z.alerted)) z.state = 'chase';
        else { z.anim = 'idle'; continue; }
      }
      if (P.dead) { z.anim = 'idle'; continue; }
      if (z.stagger > 0) { z.stagger -= dt; z.anim = 'hit'; continue; }
      if (d < T.range) {
        z.anim = 'attack'; z.atkT += dt;
        z.face = lerpAngle(z.face, Math.atan2(dx, dz), Math.min(1, 12 * dt));
        if (!z.hitDone && z.atkT >= T.hitAt) { z.hitDone = true; if (d < T.range + 0.5) this.hurtPlayer(T.dmg, z); }
        if (z.atkT >= T.cycle) { z.atkT = 0; z.hitDone = false; }
        continue;
      }
      z.atkT = 0; z.hitDone = false;
      let ux = dx / d, uz = dz / d;
      for (let j = 0; j < Z.length; j++) {          // séparation : évite l'empilement
        const o = Z[j]; if (o === z || o.dead) continue;
        const ox = z.x - o.x, oz = z.z - o.z, od = Math.hypot(ox, oz);
        if (od < 0.9 && od > 0.001) { ux += (ox / od) * 0.7 * (0.9 - od); uz += (oz / od) * 0.7 * (0.9 - od); }
      }
      if (z.detourT > 0) {                          // contournement quand coincé
        z.detourT -= dt;
        const a = 1.25 * z.detourDir, c = Math.cos(a), s = Math.sin(a);
        const rx = ux * c - uz * s, rz = ux * s + uz * c; ux = rx; uz = rz;
      }
      const ul = Math.hypot(ux, uz) || 1; ux /= ul; uz /= ul;
      const sp = z.speed * (z.stagger > 0 ? 0 : 1);
      const p = { x: z.x + ux * sp * dt, z: z.z + uz * sp * dt };
      p.x = clamp(p.x, -H, H); p.z = clamp(p.z, -H, H);
      const hits = pushOut(p, T.radius, cols);
      if (hits > 0 && z.detourT <= 0) {            // glisse le long de l'obstacle
        const mvx = p.x - z.x, mvz = p.z - z.z, mv = Math.hypot(mvx, mvz);
        z.progT += mv < sp * dt * 0.35 ? dt : -dt;
      } else z.progT = Math.max(0, z.progT - dt * 2);
      if (z.progT > 0.7) { z.detourT = 1.1; z.detourDir = this.rng() < 0.5 ? -1 : 1; z.progT = 0; }
      z.x = p.x; z.z = p.z;
      z.face = lerpAngle(z.face, Math.atan2(ux, uz), Math.min(1, 10 * dt));
      z.anim = z.speed > RUN_ABOVE ? 'run' : 'walk';
    }
    this.separate();
  }

  // Séparation « dure » : les zombies ne s'empilent plus (même en attaquant) et ne passent pas à travers le joueur.
  separate() {
    const P = this.player, Z = this.zombies, cols = this.layout.colliders;
    const live = Z.filter(z => !z.dead);
    for (let it = 0; it < 2; it++) {
      for (let i = 0; i < live.length; i++) {
        const a = live[i], Ta = ZOMBIES[a.type];
        for (let j = i + 1; j < live.length; j++) {
          const b = live[j], Tb = ZOMBIES[b.type];
          const dx = b.x - a.x, dz = b.z - a.z, min = (Ta.radius + Tb.radius) * 0.85;
          const d2 = dx * dx + dz * dz;
          if (d2 >= min * min) continue;
          const d = Math.sqrt(d2);
          const ux = d > 0.001 ? dx / d : Math.cos(a.id * 2.4), uz = d > 0.001 ? dz / d : Math.sin(a.id * 2.4);
          const push = (min - d) / 2;
          a.x -= ux * push; a.z -= uz * push; b.x += ux * push; b.z += uz * push;
        }
        if (!P.dead) {
          const dx = a.x - P.x, dz = a.z - P.z, min = PLAYER.radius + Ta.radius * 0.8, d = Math.hypot(dx, dz);
          if (d < min) {
            const ux = d > 0.001 ? dx / d : 1, uz = d > 0.001 ? dz / d : 0;
            a.x = P.x + ux * min; a.z = P.z + uz * min;
          }
        }
      }
    }
    const H = this.layout.half - 1;
    for (const z of live) {
      const p = { x: clamp(z.x, -H, H), z: clamp(z.z, -H, H) };
      pushOut(p, ZOMBIES[z.type].radius, cols);
      z.x = p.x; z.z = p.z;
    }
  }

  hurtPlayer(dmg, z) {
    const P = this.player; if (P.dead) return;
    P.hp = Math.max(0, P.hp - dmg); P.hurtT = 0.4;
    this.emit({ type: 'hurt', dmg, from: z ? { x: z.x, z: z.z } : null });
    if (P.hp <= 0) { P.dead = true; P.deadT = 0; this.emit({ type: 'death' }); }
  }

  // ---------------------------------------------------------------- objets
  addPickup(kind, x, z, w) {
    const pk = { id: this.nextId++, kind, x, z, w, t: 0 };
    this.pickups.push(pk); this.emit({ type: 'pickupAdd', id: pk.id }); return pk;
  }

  updatePickups(dt) {
    const P = this.player;
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pk = this.pickups[i]; pk.t += dt;
      if (Math.hypot(pk.x - P.x, pk.z - P.z) > PICKUP.radius) continue;
      if (pk.kind === 'med') P.hp = Math.min(PLAYER.hp, P.hp + PICKUP.med);
      else if (pk.kind === 'ammo') {
        for (const id of this.owned()) {
          const W = WEAPONS[id], S = this.weapons[id];
          S.reserve += Math.round(W.mag * (id === 'pistol' ? PICKUP.ammoMagsPistol : PICKUP.ammoMags));
        }
      } else if (pk.kind === 'weapon') {
        const W = WEAPONS[pk.w];
        if (!this.weapons[pk.w]) this.weapons[pk.w] = { ammo: W.mag, reserve: W.reserve };
        else this.weapons[pk.w].reserve += W.mag * 2;
        this.cur = pk.w; this.reloadT = 0;
      }
      this.pickups.splice(i, 1);
      this.emit({ type: 'pickup', kind: pk.kind, w: pk.w, id: pk.id });
    }
  }

  // ---------------------------------------------------------------- vagues
  composeWave(n) {
    const total = Math.min(WAVE.baseCount + n * WAVE.perWave, WAVE.maxCount), q = [];
    for (let i = 0; i < total; i++) q.push(this.pickType(n));
    for (let i = 0; i < Math.floor(n / 5); i++) q.push('chubby');
    return q;
  }

  startWave(n) {
    this.wave = n; this.queue = this.composeWave(n); this.spawnT = 0.6; this.state = 'active';
    this.emit({ type: 'wave', n, count: this.queue.length });
    const P = this.player;
    const spot = (r) => { for (let i = 0; i < 20; i++) { const a = this.rng() * 6.28, x = P.x + Math.sin(a) * r, z = P.z + Math.cos(a) * r; if (this.layout.isFree(x, z, 0.8, true)) return [x, z]; } return [P.x + 3, P.z]; };
    const u = WAVE.unlocks[n];
    if (u) { const [x, z] = spot(7); this.addPickup('weapon', x, z, u); }
    if (n % WAVE.medEvery === 0) { const [x, z] = spot(9); this.addPickup('med', x, z); }
    if (n % 2 === 1) { const [x, z] = spot(8); this.addPickup('ammo', x, z); }
  }

  updateWaves(dt) {
    if (this.state === 'intermission') {
      this.interT -= dt;
      if (this.interT <= 0) this.startWave(this.wave + 1);
      return;
    }
    if (this.queue.length) {
      this.spawnT -= dt;
      if (this.spawnT <= 0 && this.alive < WAVE.maxAlive) {
        const z = this.spawnZombie(this.queue[0]);
        if (z) this.queue.shift();
        this.spawnT = WAVE.spawnEvery;
      }
    } else if (this.zombies.every(z => z.dead || z.ambient)) {
      const bonus = WAVE.bonus * this.wave; this.score += bonus;
      this.state = 'intermission'; this.interT = WAVE.pause;
      this.emit({ type: 'waveClear', n: this.wave, bonus });
    }
  }
}
