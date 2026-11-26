# AI disclosure

This kit was made with generative AI. Marketplace classification: **AI-generated graphics** (itch.io: Graphics;
Fab: "Created with AI"; Unity Asset Store: AI disclosure field).

## What was generated

The kit's interface art — panel frame, slot frame, header and sub-header strips, brass tag, buttons, tab, lamp,
bezel, keycap, screw, top and bottom bars, scroll thumb, toggle, the glyph sheet and the two backgrounds (bunker
wall, main-menu blast door) — was generated with OpenAI's image model through the built-in `image_gen` tool of
OpenAI Codex: 28 generations in the shipped art, every one logged with its prompt and file hash. Five further
generations were art-direction concepts and are not part of the kit.

The 123 item and status icons come from the publisher's earlier Bunker Exodus release and were also generated with
generative AI. In v2.0 they are unchanged except that the medical cross on fourteen of them was recoloured from red
to a dark charcoal stencil by a script.

## What was done without image generation

- Art direction: an original Art Direction Document (materials, palette, light, layout grid, accessibility rules)
  written for this kit with Claude and approved by the publisher; every prompt written to it; three directions
  compared before the publisher chose one.
- Review: every asset was checked by measured technical QA (scripts) and by AI review rounds, and approved by the
  publisher; rejected outputs were corrected or regenerated (documented in the project's decision log).
- Processing by scripts (no AI): background cleanup, exact canvas fitting, symmetric caps, uniform stretch zones
  for 9-/3-slice use, all interaction states derived from one master, colour ramps (amber primary, lit lamp), the
  "on" toggle derived from the "off" toggle, glyph clean-up, @1x export.
- Nine glyphs (helmet, shelter, calendar, trefoil, five settings sections) are vector shapes written as code, not
  generated images.
- Layout, typography, interaction and the demo screens are code (HTML/CSS and Unity C#) with SIL OFL fonts. This
  code, the orchestration, prompt preparation and QA tooling were written with Anthropic's Claude (an AI coding
  assistant) under the publisher's direction and review.

No artist's name or existing game was used in any prompt. Generation records are kept by the publisher.
