# plan.md — Dernier Rempart 3D (dossier `3d/`)

Structure détaillée de la refonte 3D. Le jeu 2D historique (racine du dépôt, `js/`, `index.html`) reste intact ; voir `../plan.md`.

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
Menu → `Sim.reset()` → manche : intermission (3 s puis 6 s) → vague n (file de zombies, 18 vivants max) → vague terminée (bonus) → n+1 … → mort → game over (record local).
Déblocage d'armes par caisses : fusil à pompe vague 2, mitraillette vague 4, fusil vague 7.

## Formules utiles
- Orientation : yaw 0 = regard vers +Z ; direction `(sin yaw, cos yaw)` ; droite `(-cos yaw, sin yaw)` ; glisser vers la droite = `yaw` diminue.
- Tir : rayon caméra → visée assistée (cône 0,17 rad) → direction muzzle→cible + dispersion → touche 3 sphères par zombie (tête ×2,2, torse, jambes).
