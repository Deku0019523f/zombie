// Écran d'échange avec un marchand (troc). Interface seulement : lit et pilote la simulation (sim.doDeal).
export function createTrade(sim, flush) {
  const css = document.createElement('style');
  css.textContent = `
  #trade{position:fixed;inset:0;z-index:31;background:rgba(8,10,8,.88);display:none;align-items:center;justify-content:center;padding:10px;box-sizing:border-box}
  #trade.open{display:flex}
  #trade .box{background:#1d211b;border:2px solid #fff4;border-radius:10px;max-width:520px;width:100%;max-height:100%;overflow:auto;padding:14px;color:#eee;font:14px system-ui,sans-serif}
  #trade h3{margin:0 0 4px;font:700 17px system-ui;letter-spacing:.08em}
  #trade .have{color:#bbb;font-size:12px;margin-bottom:10px}
  #trade .row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 0;border-top:1px solid #fff2}
  #trade .row b{color:#ffd95a;font-weight:600}
  #trade button{min-height:40px;padding:0 14px;border-radius:8px;border:2px solid #fff6;background:#2f6b36;color:#fff;font:700 13px system-ui}
  #trade button:disabled{background:#333;color:#888;border-color:#fff2}
  #trade .why{font-size:11px;color:#e88}
  #trade .close{width:100%;margin-top:10px;background:#444}`;
  document.head.appendChild(css);
  const root = document.createElement('div'); root.id = 'trade'; root.innerHTML = '<div class="box"></div>'; document.body.appendChild(root);
  const box = root.firstChild;
  let id = -1, open = false;
  const fmt = (o) => Object.entries(o).map(([k, n]) => n + ' ' + sim.itemLabel(k).toLowerCase()).join(' + ');
  const render = () => {
    const set = sim.dealsOf(id); if (!set) return;
    const have = ['wood', 'stone', 'food', 'water', 'bandage', 'ammo'].filter(k => sim.inv[k]).map(k => sim.inv[k] + ' ' + sim.itemLabel(k).toLowerCase()).join(' · ');
    box.innerHTML = `<h3>${set.title.toUpperCase()}</h3><div class="have">Vous avez : ${have || 'rien'}</div>` + set.deals.map((d, k) => {
      const st = sim.dealState(d);
      return `<div class="row"><div>${fmt(d.give)} → <b>${fmt(d.get)}</b>${st.ok ? '' : `<div class="why">${st.why}</div>`}</div><button data-k="${k}" ${st.ok ? '' : 'disabled'}>Échanger</button></div>`;
    }).join('') + '<button class="close">Fermer</button>';
  };
  const show = (v) => { open = v; root.classList.toggle('open', v); if (v) render(); };
  box.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.classList.contains('close')) { show(false); return; }
    if (b.dataset.k !== undefined) { sim.doDeal(id, +b.dataset.k); flush(); render(); }
  });
  window.addEventListener('keydown', (e) => { if (open && e.code === 'Escape') { show(false); e.stopImmediatePropagation(); } }, true);
  return { isOpen: () => open, open(i) { id = i; show(true); }, close: () => show(false) };
}
