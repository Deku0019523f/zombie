// Campagne : le parcours en 10 niveaux. Données pures (aucune dépendance au DOM).
//  waves  : nombre de vagues à survivre          from  : difficulté de la 1re vague (comme « vague n° from » en survie)
//  themes : thème de chaque vague (normal | horde | armored | night | supply | blitz)
//  boss   : nombre de boss sur la dernière vague  kit : améliorations offertes au départ
const L = (id, waves, from, themes, boss = 0) => ({ id, waves, from, themes, boss, kit: Math.floor((id - 1) / 2) });

export const LEVELS = [
  L(1, 3, 1, ['normal', 'normal', 'normal']),
  L(2, 4, 2, ['normal', 'normal', 'blitz', 'normal']),
  L(3, 4, 3, ['normal', 'supply', 'normal', 'normal']),
  L(4, 5, 4, ['normal', 'night', 'normal', 'horde', 'night']),
  L(5, 5, 5, ['normal', 'supply', 'armored', 'normal', 'normal'], 1),
  L(6, 5, 6, ['horde', 'normal', 'blitz', 'armored', 'normal']),
  L(7, 6, 7, ['normal', 'armored', 'night', 'horde', 'supply', 'normal']),
  L(8, 6, 8, ['night', 'normal', 'night', 'armored', 'blitz', 'normal']),
  L(9, 7, 9, ['horde', 'normal', 'armored', 'night', 'blitz', 'supply', 'normal'], 1),
  L(10, 8, 10, ['normal', 'horde', 'armored', 'night', 'blitz', 'supply', 'armored', 'normal'], 2),
];

// Étoiles : 1 = victoire · 2 = PV restants ≥ 50 % · 3 = PV restants ≥ 80 %
export const STAR_RULES = { two: 0.5, three: 0.8 };

export const levelById = (id) => LEVELS.find((l) => l.id === id) || null;

export function starsFor(hpRatio) {
  return hpRatio >= STAR_RULES.three ? 3 : hpRatio >= STAR_RULES.two ? 2 : 1;
}
