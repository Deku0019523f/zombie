import { getLang, setLang } from './storage.js';

const dict = {
  fr: {
    restart: 'RECOMMENCER', health: '❤️ SANTÉ', score: '🏆 SCORE', wave: '🌊 VAGUE', best: '⭐ RECORD',
    howto: 'COMMENT JOUER',
    move: 'ZQSD / WASD ou flèches — se déplacer',
    aim: 'Souris — viser',
    shoot: 'Clic (maintenu pour les armes auto) — tirer',
    reloadKey: 'R — recharger',
    weaponKeys: '1 / 2 / 3 — changer d’arme',
    pauseKey: 'P ou Échap — pause',
    touch: 'Mobile : joystick à gauche, toucher à droite pour viser et tirer',
    mission: 'ÉTAT DE LA MISSION',
    survive: 'Survivez aux vagues de zombies !',
    tip: 'Restez en mouvement et ramassez les ❤️ et 📦 lâchés par les zombies.',
    startTitle: 'ZOMBIE SURVIVAL', startText: 'Survivez le plus longtemps possible.',
    play: 'JOUER', paused: 'PAUSE', resume: 'REPRENDRE',
    overTitle: 'GAME OVER',
    overText: (s, w) => `Score : ${s} · Vague ${w}`,
    newBest: '🎉 Nouveau record !',
    bestIs: (b) => `Record : ${b}`,
    again: 'REJOUER',
    weapon_pistol: 'Pistolet', weapon_shotgun: 'Fusil à pompe', weapon_smg: 'Mitraillette',
    lockedAt: (n) => `🔒 Vague ${n}`,
    waveStart: (n) => `Vague ${n}`,
    waveBoss: (n) => `Vague ${n} — BOSS !`,
    waveClear: (n, b) => `Vague ${n} terminée ! +${b}`,
    unlocked: (name) => `Nouvelle arme : ${name}`,
    ammoPickup: '📦 Munitions récupérées', healthPickup: '❤️ Santé +',
  },
  en: {
    restart: 'RESTART', health: '❤️ HEALTH', score: '🏆 SCORE', wave: '🌊 WAVE', best: '⭐ BEST',
    howto: 'HOW TO PLAY',
    move: 'WASD or arrow keys — move',
    aim: 'Mouse — aim',
    shoot: 'Click (hold for auto weapons) — shoot',
    reloadKey: 'R — reload',
    weaponKeys: '1 / 2 / 3 — switch weapon',
    pauseKey: 'P or Esc — pause',
    touch: 'Mobile: joystick on the left, touch the right side to aim and shoot',
    mission: 'MISSION STATUS',
    survive: 'Survive the zombie waves!',
    tip: 'Keep moving and pick up the ❤️ and 📦 dropped by zombies.',
    startTitle: 'ZOMBIE SURVIVAL', startText: 'Survive as long as you can.',
    play: 'PLAY', paused: 'PAUSED', resume: 'RESUME',
    overTitle: 'GAME OVER',
    overText: (s, w) => `Score: ${s} · Wave ${w}`,
    newBest: '🎉 New high score!',
    bestIs: (b) => `Best: ${b}`,
    again: 'PLAY AGAIN',
    weapon_pistol: 'Pistol', weapon_shotgun: 'Shotgun', weapon_smg: 'SMG',
    lockedAt: (n) => `🔒 Wave ${n}`,
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
