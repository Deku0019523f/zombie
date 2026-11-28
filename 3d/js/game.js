// Chef d'orchestre : chargement, boucle principale, branchement simulation ↔ rendu ↔ HUD ↔ sons.
import { CAMERA, PLAYER, WEAPONS, ZOMBIES, WEAPON_ORDER, BACKPACK_VIEW } from './config.js';
import { buildLayout } from './layout.js';
import { Sim } from './sim.js';
import { loadAll, has } from './assets.js';
import { View } from './view.js';
import { createInput } from './input.js';
import { createInventory } from './inventory.js';
import { createMap } from './map.js';
import { createTrade } from './trade.js';
import { NPC_MODELS } from './npcs.js';
import { ui } from './ui.js';
import * as audio from './audio.js';

const BEST_KEY = 'zs3d_best', SAVE_KEY = 'zs3d_save';
const saveGet = () => { try { const d = JSON.parse(localStorage.getItem(SAVE_KEY)); return d && d.v ? d : null; } catch { return null; } };
const saveSet = (d) => { try { if (d) localStorage.setItem(SAVE_KEY, JSON.stringify(d)); else localStorage.removeItem(SAVE_KEY); } catch { /* stockage indisponible */ } };
const bestGet = () => { try { return +localStorage.getItem(BEST_KEY) || 0; } catch { return 0; } };
const bestSet = (v) => { try { localStorage.setItem(BEST_KEY, String(v)); } catch { /* stockage indisponible */ } };

const HOUSE = ['Wall_Plaster_Straight', 'Wall_Plaster_Window_Wide_Flat', 'Wall_Plaster_Window_Thin_Round', 'Wall_Plaster_Door_Flat', 'Wall_UnevenBrick_Straight', 'Wall_UnevenBrick_Window_Wide_Flat', 'Wall_UnevenBrick_Door_Flat', 'Corner_Exterior_Wood', 'Roof_RoundTiles_6x6', 'Prop_MetalFence_Simple', 'Prop_Crate', 'Door_1_Flat', 'Prop_WoodenFence_Single', 'Floor_WoodDark'].map(n => `village/${n}.gltf`);

export async function boot() {
  ui.loading(0, 'Chargement des modèles 3D…');
  const layout = buildLayout(1337);
  const list = [
    PLAYER.model, ...WEAPON_ORDER.map(w => WEAPONS[w].model).filter(Boolean), ...Object.values(ZOMBIES).map(z => z.model),
    ...layout.models, ...layout.houseModels, ...HOUSE, ...[1, 2, 3, 4].map(i => `vegetation/Grass_${i}.glb`),
    'props/Bandages.glb', 'props/Can_Closed.glb', 'props/WaterBottle_1.glb', 'props/Bonfire.glb', 'props/Bonfire_Fire.glb', 'props/Shovel.glb',
    BACKPACK_VIEW.model, 'props/WoodLog.glb', 'props/Matchbox.glb', 'props/BearTrap_Open.glb',
    ...(layout.cabin.models || []), ...NPC_MODELS, 'weapons/Pistol.gltf',
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

  // rejoue les événements de la simulation (sons, bannières, rendu) et rafraîchit le HUD
  const flush = () => { const ev = sim.drain(); view.handle(ev); react(ev); ui.update(sim); };
  const inv = createInventory(sim, flush);
  const map = createMap(sim);
  const trade = createTrade(sim, flush);
  const closeInv = () => { if (inv.isOpen()) inv.show(false); input.clear(); };
  const toggleInv = () => { if (trade.isOpen()) return; if (mode !== 'play' || paused || sim.player.dead || sim.over) return; if (inv.isOpen()) closeInv(); else { input.clear(); inv.show(true); } };

  const begin = (save) => {
    audio.unlock(); sim.reset(save); input.clear(); inv.show(false); mode = 'play'; paused = false; ui.hud(true); ui.pause(false);
    view.syncWorld();
    ui.banner(save ? 'DE RETOUR' : 'VOUS VOUS RÉVEILLEZ', save ? 'Jour ' + sim.day() : 'Cabane abandonnée… trouvez de quoi survivre', 3200);
    if (document.documentElement.requestFullscreen && matchMedia('(pointer:coarse)').matches) document.documentElement.requestFullscreen().catch(() => {});
  };
  const start = () => { saveSet(null); begin(null); };
  const cont = () => begin(saveGet());
  const doSave = () => { if (mode === 'play' && !sim.player.dead && !sim.over) saveSet(sim.serialize()); };
  let saveT = 0;
  const setPause = (p) => { if (mode !== 'play') return; if (p) { doSave(); inv.show(false); trade.close(); } paused = p; ui.pause(p); input.clear(); if (document.pointerLockElement) document.exitPointerLock(); };

  document.getElementById('btnContinue').addEventListener('click', cont);
  document.getElementById('btnStart').addEventListener('click', start);
  document.getElementById('btnRestart').addEventListener('click', start);
  document.getElementById('btnResume').addEventListener('click', () => { audio.unlock(); setPause(false); });
  document.querySelectorAll('.js-menu').forEach(b => b.addEventListener('click', () => { doSave(); inv.show(false); mode = 'menu'; paused = false; sim.reset(); view.syncWorld(); ui.menu(best, !!saveGet()); }));
  const snd = document.getElementById('btnSound');
  snd.addEventListener('click', () => { audio.setMuted(!audio.isMuted()); snd.textContent = audio.isMuted() ? 'SON : NON' : 'SON : OUI'; });
  document.addEventListener('visibilitychange', () => { if (document.hidden) setPause(true); });
  window.addEventListener('blur', () => setPause(true));
  document.addEventListener('pointerdown', audio.unlock, { passive: true });

  const A = audio.sfx;
  const NAME = { wood: 'bois', stone: 'pierre', food: 'conserve', water: 'eau', bandage: 'bandage', ammo: 'munitions', match: 'allumette', backpack: 'sac à dos' };
  function react(events) {
    for (const e of events) {
      switch (e.type) {
        case 'shot': if (e.first) A.shot(e.w); break;
        case 'swing': A.swing(); break;
        case 'chop': A.chop(e.kind); break;
        case 'hit': ui.hitMarker(e.head); e.head ? A.headshot() : A.hit(); break;
        case 'kill': A.kill(); break;
        case 'hurt': ui.hurt(); A.hurt(); break;
        case 'reload': A.reload(); break;
        case 'empty': A.empty(); break;
        case 'swap': A.swap(); ui.banner(WEAPONS[e.w].name, null, 900); break;
        case 'build': A.build(); break;
        case 'door': A.door(e.open); break;
        case 'trap': A.pieceBreak(); ui.hitMarker(true); ui.banner('Piège déclenché', null, 900); break;
        case 'crash': A.pieceBreak(); break;
        case 'vehicle': A.door(e.on); if (e.on) ui.banner(e.name, 'Joystick : haut = accélérer, bas = freiner, côtés = tourner', 2600); break;
        case 'vehicleWreck': A.pieceBreak(); ui.banner('VÉHICULE HORS D’USAGE', null, 2000); break;
        case 'trade': A.door(true); trade.open(e.id); break;
        case 'trade-done': A.pickup(); ui.banner('Échange conclu', null, 900); break;
        case 'pieceHit': A.pieceHit(); break;
        case 'pieceBreak': A.pieceBreak(); break;
        case 'use': ({ food: A.eat, water: A.drink, bandage: A.bandage })[e.id]?.(); break;
        case 'loot': A.loot(); ui.banner(e.got.length ? 'TROUVÉ' : 'Rien ici…', e.got.map(g => g.weapon ? WEAPONS[g.id].name : g.id === 'backpack' ? 'Sac à dos : 20 emplacements' : '+' + g.n + ' ' + (NAME[g.id] || g.id)).join(' · '), 1800); break;
        case 'pickup': A.pickup(); ui.banner('+' + (e.n || 1) + ' ' + (NAME[e.kind] || e.kind), null, 900); break;
        case 'drop': A.swap(); ui.banner('Jeté : ' + e.n + ' ' + (NAME[e.id] || e.id), null, 900); break;
        case 'tip': A.tip(); ui.banner(e.text, null, 2200); break;
        case 'phase': e.night ? (A.dusk(), ui.banner('LA NUIT TOMBE', 'Barricadez-vous', 3000)) : (A.dawn(), ui.banner('JOUR ' + e.day, 'Le soleil se lève', 2600)); break;
        case 'death': A.death(); break;
        case 'gameover': {
          saveSet(null);
          const isBest = e.days > best; if (isBest) { best = e.days; bestSet(best); }
          inv.show(false); mode = 'over'; ui.over(e, best, isBest); break;
        }
      }
    }
  }

  window.addEventListener('keydown', (e) => { if (e.code === 'Escape' && inv.isOpen()) { closeInv(); } });
  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    const frozen = paused || inv.isOpen() || map.isOpen() || trade.isOpen();            // inventaire ou carte ouverts : le monde s'arrête
    if (mode === 'play' && !paused) {
      const inp = input.poll();
      if (input.takeInv()) toggleInv();
      if (inv.isOpen() || map.isOpen() || trade.isOpen()) input.takeLook();   // monde figé : on ignore les autres touches
      else if (inp.pause) setPause(true);
      else {
        const lk = input.takeLook();
        sim.look(-lk.x * CAMERA.sens, -lk.y * CAMERA.sens);
        sim.update(dt, inp);
        flush();
        saveT += dt; if (saveT > 20) { saveT = 0; doSave(); }
        groanT -= dt;
        if (groanT <= 0) { groanT = 1.2 + Math.random(); if (sim.zombies.some(z => !z.dead && z.state === 'chase' && Math.hypot(z.x - sim.player.x, z.z - sim.player.z) < 16)) audio.sfx.groan(); }
      }
    }
    if (mode === 'play') map.update(dt);
    view.render(frozen ? 0 : dt, mode === 'menu' ? 'menu' : 'play');
  }
  ui.menu(best, !!saveGet());
  requestAnimationFrame(frame);
}
