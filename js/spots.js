// Emplacements libres de l'arène (hors obstacles), partagés par les bonus, événements et objectifs.
import { state } from './state.js';
import { hitsSolid } from './layout.js';
import { rand } from './util.js';

// minFrom : { x, y, d } = distance minimale à respecter par rapport à un point (ex. le joueur).
export function freeSpot(minFrom = null) {
  for (let i = 0; i < 60; i++) {
    const x = rand(30, state.w - 30);
    const y = rand(70, state.h - 130);
    if (hitsSolid(state.solids, x, y, 18)) continue;
    if (minFrom && Math.hypot(x - minFrom.x, y - minFrom.y) < minFrom.d) continue;
    return { x, y };
  }
  return { x: state.w / 2, y: state.h / 2 };
}
