import './orient.js';   // force le mode paysage (écran d'invite + verrouillage)
import { boot } from './game.js';

boot().catch((e) => {
  console.error(e);
  const t = document.getElementById('loadTxt');
  if (t) { t.textContent = 'Erreur au démarrage : ' + (e && e.message ? e.message : e); t.classList.add('err'); }
});
