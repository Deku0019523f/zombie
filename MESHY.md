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

## 3. Obtenir la planche PNG (outil inclus : `tools/render-glb.mjs`)
Exporter le modèle animé depuis Meshy en **GLB** (toutes animations incluses, ex. `Meshy_AI_..._Rigged_All_Animations.glb`), puis :
```bash
# lister les animations du modèle
node tools/render-glb.mjs modele.glb --list --out /tmp/x.png
# produire une bande de 4 images (cycle de marche, fond transparent)
node tools/render-glb.mjs modele.glb --anim Walking --frames 4 --out assets/sprites/walker.png
```
Options : `--cell 192x256` (taille d'une image) · `--elev 25` (hauteur de caméra en degrés) · `--yaw 0` (rotation) · `--view 2.1` (hauteur visible en mètres) · `--tint 1.2,0.9,0.8` et `--sat 1` (variantes de couleur d'un même modèle) · `--no-inplace` (garde le déplacement du bassin) · `--tex 1024` (taille de texture).
Prérequis : Node ≥ 18 et Playwright (Chromium) ; aucune autre dépendance (rendu WebGL maison dans `tools/render-glb.html`).
Le modèle zombie fourni (Mixamo/Meshy : Walking, Running, Mummy_Stagger) a servi à générer les 7 types de zombies par variantes de teinte ; le joueur garde son sprite pixel art tant qu'aucun personnage `player.png` n'est ajouté.

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
- Au chargement, chaque image est automatiquement recadrée sur la silhouette (marges transparentes ignorées).
- Seules les entrées présentes sont remplacées ; les autres gardent le sprite pixel art.
- Le jeu garde 2 images du cycle (première et milieu) et les redimensionne automatiquement : joueur 24×32, zombies `12×16 × scale` (walker/runner/spitter/exploder ×2, tank/charger ×3, boss ×4 — voir `js/config.js`).
- Le personnage doit regarder vers l'avant (caméra) ou la droite : le jeu le retourne horizontalement selon la direction.
- Garder des PNG légers (≤ 512 px de haut par image) pour un chargement rapide sur téléphone.

## Conseils
- Style : si les sprites Meshy sont réalistes, la direction artistique (décor pixel art) devra suivre ; l'illustration de chargement (`assets/cover.jpg`) est plutôt « dessin BD » : générer les personnages dans ce style donne un rendu cohérent.
- Vérifier la licence Meshy du plan utilisé avant toute publication commerciale.
