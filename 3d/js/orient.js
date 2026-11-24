// Le jeu se joue en PAYSAGE. Ce module :
//  1) affiche un écran « tournez votre téléphone » dès que l'écran tactile est en portrait (et met la partie en pause) ;
//  2) tente de verrouiller l'orientation en paysage quand le jeu passe en plein écran (Android / Chrome ; iOS ne le permet pas).
const css = `
#rotate{position:fixed;inset:0;z-index:100;display:none;flex-direction:column;align-items:center;justify-content:center;gap:18px;background:#0b0d0c;color:#f2efe6;text-align:center;padding:24px;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
#rotate.on{display:flex}
#rotate .ph{width:64px;height:104px;border:4px solid #ff8a1f;border-radius:12px;position:relative;animation:rot 2.2s ease-in-out infinite}
#rotate .ph::after{content:"";position:absolute;left:50%;bottom:6px;width:16px;height:4px;margin-left:-8px;border-radius:2px;background:#ff8a1f}
#rotate b{font-size:20px;letter-spacing:.08em}
#rotate span{opacity:.75;font-size:14px;max-width:320px;line-height:1.5}
@keyframes rot{0%,25%{transform:rotate(0)}60%,100%{transform:rotate(-90deg)}}
`;

const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);
const box = document.createElement('div'); box.id = 'rotate';
box.innerHTML = '<div class="ph"></div><b>TOURNEZ VOTRE TÉLÉPHONE</b><span>Dernier Rempart se joue en mode paysage (écran en largeur).</span>';
document.body.appendChild(box);

const mq = window.matchMedia('(orientation: portrait) and (pointer: coarse)');
function apply() {
  box.classList.toggle('on', mq.matches);
  // la partie se met en pause toute seule : game.js écoute l'événement « blur » de la fenêtre
  if (mq.matches) window.dispatchEvent(new Event('blur'));
}
if (mq.addEventListener) mq.addEventListener('change', apply); else mq.addListener(apply);
apply();

async function lockLandscape() {
  try { if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape'); } catch { /* non supporté ou refusé : l'écran d'invite reste actif */ }
}
document.addEventListener('fullscreenchange', () => { if (document.fullscreenElement) lockLandscape(); });
document.addEventListener('webkitfullscreenchange', () => lockLandscape());
