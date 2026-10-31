# 🧟 Dernier Rempart (Zombie Survival)

Jeu de survie pixel art en vue de dessus, pensé pour le **mobile en portrait** : tenez le plus longtemps possible face à des vagues de zombies de plus en plus nombreuses, avec boss, armes à débloquer et meilleur score sauvegardé.

## Jouer

Les modules ES nécessitent un serveur HTTP (l'ouverture directe de `index.html` en `file://` ne fonctionne pas) :

```bash
npm start                      # ou : python3 -m http.server 8000
```

Puis ouvrir l'adresse affichée (sur téléphone : même réseau Wi-Fi). Le dépôt peut aussi être publié tel quel sur **GitHub Pages**.

## Commandes

| Action | Mobile | Ordinateur |
|---|---|---|
| Se déplacer | joystick (gauche) | ZQSD / WASD / flèches |
| Tirer | bouton rouge (maintenir) — visée automatique | clic (maintenir) ou Espace |
| Viser | automatique (zombie le plus proche) | souris (sinon visée auto) |
| Recharger | bouton ↻ | R |
| Changer d'arme | bouton 🔄 | 1 / 2 / 3 ou E (sur l'écran d'amélioration : choisir la carte) |
| Mode de tir | pastille ronde (SEMI / AUTO / ×3 / ⚡) | F ou V |
| Grenade | bouton 💣 | G |
| Pause | bouton ⏸ | P ou Échap |

## Contenu

- **Armes** : pistolet, fusil à pompe (vague 3), mitraillette (vague 5)
- **Zombies** : walker, runner, tank, **cracheur** (acide à distance), **explosif**, **chargéur** (télégraphie puis fonce), boss (toutes les 5 vagues)
- **Améliorations** : après chaque vague, 1 choix parmi 3 (dégâts, cadence, PV, perforation, vampirisme, aimant, grenade, portée…)
- **Décor interactif** : obstacles solides, barils explosifs en chaîne, grenade
- **Bonus temporaires** : rage, bouclier, gel, bombe nucléaire ; **combo** jusqu'à x5
- **Thèmes de vague** : horde, blindés, nuit, ravitaillement, blitz
- **Caisses** : soin et munitions, lâchées par les zombies
- Décor animé (baril en feu, gyrophares), effets de sang, record sauvegardé, sons WebAudio, interface FR / EN

## Développement

```bash
npm test      # simulation headless de plusieurs minutes de jeu
```

L'équilibrage (vitesse, PV, cadence, vagues, drops) se règle dans `js/config.js`. Détails de l'architecture dans `plan.md`, historique et état du projet dans `RAPPORT.md`.

## Modes de jeu
- **Campagne (Le parcours)** : 10 niveaux à débloquer, 1 à 3 étoiles par niveau (victoire / PV ≥ 50 % / PV ≥ 80 %), progression sauvegardée.
- **Survie** : vagues sans fin, record sauvegardé.

## Tir
Les balles ont une portée limitée (cercle pointillé autour du joueur). Quatre modes de tir, au choix par arme :
**semi-auto** (un tir par appui, plus précis), **auto** (maintenir), **rafale ×3**, **tir chargé** (maintenir puis relâcher : plus de dégâts, de portée et de perforation).
Changer de mode : pastille ronde du HUD, touche **F** (ou V), ou menu Réglages.
