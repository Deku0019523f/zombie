# 🧟 Zombie Survival

Jeu de survie en vue de dessus : tenez le plus longtemps possible face à des vagues de zombies de plus en plus nombreuses, avec boss, armes à débloquer et meilleur score sauvegardé.

## Jouer

Les modules ES nécessitent un serveur HTTP (l'ouverture directe de `index.html` en `file://` ne fonctionne pas) :

```bash
npm start                      # ou : python3 -m http.server 8000
```

Puis ouvrir l'adresse affichée. Le dépôt peut aussi être publié tel quel sur **GitHub Pages**.

## Commandes

| Action | Clavier / souris | Mobile |
|---|---|---|
| Se déplacer | ZQSD / WASD / flèches | joystick (moitié gauche de l'écran) |
| Viser | souris | toucher à droite |
| Tirer | clic (maintenir pour les armes auto) | maintenir le toucher à droite |
| Recharger | R | bouton ↻ |
| Changer d'arme | 1 / 2 / 3 | boutons d'armes |
| Pause | P ou Échap | bouton ⏸ |

## Contenu

- **Armes** : pistolet, fusil à pompe (vague 3), mitraillette (vague 5)
- **Zombies** : walker, runner (rapide), tank (résistant), boss (toutes les 5 vagues)
- **Caisses** : ❤️ soin, 📦 munitions, lâchées par les zombies
- Record sauvegardé, sons WebAudio, interface FR / EN

## Développement

```bash
npm test      # simulation headless de plusieurs minutes de jeu
```

L'équilibrage (vitesse, PV, cadence, vagues, drops) se règle dans `js/config.js`. Détails de l'architecture dans `plan.md`, historique et état du projet dans `RAPPORT.md`.
