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

## Le jeu
Survie d'apocalypse : on se réveille dans une **cabane** avec le strict minimum (couteau, 1 eau ; une caisse : 1 conserve, 1 bandage ; un coffre à outils dehors avec une pioche). Faim, soif, saignement ; fouille des maisons, épaves, conteneurs ; récolte du bois (arbres) et de la pierre (rochers, pioche) ; **construction d'abris** (mur en bois, mur en pierre 3× plus solide, porte, feu de camp). Jour / nuit (14 min par jour), zombies plus nombreux la nuit. Sauvegarde automatique (bouton CONTINUER).

## Commandes
| | Tactile | Clavier / souris |
|---|---|---|
| Se déplacer | joystick flottant (moitié gauche) | ZQSD / WASD / flèches |
| Viser | glisser le doigt (moitié droite, ou sur le bouton de tir) | souris (clic = verrouille le pointeur) |
| Attaquer / tirer / poser | gros bouton | clic gauche / Espace |
| Utiliser (fouiller, porte) | bouton ✋ | E ou F |
| Construire | 🔨 puis choisir la pièce | B, puis 1-4 |
| Bandage / conserve / eau | barre rapide | 1 / 2 / 3 |
| Arme suivante / recharger / sprint | ⇄ ⟳ » | X ou molette / R / Maj |
| Pause | ⏸ | Échap ou P |

## Réglages rapides
Tout est dans `js/config.js` : `SURVIVAL` (besoins, durée du jour, population de zombies), `PIECES` (coûts et PV des constructions), `LOOT` (tables de butin), armes, zombies.

### Si l'arme n'est pas bien placée dans la main
`WEAPON_HAND` (config.js) reprend l'os et la pose du couteau livré avec le modèle. Si l'arme est décalée ou mal orientée, ajuster `pos` (mètres) et `quat` (quaternion). En console : `__game.view.weaponObj.position.set(x,y,z)` pour tester en direct.
