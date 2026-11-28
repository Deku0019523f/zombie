# Plan — territoire x3, zones, véhicules, PNJ (suite de plan.md)

## Phase 1 — FAIT : territoire x3, 5 zones, chargement progressif, carte
- `WORLD.half` 56 → 168 (336 x 336 m). Zones (`zones.js`) : village au centre (demi-côté 72), forêt NO (cabane de départ), industrielle NE, ferme SE, carrière SO. `zoneAt(x,z)`, `groundColor()` (dégradé ~14 m entre zones).
- Décor propre à chaque zone (`layout.js`) : arbres, rochers, petits objets, conteneurs, châteaux d'eau, maisons isolées selon la zone.
- Chargement progressif (`world.js`) : maisons / objets / herbe rangés par blocs de 48 m ; on construit le bloc du joueur tout de suite, puis les plus proches (rayon 2), on libère au-delà de 3. Arbres et rochers instanciés globalement.
- Carte (`map.js`) : mini-carte ronde + carte plein écran (touche M / bouton), zones, routes, maisons, cabane, véhicules, joueur.

## Phase 2 — FAIT : véhicules conduisibles (`vehicles.js`)
- 6 types (Pickup, Truck, Sports + versions blindées) : vitesse max, accélération, braquage, points de vie.
- Bouton « Conduire » près d'un véhicule, « Descendre » au volant. Joystick : haut = accélérer, bas = freiner / reculer, côtés = tourner.
- Collisions avec dégâts, écrasement des zombies, épave à 0 PV, sauvegarde / chargement des véhicules.
- Sentier dégagé entre la cabane et la route ; un pick-up garé devant la cabane ; 22 autres sur les routes (points bleus sur la carte).
- Limites : pas de carburant (usure seulement), pas de son de moteur, joueur à l'abri des zombies au volant, étages des maisons inaccessibles.

## Phase 3 — FAIT : PNJ avec métiers (`npcs.js`, `trade.js`)
- Gangs (5 camps hostiles : 3 pillards, 2 tireurs, 1 chien ; barricades / cônes / fûts), police (2 postes de contrôle sur l'axe est-ouest), marchands (étals avec échange par troc : général, ferme, armes).
- Personnages utilisés : Lis, Sam, Shaun, Matt, GermanShepherd (chien).
- Limites : gangs non hostiles à la police / aux zombies ; marchands et policiers non attaquables.

## Phase 4 — EN COURS : intégrer les assets de `assets/nouveau` (licences : dépôt à passer en privé)
- FAIT (4a) : Quaternius Ultimate Nature : rochers réels (7 variantes instanciées, cassables), buissons (3 variantes), souches, champs de blé/maïs (6 champs en zone ferme), arbres détaillés remplaçant les arbres simples dans 34 m autour du joueur (pool de 36).
- Reste : props Cenji (butin / rues), maisons Kenney (échelle ~x8-10), props industriels (zone industrielle), psx_buildings / modular_terrain.
- Poids mobile : textures à réduire (512 px), vérifier la fluidité sur téléphone.

## Rappel
- Révoquer le jeton GitHub une fois le travail terminé.
