# PLAN DE RATTRAPAGE — brancher les assets disponibles sur le jeu « survie » (v5)

Établi le 2026-11-25 d'après l'état de `main` (commit `1d9f826`, v5.0.0-survie) et l'inventaire de `assets/README_ASSETS.md`.
Objectif : que le jeu utilise réellement ce que contient `assets/`, dans l'ordre qui rapporte le plus pour le moins de risque. Une seule branche : `main`.

## 1. Où on en est
**Jeu (3d/, v5.0.0-survie)** : cabane de départ, couteau + 1 eau, cycle jour/nuit, faim/soif/saignement, fouille de butin, récolte bois/pierre, construction (mur bois, mur pierre, porte, feu), zombies à vue/bruit, sauvegarde auto, 22 tests de simulation écrits. Rendu three.js : **jamais vérifié visuellement par l'assistant** (pas de navigateur avec réseau).
**Assets** : lot 1 (Quaternius) en place ; lot 2 rangé dans `assets/models/interiors/` (GLB, utilisable) et `assets/sources/` (FBX / OBJ / .blend, à convertir).
**Écarts constatés** :
- `RAPPORT.md` s'arrête à la v4 (dernier commit 2026-11-24) : rien sur la survie ni sur le lot 2.
- Beaucoup d'assets déjà au bon format ne sont pas utilisés (voir §2).
- Les maisons sont des blocs pleins (pas d'intérieur) : les 344 meubles Cozy n'ont aucun usage.
- Fichiers parasites : `assets/textures/5`, `assets/models/vegetation/5` ; doublons à la racine (`README_ASSETS.md`, `obj2glb.py`).
- Les licences de la plupart des packs du lot 2 sont inconnues (dépôt public).

## 2. Inventaire : ce qui est utilisé / disponible
| Asset | Format | Utilisé ? | Usage prévu |
|---|---|---|---|
| props : Backpack, Tent, WoodLog, Torch, WoodenTorch, Matchbox, GasCan, PropaneTank, BearTrap_Open/Closed, Radio, Compass_Closed, FlareGun, Phone, Battery_Big/Small, Trashcan | GLB | non | P1 |
| props : Revolver_1-3, Shotgun_1/2/SawedOff/ShortStock, Pistol_1/2 | GLB | non | P1 (variantes d'armes en butin) |
| props : Bandages, Can_Closed, WaterBottle_1, Bonfire, Shovel, FirstAidKit | GLB | oui / partiel | — |
| vegetation : Apple, Orange, Corn, Wheat, Pumpkin, Mushroom, Bamboo, BushBerries, PalmTree, Cactus, Flower_1/2 | GLB | non (seule l'herbe sert) | P1 (nourriture variée, ambiance) |
| environment : Blood_1-3, Pallet_Broken, TrafficBarrier_1/2, TrafficCone_2, TrafficLight_1/2, TownSign, Pipes, Wheel, Couch, Street_T/Turn/Crack | glTF | partiel | P1 (décor, sang) |
| characters : Lis, Sam, Shaun (survivants), GermanShepherd (chien) | glTF animé | non | P5 |
| weapons : Spear, WoodenBat_Barbed, Guitar, Shotgun, SMG, Rifle | glTF | non (v5 mêlée + pistolet) | P1 / P5 |
| interiors/ (Cozy, 344 GLB, 4 palettes) | GLB | non | P2 |
| sources/post_apocalyptic (23 dossiers OBJ + PNG) | OBJ | non | P3 (après conversion) |
| sources/melee_weapons (1 maillage, plusieurs armes) | OBJ/FBX | non | P3 |
| sources/household_fbx (112 FBX), medieval_houses (FBX), blend/* | FBX / .blend | non | P4 (Blender requis) |

## 3. Étapes, par priorité
Taille : S = moins d'une heure, M = une demi-journée, L = une journée ou plus. Chaque étape finit par : tests Node verts, essai sur téléphone en paysage, mise à jour de `RAPPORT.md` + `3d/plan.md` + `assets/README_ASSETS.md`.

### P0 — Assainir et vérifier (taille M, à faire avant tout le reste)
1. **Voir le jeu tourner sur téléphone** et noter : chargement des modèles, échelle du perso, arme en main, caméra, FPS. Sans ça, tout le reste s'empile sur du code jamais vu à l'écran.
2. `npm test` : les 22 tests passent-ils sur `main` ? Corriger sinon.
3. **Nouveau test `tests/assets.mjs`** : lit `config.js`, `layout.js` et `survival.js`, extrait tous les chemins de modèles et vérifie qu'ils existent dans `assets/models/`. Évite les écrans noirs dus à un fichier manquant.
4. **Mettre à jour `RAPPORT.md`** (sections : survie v5, lot 2, état réel, prochaines étapes) sans effacer l'historique.
5. Nettoyage : supprimer les fichiers « 5 » et les doublons de la racine.
6. **Licences** : retrouver la page d'origine de chaque pack du lot 2 (usage commercial ? redistribution sur dépôt public ?). Tant que c'est inconnu : ajouter `assets/sources/` au `.gitignore` (ne pas le republier), ne publier que les GLB réellement utilisés.
7. Budget perf à mesurer : nombre de draw calls et de triangles (`renderer.info`) avant/après chaque étape ; cible mobile < 120 draw calls, < 150 000 triangles visibles.

### P1 — Victoires rapides : assets déjà en GLB (taille M, aucun outil à écrire)
| Ajout | Assets | Fichiers touchés | Critère d'acceptation |
|---|---|---|---|
| **Sac à dos visible** sur le dos du joueur (référence Apocalypse Survival) | `props/Backpack.glb` | `view.js` (attacher à l'os du torse) | le sac suit les animations, sans traverser la tête |
| **Capacité d'inventaire** liée au sac (départ : petite capacité ; sac trouvé : +) | Backpack | `config.js` (`SURVIVAL.cap`), `survival.js`, `ui.js` | ramasser au-delà de la capacité est refusé avec un message ; test de simulation |
| **Tente = abri constructible / lieu de repos** | `props/Tent.glb` | `config.js` (`PIECES.tent`), `survival.js`, `view.js` | posable sur la grille, a des PV, les zombies l'attaquent |
| **Piège à loup** | `BearTrap_Open/Closed` | `PIECES.trap`, `sim.js` (dégâts + immobilise un zombie) | déclenche une fois, change de modèle |
| **Allumettes pour le feu de camp** (réalisme et rareté) | `Matchbox` | `PIECES.fire` coûte 1 allumette, `LOOT` | feu impossible sans allumette ; test |
| **Torche en main la nuit** | `Torch` / `WoodenTorch` | `view.js` | éclaire devant le joueur |
| **Bois ramassable au sol** (bûches après abattage) | `WoodLog` | `view.js`, `survival.js` | l'arbre abattu laisse des bûches visibles |
| **Nourriture variée** : pomme, orange, maïs, citrouille, champignon, baies | `vegetation/*_Crop` | `ITEMS`, `LOOT`, icônes `ui.js` | 3 à 4 aliments avec valeurs différentes (+ risque pour le champignon ?) |
| **Butin d'armes variées** : revolvers, fusils à pompe, pistolets 1/2 | `props/Revolver_*`, `Shotgun_*`, `Pistol_*` | `WEAPONS` (stats distinctes), `LOOT` | chaque arme a sa cadence, son bruit, son chargeur |
| **Lancer** : bidon d'essence, bouteille (distraction), fusée de détresse | `GasCan`, `WaterBottle_2`, `FlareGun` | `sim.js` (projectile + bruit qui attire les zombies) | le bruit attire les zombies à l'endroit de l'impact |
| **Décor** : sang au sol sur les morts, palettes cassées, barrières, panneaux, tuyaux, palmier (Afrique de l'Ouest) | `Blood_1-3`, `Pallet_Broken`, `TrafficBarrier_*`, `TownSign`, `PalmTree_Crop` | `layout.js` (`smalls`), `fx.js` | carte moins répétitive, perf stable (fusion par matériau) |
| **Armes de mêlée en plus** : lance, batte à clous, guitare (humour) | `weapons/Spear`, `WoodenBat_Barbed`, `Guitar` | `WEAPONS` | stats et animation `Slash`/`Stab` |

### P2 — Intérieurs de maisons avec Cozy Interiors (taille L)
C'est le plus gros gain visuel et de gameplay (fouille à l'intérieur) ; le jeu a déjà `lootSpots` et des maisons de 8 x 8 m.
1. **Chargeur de palette** dans `assets.js` : détecter le matériau Cozy (texture 256x256, nom `CI_*`), `NearestFilter`, `generateMipmaps = false`, ombrage plat ; thème choisi par maison (Honey, Sage, Walnut, Linen) en changeant seulement le PNG.
2. **Collisions de maison par murs** (au lieu d'une boîte pleine de 8,2 m) : 4 murs, une ouverture au niveau de la porte ; les balles et la vue restent bloquées par les murs (déjà géré par `rayBoxes`).
3. **Gabarits de pièces** (une pièce par maison pour commencer) : Shell (sol, plafond), puis Bedroom / Kitchen / Living / Bathroom avec 6 à 10 meubles `_LOD1` placés sur la grille de 2 m ; pivot au centre de la base, façade vers +Z.
4. **Butin par pièce** : cuisine → nourriture et eau ; salle de bain → bandages ; chambre → vêtements / sac ; salon → munitions ; table de `LOOT` par type de pièce.
5. **Éclairage** : la nuit, lampes Cozy (cellules 41-43 émissives) visibles de loin ; intérieur sombre → torche utile.
6. **Perf** : fusionner meubles et murs par matériau (déjà fait pour la ville dans `world.js`) ; n'instancier l'intérieur que pour les maisons proches (rayon ~ 30 m).
7. Cafés / boulangeries (Cozy `Cafe`, `Bakery`) : 1 ou 2 bâtiments commerciaux avec plus de nourriture.
**Critères** : entrer par la porte, fouiller 3 points de butin, ressortir ; ≥ 30 FPS sur le téléphone de test ; sauvegarde correcte du butin fouillé.

### P3 — Chaîne de conversion OBJ → GLB et objets du pack post-apo (taille L)
Aucun Blender dans l'environnement de l'assistant : on étend l'outil existant.
1. **`tools/obj2glb.py` v2** : lire les UV et **embarquer la texture PNG** (réduite à 512 px) ; séparer les groupes `o`/`g` en objets distincts ; sortie GLB.
2. Convertir `post_apocalyptic/` (OBJ + `texture.png`) vers `assets/models/postapo/` ; **`melee_weapons`** : séparer le maillage unique en armes individuelles.
3. Ajouts de jeu : **grenade + fumigène** (bouton THROW de la référence), **générateur** (objectif : le remettre en route pour avoir de la lumière / une radio), **barricades** (pièce constructible), **étagères / caisses** (butin), **sac moyen** (capacité supérieure), **lampe torche**, armes de mêlée (hache, batte, couteau pack D).
4. Limite : `small_backpack` n'a qu'un .blend (à exporter dans Blender) ; personnages du pack D non animés (inutiles pour l'instant).

### P4 — Ce qui exige Blender (à faire par toi, ou à reporter)
Exporter en GLB (+Y haut, sélection uniquement) puis ranger dans `assets/models/` :
- **POLY Lite Survival** (`blend/`) : tente assemblée, feu de camp, canne à pêche (pêche = nourriture), conserves, attelle, établi, outils.
- **Ruines** : `RndHouse4`, `AbandonedHouse`, `Low-Poly_Ruined_Buildings_Pack` → variété de bâtiments, un quartier ruiné.
- **Maisons médiévales FBX** (20 maisons) et **mobilier FBX** (112) si les Cozy ne suffisent pas. À éviter en priorité : le style médiéval tranche avec une apocalypse moderne.

### P5 — Gameplay inspiré de la référence « Apocalypse Survival » (taille L, après P1-P2)
- **Bouton VISER (AIM)** : zoom léger + précision, caméra plus proche (`CAMERA`).
- **Survivants à secourir** : Lis, Sam, Shaun (modèles animés déjà là) ; les silhouettes en haut à droite = nombre de survivants du camp ; ils aident ou font des tâches.
- **Chien** (`GermanShepherd`) : compagnon qui alerte des zombies.
- **Zombies rampants** (animation `Crawl` existante) dans l'herbe haute.
- **Herbe haute** : densifier `Grass_*` en instances (InstancedMesh) pour cacher partiellement les zombies.
- **Véhicules** : épaves fouillables (déjà), puis abri / carburant (`GasCan`).
- Conteneurs empilés et camionnette : décor déjà disponible (`Container_*`, `Vehicle_*`).

## 4. Ordre conseillé et jalons
1. **J1** : P0 complet. 2. **J2** : P1 (sac, tente, piège, allumettes, nourriture, décor). 3. **J3-J4** : P2 (intérieurs). 4. **J5** : P3 (outil + grenade, barricades). 5. **Ensuite** : P5, et P4 selon ce que tu auras converti.
Chaque jalon = un commit `main` clair + un essai téléphone + `RAPPORT.md` à jour.

## 5. Risques
| Risque | Parade |
|---|---|
| Rendu 3D jamais vu : bug caché | P0.1, captures d'écran du téléphone à chaque jalon |
| Perf mobile (intérieurs, herbe) | fusion par matériau, LOD1, instanciation, rayon d'activation, mesures `renderer.info` |
| Licences inconnues | P0.6 : `.gitignore` sur `assets/sources/`, publier seulement le nécessaire |
| Poids du dépôt / de Pages | GLB uniquement dans `models/`, textures ≤ 512 px, pas de .blend publics |
| Dérive entre sessions (code modifié ailleurs) | `RAPPORT.md` + `3d/plan.md` mis à jour à chaque étape ; toujours relire `main` avant de modifier |
| Les outils GitHub n'envoient que du texte | binaires (GLB, PNG) livrés en zip, à pousser avec git |

## 6. Décisions à prendre (pour t'éviter de les subir)
1. Valider l'ordre P0 → P1 → P2 ? 2. Garder ou non `assets/sources/` dans le dépôt public (licences) ? 3. Style du monde : moderne (Cozy) ou médiéval (maisons FBX) ? 4. Priorité : intérieurs (P2) avant les armes/objets (P1/P3) ?
