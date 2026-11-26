# assets/ui — ressources d'interface (reçues le 2026-11-26)

Deux packs, PNG uniquement (les PSD d'origine ne sont pas dans le dépôt, trop lourds : 30 Mo).

## 1. `bunker-exodus/` — « Bunker Exodus FREE UI Starter v2.0 » (Nexa Visuals)
Style acier émaillé vert-gris + laiton + un seul accent ambre. Propre, lisible sur mobile.
| Dossier | Contenu |
|---|---|
| `components/` | @2x (maître) : `panel_frame` (9-slice 48 px @2x), `slot_frame` normal/hover/selected/disabled (9-slice 24), `button` et `button_primary` ×4 états (3-slice 32 px gauche/droite), `tab` ×4 états, `header_strip`, `subheader_strip`, `brass_tag` |
| `glyphs/` | 8 glyphes clairs à teinter : caret, check, eq_body, eq_head, lock, rad, warning, weight |
| `icons-128/`, `icons-64/` | 12 icônes : conserve, eau (bidon), trousse médicale, lampe torche, pied-de-biche, masque à gaz, compteur Geiger, cartouche filtre, batterie, bobine de cuivre, coffre, radiation |
| `fonts/` | Barlow Condensed (libellés) + IBM Plex Mono (chiffres), licence SIL OFL 1.1 |
| `components.json` | tailles / états / bordures de découpe |
| `LICENSE.md`, `README.md`, `AI_DISCLOSURE.md` | d'origine, à conserver |
Licence : usage perso/commercial illimité, modification permise, pas d'attribution. **Interdit : revendre / redistribuer / repackager les fichiers comme pack.** → les fichiers sont livrés AVEC le jeu, mais ne faites pas de ce dépôt un « pack d'assets » téléchargeable ; si le dépôt est public, envisager de le passer en privé ou de retirer ce dossier.
Règles du pack : amber seulement pour l'élément sélectionné / onglet actif / bouton principal ; un seul format de case (80 px à 1080p, icône 64 px dedans) ; on change d'image pour l'état, jamais la géométrie ; aucun texte dans les images.

## 2. `survival/` — « UI survival » (style rouille / métal dessiné à la main)
| Dossier | Contenu |
|---|---|
| `round/` | boutons ronds 128×128 en 3 états (`_normal`, `_hover` = halo turquoise, `_pressed`) : plus, minus, check, exit, i, mail, menu, music, mute, sound, option (engrenage), pause, play, question, return, search, share, x, + `button_empty` vierge |
| `icon/` | bullet (munitions), first_aid (caisse de soins), gun (SMG), hp_plus / hp_plus_2 (croix rouge / verte), key, knife — 128×128 |
| `hotbar/` | `hotbar_slot_80x80`, `hotbar_800x120`, `hotbar_2_800x240`, calques `_0000_slots`, `_0001_backplate-2`, `_0002_backplate-1` |
| `health/` | 3 barres de vie 1024×128 en calques (cadre, fond, remplissages) |
| `inventory/` | planche 1200×800, cases 128×128 (normal / hover / locked), onglets Equipment / Crafting / Inventory, boulons, cartouche de nom |
| `button/`, `popup/`, `dialogue/` | boutons 256×64 et 512×256, cases à cocher, fenêtre popup, boîte de dialogue |
Licence : non précisée dans l'archive → à vérifier auprès de la source avant publication.

## Plan d'utilisation dans le jeu (3d/)
1. HUD : boutons haut-droite (marteau, son, pause) → `survival/round/{option|sound|mute|pause}_{normal,pressed}.png` (marteau : `button_empty` + emoji ou icône).
2. Barre rapide (bandage / conserve / eau) → `bunker-exodus/components/be_slot_frame_{normal,selected}@2x.png` en `border-image`, icônes `icons-64/` (MedicalKit, CannedFood, WaterCanister) ; compteur en IBM Plex Mono.
3. Panneaux (pause, game over, inventaire / sac à dos) → `be_panel_frame` + `be_button(_primary)` + `be_header_strip`, polices Barlow Condensed.
4. Barres de faim / soif / vie : CSS (remplissage) dans un cadre `survival/health/`, ou garder les barres CSS actuelles.
5. Tout `url()` en CSS doit avoir une couleur de repli (le jeu reste jouable si une image manque).
