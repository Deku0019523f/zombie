# RAPPORT — Zombie Survival

> Mémoire du projet. À mettre à jour après chaque étape importante, sans supprimer les infos déjà présentes.
> Dernière mise à jour : 2026-10-28

## 1. Objectif du projet
Jeu web de survie en vue de dessus : le joueur affronte des vagues de zombies de plus en plus dures dans une arène, avec plusieurs armes, des boss et un meilleur score sauvegardé. Jouable au clavier/souris et sur mobile (tactile).
Dépôt : https://github.com/Deku0019523f/zombie

## 2. Stack et technologies
- HTML5 / CSS3 / JavaScript vanilla (modules ES, aucune dépendance runtime)
- Rendu : éléments DOM positionnés par `transform: translate()` (pas de canvas)
- Son : WebAudio (effets synthétisés, aucun fichier audio)
- Persistance : `localStorage` (record, son, langue)
- Node.js (≥ 18) uniquement pour le test de fumée et le serveur local

## 3. Architecture et structure des fichiers
Voir `plan.md` pour le détail. Résumé :
- `index.html` : structure de la page (HUD, arène, overlay, barre d'armes, panneaux)
- `css/style.css` : styles
- `js/main.js` : point d'entrée (DOM, événements, boucle `requestAnimationFrame`)
- `js/game.js` : cycle de vie (start / pause / fin) et `update(dt)`
- `js/state.js` : état global unique ; `js/config.js` : tout l'équilibrage
- `js/input.js`, `player.js`, `weapons.js`, `bullets.js`, `zombies.js`, `pickups.js`, `waves.js`
- `js/ui.js`, `i18n.js`, `audio.js`, `storage.js`, `dom.js`, `util.js`
- `tests/smoke.mjs` : simulation headless avec DOM factice

## 4. Fonctionnalités développées
- Déplacement ZQSD/WASD (touches physiques → AZERTY et QWERTY) ou flèches, visée souris, tir au clic
- Contrôles tactiles : joystick dynamique (moitié gauche), visée + tir (moitié droite), boutons d'armes/recharge
- 3 armes : pistolet (munitions illimitées), fusil à pompe (vague 3), mitraillette auto (vague 5) ; touches 1/2/3
- Rechargement temporisé avec réserve de munitions, rechargement auto, retour au pistolet si arme vide
- 4 types de zombies : walker, runner (rapide), tank (5 PV), boss (40 PV, toutes les 5 vagues) + barres de vie
- Système de vagues avec intermission, bonus de fin de vague, difficulté progressive
- Caisses de soin ❤️ et de munitions 📦 lâchées par les zombies
- Meilleur score (localStorage), écrans démarrage / pause / game over, pause auto à la perte de focus
- Sons WebAudio + bouton muet ; interface FR/EN (détection auto, bouton de bascule)
- Les zombies ne se superposent plus (séparation) ; balles par sous-pas (pas de traversée)

## 5. Fonctionnalités restantes / idées
- Test réel sur navigateurs et mobiles (non fait en environnement de développement)
- Obstacles / murs dans l'arène, power-ups temporaires (bouclier, double dégâts)
- Mode multijoueur local, classement en ligne
- Sprites/animations à la place des formes CSS, effets de particules
- Version canvas si le nombre d'entités devient très élevé

## 6. Modifications importantes effectuées
- 2026-10-28 : refonte complète du fichier HTML unique en projet multifichier (modules ES) ; correction des bugs ci-dessous ; ajout des fonctionnalités de la section 4. Premier push sur GitHub (branche `main`).

## 7. Problèmes rencontrés et solutions
| Problème (version d'origine) | Solution |
|---|---|
| Changement de vague vérifié uniquement à l'apparition d'un zombie (`score % 100`), donc raté ou en retard | Vagues pilotées par file de zombies : la vague finit quand tout est apparu ET éliminé |
| Rechargement instantané et infini (touche R) | Rechargement temporisé, chargeur + réserve par arme |
| Aucun contrôle tactile malgré le layout responsive | Joystick + zone de tir tactile (pointer events) |
| Touches bloquées après un changement d'onglet/fenêtre | `resetInput()` + pause automatique sur `blur` / `visibilitychange` |
| Balle rapide pouvant traverser un zombie | Déplacement par sous-pas de 10 px max |
| Zombies empilés au même point | Force de séparation entre zombies |
| Dommages dépendants d'un seul timer global sans retour visuel | Invulnérabilité 0,5 s + flash rouge + son |
| Arène redimensionnée : joueur hors limites | `ResizeObserver` + `clampPlayer()` |
| Pas de meilleur score, pas de son | `storage.js`, `audio.js` |
| Push GitHub : `add_repo` refusé (compte non lié), `gh` avec token invalide | Push via les outils GitHub connectés (`create_or_update_file` pour initialiser le dépôt vide, puis `push_files`) |

## 8. Dépendances installées
Aucune dépendance npm. (`serve` est lancé à la demande par `npm start` via `npx`.)

## 9. Commandes importantes
```bash
npm start        # serveur local (les modules ES exigent http://, pas file://)
npm test         # test de fumée headless (6 min de jeu simulées)
python3 -m http.server 8000   # alternative sans Node
```
Déploiement possible tel quel sur GitHub Pages (branche `main`, racine).

## 10. Variables d'environnement
Aucune.

## 11. État actuel du projet
Version 2.0.0 complète et fonctionnelle côté logique : syntaxe validée sur tous les modules, test de fumée OK (13 vagues atteintes par un bot, tous les types de zombies et d'armes exercés, pause/reprise OK). Rendu visuel et contrôles tactiles non testés sur un vrai navigateur dans cet environnement. Code poussé sur `main`.

## 12. Prochaines étapes
1. Ouvrir le jeu sur ordinateur et téléphone, vérifier le ressenti (vitesse, difficulté) et ajuster `js/config.js`
2. Activer GitHub Pages pour jouer en ligne
3. Choisir parmi les idées de la section 5
