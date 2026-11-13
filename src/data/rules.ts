import type { GameId } from "@/data/games";

/** Règles affichées à l'intro de chaque jeu (et via le bouton « ? ») */
export const RULES: Partial<Record<GameId, { tagline: string; steps: [string, string, string]; bg: string }>> = {
  cartes: {
    tagline: "Pioche, ose, recommence.",
    steps: ["Chacun pioche une carte à son tour.", "Fais le défi, ou réponds à la question.", "Tu refuses ? Tu prends un gage. Les jokers te sauvent."],
    bg: "bg-candy",
  },
  quiz: {
    tagline: "Un numéro, une vérité.",
    steps: ["Tire un numéro au hasard, ou choisis-le.", "Tu poses la question, l'autre répond.", "Joker : on passe la question sans répondre."],
    bg: "bg-pop",
  },
  aov: {
    tagline: "Le classique, version couple.",
    steps: ["À ton tour : action ou vérité ?", "Fais l'action, ou réponds franchement.", "Tu refuses ? Gage."],
    bg: "bg-passion",
  },
  morpion: {
    tagline: "Trois alignés, et le perdant paie.",
    steps: ["Chacun pose son signe à tour de rôle.", "Aligne-en trois, en ligne, colonne ou diagonale.", "Le perdant tire un gage. Match nul : défi à deux."],
    bg: "bg-cream",
  },
  ppc: {
    tagline: "En 3 manches gagnantes. Gage au perdant.",
    steps: ["Chacun choisit en secret : pierre, papier ou ciseaux.", "Révélation en même temps : 3, 2, 1…", "Le premier à 3 manches gagne, l'autre prend un gage."],
    bg: "bg-candy",
  },
  verre: {
    tagline: "Remplis le verre sans le faire déborder.",
    steps: ["Maintiens le doigt pour ouvrir le robinet.", "Relâche pour l'arrêter, puis c'est à l'autre.", "L'eau peut bomber au-dessus du bord… jusqu'à craquer. Qui fait déborder prend un gage."],
    bg: "bg-pop",
  },
};
