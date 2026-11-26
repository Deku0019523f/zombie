# Bunker Exodus — FREE UI Starter (v2.0)

A free starter set from **Bunker Exodus — Survival UI Kit**: enough real parts to build a working inventory panel in
your engine. Grey-green enamelled steel, black bakelite, brass tags, bone-white labels, one amber accent.

`Previews/starter_contents_1600x900.png` shows a panel built from these files only.

## What is inside

| Folder / file | Contents |
|---|---|
| `Components/@2x`, `Components/@1x` | 8 components, every state as its own PNG (RGBA). `@2x` is the master, `@1x` is exactly half |
| `Glyphs/@2x`, `Glyphs/@1x` | 8 glyphs in light bone colour (tint them in your engine: modulate / colour multiply) |
| `Icons/512`, `256`, `128`, `64` | 12 survival icons in four sizes |
| `Backgrounds/` | concrete bunker wall, 1920×1080 |
| `components.json` | sizes, states and slice borders of every file above, with Unity and Godot import hints |
| `Fonts/` | Barlow Condensed and IBM Plex Mono with their licences (SIL OFL 1.1) |
| `Previews/` | the starter panel, and one screen of the full kit for reference (it uses parts not in this starter) |

## Slicing

Borders are in pixels at **@1x** (double them for the @2x files). Three-slice parts stretch horizontally only:
keep their height.

| Part | Files | Size @1x | Type | Borders @1x (L, T, R, B) |
|---|---|---|---|---|
| panel_frame | normal | 128×128 | nine-slice | 24, 24, 24, 24 |
| header_strip | normal | 256×40 | three-slice | 32, 0, 32, 0 |
| brass_tag | normal | 160×28 | three-slice | 20, 0, 20, 0 |
| subheader_strip | normal | 256×32 | three-slice | 16, 0, 16, 0 |
| slot_frame | normal, hover, selected, disabled | 80×80 | nine-slice | 12, 12, 12, 12 |
| button | normal, hover, pressed, disabled | 160×48 | three-slice | 16, 0, 16, 0 |
| button_primary | normal, hover, pressed, disabled | 160×48 | three-slice | 16, 0, 16, 0 |
| tab | normal, hover, selected, disabled | 128×32 | three-slice | 12, 0, 12, 0 |

- **Godot:** `NinePatchRect`, patch margins as above (×2 for @2x textures), `draw_center` on.
- **Unity:** Sprite (2D and UI), Sprite Editor border L/B/R/T as above, Image type *Sliced*. With @2x textures set
  Pixels Per Unit to 200 so the parts keep their @1x size on a 1920×1080 canvas.
- **GameMaker:** sprite → Nine Slice, the same four borders.
- **Web:** `border-image-slice` with the @2x borders, `border-width` with the @1x borders.

## Rules that keep it looking right

- No text in the art: write labels with the fonts in `Fonts/` (labels in Barlow Condensed SemiBold, numbers in
  IBM Plex Mono).
- One slot size: 80 px at 1080p, icons 64 px inside it.
- Amber only for the selected item, the active tab and the primary button.
- States share one geometry: swap the PNG, never move or resize the control.

## The full kit

- **PNG Edition** (all 46 components with states, 123 icons in four sizes, 16 screen layouts and previews):
  https://nexavisuals.itch.io/bunker-exodus-complete-edition
- **Unity 6 edition** (the same art as uGUI prefabs, 17 demo scenes and runtime scripts): on the Unity Asset Store
  and Fab.

Try it in the browser: https://nexavisuals.itch.io/bunker-exodus-ui-asset-interactive-demo
