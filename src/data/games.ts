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
  /** Jouable à distance, chacun sur son téléphone */
  online?: boolean;
  ready: boolean;
}

export const GAMES: GameInfo[] = [
  { id: "cartes", name: "Cartes", desc: "Pioche, ose, recommence.", icon: "cards", bg: "bg-candy", ready: true },
  { id: "quiz", name: "Quiz", desc: "Un numéro, une vérité.", icon: "quiz", bg: "bg-pop", ready: true },
  { id: "aov", name: "Action ou Vérité", desc: "Le classique, version couple.", icon: "aov", bg: "bg-passion", online: true, ready: true },
  { id: "morpion", name: "Morpion", desc: "Trois alignés, et le perdant paie.", icon: "grid", bg: "bg-cream", online: true, ready: true },
  { id: "ppc", name: "Pierre-Papier-Ciseaux", desc: "En 3 manches gagnantes. Gage au perdant.", icon: "hand", bg: "bg-candy", online: true, ready: true },
  { id: "verre", name: "Le Verre", desc: "Verse sans faire déborder.", icon: "glass", bg: "bg-pop", online: true, ready: true },
  { id: "ludo", name: "Ludo Hot", desc: "Chaque capture a un prix.", icon: "dice", bg: "bg-flame", hot: true, ready: true },
  { id: "tour", name: "La Tour", desc: "Un bloc, un défi.", icon: "tower", bg: "bg-ink text-cream", hot: true, ready: true },
];

export const ONLINE_GAMES = GAMES.filter((g) => g.online);
