# Créer les personnages avec Meshy AI

Le jeu est en 2D vue de dessus : on ne peut pas charger un modèle 3D tel quel. Le principe est de **générer le personnage en 3D avec Meshy, l'animer, puis en tirer une planche d'images PNG** (cycle de marche) que le jeu charge automatiquement. Si une planche est absente, le sprite pixel art actuel sert de repli : on peut donc remplacer les personnages un par un.

## 1. Générer le personnage (onglet « Modèle »)
1. Préparer une image du personnage, de face, pleine hauteur, fond uni (une image IA, un croquis ou la photo d'un dessin conviennent).
2. Dans Meshy : **Modèle → Image vers 3D**, déposer l'image.
3. Réglages conseillés : **Meshy 7.1 – Flagship**, **Texture activée**, **Pose : A-Pose** (ou T-Pose, indispensable pour le rigging), résolution Standard suffit.
4. Générer, vérifier le résultat, garder le meilleur.

## 2. Animer (onglet « Animer »)
1. Sélectionner le modèle texturé (Meshy demande un modèle texturé pour le rigging).
2. Lancer le **rigging** automatique (squelette humanoïde).
3. Choisir dans « Mouvements prédéfinis » une marche (zombies : marche titubante / traînante ; joueur : marche ou course avec arme). Pour le charger : une course ou une charge.
4. Exporter en **GLB** avec l'animation.

## 3. Obtenir la planche PNG
Rendre l'animation vue de face/3-4, fond transparent, **2 à 8 images** du cycle de marche, côte à côte sur une seule ligne (toutes de même taille, ex. 256×384 chacune). Deux options :
- **Blender** (gratuit) : importer le GLB, caméra fixe, rendu en PNG transparent sur quelques images du cycle, puis assembler en bande.
- **Script automatique** : possible à écrire (Playwright + three.js) dès que vous avez un premier GLB — à demander.

## 4. Brancher dans le jeu
Déposer les PNG dans `assets/sprites/` et créer `assets/sprites/manifest.json` :
```json
{
  "frames": 4,
  "files": {
    "player": "player.png",
    "walker": "walker.png",
    "runner": "runner.png",
    "tank": "tank.png",
    "spitter": "spitter.png",
    "exploder": "exploder.png",
    "charger": "charger.png",
    "boss": "boss.png"
  }
}
```
- Seules les entrées présentes sont remplacées ; les autres gardent le sprite pixel art.
- Le jeu garde 2 images du cycle (première et milieu) et les redimensionne automatiquement : joueur 24×32, zombies `12×16 × scale` (walker/runner/spitter/exploder ×2, tank/charger ×3, boss ×4 — voir `js/config.js`).
- Le personnage doit regarder vers l'avant (caméra) ou la droite : le jeu le retourne horizontalement selon la direction.
- Garder des PNG légers (≤ 512 px de haut par image) pour un chargement rapide sur téléphone.

## Conseils
- Style : si les sprites Meshy sont réalistes, la direction artistique (décor pixel art) devra suivre ; l'illustration de chargement (`assets/cover.jpg`) est plutôt « dessin BD » : générer les personnages dans ce style donne un rendu cohérent.
- Vérifier la licence Meshy du plan utilisé avant toute publication commerciale.
