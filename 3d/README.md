# Dernier Rempart — version 3D (alpha)

Survie zombie en 3e personne (three.js), pensée **mobile d'abord**. Les modèles viennent de packs CC0 de Quaternius.

## Lancer
```bash
npm start            # sert la racine du dépôt (les modules ES exigent http://, pas file://)
# puis ouvrir  http://localhost:3000/3d/   (sur téléphone : l'adresse réseau du PC, même Wi-Fi)
npm run test:3d      # tests de la simulation (sans navigateur)
```
Connexion Internet requise : three.js est chargé depuis le CDN jsdelivr (`importmap` dans `index.html`).
Les modèles doivent être dans `assets/models/` à la racine du dépôt (voir `../assets/README_ASSETS.md`).

## Commandes
| | Tactile | Clavier / souris |
|---|---|---|
| Se déplacer | joystick flottant (moitié gauche) | ZQSD / WASD / flèches |
| Viser | glisser le doigt (moitié droite, ou sur le bouton de tir) | souris (clic = verrouille le pointeur) |
| Tirer | gros bouton rouge (maintenir) | clic gauche / Espace |
| Recharger / arme suivante / sprint | boutons ⟳ ⇄ » | R / E ou molette / Maj |
| Choisir l'arme | — | 1 à 4 |
| Pause | ⏸ | Échap ou P |

## Réglages rapides
Tout est dans `js/config.js` : sensibilité (`CAMERA.sens`), distance caméra, vitesse, dégâts et cadence des armes, PV et vitesse des zombies, taille des vagues (`WAVE`).

### Si l'arme n'est pas bien placée dans la main
`WEAPON_HAND` (config.js) reprend l'os et la pose du couteau livré avec le modèle. Si l'arme est décalée ou mal orientée, ajuster `pos` (mètres) et `quat` (quaternion). En console : `__game.view.weaponObj.position.set(x,y,z)` pour tester en direct.
