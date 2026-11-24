# Assets 3D — Dernier Rempart (v4)

Sources (CC0, Quaternius) : Zombie Apocalypse Kit, Medieval Village MegaKit [Standard], pack « survivant », Ultimate Crops Pack.
Version allégée pour mobile (≈ 26 Mo). Les fichiers binaires (glTF/GLB/PNG) se versionnent avec git en local : les outils GitHub de l'assistant n'envoient que du texte.

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

Non utilisés (volontairement) : le pack « Free Urban Zombie Sprite Sheet » (sprites 2D pixel art, incompatible avec un rendu 3D).
