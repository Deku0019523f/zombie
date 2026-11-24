# plan.md — Dernier Rempart (jeu 3D, branche unique `main`)

Le dépôt ne contient plus que le jeu 3D (l'ancien jeu 2D a été retiré le 2026-11-24 ; il reste dans l'historique git, version 3.1.0).

```
index.html            redirige vers 3d/
3d/                   le jeu (three.js) : voir 3d/plan.md pour le détail de chaque fichier
  index.html, css/style.css, js/*.js, README.md, plan.md
assets/models/        modèles glTF/GLB (Quaternius CC0) : characters, weapons, vehicles, environment, village, props, vegetation
assets/README_ASSETS.md
tests/sim3d.mjs       12 tests de la simulation (npm test)
tools/obj2glb.py      convertisseur OBJ+MTL -> GLB
RAPPORT.md            mémoire du projet
```

Principe : simulation pure (`config, logic, layout, sim`) séparée du rendu (`assets, world, view, fx, audio, input, ui, game, main, orient`). Jeu en PAYSAGE obligatoire.
