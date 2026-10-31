# RAPPORT — Zombie Survival

> Mémoire du projet. À mettre à jour après chaque étape importante, sans supprimer les infos déjà présentes.
> Dernière mise à jour : 2026-10-31

## 1. Objectif du projet
Jeu web de survie en vue de dessus, pensé **mobile en portrait** (style jeu de tir pixel art) : le joueur affronte des vagues de zombies de plus en plus dures, avec plusieurs armes, des boss et un meilleur score sauvegardé. Jouable au tactile (joystick + bouton de tir) et au clavier/souris.
Dépôt : https://github.com/Deku0019523f/zombie

## 2. Stack et technologies
- HTML5 / CSS3 / JavaScript vanilla (modules ES, aucune dépendance runtime)
- Rendu : **canvas 2D** en pixel art (sprites et décor générés en code ; seule image : `assets/cover.jpg` pour le chargement et le menu)
- Interface (HUD, menus, boutons tactiles) : HTML/CSS par-dessus le canvas
- Son : WebAudio (effets synthétisés, aucun fichier audio)
- Persistance : `localStorage` (record, son, langue, progression de la campagne, modes de tir, réglages)
- Node.js (≥ 18) uniquement pour le test de fumée et le serveur local

## 3. Architecture et structure des fichiers
Voir `plan.md` pour le détail. Principe : la **logique** (`state`, `update`) ne touche jamais au canvas ; `render.js` lit seulement `state`.
- `index.html` : canvas + HUD + commandes tactiles + conteneur d'écrans (`#overlay > #ovCard`)
- `css/style.css` : mise en page portrait (colonne centrée sur ordinateur), HUD, joystick, bouton rouge, menus, carte du parcours
- `js/main.js` (boucle, câblage) · `game.js` (cycle de vie) · `state.js` · `config.js` (tout l'équilibrage)
- Logique : `input.js`, `player.js`, `weapons.js`, `bullets.js`, `zombies.js`, `pickups.js`, `waves.js`, `effects.js`
- Rendu : `render.js` (décor, entités, lumières), `sprites.js` (sprites pixel art), `ui.js` (HUD HTML)
- Support : `i18n.js`, `audio.js`, `storage.js`, `dom.js`, `util.js`
- v2.2.0 : `layout.js` (obstacles, barils), `stats.js` (bonus d'améliorations), `combat.js` (explosions, grenade, acide, bombe nucléaire), `perks.js` (tirage/application des améliorations)
- v2.3.0 : `loader.js` (écran de chargement), `assets/cover.jpg` (illustration)
- v2.4.0 : `campaign.js` (10 niveaux, étoiles), `screens.js` (menu principal, carte du parcours, réglages, aide, pause, victoire, défaite) ; les sprites Meshy, `tools/` et `MESHY.md` ont été **retirés** (demande de l'utilisateur)
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

- **v2.2.0 — variété de gameplay** (le jeu était jugé répétitif) :
  - Après chaque vague : choix d'**1 amélioration parmi 3** (11 améliorations : dégâts, cadence, vitesse, PV, rechargement, perforation, vampirisme, aimant, munitions, armure, grenade) ; touches 1/2/3 ou tactile
  - 3 nouveaux zombies : **cracheur** (acide à distance), **explosif** (explose au contact/à la mort), **chargeur** (télégraphie, fonce, récupère)
  - **Obstacles solides** (voitures, caisses, baril) qui bloquent joueur, zombies et balles ; **barils explosifs** en chaîne
  - **Grenade** (bouton 💣 / touche G, recharge 9 s) visant le groupe le plus dense
  - **Power-ups temporaires** : rage (tir ×2), bouclier, gel, bombe nucléaire
  - **Combo** x1 à x5 (5 kills / étape, 2,5 s, brisé si touché), scores flottants
  - **Thèmes de vague** : horde, blindés, nuit (obscurité + lumières), ravitaillement (caisse à aller chercher), blitz
- **v2.3.0 — écran de chargement et menu** : illustration « Dernier Rempart » plein cadre avec barre de progression, menu principal sur fond assombri, titre en deux tons (DERNIER / REMPART), sous-titre « LA VILLE EST TOMBÉE ». (Le chargement de sprites PNG externes Meshy ajouté alors a été retiré en v2.4.0.)
- **v2.3.1 — personnages Meshy** (abandonné et retiré en v2.4.0 à la demande de l'utilisateur) : un modèle GLB Meshy avait été converti en sprites par un outil WebGL maison ; historique conservé ici pour mémoire.

- **v2.4.0 — tir, parcours, menus** :
  - **Portée limitée** par arme (`range` dans `config.js` : pistolet 170, fusil 105, mitraillette 150 px) ; les balles s'estompent en fin de portée ; cercle pointillé de portée (désactivable) ; nouvelle amélioration « Longue portée » (+20 %)
  - **4 modes de tir** (`FIRE_MODES`) : semi-auto (un tir par appui, +20 % dégâts, plus précis), auto (maintenir), rafale ×3, **tir chargé** (maintenir puis relâcher : dégâts ×3,2, portée ×1,55, perforation +2, jauge visible). Modes proposés par arme ; choix par la pastille du HUD, la touche F/V ou Réglages ; mémorisé par arme (localStorage)
  - **Campagne « Le parcours »** : 10 niveaux (3 à 8 vagues, thèmes imposés, boss aux niveaux 5/9/10), équipement de départ croissant, 1 à 3 étoiles (victoire / PV ≥ 50 % / PV ≥ 80 %), déblocage progressif, meilleur score par niveau, sauvegarde locale. Mode **Survie** infinie conservé
  - **Menus** : principal (Campagne, Survie, Réglages, Aide, langue/son), carte sinueuse avec fiche de briefing, réglages (langue, son, cercle de portée, mode de tir par arme, effacer la progression), aide, pause (reprendre/recommencer/réglages/menu), victoire (étoiles, niveau suivant) et défaite (réessayer)

## 5. Fonctionnalités restantes / idées
- Test sur de vrais téléphones (iOS Safari / Android Chrome) : ressenti, performances, vibrations
- Boutique d'améliorations permanentes achetées avec les étoiles ; décors différents par niveau ; modes de tir supplémentaires (tir en arc, laser perforant) ; armes de mêlée
- Traduire le titre EN (« LAST BULWARK » actuellement) ou garder « DERNIER REMPART » partout : à trancher
- Musique d'ambiance, décor en vraies images
- Mode PWA (installable, plein écran, hors-ligne), classement en ligne, vibration (`navigator.vibrate`)

## 6. Modifications importantes effectuées
- 2026-10-28 (1) : refonte du fichier HTML unique en projet multifichier (modules ES), correction des bugs, ajout armes/zombies/pickups/vagues/sons/record/FR-EN. Premier push GitHub.
- 2026-10-28 (2) : **refonte visuelle** sur demande (capture de référence : jeu mobile pixel art). Passage du rendu DOM au **canvas**, ajout de `render.js`, `sprites.js`, `effects.js` ; contrôles tactiles remplacés par joystick fixe + bouton de tir rouge à visée auto ; HUD haut ; décor ; tir continu maintenu pour toutes les armes ; unités logiques (arène de 360 px de large, hauteur adaptée à l'écran).

- 2026-10-29 (3) : **v2.2.0 gameplay** (voir section 4) ; nouveaux modules `layout.js`, `stats.js`, `combat.js`, `perks.js` ; `config.js` réécrit (ZOMBIES, AI, THEMES, POWER, GRENADE, COMBO, PERKS) ; collisions décor ; tests étendus.
- 2026-10-29 (4) : **v2.3.0** écran de chargement + menu illustré (image fournie par l'utilisateur, recadrée en `assets/cover.jpg`), titre « Dernier Rempart », `loader.js`.
- 2026-10-29 (5) : v2.3.1 (retirée) : outil GLB → sprites Meshy.
- 2026-10-31 : **v2.4.0** retrait des sprites Meshy / outil GLB / `MESHY.md` ; refonte `weapons.js` (modes de tir, portée) ; `ui.js` allégé (overlay déplacé dans `screens.js`) ; `startGame(mode, niveau)` ; `waves.js` gère `waveNo` et la victoire de niveau ; campagne et menus.

## 7. Problèmes rencontrés et solutions
| Problème | Solution |
|---|---|
| Vague détectée seulement à l'apparition d'un zombie (`score % 100`) | Vagues pilotées par une file de zombies ; fin quand tout est apparu et éliminé |
| Rechargement instantané et infini | Rechargement temporisé, chargeur + réserve par arme |
| Aucun contrôle tactile malgré le layout responsive | Joystick + bouton de tir (pointer events, multi-touch) |
| Touches bloquées après changement d'onglet | `resetInput()` + pause auto sur `blur` / `visibilitychange` |
| Balle rapide traversant un zombie | Déplacement par sous-pas de 8 px max |
| Zombies empilés | Force de séparation |
| Pistolet : maintenir le bouton tactile ne tirait qu'une fois (vu en test) | Tout appui maintenu = tir continu, cadence limitée par l'arme (v2.4.0 : désormais selon le mode de tir choisi) |
| Voiture de police cachée sous les boutons tactiles (vu en capture) | Décor repositionné entre joystick et bouton de tir |
| Joueur hors limites si l'arène change de taille | `ResizeObserver` + `clampPlayer()` |
| Titre de l'illustration visible derrière le titre du menu | Fond du menu recadré vers le bas (`background-size:auto 165%`, position bottom) |
| Test de fumée cassé par `ovTitle.append` (faux DOM) | Ajout de `append` dans le DOM factice |
| `pkill -f` dans la même commande Bash tue le shell (exit 144) | Lancer `pkill` seul, ou ignorer le code 144 |
| Zombies spéciaux/obstacles : zombies coincés dans le décor | `pushOut` cercle-vs-rectangle + invariant testé (aucun centre de zombie dans un obstacle) |
| Balles portées trop loin : les ennemis n'avaient pas le temps de se montrer (retour utilisateur) | Portée par arme (`range`), balles qui s'estompent, cercle de portée |
| Carte du parcours : le HUD du jeu transparaissait derrière les écrans plein cadre (vu en capture) | `.overlay.full` avec fond opaque |
| Carte : niveau 1 sélectionné au lieu du niveau en cours | Sélection du dernier niveau débloqué à l'ouverture de la carte |
| Les outils GitHub ne transmettent que du texte : PNG/JPG impossibles à pousser | `assets/cover.jpg` livré à part (archive) ; à ajouter via l'interface web de GitHub |
| Push GitHub : `git push` refusé par le proxy, `add_repo` refusé (compte non lié) | Push via les outils GitHub connectés (`push_files`, en plusieurs commits) |

## 8. Dépendances installées
Aucune dépendance npm. (`serve` est lancé à la demande par `npm start` via `npx`.)

## 9. Commandes importantes
```bash
npm start        # serveur local (les modules ES exigent http://, pas file://)
npm test         # test de fumée headless (6 min de jeu simulées + tir + campagne)
python3 -m http.server 8000   # alternative sans Node
```
Déploiement possible tel quel sur GitHub Pages (branche `main`, racine). Sur téléphone : ouvrir l'adresse du serveur (même Wi-Fi) ou la page GitHub Pages.

## 10. Variables d'environnement
Aucune.

## 11. État actuel du projet
Version 2.4.0. Test de fumée étendu (portée, 4 modes de tir, campagne, étoiles, sauvegarde) OK ; captures en émulation mobile contrôlées (menu, carte, réglages, aide, pause, tir chargé, victoire), aucune erreur JS. Non testé sur de vrais appareils ; équilibrage de la campagne et des modes de tir à valider à la main. `assets/cover.jpg` doit être ajouté manuellement au dépôt (sans lui, chargement et menu s'affichent sur fond uni).

## 12. Prochaines étapes
1. Ajouter `assets/cover.jpg` au dépôt GitHub (Add file → Upload files)
2. Tester sur téléphone, régler portées / cadences / difficulté des niveaux dans `js/config.js` et `js/campaign.js`
3. Activer GitHub Pages pour jouer en ligne
4. Choisir parmi les idées de la section 5 (boutique d'améliorations avec les étoiles, décors par niveau, nouveaux modes de tir, PWA)
