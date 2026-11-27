// Simulation du jeu de SURVIE (aucune dépendance à three.js ni au DOM) : joueur, combat, zombies, objets.
// Les systèmes de survie (temps, besoins, fouille, construction, sauvegarde) sont dans survival.js (greffés sur Sim).
// Le rendu lit l'état (sim.player, sim.zombies, sim.pieces, sim.trees…) et consomme sim.drain() (événements).
import { CAMERA, PLAYER, WEAPONS, WEAPON_ORDER, ASSIST, HEAD_MULT, ZOMBIES, ALERT_RADIUS, RUN_ABOVE, SURVIVAL as S, PICKUP } from './config.js';
import { clamp, lerpAngle, wrapAngle, pushOut, raySphere, normalize3, cameraRig, rayBoxes, blockedBetween } from './logic.js';
import { survivalMethods } from './survival.js';

// Saut / accroupi / visée (commandes façon CODM). Valeurs de réglage ici (pas dans config.js).
const MOVE = { jumpV: 5.4, grav: 16, jumpCost: 12, crouchSpeed: 0.55, adsSpeed: 0.7, crouchDrop: 0.45, crouchSight: 0.6, crouchHear: 0.5, dodgeY: 0.5 };

export class Sim {
  constructor(layout, rng = Math.random) {
    this.layout = layout; this.rng = rng; this.events = [];
    this.reset();
  }

  emit(e) { this.events.push(e); }
  drain() { const e = this.events; this.events = []; return e; }

  // save : état issu de serialize() pour reprendre une partie ; sinon nouvelle partie dans la cabane.
  reset(save = null) {
    const sp = this.layout.spawn;
    this.t = 0; this.nextId = 1; this.events = [];
    this.player = { x: sp.x, z: sp.z, y: 0, vy: 0, crouch: false, ads: false, hp: PLAYER.hp, stamina: PLAYER.stamina, face: sp.yaw, moving: false, speed: 0, sprinting: false, hurtT: 0, dead: false, deadT: 0, regenLock: 0, hunger: S.hungerStart, thirst: S.thirstStart, bleed: false };
    this.yaw = sp.yaw; this.pitch = 0.14;
    this.inv = { wood: 0, stone: 0, food: 0, water: 1, bandage: 0, ammo: 0 };       // le strict minimum : une bouteille d'eau…
    this.weapons = { knife: { ammo: 0 } }; this.cur = 'knife';                       // … et un couteau
    this.fireCD = 0; this.reloadT = 0; this.reloadTotal = 0; this.swingT = 0; this.swingDone = true;
    this.zombies = []; this.pickups = []; this.cols = this.layout.colliders.slice();
    this.kills = 0; this.clock = S.startHour * 3600; this.over = false; this.shots = 0; this.hits = 0;
    this.initSurvival();
    if (save && this.restore(save)) return;
    for (let i = 0; i < S.popStart; i++) this.spawnZombie(this.pickType(), {});
  }

  get alive() { return this.zombies.filter(z => !z.dead).length; }
  get camera() {
    const P = this.player, c = cameraRig(P.x, P.z, this.yaw, this.pitch, CAMERA);
    const off = (P.y || 0) - (P.crouch ? MOVE.crouchDrop : 0);          // la caméra monte avec le saut et descend en position accroupie
    if (off) { c.pos = [c.pos[0], c.pos[1] + off, c.pos[2]]; c.pivot = [c.pivot[0], c.pivot[1] + off, c.pivot[2]]; }
    const dx = c.pos[0] - c.pivot[0], dy = c.pos[1] - c.pivot[1], dz = c.pos[2] - c.pivot[2], L = Math.hypot(dx, dy, dz) || 1;
    const h = rayBoxes(c.pivot[0], c.pivot[1], c.pivot[2], dx / L, dy / L, dz / L, L, this.cols);   // la caméra ne traverse pas les murs
    if (h) { const t = Math.max(0.5, h.t - 0.25); c.pos = [c.pivot[0] + dx / L * t, c.pivot[1] + dy / L * t, c.pivot[2] + dz / L * t]; }
    return c;
  }
  look(dyaw, dpitch) { this.yaw += dyaw; this.pitch = clamp(this.pitch + dpitch, CAMERA.pitchMin, CAMERA.pitchMax); }

  update(dt, inp) {
    if (this.over) return;
    dt = Math.min(dt, 0.05); this.t += dt;
    const P = this.player;
    if (P.dead) {
      P.deadT += dt; this.updateZombies(dt);
      if (P.deadT > 2.2) { this.over = true; this.emit({ type: 'gameover', days: this.day(), kills: this.kills }); }
      return;
    }
    this.tickClock(dt);
    this.updateBuildMode(inp);
    this.updatePlayer(dt, inp); this.updateWeapon(dt, inp);
    this.updateInteract(inp); this.updateItems(inp);
    this.updateNeeds(dt);
    if (P.dead) return;
    this.updateZombies(dt); this.updatePickups(dt); this.updatePopulation(dt); this.updateFires(dt); this.updateLootRespawn();
  }

  // ---------------------------------------------------------------- bruit : les zombies proches viennent voir
  noise(x, z, r) { for (const zb of this.zombies) if (!zb.dead && Math.hypot(zb.x - x, zb.z - z) < r) zb.alerted = true; }

  // ---------------------------------------------------------------- joueur
  updatePlayer(dt, inp) {
    const P = this.player, H = this.layout.half - 0.8;
    const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    let mx = inp.mx || 0, my = inp.my || 0;
    const m = Math.hypot(mx, my);
    if (m > 1) { mx /= m; my /= m; }
    const mag = Math.min(1, m);
    // accroupi (bascule) : impossible en l'air ; sprinter ou sauter redresse. Visée (bascule) : armes à feu seulement.
    if (inp.crouch && P.y < 0.05) P.crouch = !P.crouch;
    if (inp.ads) P.ads = !P.ads;
    if (WEAPONS[this.cur].melee || this.reloadT > 0) P.ads = false;
    if (inp.sprint && mag > 0.2) P.crouch = false;
    P.sprinting = !!inp.sprint && mag > 0.2 && P.stamina > 4 && !P.ads;
    if (P.sprinting) { P.stamina = Math.max(0, P.stamina - PLAYER.drain * dt); P.regenLock = 0.7; }
    else { P.regenLock = Math.max(0, P.regenLock - dt); if (P.regenLock === 0) P.stamina = Math.min(PLAYER.stamina, P.stamina + PLAYER.regen * dt); }
    // saut : au sol seulement, coûte de l'endurance ; l'atterrissage fait un peu de bruit
    if (inp.jump && P.y <= 0.001 && P.vy === 0 && P.stamina >= MOVE.jumpCost && !this.build.on) {
      P.vy = MOVE.jumpV; P.crouch = false; P.stamina -= MOVE.jumpCost; P.regenLock = 0.7; this.emit({ type: 'jump' });
    }
    if (P.y > 0 || P.vy > 0) {
      P.vy -= MOVE.grav * dt; P.y += P.vy * dt;
      if (P.y <= 0) { P.y = 0; P.vy = 0; this.noise(P.x, P.z, 6); this.emit({ type: 'land' }); }
    }
    const speed = (P.sprinting ? PLAYER.sprint : PLAYER.speed) * mag * (P.crouch ? MOVE.crouchSpeed : 1) * (P.ads ? MOVE.adsSpeed : 1);
    const vx = (sy * my + -cy * mx) * speed, vz = (cy * my + sy * mx) * speed;
    const p = { x: P.x + vx * dt, z: P.z + vz * dt };
    p.x = clamp(p.x, -H, H); p.z = clamp(p.z, -H, H);
    pushOut(p, PLAYER.radius, this.cols);
    P.x = p.x; P.z = p.z; P.speed = speed; P.moving = mag > 0.1;
    // Le corps suit la direction de marche mais ne tourne jamais le dos à la caméra (on garde le regard vers l'avant en reculant).
    const aiming = inp.fire || this.reloadT > 0 || this.build.on || this.swingT > 0 || P.ads;
    let target = P.face;
    if (aiming) target = this.yaw;
    else if (P.moving) { const am = Math.atan2(vx, vz); target = Math.abs(wrapAngle(am - this.yaw)) > Math.PI / 2 ? am + Math.PI : am; }
    P.face = lerpAngle(P.face, target, Math.min(1, PLAYER.turn * dt));
    P.hurtT = Math.max(0, P.hurtT - dt);
  }

  // ---------------------------------------------------------------- armes
  owned() { return WEAPON_ORDER.filter(w => this.weapons[w]); }

  setWeapon(id) { this.cur = id; this.reloadT = 0; this.fireCD = 0.2; this.swingT = 0; this.swingDone = true; this.player.ads = false; this.emit({ type: 'swap', w: id }); }

  updateWeapon(dt, inp) {
    this.fireCD = Math.max(0, this.fireCD - dt); this.swingT = Math.max(0, this.swingT - dt);
    if (inp.swap) this.swapWeapon(inp.swap === -1 ? -1 : 1);
    const W = WEAPONS[this.cur], S0 = this.weapons[this.cur];
    if (!this.swingDone && this.swingT <= W.interval - 0.16) { this.swingDone = true; this.meleeHit(W); }
    if (this.build.on) return;
    if (W.melee) { if (inp.fire && this.fireCD <= 0) this.startSwing(W); return; }
    if (this.reloadT > 0) {
      this.reloadT -= dt;
      if (this.reloadT <= 0) {
        const take = Math.min(W.mag - S0.ammo, this.inv.ammo);
        S0.ammo += take; this.inv.ammo -= take; this.reloadT = 0;
        this.emit({ type: 'reloaded', w: this.cur });
      }
      return;
    }
    if (inp.reload) this.startReload();
    if (inp.fire && this.fireCD <= 0) {
      if (S0.ammo > 0) this.shoot();
      else if (this.inv.ammo > 0) this.startReload();
      else if (inp.firePressed) this.emit({ type: 'empty' });
    }
  }

  startReload() {
    const W = WEAPONS[this.cur], S0 = this.weapons[this.cur];
    if (W.melee || this.reloadT > 0 || S0.ammo >= W.mag || this.inv.ammo <= 0) return false;
    this.reloadT = this.reloadTotal = W.reload;
    this.emit({ type: 'reload', w: this.cur, t: W.reload });
    return true;
  }

  swapWeapon(dir = 1) {
    const list = this.owned(); if (list.length < 2) return;
    const i = list.indexOf(this.cur);
    this.setWeapon(list[(i + dir + list.length) % list.length]);
  }

  // ---------------------------------------------------------------- mêêlee : zombies, arbres (bois), rochers (pierre)
  startSwing(W) {
    this.fireCD = W.interval; this.swingT = W.interval; this.swingDone = false;
    this.emit({ type: 'swing', w: this.cur, anim: W.anim });
  }

  inCone(x, z, reach, arc) {
    const P = this.player, dx = x - P.x, dz = z - P.z, d = Math.hypot(dx, dz);
    if (d > reach) return null;
    const ang = Math.abs(wrapAngle(Math.atan2(dx, dz) - this.yaw));
    return ang > arc && d > 0.9 ? null : { d, ang };
  }

  meleeHit(W) {
    const P = this.player; let best = null, bs = 1e9;
    for (const z of this.zombies) {
      if (z.dead) continue;
      const T = ZOMBIES[z.type], c = this.inCone(z.x, z.z, W.range + T.radius, W.arc);
      if (!c || blockedBetween(P.x, P.z, z.x, z.z, this.cols)) continue;
      if (c.d + c.ang < bs) { bs = c.d + c.ang; best = z; }
    }
    this.noise(P.x, P.z, W.noise);
    if (best) {
      const T = ZOMBIES[best.type];
      this.damageZombie(best, W.dmg * (0.9 + this.rng() * 0.2), false, [best.x, T.h * 0.62, best.z]);
      if (!best.dead) { best.stagger = T.stagger * 1.3; best.atkT = 0; best.hitDone = false; }
      return;
    }
    let tree = null, rock = null, bd = 1e9;
    for (const t of this.trees) { if (t.felled) continue; const c = this.inCone(t.x, t.z, W.range + 0.5, 1.3); if (c && c.d < bd) { bd = c.d; tree = t; } }
    bd = 1e9;
    for (const r of this.rocks) { if (r.gone) continue; const c = this.inCone(r.x, r.z, W.range + 0.6, 1.3); if (c && c.d < bd) { bd = c.d; rock = r; } }
    if (tree && (!rock || Math.hypot(tree.x - P.x, tree.z - P.z) <= Math.hypot(rock.x - P.x, rock.z - P.z))) {
      if (W.tree <= 0) return;
      const n = Math.min(W.tree, tree.wood); tree.wood -= n; this.inv.wood += n;
      this.emit({ type: 'chop', kind: 'tree', x: tree.x, z: tree.z, n });
      if (tree.wood <= 0) { tree.felled = true; const j = this.cols.indexOf(tree.col); if (j >= 0) this.cols.splice(j, 1); this.emit({ type: 'treeFelled', i: tree.i }); }
    } else if (rock) {
      if (W.rock <= 0) { if (this.t - this.tipT > 2.5) { this.tipT = this.t; this.emit({ type: 'tip', text: 'Il faut une pioche pour casser un rocher' }); } return; }
      const n = Math.min(W.rock, rock.stone); rock.stone -= n; this.inv.stone += n;
      this.emit({ type: 'chop', kind: 'rock', x: rock.x, z: rock.z, n });
      if (rock.stone <= 0) { rock.gone = true; const j = this.cols.indexOf(rock.col); if (j >= 0) this.cols.splice(j, 1); this.emit({ type: 'rockGone', i: rock.i }); }
    }
  }

  // ---------------------------------------------------------------- armes à feu
  muzzle() {
    const P = this.player, sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    return [P.x + sy * 0.55 - cy * 0.2, 1.38 + (P.y || 0) - (P.crouch ? MOVE.crouchDrop : 0), P.z + cy * 0.55 + sy * 0.2];
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
    const W = WEAPONS[this.cur], S0 = this.weapons[this.cur], P = this.player;
    S0.ammo--; this.fireCD = W.interval; this.shots++;
    const cam = this.camera, mz = this.muzzle();
    const aim = this.aimPoint(cam, W.range);
    const base = normalize3([aim[0] - mz[0], aim[1] - mz[1], aim[2] - mz[2]]);
    const ay = Math.atan2(base[0], base[2]), ap = Math.asin(clamp(base[1], -1, 1));
    // dispersion : plus large en courant / en l'air, plus serrée accroupi ou en visant
    const spread = W.spread * (P.moving ? 1.5 : 1) * (P.sprinting ? 1.4 : 1) * (P.crouch ? 0.7 : 1) * (P.ads ? 0.5 : 1) * (P.y > 0.05 ? 1.8 : 1);
    let anyHit = false;
    for (let i = 0; i < W.pellets; i++) {
      const y2 = ay + (this.rng() * 2 - 1) * spread, p2 = ap + (this.rng() * 2 - 1) * spread;
      const d = [Math.sin(y2) * Math.cos(p2), Math.sin(p2), Math.cos(y2) * Math.cos(p2)];
      const r = this.hitscan(mz, d, W);
      anyHit = anyHit || r.hit;
      this.emit({ type: 'shot', w: this.cur, from: mz, to: r.end, hit: r.hit, first: i === 0 });
    }
    if (anyHit) this.hits++;
    this.noise(P.x, P.z, ALERT_RADIUS);                       // un coup de feu s'entend de très loin
    this.emit({ type: 'recoil', amount: W.kick * (P.ads ? 0.7 : 1) });
  }

  hitscan(o, d, W) {
    const wall = rayBoxes(o[0], o[1], o[2], d[0], d[1], d[2], W.range, this.cols);   // les murs arrêtent les balles
    const maxT = wall ? wall.t : W.range;
    const cand = [];
    for (const z of this.zombies) {
      if (z.dead) continue;
      let bt = -1, bk = null;
      for (const s of this.hitSpheres(z)) {
        const t = raySphere(o[0], o[1], o[2], d[0], d[1], d[2], z.x, s.y, z.z, s.r);
        if (t >= 0 && t <= maxT && (bt < 0 || t < bt)) { bt = t; bk = s.k; }
      }
      if (bt >= 0) cand.push({ z, t: bt, k: bk });
    }
    cand.sort((a, b) => a.t - b.t);
    let end = maxT, n = 0;
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
    z.hp -= dmg; z.alerted = true; z.state = 'chase'; z.target = null;
    this.emit({ type: 'hit', id: z.id, pt, head, dmg, kill: z.hp <= 0 });
    if (z.hp <= 0) { this.killZombie(z, head); return; }
    if (dmg >= T.hp * 0.18 || this.rng() < 0.25) { z.stagger = T.stagger; z.atkT = 0; z.hitDone = false; }
  }

  killZombie(z, head) {
    z.dead = true; z.deadT = 0; z.anim = 'death'; this.kills++;
    this.emit({ type: 'kill', id: z.id, head, x: z.x, z: z.z });
    const r = this.rng();
    if (r < PICKUP.dropBandage) this.addPickup('bandage', z.x, z.z);
    else if (r < PICKUP.dropBandage + PICKUP.dropFood) this.addPickup('food', z.x, z.z);
    else if (r < PICKUP.dropBandage + PICKUP.dropFood + PICKUP.dropWater) this.addPickup('water', z.x, z.z);
  }

  // ---------------------------------------------------------------- zombies
  pickType() {
    const day = this.day(), w = [['basic', 1]];
    if (day >= 2) { w.push(['arm', 0.3 + 0.1 * day]); w.push(['ribcage', 0.15 + 0.08 * day]); }
    if (day >= 3) w.push(['chubby', 0.2 + 0.05 * day]);
    const tot = w.reduce((s, x) => s + x[1], 0);
    let r = this.rng() * tot;
    for (const [t, v] of w) { if ((r -= v) <= 0) return t; }
    return 'basic';
  }

  // opts.ring : apparaît autour du joueur à distance (réapparition) ; sinon n'importe où sur la carte, loin de la cabane.
  spawnZombie(type, opts = {}) {
    const P = this.player, H = this.layout.half - 3, T = ZOMBIES[type], cb = this.layout.cabin, sp = this.layout.spawn;
    let x = 0, z = 0, ok = false;
    for (let i = 0; i < 30 && !ok; i++) {
      if (opts.ring) { const a = this.rng() * Math.PI * 2, r = S.spawnMin + this.rng() * (S.spawnMax - S.spawnMin); x = P.x + Math.sin(a) * r; z = P.z + Math.cos(a) * r; }
      else { x = (this.rng() * 2 - 1) * H; z = (this.rng() * 2 - 1) * H; }
      x = clamp(x, -H, H); z = clamp(z, -H, H);
      const inCabin = x > cb.a - 2 && x < cb.a + cb.n + 2 && z > cb.b - 2 && z < cb.b + cb.n + 2;
      const p = { x, z };
      ok = !inCabin && pushOut(p, T.radius + 0.3, this.cols) === 0 && Math.hypot(x - P.x, z - P.z) > (opts.ring ? S.spawnMin - 2 : 18) && (opts.ring || Math.hypot(x - sp.x, z - sp.z) > 18);
    }
    if (!ok) return null;
    const speed = T.speed * (0.9 + this.rng() * 0.25);
    const zb = { id: this.nextId++, type, x, z, hp: T.hp, maxHp: T.hp, face: this.rng() * 6.28, speed, state: 'idle', home: { x, z }, wanderer: this.rng() < S.wanderRatio, wanderT: this.rng() * 6, target: null, alerted: false, anim: 'idle', atkT: 0, hitDone: false, stagger: 0, dead: false, deadT: 0, progT: 0, detourT: 0, detourDir: 1, lostT: 0, losT: 0 };
    this.zombies.push(zb);
    return zb;
  }

  updatePopulation(dt) {
    this.popT -= dt; if (this.popT > 0) return;
    this.popT = S.spawnEvery;
    const target = this.isNight() ? S.popNight : S.popDay;
    if (this.alive < Math.min(target, S.popMax)) this.spawnZombie(this.pickType(), { ring: true });
  }

  updateZombies(dt) {
    const P = this.player, Z = this.zombies, cols = this.cols, H = this.layout.half - 1;
    for (let i = Z.length - 1; i >= 0; i--) {
      const z = Z[i];
      if (z.dead) { z.deadT += dt; if (z.deadT > 6) Z.splice(i, 1); continue; }
      const T = ZOMBIES[z.type];
      const dx = P.x - z.x, dz = P.z - z.z, d = Math.hypot(dx, dz) || 0.001;
      if (d > S.despawn && z.state !== 'chase') { Z.splice(i, 1); continue; }
      if (P.dead) { z.anim = 'idle'; continue; }

      // ---- perception : vue (bloquée par les murs), ouïe (course = bruyant, immobile = discret, accroupi = encore plus), bruits
      if (z.state !== 'chase') {
        const sight = (this.isNight() ? S.sightNight : S.sightDay) * (P.sprinting ? 1.6 : P.moving ? 1 : 0.5) * (P.crouch ? MOVE.crouchSight : 1);
        let seen = z.alerted;
        if (!seen && d < sight && !blockedBetween(z.x, z.z, P.x, P.z, cols)) seen = true;
        if (!seen && d < S.hearing * (P.sprinting ? 1.5 : P.moving ? 1 : 0.3) * (P.crouch ? MOVE.crouchHear : 1)) seen = true;
        if (seen) { z.state = 'chase'; z.alerted = false; z.lostT = 0; z.target = null; }
        else { this.idleZombie(z, T, dt, cols, H); continue; }
      }

      // ---- poursuite : on perd la trace si le joueur est loin ou caché trop longtemps
      z.losT -= dt;
      if (z.losT <= 0) { z.losT = 0.5; z.lostT = d > 5 && blockedBetween(z.x, z.z, P.x, P.z, cols) ? z.lostT + 0.5 : 0; }
      if (d > S.loseDist || z.lostT > 9) { z.state = 'idle'; z.home = { x: z.x, z: z.z }; z.lostT = 0; z.anim = 'idle'; continue; }

      if (z.stagger > 0) { z.stagger -= dt; z.anim = 'hit'; continue; }
      if (d < T.range && !blockedBetween(z.x, z.z, P.x, P.z, cols, 1.0)) {
        z.anim = 'attack'; z.atkT += dt;
        z.face = lerpAngle(z.face, Math.atan2(dx, dz), Math.min(1, 12 * dt));
        if (!z.hitDone && z.atkT >= T.hitAt) { z.hitDone = true; if (d < T.range + 0.5 && (P.y || 0) < MOVE.dodgeY) this.hurtPlayer(T.dmg, z); }   // un saut bien placé esquive le coup
        if (z.atkT >= T.cycle) { z.atkT = 0; z.hitDone = false; }
        continue;
      }
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
      const sp = z.speed;
      const p = { x: z.x + ux * sp * dt, z: z.z + uz * sp * dt };
      p.x = clamp(p.x, -H, H); p.z = clamp(p.z, -H, H);
      const hits = pushOut(p, T.radius, cols);
      const blocked = hits > 0 && Math.hypot(p.x - z.x, p.z - z.z) < sp * dt * 0.35;
      if (blocked) z.progT += dt; else if (hits === 0) z.progT = Math.max(0, z.progT - dt * 2);
      if (blocked && z.progT > 0.25 && z.detourT <= 0) {
        // bloqué contre une construction du joueur : le zombie la frappe jusqu'à la détruire
        const pc = this.touchedPiece(p.x, p.z, T.radius + 0.3);
        if (pc) {
          z.anim = 'attack'; z.atkT += dt; z.lostT = 0;
          z.face = lerpAngle(z.face, Math.atan2(pc.x - z.x, pc.z - z.z), Math.min(1, 10 * dt));
          if (!z.hitDone && z.atkT >= T.hitAt) { z.hitDone = true; this.damagePiece(pc, T.dmg * 1.6); }
          if (z.atkT >= T.cycle) { z.atkT = 0; z.hitDone = false; }
          continue;
        }
      }
      z.atkT = 0; z.hitDone = false;
      if (z.progT > 0.7) { z.detourT = 1.1; z.detourDir = this.rng() < 0.5 ? -1 : 1; z.progT = 0; }
      z.x = p.x; z.z = p.z;
      z.face = lerpAngle(z.face, Math.atan2(ux, uz), Math.min(1, 10 * dt));
      z.anim = z.speed > RUN_ABOVE ? 'run' : 'walk';
    }
    this.separate();
  }

  // Zombie qui ne poursuit personne : reste planté ou erre lentement autour de son point d'origine.
  idleZombie(z, T, dt, cols, H) {
    if (z.stagger > 0) { z.stagger -= dt; z.anim = 'hit'; return; }
    z.wanderT -= dt;
    if (z.wanderer && !z.target && z.wanderT <= 0) z.target = { x: z.home.x + (this.rng() * 2 - 1) * 8, z: z.home.z + (this.rng() * 2 - 1) * 8 };
    if (!z.target) { z.anim = 'idle'; return; }
    const dx = z.target.x - z.x, dz = z.target.z - z.z, d = Math.hypot(dx, dz);
    if (d < 0.6 || z.wanderT < -12) { z.target = null; z.wanderT = 3 + this.rng() * 7; z.anim = 'idle'; return; }
    const sp = z.speed * 0.3, p = { x: clamp(z.x + dx / d * sp * dt, -H, H), z: clamp(z.z + dz / d * sp * dt, -H, H) };
    if (pushOut(p, T.radius, cols) > 0) { z.target = null; z.wanderT = 2 + this.rng() * 4; }
    z.x = p.x; z.z = p.z; z.face = lerpAngle(z.face, Math.atan2(dx, dz), Math.min(1, 6 * dt)); z.anim = 'walk';
  }

  // Séparation « dure » : les zombies ne s'empilent plus (même en attaquant) et ne passent pas à travers le joueur.
  separate() {
    const P = this.player, cols = this.cols;
    const live = this.zombies.filter(z => !z.dead);
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
          if (d < min) { const ux = d > 0.001 ? dx / d : 1, uz = d > 0.001 ? dz / d : 0; a.x = P.x + ux * min; a.z = P.z + uz * min; }
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
    if (!P.bleed && P.hp > 0 && this.rng() < S.bleedChance) { P.bleed = true; this.emit({ type: 'tip', text: 'Vous saignez ! Utilisez un bandage' }); }
    if (P.hp <= 0) this.killPlayer('zombie');
  }

  // ---------------------------------------------------------------- objets lâchés par les zombies
  addPickup(kind, x, z) {
    const pk = { id: this.nextId++, kind, x, z, t: 0 };
    this.pickups.push(pk); this.emit({ type: 'pickupAdd', id: pk.id }); return pk;
  }

  updatePickups(dt) {
    const P = this.player;
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pk = this.pickups[i]; pk.t += dt;
      if (Math.hypot(pk.x - P.x, pk.z - P.z) > PICKUP.radius) continue;
      this.inv[pk.kind] = (this.inv[pk.kind] || 0) + 1;
      this.pickups.splice(i, 1);
      this.emit({ type: 'pickup', kind: pk.kind, id: pk.id });
    }
  }
}

Object.assign(Sim.prototype, survivalMethods);
