// File d'événements sonores positionnés : la logique « émet », le paysage sonore (soundscape.js) « joue ».
// Module feuille (aucune dépendance) : évite les imports circulaires et reste testable sans WebAudio.
export const soundQueue = [];

export function emit(kind, x = 0, y = 0, extra = null) {
  if (soundQueue.length < 48) soundQueue.push({ kind, x, y, extra });
}
