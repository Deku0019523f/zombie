// Persistance locale (record, son, langue, progression de la campagne, réglages). Tolère un localStorage indisponible.
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
function getJson(k, d) {
  try {
    const v = JSON.parse(get(k, 'null'));
    return v && typeof v === 'object' ? v : d;
  } catch {
    return d;
  }
}

export const getBest = () => Number(get('best', 0)) || 0;
export const setBest = (v) => set('best', v);
export const getMuted = () => get('muted', '0') === '1';
export const setMuted = (m) => set('muted', m ? '1' : '0');
export const getLang = () => get('lang', null);
export const setLang = (l) => set('lang', l);

// Campagne : { unlocked: n° du dernier niveau accessible, stars: { [niveau]: 1..3 }, best: { [niveau]: score } }
export function getProgress() {
  const p = getJson('progress', {});
  return { unlocked: Math.max(1, Number(p.unlocked) || 1), stars: p.stars || {}, best: p.best || {} };
}
export const setProgress = (p) => set('progress', JSON.stringify(p));
export const clearProgress = () => set('progress', 'null');

// Mode de tir choisi pour chaque arme : { pistol: 'semi', ... }
export const getModes = () => getJson('modes', {});
export const setModes = (m) => set('modes', JSON.stringify(m));

// Réglages : { range: true }
export const getSettings = () => ({ range: true, ...getJson('settings', {}) });
export const setSettings = (s) => set('settings', JSON.stringify(s));
