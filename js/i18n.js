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

    // --- menus / campagne / modes de tir ---
    campaign: 'CAMPAGNE', survival: 'SURVIE', settings: 'RÉGLAGES', help: 'AIDE', back: 'RETOUR', quit: 'MENU PRINCIPAL',
    continueLvl: (n, total, stars) => `Niveau ${n}/${total} · ★ ${stars}`, newGame: 'Nouvelle partie',
    survivalSub: (b) => (b > 0 ? `Vagues sans fin · Record ${b}` : 'Vagues sans fin'),
    mapTitle: 'LE PARCOURS', brief: 'Briefing', playLevel: 'JOUER', lockedLvl: 'Termine le niveau précédent pour le débloquer.',
    waveCount: (n) => `${n} vagues`, bossTag: (n) => (n > 1 ? `${n} boss` : '1 boss'), kitTag: (n) => `+${n} amélioration${n > 1 ? 's' : ''} de départ`,
    starRules: '★ Victoire   ★★ PV ≥ 50 %   ★★★ PV ≥ 80 %', bestLvl: (s) => `Meilleur score : ${s}`,
    levelStart: (n, name) => `Niveau ${n} — ${name}`, kitToast: (n) => `Équipement : +${n} amélioration${n > 1 ? 's' : ''}`,
    victoryTitle: 'NIVEAU TERMINÉ', defeatTitle: 'ÉCHEC', campaignDone: 'CAMPAGNE TERMINÉE !', retry: 'RÉESSAYER', nextLevel: 'NIVEAU SUIVANT', toMap: 'LA CARTE',
    victoryText: (s, hp) => `Score : ${s} · PV restants : ${hp} %`, defeatText: (n, w, tot) => `Niveau ${n} · vague ${w}/${tot}`,
    unlockedLvl: (n) => `🔓 Niveau ${n} débloqué`, newStars: '★ Nouveau record d’étoiles !', campaignDoneText: 'Le rempart tient. Merci d’avoir sauvé la ville.',
    lvl_1_n: 'Les Faubourgs', lvl_1_d: 'Les premiers rôdeurs approchent. Tiens la rue.',
    lvl_2_n: 'Le Marché', lvl_2_d: 'Les étals sont renversés. Ça court vite par ici.',
    lvl_3_n: 'Le Pont', lvl_3_d: 'Un largage a atterri sur le pont. Les cracheurs rôdent.',
    lvl_4_n: 'L’Hôpital', lvl_4_d: 'Les lumières sont coupées. Avance prudemment.',
    lvl_5_n: 'Le Dépôt', lvl_5_d: 'Une brute garde le dépôt de carburant.',
    lvl_6_n: 'Le Port', lvl_6_d: 'Des hordes sortent des cargos.',
    lvl_7_n: 'La Gare', lvl_7_d: 'Les blindés bloquent les quais.',
    lvl_8_n: 'La Centrale', lvl_8_d: 'Plus de courant. La nuit ne finit pas.',
    lvl_9_n: 'La Porte', lvl_9_d: 'Tout converge vers la porte du rempart.',
    lvl_10_n: 'Le Dernier Rempart', lvl_10_d: 'Tiens bon. C’est ici que tout se joue.',
    language: 'Langue', sound: 'Son', rangeRing: 'Cercle de portée', fireModes: 'Modes de tir', on: 'OUI', off: 'NON',
    resetProgress: 'Effacer la progression', resetConfirm: 'Appuie encore pour confirmer', resetDone: 'Progression effacée',
    mode_semi: 'SEMI-AUTO', mode_auto: 'AUTO', mode_burst: 'RAFALE ×3', mode_charge: 'TIR CHARGÉ',
    mode_semi_s: 'SEMI', mode_auto_s: 'AUTO', mode_burst_s: '×3', mode_charge_s: '⚡',
    mode_semi_d: 'Un tir par appui. Plus précis, +20 % de dégâts.',
    mode_auto_d: 'Maintiens pour tirer en continu.',
    mode_burst_d: '3 balles serrées, puis courte pause.',
    mode_charge_d: 'Maintiens pour charger, relâche pour tirer : dégâts, portée et perforation augmentent.',
    modeToast: (name) => `Mode de tir : ${name}`,
    howControls: 'Contrôles', howModes: 'Modes de tir', howTips: 'Astuces',
    howTouchText: 'Joystick à gauche pour bouger. Bouton rouge pour tirer (visée automatique). 💣 grenade · 🔄 changer d’arme · ↻ recharger · pastille de mode : change le mode de tir.',
    howKeysText: 'ZQSD / WASD ou flèches : bouger · souris : viser · clic ou Espace : tirer · R : recharger · G : grenade · E ou 1/2/3 : armes · F : mode de tir · P : pause.',
    howTipsText: 'Les balles ont une portée limitée (cercle pointillé) : laisse approcher les zombies. Tire sur les barils rouges. Après chaque vague, choisis une amélioration. Un tir chargé traverse plusieurs zombies.',
    perk_range_n: 'Longue portée', perk_range_d: 'Portée des balles +20 %',
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

    // --- menus / campaign / fire modes ---
    campaign: 'CAMPAIGN', survival: 'SURVIVAL', settings: 'SETTINGS', help: 'HELP', back: 'BACK', quit: 'MAIN MENU',
    continueLvl: (n, total, stars) => `Level ${n}/${total} · ★ ${stars}`, newGame: 'New game',
    survivalSub: (b) => (b > 0 ? `Endless waves · Best ${b}` : 'Endless waves'),
    mapTitle: 'THE JOURNEY', brief: 'Briefing', playLevel: 'PLAY', lockedLvl: 'Finish the previous level to unlock it.',
    waveCount: (n) => `${n} waves`, bossTag: (n) => (n > 1 ? `${n} bosses` : '1 boss'), kitTag: (n) => `+${n} starting upgrade${n > 1 ? 's' : ''}`,
    starRules: '★ Win   ★★ HP ≥ 50%   ★★★ HP ≥ 80%', bestLvl: (s) => `Best score: ${s}`,
    levelStart: (n, name) => `Level ${n} — ${name}`, kitToast: (n) => `Gear: +${n} upgrade${n > 1 ? 's' : ''}`,
    victoryTitle: 'LEVEL CLEARED', defeatTitle: 'FAILED', campaignDone: 'CAMPAIGN COMPLETE!', retry: 'RETRY', nextLevel: 'NEXT LEVEL', toMap: 'THE MAP',
    victoryText: (s, hp) => `Score: ${s} · HP left: ${hp}%`, defeatText: (n, w, tot) => `Level ${n} · wave ${w}/${tot}`,
    unlockedLvl: (n) => `🔓 Level ${n} unlocked`, newStars: '★ New star record!', campaignDoneText: 'The bulwark holds. Thank you for saving the city.',
    lvl_1_n: 'The Outskirts', lvl_1_d: 'The first walkers are closing in. Hold the street.',
    lvl_2_n: 'The Market', lvl_2_d: 'Stalls are overturned. Things run fast around here.',
    lvl_3_n: 'The Bridge', lvl_3_d: 'An airdrop landed on the bridge. Spitters lurk.',
    lvl_4_n: 'The Hospital', lvl_4_d: 'The lights are out. Move carefully.',
    lvl_5_n: 'The Depot', lvl_5_d: 'A brute guards the fuel depot.',
    lvl_6_n: 'The Harbor', lvl_6_d: 'Hordes pour out of the cargo ships.',
    lvl_7_n: 'The Station', lvl_7_d: 'Armored ones block the platforms.',
    lvl_8_n: 'The Power Plant', lvl_8_d: 'No power. The night never ends.',
    lvl_9_n: 'The Gate', lvl_9_d: 'Everything converges on the bulwark gate.',
    lvl_10_n: 'The Last Bulwark', lvl_10_d: 'Hold on. This is where it all ends.',
    language: 'Language', sound: 'Sound', rangeRing: 'Range circle', fireModes: 'Fire modes', on: 'ON', off: 'OFF',
    resetProgress: 'Erase progress', resetConfirm: 'Tap again to confirm', resetDone: 'Progress erased',
    mode_semi: 'SEMI-AUTO', mode_auto: 'AUTO', mode_burst: 'BURST ×3', mode_charge: 'CHARGED SHOT',
    mode_semi_s: 'SEMI', mode_auto_s: 'AUTO', mode_burst_s: '×3', mode_charge_s: '⚡',
    mode_semi_d: 'One shot per tap. More accurate, +20% damage.',
    mode_auto_d: 'Hold to keep firing.',
    mode_burst_d: '3 tight bullets, then a short pause.',
    mode_charge_d: 'Hold to charge, release to fire: damage, range and piercing grow.',
    modeToast: (name) => `Fire mode: ${name}`,
    howControls: 'Controls', howModes: 'Fire modes', howTips: 'Tips',
    howTouchText: 'Joystick on the left to move. Red button to shoot (auto-aim). 💣 grenade · 🔄 switch weapon · ↻ reload · mode pill: changes fire mode.',
    howKeysText: 'WASD / arrows: move · mouse: aim · click or Space: shoot · R: reload · G: grenade · E or 1/2/3: weapons · F: fire mode · P: pause.',
    howTipsText: 'Bullets have a limited range (dotted circle): let zombies come to you. Shoot the red barrels. Pick an upgrade after each wave. A charged shot pierces several zombies.',
    perk_range_n: 'Long range', perk_range_d: 'Bullet range +20%',
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
