// Interface (HUD, écrans) : lit l'état de la simulation, n'écrit jamais dedans.
import { WEAPONS, PLAYER, PIECES, PIECE_ORDER } from './config.js';
const NAMES = { wall: 'Mur en bois', stone: 'Mur en pierre', door: 'Porte', fire: 'Feu de camp' };
const RES = { wood: 'bois', stone: 'pierre', match: 'allumette' };

const $ = (id) => document.getElementById(id);
const cache = {};
const setText = (id, v) => { if (cache[id] !== v) { cache[id] = v; $(id).textContent = v; } };
const setW = (id, pct) => { const v = Math.round(pct * 10) / 10; if (cache['w' + id] !== v) { cache['w' + id] = v; $(id).style.width = v + '%'; } };
const show = (id, on) => $(id).classList.toggle('hidden', !on);

let bannerTimer = 0, hitTimer = 0;

export const ui = {
  loading(p, txt) { show('screenLoad', true); $('loadBar').style.width = Math.round(p * 100) + '%'; $('loadTxt').textContent = txt || ''; },
  menu(best, canContinue) { show('screenLoad', false); show('screenMenu', true); show('hud', false); show('inv', false); show('screenOver', false); show('screenPause', false); show('btnContinue', !!canContinue); setText('menuBest', best > 0 ? 'Record : ' + best + (best > 1 ? ' jours' : ' jour') : ''); },
  hud(on) { show('hud', on); if (on) { show('screenMenu', false); show('screenOver', false); } },
  pause(on) { show('screenPause', on); },
  over(info, best, isBest) {
    show('screenOver', true); show('hud', false); show('inv', false);
    $('overStats').innerHTML = `Vous avez survécu <b>${info.days}</b> jour${info.days > 1 ? 's' : ''} · <b>${info.kills}</b> zombies abattus` + (isBest ? '<br><span class="rec">NOUVEAU RECORD !</span>' : `<br>Record : ${best} jour${best > 1 ? 's' : ''}`);
  },
  error(msg) { show('screenLoad', true); $('loadTxt').textContent = msg; $('loadTxt').classList.add('err'); },

  banner(text, sub, ms = 2400) {
    const b = $('banner'); b.innerHTML = `<div class="b1">${text}</div>` + (sub ? `<div class="b2">${sub}</div>` : '');
    b.classList.add('on'); clearTimeout(bannerTimer); bannerTimer = setTimeout(() => b.classList.remove('on'), ms);
  },
  hurt() { const v = $('vignette'); v.classList.remove('flash'); void v.offsetWidth; v.classList.add('flash'); },
  hitMarker(head) {
    const h = $('hitmark'); h.classList.toggle('head', !!head); h.classList.add('on');
    clearTimeout(hitTimer); hitTimer = setTimeout(() => h.classList.remove('on'), 110);
  },

  update(sim) {
    const P = sim.player, W = WEAPONS[sim.cur], S = sim.weapons[sim.cur];
    const h = sim.hour(), hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
    setText('hudClock', `Jour ${sim.day()} · ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}` + (sim.isNight() ? ' 🌙' : ' ☀'));
    setW('barHp', (P.hp / PLAYER.hp) * 100); setW('barSt', (P.stamina / PLAYER.stamina) * 100);
    setW('barFood', P.hunger); setW('barWater', P.thirst);
    $('barFood').classList.toggle('low', P.hunger < 20); $('barWater').classList.toggle('low', P.thirst < 20);
    $('barHp').classList.toggle('low', P.hp < 30);
    setText('hudHp', String(Math.ceil(P.hp)));
    show('bleed', !!P.bleed);
    const inv = sim.inv;
    // 🎒 emplacements utilisés / disponibles ; 🔥 allumettes ; 🔫 munitions (les munitions ne prennent pas de place)
    setText('hudRes', `🎒 ${sim.slotsUsed()}/${sim.slotsMax()}   🪵 ${inv.wood || 0}   🪨 ${inv.stone || 0}   🔥 ${inv.match || 0}   🔫 ${inv.ammo || 0}`);
    setText('hc1', String(inv.bandage || 0)); setText('hc2', String(inv.food || 0)); setText('hc3', String(inv.water || 0));
    [['1', 'bandage'], ['2', 'food'], ['3', 'water']].forEach(([n, id]) => { const el = document.querySelector(`.hslot[data-slot="${n}"]`); const none = !(inv[id] > 0); if (cache['n' + n] !== none) { cache['n' + n] = none; el.classList.toggle('none', none); } });
    setText('hudWeapon', W.name);
    setText('hudAmmo', W.melee ? '' : S.ammo + ' / ' + (inv.ammo || 0));
    $('slotAmmo').classList.toggle('empty', !W.melee && S.ammo === 0);
    show('btnReload', !W.melee);
    const rl = sim.reloadT > 0 ? 100 * (1 - sim.reloadT / sim.reloadTotal) : 0;
    setW('barReload', rl); show('reloadWrap', sim.reloadT > 0);
    const dots = sim.owned().map(id => `<i class="${id === sim.cur ? 'cur' : ''}"></i>`).join('');
    if (cache.dots !== dots) { cache.dots = dots; $('slotDots').innerHTML = dots; }
    $('cross').classList.toggle('moving', P.moving);
    // bouton d'interaction
    const pr = sim.prompt; show('btnUse', !!pr); if (pr) setText('useLbl', pr.label);
    // construction
    const B = sim.build; $('btnBuild').classList.toggle('on', B.on); show('buildBar', B.on);
    if (B.on) {
      document.querySelectorAll('.bp').forEach(b => b.classList.toggle('sel', PIECE_ORDER[+b.dataset.p - 1] === B.piece));
      const D = PIECES[B.piece], g = B.ghost;
      const cost = Object.entries(D.cost).map(([k, n]) => `${n} ${RES[k]}`).join(', ');
      setText('buildInfo', `${NAMES[B.piece]} — ${cost}` + (g && !g.ok ? ' ✖ ' + g.why : ''));
    }
  },
};
