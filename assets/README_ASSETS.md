# Assets 3D — Dernier Rempart (v4)

Ce document décrit **tout** ce qui se trouve (ou doit se trouver) dans `assets/`. Les fichiers binaires (GLB, glTF, FBX, OBJ, PNG, .blend) se versionnent avec git en local : les outils GitHub de l'assistant n'envoient que du texte.
Dernière mise à jour : 2026-11-25.

## 0. Vue d'ensemble

```
assets/
  README_ASSETS.md          ce fichier
  models/                   modèles UTILISÉS PAR LE JEU (chargés par 3d/js/config.js : MODELS = '../assets/models/')
    characters/ weapons/ vehicles/ environment/ village/ props/ vegetation/   (lot 1, Quaternius, déjà en place)
    interiors/                                                                  (lot 2, Cozy Interiors, GLB prêts à l'emploi)
  sources/                  fichiers de TRAVAIL (non chargés par le jeu : FBX, OBJ, .blend à convertir en GLB avant usage)
    household_fbx/ melee_weapons/ post_apocalyptic/ medieval_houses/ blend/    (lot 2)
  textures/                 (un fichier « 5 » vide laissé par erreur : à supprimer)
```

Règle : **seul le dossier `assets/models/` est lu par le jeu**. Tout ce qui est dans `assets/sources/` est de la matière première (pas de chargeur FBX/OBJ/Blender dans le jeu) ; pour l'utiliser, il faut le convertir en GLB (voir §4).

Livraison du lot 2 : archive `assets_nouveaux.zip` (≈ 39 Mo, préparée par l'assistant) à dézipper **à la racine du dépôt** ; elle recrée `assets/models/interiors/` et `assets/sources/…`. Puis `git add assets && git commit && git push`.

## 1. Lot 1 — déjà en place (CC0, Quaternius)

Sources : Zombie Apocalypse Kit, Medieval Village MegaKit [Standard], pack « survivant », Ultimate Crops Pack. Version allégée pour mobile (≈ 26 Mo).

| Dossier (`assets/models/…`) | Contenu | Format |
|---|---|---|
| characters | 4 zombies (Basic, Chubby, Arm, Ribcage), 4 survivants avec arme (Matt, Lis, Sam, Shaun), 1 chien | glTF animé (textures embarquées 512 px) |
| weapons | Axe, Knife, Pistol, Shotgun, SMG, Rifle, Spear, battes, guitare | glTF |
| vehicles | Pickup, Sports, Truck (+ blindés) | glTF |
| environment | rues, conteneurs, barils, cônes, feux, château d'eau, coffres… | glTF |
| village | 43 pièces modulaires (murs, portes, toits, clôtures…) ; textures couleur 512 px, normales/ORM remplacées par des images 4x4 | glTF + .bin |
| props | 40 objets du pack survivant (trousse de soin, bidon, batterie, revolvers, torche, tente…) | GLB couleurs unies (`tools/obj2glb.py`) |
| vegetation | Grass_1..4, fleurs, citrouille, cactus… du pack Ultimate Crops (surtout `Grass_*` utilisés) | GLB couleurs unies |

Animations des zombies : Idle, Walk, Run, Run_Attack, Idle_Attack, Punch, HitReact, Death, Crawl.
Animations des survivants : Idle, Idle_Gun, Walk, Walk_Gun, Run, Run_Gun, Slash, Stab, Punch, HitReact, Death, Jump…

Non utilisé (volontairement) : le pack « Free Urban Zombie Sprite Sheet » (sprites 2D pixel art, incompatible avec un rendu 3D).

## 2. Lot 2 — nouveaux packs reçus le 2026-11-25

Résumé (le statut dit si le jeu peut s'en servir tel quel) :

| # | Pack | Contenu | Format d'origine | Emplacement | Statut |
|---|---|---|---|---|---|
| A | Cozy Interiors (models for other engines) | 344 GLB de mobilier/décor d'intérieur, 10 pièces | GLB + FBX | `models/interiors/` | **Utilisable tel quel** (GLB) |
| B | Low Poly Household Items | 112 meubles/objets de maison | FBX | `sources/household_fbx/` | À convertir |
| C | Melee Survival Weapons 2k | armes de mêlée (planche unique) | OBJ + FBX + .blend + 4 textures 2k | `sources/melee_weapons/` | À convertir |
| D | Post-apocalyptic asset v0.4 | 23 objets/personnages post-apo | OBJ + PNG (+ .blend) | `sources/post_apocalyptic/` | À convertir |
| E | Free Medieval Houses 3D Low Poly | 20 maisons + pièces modulaires | FBX + atlas 64x64 | `sources/medieval_houses/` | À convertir |
| F | POLY Lite Survival Collection | ≈ 100 objets de survie (armes, tente, nourriture…) | .blend seul | `sources/blend/` | Nécessite Blender |
| G | RndHouse4 (bl + tex) | bâtiment en ruine + texture 2048 | .blend + JPG | `sources/blend/` | Nécessite Blender |
| H | AbandonedHouse | maison abandonnée (portes, fenêtres) | .blend | `sources/blend/` | Nécessite Blender |
| I | Low-Poly Ruined Buildings Pack | bâtiments en ruine | .blend (compressé zstd) | `sources/blend/` | Nécessite Blender |
| J | PixelPlanets (Godot) | générateur de planètes pixel art | projet Godot (shaders `.gdshader`) | non copié | **Hors sujet** pour ce jeu |

Aucun convertisseur FBX/Blender n'était disponible dans l'environnement de l'assistant (ni Blender, ni FBX2glTF, ni réseau) : seuls les GLB du pack A sont donc prêts pour three.js. Le reste est rangé et documenté, pas converti.

### A. Cozy Interiors → `assets/models/interiors/` (344 GLB, ≈ 11 Mo)
- Dossiers par pièce : `Shell` (45 : murs, sols, plafonds, coins, portes Door_Barn/French/Glazed/Panel/Plank/Shop…), `Bedroom` (31), `Kitchen` (34), `Living` (35), `Bakery` (34), `Cafe` (34), `Office` (31), `Bathroom` (30), `Kids` (30), `Decor` (40). Exemples : `CI_Bedroom_Bed_Single.glb`, `CI_Kitchen_Fridge_Retro.glb`, `CI_Living_Fireplace_Mantel.glb`, `CI_Bathroom_Toilet.glb`.
- Niveaux de détail : certains modèles ont deux fichiers `NOM_LOD0.glb` (détaillé) et `NOM_LOD1.glb` (léger) ; les autres sont `NOM.glb`. **Sur mobile, préférer `_LOD1`.**
- Échelle et axes : 1 unité = 1 m, Y vers le haut, **façade vers +Z** (convention glTF).
- Pivots : meubles = centre de la base ; objets muraux = centre arrière ; objets de plafond = centre du haut ; murs = début du mur sur la ligne centrale, ils courent le long de +X ; sols/plafonds = un coin.
- **Matériau unique par modèle** : une palette PNG 256x256 (grille de 8x8 cellules de 32 px) → `models/interiors/Palettes/CI_Theme_{Honey,Sage,Walnut,Linen}.png`. Les UV tombent au centre des cellules : chaque face est d'une couleur plate. Pour changer de thème, il suffit de changer la palette.
  - **Obligatoire** : filtre `NearestFilter` et **pas de mipmaps** sur la palette (sinon les couleurs voisines se mélangent).
  - L'alpha de la palette = brillance (« smoothness »), **pas** l'opacité : ne pas le brancher sur la transparence.
  - Cellules 41 à 43 = lampes/flammes (matériau émissif) ; cellule 40 = verre (matériau transparent). Cellule 0 = en bas à gauche, `cellule = ligne*8 + colonne`, ligne 0 en bas.
  - Modèles en ombrage plat (flat shading). Couleurs de sommets/UV1/UV2 = données pour les shaders Unity d'origine, **ignorables** dans three.js (`Patterns/` et `periods.txt` ne sont pas copiés).
- Usage prévu dans le jeu : **intérieurs de maisons** (étape « maisons ouvrables » du RAPPORT) : `Shell` pour les murs/portes, `Bedroom/Kitchen/Living/Bathroom` pour meubler, `Decor` pour l'ambiance. Il manque dans `assets.js` un chargeur de palette (matériau Lambert/Basic avec `map` = palette en `NearestFilter`, `generateMipmaps=false`).
- Licence : non fournie dans l'archive (voir §5).

### B. Low Poly Household Items → `assets/sources/household_fbx/` (112 FBX, ≈ 3,5 Mo)
Sous-dossiers : Kitchen, Carpets, Windows (A–C), Tables, Bathroom, Beds, Drawers, Shelves, Lights, Sofas, Electronics, Miscellaneous, Doors (A–C), Chairs (A–E). Objets : réfrigérateurs, four, micro-ondes, bouilloire, lits (simple, double, superposés), canapés A–D, téléviseurs, ordinateur, consoles, lampes, radiateurs, coffres-forts, plantes, balai, échelle, poubelle, etc. Faible polygonage, adapté au mobile. Doublonne en partie le pack A : à n'utiliser que pour les objets modernes manquants (électronique, électroménager).

### C. Melee Survival Weapons 2k → `assets/sources/melee_weapons/`
- Un seul maillage regroupant plusieurs armes de mêlée (`Melee_Survival_Weapons_2k.obj/.fbx/.mtl`), un jeu de textures PBR 2048 px (BaseColor, Normal, Metallic, Roughness).
- **Allégé pour le dépôt** : seule la couleur de base est fournie, redimensionnée en 1024 px JPG (`Melee_Survival_Weapons_BaseColor_1k.jpg`). Les cartes Normal (9 Mo), Metallic et Roughness (≈ 15 Mo au total) ont été retirées (inutiles avec des matériaux Lambert) ; les originaux restent chez toi.
- Le maillage contient plusieurs armes dans un même fichier : il faut les **séparer** (Blender : séparer par pièces) avant de les attacher à la main du joueur comme `WEAPON_HAND`. Alternative immédiate : les armes de mêlée du lot 1 (`weapons/` : Axe, Knife, Spear, battes).

### D. Post-apocalyptic asset v0.4 → `assets/sources/post_apocalyptic/` (OBJ + PNG, ≈ 20 Mo)
Pack fait avec Blender 3.0.0, version 0.4, daté du 13/01/2022 (info.txt). Dossiers (nom d'origine → contenu) :
- Armes : `pistol` (+ `cartridge`), `shot_gun` (+ cartouche), `rifl` (fusil de précision + cartouche), `shum` (fusil silencieux « noise rifle »), `baseball bat`, `tapor` (hache), `knighf` (couteau), `granate` (grenade), `smoke` (grenade fumigène).
- Objets : `tin_can`, `kanistra` (bidon), `bandage`, `bottle`, `flashlight`, `generator`, `shelves`, `barricades`, `yashik` (caisse), `small_backpack` (rukzak), `medium backpack` (rukzak_2).
- Personnages : `character`, `character_2` (avec texture de cheveux séparée).
- Chaque dossier : un `.obj` + `texture.png` (certains en ont deux : `texture_1/2`, `texture_hair`, `texture_cartridge`). Les `.blend` d'origine ont été retirés (ils doublonnent les OBJ), **sauf** `small_backpack/rukzak.blend` : le petit sac à dos n'existe qu'en .blend (pas d'OBJ), à exporter depuis Blender.
- Intérêt pour le jeu : la **grenade** et le **fumigène** (bouton « THROW » de la référence « Apocalypse Survival »), **sacs à dos** (le personnage de dos avec son sac), **générateur, étagères, barricades, caisses** pour le décor. Les personnages ne sont pas animés.

### E. Free Medieval Houses 3D Low Poly → `assets/sources/medieval_houses/` (≈ 24 Mo)
- Archive d'origine en 2 parties (`.zip.001/.002`, recollées dans l'ordre numérique). Contenu d'origine : 131 FBX en 6 dossiers (`Parts`, `House_Full_ordinar`, `house_unreal`, `House_1_unity`, `RIG_unreal`, `rig_unity`).
- **Gardé** : `Parts/` (33 pièces modulaires : portes DOOR_01…06, murs WALL_01…05, fenêtres WINDOW_01…07, toits ROOF_*), `House_Full_ordinar/` (20 maisons complètes `House_01_full` … `house_20_full`), `Texture/House_texture_atlas.png` (atlas 64x64) et `.tx`, `License.txt`, `readme.txt`.
- **Retiré** (doublons spécifiques moteur, ≈ 50 Mo) : `house_unreal`, `House_1_unity`, `RIG_unreal`, `rig_unity` (mêmes maisons avec rig de portes/fenêtres pour Unreal/Unity).
- Une seule texture atlas minuscule (64x64) : le rendu est « couleurs plates par UV ».
- Intérêt : variété de maisons (le jeu n'utilise aujourd'hui que le pack Medieval Village de Quaternius) et d'éléments de façade.

### F. POLY Lite Survival Collection → `assets/sources/blend/POLY_LiteSurvivalCollection_Blender.blend` (16,6 Mo)
Fichier Blender seul, ≈ 100 objets de survie, d'après les noms d'objets : armes (pistolet « Army Pistol » avec chargeurs, culasse et garde-main, mitraillette spéciale, tronçonneuse, hache de camping, couteau de camping, marteau, masse), accessoires d'armes (viseurs collimateurs A/B, poignée verticale, boîtes de cartouches 9 mm), tente assemblée, feu de camp, bois de chauffage et bûches, canne à pêche et hameçons, bidon, bonbonnes de gaz, barils, ciment, établi, conserves, pommes/oranges/viande, bandages, attelle improvisée, trousse médicale, gourde, poêle.
Un seul gros fichier : à ouvrir dans Blender, puis exporter chaque objet voulu en GLB (Fichier → Exporter → glTF 2.0, « Sélection uniquement »).

### G. RndHouse4 → `assets/sources/blend/RndHouse4_bl.blend` + `blend/RndHouse4_tex/RndHouse4.jpg` (2048x2048)
Bâtiment en ruine (objets : BLDNG_Part/Part2/P3, TowerD3 (tour), Roof, Stair, Deck, Gate/GateL/GateR, Door, Wood, « Ruined »). La texture JPG 2048 est à rebrancher dans Blender avant export (ou à réduire à 512–1024 px pour mobile).

### H. AbandonedHouse → `assets/sources/blend/AbandonedHouse.blend` (2,8 Mo)
Maison abandonnée construite avec un générateur de pièces/portes/fenêtres (objets : Cube (volume), Door, DoorFrame, Handle_Front/Back, Window.001…015). Pour des maisons « ruinées » à ajouter au village.

### I. Low-Poly Ruined Buildings Pack → `assets/sources/blend/Low-Poly_Ruined_Buildings_Pack.blend` (0,4 Mo)
Fichier Blender compressé (zstd, Blender ≥ 3.0) : contenu non listé car illisible sans Blender. À ouvrir pour juger des bâtiments en ruine.

### J. PixelPlanets (Deep-Fold)
Projet Godot (shaders `.gdshader`, scènes `.tscn`, 773 fichiers) qui génère des planètes en pixel art ; licence MIT (Deep-Fold, 2020). **Inutile pour ce jeu 3D** : non copié dans `assets/`. L'archive reste chez toi.

## 3. Axes, échelle, orientation (pour l'intégration)
| Source | Axe haut | Échelle | Façade vers |
|---|---|---|---|
| Quaternius (lot 1, glTF) | Y | 1 u = 1 m | +Z |
| Cozy Interiors GLB | Y | 1 u = 1 m | +Z (le FBX est -Z) |
| Household / Medieval Houses / Melee (FBX) | à vérifier à l'import (FBX souvent Y haut, mais échelle en cm possible) | à mesurer | à vérifier |
| OBJ (Post-apo) | Y (export Blender, Y haut) | à mesurer | à vérifier |

Pour three.js, la sortie visée est toujours du **glTF/GLB** : le jeu règle déjà l'échelle par modèle dans `3d/js/config.js` (`scale`).

## 4. Comment convertir les sources en GLB
1. **Blender** (recommandé, gratuit) : importer le FBX/OBJ/.blend → vérifier échelle (1 u = 1 m) et orientation → Fichier → Exporter → glTF 2.0 (.glb) en cochant « +Y haut » et « Sélection uniquement ». Si le modèle a une texture, la laisser « Embarquée » ou la réduire à 512 px.
2. **OBJ sans texture, couleurs unies** : `python3 tools/obj2glb.py` (outil du dépôt, utilisé pour `props/` et `vegetation/`).
3. **FBX en ligne de commande** : `FBX2glTF input.fbx -b -o sortie` (outil externe, à installer).
4. Ranger le résultat dans `assets/models/<catégorie>/` puis déclarer le chemin dans `3d/js/config.js` / `layout.js`, et l'ajouter ici.

Poids cibles (mobile) : < 100 000 triangles visibles à l'écran, textures ≤ 512 px, une texture/matériau partagé par catégorie (le moteur fusionne le décor statique par matériau).

## 5. Licences et attributions (à vérifier avant publication)
| Pack | Licence connue |
|---|---|
| Quaternius (lot 1) | CC0 (domaine public) |
| PixelPlanets | MIT (Deep-Fold) — non utilisé |
| Free Medieval Houses | `License.txt` renvoie vers https://craftpix.net/file-licenses/ (licence gratuite Craftpix : relire les conditions avant de publier le jeu) |
| Cozy Interiors, Low Poly Household Items, Melee Survival Weapons, Post-apocalyptic asset, POLY Lite Survival, RndHouse4, AbandonedHouse, Low-Poly Ruined Buildings | **aucune licence dans les archives reçues** : vérifier la page de téléchargement d'origine (usage commercial, attribution, redistribution sur GitHub public) |

Attention : le dépôt GitHub est public (GitHub Pages). Y publier des modèles dont la licence interdit la redistribution brute est un risque ; en cas de doute, garder `assets/sources/` hors du dépôt (`.gitignore`) et ne versionner que les GLB réellement utilisés.

## 6. Utilisation dans le jeu — état
- Utilisés aujourd'hui : uniquement le lot 1 (`characters`, `weapons`, `vehicles`, `environment`, `village`, `props`, `vegetation`).
- Prêt à brancher : `models/interiors/` (GLB) — pour les intérieurs de maisons.
- À faire, par ordre d'intérêt : (1) palette Nearest + chargeur d'intérieurs ; (2) convertir grenade, fumigène et sacs à dos du pack D (bouton THROW et sac sur le dos, comme dans la capture « Apocalypse Survival ») ; (3) convertir quelques maisons du pack E et des ruines (G, H, I) pour varier le village ; (4) objets du pack F (tente, feu de camp, conserves) en butin.
