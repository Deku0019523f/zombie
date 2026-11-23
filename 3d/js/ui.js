// Interface (HUD, écrans) : lit l'état de la simulation, n'écrit jamais dedans.
import { WEAPONS, PLAYER } from './config.js';

const $ = (id) => document.getElementById(id);
const cache = {};
const setText = (id, v) => { if (cache[id] !== v) { cache[id] = v; $(id).textContent = v; } };
const setW = (id, pct) => { const v = Math.round(pct * 10) / 10; if (cache['w' + id] !== v) { cache['w' + id] = v; $(id).style.width = v + '%'; } };
const show = (id, on) => $(id).classList.toggle('hidden', !on);

let bannerTimer = 0, hitTimer = 0;

export const ui = {
  loading(p, txt) { show('screenLoad', true); $('loadBar').style.width = Math.round(p * 100) + '%'; $('loadTxt').textContent = txt || ''; },
  menu(best) { show('screenLoad', false); show('screenMenu', true); show('hud', false); show('screenOver', false); show('screenPause', false); setText('menuBest', best > 0 ? 'Record : ' + best : ''); },
  hud(on) { show('hud', on); if (on) { show('screenMenu', false); show('screenOver', false); } },
  pause(on) { show('screenPause', on); },
  over(info, best, isBest) {
    show('screenOver', true); show('hud', false);
    $('overStats').innerHTML = `Vague <b>${info.wave}</b> · <b>${info.kills}</b> zombies · Score <b>${info.score}</b>` + (isBest ? '<br><span class="rec">NOUVEAU RECORD !</span>' : `<br>Record : ${best}`);
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
    setText('hudWave', sim.wave > 0 ? 'VAGUE ' + sim.wave : 'PRÉPAREZ-VOUS');
    setText('hudKills', '☠ ' + sim.kills);
    setText('hudScore', String(sim.score));
    setText('hudLeft', sim.state === 'active' ? sim.hostiles + ' restants' : 'Prochaine vague ' + Math.max(0, Math.ceil(sim.interT)) + ' s');
    setW('barHp', (P.hp / PLAYER.hp) * 100);
    setW('barSt', (P.stamina / PLAYER.stamina) * 100);
    $('barHp').classList.toggle('low', P.hp < 30);
    setText('hudHp', String(Math.ceil(P.hp)));
    setText('hudWeapon', W.name);
    setText('hudAmmo', S.ammo + ' / ' + S.reserve);
    $('slotAmmo').classList.toggle('empty', S.ammo === 0);
    const rl = sim.reloadT > 0 ? 100 * (1 - sim.reloadT / sim.reloadTotal) : 0;
    setW('barReload', rl); show('reloadWrap', sim.reloadT > 0);
    const list = sim.owned();
    const dots = list.map(id => `<i class="${id === sim.cur ? 'cur' : ''}"></i>`).join('');
    if (cache.dots !== dots) { cache.dots = dots; $('slotDots').innerHTML = dots; }
    $('cross').classList.toggle('moving', P.moving);
  },
};
