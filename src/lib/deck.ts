import { CARDS, LEVEL_ORDER, type Card, type Level } from "@/data/cards";

/**
 * Construit une pioche qui monte progressivement en intensité :
 * chaque carte reçoit un score = indice du niveau + un aléa, puis on trie.
 * Les niveaux se mélangent donc aux transitions, sans dépasser le niveau max.
 */
export function buildDeck(maxLevel: Level): Card[] {
  const maxIdx = LEVEL_ORDER.indexOf(maxLevel);
  return CARDS.filter((c) => LEVEL_ORDER.indexOf(c.level) <= maxIdx)
    .map((c) => ({ c, score: LEVEL_ORDER.indexOf(c.level) + Math.random() * 1.15 }))
    .sort((a, b) => a.score - b.score)
    .map(({ c }) => c);
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
