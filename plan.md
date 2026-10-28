# Plan — structure détaillée du projet Zombie Survival

```
zombie/
├── index.html            Page unique : en-tête, HUD, arène (#arena), overlay (#overlay),
│                         barre d'armes, panneaux d'aide. Charge js/main.js (type=module).
├── css/
│   └── style.css         Thème sombre, entités (joueur, zombies par type, balles, pickups),
│                         joystick, toast, overlay, responsive (≤ 560 px).
├── js/
│   ├── main.js           Entrée : ResizeObserver, câblage des boutons, pause auto, boucle rAF.
│   ├── game.js           initGame / startGame / pauseGame / resumeGame / confirm / update(dt).
│   ├── state.js          Objet `state` unique + resetState() (nettoie aussi le DOM).
│   ├── config.js         PLAYER, WEAPONS, ZOMBIES, WAVES, DROPS (tout l'équilibrage).
│   ├── input.js          Clavier (e.code), souris, tactile (joystick gauche / visée droite).
│   ├── player.js         Déplacement, angle de visée, invulnérabilité, clampPlayer().
│   ├── weapons.js        Tir (cadence, dispersion, plombs), rechargement, changement d'arme.
│   ├── bullets.js        Déplacement par sous-pas + collisions balle/zombie.
│   ├── zombies.js        spawnZombie, IA de poursuite, séparation, dégâts, mort, hurtPlayer.
│   ├── pickups.js        Drops ❤️/📦, durée de vie, collecte.
│   ├── waves.js          Composition des vagues, apparition, intermission, déblocage d'armes.
│   ├── ui.js             HUD, barre d'armes, toast, overlay (ready / paused / over).
│   ├── i18n.js           Dictionnaires FR/EN, t(), bascule de langue.
│   ├── audio.js          Effets WebAudio, muet.
│   ├── storage.js        localStorage sécurisé (record, muet, langue).
│   ├── dom.js            Références DOM, makeEl(), place().
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
main ─► game ─► player, weapons, bullets, zombies, pickups, waves, ui, storage, audio
                 zombies ─► pickups ─► ui
                 waves ─► zombies, ui
                 bullets ─► zombies
                 tous ─► state, config, dom, util
```

## Ordre d'exécution d'une frame (`game.update`)
1. `updatePlayer` : déplacement, visée
2. `updateWeapons` : cooldown, rechargement, tir
3. `updateBullets` : déplacement, collisions (peut tuer des zombies)
4. `updateZombies` : purge des morts, poursuite, séparation, contact joueur
5. `updatePickups` : durée de vie, collecte
6. `updateWaves` : apparitions, fin de vague, intermission
7. fin de partie si `state.dead`

Puis `ui.render()` (hors update, y compris en pause).

## Phases
`ready` → `playing` ⇄ `paused` → `over` → `playing` (rejouer)

## Équilibrage de référence
- Vague n : `5 + 3n` zombies (+ `n/5` boss si n multiple de 5)
- Runners dès la vague 2, tanks dès la vague 4
- Armes : shotgun vague 3, SMG vague 5
- Bonus de fin de vague : `50 × n`
