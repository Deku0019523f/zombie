# RAPPORT — Zombie Survival / Dernier Rempart

> Mémoire du projet. À mettre à jour après chaque étape importante, sans supprimer les infos déjà présentes.
> Dernière mise à jour : 2026-11-24

## 0. Deux jeux dans un seul dépôt (une seule branche : `main`)
- **Jeu 2D (racine, v3.1.0)** : canvas pixel art vue de dessus — `index.html`, `js/`, `css/`. Documenté aux sections 1 à 12 ci-dessous.
- **Jeu 3D (dossier `3d/`, v4.0.0-alpha)** : survie zombie en 3e personne avec modèles 3D, **à jouer en paysage**. Documenté en section 13 ; structure détaillée dans `3d/plan.md`, lancement dans `3d/README.md`.
- La branche `3d` a été **fusionnée dans `main` le 2026-11-24** (PR n°1, demande de l'utilisateur : une seule branche). Il ne faut plus créer de branche secondaire sans qu'il le demande. La branche `3d` existe encore sur GitHub (suppression impossible avec les outils de l'assistant) : à supprimer à la main.

## 1. Objectif du projet
Jeu web de survie en vue de dessus, pensé **mobile en portrait** (style jeu de tir pixel art) : le joueur affronte des vagues de zombies de plus en plus dures, avec plusieurs armes, des boss et un meilleur score sauvegardé. Jouable au tactile (joystick + bouton de tir) et au clavier/souris.
Dépôt : https://github.com/Deku0019523f/zombie
(v4 : voir section 13 — refonte en vrai jeu d'apocalypse zombie en 3D, modèles fournis par l'utilisateur.)

## 2. Stack et technologies
- HTML5 / CSS3 / JavaScript vanilla (modules ES, aucune dépendance runtime)
- Rendu : **canvas 2D** en pixel art (sprites et décor générés en code, aucune image à charger)
- Interface (HUD, menus, boutons tactiles) : HTML/CSS par-dessus le canvas
- Son : WebAudio (effets synthétisés, aucun fichier audio)
- Persistance : `localStorage` (record, son, langue)
- Node.js (≥ 18) uniquement pour le test de fumée et le serveur local
- **v4 (3D)** : three.js r160 chargé depuis le CDN jsdelivr via `importmap` (aucune installation npm), GLTFLoader + SkeletonUtils + BufferGeometryUtils, modèles glTF/GLB CC0 (Quaternius)

## 3. Architecture et structure des fichiers
Voir `plan.md` (2D) et `3d/plan.md` (3D) pour le détail. Principe : la **logique** (`state`, `update`) ne touche jamais au canvas ; `render.js` lit seulement `state`.
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
- **v4 (dossier `3d/`)** : jeu 3D complet (voir section 13), `tests/sim3d.mjs` (12 tests de la simulation 3D), `tools/obj2glb.py` (convertisseur OBJ→GLB), `assets/models/` (modèles 3D) et `assets/README_ASSETS.md`

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
- (3D) voir la section 13 : essais sur téléphone, intérieurs de maisons, menus de campagne, améliorations (perks), atelier, mêlée, véhicules

## 6. Modifications importantes effectuées
- 2026-10-28 (1) : refonte du fichier HTML unique en projet multifichier (modules ES), correction des bugs, ajout armes/zombies/pickups/vagues/sons/record/FR-EN. Premier push GitHub.
- 2026-10-28 (2) : **refonte visuelle** sur demande (capture de référence : jeu mobile pixel art). Passage du rendu DOM au **canvas**, ajout de `render.js`, `sprites.js`, `effects.js` ; contrôles tactiles remplacés par joystick fixe + bouton de tir rouge à visée auto ; HUD haut ; décor ; tir continu maintenu pour toutes les armes ; unités logiques (arène de 360 px de large, hauteur adaptée à l'écran).

- 2026-10-29 (3) : **v2.2.0 gameplay** (voir section 4) ; nouveaux modules `layout.js`, `stats.js`, `combat.js`, `perks.js` ; `config.js` réécrit (ZOMBIES, AI, THEMES, POWER, GRENADE, COMBO, PERKS) ; collisions décor ; tests étendus.
- 2026-10-29 (4) : **v2.3.0** écran de chargement + menu illustré (image fournie par l'utilisateur, recadrée en `assets/cover.jpg`), titre « Dernier Rempart », `loader.js`, sprites externes optionnels, `MESHY.md`.

- 2026-10-29 (5) : **v2.3.1** outil `tools/render-glb.{html,mjs}`, sprites zombies Meshy générés et testés en jeu (aucune erreur JS).

- v2.4.0 : retrait des sprites Meshy / outil GLB ; refonte `weapons.js` (modes de tir, portée) ; `ui.js` allégé (overlay déplacé dans `screens.js`) ; `startGame(mode, niveau)` ; `waves.js` gère `waveNo` et la victoire de niveau

- v3.0.0 : `state.w/h` désignent désormais le **monde** ; `state.vw/vh` l'écran (rendu, HUD, voiles plein écran) ; la souris est convertie en coordonnées monde (`input.js` ajoute la caméra) ; `resetState(city)` construit le monde ; `waves.js` ne fait rien en ville ; `zombies.js` gère repos / alerte

- 2026-11-23 : l'utilisateur demande de **modifier le jeu de A à Z** en vrai jeu d'apocalypse zombie avec **modèles 3D qu'il fournit**. Décisions : vue 3e personne, mobile d'abord, nouvelle base three.js dans le dossier `3d/` (le jeu 2D reste jouable à la racine). Packs reçus : Zombie Apocalypse Kit, Medieval Village MegaKit (Standard), pack « survivant », Ultimate Crops Pack, Free Urban Zombie Sprite Sheet (2D, non utilisé). Capture de référence : jeu mobile 3e personne (caméra par-dessus l'épaule, joystick gauche, boutons à droite, barres de vie/endurance et slot d'arme en bas).
- 2026-11-23 : assets allégés pour le mobile (textures du village 4096/2048 → 512 px, normales/ORM supprimées), props OBJ → GLB (`tools/obj2glb.py`), archive livrée à l'utilisateur qui l'a placée dans `assets/`.
- 2026-11-23/24 : **v4.0.0-alpha** écrite en 4 commits sur une branche `3d` : simulation 3D testable, rendu three.js, HUD tactile, mode paysage obligatoire (`orient.js`). Voir section 13.
- 2026-11-24 : **branche `3d` fusionnée dans `main`** (PR n°1, commit de fusion `ead3230`) à la demande de l'utilisateur, qui ne veut qu'une seule branche. `main` contient donc le 2D (racine) et le 3D (`3d/`).

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
| (3D) Archive Medieval Village en 7 parties : `cat *.zip.00[1-7]` recolle dans l'ordre des préfixes aléatoires, pas des numéros → zip illisible | Recoller partie par partie : `for n in 1..7; cat *zip.00$n` |
| (3D) Textures du village : 100 Mo de PNG 2048/4096 px | Couleurs de base réduites à 512 px, normales/ORM remplacées par des images 4x4 (matériaux Lambert) |
| (3D) Pack survivant et cultures : FBX/OBJ/Blend seulement | `tools/obj2glb.py` (couleurs unies) ; structure GLB vérifiée, pas affichée dans un moteur |
| (3D) `glob` Python avec `[Standard]` dans le chemin ne trouve rien (crochets = classe de caractères) | Utiliser `os.listdir` |
| (3D) Test de simulation : file d'attente factice contenant un nombre → `ZOMBIES[1]` indéfini | Les tests mettent `state='intermission'` au lieu de simuler une file |
| (3D) HUD portrait : bloc munitions superposé aux boutons | Déplacé au-dessus du joystick ; puis mode paysage rendu obligatoire |
| (3D) Drive partagé non lisible (Entité introuvable) | L'utilisateur a envoyé les archives directement dans le chat |
| Suppression d'une branche GitHub : aucun outil dédié, `gh api -X DELETE` refusé par le proxy (403) | À faire à la main : page Branches de GitHub (corbeille) ou `git push origin --delete 3d` |

## 8. Dépendances installées
Aucune dépendance npm. (`serve` est lancé à la demande par `npm start` via `npx`.)
3D : three.js r160 via CDN jsdelivr (importmap), aucune installation locale.

## 9. Commandes importantes
```bash
npm start        # serveur local (les modules ES exigent http://, pas file://)
npm test         # test de fumée headless du jeu 2D (6 min de jeu simulées)
npm run test:3d  # tests de la simulation 3D (12 tests, sans navigateur)
python3 -m http.server 8000   # alternative sans Node
```
Jeu 2D : `http://localhost:3000/` · Jeu 3D : `http://localhost:3000/3d/` (Internet requis pour three.js). Déploiement possible tel quel sur GitHub Pages (branche `main`, racine).

## 10. Variables d'environnement
Aucune variable d'environnement requise (aucun secret).

Notes de mise au point :
- v2.5.0 : un zombie pouvait rester **coincé entre deux caisses** (bord droit de l'arène) et bloquer la fin de la vague pour toujours → détection d'immobilité dans `zombies.js` (change de côté de contournement, puis rapproche le zombie du centre).
- v2.5.0 : la zone à tenir pouvait bloquer la fin de vague si le joueur l'ignorait → délai maximal (70 s) et zombies envoyés au compte-gouttes pendant l'attente.
- v2.5.0 : `computeStats` renvoie maintenant aussi `syn` (objet) : les tests filtrent les valeurs numériques.
- Environnement : `git push` bloqué par le proxy (403) → envoi via le connecteur GitHub (`push_files`), fichiers texte uniquement.

## 11. État actuel du projet
**Jeu 3D (`3d/`, sur `main`, v4.0.0-alpha)** : code complet écrit et fusionné ; la **simulation** est testée (12 tests OK : tirs, fusil à pompe, rechargement, attaque des zombies, objets, bot de 4 minutes → vague 6, 97 kills, aucune valeur invalide, aucun zombie coincé dans un mur, départ libre pour 7 graines de carte). La **couche de rendu three.js n'a JAMAIS été exécutée** : le bac à sable n'a ni three.js ni réseau. Seuls vérifiés : syntaxe de tous les modules, cohérence des identifiants HTML/JS, rendu du HUD (captures paysage + portrait) et de l'écran « tournez votre téléphone » dans Chromium. À valider sur téléphone : chargement des modèles, placement de l'arme dans la main (`WEAPON_HAND`), échelle des personnages, orientation des routes, fusion des maisons, performances, sensibilité de la caméra.
Assets : `assets3d.zip` (26 Mo) posé par l'utilisateur dans `assets/` ; `assets3d_vegetation.zip` (70 Ko, dossier `assets/models/vegetation`) livré à part (absent = herbe non affichée, sans erreur).

Jeu 2D (racine) : Version 3.0.0 (poussée sur GitHub en 9 commits « v3.0.0 (n/9) » + docs + tests ; seul `assets/cover.jpg` reste à ajouter manuellement) : mode Ville ajouté (voir section 4) ; tests OK (bot arène vague 16, 2 minutes de balade en ville, population max 34) ; captures mobile contrôlées, aucune erreur JS. Équilibrage de la ville (densités, aggro) à valider à la main : `CITY` dans `config.js`, `ZONES` dans `citymap.js`. Avant : Version 2.5.0 (esquive, critiques, élites, invocateur, événements, objectifs, pièces + atelier, synergies, game feel). Avant : v2.4.0 (sprites Meshy retirés, retour au pixel art). Avant : v2.3.1. Non testé sur de vrais appareils.

## 12. Prochaines étapes
0. **(3D) Tester `http://…/3d/` sur téléphone en paysage** et remonter les problèmes visibles (écran noir, modèles minuscules/géants, arme mal placée, caméra, perfs). Régler `js/config.js` du dossier `3d/` (`WEAPON_HAND`, `CAMERA`, `PLAYER.scale`, `ZOMBIES[*].scale/h`).
1. (3D) Intérieurs de maisons (portes ouvrables), améliorations (perks) entre les vagues, atelier, campagne / niveaux, armes de mêlée (hache, batte : modèles déjà fournis), véhicules, cycle jour/nuit, boss, musique.
2. (3D) Quand il est validé : en faire le jeu par défaut (page d'accueil à la racine qui redirige vers `3d/`, ou déplacer le 2D dans `legacy/`).
3. Ville 2D : intérieurs de bâtiments, cycle jour/nuit, quêtes par zone, boss à l'hôpital, plus de zones (agrandir `CITY.cols/rows`)
4. Ajouter `assets/cover.jpg` au dépôt GitHub (binaire non poussable par les outils disponibles) ; sans lui, chargement et menu s'affichent sur fond uni
5. Activer GitHub Pages pour jouer en ligne
6. Supprimer à la main la branche `3d` restante sur GitHub (déjà fusionnée dans `main`).

## 13. Jeu 3D — v4.0.0-alpha (dossier `3d/`, fusionné dans `main`)
**Cible** : survie zombie en 3e personne, mobile d'abord, **jouable uniquement en paysage** (écran « tournez votre téléphone » en portrait tactile + verrouillage d'orientation en plein écran quand le navigateur l'autorise ; `3d/js/orient.js`).

**Architecture en deux couches** (détail dans `3d/plan.md`) :
1. Simulation sans three.js ni DOM, testable : `config.js` (tout l'équilibrage), `logic.js` (maths, collisions cercles/boîtes, caméra), `layout.js` (ville : routes en croix, 8 à 16 maisons 8x8 m, épaves, conteneurs, barils, arbres), `sim.js` (joueur, armes, tir assisté, zombies, vagues, objets, événements).
2. Rendu/interface : `assets.js` (GLTFLoader, matériaux Lambert partagés), `world.js` (décor, **fusion des pièces statiques par matériau**), `view.js` (acteurs animés, caméra, objets), `fx.js`, `audio.js` (sons synthétisés), `input.js` (joystick flottant, glisser pour viser, boutons, clavier/souris), `ui.js` (HUD, écrans), `game.js` (boucle), `main.js`, `orient.js`.

**Gameplay actuel** : joueur Matt (anims Idle/Walk/Run_Gun), 4 armes (pistolet, fusil à pompe vague 2, mitraillette vague 4, fusil vague 7, débloquées par caisses), tir maintenu à la cadence de l'arme, **visée assistée** (cône ≈ 10°), tête ×2,2, 4 zombies (basic, arm rapide, ribcage très rapide, chubby costaud), 8 zombies endormis au départ (aggro 13 m, alertés par les tirs), vagues (5 + 3n, 18 vivants max), bonus de vague, trousses de soin et munitions lâchées, sprint avec endurance, caméra par-dessus l'épaule, HUD façon référence (vague/score en haut à gauche, slot d'arme + barres vie/endurance en bas, joystick gauche, bouton de tir rouge + recharger/arme/sprint à droite), pause automatique (onglet masqué, portrait), record local `zs3d_best`.

**Hypothèses non vérifiées (à contrôler sur téléphone)** : les routes droites sont supposées orientées le long de Z (tournées de 90° pour l'axe X) ; la façade des murs est supposée vers +z local ; l'arme est attachée à l'os `Middle1.L` avec la pose du couteau fourni ; l'échelle des personnages est ×1,1 sans normalisation ; le matériau Lambert remplace les matériaux PBR (cartes normales/ORM ignorées).

**Limites connues** : les balles ne sont pas arrêtées par les murs ; maisons pleines (pas d'intérieur) ; pas d'ombres projetées (ombre ronde sous les personnages) ; three.js exige Internet (CDN) ; un seul niveau/carte (graine 1337).
