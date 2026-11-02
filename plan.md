# Plan — structure détaillée du projet Dernier Rempart (ex-Zombie Survival)

> Mis à jour pour la v3.0.0 (2026-11-02). Les ajouts v2.2.0 à v3.0.0 sont listés après l'arbre.

```
zombie/
├── index.html            canvas #canvas + HUD (santé, arme/munitions, score, vague, pause) + toast
│                         + commandes tactiles (joystick, boutons arme/recharge, bouton de tir rouge)
│                         + overlay (menu / pause / game over). Charge js/main.js (type=module).
├── css/
│   └── style.css         Colonne portrait centrée, HUD, joystick, bouton rouge, overlay.
│                         Joystick et bouton de tir masqués si souris (hover:hover + pointer:fine).
├── js/
│   ├── main.js           Entrée : initRender, ResizeObserver, boutons, pause auto, boucle rAF.
│   ├── game.js           initGame / startGame / pause / resume / confirm / update(dt).
│   ├── state.js          Objet `state` unique + resetState().
│   ├── config.js         PLAYER, WEAPONS, ZOMBIES, WAVES, DROPS, LOGICAL_WIDTH (équilibrage).
│   ├── input.js          Clavier (e.code), souris (visée + clic), joystick tactile (moitié gauche),
│   │                     bouton de tir rouge (visée auto), multi-touch.
│   ├── player.js         Déplacement, visée (souris ou zombie le plus proche), clampPlayer().
│   ├── weapons.js        Tir continu (cadence), plombs/dispersion, rechargement, changement d'arme.
│   ├── bullets.js        Déplacement par sous-pas + collisions balle/zombie.
│   ├── zombies.js        spawnZombie, poursuite, séparation, dégâts, mort, hurtPlayer.
│   ├── pickups.js        Drops soin/munitions, durée de vie, collecte.
│   ├── waves.js          Composition des vagues, apparition, intermission, déblocage d'armes.
│   ├── effects.js        Particules de sang, flaques, tremblement, flash de tir (logique pure).
│   ├── render.js         Rendu canvas : fond + décor (hors écran), entités triées par y, balles,
│   │                     particules, feu du baril, gyrophares, flash rouge. Lit `state` seulement.
│   ├── sprites.js        Sprites pixel art générés en code (joueur, 4 zombies, 2 frames + flash).
│   ├── ui.js             HUD HTML, toast, overlay (ready / paused / over).
│   ├── i18n.js           Dictionnaires FR/EN, t(), bascule de langue.
│   ├── audio.js          Effets WebAudio, muet.
│   ├── storage.js        localStorage sécurisé (record, muet, langue).
│   ├── dom.js            Références DOM (#game, #canvas, $()).
│   └── util.js           clamp(), rand().
├── assets/
│   ├── cover.jpg         Illustration « Dernier Rempart » (chargement + fond du menu)
├── tests/
│   └── smoke.mjs         Simulation headless (DOM factice) : vagues, armes, bornes, pause.
├── package.json         type=module ; scripts start / test.
├── README.md             Présentation et mode d'emploi.
├── RAPPORT.md            Mémoire du projet (état, historique, problèmes/solutions).
├── plan.md               Ce fichier.
└── .gitignore
```

## Graphe de dépendances (simplifié)
```
main ─► game ─► player, weapons, bullets, zombies, pickups, waves, effects, ui, storage, audio
        main ─► render ─► sprites, pickups (taille), state, config
                 zombies ─► pickups ─► ui ;  zombies ─► effects
                 waves ─► zombies, ui ;  bullets ─► zombies
                 tous ─► state, config, util
```
La logique n'importe jamais `render.js` (séparation logique / affichage).

## Coordonnées
Arène logique de **360 px de large**, hauteur = hauteur de l'écran ramenée à cette échelle. `resizeCanvas()` fixe `state.w/h` et la résolution du canvas (devicePixelRatio ≤ 2). Le fond est reconstruit à chaque redimensionnement.

## Ordre d'exécution d'une frame
`update(dt)` (si en jeu) : joueur → armes → balles → zombies → pickups → vagues → effets → fin de partie.
Puis, toujours : `renderHud()` (HTML) et `render(t)` (canvas), y compris en pause.

## Phases
`ready` → `playing` ⇄ `paused` → `over` → `playing` (rejouer)

## Équilibrage de référence
- Vague n : `round(4 + 2.5n)` zombies (+ `n/5` boss si n multiple de 5)
- Runners dès la vague 2, tanks dès la vague 4
- Armes : shotgun vague 3, SMG vague 5
- Bonus de fin de vague : `50 × n`

## Ajouts v2.2.0 (variété de gameplay)
- `js/layout.js` : `computeSolids(W,H)` (voiture, baril en feu, caisses, voiture de police), `makeBarrels`, `pushOut` (cercle vs rectangle), `hitsSolid`
- `js/stats.js` : `computeStats(perks)` → dmg, rate, speed, maxHp, reload, pierce, vamp, magnet, ammo, armor, grenadeCd, blast
- `js/combat.js` : explosions, barils, grenade, acide, bombe nucléaire
- `js/perks.js` : `rollChoices(n)`, `applyPerk(id)` ; `game.js` : `openPerks`, `choosePerk`
- `config.js` : ZOMBIES (+ spitter/exploder/charger), AI, THEMES, DROPS, POWER, GRENADE, COMBO, PERKS
- Phases : `ready` → `playing` ⇄ `paused` → `perk` (choix après chaque vague) → `over`
- États de vague : intermission | spawning | cleared | perkwait
- Thèmes (dès la vague 3, jamais sur un boss) : horde, blindés, nuit, ravitaillement, blitz
- Zombies : walker, runner (v2), cracheur (v3), explosif (v4), tank (v4), chaîneur (v6), boss (toutes les 5 vagues)

## Ajouts v2.3.0 (chargement et personnages externes)
- `index.html` : `#loader` (illustration + barre) avant l'overlay ; `#ovKicker` dans le menu
- `js/loader.js` : `runLoader()` précharge `assets/cover.jpg` ; durée minimale 1,6 s
- `css/style.css` : `.loader*`, `.overlay.menu`, `.ov-kicker`
- Titre menu : `startTitle` = `DERNIER|REMPART` (séparateur `|` → deux lignes, 2e en couleur d'accent)

## v2.4.0 — ajouts
- `js/campaign.js` : `LEVELS` (10 niveaux : waves, from, themes[], boss, kit), `starsFor(hpRatio)`, `levelById`
- `js/screens.js` : tous les écrans hors partie (main, campaign, settings, howto, paused, over, victory), navigation avec pile (`showScreen`, `backScreen`, `primaryAction`), actions injectées par `main.js` (`setScreenActions`)
- `js/weapons.js` : modes de tir (`modeOf`, `setMode`, `cycleMode`, `loadModes`, `cancelFire`), `discharge()` (une détente), `updateTrigger()` (semi / auto / rafale / charge)
- `js/config.js` : `range` et `modes` par arme, `FIRE_MODES`, amélioration `range`
- `js/storage.js` : `getProgress/setProgress/clearProgress`, `getModes/setModes`, `getSettings/setSettings`
- `js/game.js` : `startGame(mode, niveau)`, `goMenu`, `winLevel` (étoiles + déblocage + sauvegarde)
- `js/waves.js` : `waveNo` (n° dans le niveau), thèmes imposés et boss de fin de niveau en campagne, états `won` / `ended`
- Retiré : `assets/sprites/`, `tools/`, `MESHY.md`

## v2.5.0 — ajouts
- `js/objectives.js` : `setupGenerator`, `genPull`, `damageGen`, zone (`startZone` / `updateZone`), survivant (`startRescue` / `updateRescue`), allié (`updateAlly`), `startWaveObjectives(n, isBoss)`, `endWaveObjectives`, `updateObjectives(dt)` — état dans `state.gen / zone / surv / ally`
- `js/events.js` : `scheduleEvent`, `fireEvent('ambush' | 'blackout' | 'airdrop')`, `updateEvents(dt)` (aussi la fin du noir provoqué)
- `js/spots.js` : `freeSpot(minFrom)` (emplacement libre hors obstacles), utilisé par pickups / événements / objectifs
- `js/config.js` : `DASH`, `CRIT`, `KB_RES`, `ELITE`, `EVENTS`, `OBJ`, `ALLY`, `INFUSE`, `STREAKS`, `COINS`, `META`, `SYNERGIES` ; zombie `summoner` ; perks `crit`, `dash`, `glass`, `berserk`, `pact` (risk) ; `kb` par arme
- `js/stats.js` : `setMeta`, `activeSynergies`, `computeStats` (critZone, critMult, dashCd, coin, regen, syn…)
- `js/zombies.js` : élites (`makeElite`), invocateur, `damageZombie(z, dmg, vx, vy, {crit, kb, num, quiet})`, brûlure, soigneur, anti-blocage, ciblage du générateur, pièces, séries de kills
- `js/player.js` : `startDash` / `updateDash` ; `js/bullets.js` : critiques + effets d'infusion ; `js/weapons.js` : `kb`, `fx`, `tier` sur les balles
- `js/pickups.js` : `spawnInfuse`, bonus `fire` / `volt` / `drop` ; `js/perks.js` : `synergyFor`, tirage pondéré, `rollChoices(n, {safe})`, `applyPerk` renvoie les synergies activées
- `js/game.js` : `bankRun`, `reloadMeta`, minuteurs (esquive, infusion, régénération), hit-stop ; `js/storage.js` : `getCoins / setCoins / addCoins`, `getMeta / setMetaStore`
- `js/screens.js` : écran `workshop` (Atelier), pièces gagnées sur défaite / victoire, puces d'objectif sur la carte ; `js/ui.js` : `banner()`, bouton d'esquive, pièces, étiquettes « RISQUÉ » / « Synergie »
- `js/render.js` : générateur, zone, survivant, allié, traînée d'esquive, éclairs, halo des élites, brûlure ; `js/sprites.js` : invocateur, allié teinté
- `index.html` : `#btnDash` (+ `#dashCd`), `#banner`, `#coins` ; `css/style.css` : bannières, atelier, perks risqués / synergie
- `campaign.js` : champ `obj` par niveau (2 rescue · 3 zone · 4 generator · 6 zone · 7 generator · 8 rescue · 9 generator · 10 zone)
- Ordre de frame (ajouts) : … `updatePickups` → `updateObjectives` → `updateEvents` → `updateWaves` → `updateEffects` ; `update()` ralentit le temps pendant `state.hitStop`

## v3.0.0 — mode Ville (fichiers ajoutés)
- `js/citymap.js` : données pures (ZONES, `zoneAt`, `buildCityMap()` → solids, barrels, checkpoints, supplies, caches, start) ; monde 1080 x 1240
- `js/cityart.js` : `buildCityBackground(map)` → canvas hors écran (sols, rues, bâtiments, véhicules, arbres)
- `js/city.js` : `updateCity` (zone courante, population, checkpoints, ravitaillements, caches, paliers d'amélioration), `updateCamera`, `saveCity` / `restoreCity`, `alertNoise`
- Modifiés : `state.js` (vw/vh, cam, city, `resetState(city)`), `render.js` (caméra, fond ville, drapeaux, mini-carte), `zombies.js` (repos / aggro), `waves.js` (inactif en ville), `weapons.js` (bruit), `input.js` (souris -> monde), `game.js`, `ui.js`, `screens.js`, `i18n.js`, `storage.js` (`zombie.city`), `config.js` (`CITY`)
