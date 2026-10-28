import { getLang, setLang } from './storage.js';

const dict = {
  fr: {
    restart: 'RECOMMENCER', score: 'SCORE', wave: 'VAGUE',
    startTitle: 'ZOMBIE SURVIVAL', startText: 'Survivez le plus longtemps possible.',
    hintTouch: 'Joystick à gauche pour bouger · bouton rouge pour tirer (visée automatique)',
    hintKeys: 'ZQSD/WASD ou flèches : bouger · souris : viser · clic/Espace : tirer · R : recharger · 1/2/3 ou E : armes · P : pause',
    play: 'JOUER', paused: 'PAUSE', resume: 'REPRENDRE',
    overTitle: 'GAME OVER',
    overText: (s, w) => `Score : ${s} · Vague ${w}`,
    newBest: '🎉 Nouveau record !',
    bestIs: (b) => `Record : ${b}`,
    again: 'REJOUER',
    weapon_pistol: 'Pistolet', weapon_shotgun: 'Fusil à pompe', weapon_smg: 'Mitraillette',
    waveStart: (n) => `Vague ${n}`,
    waveBoss: (n) => `Vague ${n} — BOSS !`,
    waveClear: (n, b) => `Vague ${n} terminée ! +${b}`,
    unlocked: (name) => `Nouvelle arme : ${name}`,
    ammoPickup: '📦 Munitions récupérées', healthPickup: '❤️ Santé +',
  },
  en: {
    restart: 'RESTART', score: 'SCORE', wave: 'WAVE',
    startTitle: 'ZOMBIE SURVIVAL', startText: 'Survive as long as you can.',
    hintTouch: 'Joystick on the left to move · red button to shoot (auto-aim)',
    hintKeys: 'WASD/arrows: move · mouse: aim · click/Space: shoot · R: reload · 1/2/3 or E: weapons · P: pause',
    play: 'PLAY', paused: 'PAUSED', resume: 'RESUME',
    overTitle: 'GAME OVER',
    overText: (s, w) => `Score: ${s} · Wave ${w}`,
    newBest: '🎉 New high score!',
    bestIs: (b) => `Best: ${b}`,
    again: 'PLAY AGAIN',
    weapon_pistol: 'Pistol', weapon_shotgun: 'Shotgun', weapon_smg: 'SMG',
    waveStart: (n) => `Wave ${n}`,
    waveBoss: (n) => `Wave ${n} — BOSS!`,
    waveClear: (n, b) => `Wave ${n} cleared! +${b}`,
    unlocked: (name) => `New weapon: ${name}`,
    ammoPickup: '📦 Ammo collected', healthPickup: '❤️ Health +',
  },
};

function detect() {
  const saved = getLang();
  if (saved === 'fr' || saved === 'en') return saved;
  const nav = typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'fr';
  return nav.toLowerCase().startsWith('fr') ? 'fr' : 'en';
}

let lang = detect();

export const getLanguage = () => lang;

export function t(key, ...args) {
  const v = dict[lang][key] ?? dict.en[key] ?? key;
  return typeof v === 'function' ? v(...args) : v;
}

export function toggleLanguage() {
  lang = lang === 'fr' ? 'en' : 'fr';
  setLang(lang);
}

export function applyStaticTexts() {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach((e) => { e.textContent = t(e.dataset.i18n); });
}
