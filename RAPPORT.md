# RAPPORT — Zombie Survival / Dernier Rempart

> Mémoire du projet. À mettre à jour après chaque étape importante, sans supprimer les infos déjà présentes.
> Dernière mise à jour : 2026-11-27 (soir)

## 0. Deux jeux dans un seul dépôt (une seule branche : `main`)
- **Jeu 2D (v3.1.0)** : canvas pixel art vue de dessus — `index.html`, `js/`, `css/`. Documenté aux sections 1 à 12 ci-dessous. **Depuis la section 14, la page d'accueil à la racine redirige vers le jeu 3D** (le 2D a été retiré de la racine à la demande de l'utilisateur).
- **Jeu 3D (dossier `3d/`)** : survie zombie en 3e personne avec modèles 3D, **à jouer en paysage**. Section 13 (v4 alpha, historique) et **section 14 (v5 « survie », état actuel)** ; structure détaillée dans `3d/plan.md`, lancement dans `3d/README.md`.
- La branche `3d` a été **fusionnée dans `main` le 2026-11-24** (PR n°1) puis **supprimée à la main par l'utilisateur**. Il n'existe plus qu'une branche : `main`. Ne plus jamais créer de branche secondaire sans qu'il le demande.

## 1. Objectif du projet
Jeu web de survie en vue de dessus, pensé **mobile en portrait** (style jeu de tir pixel art) : le joueur affronte des vagues de zombies de plus en plus dures, avec plusieurs armes, des boss et un meilleur score sauvegardé. Jouable au tactile (joystick + bouton de tir) et au clavier/souris.
Dépôt : https://github.com/Deku0019523f/zombie
(v4 : voir section 13 — refonte en vrai jeu d'apocalypse zombie en 3D, modèles fournis par l'utilisateur. v5 : section 14.)

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
- **v4 (dossier `3d/`)** : jeu 3D complet (voir sections 13 et 14), `tests/sim3d.mjs` (tests de la simulation 3D), `tools/obj2glb.py` (convertisseur OBJ→GLB), `assets/models/` (modèles 3D), `assets/README_ASSETS.md`, `assets/ui/` (interface, section 14)

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
- (3D) voir les sections 13 et 14 et `PLAN_RATTRAPAGE.md` : tente, torche, intérieurs Cozy, grenades, etc. (sac à dos / capacité / allumettes / piège à ours / commandes CODM : faits, section 14.1)

## 6. Modifications importantes effectuées
- 2026-10-28 (1) : refonte du fichier HTML unique en projet multifichier (modules ES), correction des bugs, ajout armes/zombies/pickups/vagues/sons/record/FR-EN. Premier push GitHub.
- 2026-10-28 (2) : **refonte visuelle** sur demande (capture de référence : jeu mobile pixel art). Passage du rendu DOM au **canvas**, ajout de `render.js`, `sprites.js`, `effects.js` ; contrôles tactiles remplacés par joystick fixe + bouton de tir rouge à visée auto ; HUD haut ; décor ; tir continu maintenu pour toutes les armes ; unités logiques (arène de 360 px de large, hauteur adaptée à l'écran).

- 2026-10-29 (3) : **v2.2.0 gameplay** (voir section 4) ; nouveaux modules `layout.js`, `stats.js`, `combat.js`, `perks.js` ; `config.js` réécrit (ZOMBIES, AI, THEMES, POWER, GRENADE, COMBO, PERKS) ; collisions décor ; tests étendus.
- 2026-10-29 (4) : **v2.3.0** écran de chargement + menu illustré (image fournie par l'utilisateur, recadrée en `assets/cover.jpg`), titre « Dernier Rempart », `loader.js`, sprites externes optionnels, `MESHY.md`.

- 2026-10-29 (5) : **v2.3.1** outil `tools/render-glb.{html,mjs}`, sprites zombies Meshy générés et testés en jeu (aucune erreur JS).

- v2.4.0 : retrait des sprites Meshy / outil GLB ; refonte `weapons.js` (modes de tir, portée) ; `ui.js` allégé (overlay déplacé dans `screens.js`) ; `startGame(mode, niveau)` ; `waves.js` gère `waveNo` et la victoire de niveau

- v3.0.0 : `state.w/h` désignent désormais le **monde** ; `state.vw/vh` l'écran (rendu, HUD, voiles plein écran) ; la souris est convertie en coordonnées monde (`input.js` ajoute la caméra) ; `resetState(city)` construit le monde ; `waves.js` ne fait rien en ville ; `zombies.js` gère repos / alerte

- 2026-11-23 : l'utilisateur demande de **modifier le jeu de A à Z** en vrai jeu d'apocalypse zombie avec **modèles 3D qu'il fournit**. Décisions : vue 3e personne, mobile d'abord, nouvelle base three.js dans le dossier `3d/`. Packs reçus : Zombie Apocalypse Kit, Medieval Village MegaKit (Standard), pack « survivant », Ultimate Crops Pack, Free Urban Zombie Sprite Sheet (2D, non utilisé). Capture de référence : jeu mobile 3e personne (caméra par-dessus l'épaule, joystick gauche, boutons à droite, barres de vie/endurance et slot d'arme en bas).
- 2026-11-23 : assets allégés pour le mobile (textures du village 4096/2048 → 512 px, normales/ORM supprimées), props OBJ → GLB (`tools/obj2glb.py`), archive livrée à l'utilisateur qui l'a placée dans `assets/`.
- 2026-11-23/24 : **v4.0.0-alpha** écrite en 4 commits sur une branche `3d` : simulation 3D testable, rendu three.js, HUD tactile, mode paysage obligatoire (`orient.js`). Voir section 13.
- 2026-11-24 : **branche `3d` fusionnée dans `main`** (PR n°1, commit de fusion `ead3230`) à la demande de l'utilisateur, qui ne veut qu'une seule branche.
- 2026-11-24/25 : voir **section 14** (v5 survie par une autre session, lot 2 d'assets, plan de rattrapage, P1, interface).
- 2026-11-26 (soir) : **inventaire v2 + boutons + interface sans emoji** (section 14.1, avant-dernière puce).
- 2026-11-27 : **correctif des commandes** (barre du bas intouchable) et **P1 (3/n) piège à ours** (section 14.1).
- 2026-11-27 (suite) : **commandes façon CODM** (saut, accroupi, visée ADS, 2e bouton de tir, sprint automatique au joystick), **style plat des boutons**, nouvelles icônes SVG pleines, et **nouveaux packs d'assets `assets/nouveau/`** (section 14.1, dernières puces).

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
| Les outils GitHub ne transmettent que du texte : PNG/JPG impossibles à pousser | Fichiers binaires (`assets/cover.jpg`, `assets/sprites/*.png`, packs 3D, UI) livrés en archive ; à ajouter via git en local |
| Push GitHub : `add_repo` refusé (compte non lié), `gh` avec token invalide | Push via les outils GitHub connectés (`create_or_update_file` pour initialiser le dépôt vide, puis `push_files`) |
| (3D) Archive Medieval Village en 7 parties : `cat *.zip.00[1-7]` recolle dans l'ordre des préfixes aléatoires, pas des numéros → zip illisible | Recoller partie par partie : `for n in 1..7; cat *zip.00$n` (idem lot 2 : .001/.002 dans l'ordre numérique) |
| (3D) Textures du village : 100 Mo de PNG 2048/4096 px | Couleurs de base réduites à 512 px, normales/ORM remplacées par des images 4x4 (matériaux Lambert) |
| (3D) Pack survivant et cultures : FBX/OBJ/Blend seulement | `tools/obj2glb.py` (couleurs unies) ; structure GLB vérifiée, pas affichée dans un moteur |
| (3D) `glob` Python avec `[Standard]` dans le chemin ne trouve rien (crochets = classe de caractères) | Utiliser `os.listdir` |
| (3D) Test de simulation : file d'attente factice contenant un nombre → `ZOMBIES[1]` indéfini | Les tests mettent `state='intermission'` au lieu de simuler une file |
| (3D) HUD portrait : bloc munitions superposé aux boutons | Déplacé au-dessus du joystick ; puis mode paysage rendu obligatoire |
| (3D) Drive partagé non lisible (Entité introuvable) | L'utilisateur a envoyé les archives directement dans le chat |
| Suppression d'une branche GitHub : aucun outil dédié, `gh api -X DELETE` refusé par le proxy (403) | L'utilisateur l'a supprimée à la main |
| (3D) Page non stylée sur GitHub (`3d/css/style.css` absent de `main`) | Fichier poussé depuis la copie locale |
| (3D) Archive de 39 Mo > limite d'envoi de 30 Mio | Découpée en 3 archives |
| (3D) Pioche (`props/Shovel.glb`) 2× trop grande et mal tenue (lame vers le bas, 3,87 unités) | `fit` par arme (voir section 14) : longueur réelle en m, rotation, point de prise ; l'échelle de la main est mesurée au chargement |
| Clé GitHub (PAT) collée dans le chat | Inutilisable depuis le bac à sable (github.com bloqué), jamais stockée ; l'utilisateur doit la **révoquer** |
| (3D) Boutons ronds du pack (déjà dessinés avec leur pictogramme) + emoji par-dessus = double image ; emoji bleus ⏸ / 🔊 qui jurent | Plus aucun emoji dans l'interface : pause / son / fermer = images du pack seules ; autres boutons = SVG (`assets/ui/icons/`) ; icônes d'objets/armes via `3d/js/icons.js` |
| (3D) Capacité par objet (v5.2) peu lisible, hors modèle des jeux de survie | Remplacée par des **emplacements** avec piles par objet (section 14.1) |
| (3D) `sim.js` ajoute des ressources sans passer par `giveItem` (récolte) | `capInventory()` après coup à chaque tick : le surplus tombe au sol en un tas (`away`) ; pas de réécriture de `sim.js` |
| (3D) Barre du bas (cases 1-3, arme) impossible à toucher : `#lookZone` (z-index 1) la recouvrait ; `#hud > * {pointer-events:none}` désactive aussi les enfants interactifs | `#bottom{z-index:3}` + `pointer-events:auto` explicite sur `#hotbar .slot` / `.hslot` (vérifié avec `elementFromPoint` et des appuis simulés) |
| (3D) Piège : `damageZombie` remet un court étourdissement qui écrasait celui du piège | `stagger` fixé **après** l'appel à `damageZombie` dans `updateTraps` |
| (3D) Modèle `props/BearTrap.glb` inexistant | Le fichier s'appelle `BearTrap_Open.glb` (`BearTrap_Closed.glb` existe aussi, inutilisé) |
| (3D) Boutons tactiles jugés « style dessin » (utilisateur, 2026-11-27) | Style plat façon CODM en fin de `ui-controls.css` (fond translucide rgba(8,10,9,.38), bordure blanche 2 px .55, teinte rouge pour le tir, orange pour `.on/.sel`, `.ico` à 56 % avec ombre portée) + icônes SVG pleines blanches ; `!important` nécessaire pour passer devant `ui-skin.css` |
| (3D) Archive Industrial Kit 55 Mo > 30 Mio | Découpée en 3 archives (+ Tiling fusionné dans l'archive 4) |
| (3D) GLB Kenney modular : `Textures/colormap.png` absent de la première copie (il est dans `Models/GLB format/Textures/`) | Copié dans `assets/nouveau/kenney_modular_buildings/Textures/`, README corrigé, archives 1 et 4 refaites |

## 8. Dépendances installées
Aucune dépendance npm. (`serve` est lancé à la demande par `npm start` via `npx`.)
3D : three.js r160 via CDN jsdelivr (importmap), aucune installation locale. Polices de l'interface : fichiers `.ttf` dans `assets/ui/bunker-exodus/fonts/` (SIL OFL). Bac à sable de dev : pas de réseau pour pip/npm (Playwright/Chromium préinstallés servent aux captures).

## 9. Commandes importantes
```bash
npm start        # serveur local (les modules ES exigent http://, pas file://)
npm test         # test de fumée headless du jeu 2D (6 min de jeu simulées)
npm run test:3d  # tests de la simulation 3D (sans navigateur) = node tests/sim3d.mjs
node tests/p1.mjs   # tests des emplacements d'inventaire et du piège à ours (8 tests, vérifiés localement avec un logic.js factice)
python3 -m http.server 8000   # alternative sans Node
# nouveaux assets : à la racine du dépôt, dézipper les 4 archives nouveau_*.zip (elles créent assets/nouveau/...)
```
Jeu 3D : `http://localhost:3000/` (redirige vers `3d/`) (Internet requis pour three.js). Déploiement possible tel quel sur GitHub Pages (branche `main`, racine).

## 10. Variables d'environnement
Aucune variable d'environnement requise (aucun secret).

Notes de mise au point :
- v2.5.0 : un zombie pouvait rester **coincé entre deux caisses** (bord droit de l'arène) et bloquer la fin de la vague pour toujours → détection d'immobilité dans `zombies.js` (change de côté de contournement, puis rapproche le zombie du centre).
- v2.5.0 : la zone à tenir pouvait bloquer la fin de vague si le joueur l'ignorait → délai maximal (70 s) et zombies envoyés au compte-gouttes pendant l'attente.
- v2.5.0 : `computeStats` renvoie maintenant aussi `syn` (objet) : les tests filtrent les valeurs numériques.
- Environnement : `git push` bloqué par le proxy (403) → envoi via le connecteur GitHub (`push_files`), fichiers texte uniquement.

## 11. État actuel du projet
**Jeu 3D (`3d/`, sur `main`, v5.4.0-survie + commandes CODM)** : voir la section 14. Tests de simulation 3D (`tests/sim3d.mjs`, 22 tests) écrits par l'autre session ; **les dernières modifications n'ont pas toutes été exécutées ici** : le bac à sable n'a ni three.js ni réseau ni copie complète du code. Vérifié localement : la logique des emplacements et du piège (`tests/p1.mjs`, Node) et l'interface (inventaire, HUD, boutons) dans Chromium à 800×360 avec une simulation factice. **Jamais lancé ensemble** : vraie simulation + rendu three.js (y compris saut / accroupi / visée). L'utilisateur teste sur téléphone.

Jeu 2D (ancienne racine, v3.1.0) : mode Ville, campagne, atelier… (sections 4 et 12) ; tests OK à l'époque ; plus servi depuis la racine.

## 12. Prochaines étapes
Voir **section 14.6** (liste à jour). Anciennes idées 2D : intérieurs de bâtiments, cycle jour/nuit, quêtes par zone, boss à l'hôpital ; `assets/cover.jpg` à ajouter à la main ; GitHub Pages.

## 13. Jeu 3D — v4.0.0-alpha (historique, dossier `3d/`)
**Cible** : survie zombie en 3e personne, mobile d'abord, **jouable uniquement en paysage** (écran « tournez votre téléphone » en portrait tactile + verrouillage d'orientation en plein écran quand le navigateur l'autorise ; `3d/js/orient.js`).

**Architecture en deux couches** (détail dans `3d/plan.md`) :
1. Simulation sans three.js ni DOM, testable : `config.js` (tout l'équilibrage), `logic.js` (maths, collisions cercles/boîtes, caméra), `layout.js` (ville : routes en croix, 8 à 16 maisons 8x8 m, épaves, conteneurs, barils, arbres), `sim.js` (joueur, armes, tir assisté, zombies, objets, événements), `survival.js` (v5).
2. Rendu/interface : `assets.js` (GLTFLoader, matériaux Lambert partagés), `world.js` (décor, **fusion des pièces statiques par matériau**), `view.js` (acteurs animés, caméra, objets), `fx.js`, `audio.js` (sons synthétisés), `input.js` (joystick flottant, glisser pour viser, boutons, clavier/souris), `ui.js` (HUD, écrans), `game.js` (boucle), `main.js`, `orient.js`.

La v4 était un jeu à vagues (4 armes débloquées par caisses, score, record). **Elle a été remplacée par la v5 « survie »** (section 14).

**Hypothèses de la v4 à contrôler sur téléphone** : routes orientées le long de Z ; façade des murs vers +z ; arme attachée à l'os `Middle1.L` avec la pose du couteau ; échelle des personnages ×1,1 ; matériaux Lambert (normales/ORM ignorées).

## 14. Jeu 3D — v5 « survie » (état actuel) et suite
### 14.1 Historique 2026-11-24 → 27
- 2026-11-24/25 : l'utilisateur veut **un seul jeu sur `main`** (le 2D est retiré de la racine ; `index.html` racine redirige vers `3d/`). Un autre chantier (autre session) a transformé le jeu en **survie v5.0.0** : départ dans une cabane (couteau + 1 eau), cycle jour/nuit (14 min réelles/jour), faim/soif/saignement, inventaire (bois, pierre, conserve, eau, bandage, munitions), barre rapide 3 emplacements, fouille de points de butin (`LOOT`), récolte au corps à corps (arbres/rochers, pioche pour la pierre), construction sur grille de 2 m (mur bois/pierre, porte, feu de camp), zombies qui voient/entendent, sauvegarde `zs3d_save`, record `zs3d_best`. Code : `survival.js` (mixin greffé sur `Sim.prototype`), `sim.js`, `view.js`, `ui.js`, `game.js`, `layout.js`.
- 2026-11-25 : **lot 2 d'assets** reçu (Cozy Interiors, mobilier FBX, ruines, POLY Lite Survival, post-apocalyptique, armes de mêlée, maisons médiévales…) → rangé dans `assets/` et documenté dans **`assets/README_ASSETS.md`** (tableaux, axes/échelles, conversion, licences, usage dans le jeu). Livré en 3 archives (≤ 30 Mio) ; l'utilisateur les a placées dans le dépôt.
- 2026-11-25 : **`PLAN_RATTRAPAGE.md`** (racine) : P0 vérifications, **P1 gains rapides avec assets déjà en GLB**, P2 intérieurs Cozy, P3 conversion post-apo/mêlée, P4 assets Blender seuls, P5 fonctions du jeu de référence (viser, survivants, chien, rampants, véhicules). L'utilisateur a testé P0 lui-même.
- 2026-11-26 : **P1 (1/n) — armes de mêlée** : `config.js` v5.1.0. Nouveau champ `fit` par arme (`len` m, `rot` degrés, `grip` unités du modèle depuis le bout du manche) ; `view.js` (`handScale()`, `fitTool()`) mesure l'échelle réelle de l'os de la main et en déduit l'échelle du modèle. **Pioche corrigée** (1,05 m, manche tenu près de la poignée en D, lame vers l'avant). Nouvelles armes : **guitare** (0,8 m, bruit 16 m), **batte à clous** (0,85 m, 55 dégâts), **lance** (1,7 m, portée 2,7 m, discrète) ; ajoutées à `WEAPON_ORDER` et au butin des maisons/conteneurs. Hache et armes à feu : réglage inchangé. Mesures utiles (unités du modèle) : Axe 1,3 (z −0,26…1,04, tête côté +Z) · Spear 2,01 · Barbed 1,24 · Guitar 1,8 (corps côté −Y) · Shovel 3,87 (lame côté −Y, poignée +1,79) · Backpack 3,3×3,1×1,75 · Tent 14,6×10,3×24,9 · Torch 2,5 · BearTrap 3×0,7×3,5 · WoodLog 3,8 · Matchbox 0,5×1,1 (les GLB `props/` sont en grandes unités : toujours normaliser).
- 2026-11-26 : **interface** : packs « Bunker Exodus FREE UI Starter » et « UI survival » reçus → `assets/ui/` (+ `assets/ui/README_UI.md`). Habillage dans **`3d/css/ui-skin.css`** (chargé après `style.css`, couleurs de repli si image absente) : cadres de panneaux, cases de la barre rapide + icônes (`icons-64`), boutons ronds, boutons des écrans, polices Barlow Condensed / IBM Plex Mono. `index.html` : lien CSS + icônes `<img>` dans la barre rapide.
- 2026-11-26 (2) **P1 (2/n)** : allumettes (`match`, boîte `Matchbox.glb`, nécessaires au feu de camp : `PIECES.fire.cost = {wood:3, match:1}`), bûches visibles au sol (`WoodLog.glb`), **sac à dos** (`Backpack.glb` visible dans le dos via `BACKPACK_VIEW`, trouvable dans le butin).
- 2026-11-26 (soir) **Inventaire v2 + boutons + interface sans emoji** (config 5.3.0) :
  - **Emplacements** (`SURVIVAL.slots = {base: 8, bag: 20}`) : chaque objet empilable (`ITEMS[id].stack` : bois 5, pierre 4, conserve 2, eau 2, bandage 3, allumette 5) occupe `ceil(n/pile)` cases ; **munitions** = pochette à part (pas de place) ; sac à dos = 20 cases. Le surplus (récolte, fouille) tombe au sol en **un seul tas** (`pk.n`, `pk.away` : on ne le reprend qu'après s'être éloigné). Fonctions `survival.js` : `slotsMax/slotsUsed/slotsOf/room/bagCells/capInventory/dropItem/nearbyPickups/takePickup/updatePickups (remplace celle de sim.js)/equip/useItem`. Événements nouveaux : `drop`, `pickup {n}`.
  - **Écran d'inventaire** (`3d/js/inventory.js`, `3d/css/ui-inventory.css`, bouton sac en haut à droite, touche I/Tab, Échap ferme) : 3 colonnes **Au sol** (ramasser) / **Équipement** (armes, équiper, sac) / **Sac** (grille de cases avec quantité, pochette de munitions) ; barre du bas : description + Utiliser / Jeter 1 / Tout / Ramasser / Équiper. **Le monde est figé** tant qu'il est ouvert.
  - **Boutons** : zones tactiles élargies de 7 px (`::after`), retour immédiat (enfoncé, vibration 8 ms), disposition en arc de pouce autour du bouton d'action (tailles 52–58 px, 100 px pour l'action), **sprint verrouillable** (un toucher = on court, second toucher ou lâcher le joystick = stop, halo orange), Utiliser/Recharger partagent la même place, cases de la barre rapide éteintes si l'objet manque, HUD haut-gauche : sac `x/y`, bois, pierre, allumettes, munitions.
  - **Plus aucun emoji dans l'interface** (demande de l'utilisateur) : pause / son / muet / fermer = images du pack UI survival ; icônes d'objets et d'armes = **images** via `3d/js/icons.js` (pack : couteau, arme, balles, trousse, conserve, bidon ; sinon **SVG dessinés** dans `assets/ui/icons/` : sac, marteau, échange, sprint, recharger, main, flamme, bois, pierre, porte, sang, soleil, lune, batte, batte à clous, guitare, lance, hache, pioche, fusil, jeter, allumette, piège). Les anciens champs `icon` emoji ont été retirés des données… **sauf dans `config.js` poussé** (WEAPONS / ITEMS gardent des `icon` emoji, plus affichés nulle part : à nettoyer).
  - Vérifié dans Chromium (800×360, DPR 2) avec une simulation factice : HUD, inventaire, actions (jeter 1 / ramasser). **Pas testé** avec la vraie simulation ni three.js.
- 2026-11-27 **Commandes revues** (demande : boutons inutiles ou non fonctionnels, s'inspirer des jeux du genre) : retrait des boutons ⇄ (changer d'arme) et mute du HUD (le son est dans la pause `#btnSound`, l'arme se change en touchant la case d'arme du bas ou X/molette) ; `#bottom{z-index:3}` corrige la barre du bas intouchable ; nouvelle feuille **`3d/css/ui-controls.css`** (chargée en dernier) ; bouton Utiliser contextuel (main + libellé) ; Recharger visible seulement avec une arme à feu ; touches 1-3 = objets rapides, 1-5 = pièces en mode construction.
- 2026-11-27 **P1 (3/n) — piège à ours** (config 5.4.0) : 5e pièce de construction `PIECES.trap` (bois/pierre, `PIECE_ORDER` : wall, stone, door, fire, trap ; `SURVIVAL.trapDmg/trapStun/trapR`). `survival.js` : `addPiece` sans collision pour le piège (`col.off`), `computeGhost` en mode « point » (grille 0,5 m, comme le feu), `updateTraps()` appelée par `updateFires` : un zombie dans le rayon prend `trapDmg` et reste étourdi `trapStun` s, événement `trap`, le piège se casse après `hp` déclenchements (`pieceBreak`). `view.js` : modèle `props/BearTrap_Open.glb` à l'échelle 0,27 (≈ 0,8 m), fantôme cylindrique, éclaboussure sur `trap`. `game.js` : préchargement + bannière « Piège déclenché ». `index.html` : 5e bouton de construction (`trap.svg`). `input.js` : `Digit[1-5]`. Test dans `tests/p1.mjs` (8 tests OK en local, avec logic.js factice). **Non testé avec la vraie simulation ni three.js.** Modèle « fermé » (`BearTrap_Closed.glb`) non utilisé.
- 2026-11-27 (suite) **Commandes façon CODM** (demande : s'inspirer de Call of Duty Mobile, ajouter courir / sauter, etc.) :
  - `sim.js` : constante `MOVE = { jumpV: 5.4, grav: 16, jumpCost: 12, crouchSpeed: 0.55, adsSpeed: 0.7, crouchDrop: 0.45, crouchSight: 0.6, crouchHear: 0.5, dodgeY: 0.5 }` ; champs joueur `y, vy, crouch, ads` ; entrées `inp.jump / inp.crouch / inp.ads` (bascules à impulsion envoyées par `input.js`).
  - **Saut** : au sol, endurance ≥ 12 (coût 12), pas en mode construction ; événements `jump` / `land` (bruit d'atterrissage rayon 6). Les attaques de mêlée des zombies ne touchent que si `P.y < dodgeY` (sauter = esquiver). Dispersion ×1,8 en l'air. Le saut **n'escalade pas** les obstacles.
  - **Accroupi** (toggle) : vitesse ×0,55, vue des zombies ×0,6, ouïe ×0,5, dispersion ×0,7, caméra abaissée de 0,45. Le sprint annule l'accroupi.
  - **Visée (ADS)** (toggle, clic droit) : dispersion ×0,5, recul ×0,7, vitesse ×0,7, le corps suit le lacet ; désactive le sprint ; zoom du champ de vision ×0,72 dans `view.js` (`baseFov/zoom`) ; bouton caché avec une arme de mêlée.
  - `view.js` : racine du joueur à `y = P.y`, écrasement `scale.y` → 0,8 accroupi (pas de vraie animation) ; la caméra (getter) décale position/pivot de `P.y − (crouch ? crouchDrop : 0)` ; bouche du canon ajustée.
  - `input.js` : joystick gauche flottant ; **sprint automatique** quand on pousse le stick au-delà de `R×1,35` (verrou `setSprint(true)`, relâché avec le stick) ; glisser à droite = viser ; boutons `#btnFire` (droite), `#btnFire2` (2e bouton de tir à gauche, même appui maintenu avec visée au glisser), `#btnJump`, `#btnCrouch`, `#btnAds`, `#btnReload`, `#btnSprint` (verrou), `#btnUse` contextuel, haut-droite `btnInv/btnBuild/btnPause`, barre rapide 1-3 ; toucher `#slotAmmo` = arme suivante. **Clavier** : ZQSD/WASD, Espace = saut, C / Ctrl gauche = accroupi, clic droit = viser, Maj = sprint, E/F = utiliser, B = construire, I/Tab = inventaire, R = recharger, X = arme suivante, Échap/P = pause, 1-5, molette = changer d'arme. **Tir = clic gauche / boutons (Espace ne tire plus).** `ui.js` : `.on` sur accroupi/visée d'après `P.crouch/P.ads`. `index.html` : aide mise à jour.
  - Disposition (hauteur ≤ 430 px, px CSS) : tir right18/bottom20 (92 px) · saut right32/bottom122 (54) · visée right122/bottom106 · utiliser right122/bottom38 (58) · recharger right188/bottom24 · accroupi right188/bottom82 · sprint left22/bottom152 · tir 2 left84/bottom152 ; variantes `@media (min-height:431px)`.
  - **Style plat** (retour utilisateur « le style dessin là, je ne veux pas ») : bloc de fin de `ui-controls.css` avec `!important` (voir section 7) ; icônes SVG **pleines blanches** `jump, crouch, sprint, scope, reload, hand, hammer, backpack` dans `assets/ui/icons/` ; `#btnPause::before` = deux barres.
  - Vérifié uniquement par captures Chromium (simulation factice). **Pas testé avec la vraie simulation ni three.js.** Pas de son de saut / d'atterrissage ni d'animation d'accroupi pour l'instant.
- 2026-11-27 (soir) **Nouveaux assets → `assets/nouveau/`** (demande : « place ça dans assets/nouveau et n'oublie pas son readme qui explique chaque modèle »). 10 archives reçues, rangées et documentées dans **`assets/nouveau/README.md`** (32 Ko : tableau des licences, arborescence, conseils d'usage, une section par pack avec **chaque modèle et ses dimensions L×H×P mesurées en m**, notes techniques ; ≈ 110 Mo au total, **rien n'est encore chargé dans le jeu**). Packs : `kenney_modular_buildings` (108 GLB + `Textures/colormap.png` + variations a/b), `kenney_city_suburban` (36 GLB), `quaternius_ultimate_nature` (150 FBX), `modular_terrain` (304 OBJ + mtl), `psx_buildings` (FBX + PNG), `cenji_urban_props` (120 GLB), `cenji_winter_nature` (100 GLB), `abandoned_industrial_kit` (échantillon : GLB, textures ORM, `Textures/Tiling`, props). Livraison en **4 archives ≤ 30 Mio** (le dépôt n'accepte que du texte via les outils GitHub) : `nouveau_1_cenji_urban_winter_readme.zip` (contient le README), `nouveau_2_industrial_glb_orm_trims.zip`, `nouveau_3_industrial_textures_props.zip`, `nouveau_4_kenney_nature_terrain_psx_industrial_tiling.zip` → **à dézipper toutes à la racine du dépôt** (elles créent `assets/nouveau/…`) puis `git add`/commit/push en local.
  - **Licences** : Kenney et Quaternius = CC0 ; **Cenji = pas de redistribution des fichiers bruts** ; **Abandoned Industrial Kit (échantillon) = pas de revente / partage / entraînement IA** ; Modular Terrain et PSX Buildings : **aucune licence fournie**. → Si le dépôt est public, ne publier que Kenney + Quaternius ; garder Cenji / Industrial / sans licence hors dépôt (ou dépôt privé).

### 14.2 Fichiers 3D (état)
`3d/index.html`, `3d/css/style.css`, `3d/css/ui-skin.css`, `3d/css/ui-inventory.css`, `3d/css/ui-controls.css`, `3d/js/{config,logic,layout,sim,survival,assets,world,view,fx,audio,input,ui,game,main,orient,inventory,icons}.js`, `3d/plan.md`, `3d/README.md`, `tests/sim3d.mjs`, `tests/p1.mjs`, `tools/obj2glb.py`, `assets/models/**`, `assets/ui/**` (dont `assets/ui/icons/*.svg`), `assets/nouveau/**` (README + packs, à ajouter à la main), `assets/README_ASSETS.md`, `PLAN_RATTRAPAGE.md`.

### 14.3 Événements de la simulation
`shot, hit, kill, hurt, death, gameover, reload, reloaded, empty, swap, recoil, swing, chop, treeFelled, rockGone, loot, pickup, pickupAdd, use, build, buildMode, door, pieceHit, pieceBreak, tip, phase, drop, trap, jump, land`. Les armes se déclarent dans `WEAPONS` ; `WEAPON_ORDER` fixe l'ordre de changement et le préchargement ; le butin (`LOOT`) accepte un id d'arme. Ordre de `Sim.update` : tickClock, updateBuildMode, updatePlayer, updateWeapon, updateInteract, updateItems, updateNeeds, updateZombies, updatePickups, updatePopulation, updateFires (appelle updateTraps), updateLootRespawn.

### 14.4 Limites / à vérifier sur téléphone
- Taille et prise de la pioche, de la lance, de la batte à clous et de la guitare (réglages `fit` dans `config.js`).
- Inventaire : lisibilité, taille des cases (44 px), défilement des listes ; boutons : emplacement de chacun sous le pouce (disposition CODM à valider : saut/accroupi/visée/tir 2) ; icônes SVG (à juger à l'œil). Le libellé « Fouiller » déborde un peu sur les boutons voisins.
- Saut / accroupi / visée : valeurs `MOVE` à régler en jeu ; pas de son de saut/atterrissage, pas d'animation d'accroupi (simple écrasement) ; le saut n'enjambe pas les obstacles ; sprint automatique au joystick à valider (seuil `R×1,35`).
- Piège à ours : échelle du modèle (0,27) et dégâts/étourdissement/rayon (`SURVIVAL.trap*`) à régler en jeu ; le 5e bouton de construction doit tenir dans la barre à 800×360 (vu OK en capture avec une simulation factice).
- Les tests `npm run test:3d` doivent être relancés par l'utilisateur ; `tests/p1.mjs` aussi. `tests/sim3d.mjs` peut contenir des assertions sur l'ancien comportement du ramassage (`updatePickups` de `sim.js`, désormais remplacé par celui de `survival.js`) ; ajouter des tests pour jump/crouch/ADS (`P.y`, `P.vy`, immunité mêlée en l'air).
- `ui.js` n'utilise plus `sim.capOf` ; si un autre fichier l'appelle encore, erreur à signaler.
- Licences : Bunker Exodus interdit de redistribuer les fichiers comme pack (dépôt public = à voir) ; UI survival : licence inconnue ; lot 2 : voir `assets/README_ASSETS.md` ; **nouveau lot : voir 14.1 (Cenji, Industrial Kit, Modular Terrain, PSX)**.
- Ménage restant : fichiers « 5 » parasites (`assets/textures/5`, `assets/models/vegetation/5`), doublons à la racine (`README_ASSETS.md`, `obj2glb.py`), `assets/README_ASSETS.md` qui cite encore une seule archive (et ne mentionne pas `assets/nouveau/`) ; emojis `icon` restants dans `config.js`.
- Captures de l'utilisateur (2026-11-26) : arbres penchés (bug corrigé dans `world.js` `restoreTree`, sans doute cache navigateur), herbe sombre/pointue, textures de murs étirées, couteau invisible en main, caméra qui traverse les murs de la cabane : à traiter (P1/P2).

### 14.5 Décisions de l'utilisateur en attente
Ordre P0→P1→P2 ; garder `assets/sources/` public ou non ; style moderne (Cozy) ou médiéval pour les intérieurs ; intérieurs avant armes/objets ; garder les barres CSS (HP/endurance) ou utiliser les cadres de barre de vie du pack UI survival ; **dépôt public ou privé** (conditionne l'ajout de `assets/nouveau/` : Cenji / Industrial / packs sans licence).

### 14.6 Prochaines étapes
1. P1 suite : tente (`Tent.glb`), torche en main la nuit (`Torch`/`WoodenTorch.glb`, il existe déjà une PointLight de nuit), nourriture variée (cultures), armes à feu variées (props Revolver/Shotgun/Pistol…), objets lançables (attention : `noise()` fait poursuivre le joueur, à concevoir), décor (sang, palettes, barrières, panneaux). Penser : `addCircle` de `layout.js` ajoute `.gltf` (les `.glb` demandent une variante) ; tout nouveau modèle doit être préchargé (`game.js`) et couvert par un test d'existence (`tests/assets.mjs`). (Fait : mêlée, allumettes, sac, emplacements, piège à ours, commandes CODM.)
2. Sons de saut / atterrissage (`audio.js`, événements `jump`/`land`), animation d'accroupi, saut qui enjambe les obstacles bas (optionnel).
3. Corriger les défauts vus sur les captures (herbe, murs, couteau, caméra dans la cabane).
4. Utiliser les packs `assets/nouveau/` (Kenney modular buildings / city suburban pour les bâtiments, Quaternius nature pour l'herbe et les arbres) : convertir FBX/OBJ en GLB, normaliser les échelles (voir README du dossier), précharger, tester.
5. P2 intérieurs Cozy (palette 8×8, NearestFilter, LOD), P3 conversion post-apo/mêlée, P4 Blender, P5 jeu de référence.
6. Mettre à jour `3d/plan.md` (fait pour `inventory.js`, `icons.js`, `ui-inventory.css`, `ui-controls.css`, piège, CODM) et `assets/README_ASSETS.md` (renvoyer vers `assets/nouveau/README.md`) à chaque étape ; ménage (fichiers « 5 », doublons racine, emojis `config.js`) ; rappeler à l'utilisateur de **révoquer le PAT** et de lancer `npm test`, `node tests/p1.mjs`, `npm run test:3d`.
