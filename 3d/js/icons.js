// Icônes de l'interface : toujours des IMAGES (plus d'emoji). Pack « UI survival » / « Bunker Exodus » quand une icône y existe,
// sinon petits SVG dessinés pour le jeu (assets/ui/icons/). Chemins relatifs à 3d/index.html.
const U = '../assets/ui/', BE = U + 'bunker-exodus/icons-64/BE_ITEM_', SV = U + 'survival/icon/', IC = U + 'icons/';
export const ICON = {
  // objets
  wood: IC + 'wood.svg', stone: IC + 'stone.svg', match: IC + 'flame.svg', backpack: IC + 'backpack.svg',
  food: BE + 'CannedFood_Used_Common_64.png', water: BE + 'WaterCanister_Used_Common_64.png',
  bandage: SV + 'first_aid.png', ammo: SV + 'bullet.png',
  // armes
  knife: SV + 'knife.png', bat: IC + 'bat.svg', guitar: IC + 'guitar.svg', club: IC + 'club.svg', spear: IC + 'spear.svg',
  axe: IC + 'axe.svg', pick: IC + 'pick.svg', pistol: SV + 'gun.png', smg: SV + 'gun.png', shotgun: IC + 'longgun.svg', rifle: IC + 'longgun.svg',
  // commandes
  build: IC + 'hammer.svg', swap: IC + 'swap.svg', sprint: IC + 'sprint.svg', reload: IC + 'reload.svg', use: IC + 'hand.svg', drop: IC + 'drop.svg',
  door: IC + 'door.svg', fire: IC + 'flame.svg', blood: IC + 'blood.svg', moon: IC + 'moon.svg', sun: IC + 'sun.svg',
};
export const ico = (id, cls = 'ico') => `<img class="${cls}" src="${ICON[id] || ''}" alt="" draggable="false">`;
