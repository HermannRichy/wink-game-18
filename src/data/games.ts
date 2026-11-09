export type GameId = "cartes" | "quiz" | "ludo" | "tour" | "aov" | "morpion" | "ppc" | "verre";
export type IconId = "cards" | "quiz" | "dice" | "tower" | "aov" | "grid" | "hand" | "glass";

export interface GameInfo {
  id: GameId;
  name: string;
  desc: string;
  icon: IconId;
  /** Couleur de la vignette */
  bg: string;
  hot?: boolean;
  /** Mode Duo : deux téléphones, ensemble au même endroit */
  duo?: boolean;
  /** Mode Distance : chacun chez soi, contenus adaptés */
  distance?: boolean;
  ready: boolean;
}

export const GAMES: GameInfo[] = [
  { id: "cartes", name: "Cartes", desc: "Pioche, ose, recommence.", icon: "cards", bg: "bg-candy", duo: true, distance: true, ready: true },
  { id: "quiz", name: "Quiz", desc: "Un numéro, une vérité.", icon: "quiz", bg: "bg-pop", duo: true, distance: true, ready: true },
  { id: "aov", name: "Action ou Vérité", desc: "Le classique, version couple.", icon: "aov", bg: "bg-passion", duo: true, distance: true, ready: true },
  { id: "morpion", name: "Morpion", desc: "Trois alignés, et le perdant paie.", icon: "grid", bg: "bg-cream", duo: true, distance: true, ready: true },
  { id: "ppc", name: "Pierre-Papier-Ciseaux", desc: "En 3 manches gagnantes. Gage au perdant.", icon: "hand", bg: "bg-candy", duo: true, distance: true, ready: true },
  { id: "verre", name: "Le Verre", desc: "Verse sans faire déborder.", icon: "glass", bg: "bg-pop", duo: true, ready: true },
  { id: "ludo", name: "Ludo Hot", desc: "Chaque capture a un prix.", icon: "dice", bg: "bg-flame", hot: true, ready: true },
  { id: "tour", name: "La Tour", desc: "Un bloc, un défi.", icon: "tower", bg: "bg-ink text-cream", hot: true, ready: true },
];

export const DUO_GAMES_LIST = GAMES.filter((g) => g.duo || g.distance);
