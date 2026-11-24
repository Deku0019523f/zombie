// Couche de rendu : transforme l'état de la simulation en scène three.js (aucune logique de jeu ici).
import * as THREE from 'three';
import { CAMERA, PLAYER, ZOMBIES, WEAPONS, WEAPON_HAND } from './config.js';
import { instance, placeholder } from './assets.js';
import { buildWorld } from './world.js';
import { Fx, shadowTexture } from './fx.js';

const _qh = new THREE.Quaternion(), _qr = new THREE.Quaternion(), _qa = new THREE.Quaternion(), _ax = new THREE.Vector3(1, 0, 0);
const _qf = new THREE.Quaternion(...(WEAPON_HAND.fix || [0, 0, 0, 1]));

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
    this.world = buildWorld(this.scene, sim.layout);
    this.fx = new Fx(this.scene);
    this.shadowTex = shadowTexture();
    this.zviews = new Map(); this.pviews = new Map();
    this.kick = 0; this.t = 0; this.orbit = 0;
    this.makePlayer();
    this.resize(); window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // en portrait on élargit le champ vertical pour garder la même largeur utile
    this.camera.fov = w / h < 1 ? CAMERA.fov + 12 : CAMERA.fov;
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
    const find = (n) => this.player.model.getObjectByName(n) || this.player.model.getObjectByName(n.replace(/[.\[\]:\/]/g, ''));
    for (const n of WEAPON_HAND.hide) { const o = find(n); if (o) o.visible = false; }
    this.hand = find(WEAPON_HAND.bone);
    if (!this.hand) { console.warn('[view] os de la main introuvable :', WEAPON_HAND.bone); this.hand = this.player.root; }
    this.weaponObj = null; this.weaponId = null;
    this.scene.add(this.player.root);
    this.setWeapon(this.sim.cur);
  }

  setWeapon(id) {
    if (this.weaponObj) this.hand.remove(this.weaponObj);
    const inst = instance(WEAPONS[id].model);
    this.weaponObj = inst ? inst.object : null; this.weaponId = id;
    if (!this.weaponObj) return;
    this.weaponObj.position.set(...WEAPON_HAND.pos);
    this.weaponObj.quaternion.set(...WEAPON_HAND.quat);
    this.hand.add(this.weaponObj);
    this.aimWeapon();
  }

  // La pose du couteau livré avec le modèle ne convient pas à une arme à feu : on oriente l'arme dans le repère du monde
  // (canon vers l'avant du personnage, légèrement relevé selon la visée) quelle que soit l'animation de la main.
  aimWeapon() {
    if (!this.weaponObj || this.hand === this.player.root) return;
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

  // ---------------------------------------------------------------- objets ramassables
  makePickup(pk) {
    const g = new THREE.Group();
    const spec = { med: ['props/FirstAidKit.glb', 1.0, 0x33dd66], ammo: ['village/Prop_Crate.gltf', 0.4, 0xffc833], weapon: ['environment/Chest_Special.gltf', 0.8, 0x44ddff] }[pk.kind];
    const inst = instance(spec[0]) || placeholder(spec[2], 0.5, 0.25);
    inst.object.scale.setScalar(spec[1]); g.add(inst.object);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.7, 28), new THREE.MeshBasicMaterial({ color: spec[2], transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05; g.add(ring);
    g.userData.obj = inst.object; this.scene.add(g); return g;
  }

  // ---------------------------------------------------------------- événements → effets visuels
  handle(events) {
    for (const e of events) {
      if (e.type === 'shot') { this.fx.tracer(e.from, e.to); if (e.first) this.fx.flash(e.from); }
      else if (e.type === 'hit') this.fx.splash(e.pt, e.head ? 9 : 5, e.head);
      else if (e.type === 'recoil') this.kick = Math.min(0.12, this.kick + e.amount);
      else if (e.type === 'swap') this.setWeapon(e.w);
      else if (e.type === 'kill') this.fx.splash([e.x, 1.0, e.z], 12);
    }
  }

  // ---------------------------------------------------------------- image
  render(dt, mode) {
    const sim = this.sim, P = sim.player; this.t += dt;
    if (this.weaponId !== sim.cur) this.setWeapon(sim.cur);

    // joueur
    const pa = this.player;
    pa.root.position.set(P.x, 0, P.z); pa.root.rotation.y = P.face;
    if (P.dead) pa.play('Death', { loop: false, fade: 0.1 });
    else if (P.sprinting) pa.play('Run_Gun', { speed: 1.15 });
    else if (P.moving) pa.play(P.speed > 4.2 ? 'Run_Gun' : 'Walk_Gun', { speed: Math.max(0.7, P.speed / 3.6) });
    else pa.play('Idle_Gun');
    pa.update(dt); this.aimWeapon();

    // zombies
    const seen = new Set();
    for (const z of sim.zombies) {
      seen.add(z.id);
      let a = this.zviews.get(z.id);
      if (!a) { a = this.makeZombie(z); this.zviews.set(z.id, a); }
      a.root.position.set(z.x, z.dead && z.deadT > 3.5 ? -Math.min(1, (z.deadT - 3.5) * 0.5) * 0.9 : 0, z.z);
      a.root.rotation.y = z.face;
      this.zombieAnim(a, z); a.update(dt);
    }
    for (const [id, a] of this.zviews) if (!seen.has(id)) { this.scene.remove(a.root); this.zviews.delete(id); }

    // objets
    const pseen = new Set();
    for (const pk of sim.pickups) {
      pseen.add(pk.id);
      let g = this.pviews.get(pk.id); if (!g) { g = this.makePickup(pk); this.pviews.set(pk.id, g); }
      g.position.set(pk.x, 0, pk.z); g.userData.obj.position.y = 0.45 + Math.sin(pk.t * 3) * 0.1; g.userData.obj.rotation.y = pk.t * 1.6;
    }
    for (const [id, g] of this.pviews) if (!pseen.has(id)) { this.scene.remove(g); this.pviews.delete(id); }

    // caméra
    this.kick = Math.max(0, this.kick - dt * 0.5);
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
