// Chef d'orchestre : chargement, boucle principale, branchement simulation ↔ rendu ↔ HUD ↔ sons.
import { CAMERA, PLAYER, WEAPONS, ZOMBIES, WEAPON_ORDER } from './config.js';
import { buildLayout } from './layout.js';
import { Sim } from './sim.js';
import { loadAll, has } from './assets.js';
import { View } from './view.js';
import { createInput } from './input.js';
import { ui } from './ui.js';
import * as audio from './audio.js';

const BEST_KEY = 'zs3d_best';
const bestGet = () => { try { return +localStorage.getItem(BEST_KEY) || 0; } catch { return 0; } };
const bestSet = (v) => { try { localStorage.setItem(BEST_KEY, String(v)); } catch { /* stockage indisponible */ } };

const HOUSE = ['Wall_Plaster_Straight', 'Wall_Plaster_Window_Wide_Flat', 'Wall_Plaster_Window_Thin_Round', 'Wall_Plaster_Door_Flat', 'Wall_UnevenBrick_Straight', 'Wall_UnevenBrick_Window_Wide_Flat', 'Wall_UnevenBrick_Door_Flat', 'Corner_Exterior_Wood', 'Roof_RoundTiles_6x6', 'Prop_MetalFence_Simple', 'Prop_Crate'].map(n => `village/${n}.gltf`);

export async function boot() {
  ui.loading(0, 'Chargement des modèles 3D…');
  const layout = buildLayout(1337);
  const list = [
    PLAYER.model, ...WEAPON_ORDER.map(w => WEAPONS[w].model), ...Object.values(ZOMBIES).map(z => z.model),
    ...layout.models, ...HOUSE, ...[1, 2, 3, 4].map(i => `vegetation/Grass_${i}.glb`),
    'props/FirstAidKit.glb', 'environment/Chest_Special.gltf',
  ];
  const failed = await loadAll(list, (p, n) => ui.loading(p, 'Chargement… ' + Math.round(p * 100) + ' %'));
  if (!has(PLAYER.model)) {
    ui.error('Modèles introuvables. Copie le dossier assets/ à la racine du dépôt (voir README_ASSETS.md) et sers le site en HTTP (npm start).');
    return;
  }
  if (failed.length) console.warn('[boot] modèles manquants (formes de secours utilisées) :', failed);

  const sim = new Sim(layout);
  const view = new View(document.getElementById('gl'), sim);
  const input = createInput();
  let mode = 'menu', paused = false, best = bestGet(), groanT = 0;
  window.__game = { sim, view, layout };          // pratique pour déboguer dans la console

  const start = () => {
    audio.unlock(); sim.reset(); input.clear(); mode = 'play'; paused = false; ui.hud(true); ui.pause(false);
    ui.banner('SURVIVEZ', 'Les morts approchent…', 2600);
    if (document.documentElement.requestFullscreen && matchMedia('(pointer:coarse)').matches) document.documentElement.requestFullscreen().catch(() => {});
  };
  const setPause = (p) => { if (mode !== 'play') return; paused = p; ui.pause(p); input.clear(); if (document.pointerLockElement) document.exitPointerLock(); };

  document.getElementById('btnStart').addEventListener('click', start);
  document.getElementById('btnRestart').addEventListener('click', start);
  document.getElementById('btnResume').addEventListener('click', () => { audio.unlock(); setPause(false); });
  document.querySelectorAll('.js-menu').forEach(b => b.addEventListener('click', () => { mode = 'menu'; paused = false; sim.reset(); ui.menu(best); }));
  document.getElementById('btnMute').addEventListener('click', (e) => { audio.setMuted(!audio.isMuted()); e.currentTarget.textContent = audio.isMuted() ? '🔇' : '🔊'; });
  document.addEventListener('visibilitychange', () => { if (document.hidden) setPause(true); });
  window.addEventListener('blur', () => setPause(true));
  document.addEventListener('pointerdown', audio.unlock, { passive: true });

  const react = (events) => {
    for (const e of events) {
      switch (e.type) {
        case 'shot': if (e.first) audio.sfx.shot(e.w); break;
        case 'hit': ui.hitMarker(e.head); e.head ? audio.sfx.headshot() : audio.sfx.hit(); break;
        case 'kill': audio.sfx.kill(); break;
        case 'hurt': ui.hurt(); audio.sfx.hurt(); break;
        case 'reload': audio.sfx.reload(); break;
        case 'empty': audio.sfx.empty(); break;
        case 'swap': audio.sfx.swap(); ui.banner(WEAPONS[e.w].name, null, 900); break;
        case 'pickup': audio.sfx.pickup(); ui.banner(({ med: 'Soins +' + 35, ammo: 'Munitions', weapon: WEAPONS[e.w] ? WEAPONS[e.w].name + ' !' : 'Arme' })[e.kind], null, 1200); break;
        case 'wave': audio.sfx.wave(); ui.banner('VAGUE ' + e.n, e.count + ' zombies', 2600); break;
        case 'waveClear': audio.sfx.clear(); ui.banner('VAGUE ' + e.n + ' TERMINÉE', '+' + e.bonus + ' points', 2600); break;
        case 'death': audio.sfx.death(); break;
        case 'gameover': {
          const isBest = e.score > best; if (isBest) { best = e.score; bestSet(best); }
          mode = 'over'; ui.over(e, best, isBest); break;
        }
      }
    }
  };

  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (mode === 'play' && !paused) {
      const inp = input.poll();
      if (inp.pause) setPause(true);
      else {
        const lk = input.takeLook();
        sim.look(-lk.x * CAMERA.sens, -lk.y * CAMERA.sens);
        sim.update(dt, inp);
        const ev = sim.drain(); view.handle(ev); react(ev);
        ui.update(sim);
        groanT -= dt;
        if (groanT <= 0) { groanT = 1.2 + Math.random(); if (sim.zombies.some(z => !z.dead && z.state === 'chase' && Math.hypot(z.x - sim.player.x, z.z - sim.player.z) < 16)) audio.sfx.groan(); }
      }
    }
    view.render(paused ? 0 : dt, mode === 'menu' ? 'menu' : 'play');
  }
  ui.menu(best);
  requestAnimationFrame(frame);
}
