# Plan — structure détaillée du projet Dernier Rempart (ex-Zombie Survival)

> Mis à jour pour la v2.4.0 (2026-10-31). Les ajouts v2.2.0 / v2.3.0 / v2.4.0 sont listés après l'arbre.

```
zombie/
├── index.html            canvas #canvas + HUD (santé, arme/munitions, score, vague, pause) + toast
│                         + commandes tactiles (joystick, boutons grenade/mode de tir/arme/recharge, bouton de tir rouge)
│                         + overlay #overlay > #ovCard (rempli par js/screens.js). Charge js/main.js (type=module).
├── css/
│   └── style.css         Colonne portrait centrée, HUD, joystick, bouton rouge, overlay, menus, carte du parcours.
│                         Joystick et bouton de tir masqués si souris (hover:hover + pointer:fine).
├── js/
│   ├── main.js           Entrée : initRender, ResizeObserver, boutons, pause auto, boucle rAF.
│   ├── game.js           initGame / startGame(mode, niveau) / pause / resume / goMenu / winLevel / update(dt).
│   ├── state.js          Objet `state` unique + resetState().
│   ├── config.js         PLAYER, WEAPONS, FIRE_MODES, ZOMBIES, WAVES, DROPS, LOGICAL_WIDTH (équilibrage).
│   ├── input.js          Clavier (e.code), souris (visée + clic), joystick tactile (moitié gauche),
│   │                     bouton de tir rouge (visée auto), multi-touch.
│   ├── player.js         Déplacement, visée (souris ou zombie le plus proche), clampPlayer().
│   ├── weapons.js        Modes de tir (semi/auto/rafale/charge), portée, dispersion, rechargement, changement d'arme.
│   ├── bullets.js        Déplacement par sous-pas + collisions balle/zombie.
│   ├── zombies.js        spawnZombie, poursuite, séparation, dégâts, mort, hurtPlayer.
│   ├── pickups.js        Drops soin/munitions, durée de vie, collecte.
│   ├── waves.js          Composition des vagues, apparition, intermission, déblocage d'armes, victoire de niveau.
│   ├── campaign.js       LEVELS (10 niveaux), starsFor(), levelById().
│   ├── effects.js        Particules de sang, flaques, tremblement, flash de tir (logique pure).
│   ├── render.js         Rendu canvas : fond + décor (hors écran), entités triées par y, balles,
│   │                     particules, cercle de portée, jauge de charge, feu du baril, gyrophares. Lit `state` seulement.
│   ├── sprites.js        Sprites pixel art générés en code (joueur, zombies, 2 frames + flash).
│   ├── ui.js             HUD HTML, toast, écran d'amélioration.
│   ├── screens.js        Écrans hors partie : menu, carte du parcours, réglages, aide, pause, défaite, victoire.
│   ├── loader.js         Écran de chargement.
│   ├── i18n.js           Dictionnaires FR/EN, t(), bascule de langue.
│   ├── audio.js          Effets WebAudio, muet.
│   ├── storage.js        localStorage sécurisé (record, muet, langue, progression, modes de tir, réglages).
│   ├── dom.js            Références DOM (#game, #canvas, $()).
│   └── util.js           clamp(), rand().
├── assets/
│   └── cover.jpg         Illustration « Dernier Rempart » (chargement + fond du menu)
├── tests/
│   └── smoke.mjs         Simulation headless (DOM factice) : vagues, armes, modes de tir, campagne, bornes, pause.
├── package.json          type=module ; scripts start / test.
├── README.md             Présentation et mode d'emploi.
├── RAPPORT.md            Mémoire du projet (état, historique, problèmes/solutions).
├── plan.md               Ce fichier.
└── .gitignore
```

## Graphe de dépendances (simplifié)
```
main ─► game ─► player, weapons, bullets, zombies, pickups, waves, effects, ui, screens, campaign, storage, audio
        main ─► render ─► sprites, pickups (taille), state, config
                 zombies ─► pickups ─► ui ;  zombies ─► effects
                 waves ─► zombies, ui ;  bullets ─► zombies
                 ui ─► screens ─► weapons, campaign, storage ;  screens reçoit ses actions de main (setScreenActions)
                 tous ─► state, config, util
```
La logique n'importe jamais `render.js` (séparation logique / affichage).

## Coordonnées
Arène logique de **360 px de large**, hauteur = hauteur de l'écran ramenée à cette échelle. `resizeCanvas()` fixe `state.w/h` et la résolution du canvas (devicePixelRatio ≤ 2). Le fond est reconstruit à chaque redimensionnement.

## Ordre d'exécution d'une frame
`update(dt)` (si en jeu) : joueur → armes → balles → zombies → pickups → vagues → effets → fin de partie.
Puis, toujours : `renderHud()` (HTML) et `render(t)` (canvas), y compris en pause.

## Phases
`ready` (menus) → `playing` ⇄ `paused` → `perk` (choix après chaque vague) → `over` (défaite ou victoire de niveau) → `ready` / `playing`

## Équilibrage de référence
- Vague n : `round(4 + 2.5n)` zombies (+ `n/5` boss si n multiple de 5)
- Runners dès la vague 2, tanks dès la vague 4
- Armes : shotgun vague 3, SMG vague 5
- Bonus de fin de vague : `50 × n`

## Ajouts v2.2.0 (variété de gameplay)
- `js/layout.js` : `computeSolids(W,H)` (voiture, baril en feu, caisses, voiture de police), `makeBarrels`, `pushOut` (cercle vs rectangle), `hitsSolid`
- `js/stats.js` : `computeStats(perks)` → dmg, rate, speed, maxHp, reload, pierce, vamp, magnet, ammo, armor, grenadeCd, blast (+ range en v2.4.0)
- `js/combat.js` : explosions, barils, grenade, acide, bombe nucléaire
- `js/perks.js` : `rollChoices(n)`, `applyPerk(id)` ; `game.js` : `openPerks`, `choosePerk`
- `config.js` : ZOMBIES (+ spitter/exploder/charger), AI, THEMES, DROPS, POWER, GRENADE, COMBO, PERKS
- États de vague : intermission | spawning | cleared | perkwait (+ won | ended en campagne)
- Thèmes (dès la vague 3, jamais sur un boss) : horde, blindés, nuit, ravitaillement, blitz
- Zombies : walker, runner (v2), cracheur (v3), explosif (v4), tank (v4), chargeur (v6), boss (toutes les 5 vagues)

## Ajouts v2.3.0 (chargement)
- `index.html` : `#loader` (illustration + barre) avant l'overlay
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
- Retiré : `assets/sprites/`, `tools/`, `MESHY.md` (sprites 3D Meshy abandonnés à la demande de l'utilisateur)
