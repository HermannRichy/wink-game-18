export type Level = "doux" | "coquin" | "brulant";
export type CardKind = "question" | "defi" | "joker";
export type JokerEffect = "rejouer" | "ensemble" | "passer";

export interface Card {
  id: string;
  level: Level;
  kind: CardKind;
  /** {moi} = joueur qui pioche, {toi} = partenaire */
  text: string;
  /** Durée du défi en secondes, si chronométré */
  seconds?: number;
  joker?: JokerEffect;
}

export const LEVELS: { id: Level; name: string; desc: string }[] = [
  { id: "doux", name: "Doux", desc: "Câlins, confidences, fous rires." },
  { id: "coquin", name: "Coquin", desc: "Ça chauffe gentiment." },
  { id: "brulant", name: "Brûlant", desc: "Pour les plus audacieux." },
];

export const LEVEL_ORDER: Level[] = ["doux", "coquin", "brulant"];

const q = (id: string, level: Level, text: string): Card => ({ id, level, kind: "question", text });
const d = (id: string, level: Level, text: string, seconds?: number): Card => ({ id, level, kind: "defi", text, seconds });
const j = (id: string, level: Level, joker: JokerEffect, text: string): Card => ({ id, level, kind: "joker", joker, text });

export const CARDS: Card[] = [
  // ——— DOUX ———
  q("d01", "doux", "Raconte à {toi} le tout premier détail que tu as remarqué chez lui ou chez elle."),
  q("d02", "doux", "Quelle chanson te fait penser à {toi} ? Chantonne le refrain."),
  q("d03", "doux", "Quel est ton souvenir préféré avec {toi} ? Donne trois détails."),
  q("d04", "doux", "Qu'est-ce que {toi} fait sans s'en rendre compte et qui te fait craquer ?"),
  q("d05", "doux", "Si vous partiez en week-end demain, où emmènerais-tu {toi} ?"),
  q("d06", "doux", "Quel surnom secret aimerais-tu donner à {toi} ?"),
  q("d07", "doux", "Qu'est-ce que tu as pensé de {toi} au premier rendez-vous, honnêtement ?"),
  q("d08", "doux", "Quel plat {toi} cuisine mieux que personne ? Et lequel il ou elle rate toujours ?"),
  q("d09", "doux", "Quelle petite attention de {toi} t'a le plus touché·e ?"),
  q("d10", "doux", "Dans quel film ou série verrais-tu votre couple ? Pourquoi ?"),
  q("d11", "doux", "Quel est le compliment que tu n'as jamais osé faire à {toi} ?"),
  q("d12", "doux", "Qu'aimerais-tu que vous fassiez ensemble avant la fin de l'année ?"),
  q("d13", "doux", "Quelle partie de ta journée préfères-tu quand {toi} est là ?"),
  d("d14", "doux", "Fais un câlin de 30 secondes à {toi}, sans bouger et sans parler.", 30),
  d("d15", "doux", "Imite {toi} quand il ou elle se réveille le matin.", 30),
  d("d16", "doux", "Regarde {toi} dans les yeux pendant 30 secondes. Le premier qui rit a perdu.", 30),
  d("d17", "doux", "Fais trois compliments à {toi}, chacun sur une partie différente de son visage."),
  d("d18", "doux", "Masse les mains de {toi} pendant une minute.", 60),
  d("d19", "doux", "Écris un mot doux sur le téléphone de {toi} et laisse-le en fond d'écran jusqu'à demain."),
  d("d20", "doux", "Danse un slow avec {toi}, même sans musique.", 45),
  d("d21", "doux", "Donne un bisou à {toi} à un endroit qu'il ou elle choisit… sur le visage.",),
  d("d22", "doux", "Fais une déclaration d'amour dramatique à {toi}, façon télénovela.", 45),
  d("d23", "doux", "Coiffe {toi} comme tu veux. Il ou elle garde la coiffure jusqu'à la fin du tour suivant."),
  d("d24", "doux", "Dessine {toi} en 30 secondes sur une feuille ou sur ton téléphone.", 30),
  d("d25", "doux", "Murmure à l'oreille de {toi} ce que tu préfères chez lui ou chez elle."),
  d("d26", "doux", "Fais deviner à {toi} un souvenir commun en mimant, sans parler.", 60),
  d("d27", "doux", "Prends {toi} en selfie dans la pose la plus romantique possible."),
  d("d28", "doux", "Fais un bisou esquimau à {toi}, nez contre nez, pendant 10 secondes.", 10),
  j("d29", "doux", "rejouer", "Joker : tu rejoues tout de suite. Pioche une autre carte."),
  j("d30", "doux", "passer", "Joker : tu le gardes. Il te permettra de refuser un défi sans gage."),

  // ——— COQUIN ———
  q("c01", "coquin", "Quelle tenue de {toi} te fait le plus d'effet ?"),
  q("c02", "coquin", "Où aimerais-tu que {toi} t'embrasse là, tout de suite ?"),
  q("c03", "coquin", "Quel est le moment où tu as eu le plus envie de {toi} en public ?"),
  q("c04", "coquin", "Quel parfum ou quelle odeur te fait penser à {toi} ?"),
  q("c05", "coquin", "Quel geste de {toi} te met dans tous tes états ?"),
  q("c06", "coquin", "Raconte le baiser avec {toi} que tu n'oublieras jamais."),
  q("c07", "coquin", "Qu'est-ce que tu aimerais que {toi} ose plus souvent ?"),
  q("c08", "coquin", "Quel rendez-vous surprise rêverais-tu de préparer pour {toi} ?"),
  q("c09", "coquin", "Tu préfères les câlins du matin ou ceux du soir avec {toi} ? Explique."),
  q("c10", "coquin", "Quelle partie du corps de {toi} est ta préférée ? Montre-la du doigt."),
  q("c11", "coquin", "Quel message de {toi} t'a déjà fait rougir ?"),
  q("c12", "coquin", "Si {toi} était un dessert, lequel serait-il ? Pourquoi ?"),
  q("c13", "coquin", "Qu'est-ce qui t'a donné envie d'embrasser {toi} pour la première fois ?"),
  d("c14", "coquin", "Masse les épaules de {toi} pendant deux minutes. Interdit de parler, interdit de rire.", 120),
  d("c15", "coquin", "Embrasse {toi} dans le cou, très lentement.", 20),
  d("c16", "coquin", "Fais un bisou à {toi} à trois endroits différents qu'il ou elle ne devine pas à l'avance."),
  d("c17", "coquin", "Envoie un message coquin à {toi}, alors qu'il ou elle est juste à côté de toi."),
  d("c18", "coquin", "Danse de façon sensuelle pour {toi} pendant 30 secondes.", 30),
  d("c19", "coquin", "Les yeux fermés, devine quelle partie du visage de {toi} tu touches du bout des doigts.", 60),
  d("c20", "coquin", "Chuchote à {toi} ce que tu as envie de lui faire ce soir, en une seule phrase."),
  d("c21", "coquin", "Assieds-toi sur les genoux de {toi} jusqu'à la fin du prochain tour."),
  d("c22", "coquin", "Embrasse {toi} comme dans la scène finale d'un film d'amour.", 15),
  d("c23", "coquin", "Caresse les cheveux de {toi} pendant une minute, en le ou la regardant dans les yeux.", 60),
  d("c24", "coquin", "Mords tendrement la lèvre de {toi}. Juste un peu."),
  d("c25", "coquin", "Retire un bijou, une montre ou une chaussette de {toi}, uniquement avec les dents."),
  d("c26", "coquin", "Fais un massage des pieds à {toi} pendant une minute.", 60),
  d("c27", "coquin", "Souffle doucement dans le cou de {toi} pendant 15 secondes.", 15),
  d("c28", "coquin", "Décris {toi} à voix haute comme si tu présentais la personne la plus sexy du monde.", 45),
  j("c29", "coquin", "ensemble", "Joker : la prochaine carte, {toi} et toi la jouez ensemble."),
  j("c30", "coquin", "rejouer", "Joker : tu rejoues tout de suite. Pioche une autre carte."),

  // ——— BRÛLANT ———
  q("b01", "brulant", "Quel fantasme n'as-tu encore jamais avoué à {toi} ? Une phrase suffit."),
  q("b02", "brulant", "Dans quel endroit insolite aimerais-tu embrasser {toi} passionnément ?"),
  q("b03", "brulant", "Qu'est-ce que {toi} fait qui te rend complètement fou ou folle ?"),
  q("b04", "brulant", "Quelle est la nuit avec {toi} que tu rejouerais sans hésiter ?"),
  q("b05", "brulant", "Quelle tenue aimerais-tu voir porter à {toi}, rien que pour toi ?"),
  q("b06", "brulant", "Où {toi} aime-t-il ou elle le plus être embrassé·e ? Vérifie ta réponse."),
  q("b07", "brulant", "Quel mot ou quelle phrase de {toi} te fait instantanément de l'effet ?"),
  q("b08", "brulant", "Si tu avais une seule nuit pour surprendre {toi}, que ferais-tu ?"),
  q("b09", "brulant", "Qu'est-ce que tu aimerais que {toi} te murmure plus souvent ?"),
  q("b10", "brulant", "Lent et tendre, ou intense et passionné : que préfères-tu avec {toi} ce soir ?"),
  q("b11", "brulant", "Quel est le détail de {toi} auquel tu penses quand il ou elle n'est pas là ?"),
  q("b12", "brulant", "Raconte à {toi}, les yeux dans les yeux, la dernière fois que tu as rêvé de lui ou d'elle."),
  q("b13", "brulant", "Qu'est-ce qui te donne le plus envie de {toi} : un regard, une voix ou un geste ?"),
  d("b14", "brulant", "Bande les yeux de {toi} et embrasse-le ou la à trois endroits surprises.", 60),
  d("b15", "brulant", "Embrasse {toi} pendant 30 secondes sans t'arrêter.", 30),
  d("b16", "brulant", "Fais un massage du dos à {toi}, en descendant tout doucement.", 120),
  d("b17", "brulant", "Murmure à {toi} ce que tu lui réserves pour la fin de la soirée."),
  d("b18", "brulant", "Enlève un vêtement de ton choix à {toi}. Lentement."),
  d("b19", "brulant", "{toi} ferme les yeux. Tu as 30 secondes pour le ou la faire frissonner sans utiliser tes mains.", 30),
  d("b20", "brulant", "Glisse un glaçon (ou ton doigt) le long du dos de {toi}, de la nuque jusqu'aux reins.", 30),
  d("b21", "brulant", "Embrasse {toi} partout sur le visage et dans le cou, sans toucher ses lèvres.", 45),
  d("b22", "brulant", "Fais à {toi} la danse la plus provocante dont tu sois capable.", 45),
  d("b23", "brulant", "Guide les mains de {toi} là où tu aimes être caressé·e, par-dessus les vêtements.", 30),
  d("b24", "brulant", "Assieds-toi face à {toi} et approche-toi jusqu'à frôler ses lèvres, sans l'embrasser.", 20),
  d("b25", "brulant", "Retire un de tes vêtements, au choix de {toi}."),
  d("b26", "brulant", "Fais un suçon discret à {toi}, à l'endroit de son choix.",),
  d("b27", "brulant", "Les yeux bandés, {toi} doit deviner où tu l'embrasses. Trois essais.", 60),
  d("b28", "brulant", "Fais une promesse coquine à {toi} pour demain. Il ou elle a le droit de te la rappeler."),
  j("b29", "brulant", "ensemble", "Joker : la prochaine carte, {toi} et toi la jouez ensemble."),
  j("b30", "brulant", "passer", "Joker : tu le gardes. Il te permettra de refuser un défi sans gage."),
];

export const GAGES: string[] = [
  "Gage : fais 10 bisous à {toi}, un par seconde.",
  "Gage : {toi} choisit ton prochain défi parmi deux cartes.",
  "Gage : chante une chanson d'amour à {toi}, debout.",
  "Gage : tu prépares une boisson à {toi}, servie comme au restaurant.",
  "Gage : tu masses les épaules de {toi} pendant toute la prochaine carte.",
  "Gage : tu dois appeler {toi} « mon trésor » jusqu'à la fin de la partie.",
  "Gage : {toi} t'envoie un message, tu dois y répondre par une déclaration.",
  "Gage : tu parles en chuchotant jusqu'à la fin de ton prochain tour.",
];

export function fill(text: string, moi: string, toi: string) {
  return text.replaceAll("{moi}", moi).replaceAll("{toi}", toi);
}
