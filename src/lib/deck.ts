import { CARDS, LEVEL_ORDER, type Card, type Level } from "@/data/cards";
import { isFresh, resetScope } from "@/lib/seen";

/**
 * Construit une pioche qui monte progressivement en intensité :
 * chaque carte reçoit un score = indice du niveau + un aléa, puis on trie.
 * Les niveaux se mélangent donc aux transitions, sans dépasser le niveau max.
 */
export function buildDeck(maxLevel: Level, source: Card[] = CARDS): Card[] {
  const maxIdx = LEVEL_ORDER.indexOf(maxLevel);
  const pool = source.filter((c) => LEVEL_ORDER.indexOf(c.level) <= maxIdx);
  // Les cartes déjà jouées passent en fin de pioche ; tout joué : on repart de zéro
  // Pas encore jouées ici, ni vues dans Action ou Vérité (même texte)
  let fresh = pool.filter((c) => isFresh("cartes", c.id, c.text));
  if (fresh.length < 12) {
    resetScope("cartes", pool.map((c) => c.id), pool.map((c) => c.text));
    fresh = pool;
  }
  const old = pool.filter((c) => !fresh.includes(c));
  const progress = (list: Card[]) =>
    list
      // Montée en intensité, mais avec un début qui mélange Flirt et Doux (moins de répétitions d'une soirée à l'autre)
      .map((c) => ({ c, score: LEVEL_ORDER.indexOf(c.level) + Math.random() * 1.8 }))
      .sort((a, b) => a.score - b.score)
      .map(({ c }) => c);
  return [...progress(fresh), ...progress(old)];
}

export function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

export function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* non supporté */
  }
}
