# RAPPORT — Zombie Survival

> Mémoire du projet. À mettre à jour après chaque étape importante, sans supprimer les infos déjà présentes.
> Dernière mise à jour : 2026-10-28

## 1. Objectif du projet
Jeu web de survie en vue de dessus, pensé **mobile en portrait** (style jeu de tir pixel art) : le joueur affronte des vagues de zombies de plus en plus dures, avec plusieurs armes, des boss et un meilleur score sauvegardé. Jouable au tactile (joystick + bouton de tir) et au clavier/souris.
Dépôt : https://github.com/Deku0019523f/zombie

## 2. Stack et technologies
- HTML5 / CSS3 / JavaScript vanilla (modules ES, aucune dépendance runtime)
- Rendu : **canvas 2D** en pixel art (sprites et décor générés en code, aucune image à charger)
- Interface (HUD, menus, boutons tactiles) : HTML/CSS par-dessus le canvas
- Son : WebAudio (effets synthétisés, aucun fichier audio)
- Persistance : `localStorage` (record, son, langue)
- Node.js (≥ 18) uniquement pour le test de fumée et le serveur local

## 3. Architecture et structure des fichiers
Voir `plan.md` pour le détail. Principe : la **logique** (`state`, `update`) ne touche jamais au canvas ; `render.js` lit seulement `state`.
- `index.html` : canvas + HUD + commandes tactiles + écran de menu
- `css/style.css` : mise en page portrait (colonne centrée sur ordinateur), HUD, joystick, bouton rouge
- `js/main.js` (boucle, câblage) · `game.js` (cycle de vie) · `state.js` · `config.js` (tout l'équilibrage)
- Logique : `input.js`, `player.js`, `weapons.js`, `bullets.js`, `zombies.js`, `pickups.js`, `waves.js`, `effects.js`
- Rendu : `render.js` (décor, entités, lumières), `sprites.js` (sprites pixel art), `ui.js` (HUD HTML)
- Support : `i18n.js`, `audio.js`, `storage.js`, `dom.js`, `util.js`
- `tests/smoke.mjs` : simulation headless avec DOM factice

## 4. Fonctionnalités développées
- **Style mobile portrait** inspiré de la référence fournie : HUD en haut (santé, arme/munitions, score, vague, pause), joystick à gauche, **bouton de tir rouge à droite avec visée automatique** sur le zombie le plus proche, boutons changer d'arme et recharger
- Décor pixel art : voiture rouge épave, clôture « KEEP OUT », baril en feu animé, caisses, voiture de police avec gyrophares animés, route, taches de sang, vignette sombre
- Sprites pixel art animés (marche) pour le joueur (anneau vert sous les pieds) et 4 zombies ; flash blanc quand touché, ombres, tri en profondeur
- 3 armes : pistolet (illimité), fusil à pompe (vague 3), mitraillette (vague 5) ; tir continu en maintenant le bouton / clic / Espace, limité par la cadence
- Rechargement temporisé avec réserve, rechargement auto, retour au pistolet si arme vide
- 4 zombies : walker, runner (rapide), tank (5 PV), boss (40 PV, toutes les 5 vagues) avec barres de vie
- Vagues avec intermission, bonus de fin de vague, difficulté progressive
- Caisses de soin et de munitions (dessinées en pixel art) lâchées par les zombies
- Effets : particules de sang, flaques persistantes, flash de tir, tremblement d'écran, vignette rouge quand touché
- Clavier/souris : ZQSD/WASD/flèches, souris pour viser (sinon visée auto), clic ou Espace pour tirer, R, 1/2/3, E, P/Échap
- Meilleur score, menus démarrage/pause/game over, pause auto à la perte de focus, sons, interface FR/EN

## 5. Fonctionnalités restantes / idées
- Test sur de vrais téléphones (iOS Safari / Android Chrome) : ressenti, performances, vibrations
- Obstacles solides (voiture, caisses) avec collisions, power-ups temporaires (bouclier, double dégâts)
- Vraies images/spritesheets à la place des sprites générés, musique d'ambiance
- Mode PWA (installable, plein écran, hors-ligne), classement en ligne, vibration (`navigator.vibrate`)

## 6. Modifications importantes effectuées
- 2026-10-28 (1) : refonte du fichier HTML unique en projet multifichier (modules ES), correction des bugs, ajout armes/zombies/pickups/vagues/sons/record/FR-EN. Premier push GitHub.
- 2026-10-28 (2) : **refonte visuelle** sur demande (capture de référence : jeu mobile pixel art). Passage du rendu DOM au **canvas**, ajout de `render.js`, `sprites.js`, `effects.js` ; contrôles tactiles remplacés par joystick fixe + bouton de tir rouge à visée auto ; HUD haut ; décor ; tir continu maintenu pour toutes les armes ; unités logiques (arène de 360 px de large, hauteur adaptée à l'écran).

## 7. Problèmes rencontrés et solutions
| Problème | Solution |
|---|---|
| Vague détectée seulement à l'apparition d'un zombie (`score % 100`) | Vagues pilotées par une file de zombies ; fin quand tout est apparu et éliminé |
| Rechargement instantané et infini | Rechargement temporisé, chargeur + réserve par arme |
| Aucun contrôle tactile malgré le layout responsive | Joystick + bouton de tir (pointer events, multi-touch) |
| Touches bloquées après changement d'onglet | `resetInput()` + pause auto sur `blur` / `visibilitychange` |
| Balle rapide traversant un zombie | Déplacement par sous-pas de 8 px max |
| Zombies empilés | Force de séparation |
| Pistolet : maintenir le bouton tactile ne tirait qu'une fois (vu en test) | Tout appui maintenu = tir continu, cadence limitée par l'arme |
| Voiture de police cachée sous les boutons tactiles (vu en capture) | Décor repositionné entre joystick et bouton de tir |
| Joueur hors limites si l'arène change de taille | `ResizeObserver` + `clampPlayer()` |
| Push GitHub : `add_repo` refusé (compte non lié), `gh` avec token invalide | Push via les outils GitHub connectés (`create_or_update_file` pour initialiser le dépôt vide, puis `push_files`) |

## 8. Dépendances installées
Aucune dépendance npm. (`serve` est lancé à la demande par `npm start` via `npx`.)

## 9. Commandes importantes
```bash
npm start        # serveur local (les modules ES exigent http://, pas file://)
npm test         # test de fumée headless (6 min de jeu simulées)
python3 -m http.server 8000   # alternative sans Node
```
Déploiement possible tel quel sur GitHub Pages (branche `main`, racine). Sur téléphone : ouvrir l'adresse du serveur (même Wi-Fi) ou la page GitHub Pages.

## 10. Variables d'environnement
Aucune.

## 11. État actuel du projet
Version 2.1.0. Syntaxe de tous les modules validée ; test de fumée OK (vague 14, tous les types de zombies et d'armes) ; captures réelles en émulation mobile et ordinateur contrôlées (rendu, HUD, joystick et bouton de tir tactiles multi-touch fonctionnels : score 175 / vague 2 en 22 s de jeu, aucune erreur JS). Non testé sur de vrais appareils.

## 12. Prochaines étapes
1. Tester sur téléphone, régler vitesse/difficulté dans `js/config.js`
2. Activer GitHub Pages pour jouer en ligne
3. Choisir parmi les idées de la section 5 (collisions décor, power-ups, PWA)
