// Véhicules conduisibles (simulation pure, greffée sur Sim comme survival.js). Conduite arcade : joystick haut/bas = accélérer / freiner-reculer, gauche/droite = tourner.
// Collision : trois cercles le long de la carrosserie, insérés dans sim.cols (les zombies et le joueur à pied les contournent).
import { clamp, lerpAngle, pushOut } from './logic.js';
import { PLAYER } from './config.js';

// max : vitesse (m/s) ; acc : accélération ; w, l : largeur / longueur ; turn : vitesse de braquage ; hp : solidité
export const VEHICLE_TYPES = {
  'vehicles/Vehicle_Pickup.gltf':          { name: 'Pick-up',         max: 13, acc: 6.5, w: 2.31, l: 5.18, turn: 1.9, hp: 140 },
  'vehicles/Vehicle_Pickup_Armored.gltf':  { name: 'Pick-up blindé',  max: 12, acc: 6,   w: 2.4,  l: 5.3,  turn: 1.8, hp: 260 },
  'vehicles/Vehicle_Truck.gltf':           { name: 'Camion',          max: 10, acc: 4.2, w: 2.71, l: 5.26, turn: 1.5, hp: 220 },
  'vehicles/Vehicle_Truck_Armored.gltf':   { name: 'Camion blindé',   max: 9.5, acc: 4,  w: 2.8,  l: 5.4,  turn: 1.4, hp: 340 },
  'vehicles/Vehicle_Sports.gltf':          { name: 'Sportive',        max: 19, acc: 9.5, w: 2.1,  l: 4.6,  turn: 2.2, hp: 90 },
  'vehicles/Vehicle_Sports_Armored.gltf':  { name: 'Sportive blindée', max: 17, acc: 8.5, w: 2.2, l: 4.7,  turn: 2.1, hp: 180 },
};
const OFFS = [-0.32, 0, 0.32];

export const vehicleMethods = {
  initVehicles() {
    this.driving = null; this.engineT = 0;
    this.vehicles = (this.layout.vehicles || []).map(d => {
      const T = VEHICLE_TYPES[d.model], r = T.w * 0.5 + 0.1;
      const V = { id: d.id, model: d.model, type: T, x: d.x, z: d.z, yaw: d.yaw, v: 0, hp: T.hp, wrecked: false, steer: 0, r, cols: OFFS.map(() => ({ x: 0, z: 0, r })) };
      this.syncVehicleCols(V); for (const c of V.cols) this.cols.push(c);
      return V;
    });
  },
  syncVehicleCols(V) {
    const fx = Math.sin(V.yaw), fz = Math.cos(V.yaw);
    OFFS.forEach((o, i) => { V.cols[i].x = V.x + fx * V.type.l * o; V.cols[i].z = V.z + fz * V.type.l * o; });
  },
  // distance du joueur au bord de la carrosserie
  vehicleDist(V, x, z) { let d = 1e9; for (const c of V.cols) d = Math.min(d, Math.hypot(x - c.x, z - c.z) - c.r); return d; },

  enterVehicle(V) {
    const P = this.player;
    this.driving = V; P.driving = true; P.crouch = false; P.ads = false; P.sprinting = false; P.moving = false; V.v = 0;
    if (this.build.on) this.build.on = false;
    this.yaw = V.yaw;
    this.emit({ type: 'vehicle', on: true, id: V.id, name: V.type.name });
  },
  exitVehicle() {
    const V = this.driving, P = this.player; if (!V) return;
    const rx = Math.cos(V.yaw), rz = -Math.sin(V.yaw), side = V.r + 0.9;
    const tries = [[-1, 0], [1, 0], [-1, 0.9], [1, 0.9], [0, -2.6], [0, 2.6]];       // gauche, droite, puis arrière / avant
    let best = null;
    for (const [s, f] of tries) {
      const p = { x: V.x + rx * s * side + Math.sin(V.yaw) * f * 2, z: V.z + rz * s * side + Math.cos(V.yaw) * f * 2 };
      if (s === 0) { p.x = V.x + Math.sin(V.yaw) * f * V.type.l * 0.5 * 1.25; p.z = V.z + Math.cos(V.yaw) * f * V.type.l * 0.5 * 1.25; }
      const q = { x: p.x, z: p.z };
      if (pushOut(q, PLAYER.radius, this.cols) === 0 && Math.abs(q.x) < this.layout.half - 1 && Math.abs(q.z) < this.layout.half - 1) { best = q; break; }
    }
    if (!best) best = { x: V.x + rx * side, z: V.z + rz * side };
    P.x = best.x; P.z = best.z; P.driving = false; P.face = V.yaw; V.v = 0; this.driving = null;
    this.emit({ type: 'vehicle', on: false, id: V.id });
  },

  updateDriving(dt, inp) {
    const V = this.driving, P = this.player, T = V.type, H = this.layout.half - 2.5;
    let thr = clamp(inp.my || 0, -1, 1); const st = clamp(inp.mx || 0, -1, 1);
    if (V.wrecked) thr = 0;
    const target = thr > 0 ? T.max * thr : thr < 0 ? -T.max * 0.35 * -thr : 0;
    const rate = target > V.v ? T.acc : (thr !== 0 ? T.acc * 1.8 : 3.2);
    V.v += clamp(target - V.v, -rate * dt, rate * dt);
    V.steer += (st - V.steer) * Math.min(1, dt * 8);
    V.yaw -= V.steer * T.turn * clamp(V.v / 5, -1, 1) * dt;
    const fx = Math.sin(V.yaw), fz = Math.cos(V.yaw);
    V.x += fx * V.v * dt; V.z += fz * V.v * dt;
    V.x = clamp(V.x, -H, H); V.z = clamp(V.z, -H, H);
    // collisions : on retire les cercles de ce véhicule le temps du calcul (pushOut ignore les `off`)
    for (const c of V.cols) c.off = true;
    this.syncVehicleCols(V);
    let sx = 0, sz = 0, hits = 0;
    for (const c of V.cols) {
      const p = { x: c.x, z: c.z };
      if (pushOut(p, c.r, this.cols) > 0) { sx += p.x - c.x; sz += p.z - c.z; hits++; }
    }
    let impact = 0;
    if (hits) {
      V.x += sx / hits; V.z += sz / hits;
      const nlen = Math.hypot(sx, sz) || 1, vv = Math.abs(V.v);
      impact = Math.max(0, vv - 3.5); V.v *= 0.3; if (vv > 6) V.v *= 0.6;
      if (impact > 0) { V.hp -= impact * 2.4; this.emit({ type: 'crash', x: V.x, z: V.z, power: impact }); this.noise(V.x, V.z, 30); }
      V.yaw += (sx * fz - sz * fx) / nlen * 0.02 * Math.sign(V.v || 1);          // léger tête-à-queue au choc
    }
    this.syncVehicleCols(V); for (const c of V.cols) c.off = false;
    // écraser les zombies
    const sp = Math.abs(V.v);
    if (sp > 3) for (const z of this.zombies) {
      if (z.dead || (z.vhit || 0) > this.t) continue;
      let hit = false; for (const c of V.cols) if (Math.hypot(z.x - c.x, z.z - c.z) < c.r + 0.45) { hit = true; break; }
      if (!hit) continue;
      z.vhit = this.t + 0.5; this.damageZombie(z, sp * 9, false, [z.x, 1, z.z]);
      V.v *= 0.94; V.hp -= 1.2;
    }
    // moteur : le bruit attire les zombies
    this.engineT -= dt; if (this.engineT <= 0 && sp > 1) { this.engineT = 1; this.noise(V.x, V.z, 14 + sp * 1.6); }
    if (V.hp <= 0 && !V.wrecked) {
      V.wrecked = true; V.hp = 0; this.emit({ type: 'vehicleWreck', x: V.x, z: V.z });
      this.exitVehicle(); P.hp = Math.max(1, P.hp - 25); P.hurtT = 0.4; this.emit({ type: 'hurt' });
      return;
    }
    P.x = V.x; P.z = V.z; P.face = V.yaw; P.speed = sp; P.moving = false; P.sprinting = false;
    // la caméra se range derrière le véhicule quand il roule
    if (sp > 2) this.yaw = lerpAngle(this.yaw, V.yaw, Math.min(1, dt * 1.6));
  },
};
