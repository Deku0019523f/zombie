// Effets visuels légers, à pool d'objets : traînées de balles, lueur de bouche, éclaboussures de sang.
import * as THREE from 'three';

function radialTex(inner, outer) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, inner); gr.addColorStop(1, outer); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export const shadowTexture = () => radialTex('rgba(0,0,0,0.55)', 'rgba(0,0,0,0)');

export class Fx {
  constructor(scene) {
    this.scene = scene;
    const tg = new THREE.BoxGeometry(0.03, 0.03, 1);
    this.tracers = Array.from({ length: 20 }, () => {
      const m = new THREE.Mesh(tg, new THREE.MeshBasicMaterial({ color: 0xfff1b0, transparent: true, depthWrite: false, fog: false }));
      m.visible = false; m.userData.life = 0; scene.add(m); return m;
    });
    const ft = radialTex('rgba(255,235,170,1)', 'rgba(255,140,30,0)');
    this.flashes = Array.from({ length: 4 }, () => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: ft, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false }));
      s.visible = false; s.userData.life = 0; scene.add(s); return s;
    });
    const bt = radialTex('rgba(170,10,10,1)', 'rgba(120,0,0,0)');
    this.blood = Array.from({ length: 72 }, () => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: bt, transparent: true, depthWrite: false }));
      s.visible = false; s.userData = { life: 0, v: new THREE.Vector3() }; scene.add(s); return s;
    });
    this.ti = 0; this.fi = 0; this.bi = 0;
  }

  tracer(from, to) {
    const t = this.tracers[this.ti++ % this.tracers.length];
    const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), len = a.distanceTo(b);
    if (len < 0.2) return;
    t.position.copy(a).lerp(b, 0.5); t.lookAt(b); t.scale.set(1, 1, len);
    t.material.opacity = 0.9; t.userData.life = 0.07; t.visible = true;
  }

  flash(p) {
    const f = this.flashes[this.fi++ % this.flashes.length];
    f.position.set(p[0], p[1], p[2]); f.scale.setScalar(0.55 + Math.random() * 0.3);
    f.material.opacity = 1; f.userData.life = 0.05; f.visible = true;
  }

  splash(p, n = 6, head = false) {
    for (let i = 0; i < n; i++) {
      const s = this.blood[this.bi++ % this.blood.length];
      s.position.set(p[0], p[1], p[2]);
      s.userData.v.set((Math.random() - 0.5) * 2.4, Math.random() * 2.2, (Math.random() - 0.5) * 2.4);
      s.scale.setScalar(head ? 0.22 : 0.15); s.material.opacity = 1; s.userData.life = 0.55; s.visible = true;
    }
  }

  update(dt) {
    for (const t of this.tracers) if (t.visible) { t.userData.life -= dt; t.material.opacity = Math.max(0, t.userData.life / 0.07); if (t.userData.life <= 0) t.visible = false; }
    for (const f of this.flashes) if (f.visible) { f.userData.life -= dt; if (f.userData.life <= 0) f.visible = false; }
    for (const s of this.blood) if (s.visible) {
      const u = s.userData; u.life -= dt; if (u.life <= 0) { s.visible = false; continue; }
      u.v.y -= 9 * dt; s.position.addScaledVector(u.v, dt);
      if (s.position.y < 0.03) { s.position.y = 0.03; u.v.set(0, 0, 0); }
      s.material.opacity = Math.min(1, u.life * 2.2);
    }
  }
}
