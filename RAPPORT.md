# RAPPORT — Zombie Survival

> Mémoire du projet. À mettre à jour après chaque étape importante, sans supprimer les infos déjà présentes.
> Dernière mise à jour : 2026-11-02

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
- v2.2.0 : `layout.js` (obstacles, barils), `stats.js` (bonus d'améliorations), `combat.js` (explosions, grenade, acide, bombe nucléaire), `perks.js` (tirage/application des améliorations)
- v2.3.0 : `loader.js` (écran de chargement), `assets/cover.jpg` (illustration)
- v2.4.0 : `campaign.js` (10 niveaux, étoiles), `screens.js` (menu principal, carte du parcours, réglages, aide, pause, victoire, défaite) ; les sprites Meshy, `tools/` et `MESHY.md` ont été **retirés** (demande de l'utilisateur)
- v2.5.0 : `objectives.js` (générateur / zone / survivant / allié), `events.js` (embuscade, panne, largage), `spots.js` (emplacements libres) ; `stats.js` gère aussi l'atelier et les synergies
- v3.0.0 : `citymap.js` (carte pure : 6 zones, obstacles, points de contrôle, ravitaillements, caches), `cityart.js` (décor pré-rendu), `city.js` (population, checkpoints, sauvegarde, caméra)
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
- **v2.3.0 — écran de chargement et menu** : illustration « Dernier Rempart » plein cadre avec barre de progression, menu principal sur fond assombri, titre en deux tons (DERNIER / REMPART), sous-titre « LA VILLE EST TOMBÉE ». Chargement optionnel de **sprites PNG externes** (`assets/sprites/manifest.json`) pour remplacer les sprites pixel art par des personnages créés avec Meshy AI (voir `MESHY.md`)
- **v2.3.1 — personnages Meshy** : modèle `Meshy_AI_Classic_Zombie_Rigged_All_Animations.glb` (24 os, 15 097 sommets, animations Running/Walking/Mummy_Stagger) rendu par `tools/render-glb.mjs` (WebGL autonome, sans three.js) en 7 planches PNG (`assets/sprites/*.png` + `manifest.json`), une par type de zombie (variantes de teinte/animation) ; recadrage automatique des images au chargement

- **v2.4.0 — tir, parcours, menus** :
  - **Portée limitée** par arme (`range` dans `config.js` : pistolet 170, fusil 105, mitraillette 150 px) ; les balles s'estompent en fin de portée ; cercle pointillé de portée (désactivable) ; nouvelle amélioration « Longue portée » (+20 %)
  - **4 modes de tir** (`FIRE_MODES`) : semi-auto (un tir par appui, +20 % dégâts, plus précis), auto (maintenir), rafale ×3, **tir chargé** (maintenir puis relâcher : dégâts ×3,2, portée ×1,55, perforation +2, jauge visible). Modes proposés par arme ; choix par la pastille du HUD, la touche F/V ou Réglages ; mémorisé par arme (localStorage)
  - **Campagne « Le parcours »** : 10 niveaux (3 à 8 vagues, thèmes imposés, boss aux niveaux 5/9/10), équipement de départ croissant, 1 à 3 étoiles (victoire / PV ≥ 50 % / PV ≥ 80 %), déblocage progressif, meilleur score par niveau, sauvegarde locale. Mode **Survie** infinie conservé
  - **Menus** : principal (Campagne, Survie, Réglages, Aide, langue/son), carte sinueuse avec fiche de briefing, réglages (langue, son, cercle de portée, mode de tir par arme, effacer la progression), aide, pause (reprendre/recommencer/réglages/menu), victoire (étoiles, niveau suivant) et défaite (réessayer)

- **v2.5.0 — rythme et profondeur** (réponse à « le jeu est ennuyeux ») :
  1. **Esquive** 💨 (Maj / Q / bouton) : élan de 0,16 s, invulnérable 0,4 s, recharge 3,2 s ; **tirs critiques** (balle qui passe près du centre du zombie : ×1,5) ; le **combo** existait déjà (barre de temps ajoutée) ; **annonces de séries** (×10, 20, 35, 50, 75, 100)
  2. **Invocateur** (fait surgir des zombies, vague 7+) ; **élites ★** (vague 4+) à modificateur : rapide, blindé, soigneur, volatile ; **événements surprise** (embuscade, panne de courant, caisse larguée) une fois par vague dès la vague 3, jamais sur boss. Coureur / cracheur / explosif / brute / thèmes horde-nuit-largage existaient déjà
  3. **Objectifs** : générateur à défendre (campagne 4, 7, 9 ; perdu = défaite ; se répare à côté), zone à tenir (campagne 3, 6, 10 ; survie toutes les 4 vagues), survivant à secourir → allié qui tire 40 s (campagne 2, 8 ; survie toutes les 3 vagues)
  4. **Pièces 🪙** (kills, vagues, victoire) et **Atelier** permanent (vigueur, dégâts, agilité, fouille, sac à dos, arsenal) ; **améliorations risquées** (canon de verre, berserk, pacte de sang) ; **nouvelles améliorations** (œil de lynx, pieds légers) ; **4 synergies** (tireur d'élite, forteresse, chaîne explosive, fantôme) signalées sur la carte d'amélioration ; **balles infusées** 🔥 / 🌩️ avec rareté commun / rare / épique
  5. **Game feel** : hit-stop, chiffres de dégâts (jaunes en critique), recul fort du fusil à pompe, éclaboussures de morceaux sur gros dégâts, bannières centrales

- **v3.0.0 — mode « Ville »** (demande : ville en zones, caméra qui suit, carte qui défile, obstacles, zombies dans les rues, checkpoints) :
  - Monde de 1080 x 1240 (3 x 2 zones de 360 x 620) ; l'écran n'en montre qu'une partie : `state.vw/vh` = écran, `state.w/h` = monde, `state.cam` = caméra (lissée, bornée). Hors ville, monde = écran et caméra = 0 : les autres modes sont inchangés
  - 6 zones : quartier résidentiel (départ), centre-ville, zone industrielle (caches de mitraillette, barils), hôpital (murs percés de portes, densité 14, très dangereux), commissariat (enceinte, cache de fusil à pompe), station-service (ravitaillement, barils, camion)
  - Obstacles : voitures abandonnées, barricades, caisses, conteneurs, murs, arbres, lits... (tous solides pour joueur, zombies et balles)
  - Zombies : dispersés dans chaque zone, **au repos** (errent près de leur point) jusqu'à voir le joueur (230 px) ou entendre un tir (260 px) ; réapparition hors écran selon la densité de la zone ; types et difficulté selon la zone
  - **Points de contrôle** 🚩 (1 par zone) : sauvegarde (position, armes, améliorations, kills), soin partiel ; mort = reprise au dernier ; les 6 = ville reprise (bonus)
  - Ravitaillements (soin / munitions, recharge 60 s), caches d'armes, amélioration tous les N kills, mini-carte, nom de zone annoncé à l'entrée

## 5. Fonctionnalités restantes / idées
- Test sur de vrais téléphones (iOS Safari / Android Chrome) : ressenti, performances, vibrations
- Équilibrer atelier / élites / événements à la main (tout est dans `config.js`) ; décors différents par niveau ; modes de tir supplémentaires (tir en arc, laser perforant) ; armes de mêlée
- Traduire le titre EN (« LAST BULWARK » actuellement) ou garder « DERNIER REMPART » partout : à trancher
- Musique d'ambiance, décor en vraies images
- Mode PWA (installable, plein écran, hors-ligne), classement en ligne, vibration (`navigator.vibrate`)

## 6. Modifications importantes effectuées
- 2026-10-28 (1) : refonte du fichier HTML unique en projet multifichier (modules ES), correction des bugs, ajout armes/zombies/pickups/vagues/sons/record/FR-EN. Premier push GitHub.
- 2026-10-28 (2) : **refonte visuelle** sur demande (capture de référence : jeu mobile pixel art). Passage du rendu DOM au **canvas**, ajout de `render.js`, `sprites.js`, `effects.js` ; contrôles tactiles remplacés par joystick fixe + bouton de tir rouge à visée auto ; HUD haut ; décor ; tir continu maintenu pour toutes les armes ; unités logiques (arène de 360 px de large, hauteur adaptée à l'écran).

- 2026-10-29 (3) : **v2.2.0 gameplay** (voir section 4) ; nouveaux modules `layout.js`, `stats.js`, `combat.js`, `perks.js` ; `config.js` réécrit (ZOMBIES, AI, THEMES, POWER, GRENADE, COMBO, PERKS) ; collisions décor ; tests étendus.
- 2026-10-29 (4) : **v2.3.0** écran de chargement + menu illustré (image fournie par l'utilisateur, recadrée en `assets/cover.jpg`), titre « Dernier Rempart », `loader.js`, sprites externes optionnels, `MESHY.md`.

- 2026-10-29 (5) : **v2.3.1** outil `tools/render-glb.{html,mjs}`, sprites zombies Meshy générés et testés en jeu (aucune erreur JS).

- v2.4.0 : retrait des sprites Meshy / outil GLB ; refonte `weapons.js` (modes de tir, portée) ; `ui.js` allégé (overlay déplacé dans `screens.js`) ; `startGame(mode, niveau)` ; `waves.js` gère `waveNo` et la victoire de niveau

- v3.0.0 : `state.w/h` désignent désormais le **monde** ; `state.vw/vh` l'écran (rendu, HUD, voiles plein écran) ; la souris est convertie en coordonnées monde (`input.js` ajoute la caméra) ; `resetState(city)` construit le monde ; `waves.js` ne fait rien en ville ; `zombies.js` gère repos / alerte

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
| Titre de l'illustration visible derrière le titre du menu | Fond du menu recadré vers le bas (`background-size:auto 165%`, position bottom) |
| Test de fumée cassé par `ovTitle.append` (faux DOM) | Ajout de `append` dans le DOM factice |
| `pkill -f` dans la même commande Bash tue le shell (exit 144) | Lancer `pkill` seul, ou ignorer le code 144 |
| Zombies spéciaux/obstacles : zombies coincés dans le décor | `pushOut` cercle-vs-rectangle + invariant testé (aucun centre de zombie dans un obstacle) |
| npm / CDN inaccessibles dans le bac à sable (three.js impossible à installer) | Rendu GLB réécrit en WebGL pur (parse glTF, skinning dans le shader), exécuté par Chromium |
| Zombies Meshy trop fins en jeu (marges transparentes) | Recadrage auto sur la boîte englobante de la silhouette dans `cutFrames` |
| Ville : la carte pouvait enfermer un point d'intérêt | Test de remplissage (flood fill, rayon joueur 10) de tous les checkpoints / caches / ravitaillements depuis le départ, dans `tests/smoke.mjs` |
| Ville : toucher le départ après un autre point de contrôle le réactive (comportement voulu) | Le test déplace le joueur ailleurs |
| Ville : `state.vhurtFlash` (identifiant abîmé par un remplacement automatique h → vh) : flash rouge jamais affiché | Corrigé en `state.hurtFlash` dans `render.js` |
| Les outils GitHub ne transmettent que du texte : PNG/JPG impossibles à pousser | Fichiers binaires (`assets/cover.jpg`, `assets/sprites/*.png`) livrés en archive ; à ajouter via git en local |
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
Aucune variable d'environnement requise (aucun secret).

Notes de mise au point :
- v2.5.0 : un zombie pouvait rester **coincé entre deux caisses** (bord droit de l'arène) et bloquer la fin de la vague pour toujours → détection d'immobilité dans `zombies.js` (change de côté de contournement, puis rapproche le zombie du centre).
- v2.5.0 : la zone à tenir pouvait bloquer la fin de vague si le joueur l'ignorait → délai maximal (70 s) et zombies envoyés au compte-gouttes pendant l'attente.
- v2.5.0 : `computeStats` renvoie maintenant aussi `syn` (objet) : les tests filtrent les valeurs numériques.
- Environnement : `git push` bloqué par le proxy (403) → envoi via le connecteur GitHub (`push_files`), fichiers texte uniquement.

## 11. État actuel du projet
Version 3.0.0 (poussée sur GitHub en 9 commits « v3.0.0 (n/9) » + docs + tests ; seul `assets/cover.jpg` reste à ajouter manuellement) : mode Ville ajouté (voir section 4) ; tests OK (bot arène vague 16, 2 minutes de balade en ville, population max 34) ; captures mobile contrôlées, aucune erreur JS. Équilibrage de la ville (densités, aggro) à valider à la main : `CITY` dans `config.js`, `ZONES` dans `citymap.js`. Avant : Version 2.5.0 (esquive, critiques, élites, invocateur, événements, objectifs, pièces + atelier, synergies, game feel). Test de fumée étendu à ces mécaniques (bot vague 16, tous les niveaux de campagne simulés) OK ; captures mobile contrôlées (atelier, objectifs, élites, carte d'amélioration), aucune erreur JS. Avant : v2.4.0 (sprites Meshy retirés, retour au pixel art). Test de fumée étendu (portée, 4 modes de tir, campagne, étoiles, sauvegarde) OK ; captures mobile contrôlées (menu, carte, réglages, aide, pause, tir chargé, victoire), aucune erreur JS. Avant : v2.3.1. Syntaxe validée ; test de fumée OK (bot : vague 18, 17 améliorations, 52 grenades, 7 types de zombies, 6 thèmes, tous les bonus) ; captures en émulation mobile contrôlées (jeu, grenade, nuit, choix d'amélioration, chargement, menu), aucune erreur JS. Non testé sur de vrais appareils ; équilibrage de la v2.2.0 à valider à la main.

## 12. Prochaines étapes
0. Ville : intérieurs de bâtiments, cycle jour/nuit, quêtes par zone, boss à l'hôpital, plus de zones (agrandir `CITY.cols/rows`)
1. Ajouter `assets/cover.jpg` au dépôt GitHub (binaire non poussable par les outils disponibles) ; sans lui, chargement et menu s'affichent sur fond uni
1b. Tester sur téléphone, régler vitesse/difficulté/perks dans `js/config.js`
2. Activer GitHub Pages pour jouer en ligne
3. Choisir parmi les idées de la section 5 (collisions décor, power-ups, PWA)
