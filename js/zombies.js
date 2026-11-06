import { WAVES, ZOMBIES, AI, COMBO, ELITE, COINS, KB_RES, STREAKS, CITY } from './config.js';
import { state } from './state.js';
import { rand } from './util.js';
import { sfx } from './audio.js';
import { maybeDrop } from './pickups.js';
import { addCorpse, addDecal, addFloater, addShake, spawnBlood, spawnGibs, spawnColor, hitStop } from './effects.js';
import { explode, fireAcid } from './combat.js';
import { pushOut } from './layout.js';
import { genPull, damageGen } from './objectives.js';
import { banner } from './ui.js';
import { t } from './i18n.js';
import { stealthRadius, nearestLure, wakeHorde } from './noise.js';

// Types qui attaquent le corps à corps (et peuvent donc s'en prendre au générateur).
const MELEE = new Set(['walker', 'runner', 'crawler', 'tank', 'charger', 'exploder', 'boss']);

function makeElite(z, mod) {
  const m = ELITE.mods[mod];
  z.elite = mod;
  z.maxHp = z.hp = Math.max(2, Math.round(z.hp * m.hp * 10) / 10);
  z.speed *= m.speed;
  z.score *= ELITE.scoreMult;
  if (mod === 'healer') z.healT = rand(0.5, ELITE.mods.healer.every);
}

// opts : x, y (position imposée) · minion (invoqué : jamais d'élite) · elite (false = jamais, true / nom = forcé)
export function spawnZombie(type, opts = {}) {
  const def = ZOMBIES[type];
  const { w, h } = state;
  const m = def.size / 2 + 6;
  const side = Math.floor(Math.random() * 4);
  let x;
  let y;
  if (opts.x !== undefined) { x = opts.x; y = opts.y; }
  else if (side === 0) { x = -m; y = rand(30, h); }
  else if (side === 1) { x = w + m; y = rand(30, h); }
  else if (side === 2) { x = rand(0, w); y = 20 - m; }
  else { x = rand(0, w); y = h + m; }

  const bonus = Math.min(state.wave, WAVES.speedBonusCap) * WAVES.speedBonusPerWave;
  const z = {
    type, x, y,
    r: def.size / 2, size: def.size,
    hp: def.hp, maxHp: def.hp,
    speed: rand(def.speed[0], def.speed[1]) + bonus,
    damage: def.damage, score: def.score,
    hitTimer: 0, dead: false,
    ph: rand(0, 6), fx: 1,            // phase d'animation, sens du regard
    side: Math.random() < 0.5 ? 1 : -1, avoid: 0, entered: false,
    elite: null, atkT: 0, burnT: 0, burnTick: 0, burnDps: 0,
    lx: x, ly: y, stuckT: 0, stuckN: 0,                // détection de blocage contre les obstacles
  };
  if (type === 'spitter') {
    z.hold = rand(AI.spitter.hold[0], AI.spitter.hold[1]);
    z.shootT = rand(1, 2.2);
    z.charge = false;
  } else if (type === 'summoner') {
    z.hold = rand(AI.summoner.hold[0], AI.summoner.hold[1]);
    z.summT = rand(2.5, 4);
    z.charge = false;
  } else if (type === 'charger') {
    z.st = 'walk';                    // walk | tele | dash | recover
    z.chT = rand(AI.charger.cooldown[0], AI.charger.cooldown[1]);
    z.tT = 0; z.dT = 0; z.rT = 0; z.dx = 0; z.dy = 0;
  }

  // Élite : modificateur aléatoire à partir de la vague ELITE.from
  if (type !== 'boss' && !opts.minion && opts.elite !== false) {
    const mods = Object.keys(ELITE.mods);
    if (typeof opts.elite === 'string') makeElite(z, opts.elite);
    else if (opts.elite === true || (state.wave >= ELITE.from && Math.random() < ELITE.chance(state.wave))) {
      makeElite(z, mods[Math.floor(Math.random() * mods.length)]);
    }
  }
  state.zombies.push(z);
  return z;
}

// o : crit (tir critique) · kb (recul) · num (affiche les dégâts) · quiet (aucun effet : brûlure, éclairs)
export function damageZombie(z, dmg, vx, vy, o = {}) {
  if (z.dead) return;
  z.hp -= dmg;
  z.hitTimer = 0.08;
  const l = Math.hypot(vx, vy) || 1;
  const kb = (o.kb ?? 2.5) * (KB_RES[z.type] ?? 1);
  if (vx || vy) {
    z.x += (vx / l) * kb;      // recul
    z.y += (vy / l) * kb;
  }
  if (!o.quiet) spawnBlood(z.x, z.y, o.crit ? 5 : 3, o.crit ? 80 : 50);
  if (o.num) {
    const n = dmg >= 10 ? Math.round(dmg) : Math.round(dmg * 10) / 10;
    addFloater(z.x + rand(-6, 6), z.y - z.r - 4, o.crit ? `${n}!` : String(n), o.crit ? '#fde047' : '#fca5a5', o.crit ? 12 : 8);
  }
  if (z.hp <= 0) killZombie(z, { crit: o.crit, gib: z.hp < -Math.max(1, z.maxHp * 0.6) || (o.kb ?? 0) >= 6 });
  else if (o.crit) sfx.crit();
  else if (!o.quiet) sfx.hit();
}

export const comboMult = () => Math.min(COMBO.max, 1 + Math.floor(state.combo.count / COMBO.step));

function streakCheck(n) {
  const i = STREAKS.indexOf(n);
  if (i < 0) return;
  banner(t(`streak_${i}`, n), 'streak');
  sfx.streak();
  hitStop(0.06);
  state.score += n * 5;
}

// opts.silent : mort sans explosion ni butin (bombe nucléaire)
export function killZombie(z, opts = {}) {
  if (z.dead) return;
  z.dead = true;
  const c = state.combo;
  const mult = comboMult();
  const pts = z.score * mult;
  state.score += pts;
  c.count++;
  c.timer = COMBO.window;
  state.kills++;
  state.coins += (COINS.kill[z.type] ?? 1) * (z.elite ? ELITE.coinMult : 1) * state.stats.coin;
  addFloater(z.x, z.y - z.r, `+${pts}`, mult > 1 ? '#fde047' : '#e5e7eb');

  const p = state.player;
  if (state.stats.vamp > 0) p.hp = Math.min(state.stats.maxHp, p.hp + state.stats.vamp);

  spawnBlood(z.x, z.y, z.type === 'boss' ? 30 : 9, 90);
  if (opts.gib || z.type === 'boss') spawnGibs(z.x, z.y, z.type === 'boss' ? 22 : 12);
  addDecal(z.x, z.y + z.r * 0.4, z.r * (z.type === 'boss' ? 1.6 : 1.1));
  if (!opts.gib) addCorpse(z);
  sfx.kill();
  if (z.elite || z.type === 'tank' || z.type === 'charger' || z.type === 'summoner') hitStop(0.05);
  else if (opts.crit) hitStop(0.025);
  if (z.type === 'boss') hitStop(0.12);
  if (!opts.silent) streakCheck(c.count);
  if (opts.silent) return;
  maybeDrop(z);
  if (z.type === 'exploder') {
    explode(z.x, z.y, AI.exploder.radius, { pDmg: AI.exploder.dmgPlayer, zDmg: AI.exploder.dmgZombie, gen: 8 });
  } else if (z.elite === 'volatile') {
    const E = ELITE.mods.volatile;
    explode(z.x, z.y, E.blast, { pDmg: E.dmgPlayer, zDmg: 3, shake: 5, gen: 6 });
  } else if (state.stats.syn.chain && state.inBlast > 0 && state.inBlast < 3) {   // synergie : les morts par explosion explosent à leur tour
    explode(z.x, z.y, 34, { zDmg: 2, pDmg: 0, shake: 3 });
  }
}

export function hurtPlayer(dmg) {
  const p = state.player;
  if (state.buffs.shield > 0) {      // bouclier : aucun dégât
    p.hitTimer = 0.25;
    sfx.shield();
    return;
  }
  p.hp = Math.max(0, p.hp - dmg * state.stats.armor);
  p.hitTimer = 0.5;
  state.hurtFlash = 0.25;
  state.regenT = 0;
  state.combo.count = 0;             // se faire toucher casse le combo
  state.combo.timer = 0;
  addShake(4);
  hitStop(0.06);
  spawnBlood(p.x, p.y, 6, 60);
  sfx.hurt();
  if (p.hp <= 0) state.dead = true;
}

function summon(z) {
  const A = AI.summoner;
  const n = A.count + (state.wave >= 12 ? 1 : 0);
  for (let i = 0; i < n; i++) {
    const a = rand(0, Math.PI * 2);
    const type = state.wave >= 9 && Math.random() < 0.3 ? 'runner' : 'walker';
    spawnZombie(type, { x: z.x + Math.cos(a) * 24, y: z.y + Math.sin(a) * 24, minion: true });
  }
  spawnColor(z.x, z.y, 14, ['#c084fc', '#e879f9', '#7c3aed'], 110);
  sfx.summon();
}

export function updateZombies(dt) {
  if (state.zombies.some((z) => z.dead)) state.zombies = state.zombies.filter((z) => !z.dead);
  const zs = state.zombies;
  const p = state.player;
  const slow = state.buffs.freeze > 0 ? 0.35 : 1;
  const G = state.gen && state.gen.hp > 0 ? state.gen : null;

  for (const z of zs) {
    const dx = p.x - z.x;
    const dy = p.y - z.y;
    const dist = Math.hypot(dx, dy) || 1;
    // cible : le générateur s'il est plus proche que le joueur (corps à corps uniquement)
    const gp = G && MELEE.has(z.type) ? genPull(z) : null;
    const toGen = !!gp && gp.d < dist;
    const ux = toGen ? gp.ux : dx / dist;
    const uy = toGen ? gp.uy : dy / dist;
    const td = toGen ? gp.d : dist;
    if (Math.abs(dx) > 2 && !(state.mode === 'city' && !z.aggro)) z.fx = dx > 0 ? 1 : -1;
    if (!z.entered && z.x > 0 && z.x < state.w && z.y > 20 && z.y < state.h) z.entered = true;

    let mx = 0;
    let my = 0;
    let spd = z.speed * slow;

    // Mode ville : un zombie reste au repos (il erre près de son point d'apparition) tant qu'il n'a pas repéré le joueur.
    // Les rampants font le mort et ne se lèvent que tout près ; une horde dort jusqu'à ce qu'un bruit la réveille.
    let idle = false;
    if (state.mode === 'city') {
      const sleeping = z.horde && !(state.city.hordes[z.horde] && state.city.hordes[z.horde].awake);
      const sight = z.type === 'crawler' ? CITY.crawlerAggro : sleeping ? 70 : stealthRadius();
      if (!z.aggro && dist < sight) {
        z.aggro = true;
        if (z.horde) wakeHorde(z.horde);
      } else if (z.aggro && dist > CITY.lose) z.aggro = false;
      idle = !z.aggro;
    }

    const lure = idle && !(z.horde && !(state.city.hordes[z.horde] && state.city.hordes[z.horde].awake)) ? nearestLure(z.x, z.y) : null;
    if (lure) {                          // attiré par une alarme : va voir d'où vient le bruit
      const d = Math.hypot(lure.x - z.x, lure.y - z.y) || 1;
      if (d > 28) { mx = (lure.x - z.x) / d; my = (lure.y - z.y) / d; spd *= 0.7; z.fx = mx >= 0 ? 1 : -1; }
    } else if (idle) {
      z.wT = (z.wT ?? 0) - dt;
      const hx = z.hx ?? z.x;
      const hy = z.hy ?? z.y;
      if (z.wT <= 0) {
        z.wT = rand(1.5, 4);
        z.wa = Math.random() < 0.35 ? null : rand(0, Math.PI * 2);
      }
      if (Math.hypot(z.x - hx, z.y - hy) > 90) z.wa = Math.atan2(hy - z.y, hx - z.x);
      if (z.wa !== null && z.wa !== undefined && z.type !== 'crawler') {
        mx = Math.cos(z.wa);
        my = Math.sin(z.wa);
        spd *= 0.35;
        z.fx = mx >= 0 ? 1 : -1;
      }
    } else if (z.type === 'spitter') {
      const A = AI.spitter;
      if (dist > z.hold) { mx = ux; my = uy; }
      else if (dist < A.retreat && z.entered) { mx = -ux; my = -uy; spd *= 0.7; }
      z.shootT -= dt * slow;
      z.charge = z.shootT < 0.4;
      if (z.shootT <= 0) {
        if (z.entered && dist < 280) fireAcid(z);
        z.shootT = rand(A.shootEvery[0], A.shootEvery[1]);
      }
    } else if (z.type === 'summoner') {
      const A = AI.summoner;
      if (dist > z.hold) { mx = ux; my = uy; }
      else if (dist < A.retreat && z.entered) { mx = -ux; my = -uy; spd *= 0.7; }
      z.summT -= dt * slow;
      z.charge = z.summT < A.telegraph;
      if (z.summT <= 0) {
        if (z.entered && zs.length < A.maxAlive) summon(z);
        z.summT = rand(A.every[0], A.every[1]);
      }
    } else if (z.type === 'charger') {
      const A = AI.charger;
      if (z.st === 'walk') {
        mx = ux; my = uy;
        z.chT -= dt * slow;
        if (z.chT <= 0 && z.entered && td < A.triggerDist && td > 50) {
          z.st = 'tele'; z.tT = A.telegraph; z.dx = ux; z.dy = uy;
          sfx.charge();
        }
      } else if (z.st === 'tele') {
        z.tT -= dt * slow;
        if (z.tT > 0.18) { z.dx = ux; z.dy = uy; }   // la direction se verrouille juste avant la charge
        if (z.tT <= 0) { z.st = 'dash'; z.dT = A.dash; }
      } else if (z.st === 'dash') {
        mx = z.dx; my = z.dy; spd = A.dashSpeed * slow;
        z.dT -= dt * slow;
        if (z.dT <= 0) { z.st = 'recover'; z.rT = A.recover; }
      } else {
        z.rT -= dt * slow;
        if (z.rT <= 0) { z.st = 'walk'; z.chT = rand(A.cooldown[0], A.cooldown[1]); }
      }
    } else {
      mx = ux; my = uy;
    }

    // Au contact du générateur : on s'arrête et on frappe (les explosifs explosent).
    if (toGen && gp.d < state.gen.r + z.r) {
      if (z.type === 'exploder') killZombie(z);
      else {
        mx = 0; my = 0;
        z.atkT -= dt * slow;
        if (z.atkT <= 0) { damageGen(z.damage); z.atkT = 0.8; }
      }
    }

    // Contournement des obstacles : après un contact, on longe l'obstacle un moment.
    if (z.avoid > 0 && z.st !== 'dash') {
      z.avoid -= dt;
      const tx = -my * z.side;
      const ty = mx * z.side;
      const bx = mx * 0.35 + tx;
      const by = my * 0.35 + ty;
      const l = Math.hypot(bx, by) || 1;
      mx = bx / l;
      my = by / l;
    }
    z.x += mx * spd * dt;
    z.y += my * spd * dt;

    // Anti-blocage : un zombie qui avance sans progresser change de côté de contournement, puis est déplacé.
    if (z.entered && MELEE.has(z.type) && (mx || my) && z.st !== 'recover' && z.st !== 'tele') {
      z.stuckT += dt;
      if (z.stuckT >= 2) {
        if (Math.hypot(z.x - z.lx, z.y - z.ly) < 8) {
          z.side = -z.side;
          z.avoid = 1.4;
          z.stuckN++;
          if (z.stuckN >= 2) {                     // toujours bloqué : on le rapproche du centre de l'arène
            z.x += ((state.mode === 'city' ? p.x : state.w / 2) - z.x) * 0.15;
            z.y += (p.y - z.y) * 0.15;
            z.stuckN = 0;
          }
        } else z.stuckN = 0;
        z.lx = z.x; z.ly = z.y; z.stuckT = 0;
      }
    }

    // Élite « soigneur » : soigne les zombies proches
    if (z.elite === 'healer') {
      z.healT -= dt * slow;
      if (z.healT <= 0) {
        z.healT = ELITE.mods.healer.every;
        for (const o of zs) {
          if (o === z || o.dead || o.hp >= o.maxHp) continue;
          if (Math.hypot(o.x - z.x, o.y - z.y) < ELITE.mods.healer.aura) {
            o.hp = Math.min(o.maxHp, o.hp + 1);
            addFloater(o.x, o.y - o.r, '+', '#4ade80', 9);
          }
        }
      }
    }
    // Brûlure (balles incendiaires)
    if (z.burnT > 0) {
      z.burnT -= dt;
      z.burnTick -= dt;
      if (z.burnTick <= 0) {
        z.burnTick = 0.5;
        spawnColor(z.x, z.y - 4, 2, ['#ff7a1a', '#ffc21a'], 40);
        damageZombie(z, z.burnDps * 0.5, 0, 0, { quiet: true });
      }
    }
  }

  // Séparation : les zombies ne se superposent pas en une seule tache.
  for (let i = 0; i < zs.length; i++) {
    for (let j = i + 1; j < zs.length; j++) {
      const a = zs[i];
      const b = zs[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const min = (a.r + b.r) * 0.8;
      const d2 = dx * dx + dy * dy;
      if (d2 > 0 && d2 < min * min) {
        const d = Math.sqrt(d2);
        const push = (min - d) * 0.5;
        const nx = dx / d;
        const ny = dy / d;
        a.x -= nx * push; a.y -= ny * push;
        b.x += nx * push; b.y += ny * push;
      }
    }
  }

  // Obstacles + contact avec le joueur
  for (const z of zs) {
    if (z.entered && pushOut(z, state.solids, state.barrels)) {
      z.avoid = 0.6;
      if (z.type === 'charger' && z.st === 'dash') {   // charge stoppée net : la brute est sonnée
        z.st = 'recover';
        z.rT = AI.charger.recover * 1.6;
        addShake(2);
      }
    }
    if (z.hitTimer > 0) z.hitTimer -= dt;
    if (z.dead) continue;
    if (Math.hypot(p.x - z.x, p.y - z.y) < p.r + z.r) {
      if (z.type === 'exploder') killZombie(z);
      else if (p.hitTimer <= 0) hurtPlayer(z.damage);
    }
  }
}
