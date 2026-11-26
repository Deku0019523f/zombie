// Écran d'inventaire (sac à emplacements, objets au sol, équipement). Ne touche la simulation que via ses méthodes
// (useItem, dropItem, takePickup, equip) ; `act()` est appelé après chaque action pour que le jeu rejoue les événements.
import { ITEMS, WEAPONS } from './config.js';
import { ico } from './icons.js';
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function createInventory(sim, act) {
  const root = $('inv');
  let sel = null;                       // { k: 'bag'|'ground'|'gear', id }
  let open = false;

  const isOpen = () => open;
  const show = (on) => { open = on; root.classList.toggle('hidden', !on); if (on) { sel = null; render(); } };

  const cellHtml = (c, i) => `<button class="cell${sel && sel.k === 'bag' && sel.id === c.id ? ' sel' : ''}" data-k="bag" data-id="${c.id}" aria-label="${esc(ITEMS[c.id].name)}">${ico(c.id, "ic")}<b>${c.n}</b></button>`;

  function render() {
    if (!open) return;
    const cells = sim.bagCells(), max = sim.slotsMax(), used = cells.length;
    $('invStats').innerHTML = `Poches <b>${used}/${max}</b>`;
    const grid = cells.map(cellHtml);
    for (let i = used; i < max; i++) grid.push('<div class="cell empty"></div>');
    $('invGrid').innerHTML = grid.join('');
    $('invSlots').innerHTML = `<b class="${used >= max ? 'full' : ''}">${used}/${max}</b>`;
    const am = sim.inv.ammo || 0;
    $('invAmmo').innerHTML = `<button class="chip${sel && sel.k === 'bag' && sel.id === 'ammo' ? ' sel' : ''}" data-k="bag" data-id="ammo">${ico("ammo", "ic")} Munitions<b>${am}</b></button>`;

    const near = sim.nearbyPickups(3.5);
    $('invGround').innerHTML = near.length ? near.map(p => {
      const it = ITEMS[p.kind] || { name: p.kind };
      return `<button class="row${sel && sel.k === 'ground' && sel.id === p.id ? ' sel' : ''}" data-k="ground" data-id="${p.id}">${ico(p.kind, "ic")}<span>${esc(it.name)}</span><span class="n">×${p.n || 1}</span></button>`;
    }).join('') : '<div class="invempty">Rien autour de vous.</div>';

    const gear = sim.owned().map(id => {
      const W = WEAPONS[id];
      return `<button class="gcard${id === sim.cur ? ' cur' : ''}${sel && sel.k === 'gear' && sel.id === id ? ' sel' : ''}" data-k="gear" data-id="${id}">${ico(id, "ic")}<span>${esc(W.name)}<small>${W.melee ? 'Mêlée' : 'Munitions ' + sim.weapons[id].ammo + '/' + W.mag}</small></span></button>`;
    });
    gear.push(`<div class="gcard bag${sim.hasBag() ? '' : ' none'}">${ico("backpack", "ic")}<span>Sac à dos<small>${sim.hasBag() ? '20 emplacements' : 'Aucun (8 emplacements)'}</small></span></div>`);
    $('invGear').innerHTML = gear.join('');
    info();
  }

  function info() {
    const box = $('invInfo');
    if (!sel) { box.innerHTML = '<div class="txt"><b>Inventaire</b><span>Touchez un objet pour l\'utiliser, le jeter ou le ramasser.</span></div>'; return; }
    let txt, acts = '';
    if (sel.k === 'ground') {
      const p = sim.pickups.find(q => q.id === sel.id); if (!p) { sel = null; return info(); }
      const it = ITEMS[p.kind] || { name: p.kind, desc: '' };
      txt = `<b>${esc(it.name)} ×${p.n || 1}</b><span>${esc(it.desc || '')}</span>`;
      acts = `<button class="btn sm" data-a="take">RAMASSER</button>`;
    } else if (sel.k === 'gear') {
      const W = WEAPONS[sel.id];
      txt = `<b>${esc(W.name)}</b><span>${W.melee ? 'Arme de mêlée.' : 'Arme à feu : ' + sim.weapons[sel.id].ammo + '/' + W.mag + ' dans le chargeur.'}</span>`;
      acts = sel.id === sim.cur ? '<button class="btn sm" disabled>EN MAIN</button>' : '<button class="btn sm" data-a="equip">ÉQUIPER</button>';
    } else {
      const it = ITEMS[sel.id], n = sim.inv[sel.id] || 0; if (!it || n <= 0) { sel = null; return info(); }
      txt = `<b>${esc(it.name)} ×${n}</b><span>${esc(it.desc || '')}</span>`;
      if (it.use) acts += `<button class="btn sm" data-a="use">${it.use.toUpperCase()}</button>`;
      acts += `<button class="btn sm" data-a="drop1">JETER 1</button>`;
      if (n > 1) acts += `<button class="btn sm" data-a="dropAll">TOUT</button>`;
    }
    box.innerHTML = `<div class="txt">${txt}</div><div class="acts">${acts}</div>`;
  }

  root.addEventListener('click', (e) => {
    if (e.target.closest('#invClose') || e.target === root) return show(false);
    const a = e.target.closest('[data-a]');
    if (a && sel) {
      const id = sel.id;
      switch (a.dataset.a) {
        case 'use': sim.useItem(id); break;
        case 'drop1': sim.dropItem(id, 1); break;
        case 'dropAll': sim.dropItem(id, sim.inv[id] || 0); break;
        case 'take': sim.takePickup(id); break;
        case 'equip': sim.equip(id); break;
      }
      act(); render(); return;
    }
    const c = e.target.closest('[data-k]');
    if (c && !c.classList.contains('bag')) { sel = (sel && sel.k === c.dataset.k && String(sel.id) === c.dataset.id) ? null : { k: c.dataset.k, id: c.dataset.k === 'ground' ? +c.dataset.id : c.dataset.id }; render(); }
  });
  return { isOpen, show, toggle: () => show(!open), render };
}
