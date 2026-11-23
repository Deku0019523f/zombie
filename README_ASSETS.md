# Assets 3D — Dernier Rempart (v4)

Sources (CC0, Quaternius) : Zombie Apocalypse Kit, Medieval Village MegaKit [Standard], survivant_pack.
Version allégée pour mobile (≈ 26 Mo). À copier à la racine du dépôt : `assets/models/...`

| Dossier | Contenu | Format |
|---|---|---|
| models/characters | 4 zombies (Basic, Chubby, Arm, Ribcage), 4 survivants avec arme (Matt, Lis, Sam, Shaun), 1 chien | glTF animé (textures embarquées 512 px) |
| models/weapons | Axe, Knife, Pistol, Shotgun, SMG, Rifle, Spear, battes, guitare | glTF |
| models/vehicles | Pickup, Sports, Truck (+ blindés) | glTF |
| models/environment | rues, conteneurs, barils, cônes, feux, château d'eau… | glTF |
| models/village | 43 pièces modulaires (murs, portes, toits, clôtures…) ; textures couleur 512 px, normales/ORM remplacées par 4x4 | glTF + .bin |
| models/props | 40 objets du pack survivant (trousse de soin, bidon, batterie, revolvers, torche, tente…) convertis OBJ → GLB par `obj2glb.py` | GLB couleurs unies |

Animations des zombies : Idle, Walk, Run, Run_Attack, Idle_Attack, Punch, HitReact, Death, Crawl.
Animations des survivants : Idle, Idle_Gun, Walk, Walk_Gun, Run, Run_Gun, Slash, Stab, Punch, HitReact, Death, Jump...
