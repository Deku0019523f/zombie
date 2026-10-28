# 🧟 Zombie Survival

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
| Changer d'arme | bouton 🔄 | 1 / 2 / 3 ou E |
| Pause | bouton ⏸ | P ou Échap |

## Contenu

- **Armes** : pistolet, fusil à pompe (vague 3), mitraillette (vague 5)
- **Zombies** : walker, runner (rapide), tank (résistant), boss (toutes les 5 vagues)
- **Caisses** : soin et munitions, lâchées par les zombies
- Décor animé (baril en feu, gyrophares), effets de sang, record sauvegardé, sons WebAudio, interface FR / EN

## Développement

```bash
npm test      # simulation headless de plusieurs minutes de jeu
```

L'équilibrage (vitesse, PV, cadence, vagues, drops) se règle dans `js/config.js`. Détails de l'architecture dans `plan.md`, historique et état du projet dans `RAPPORT.md`.
