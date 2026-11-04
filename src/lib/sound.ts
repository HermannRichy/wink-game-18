"use client";

/**
 * Effets sonores synthétisés avec la Web Audio API : aucun fichier audio,
 * donc rien à télécharger, fonctionne hors ligne et sans droits d'auteur.
 */

let ctx: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(on: boolean) {
  enabled = on;
}

function audio(): AudioContext | null {
  if (!enabled || typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(
  freq: number,
  { start = 0, duration = 0.15, type = "sine", volume = 0.25, slideTo }: { start?: number; duration?: number; type?: OscillatorType; volume?: number; slideTo?: number } = {},
) {
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime + start;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + duration);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

function noise({ duration = 0.3, from = 400, to = 2400, volume = 0.18 } = {}) {
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime;
  const buffer = ac.createBuffer(1, Math.floor(ac.sampleRate * duration), ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = 1.2;
  filter.frequency.setValueAtTime(from, t0);
  filter.frequency.exponentialRampToValueAtTime(to, t0 + duration);
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(volume, t0 + duration * 0.3);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  src.connect(filter).connect(gain).connect(ac.destination);
  src.start(t0);
  src.stop(t0 + duration);
}

export const sfx = {
  /** Petit clic de bouton */
  click: () => tone(620, { duration: 0.05, type: "square", volume: 0.08 }),
  /** Carte qu'on pioche ou qu'on retourne */
  swoosh: () => noise({ duration: 0.32, from: 350, to: 2600 }),
  /** Défi réussi */
  success: () => {
    tone(523.25, { duration: 0.14, type: "triangle", volume: 0.22 });
    tone(659.25, { start: 0.09, duration: 0.14, type: "triangle", volume: 0.22 });
    tone(783.99, { start: 0.18, duration: 0.28, type: "triangle", volume: 0.24 });
  },
  /** Refus, gage : « wah-wah » */
  fail: () => {
    tone(311, { duration: 0.28, type: "sawtooth", volume: 0.12, slideTo: 262 });
    tone(262, { start: 0.3, duration: 0.5, type: "sawtooth", volume: 0.12, slideTo: 196 });
  },
  /** Joker */
  sparkle: () => {
    [1568, 2093, 1760, 2637, 2349].forEach((f, i) => tone(f, { start: i * 0.06, duration: 0.18, type: "triangle", volume: 0.12 }));
  },
  /** Tic de décompte (aigu sur les dernières secondes) */
  tick: (high = false) => tone(high ? 1320 : 880, { duration: 0.06, type: "sine", volume: high ? 0.22 : 0.14 }),
  /** Départ du chrono */
  go: () => {
    tone(880, { duration: 0.12, type: "square", volume: 0.12 });
    tone(1760, { start: 0.12, duration: 0.3, type: "square", volume: 0.12 });
  },
  /** Fin du chrono */
  alarm: () => {
    [0, 0.22, 0.44].forEach((s) => tone(988, { start: s, duration: 0.16, type: "square", volume: 0.14 }));
  },
};
