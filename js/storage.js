// Persistance locale (meilleur score, son, langue). Tolère un localStorage indisponible.
const P = 'zombie.';

function get(k, d) {
  try {
    const v = localStorage.getItem(P + k);
    return v === null ? d : v;
  } catch {
    return d;
  }
}
function set(k, v) {
  try { localStorage.setItem(P + k, String(v)); } catch { /* ignoré */ }
}

export const getBest = () => Number(get('best', 0)) || 0;
export const setBest = (v) => set('best', v);
export const getMuted = () => get('muted', '0') === '1';
export const setMuted = (m) => set('muted', m ? '1' : '0');
export const getLang = () => get('lang', null);
export const setLang = (l) => set('lang', l);
