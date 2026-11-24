# plan.md — Dernier Rempart 3D (dossier `3d/`)

Structure détaillée du jeu 3D. Le jeu 2D historique (racine du dépôt, `js/`, `index.html`) a été retiré ; voir `../plan.md`.

## REFONTE « SURVIE » (v5.0) — décision du 2026-11-24
L'utilisateur ne veut **pas** un jeu de vagues mais un **jeu de survivant d'apocalypse** (références : Apocalypse Survival, jeux mobiles de survie avec inventaire). Exigences :
1. Début de partie **dans une cabane**, avec le **strict minimum** (un couteau, 1 bouteille d'eau ; une caisse dans la cabane : 1 conserve + 1 bandage).
2. Pouvoir **créer des abris** pour se protéger (récolter du bois, poser murs / portes / feu de camp ; les zombies attaquent les constructions).
3. Plus de vagues, de score ni de « restants » : on survit jour après jour jusqu'à la mort.

### Liste des modifications (état : [x] fait · [ ] à faire)
**Étape 1 — socle survie**
- [ ] Suppression des vagues (`WAVE`, `startWave`, bannières, « restants », score). Partie continue ; la mort affiche jours survécus + zombies tués.
- [ ] Cabane de départ 6 x 6 m dans une clairière au sud-ouest de la carte (murs statiques + toit + lit + caisse), **porte fermée** (pièce destructible) ; le joueur apparaît à l'intérieur, face à la porte.
- [ ] Équipement de départ minimal : couteau (mêlée), 1 eau. Plus d'arme à feu au départ.
- [ ] Zombies dispersés (≈ 30 le jour, 40 la nuit) : au repos ou en errance, repèrent le joueur selon la vue et le bruit (course = bruyant, immobile = discret), perdent sa trace s'il s'éloigne ; réapparition hors de vue.
- [ ] Cycle jour / nuit (1 jour = 14 min réelles) : ciel, brume, lumière ; lampe du joueur la nuit ; plus de zombies la nuit.
- [ ] Les balles et les coups sont arrêtés par les murs (maisons, abris) ; la caméra ne traverse plus les murs.
**Étape 2 — besoins**
- [ ] Faim et soif (barres), perte de PV à zéro ; saignement après une morsure (bandage pour l'arrêter) ; régénération lente si bien nourri.
**Étape 3 — inventaire et fouille**
- [ ] Inventaire par compteurs (bois, conserve, eau, bandage, munitions) + barre rapide de 3 emplacements (bandage / conserve / eau) comme sur les références.
- [ ] Fouille des points de butin (porches de maisons, conteneurs, épaves, barils, sacs-poubelle, caisses) : butin aléatoire, se remplit à nouveau après un moment.
- [ ] Armes trouvées : hache, batte, pistolet (rare, bruyant, munitions limitées). Mêlée par défaut.
**Étape 4 — abris et construction**
- [ ] Récolte du bois : frapper les arbres (couteau / hache) ; un arbre s'épuise et devient souche.
- [ ] Mode construction (bouton marteau) : mur (2 bois), porte (3 bois), feu de camp (3 bois), aimantés sur une grille de 2 m ; aperçu vert / rouge.
- [ ] Les constructions ont des PV ; les zombies bloqués les attaquent ; une pièce détruite disparaît. Portes ouvrables / fermables (bouton Utiliser).
- [ ] Feu de camp : lumière et soin lent à proximité.
**Étape 5 — à venir** : armes à usure, objets à lancer (distraction), réparation des murs, établi, sac à dos (capacité).
**Étape 6 — à venir** : intérieurs de maisons, véhicules, survivants, sauvegarde multi-emplacements.
- [ ] Sauvegarde automatique (localStorage `zs3d_save`) : position, besoins, inventaire, constructions, arbres coupés, butin fouillé, heure. Bouton CONTINUER.

### Fichiers touchés / ajoutés
- `config.js` : + `SURVIVAL`, `ITEMS`, `PIECES`, `LOOT`, armes de mêlée ; − `WAVE`.
- `layout.js` : + cabane (`cabin`, `spawn`), `lootSpots`, arbres avec leur collider.
- `logic.js` : + `segBox` / `segBlocked` (rayon contre boîtes, balles, coups, vue, caméra).
- `sim.js` : cœur (joueur, mêlée / tir, zombies). `survival.js` (nouveau) : temps, besoins, inventaire, butin, construction, sauvegarde (greffé sur `Sim`).
- `world.js` : cabane, ciel / lumières pilotés par l'heure, arbres abattables. `view.js` : pièces construites, aperçu, lampe, animations de mêlée.
- `ui.js`, `input.js`, `index.html`, `css/style.css` : HUD survie, bouton Utiliser, mode construction, barre rapide.
- `audio.js` : coups, abattage, construction, porte, manger / boire / bandage.
- `tests/sim3d.mjs` : tests adaptés + nouveaux tests (cabane, besoins, butin, construction, zombies contre murs, sauvegarde).

## Principe d'architecture
Deux couches strictement séparées :
1. **Simulation** (`config`, `logic`, `layout`, `sim`) : aucune dépendance à three.js ni au DOM → testable sous Node (`npm run test:3d`).
2. **Rendu / interface** (`assets`, `world`, `view`, `fx`, `audio`, `input`, `ui`, `game`, `main`) : lit l'état de la simulation, consomme ses événements (`sim.drain()`), n'écrit jamais dedans.

La simulation émet des événements `{type, ...}` : `shot, hit, kill, hurt, death, gameover, reload, reloaded, empty, swap, recoil, pickup, pickupAdd, wave, waveClear`.

## Arborescence
```
3d/
  index.html            importmap three@0.160.0 (CDN jsdelivr), canvas, HUD, écrans
  css/style.css         HUD mobile (paysage + portrait), écrans
  js/
    config.js           TOUT l'équilibrage : caméra, joueur, armes, zombies, vagues, objets, position de l'arme en main
    logic.js            maths pures : raySphere, pushOut (cercles + boîtes), cameraRig, rng, angles
    layout.js           plan de la ville (routes en croix, maisons, épaves, conteneurs, arbres) + colliders ; housePieces()
    sim.js              classe Sim : joueur, armes, tir assisté, zombies (IA), vagues, objets
    assets.js           GLTFLoader, matériaux Lambert partagés, instance() (SkeletonUtils.clone), placeholder()
    world.js            sol, ciel, brume, lumières, assemblage + FUSION des pièces statiques par matériau, arbres instanciés, enceinte
    view.js             classe View : renderer, caméra, acteurs animés (joueur, zombies), objets, effets, rendu
    fx.js               traînées de balles, lueur de bouche, sang (pools)
    audio.js            sons synthétisés WebAudio
    input.js            joystick flottant, glisser pour viser, boutons, clavier/souris
    ui.js               HUD + écrans (menu, pause, game over)
    game.js             boot, boucle principale, branchement sim ↔ vue ↔ UI ↔ sons, record (localStorage)
    main.js             point d'entrée
tests/sim3d.mjs         12 tests de la simulation
tools/obj2glb.py        convertisseur OBJ+MTL → GLB (props du pack survivant, végétation)
assets/models/          characters, weapons, vehicles, environment, village, props, vegetation (CC0 Quaternius)
```

## Modèles utilisés (chemins sous `assets/models/`)
- Joueur : `characters/Characters_Matt_SingleWeapon.gltf` (anims `Idle_Gun, Walk_Gun, Run_Gun, Death`), arme attachée à l'os `Middle1.L` avec la pose du couteau fourni.
- Zombies : `Zombie_Basic`, `Zombie_Arm` (rapide), `Zombie_Ribcage` (très rapide, fragile), `Zombie_Chubby` (lent, costaud). Anims : `Idle, Walk, Run, Idle_Attack/Run_Attack/Punch, HitReact, Death`.
- Armes : `weapons/Pistol, Shotgun, SMG, Rifle`.
- Ville : `environment/Street_*`, `vehicles/*`, `environment/*` (barils, conteneurs, lampadaires…), `village/*` (maisons 8x8 m : murs + toit `Roof_RoundTiles_6x6`, clôture d'enceinte).
- Objets : `props/FirstAidKit.glb`, `village/Prop_Crate.gltf` (munitions), `environment/Chest_Special.gltf` (arme).

## Boucle de jeu
(Ancienne boucle par vagues : supprimée par la refonte survie, voir ci-dessus.)
Nouvelle boucle : Menu (NOUVELLE PARTIE / CONTINUER) → départ dans la cabane → fouiller, récolter, construire, se battre, manger / boire → jours et nuits qui passent → mort → game over (jours survécus, zombies tués ; record de jours).

## Formules utiles
- Orientation : yaw 0 = regard vers +Z ; direction `(sin yaw, cos yaw)` ; droite `(-cos yaw, sin yaw)` ; glisser vers la droite = `yaw` diminue.
- Tir : rayon caméra → visée assistée (cône 0,17 rad) → direction muzzle→cible + dispersion → touche 3 sphères par zombie (tête ×2,2, torse, jambes).
