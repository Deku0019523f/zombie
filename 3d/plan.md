# plan.md — Dernier Rempart 3D (dossier `3d/`)

Structure détaillée du jeu 3D. Le jeu 2D historique (racine du dépôt, `js/`, `index.html`) a été retiré ; voir `../plan.md`.

## REFONTE « SURVIE » (v5.0) — décision du 2026-11-24
L'utilisateur ne veut **pas** un jeu de vagues mais un **jeu de survivant d'apocalypse** (références : Apocalypse Survival, jeux mobiles de survie avec inventaire). Exigences :
1. Début de partie **dans une cabane**, avec le **strict minimum** (un couteau, 1 bouteille d'eau ; une caisse dans la cabane : 1 conserve + 1 bandage).
2. Pouvoir **créer des abris** pour se protéger (récolter du bois, poser murs / portes / feu de camp ; les zombies attaquent les constructions).
3. Plus de vagues, de score ni de « restants » : on survit jour après jour jusqu'à la mort.

### Liste des modifications (état : [x] fait · [ ] à faire)
**Étape 1 — socle survie**
- [x] Suppression des vagues (`WAVE`, `startWave`, bannières, « restants », score). Partie continue ; la mort affiche jours survécus + zombies tués.
- [x] Cabane de départ 6 x 6 m dans une clairière au sud-ouest de la carte (murs statiques + toit + lit + caisse), **porte fermée** (pièce destructible) ; le joueur apparaît à l'intérieur, face à la porte.
- [x] Équipement de départ minimal : couteau (mêlée), 1 eau. Plus d'arme à feu au départ.
- [x] Zombies dispersés (12 le jour, 36 la nuit depuis le correctif du 2026-11-26) : au repos ou en errance, repèrent le joueur selon la vue et le bruit (course = bruyant, immobile = discret), perdent sa trace s'il s'éloigne ; réapparition hors de vue.
- [x] Cycle jour / nuit (1 jour = 14 min réelles) : ciel, brume, lumière ; lampe du joueur la nuit ; plus de zombies la nuit.
- [x] Les balles et les coups sont arrêtés par les murs (maisons, abris) ; la caméra ne traverse plus les murs.
**Étape 2 — besoins**
- [x] Faim et soif (barres), perte de PV à zéro ; saignement après une morsure (bandage pour l'arrêter) ; régénération lente si bien nourri.
**Étape 3 — inventaire et fouille**
- [x] Inventaire par compteurs (bois, conserve, eau, bandage, munitions) + barre rapide de 3 emplacements (bandage / conserve / eau) comme sur les références.
- [x] Fouille des points de butin (porches de maisons, conteneurs, épaves, barils, sacs-poubelle, caisses) : butin aléatoire, se remplit à nouveau après un moment.
- [x] Armes trouvées : hache, bâtte, pistolet (rare, bruyant, munitions limitées). Mêlée par défaut.
**Étape 4 — abris et construction**
- [x] Récolte du bois : frapper les arbres (couteau / hache) ; un arbre s'épuise et devient souche.
- [x] Récolte de pierre : casser les rochers avec une pioche (la pioche est dans le coffre à outils, près de la cabane) ; 1 coup = pierre.
- [x] Mode construction (bouton marteau) : mur en bois (2 bois), mur en pierre (3 pierres), porte (3 bois), feu de camp (3 bois), aimantés sur une grille de 2 m ; aperçu vert / rouge.
- [x] Mur en pierre (3 pierres, 360 PV) : dure 3 fois plus longtemps que le mur en bois (120 PV).
- [x] Les constructions ont des PV ; les zombies bloqués les attaquent ; une pièce détruite disparaît. Portes ouvrables / fermables (bouton Utiliser).
- [x] Feu de camp : lumière et soin lent à proximité.
**Limites actuelles / Étape 5 — à venir** (pas de grille d'inventaire, pas d'intérieurs dans les maisons du village — sauvegarde automatique à la place du lit) : armes à usure, objets à lancer (distraction), réparation des murs, établi.
**Étape 6 — à venir** : intérieurs de maisons, véhicules, survivants, sauvegarde multi-emplacements.
- [x] Sauvegarde automatique (localStorage `zs3d_save`) : position, besoins, inventaire, constructions, arbres coupés, butin fouillé, heure. Bouton CONTINUER.

### Vrais modèles du dossier `assets` (2026-11-26) — demande d'Alec : des modèles, pas du code
- [x] **Cabane meublée** avec `assets/models/interiors` (Cozy Interiors, GLB) : lit simple, table de chevet, armoire, table + chaise de cuisine, tapis, lampe sur pied (vraie lumière ponctuelle). Chaque meuble a son collider ; la porte reste dégagée. `assets.js` : `paletteMat()` applique la palette PNG 8x8 (`NearestFilter`, sans mipmaps ; matériau « Emissive » = lampe, « Glass » = verre).
- [x] **Maisons du village** = vraies maisons du pack `assets/sources/medieval_houses/House_Full_ordinar` (FBX, 6 modèles : 01, 02, 03, 05, 06, 11), à la place des maisons assemblées par le code. `assets.js` : `loadFbx()` (FBXLoader, centimètres → mètres × 0,01, centré en x/z, posé sur y = 0) + atlas de couleurs 64x64 `Texture/House_texture_atlas.png` ; `layout.js` : `HOUSE_TYPES` (dimensions mesurées) → collider à la taille réelle, façade tournée vers la route. `housePieces()` n'est plus utilisée.
- [x] Cabane de départ : les deux pignons du toit étaient ouverts (triangle vide) ; bouchés par un triangle d'enduit (`gablesAt()` dans `world.js`).
- [x] Plus d'herbe décorative à l'intérieur de la cabane.
- Pas de modèle d'arbre dans `assets` (seulement `PalmTree_Crop` et un buisson) : les arbres restent des cylindres + cônes instanciés. À remplacer si un pack d'arbres est ajouté.

### Correctifs du 2026-11-26
- [x] **Arbres penchés** : `restoreTree` / `fellTree` réutilisaient l'objet `d` dont la rotation x/z venait des rochers (`rotation.set(i*0.7, i*2.1, i*0.4)`) ; les arbres, redessinés au démarrage par `syncWorld`, restaient inclinés. Rotation remise à `(0, i*1.7, 0)`.
- [x] 404 au chargement : les FBX cherchaient `House_texture_atlas.png` à côté d'eux ; `LoadingManager.setURLModifier` les renvoie vers `Texture/`.
- [x] Équilibrage : 24 zombies au départ et 26 le jour avec un simple couteau étaient trop ; `popStart` 12, `popDay` 12, `popNight` 36.
- [ ] Reste à traiter : barre d'objets qui cache les jambes du joueur, trous (fenêtres sans vitre) dans les murs de la cabane, couteau un peu flottant dans la main.

### Fichiers touchés / ajoutés
- `config.js` : + `SURVIVAL`, `ITEMS`, `PIECES`, `LOOT`, armes de mêlée ; − `WAVE`.
- `layout.js` : + cabane (`cabin`, `spawn`), `lootSpots`, arbres avec leur collider.
- `logic.js` : + `rayBoxes` / `blockedBetween` / `distToBox` (rayon contre boîtes : balles, coups, vue, caméra).
- `sim.js` : cœur (joueur, mêlée / tir, zombies). `survival.js` (nouveau) : temps, besoins, inventaire, butin, construction, sauvegarde (greffé sur `Sim`).
- `world.js` : cabane, ciel / lumières pilotés par l'heure, arbres abattables. `view.js` : pièces construites, aperçu, lampe, animations de mêlée.
- `ui.js`, `input.js`, `index.html`, `css/style.css` : HUD survie, bouton Utiliser, mode construction, barre rapide.
- `audio.js` : coups, abattage, construction, porte, manger / boire / bandage.
- `tests/sim3d.mjs` : tests adaptés + nouveaux tests (cabane, besoins, butin, construction, zombies contre murs, sauvegarde).

## Principe d'architecture
Deux couches strictement séparées :
1. **Simulation** (`config`, `logic`, `layout`, `sim`, `survival`) : aucune dépendance à three.js ni au DOM → testable sous Node (`npm run test:3d`).
2. **Rendu / interface** (`assets`, `world`, `view`, `fx`, `audio`, `input`, `ui`, `game`, `main`) : lit l'état de la simulation, consomme ses événements (`sim.drain()`), n'écrit jamais dedans.

La simulation émet des événements `{type, ...}` : `shot, hit, kill, hurt, death, gameover, reload, reloaded, empty, swap, recoil, swing, chop, treeFelled, rockGone, loot, pickup, pickupAdd, use, build, buildMode, door, pieceHit, pieceBreak, tip, phase`.

## Arborescence
```
3d/
  index.html            importmap three@0.160.0 (CDN jsdelivr), canvas, HUD, écrans
  css/style.css         HUD mobile (paysage + portrait), écrans
  js/
    config.js           TOUT l'équilibrage : caméra, joueur, armes, zombies, survie, constructions, butin, position de l'arme en main
    logic.js            maths pures : raySphere, rayBoxes, pushOut (cercles + boîtes), cameraRig, rng, angles
    layout.js           plan de la ville (routes en croix, maisons FBX, épaves, conteneurs, arbres, rochers, cabane meublée) + colliders
    sim.js              classe Sim : joueur, mêlée / tir, zombies (IA), population, objets lâchés
    survival.js         (mixin de Sim) horloge jour/nuit, besoins, inventaire, fouille, construction, sauvegarde
    assets.js           GLTFLoader + FBXLoader, palette des meubles, atlas des maisons, matériaux Lambert partagés, instance() (SkeletonUtils.clone), placeholder()
    world.js            sol, ciel, brume, lumières, assemblage + FUSION des pièces statiques par matériau, arbres instanciés, enceinte
    view.js             classe View : renderer, caméra, acteurs animés (joueur, zombies), objets, constructions, effets, rendu
    fx.js               traînées de balles, lueur de bouche, sang (pools)
    audio.js            sons synthétisés WebAudio
    input.js            joystick flottant, glisser pour viser, boutons, clavier/souris
    ui.js               HUD + écrans (menu, pause, game over)
    game.js             boot, boucle principale, branchement sim ↔ vue ↔ UI ↔ sons, sauvegarde et record (localStorage)
    main.js             point d'entrée
tests/sim3d.mjs         22 tests de la simulation ; tests/p1.mjs : 8 tests (capacité, sac à dos, allumettes, butin, modèles)
tools/obj2glb.py        convertisseur OBJ+MTL → GLB (props du pack survivant, végétation)
assets/models/          characters, weapons, vehicles, environment, village, props, vegetation, interiors (CC0 Quaternius / Cozy Interiors)
assets/sources/         household_fbx, medieval_houses (FBX, chargés au démarrage), post_apocalyptic (OBJ), melee_weapons, …
```

## Modèles utilisés (chemins sous `assets/models/`, sauf `sources/` sous `assets/`)
- Joueur : `characters/Characters_Matt_SingleWeapon.gltf` (anims `Idle, Idle_Gun, Walk, Walk_Gun, Run, Run_Gun, Slash, Stab, Death`), arme attachée à l'os `Middle1.L` avec la pose du couteau fourni.
- Zombies : `Zombie_Basic`, `Zombie_Arm` (rapide), `Zombie_Ribcage` (très rapide, fragile), `Zombie_Chubby` (lent, costaud). Anims : `Idle, Walk, Run, Idle_Attack/Run_Attack/Punch, HitReact, Death`.
- Armes : `weapons/Axe, Pistol, Shotgun, SMG, Rifle` ; bâtte et couteau sont déjà dans le modèle du joueur.
- Ville : `environment/Street_*`, `vehicles/*`, `environment/*` (barils, conteneurs, lampadaires…), `village/*` (clôture d'enceinte, pièces de la cabane), maisons : `sources/medieval_houses/House_Full_ordinar/*.fbx`.
- Objets ramassables : `props/Bandages.glb`, `props/Can_Closed.glb`, `props/WaterBottle_1.glb`. Construction : `village/Prop_WoodenFence_Single` (mur bois), `village/Wall_UnevenBrick_Straight` (mur pierre), `village/Door_1_Flat`, `props/Bonfire` + `Bonfire_Fire`. Outils : `weapons/Axe`, `props/Shovel` (pioche). Cabane : `Wall_Plaster_*`, `Floor_WoodDark`, `Roof_RoundTiles_6x6`, `environment/Chest`, meubles `interiors/*`.
- Pistes non exploitées : Tent, Torch, Radio, GasCan, BearTrap, revolvers et fusils de `assets/models/props` ; armes de mêlée et ruines de `assets/sources` (voir `assets/README_ASSETS.md`).

## Boucle de jeu
(Ancienne boucle par vagues : supprimée par la refonte survie, voir ci-dessus.)
Nouvelle boucle : Menu (NOUVELLE PARTIE / CONTINUER) → départ dans la cabane → fouiller, récolter, construire, se battre, manger / boire → jours et nuits qui passent → mort → game over (jours survécus, zombies tués ; record de jours).

## Formules utiles
- Orientation : yaw 0 = regard vers +Z ; direction `(sin yaw, cos yaw)` ; droite `(-cos yaw, sin yaw)` ; glisser vers la droite = `yaw` diminue.
- Tir : rayon caméra → visée assistée (cône 0,17 rad) → direction muzzle→cible + dispersion → touche 3 sphères par zombie (tête ×2,2, torse, jambes).
