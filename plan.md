# Plan — structure détaillée du projet Zombie Survival

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
├── tests/
│   └── smoke.mjs         Simulation headless (DOM factice) : vagues, armes, bornes, pause.
├── package.json          type=module ; scripts start / test.
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
