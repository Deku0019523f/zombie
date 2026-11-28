// Couche de rendu : transforme l'état de la simulation en scène three.js (aucune logique de jeu ici).
import * as THREE from 'three';
import { CAMERA, PLAYER, ZOMBIES, WEAPONS, WEAPON_HAND, PIECES, BACKPACK_VIEW } from './config.js';
import { instance, placeholder } from './assets.js';
import { buildWorld } from './world.js';
import { NPC_TYPES } from './npcs.js';
import { Fx, shadowTexture } from './fx.js';

const _qh = new THREE.Quaternion(), _qr = new THREE.Quaternion(), _qa = new THREE.Quaternion(), _ax = new THREE.Vector3(1, 0, 0);
const _qf = new THREE.Quaternion(...(WEAPON_HAND.fix || [0, 0, 0, 1]));
const _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3();

class Actor {
  constructor(inst, scale) {
    this.root = new THREE.Group();
    this.model = inst.object; this.model.scale.setScalar(scale); this.root.add(this.model);
    this.mixer = new THREE.AnimationMixer(this.model);
    this.clips = new Map(inst.clips.map(c => [c.name, c]));
    this.name = null; this.act = null;
  }
  has(n) { return this.clips.has(n); }
  play(n, { loop = true, fade = 0.18, speed = 1, rand = false } = {}) {
    if (this.name === n) { if (this.act) this.act.timeScale = speed; return; }
    const clip = this.clips.get(n); if (!clip) return;
    const a = this.mixer.clipAction(clip);
    a.reset(); a.enabled = true; a.timeScale = speed;
    a.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity); a.clampWhenFinished = !loop;
    if (rand) a.time = Math.random() * clip.duration;
    if (this.act) this.act.fadeOut(fade);
    a.fadeIn(fade).play(); this.act = a; this.name = n;
  }
  update(dt) { this.mixer.update(dt); }
}

export class View {
  constructor(canvas, sim) {
    this.sim = sim;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(CAMERA.fov, 1, 0.1, 150);
    this.baseFov = CAMERA.fov; this.zoom = 1;
    this.world = buildWorld(this.scene, sim.layout);
    this.fx = new Fx(this.scene);
    this.shadowTex = shadowTexture();
    this.zviews = new Map(); this.nviews = new Map(); this.pviews = new Map(); this.piecev = new Map(); this.ghost = null; this.swingAnim = 0; this.lastDay = -1;
    this.torch = new THREE.PointLight(0xffe2a8, 0, 16, 1.6); this.scene.add(this.torch);
    for (const t of sim.trees) if (t.felled) this.world.fellTree(t.i);
    for (const r of sim.rocks) if (r.gone) this.world.removeRock(r.i);
    this.kick = 0; this.t = 0; this.orbit = 0;
    this.makePlayer();
    this.resize(); window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // en portrait on élargit le champ vertical pour garder la même largeur utile
    this.baseFov = w / h < 1 ? CAMERA.fov + 12 : CAMERA.fov;
    this.camera.fov = this.baseFov * this.zoom;
    this.camera.updateProjectionMatrix();
  }

  blob(r) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), new THREE.MeshBasicMaterial({ map: this.shadowTex, transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.y = 0.03; return m;
  }

  // ---------------------------------------------------------------- joueur
  makePlayer() {
    const inst = instance(PLAYER.model) || placeholder(0x3366ff, 1.7);
    this.player = new Actor(inst, PLAYER.scale);
    this.player.root.add(this.blob(0.6));
    // three.js retire les points des noms de nœuds glTF ('Middle1.L' devient 'Middle1L') : on cherche les deux formes.
    const find = this.find = (n) => this.player.model.getObjectByName(n) || this.player.model.getObjectByName(n.replace(/[.\[\]:\/]/g, ''));
    this.hand = find(WEAPON_HAND.bone);
    if (!this.hand) { console.warn('[view] os de la main introuvable :', WEAPON_HAND.bone); this.hand = this.player.root; }
    this.weaponObj = null; this.weaponId = null;
    this.scene.add(this.player.root);
    this.makeBackpack();
    this.setWeapon(this.sim.cur);
  }

  // Sac à dos dans le dos : normalisé à BACKPACK_VIEW.width mètres de large (le modèle fait 3,3 unités), visible une fois trouvé.
  makeBackpack() {
    const inst = instance(BACKPACK_VIEW.model);
    this.bag = null; if (!inst) return;
    const obj = inst.object, b = new THREE.Box3().setFromObject(obj), sz = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
    const k = BACKPACK_VIEW.width / (sz.x || 1);
    obj.scale.setScalar(k); obj.position.set(-c.x * k, -c.y * k, -c.z * k);
    const g = new THREE.Group(); g.add(obj); g.position.set(0, BACKPACK_VIEW.y, BACKPACK_VIEW.z); g.visible = false;
    this.player.root.add(g); this.bag = g;
  }

  // Échelle réelle (monde) de l'os de la main : sert à donner à chaque arme sa vraie longueur en mètres.
  handScale() {
    this.player.root.updateMatrixWorld(true);
    this.hand.matrixWorld.decompose(_p, _q, _s);
    return (_s.x + _s.y + _s.z) / 3 || 1;
  }

  // Outil de mêlée « ajusté » : on tourne le modèle pour que la tête soit vers +Z (comme la lame du couteau), on le met à
  // l'échelle réelle (fit.len mètres) et on le décale pour que la main serre le manche à fit.grip (unités du modèle).
  fitTool(obj, fit) {
    const holder = new THREE.Group();
    obj.scale.setScalar(1); obj.position.set(0, 0, 0);
    obj.quaternion.setFromEuler(new THREE.Euler(...fit.rot.map(d => d * Math.PI / 180)));
    obj.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(obj), L = (b.max.z - b.min.z) || 1;
    const k = fit.len / L / this.handScale();
    obj.scale.setScalar(k);
    obj.position.set(-((b.min.x + b.max.x) / 2) * k, -((b.min.y + b.max.y) / 2) * k, -(b.min.z + fit.grip) * k);
    holder.add(obj); return holder;
  }

  setWeapon(id) {
    if (this.weaponObj) this.hand.remove(this.weaponObj);
    const W = WEAPONS[id];
    for (const n of WEAPON_HAND.hide) { const o = this.find(n); if (o) o.visible = (n === W.builtin); }
    if (W.builtin) { this.weaponObj = null; this.weaponId = id; return; }
    const inst = instance(W.model);
    this.weaponId = id;
    if (!inst) { this.weaponObj = null; return; }
    if (W.fit) this.weaponObj = this.fitTool(inst.object, W.fit);
    else { this.weaponObj = inst.object; if (W.melee) this.weaponObj.scale.setScalar(0.5); }
    this.weaponObj.position.set(...WEAPON_HAND.pos);
    this.weaponObj.quaternion.set(...WEAPON_HAND.quat);
    this.hand.add(this.weaponObj);
    this.aimWeapon();
  }

  // La pose du couteau livré avec le modèle ne convient pas à une arme à feu : on oriente l'arme dans le repère du monde
  // (canon vers l'avant du personnage, légèrement relevé selon la visée) quelle que soit l'animation de la main.
  aimWeapon() {
    if (!this.weaponObj || this.hand === this.player.root) return;
    if (WEAPONS[this.weaponId].melee) return;
    const root = this.player.root; root.updateMatrixWorld(true);
    this.hand.getWorldQuaternion(_qh); root.getWorldQuaternion(_qr);
    _qa.setFromAxisAngle(_ax, -this.sim.pitch * 0.6);
    this.weaponObj.quaternion.copy(_qh.invert().multiply(_qr).multiply(_qa).multiply(_qf));
  }

  // ---------------------------------------------------------------- zombies
  makeZombie(z) {
    const T = ZOMBIES[z.type];
    const a = new Actor(instance(T.model) || placeholder(0x44aa44, T.h, T.radius), T.scale);
    a.root.add(this.blob(T.radius + 0.25));
    a.play('Idle', { rand: true });
    this.scene.add(a.root); return a;
  }

  zombieAnim(a, z) {
    const T = ZOMBIES[z.type];
    switch (z.anim) {
      case 'walk': a.play('Walk', { speed: Math.max(0.7, z.speed / 1.7), rand: true }); break;
      case 'run': a.play('Run', { speed: Math.max(0.8, z.speed / 3.2), rand: true }); break;
      case 'attack': { const n = T.atk.find(x => a.has(x)) || 'Idle'; a.play(n, { speed: 1.2 }); break; }
      case 'hit': a.play(a.has('HitReact') ? 'HitReact' : 'Idle', { loop: false, fade: 0.05 }); break;
      case 'death': a.play(a.has('Death') ? 'Death' : 'Idle', { loop: false, fade: 0.08 }); break;
      default: a.play('Idle', { rand: true });
    }
  }

  // ---------------------------------------------------------------- PNJ (gangs, police, marchands, chiens)
  makeNpc(n) {
    const T = NPC_TYPES[n.type];
    const a = new Actor(instance(T.model) || placeholder(0x3399cc, T.h, T.radius), T.scale);
    a.root.add(this.blob(T.radius + 0.25));
    for (const nm of WEAPON_HAND.hide) { const o = a.model.getObjectByName(nm); if (o) o.visible = (nm === T.builtin); }
    if (T.gun) {                                            // arme à feu dans la main (orientée comme celle du joueur, voir aimNpcGun)
      const hand = a.model.getObjectByName(WEAPON_HAND.bone) || a.model.getObjectByName(WEAPON_HAND.bone.replace(/[.]/g, ''));
      const w = instance(WEAPONS.pistol.model);
      if (hand && w) { w.object.position.set(...WEAPON_HAND.pos); hand.add(w.object); a.hand = hand; a.gunObj = w.object; }
    }
    a.play(T.dog ? 'Idle' : T.gun ? 'Idle_Gun' : 'Idle', { rand: true });
    this.scene.add(a.root); return a;
  }
  aimNpcGun(a) {
    if (!a.gunObj) return;
    a.root.updateMatrixWorld(true);
    a.hand.getWorldQuaternion(_qh); a.root.getWorldQuaternion(_qr);
    a.gunObj.quaternion.copy(_qh.invert().multiply(_qr).multiply(_qf));
  }
  npcAnim(a, n) {
    const T = NPC_TYPES[n.type], gun = !!T.gun, has = (c) => a.has(c);
    switch (n.anim) {
      case 'walk': a.play(gun ? 'Walk_Gun' : 'Walk', { speed: 0.9 }); break;
      case 'walkgun': a.play('Walk_Gun', { speed: 1.2 }); break;
      case 'run': a.play(T.dog || !gun ? 'Run' : 'Run_Gun', { speed: Math.max(0.8, T.speed / 3.2) }); break;
      case 'aim': a.play(has('Idle_Gun') ? 'Idle_Gun' : 'Idle'); break;
      case 'attack': a.play(T.dog ? 'Attack' : has('Slash') ? 'Slash' : 'Punch', { speed: 1.3 }); break;
      case 'hit': a.play(T.dog ? 'HitReact_Left' : 'HitReact', { loop: false, fade: 0.05 }); break;
      case 'death': a.play('Death', { loop: false, fade: 0.08 }); break;
      case 'wave': a.play(has('Wave') ? 'Wave' : 'Idle'); break;
      default: a.play(gun && has('Idle_Gun') ? 'Idle_Gun' : 'Idle');
    }
  }

  // ---------------------------------------------------------------- objets ramassables
  // [modèle, échelle, couleur de l'anneau] — les modèles de props/ sont en grandes unités (bûche 3,8 ; sac 3,3 ; allumettes 1,1).
  makePickup(pk) {
    const g = new THREE.Group();
    const spec = {
      bandage: ['props/Bandages.glb', 1.3, 0x33dd66], food: ['props/Can_Closed.glb', 0.7, 0xffc833], water: ['props/WaterBottle_1.glb', 0.3, 0x44aaff],
      wood: ['props/WoodLog.glb', 0.13, 0xb07a40], match: ['props/Matchbox.glb', 0.45, 0xff8844], backpack: ['props/Backpack.glb', 0.16, 0x9ccf5a],
    }[pk.kind] || ['village/Prop_Crate.gltf', 0.35, 0xffffff];
    const inst = instance(spec[0]) || placeholder(spec[2], 0.5, 0.25);
    inst.object.scale.setScalar(spec[1]); g.add(inst.object);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.7, 28), new THREE.MeshBasicMaterial({ color: spec[2], transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05; g.add(ring);
    g.userData.obj = inst.object; this.scene.add(g); return g;
  }

  // après reset / chargement : remet le décor à l'état de la simulation
  syncWorld() {
    for (const g of this.piecev.values()) this.scene.remove(g); this.piecev.clear();
    for (const g of this.pviews.values()) this.scene.remove(g); this.pviews.clear();
    for (const a of this.zviews.values()) this.scene.remove(a.root); this.zviews.clear();
    for (const a of this.nviews.values()) this.scene.remove(a.root); this.nviews.clear();
    for (const t of this.sim.trees) t.felled ? this.world.fellTree(t.i) : this.world.restoreTree(t.i);
    for (const r of this.sim.rocks) r.gone ? this.world.removeRock(r.i) : this.world.restoreRock(r.i);
    this.weaponId = null;
  }

  // ---------------------------------------------------------------- constructions
  fit(obj, len, h) {
    const b = new THREE.Box3().setFromObject(obj), sz = b.getSize(new THREE.Vector3());
    const long = Math.max(sz.x, sz.z) || 1; const k = len / long;
    obj.scale.set(k, h / (sz.y || 1), k);
    const b2 = new THREE.Box3().setFromObject(obj), c = b2.getCenter(new THREE.Vector3());
    const w = new THREE.Group(); obj.position.set(-c.x, -b2.min.y, -c.z); w.add(obj);
    if (sz.z > sz.x) w.rotation.y = Math.PI / 2;
    const out = new THREE.Group(); out.add(w); return out;
  }
  makePiece(pc) {
    const g = new THREE.Group();
    if (pc.kind === 'fire') {
      const inst = instance('props/Bonfire.glb') || placeholder(0xff8833, 0.5, 0.4);
      inst.object.scale.setScalar(0.45); g.add(inst.object);
      const l = new THREE.PointLight(0xff9a3c, 2.2, 13, 1.5); l.position.y = 1.1; g.add(l); g.userData.light = l;
      const f = instance('props/Bonfire_Fire.glb'); if (f) { f.object.scale.setScalar(0.45); g.add(f.object); }
    } else if (pc.kind === 'trap') {
      const inst = instance('props/BearTrap_Open.glb') || placeholder(0x777777, 0.3, 0.5);   // modèle ~3 × 0,7 × 3,5 unités → ~0,8 m
      inst.object.scale.setScalar(0.27); g.add(inst.object);
    } else if (pc.kind === 'door') {
      const inst = instance('village/Door_1_Flat.gltf') || placeholder(0x7a5230, 2.2, 0.3);
      const pivot = new THREE.Group(); pivot.add(this.fit(inst.object, 1.9, 2.2)); g.add(pivot); g.userData.pivot = pivot;
    } else {
      const name = pc.kind === 'stone' ? 'village/Wall_UnevenBrick_Straight.gltf' : 'village/Prop_WoodenFence_Single.gltf';
      const inst = instance(name) || placeholder(pc.kind === 'stone' ? 0x888888 : 0x8a5a2b, 2.2, 0.3);
      g.add(this.fit(inst.object, 2.0, PIECES[pc.kind].h));
    }
    g.position.set(pc.x, 0, pc.z); g.rotation.y = (pc.kind === 'fire' || pc.kind === 'trap') ? 0 : pc.yaw;
    this.scene.add(g); return g;
  }
  ghostView(gh) {
    if (!gh) { if (this.ghost) this.ghost.visible = false; return; }
    if (!this.ghost || this.ghost.userData.kind !== gh.kind) {
      if (this.ghost) this.scene.remove(this.ghost);
      const D = PIECES[gh.kind], dot = gh.kind === 'fire' || gh.kind === 'trap';
      const m = new THREE.Mesh(dot ? new THREE.CylinderGeometry(0.45, 0.45, gh.kind === 'trap' ? 0.2 : 0.5, 14).translate(0, gh.kind === 'trap' ? 0.1 : 0.25, 0) : new THREE.BoxGeometry(2, D.h, 0.3).translate(0, D.h / 2, 0),
        new THREE.MeshBasicMaterial({ color: 0x44ff66, transparent: true, opacity: 0.45, depthWrite: false }));
      m.userData.kind = gh.kind; this.scene.add(m); this.ghost = m;
    }
    const m = this.ghost; m.visible = true; m.position.set(gh.x, 0, gh.z); m.rotation.y = gh.yaw;
    m.material.color.setHex(gh.ok ? 0x44ff66 : 0xff4444);
  }

  // ---------------------------------------------------------------- événements → effets visuels
  handle(events) {
    for (const e of events) {
      if (e.type === 'shot') { this.fx.tracer(e.from, e.to); if (e.first) this.fx.flash(e.from); }
      else if (e.type === 'hit') this.fx.splash(e.pt, e.head ? 9 : 5, e.head);
      else if (e.type === 'recoil') this.kick = Math.min(0.12, this.kick + e.amount);
      else if (e.type === 'swap') this.setWeapon(e.w);
      else if (e.type === 'kill') this.fx.splash([e.x, 1.0, e.z], 12);
      else if (e.type === 'swing') { this.swingAnim = 0.42; this.swingStart = true; }
      else if (e.type === 'treeFelled') this.world.fellTree(e.i);
      else if (e.type === 'rockGone') this.world.removeRock(e.i);
      else if (e.type === 'chop') this.fx.splash([e.x, 1.2, e.z], 3, false);
      else if (e.type === 'trap') this.fx.splash([e.x, 0.4, e.z], 6);
      else if (e.type === 'crash') this.fx.splash([e.x, 0.8, e.z], Math.min(10, 3 + e.power));
      else if (e.type === 'vehicleWreck') this.fx.splash([e.x, 1.0, e.z], 12);
      else if (e.type === 'pieceBreak') this.fx.splash([e.x, 1.0, e.z], 8);
    }
  }

  // ---------------------------------------------------------------- image
  render(dt, mode) {
    const sim = this.sim, P = sim.player; this.t += dt;
    if (this.weaponId !== sim.cur) this.setWeapon(sim.cur);

    // joueur : saut (hauteur), accroupi (silhouette écrasée)
    const pa = this.player;
    pa.root.position.set(P.x, P.y || 0, P.z); pa.root.rotation.y = P.face; pa.root.visible = !P.driving;   // au volant, le joueur est caché dans le véhicule
    const sy = P.crouch ? 0.8 : 1; pa.root.scale.y += (sy - pa.root.scale.y) * Math.min(1, dt * 14);
    if (this.bag) this.bag.visible = sim.hasBag();
    const W = WEAPONS[sim.cur], gun = !W.melee, sfx = gun ? '_Gun' : '';
    const alt = (n, f) => (pa.has(n) ? n : f);
    this.swingAnim = Math.max(0, this.swingAnim - dt);
    if (P.dead) pa.play('Death', { loop: false, fade: 0.1 });
    else if (!gun && this.swingAnim > 0) { if (this.swingStart) { this.swingStart = false; pa.name = null; pa.play(alt(W.anim, 'Idle'), { loop: false, fade: 0.06, speed: 1.7 }); } }
    else if (P.sprinting) pa.play(alt('Run' + sfx, 'Run'), { speed: 1.15 });
    else if (P.moving) pa.play(alt((P.speed > 4.2 ? 'Run' : 'Walk') + sfx, 'Walk'), { speed: Math.max(0.7, P.speed / 3.6) });
    else pa.play(alt('Idle' + sfx, 'Idle'));
    pa.update(dt); this.aimWeapon();

    // véhicules (le modèle regarde vers +z comme la simulation ; roues avant braquées non animées)
    if (!this.vviews) this.vviews = new Map();
    for (const V of sim.vehicles) {
      let g = this.vviews.get(V.id);
      if (!g) { const inst = instance(V.model); g = new THREE.Group(); if (inst) g.add(inst.object); this.scene.add(g); this.vviews.set(V.id, g); }
      g.position.set(V.x, 0, V.z); g.rotation.set(0, V.yaw, 0);
      if (V.wrecked) { g.rotation.z = 0.05; g.visible = true; }
      if (V.v && !V.wrecked) g.rotation.x = -V.v * 0.0025;        // léger tangage à l'accélération
    }

    // constructions
    const cs = new Set();
    for (const pc of sim.pieces) {
      cs.add(pc.id); let g = this.piecev.get(pc.id);
      if (!g) { g = this.makePiece(pc); this.piecev.set(pc.id, g); }
      if (g.userData.pivot) g.userData.pivot.rotation.y += ((pc.open ? -1.45 : 0) - g.userData.pivot.rotation.y) * Math.min(1, dt * 9);
      if (g.userData.light) g.userData.light.intensity = 2.0 + Math.sin(this.t * 13 + pc.x) * 0.35 + Math.sin(this.t * 7.3) * 0.2;
    }
    for (const [id, g] of this.piecev) if (!cs.has(id)) { this.scene.remove(g); this.piecev.delete(id); }
    this.ghostView(sim.build.on ? sim.build.ghost : null);

    // lumière du jour + lampe torche
    const dl = sim.daylight(); this.world.setDaylight(dl);
    this.torch.position.set(P.x + Math.sin(P.face) * 0.6, 2.0, P.z + Math.cos(P.face) * 0.6);
    this.torch.intensity = THREE.MathUtils.lerp(this.torch.intensity, dl < 0.5 ? 1.6 * (1 - dl) : 0, Math.min(1, dt * 3));

    // zombies
    const seen = new Set();
    for (const z of sim.zombies) {
      seen.add(z.id);
      let a = this.zviews.get(z.id);
      if (!a) { a = this.makeZombie(z); this.zviews.set(z.id, a); }
      a.root.visible = Math.hypot(z.x - P.x, z.z - P.z) < 70;
      a.root.position.set(z.x, z.dead && z.deadT > 3.5 ? -Math.min(1, (z.deadT - 3.5) * 0.5) * 0.9 : 0, z.z);
      a.root.rotation.y = z.face;
      this.zombieAnim(a, z); a.update(dt);
    }
    for (const [id, a] of this.zviews) if (!seen.has(id)) { this.scene.remove(a.root); this.zviews.delete(id); }

    // PNJ
    const nseen = new Set();
    for (const n of sim.npcs) {
      const near = Math.hypot(n.x - P.x, n.z - P.z) < 70;
      let a = this.nviews.get(n.id);
      if (!a) { if (!near) continue; a = this.makeNpc(n); this.nviews.set(n.id, a); }
      nseen.add(n.id); a.root.visible = near;
      if (!near) continue;
      a.root.position.set(n.x, n.dead && n.deadT > 3.5 ? -Math.min(1, (n.deadT - 3.5) * 0.5) * 0.9 : 0, n.z);
      a.root.rotation.y = n.face;
      this.npcAnim(a, n); a.update(dt); this.aimNpcGun(a);
    }
    for (const [id, a] of this.nviews) if (!nseen.has(id)) { this.scene.remove(a.root); this.nviews.delete(id); }

    // objets
    const pseen = new Set();
    for (const pk of sim.pickups) {
      pseen.add(pk.id);
      let g = this.pviews.get(pk.id); if (!g) { g = this.makePickup(pk); this.pviews.set(pk.id, g); }
      g.position.set(pk.x, 0, pk.z); g.userData.obj.position.y = 0.45 + Math.sin(pk.t * 3) * 0.1; g.userData.obj.rotation.y = pk.t * 1.6;
    }
    for (const [id, g] of this.pviews) if (!pseen.has(id)) { this.scene.remove(g); this.pviews.delete(id); }

    // caméra (visée = zoom : champ de vision réduit de 28 %)
    this.kick = Math.max(0, this.kick - dt * 0.5);
    const zt = mode !== 'menu' && P.ads ? 0.72 : 1;
    if (Math.abs(this.zoom - zt) > 0.002) {
      this.zoom += (zt - this.zoom) * Math.min(1, dt * 12);
      this.camera.fov = this.baseFov * this.zoom; this.camera.updateProjectionMatrix();
    }
    if (mode === 'menu') {
      this.orbit += dt * 0.15; const r = 9;
      this.camera.position.set(P.x + Math.sin(this.orbit) * r, 2.6, P.z + Math.cos(this.orbit) * r);
      this.camera.lookAt(P.x, 1.3, P.z);
    } else {
      const c = sim.camera;
      this.camera.position.set(c.pos[0], c.pos[1], c.pos[2]);
      this.camera.lookAt(c.pos[0] + c.dir[0], c.pos[1] + c.dir[1] + this.kick, c.pos[2] + c.dir[2]);
    }
    this.fx.update(dt);
    this.renderer.render(this.scene, this.camera);
  }
}
