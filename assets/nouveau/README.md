# assets/nouveau — nouveaux packs (2026-11-27)

Huit packs de décor reçus le 2026-11-27, **non encore utilisés par le jeu** (rien n'est préchargé ni référencé). Ce fichier décrit chaque modèle : nom exact, rôle, taille mesurée **L × H × P en mètres** (largeur X × hauteur Y × profondeur Z, à l'échelle d'origine du fichier ; Y vers le haut, 1 unité = 1 m sauf mention). Les noms sont ceux des fichiers (extension en plus). Pour les GLB, la taille vient des boîtes englobantes du fichier ; pour Ultimate Nature elle vient des OBJ jumeaux.

## À lire d'abord : licences (important pour un dépôt public)
| Pack | Licence | Dépôt public ? |
|---|---|---|
| Kenney Modular Buildings, Kenney City Kit Suburban | CC0 (domaine public) | Oui |
| Quaternius Ultimate Nature | CC0 | Oui |
| Cenji Urban Street Props, Cenji LowPoly Winter Nature | usage perso et commercial, modification permise, **revente / redistribution / republication des fichiers bruts interdite** | **Non recommandé** : un dépôt public redistribue les fichiers. Garder en privé, ou ne pas les versionner. |
| Abandoned Industrial Kit (sampler) | usage libre, **revente / partage / inclusion dans un autre pack / entraînement d'IA interdits** | **Non recommandé** (même raison) |
| Modular Terrain Collection, PSX Buildings | **aucune licence fournie** dans les archives | À vérifier auprès de l'auteur avant de publier |

Les fichiers de licence originaux sont copiés dans chaque dossier quand ils existaient.

## Arborescence
```
assets/nouveau/
  README.md                         ce fichier
  cenji_urban_props/                120 GLB + LICENSE.txt
  cenji_winter_nature/              100 GLB + LICENSE.txt
  kenney_modular_buildings/         108 GLB + Textures/ (colormaps) + License.txt
  kenney_city_suburban/             36 GLB + License.txt
  quaternius_ultimate_nature/       150 FBX + License.txt
  modular_terrain/                  304 OBJ + Materials_Modular_Terrain.mtl
  psx_buildings/                    1 FBX + texture 1024×1024
  abandoned_industrial_sampler/     20 GLB (GLB/Modules, GLB/Props) + Textures/ + ORM/ + README.txt
```
Les FBX, OBJ, STL, DAE, .blend et les rendus d'aperçu des archives d'origine **ont été retirés** quand un GLB équivalent existait (le jeu charge du glTF/GLB ; il sait aussi lire des FBX via `loadFbx()` de `assets.js`).

## Utilisation dans le jeu (pistes)
- **Banlieue survivante** : `kenney_city_suburban/house_type01…21` à la place ou en plus des maisons médiévales ; clôtures, allées, chemins, arbres.
- **Décor de rue / pillage** : `cenji_urban_props` (bennes, caisses, palettes, fûts, caddies, voitures-outils, panneaux…) : candidats pour les points de fouille (`lootSpots`) et pour l'habillage des routes.
- **Forêt et végétation** : `quaternius_ultimate_nature` (arbres morts, souches, troncs, rochers, herbe) pour remplacer les arbres cylindres + cônes ; versions enneigées si une zone froide est ajoutée ; `cenji_winter_nature` pour une carte d'hiver.
- **Usine / entrepôt abandonné** (intérieurs de zone industrielle) : `abandoned_industrial_sampler`.
- **Bâtiments modulaires** : `kenney_modular_buildings` pour assembler des immeubles ; `psx_buildings` pour un style PS1 (5 bâtiments dans un seul FBX).
- **Terrain** : `modular_terrain` (OBJ sans animation, matériaux par .mtl) pour falaises, grottes, mines, collines.
- Règles du projet : tout modèle utilisé doit être **préchargé** dans `game.js` (liste `list`), **normalisé** (les échelles des packs varient) et couvert par un test d'existence (`tests/assets.mjs`). Textures des GLB Kenney : `Textures/colormap.png` relatif au dossier du GLB.

## 1. cenji_urban_props — Cenji Urban Street Props Mega Pack (FREE) — 120 modèles GLB
Mobilier urbain low poly, textures de couleur unie (aucune texture externe). Orientation / échelle : mètres, Y haut. Sélection par famille (nom → taille L×H×P m).

- **Divers urbain** — distributeurs, fontaines, DAB, jardinières, bornes incendie, etc.
  `ATM_Detailed` 0.73×1.81×0.88 · `Announcement_Speaker_Pole` 0.5×2.98×0.69 · `Bike_Rack_Loops` 2×0.94×0.16 · `Bike_Rack_Straight` 1.76×0.81×0.16 · `Caution_Tape_Post` 1.45×1.13×0.3 · `Drinking_Fountain` 0.56×1.06×0.56 · `Fire_Hydrant` 0.62×0.83×0.44 · `Fountain_Public` 1.93×1.14×1.93 · `Info_Charging_Terminal` 0.55×2.15×0.4 · `Mailbox_Public` 0.48×1.24×0.59 · `Newspaper_Box` 0.56×1.21×0.51 · `Newspaper_Stand` 1.28×1.72×0.7 · `Planter_Decorative` 0.8×1.1×0.8 · `Planter_Street_Large` 1.69×1.06×0.75 · `Planter_Wall` 2.25×1.07×0.55 · `Public_Bike_Pump` 0.52×1.02×0.24 · `Scooter_Charging_Rack` 1.9×0.77×0.45 · `Vending_Machine_Detailed` 1.05×2.04×0.86
- **Caisses et stockage** — caisses, palettes, fûts, sacs — butin et décor
  `Barrel_Wood` 0.66×0.85×0.66 · `Basket_Cart_Rolling` 0.64×1.06×0.67 · `Cardboard_Box_Stack` 1.03×0.89×0.44 · `Cement_Bag_Stack` 1.14×0.67×0.39 · `Crate_Plastic` 0.69×0.45×0.69 · `Crate_Stack` 1.38×1.16×0.76 · `Crate_Wood` 0.7×0.58×0.76 · `Delivery_Hand_Truck` 0.52×1.18×0.57 · `Oil_Drum` 0.64×0.91×0.64 · `Pallet_Broken` 1.12×0.31×0.93 · `Pallet_Wood` 1.12×0.2×0.93 · `Rebar_Bundle` 0.25×0.25×2.2 · `Shopping_Cart` 0.8×1.06×0.99
- **Barrières** — barrières de foule, barricades, clôtures de chantier
  `Barricade_Striped` 1.65×0.99×0.72 · `Barrier_Metal_Crowd` 2.02×1.16×0.56 · `Barrier_Plastic` 1.8×0.95×0.56 · `Barrier_Post_Reflective` 0.5×1.21×0.5 · `Chain_Barrier_Post` 1.23×1.04×0.25 · `Fence_Portable` 2.4×1.88×0.28 · `Queue_Stanchion_Belt` 1.34×1.04×0.36
- **Mobilier** — bancs, tables et chaises de terrasse
  `Bench_Concrete_Modern` 1.9×1×0.64 · `Bench_Heritage` 1.98×1.12×0.79 · `Bench_Timber_Slat` 1.98×1×0.79 · `Bench_Transit` 2.15×1×0.79 · `Cafe_Chair` 0.5×0.93×0.52 · `Cafe_Table` 0.92×0.77×0.92 · `Cafe_Umbrella_Stand` 2.21×2.41×2.21 · `Picnic_Table` 1.85×0.8×1.76
- **Panneaux** — panneaux routiers, enseignes et tableaux d'affichage
  `Billboard_Small` 2.45×2.73×0.4 · `Detour_Sign_Stand` 0.95×1.3×0.75 · `Map_Kiosk_Detailed` 0.96×2.37×0.5 · `Menu_Board` 0.68×1.04×0.68 · `Notice_Board` 1.62×2×0.32 · `Sandwich_Board` 0.86×1.09×0.68 · `Shop_Sign_Blank` 1.8×0.8×0.14 · `Shop_Sign_Hanging` 1.36×1.36×0.16 · `Sidewalk_A_Frame` 0.68×1.04×0.68 · `Sign_Bus_Stop` 0.8×2.42×0.24 · `Sign_Construction` 0.8×2.5×0.24 · `Sign_No_Entry` 0.72×2.46×0.24 · `Sign_No_Parking` 0.8×2.42×0.24 · `Sign_Parking` 0.8×2.42×0.24 · `Sign_Pedestrian_Crossing` 0.8×2.5×0.24 · `Sign_Stop` 0.74×2.47×0.24 · `Sign_Street_Name` 1.2×2.4×0.24 · `Sign_Wet_Floor` 0.35×0.74×0.55 · `Sign_Yield` 0.8×2.4×0.24 · `Warning_Sign_Portable` 1.06×1.6×0.75
- **Voirie** — cônes, plaques, ralentisseurs, bornes, bouches d'égout, horodateurs
  `Bollard_Round` 0.26×0.97×0.26 · `Bollard_Square` 0.26×0.95×0.26 · `Curb_Ramp` 1.3×0.18×1.2 · `Manhole_Cover` 0.86×0.06×0.86 · `Parking_Meter` 0.31×1.5×0.27 · `Parking_Stop` 1.76×0.17×0.24 · `Pedestrian_Crossing_Pole` 0.42×2.88×0.44 · `Road_Divider_Concrete` 1.8×0.8×0.56 · `Speed_Bump_Segment` 1.2×0.11×0.5 · `Storm_Drain` 0.88×0.07×0.5 · `Traffic_Cone_Clean` 0.43×0.73×0.43 · `Traffic_Cone_Worn` 0.43×0.73×0.43 · `Traffic_Drum` 0.7×0.99×0.7 · `Traffic_Signal_Pole` 0.36×3.15×0.59
- **Outils** — outils et échafaudages
  `Broom` 0.34×1.37×0.1 · `Bucket` 0.38×0.54×0.38 · `Jackhammer` 0.61×0.97×0.21 · `Ladder_Folded` 0.58×2.1×0.36 · `Ladder_Step` 0.61×1.69×0.78 · `Maintenance_Cart` 0.87×1.05×0.68 · `Mop_Bucket` 0.47×0.87×0.47 · `Sawhorse_Pair` 1.72×0.79×0.92 · `Sawhorse_Road` 1.7×0.96×0.72 · `Scaffold_Platform` 2.23×2.3×1.15 · `Tool_Chest_Rolling` 1.18×1.11×0.66 · `Wheelbarrow` 0.83×0.76×1.44
- **Arrêts** — abris-bus et bornes de billets
  `Bus_Shelter_Compact` 2.86×2.75×1.69 · `Bus_Shelter_Detailed` 3.76×2.75×1.73 · `Ticket_Kiosk` 0.6×2×0.51
- **Réseaux** — poteaux, armoires électriques, générateur, caméras
  `CCTV_Pole` 0.36×3.08×1.05 · `CCTV_Wall` 0.28×0.48×0.82 · `Cable_Spool` 0.94×0.77×0.94 · `Electrical_Cabinet` 1.02×1.99×0.63 · `Fuse_Box` 0.46×0.69×0.27 · `Generator_Portable` 0.95×0.68×0.68 · `Transformer_Box` 1.7×1.24×1.05 · `Utility_Box_Large` 1.32×1.44×0.61 · `Utility_Box_Small` 0.62×0.91×0.43 · `Utility_Pole` 1.8×5×0.3
- **Déchets** — bennes, poubelles, tas d'ordures
  `Cigarette_Disposal_Stand` 0.28×1.14×0.28 · `Dog_Waste_Station` 0.4×1.7×0.35 · `Dumpster_Closed_Detailed` 1.78×1.3×1.04 · `Dumpster_Open_Detailed` 1.78×2.13×1.04 · `Loose_Garbage_Pile` 0.71×0.18×0.59 · `Park_Trash_Bin` 0.6×0.86×0.6 · `Recycling_Bin` 0.55×0.89×0.56 · `Trash_Bag_Pile` 0.87×0.61×0.67 · `Trash_Bin_Public` 0.6×0.86×0.6
- **Chantier** — accessoires de chantier
  `Construction_Fence_Gate` 2.4×1.88×0.28
- **Éclairage** — lampadaires et projecteurs de chantier
  `Lamp_Wall_Exterior` 0.4×0.65×0.61 · `Streetlight_Double` 0.36×3.91×2.49 · `Streetlight_Heritage` 0.6×4.24×0.6 · `Streetlight_Modern` 0.36×3.91×1.43 · `Worklight_Twin_Tripod` 1.04×2.07×0.78

Lecture des noms : `Detailed` = version détaillée ; `Heritage` = ancien / patrimonial ; `Modern` = moderne ; `Open`/`Closed` = ouvert/fermé ; `Worn` = usé ; `Stack` = pile ; `Pile` = tas ; `Pole` = poteau ; `Stand` = support ; `Portable` = mobile ; `Large`/`Small` = grand/petit.

## 2. cenji_winter_nature — Cenji LowPoly Winter Nature Pack (FREE) — 100 modèles GLB
Nature d'hiver (neige, glace). Numéro dans le nom = ordre dans le pack. Textures de couleur unie.

- **FROST** — amas et détails de givre
  `FROST_01_ClusterSmall` 0.74×0.41×0.18 · `FROST_02_ClusterMedium` 1.5×0.71×0.18 · `FROST_03_ClusterLarge` 2.6×1.42×0.18 · `FROST_04_HangingFrostStrip` 2.05×0.5×0.41 · `FROST_05_FrozenEdgeDetail` 1.88×0.69×0.39
- **HERO** — grandes pièces maîtresses (pin ancien, cascade gelée, grotte, arche de glace)
  `HERO_01_AncientSnowyPine` 11.93×16.56×11.68 · `HERO_02_FrozenWaterfall` 8.34×7.97×5.4 · `HERO_03_FrozenCaveEntrance` 7.26×5.6×5.64 · `HERO_04_LargeIceArch` 8.75×6.08×2.37
- **ICE** — étangs, ruisseaux et tuiles de glace
  `ICE_01_PondSmall` 4.7×0.54×3.35 · `ICE_02_PondMedium` 9.33×0.54×6.6 · `ICE_03_LakeTile` 4×0.28×4 · `ICE_04_ClearIceTile` 4×0.16×4 · `ICE_05_FrostedIceTile` 4×0.31×4 · `ICE_06_CrackedIceTile` 4×0.29×4 · `ICE_07_HeavyCrackedIceTile` 4.3×0.3×4 · `ICE_08_StreamStraight` 4×0.32×4 · `ICE_09_StreamCurve` 4×0.32×4 · `ICE_10_StreamJunction` 4×0.31×4 · `ICE_11_IceShoreline` 4.36×0.6×1.68 · `ICE_12_BrokenIceCluster` 3.15×0.42×2.26 · `ICE_13_PartiallyFrozenStream` 4×0.32×4
- **LOG** — souches, troncs tombés, racines
  `LOG_01_SnowyStump` 2.31×0.9×2.16 · `LOG_02_FallenLogSnowy` 4.83×0.76×1.04 · `LOG_03_FallenLogFrosted` 3.63×0.53×1.09 · `LOG_04_ExposedRootCluster` 3.24×0.84×3.34
- **PLANT** — herbes, fougères, buissons, roseaux, branches
  `PLANT_01_GrassSnowy` 1.08×0.83×0.88 · `PLANT_02_GrassFrozen` 0.92×0.81×0.92 · `PLANT_03_GrassDry` 1.1×0.83×1.12 · `PLANT_04_FernFrosted` 1.22×0.43×1.2 · `PLANT_05_BushSmall` 1.74×1.06×1.69 · `PLANT_06_BushMedium` 1.95×1.56×2.11 · `PLANT_07_BareShrub` 1.53×0.78×1.09 · `PLANT_08_FrostedShrub` 1.53×0.8×1.52 · `PLANT_09_WinterReeds` 1.27×1.58×1.37 · `PLANT_10_BranchSnowy` 1.61×0.15×0.78 · `PLANT_11_PineConeCluster` 0.49×0.34×0.5 · `PLANT_12_TwigClusterFrosted` 1.61×0.15×1.1
- **PROP** — clôtures, panneaux, ponts, banc, anneau de feu de camp, lanterne, bois de chauffage, abri
  `PROP_01_FenceStraightSnowy` 3.3×1.56×0.29 · `PROP_02_FenceCornerSnowy` 3.29×1.56×3.28 · `PROP_03_FenceBrokenSnowy` 3.29×1.56×0.82 · `PROP_04_WinterSignpost` 1.52×2.32×0.25 · `PROP_05_DirectionSignSnowy` 2.05×2.32×0.47 · `PROP_06_WoodFootbridgeSnowy` 7.4×1.47×2.4 · `PROP_07_LogBridgeSnowy` 7.4×1.47×2.4 · `PROP_08_WinterBench` 1.93×1.14×0.63 · `PROP_09_CampfireRingSnowy` 1.84×0.33×1.76 · `PROP_10_LanternPost` 1.04×2.6×0.48 · `PROP_11_FirewoodStackSnowy` 1.33×1.06×1.23 · `PROP_12_WoodShelterSnowy` 3.96×2.99×3.18
- **ROCK** — rochers, blocs, falaises, arche de pierre
  `ROCK_01_SmallSnowy` 1.19×0.77×0.96 · `ROCK_02_MediumSnowy` 2.4×1.4×1.64 · `ROCK_03_LargeBoulder` 3.7×2.45×3.03 · `ROCK_04_TallBoulder` 2.39×3.3×1.97 · `ROCK_05_FlatBoulder` 3.67×0.77×2.47 · `ROCK_06_FrostedBoulder` 2.93×1.68×1.96 · `ROCK_07_ClusterSmall` 1.89×0.95×2.24 · `ROCK_08_ClusterLarge` 3.86×2.13×3.44 · `ROCK_09_SnowyFormation` 3.7×2.63×3.59 · `ROCK_10_CliffSmall` 6.76×3.85×2.87 · `ROCK_11_CliffMedium` 9.62×6.11×4 · `ROCK_12_CliffLarge` 13.24×8.2×5.02 · `ROCK_13_CliffCorner` 8.98×5.69×6.53 · `ROCK_14_FrozenRockArch` 7.99×4.8×3.26 · `ROCK_15_IcyCliffFormation` 8.71×6.75×4.72
- **SNOW** — sols enneigés, chemins (droit/courbe/T/croisement), congères, collines
  `SNOW_01_GroundStandard` 4×0.32×4 · `SNOW_02_GroundPacked` 4×0.32×4 · `SNOW_03_GroundUneven` 4×0.49×4 · `SNOW_04_GroundSnowyDirt` 4×0.32×4 · `SNOW_05_PathStraight` 4×0.32×4 · `SNOW_06_PathCurve` 4×0.32×4 · `SNOW_07_PathTJunction` 4×0.31×4 · `SNOW_08_PathCrossroad` 4×0.31×4 · `SNOW_09_PathEnd` 4×0.32×4 · `SNOW_10_SnowbankSmall` 1.99×0.7×1.2 · `SNOW_11_SnowbankMedium` 4.05×1.3×1.87 · `SNOW_12_SnowbankLarge` 6.77×2.1×2.61 · `SNOW_13_SnowDrift` 5.1×1.3×2.03 · `SNOW_14_WindSweptDrift` 6.53×1.8×1.49 · `SNOW_15_HillSmall` 4.14×1.6×3.87 · `SNOW_16_HillMedium` 8.38×3.6×7.43 · `SNOW_17_FrozenDirtPatch` 4×0.32×4
- **TREE** — sapins, pins, arbres nus ou morts
  `TREE_01_PineLargeSnowy` 6.05×10.84×5.98 · `TREE_02_PineMediumSnowy` 4.42×7.43×4.22 · `TREE_03_PineSmallSnowy` 2.41×4.22×2.48 · `TREE_04_PineTallThin` 2.85×11.44×2.83 · `TREE_05_PineWide` 7.02×7.13×6.18 · `TREE_06_PineDense` 5.71×8.33×5.92 · `TREE_07_PineSparse` 4.59×8.73×4.54 · `TREE_08_PineYoung` 1.8×3.41×1.56 · `TREE_09_FirLargeSnowy` 5.14×10.04×4.93 · `TREE_10_FirMediumSnowy` 4.45×6.82×3.78 · `TREE_11_FirSmallSnowy` 2.31×4.32×2.75 · `TREE_12_EvergreenWindblown` 4.7×7.84×4.35 · `TREE_13_BareLarge` 4.15×9.29×4.58 · `TREE_14_BareMedium` 3.92×6.43×3.62 · `TREE_15_BareSmall` 2.34×3.89×2.18 · `TREE_16_TwistedWinter` 4.9×7.85×4.61 · `TREE_17_DeadSnowy` 4.39×7.72×4.05 · `TREE_18_BrokenDead` 3.44×4.5×3.59

## 3. kenney_modular_buildings — Kenney Modular Buildings — 108 modèles GLB (CC0)
Kit de façades à assembler sur une grille de 1 unité (murs 1×1, toits, fenêtres, portes). Texture : `Textures/colormap.png` (palette Kenney, référencée par les GLB) ; `Textures/variation-a.png` et `variation-b.png` sont deux teintes alternatives (à copier par-dessus `colormap.png` pour changer la couleur des bâtiments). Aperçu : `Preview (Variation B).png`.

- **building** — modules de façade : bloc, angles, fenêtres, portes, marches, 3 maisons et 4 tours d'exemple (`building-sample-*`)
  `building-block` 1×0.62×1 · `building-corner-bottom` 1×0.62×1 · `building-corner-top` 1×0.62×1 · `building-corner-window-middle` 1×0.62×1 · `building-corner-window-narrow` 1×0.62×1 · `building-corner-window-sill` 1×0.62×1 · `building-corner-window-top-round` 1×0.62×1 · `building-corner-window-top-square` 1×0.62×1 · `building-corner-window` 1×0.62×1 · `building-corner` 1×0.62×1 · `building-door-window-narrow` 1×0.62×1 · `building-door-window` 1×0.62×1 · `building-door` 1×0.62×1 · `building-edges-door` 1×0.62×1 · `building-sample-house-a` 1.1×1.14×2 · `building-sample-house-b` 1.09×1.98×2.2 · `building-sample-house-c` 2×1.98×2.2 · `building-sample-tower-a` 1.1×2.5×1.25 · `building-sample-tower-b` 1.1×1.89×1.25 · `building-sample-tower-c` 1.1×3.14×1.28 · `building-sample-tower-d` 1.1×3.76×1.1 · `building-steps-narrow-windows-round` 1×0.84×1.2 · `building-steps-narrow-windows` 1×0.84×1.2 · `building-steps-narrow` 1×0.84×1.2 · `building-steps-wide` 1×0.84×1.2 · `building-window-awnings` 1×0.62×1.13 · `building-window-balcony` 1×0.62×1.15 · `building-window-door-window-round` 1×0.62×1 · `building-window-door-window` 1×0.62×1 · `building-window-large-left` 1×0.62×1 · `building-window-large-middle` 1×0.62×1 · `building-window-large-right` 1×0.62×1 · `building-window-large` 1×0.62×1 · `building-window-left-sill` 1×0.62×1.05 · `building-window-left` 1×0.62×1 · `building-window-right-sill` 1×0.62×1.05 · `building-window-right` 1×0.62×1 · `building-window-sill` 1×0.62×1.05 · `building-window-wide-sill` 1×0.62×1.05 · `building-window-wide` 1×0.62×1 · `building-window` 1×0.62×1 · `building-windows-high-middle` 1×0.62×1 · `building-windows-high-top-round` 1×0.62×1 · `building-windows-high-top-square` 1×0.62×1 · `building-windows-round` 1×0.62×1 · `building-windows-sills-round` 1×0.62×1.05 · `building-windows-sills` 1×0.62×1.05 · `building-windows` 1×0.62×1
- **detail** — climatiseurs (`detail-ac-a/b`)
  `detail-ac-a` 0.24×0.11×0.24 · `detail-ac-b` 0.31×0.23×0.13
- **door** — portes brunes ou blanches (pleines, vitrées, avec fenêtre)
  `door-brown-glass` 0.25×0.5×0.05 · `door-brown-window` 0.25×0.5×0.05 · `door-brown` 0.25×0.5×0.05 · `door-white-glass` 0.25×0.5×0.05 · `door-white-window` 0.25×0.5×0.05 · `door-white` 0.25×0.5×0.05
- **roof** — toits : plats (bordures, auvents, détails), à pignon, inclinés
  `roof-flat-awning-a` 1×0.21×1.11 · `roof-flat-awning-b` 1×0.21×1.23 · `roof-flat-awning-c` 1×0.21×1.23 · `roof-flat-border-center-corner` 1×0.21×1 · `roof-flat-border-center` 1×0.21×1 · `roof-flat-border-corner-slanted-passage` 1×0.21×1 · `roof-flat-border-corner-slanted` 1×0.21×1 · `roof-flat-border-corner` 1×0.21×1 · `roof-flat-border-end` 1×0.21×1 · `roof-flat-border-side` 1×0.21×1 · `roof-flat-border-straight` 1×0.21×1 · `roof-flat-center` 1×0.11×1 · `roof-flat-corner-high` 1×0.21×1 · `roof-flat-corner` 1×0.11×1 · `roof-flat-detail-a` 1×0.21×1 · `roof-flat-detail-b` 1×0.21×1 · `roof-flat-detail-c` 1×0.21×1 · `roof-flat-detail-d` 1×0.21×1 · `roof-flat-top` 1.1×0.21×1.1 · `roof-gable-corner` 1.05×0.52×1.05 · `roof-gable-end` 1.09×0.52×1 · `roof-gable` 1.09×0.52×1 · `roof-slanted-corner-a` 1.14×0.78×1.14 · `roof-slanted-corner-b` 1.14×0.78×1.14 · `roof-slanted-corner-c` 1.14×0.78×1.14 · `roof-slanted-corner-inner` 1×0.72×1 · `roof-slanted-detail` 1×0.78×1.14 · `roof-slanted-flat` 1×0.11×1 · `roof-slanted-window` 1×0.78×1.14 · `roof-slanted` 1×0.78×1.14
- **window** — fenêtres brunes ou blanches (rondes, larges, hautes, détaillées…)
  `window-brown-detailed` 0.31×0.38×0.05 · `window-brown-large` 0.38×0.5×0.05 · `window-brown-narrow` 0.19×0.42×0.05 · `window-brown-round-low` 0.31×0.35×0.05 · `window-brown-round-middle` 0.31×0.62×0.05 · `window-brown-round-narrow` 0.19×0.42×0.05 · `window-brown-round-top` 0.31×0.47×0.05 · `window-brown-round-wide` 0.31×0.47×0.05 · `window-brown-tall` 0.31×0.5×0.05 · `window-brown-wide` 0.75×0.38×0.05 · `window-brown` 0.31×0.38×0.05 · `window-white-detailed` 0.31×0.38×0.05 · `window-white-large` 0.38×0.5×0.05 · `window-white-narrow` 0.19×0.42×0.05 · `window-white-round-low` 0.31×0.35×0.05 · `window-white-round-middle` 0.31×0.62×0.05 · `window-white-round-narrow` 0.19×0.42×0.05 · `window-white-round-top` 0.31×0.47×0.05 · `window-white-round-wide` 0.31×0.47×0.05 · `window-white-tall` 0.31×0.5×0.05 · `window-white-wide` 0.75×0.38×0.05 · `window-white` 0.31×0.38×0.05

## 4. kenney_city_suburban — Kenney City Kit (Suburban) — 36 modèles GLB (CC0)
Maisons et éléments de banlieue, couleurs unies par matériau (pas de texture externe). Les maisons font environ 1×0,7×0,9 unité (à mettre à l'échelle ×8 à ×10 pour une maison jouable de ~9 m).

- **driveway** — allées de garage
  `driveway_long` 0.36×0.01×0.4 · `driveway_short` 0.36×0.01×0.2
- **fence** — clôtures (9 tailles/formes)
  `fence_large` 1.2×0.27×1.2 · `fence_medium` 0.8×0.27×0.8 · `fence_open` 1.2×0.16×0.8 · `fence_rectangle` 1.2×0.27×0.8 · `fence_short` 1.2×0.27×0.4 · `fence_small` 0.8×0.27×0.4 · `fence_wide` 1.6×0.27×0.4
- **house** — 21 maisons de banlieue complètes (type01 à type21)
  `house_type01` 1.3×0.74×0.92 · `house_type02` 1.31×1.14×1.41 · `house_type03` 1.71×1.14×0.92 · `house_type04` 1.29×0.74×0.92 · `house_type05` 1.31×0.74×1.31 · `house_type06` 1.3×1.14×1.32 · `house_type07` 1.3×0.74×0.92 · `house_type08` 1.74×1.2×1.01 · `house_type09` 1.3×0.83×0.92 · `house_type10` 1.81×1.14×1.4 · `house_type11` 1.26×1.14×1.09 · `house_type12` 1.3×1.14×1.01 · `house_type13` 1.35×1×0.92 · `house_type14` 1.31×1.03×0.92 · `house_type15` 0.9×1.15×0.9 · `house_type16` 0.92×1.14×0.9 · `house_type17` 1.41×1.14×1.11 · `house_type18` 1.25×1.14×0.92 · `house_type19` 1.2×0.85×0.81 · `house_type20` 1.2×0.85×0.81 · `house_type21` 0.86×1.03×0.9
- **path** — chemins dallés
  `path_long` 0.2×0.01×0.4 · `path_short` 0.2×0.01×0.2 · `path_tilesLong` 0.14×0.01×0.4 · `path_tilesShort` 0.14×0.01×0.2
- **tree** — arbres (grand/petit)
  `tree_large` 0.26×0.95×0.3 · `tree_small` 0.26×0.7×0.3

## 5. quaternius_ultimate_nature — Ultimate Nature Pack by Quaternius — 150 modèles FBX (CC0)
Végétation et rochers low poly (couleurs de sommet / matériaux simples). Chaque espèce existe en plusieurs variantes numérotées (`_1`, `_2`…). Charger avec `loadFbx()` (échelle FBX d'origine à contrôler ; ces fichiers sont déjà en mètres). Les variantes `_Snow`, `_Autumn`, `_Dead`, `_Moss` sont des déclinaisons de saison / d'état.

- **BirchTree** — bouleau : 5 variantes (_1 à _5), taille 1.15–1.7 × 3.56–5.01 × 1.69–3.29 m
- **BirchTree_Autumn** — bouleau d'automne : 5 variantes (_1 à _5), taille 1.15–1.7 × 3.56–5.01 × 1.69–3.29 m
- **BirchTree_Dead** — bouleau mort : 5 variantes (_1 à _5), taille 0.48–0.72 × 2.25–4.37 × 0.81–2.6 m
- **BirchTree_Dead_Snow** — bouleau mort enneigé : 5 variantes (_1 à _5), taille 0.48–0.72 × 2.25–4.37 × 0.81–2.6 m
- **BirchTree_Snow** — bouleau enneigé : 5 variantes (_1 à _5), taille 1.15–1.7 × 3.59–5.06 × 1.69–3.29 m
- **BushBerries** — buisson à baies : 2 variantes (_1 à _2), taille 1.34–1.39 × 1.13–1.28 × 1.33–1.72 m
- **Bush** — buisson : 2 variantes (_1 à _2), taille 1.33–1.35 × 1.11–1.24 × 1.33–1.69 m
- **Bush_Snow** — buisson enneigé : 2 variantes (_1 à _2), taille 1.36–1.39 × 1.16–1.28 × 1.36–1.78 m
- **CactusFlower** — cactus fleuri (1 fleur) : 1 modèle, taille 0.88 × 0.36 × 0.87 m
- **CactusFlowers** — cactus fleuri : 4 variantes (_2 à _5), taille 0.11–0.77 × 0.94–1.94 × 0.73–1.28 m
- **Cactus** — cactus : 5 variantes (_1 à _5), taille 0.11–0.7 × 0.88–1.7 × 0.56–1.05 m
- **CommonTree** — arbre commun (chêne) : 5 variantes (_1 à _5), taille 1.28–1.89 × 2.48–3.46 × 1.56–2.77 m
- **CommonTree_Autumn** — arbre commun d'automne : 5 variantes (_1 à _5), taille 1.28–1.89 × 2.48–3.46 × 1.56–2.77 m
- **CommonTree_Dead** — arbre commun mort (parfait pour une ambiance apocalypse) : 5 variantes (_1 à _5), taille 0.64–1.33 × 2.22–3 × 0.81–2.12 m
- **CommonTree_Dead_Snow** — arbre mort enneigé : 5 variantes (_1 à _5), taille 0.64–1.33 × 2.22–3 × 0.81–2.12 m
- **CommonTree_Snow** — arbre commun enneigé : 5 variantes (_1 à _5), taille 1.28–1.89 × 2.51–3.47 × 1.56–2.77 m
- **Corn** — maïs (champ) : 2 variantes (_1 à _2), taille 0.82 × 1.98 × 1.09 m
- **Flowers** — fleurs : 1 modèle, taille 0.49 × 0.83 × 0.61 m
- **Grass** — touffe d'herbe : 2 variante(s) _Grass…_2, taille 0.32–0.37 × 1.01–1.2 × 0.33–0.44 m
- **Grass_Short** — herbe courte : 1 modèle, taille 0.32 × 0.4 × 0.44 m
- **Lilypad** — nénuphar : 1 modèle, taille 1.2 × 0.22 × 1.19 m
- **PalmTree** — palmier : 4 variantes (_1 à _4), taille 2.32–2.88 × 2.91–4.47 × 2.51–3.18 m
- **PineTree** — pin : 5 variantes (_1 à _5), taille 1.25–2.16 × 2.69–3.56 × 1.34–1.96 m
- **PineTree_Autumn** — pin d'automne : 5 variantes (_1 à _5), taille 1.25–2.16 × 2.69–3.56 × 1.34–1.96 m
- **PineTree_Snow** — pin enneigé : 5 variantes (_1 à _5), taille 1.25–2.16 × 2.69–3.56 × 1.34–1.96 m
- **Plant** — plante : 5 variantes (_1 à _5), taille 0.69–1.91 × 0.51–1.77 × 0.69–2.12 m
- **Rock** — rocher : 7 variantes (_1 à _7), taille 0.49–0.91 × 0.65–0.88 × 0.47–1.25 m
- **Rock_Moss** — rocher moussu : 7 variantes (_1 à _7), taille 0.49–0.91 × 0.56–0.95 × 0.47–1.25 m
- **Rock_Snow** — rocher enneigé : 7 variantes (_1 à _7), taille 0.49–0.91 × 0.58–0.98 × 0.47–1.25 m
- **TreeStump** — souche : 1 modèle, taille 1.36 × 0.62 × 1.03 m
- **TreeStump_Moss** — souche moussue : 1 modèle, taille 1.36 × 0.62 × 1.03 m
- **TreeStump_Snow** — souche enneigée : 1 modèle, taille 1.36 × 0.62 × 1.03 m
- **Wheat** — blé (champ) : 1 modèle, taille 0.36 × 1.1 × 0.36 m
- **Willow** — saule : 5 variantes (_1 à _5), taille 1.01–2.19 × 2.35–3.39 × 1.98–3.11 m
- **Willow_Autumn** — saule d'automne : 5 variantes (_1 à _5), taille 1.01–2.19 × 2.35–3.39 × 1.98–3.11 m
- **Willow_Dead** — saule mort : 5 variantes (_1 à _5), taille 0.31–1.17 × 1.91–2.84 × 1.58–2.59 m
- **Willow_Dead_Snow** — saule mort enneigé : 5 variantes (_1 à _5), taille 0.31–1.17 × 1.91–2.84 × 1.58–2.59 m
- **Willow_Snow** — saule enneigé : 5 variantes (_1 à _5), taille 1.01–2.19 × 2.41–3.46 × 1.98–3.16 m
- **WoodLog** — bûche / tronc : 1 modèle, taille 0.63 × 0.75 × 2.67 m
- **WoodLog_Moss** — tronc moussu : 1 modèle, taille 0.9 × 0.69 × 2.67 m
- **WoodLog_Snow** — tronc enneigé : 1 modèle, taille 0.63 × 0.58 × 2.49 m

## 6. modular_terrain — Modular Terrain Collection — 304 modèles OBJ (licence non fournie)
Pièces de terrain modulaires (grille 1×1, 2×2, 3×3, 4×4 : le suffixe `NxN` donne l'emprise ; `Base` / `Mid` / `Top` = étages d'un mur de falaise empilable). Un seul `.mtl` pour tout le pack (`Materials_Modular_Terrain.mtl`).

- **Beach_Prop** — accessoires de plage (cocotier, coquillage, étoile de mer, coffre au trésor, pontons) : 14 pièces, de 0.11×0.03×0.12 à 3.42×4.12×3.31 m (ex. `Beach_Prop_Coconut_1`)
- **Beach_Terrain** — sable : sol, bords, coins, transitions : 14 pièces, de 1×0×1 à 6×1×7.5 m (ex. `Beach_Terrain_Sand_Corner_Inner_2x2`)
- **Cave_Cliff** — entrées de grotte dans la falaise : 4 pièces, de 0.75×1×1 à 1.5×2×1 m (ex. `Cave_Cliff_Terrain_Entrance_Flat_Base`)
- **Cave_Prop** — mine : rails (droit/courbe/aiguillage), wagonnet, lampe, stalagmites, boisages : 42 pièces, de 0.1×0.06×0.2 à 2.49×2.15×4 m (ex. `Cave_Prop_Entrance_1`)
- **Cave_Terrain** — sol, collines et parois de grotte : 38 pièces, de 0×0×1 à 4×1.5×5 m (ex. `Cave_Terrain_Corner_Inner_1x1_Base`)
- **Cliff_Prop** — pont de corde, rocher : 5 pièces, de 1×0.78×0.11 à 2×2.1×3.34 m (ex. `Cliff_Prop_Bridge_Rope_End`)
- **Cliff_Terrain** — falaises : angles, pentes, escaliers, cascade : 41 pièce, de 0.25×0.7×0 à 3×2.2×4 m (ex. `Cliff_Terrain_Corner_Inner_1x1_Base`)
- **Escarpment_Terrain** — escarpement : coins, pentes, crêtes : 25 pièces, de 0×0.5×0.39 à 3×2.2×3 m (ex. `Escarpment_Terrain_Corner_Inner_1x1_Base`)
- **Hilly_Prop** — collines : ponts en rondins, branches, clôtures, ruines (piliers), arbres, rochers : 74 pièces, de 0.07×0.14×0.05 à 4.14×5×3.15 m (ex. `Hilly_Prop_Branch_1`)
- **Hilly_Terrain** — collines herbeuses : sol, pentes, angles, chemins : 36 pièces, de 0.5×0×0.5 à 4×2×5 m (ex. `Hilly_Terrain_Grass_Floor`)
- **Mountain_1** — montagne (modèle 1) : 1 pièce, de 5×6.85×5 à 5×6.85×5 m (ex. `Mountain_1`)
- **Mountain_2** — montagne (modèle 2) : 1 pièce, de 5×6.83×5 à 5×6.83×5 m (ex. `Mountain_2`)
- **Mountain_3** — montagne (modèle 3) : 1 pièce, de 5×6.2×5 à 5×6.2×5 m (ex. `Mountain_3`)
- **Mountain_4** — montagne (modèle 4) : 1 pièce, de 5×5.87×5 à 5×5.87×5 m (ex. `Mountain_4`)
- **Shared_Prop** — accessoires communs : 6 pièces, de 0.88×0.75×0.88 à 1.22×3.27×1.01 m (ex. `Shared_Prop_Boulder_1`)
- **Shared_Terrain** — éléments communs : terre, chemins, transitions : 2 pièces, de 1×0.05×1 à 1.5×0.05×1.5 m (ex. `Shared_Terrain_Dirt_Gathered_Corner`)

Sens des noms : `Corner_Inner/Outer` = angle rentrant/sortant ; `Side_Gentle/Sharp` = pente douce/raide ; `Transition_*` = raccord entre deux pentes ; `Floor_Raised` = sol surélevé ; `Steps` = escalier ; `Prop` = objet de décor posé sur le terrain.

## 7. psx_buildings — PSX Buildings — 1 FBX + 1 texture (licence non fournie)
`PSX_Buildings.fbx` contient 5 bâtiments dans le style PlayStation 1 (textures basse résolution, sommets non lissés) : objets nommés `Building_A`, `Building_B`, `Building_C`, `Building_D`, `Building_E` dans le fichier. Texture : `T_Buildings_Textures.png` (1024×1024 ; le FBX pointe vers un chemin Windows d'origine, à rediriger vers ce PNG par `LoadingManager.setURLModifier` comme pour les maisons médiévales). Tailles non mesurées (FBX binaire) : à normaliser au chargement avec `Box3`.

## 8. abandoned_industrial_sampler — Abandoned Industrial Interior Kit (échantillon gratuit) — 20 modèles GLB
Échantillon de 20 modèles du kit payant. Textures PBR 1024 px dans `Textures/` (couleur) et `ORM/` (occlusion / rugosité / métal) rangées par `Trims`, `Props`, `Tiling` ; chaque matériau porte le nom de son jeu de textures. Y haut, 1 unité = 1 m. `README.txt` = notice d'origine (contact : cholak.apps@gmail.com).

- **MOD** — modules de structure (taille en mètres dans le nom : `_4m`, `_8m`)
  `AIK_MOD_Catwalk_Corner` (angle de passerelle) 1×0.15×1 · `AIK_MOD_Ceiling_Panel_4m` (panneau de plafond 4 m) 4×0.03×4 · `AIK_MOD_Lift_Gate` (porte de monte-charge) 1.2×2.1×0.07 · `AIK_MOD_Pipe_DN100_FlangePair` (paire de brides de tuyau DN100) 0.1×0.22×0.22 · `AIK_MOD_Column_Concrete_8m` (colonne béton 8 m) 1×8×0.46 · `AIK_MOD_Wall_Brick_Shutter_4m` (mur de brique avec rideau métallique 4 m) 4×4×0.3
- **LG** — grands props (IBC, perceuse à colonne, transformateur, conduit tombé)
  `AIK_LG_Duct_Fallen` (conduit de ventilation tombé) 1.53×0.85×0.66 · `AIK_LG_Transformer` (transformateur) 1.25×1.5×0.68 · `AIK_LG_DrillPress` (perceuse à colonne) 0.5×1.73×0.86 · `AIK_LG_IBC` (cuve IBC 1000 L) 1.21×1.16×1.01
- **MD** — props moyens (fût 200 L, enclume, banc-vestiaire, pneu de camion, bâche)
  `AIK_MD_Tyre_Truck` (pneu de camion) 0.84×0.25×0.84 · `AIK_MD_Anvil` (enclume) 0.68×0.82×0.53 · `AIK_MD_Bench_Locker` (banc-vestiaire) 1.61×0.49×0.34 · `AIK_MD_Drum_200L` (fût 200 L) 0.57×0.88×0.57 · `AIK_MD_Tarp_Heap` (tas de bâches) 1.12×0.33×0.87
- **SM** — petits props (balai, mug émaillé, bobine de câble, éclats de verre, lampe suspendue)
  `AIK_SM_GlassShards` (éclats de verre) 0.65×0.01×0.54 · `AIK_SM_CableSpool_Small` (petite bobine de câble) 0.26×0.3×0.3 · `AIK_SM_Lamp_EnamelPendant_Drop1m` (lampe suspendue émaillée (chute 1 m)) 0.43×1.31×0.43 · `AIK_SM_Broom` (balai) 0.3×1.5×0.05 · `AIK_SM_Mug_Enamel` (mug émaillé) 0.12×0.1×0.09

## Remarques techniques
- Les GLB Cenji et Kenney Suburban n'ont pas de texture externe : matériaux de couleur unie, compatibles avec les matériaux Lambert partagés d'`assets.js`.
- Les GLB Kenney Modular référencent `Textures/colormap.png` (dossier `Textures/` à côté des GLB) : conserver cette arborescence.
- Poids : environ 110 Mo au total (Industrial ≈ 55 Mo de textures, Winter ≈ 32 Mo). Penser à l'allègement mobile (réduire les textures à 512 px) avant de brancher les packs.
- Rien n'a encore été chargé dans three.js : tailles et orientations à vérifier en jeu.