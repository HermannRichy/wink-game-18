/**
 * Simulation simplifiée d'un verre d'eau, en 2D.
 * - Le niveau moyen monte avec le débit versé.
 * - La surface est un champ de hauteurs (équation d'onde amortie) : le filet d'eau crée des vagues
 *   d'autant plus fortes que le débit est élevé.
 * - Tension superficielle : l'eau peut bomber au-dessus du bord (ménisque) tant que la surface est
 *   calme. Plus ça bouge, plus la marge diminue, et le verre déborde.
 * Toutes les hauteurs sont en fraction de la hauteur du verre (1 = au ras du bord).
 */

export const COLS = 64;
/** Débit maximal, en hauteur de verre par seconde */
export const MAX_FLOW = 0.11;
/** Marge du ménisque au-dessus du bord quand l'eau est parfaitement calme */
export const MENISCUS = 0.06;
/** Quantité minimale (quasi nulle) : évite seulement qu'un simple effleurement compte comme un tour */
export const MIN_POUR = 0.003;
const WAVE_SPEED = 0.9;
/** Force du filet sur la surface */
const IMPACT = 0.55;

export interface Drop {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

export class WaterSim {
  level: number;
  h = new Float32Array(COLS);
  v = new Float32Array(COLS);
  flow = 0;
  holding = false;
  poured = 0;
  overflow = false;
  /** Secondes écoulées depuis le débordement (flaque qui s'étale) */
  spillT = 0;
  /** 0..1 : agitation de la surface (sert aussi à la marge du ménisque) */
  energy = 0;
  drops: Drop[] = [];
  pourX = 0.5;
  private time = 0;

  constructor(level: number) {
    this.level = level;
  }

  /** Marge restante avant débordement (peut être négative) */
  margin() {
    return MENISCUS * Math.max(0.3, 1 - this.energy * 2.6);
  }

  surfaceAt(i: number) {
    return this.level + this.h[i];
  }

  step(dt: number) {
    this.time += dt;
    // Le débit accélère quand on maintient, et s'arrête vite au relâchement
    if (this.holding && !this.overflow) this.flow = Math.min(MAX_FLOW, this.flow + MAX_FLOW * 0.55 * dt + 0.004 * dt);
    else this.flow = Math.max(0, this.flow - MAX_FLOW * 7 * dt);

    const added = this.flow * dt;
    this.level += added;
    this.poured += added;
    this.pourX = 0.5 + Math.sin(this.time * 2.3) * 0.006;

    // Impact du filet : enfonce la surface et projette quelques gouttes
    const ratio = this.flow / MAX_FLOW;
    if (ratio > 0.01) {
      const c = Math.round(this.pourX * (COLS - 1));
      for (let k = -2; k <= 2; k++) {
        const i = c + k;
        if (i >= 0 && i < COLS) this.v[i] -= ratio * IMPACT * (1 - Math.abs(k) * 0.28) * dt * 10 * (0.6 + Math.random() * 0.8);
      }
      if (Math.random() < ratio * 0.5) {
        this.drops.push({ x: this.pourX + (Math.random() - 0.5) * 0.04, y: this.level, vx: (Math.random() - 0.5) * 0.6, vy: 0.4 + Math.random() * 0.5 * ratio, life: 1 });
      }
    }

    // Équation d'onde amortie, en sous-pas pour la stabilité
    const sub = 6;
    const sdt = dt / sub;
    // vitesse des vagues (largeurs de verre par seconde) et amortissement
    const k = (WAVE_SPEED * (COLS - 1)) ** 2;
    const damping = 1.8;
    for (let s = 0; s < sub; s++) {
      for (let i = 0; i < COLS; i++) {
        const left = this.h[i > 0 ? i - 1 : i];
        const right = this.h[i < COLS - 1 ? i + 1 : i];
        const a = k * (left + right - 2 * this.h[i]) - damping * this.v[i];
        this.v[i] += a * sdt;
      }
      let mean = 0;
      for (let i = 0; i < COLS; i++) {
        this.h[i] += this.v[i] * sdt;
        mean += this.h[i];
      }
      mean /= COLS;
      for (let i = 0; i < COLS; i++) this.h[i] -= mean;
    }

    // Agitation
    let e = 0;
    for (let i = 0; i < COLS; i++) e += Math.abs(this.h[i]) * 40 + Math.abs(this.v[i]) * 2;
    this.energy = Math.min(1, e / COLS + ratio * 0.1);

    // Débordement : un bord de la surface dépasse le bord du verre + ménisque
    if (!this.overflow) {
      const limit = 1 + this.margin();
      const edges = [0, 1, COLS - 2, COLS - 1];
      if (edges.some((i) => this.surfaceAt(i) > limit) || this.level > 1 + MENISCUS) {
        this.overflow = true;
        this.holding = false;
        for (let k = 0; k < 26; k++) {
          const side = Math.random() < 0.5 ? 0 : 1;
          this.drops.push({ x: side, y: 1, vx: (side ? 1 : -1) * (0.15 + Math.random() * 0.3), vy: Math.random() * 0.3, life: 1.6 });
        }
      }
    }
    if (this.overflow) {
      this.spillT += dt;
      if (this.level > 1) this.level -= 0.03 * dt;
    }

    // Gouttes
    for (const d of this.drops) {
      d.vy -= 3.2 * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.life -= dt;
    }
    this.drops = this.drops.filter((d) => d.life > 0 && d.y > -0.4);
  }

  /** Résumé léger pour la diffusion en ligne */
  snapshot() {
    const n = 16;
    const hs: number[] = [];
    for (let k = 0; k < n; k++) hs.push(Math.round(this.h[Math.round((k / (n - 1)) * (COLS - 1))] * 1000));
    return { lv: Math.round(this.level * 10000) / 10000, q: Math.round((this.flow / MAX_FLOW) * 100) / 100, hs, of: this.overflow ? 1 : 0 };
  }

  /** Applique un résumé reçu (côté spectateur) */
  applySnapshot(snap: { lv: number; q: number; hs: number[]; of: number }) {
    this.level = snap.lv;
    this.flow = snap.q * MAX_FLOW;
    const n = snap.hs.length;
    for (let i = 0; i < COLS; i++) {
      const pos = (i / (COLS - 1)) * (n - 1);
      const a = Math.floor(pos);
      const b = Math.min(n - 1, a + 1);
      const t = pos - a;
      const target = ((snap.hs[a] ?? 0) * (1 - t) + (snap.hs[b] ?? 0) * t) / 1000;
      this.h[i] += (target - this.h[i]) * 0.5;
    }
    if (snap.of && !this.overflow) {
      this.overflow = true;
      for (let k = 0; k < 26; k++) {
        const side = Math.random() < 0.5 ? 0 : 1;
        this.drops.push({ x: side, y: 1, vx: (side ? 1 : -1) * (0.15 + Math.random() * 0.3), vy: Math.random() * 0.3, life: 1.6 });
      }
    }
  }
}
