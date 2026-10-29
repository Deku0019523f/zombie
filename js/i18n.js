import { getLang, setLang } from './storage.js';

const dict = {
  fr: {
    restart: 'RECOMMENCER', score: 'SCORE', wave: 'VAGUE', combo: 'COMBO',
    startKicker: 'LA VILLE EST TOMBÉE', loading: 'Chargement…', loadingGo: 'Prêt', startTitle: 'DERNIER|REMPART', startText: 'Ils arrivent. Gardez vos distances.',
    hintTouch: 'Joystick à gauche pour bouger · bouton rouge pour tirer (visée auto) · 💣 grenade · tirez sur les barils rouges !',
    hintKeys: 'ZQSD/WASD ou flèches : bouger · souris : viser · clic/Espace : tirer · R : recharger · G : grenade · 1/2/3 ou E : armes · P : pause',
    play: 'JOUER', paused: 'PAUSE', resume: 'REPRENDRE',
    overTitle: 'GAME OVER',
    overText: (s, w) => `Score : ${s} · Vague ${w}`,
    newBest: '🎉 Nouveau record !',
    bestIs: (b) => `Record : ${b}`,
    again: 'REJOUER',
    weapon_pistol: 'Pistolet', weapon_shotgun: 'Fusil à pompe', weapon_smg: 'Mitraillette',
    waveStart: (n) => `Vague ${n}`,
    waveBoss: (n) => `Vague ${n} — BOSS !`,
    waveTheme: (n, name) => `Vague ${n} — ${name}`,
    waveClear: (n, b) => `Vague ${n} terminée ! +${b}`,
    unlocked: (name) => `Nouvelle arme : ${name}`,
    ammoPickup: '📦 Munitions récupérées', healthPickup: '❤️ Santé +',
    theme_horde: 'HORDE', theme_armored: 'BLINDÉS', theme_night: 'NUIT', theme_supply: 'LARGAGE', theme_blitz: 'BLITZ',
    power_rage: '⚡ RAGE ! Tir x2', power_shield: '🛡️ Bouclier !', power_freeze: '❄️ Zombies gelés !', power_nuke: '☢️ BOOM !',
    perkTitle: 'AMÉLIORATION', perkSub: 'Choisis un bonus pour la suite', level: 'Niv',
    perk_dmg_n: 'Balles puissantes', perk_dmg_d: '+25 % de dégâts',
    perk_rate_n: 'Gâchette rapide', perk_rate_d: 'Cadence de tir +14 %',
    perk_speed_n: 'Jambes de feu', perk_speed_d: 'Déplacement +8 %',
    perk_hp_n: 'Costaud', perk_hp_d: '+20 PV max et +20 PV',
    perk_reload_n: 'Rechargement éclair', perk_reload_d: 'Rechargement 22 % plus rapide',
    perk_pierce_n: 'Balles perforantes', perk_pierce_d: 'Les balles traversent +1 zombie',
    perk_vamp_n: 'Vampirisme', perk_vamp_d: 'Tuer un zombie rend des PV',
    perk_magnet_n: 'Aimant', perk_magnet_d: 'Attire les caisses proches',
    perk_ammo_n: 'Gros stock', perk_ammo_d: 'Réserves de munitions +50 %',
    perk_armor_n: 'Armure', perk_armor_d: 'Dégâts subis −15 %',
    perk_grenade_n: 'Artificier', perk_grenade_d: 'Grenade : recharge −25 %, explosion +12 %',
  },
  en: {
    restart: 'RESTART', score: 'SCORE', wave: 'WAVE', combo: 'COMBO',
    startKicker: 'THE CITY HAS FALLEN', loading: 'Loading…', loadingGo: 'Ready', startTitle: 'LAST|BULWARK', startText: 'They are coming. Keep your distance.',
    hintTouch: 'Joystick on the left to move · red button to shoot (auto-aim) · 💣 grenade · shoot the red barrels!',
    hintKeys: 'WASD/arrows: move · mouse: aim · click/Space: shoot · R: reload · G: grenade · 1/2/3 or E: weapons · P: pause',
    play: 'PLAY', paused: 'PAUSED', resume: 'RESUME',
    overTitle: 'GAME OVER',
    overText: (s, w) => `Score: ${s} · Wave ${w}`,
    newBest: '🎉 New high score!',
    bestIs: (b) => `Best: ${b}`,
    again: 'PLAY AGAIN',
    weapon_pistol: 'Pistol', weapon_shotgun: 'Shotgun', weapon_smg: 'SMG',
    waveStart: (n) => `Wave ${n}`,
    waveBoss: (n) => `Wave ${n} — BOSS!`,
    waveTheme: (n, name) => `Wave ${n} — ${name}`,
    waveClear: (n, b) => `Wave ${n} cleared! +${b}`,
    unlocked: (name) => `New weapon: ${name}`,
    ammoPickup: '📦 Ammo collected', healthPickup: '❤️ Health +',
    theme_horde: 'HORDE', theme_armored: 'ARMORED', theme_night: 'NIGHT', theme_supply: 'AIRDROP', theme_blitz: 'BLITZ',
    power_rage: '⚡ RAGE! Double fire', power_shield: '🛡️ Shield!', power_freeze: '❄️ Zombies frozen!', power_nuke: '☢️ BOOM!',
    perkTitle: 'UPGRADE', perkSub: 'Pick a bonus for the next waves', level: 'Lv',
    perk_dmg_n: 'Heavy rounds', perk_dmg_d: '+25% damage',
    perk_rate_n: 'Quick trigger', perk_rate_d: 'Fire rate +14%',
    perk_speed_n: 'Fast legs', perk_speed_d: 'Move speed +8%',
    perk_hp_n: 'Tough guy', perk_hp_d: '+20 max HP and +20 HP',
    perk_reload_n: 'Lightning reload', perk_reload_d: 'Reload 22% faster',
    perk_pierce_n: 'Piercing rounds', perk_pierce_d: 'Bullets go through +1 zombie',
    perk_vamp_n: 'Vampirism', perk_vamp_d: 'Killing a zombie restores HP',
    perk_magnet_n: 'Magnet', perk_magnet_d: 'Pulls nearby crates',
    perk_ammo_n: 'Big stock', perk_ammo_d: 'Ammo reserves +50%',
    perk_armor_n: 'Armor', perk_armor_d: 'Damage taken −15%',
    perk_grenade_n: 'Demolition', perk_grenade_d: 'Grenade: −25% cooldown, +12% blast',
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
