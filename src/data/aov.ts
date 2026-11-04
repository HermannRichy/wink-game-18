import type { Level } from "@/data/cards";

export type AovKind = "verite" | "action";

export interface AovCard {
  id: string;
  level: Level;
  kind: AovKind;
  /** {moi} = celui ou celle qui joue (« tu »), {toi} = partenaire */
  text: string;
  seconds?: number;
}

const v = (id: string, level: Level, text: string): AovCard => ({ id, level, kind: "verite", text });
const a = (id: string, level: Level, text: string, seconds?: number): AovCard => ({ id, level, kind: "action", text, seconds });

export const AOV: AovCard[] = [
  // ——— Doux : vérités ———
  v("vd01", "doux", "Quelle est la première chose que tu as aimée chez {toi} ?"),
  v("vd02", "doux", "Quel moment avec {toi} t'a fait le plus rire ?"),
  v("vd03", "doux", "As-tu déjà été jaloux ou jalouse à cause de {toi} ? Raconte."),
  v("vd04", "doux", "Quelle habitude de {toi} trouves-tu la plus adorable ?"),
  v("vd05", "doux", "Qu'est-ce que tu n'as jamais osé dire à {toi} ?"),
  v("vd06", "doux", "Quel est ton plus beau souvenir à deux ?"),
  v("vd07", "doux", "Si tu pouvais changer une seule chose à votre premier rendez-vous, ce serait quoi ?"),
  v("vd08", "doux", "Quel surnom aimerais-tu que {toi} te donne ?"),
  v("vd09", "doux", "Quand as-tu pensé à {toi} pour la dernière fois sans raison ?"),
  v("vd10", "doux", "Qu'est-ce qui te fait te sentir en sécurité avec {toi} ?"),
  v("vd11", "doux", "Quel est le cadeau que tu rêverais de recevoir de {toi} ?"),
  v("vd12", "doux", "Quelle chanson te fait penser à {toi} ?"),
  // ——— Doux : actions ———
  a("ad01", "doux", "Fais un câlin à {toi} pendant 20 secondes, sans parler.", 20),
  a("ad02", "doux", "Imite {toi} quand il ou elle est de mauvaise humeur.", 20),
  a("ad03", "doux", "Fais trois compliments à {toi}, sans hésiter."),
  a("ad04", "doux", "Fais un bisou sur le front de {toi}."),
  a("ad05", "doux", "Danse 20 secondes avec {toi}, même sans musique.", 20),
  a("ad06", "doux", "Regarde {toi} dans les yeux sans rire pendant 20 secondes.", 20),
  a("ad07", "doux", "Masse les mains de {toi}.", 30),
  a("ad08", "doux", "Écris « je t'aime » dans le dos de {toi} avec ton doigt."),
  a("ad09", "doux", "Fais une déclaration d'amour à {toi} avec un accent étranger.", 20),
  a("ad10", "doux", "Donne un bisou esquimau à {toi}."),
  a("ad11", "doux", "Prends {toi} en photo dans sa pose la plus mignonne."),
  a("ad12", "doux", "Chante le refrain de votre chanson à {toi}."),

  // ——— Coquin : vérités ———
  v("vc01", "coquin", "Quelle partie du corps de {toi} te fait le plus d'effet ?"),
  v("vc02", "coquin", "Où aimerais-tu que {toi} t'embrasse ce soir ?"),
  v("vc03", "coquin", "Quel est le baiser de {toi} que tu n'oublieras jamais ?"),
  v("vc04", "coquin", "Quelle tenue aimerais-tu voir porter à {toi} ?"),
  v("vc05", "coquin", "As-tu déjà eu envie de {toi} en public ? Où ?"),
  v("vc06", "coquin", "Quel geste de {toi} te donne des frissons ?"),
  v("vc07", "coquin", "Quel message coquin aimerais-tu recevoir de {toi} ?"),
  v("vc08", "coquin", "Câlin du matin ou du soir ? Pourquoi ?"),
  v("vc09", "coquin", "Qu'aimerais-tu que {toi} ose plus souvent ?"),
  v("vc10", "coquin", "Quel est ton endroit préféré pour recevoir un bisou ?"),
  v("vc11", "coquin", "Quelle est la chose la plus coquine que tu aies pensée de {toi} aujourd'hui ?"),
  v("vc12", "coquin", "Quel parfum de {toi} te rend fou ou folle ?"),
  // ——— Coquin : actions ———
  a("ac01", "coquin", "Embrasse {toi} dans le cou, lentement.", 15),
  a("ac02", "coquin", "Masse les épaules de {toi}.", 45),
  a("ac03", "coquin", "Murmure à {toi} ce que tu veux lui faire plus tard."),
  a("ac04", "coquin", "Danse de façon sensuelle pour {toi}.", 30),
  a("ac05", "coquin", "Assieds-toi sur les genoux de {toi} jusqu'à ton prochain tour."),
  a("ac06", "coquin", "Mordille l'oreille de {toi}."),
  a("ac07", "coquin", "Embrasse {toi} comme à la fin d'un film d'amour.", 15),
  a("ac08", "coquin", "Envoie un message coquin à {toi}, même s'il ou elle est à côté."),
  a("ac09", "coquin", "Caresse les cheveux de {toi} en le ou la regardant dans les yeux.", 30),
  a("ac10", "coquin", "Retire une chaussette de {toi} avec les dents."),
  a("ac11", "coquin", "Fais un bisou à {toi} à trois endroits surprises."),
  a("ac12", "coquin", "Souffle doucement dans le cou de {toi}.", 15),

  // ——— Brûlant : vérités ———
  v("vb01", "brulant", "Quel fantasme n'as-tu jamais avoué à {toi} ?"),
  v("vb02", "brulant", "Quelle nuit avec {toi} rejouerais-tu sans hésiter ?"),
  v("vb03", "brulant", "Qu'est-ce que {toi} fait qui te rend complètement fou ou folle ?"),
  v("vb04", "brulant", "Lent et tendre ou intense et passionné, ce soir ?"),
  v("vb05", "brulant", "Quel endroit insolite rêves-tu de partager avec {toi} ?"),
  v("vb06", "brulant", "Qu'aimerais-tu essayer avec {toi} que vous n'avez jamais fait ?"),
  v("vb07", "brulant", "Quel mot de {toi} te fait instantanément de l'effet ?"),
  v("vb08", "brulant", "As-tu déjà rêvé de {toi} d'une façon très coquine ? Raconte le début."),
  v("vb09", "brulant", "Plutôt les yeux bandés ou les yeux dans les yeux ?"),
  v("vb10", "brulant", "Quelle est la chose la plus osée que tu aimerais que {toi} te fasse ?"),
  v("vb11", "brulant", "Qu'est-ce qui t'excite le plus : qu'on te le dise ou qu'on te le montre ?"),
  v("vb12", "brulant", "Décris à {toi}, sans rougir, ce que tu as en tête là, tout de suite."),
  // ——— Brûlant : actions ———
  a("ab01", "brulant", "Retire un vêtement, au choix de {toi}."),
  a("ab02", "brulant", "Embrasse {toi} pendant 30 secondes sans t'arrêter.", 30),
  a("ab03", "brulant", "Bande les yeux de {toi} et embrasse-le ou la à trois endroits surprises.", 45),
  a("ab04", "brulant", "Masse le bas du dos de {toi}, très lentement.", 60),
  a("ab05", "brulant", "Laisse {toi} t'embrasser où il ou elle veut.", 30),
  a("ab06", "brulant", "Fais frissonner {toi} sans utiliser tes mains.", 30),
  a("ab07", "brulant", "Retire un vêtement de {toi}, lentement."),
  a("ab08", "brulant", "Fais un strip-tease d'une seule pièce pour {toi}."),
  a("ab09", "brulant", "Embrasse le ventre de {toi}."),
  a("ab10", "brulant", "Guide les mains de {toi} là où tu aimes être caressé·e, par-dessus les vêtements.", 20),
  a("ab11", "brulant", "Fais un suçon discret à {toi}, à l'endroit de son choix."),
  a("ab12", "brulant", "Fais une promesse très coquine à {toi} pour la fin de la soirée."),
];

/** Défi à faire à deux (égalité au morpion, etc.). Pas de « tu » : s'adresse au couple. */
export const DUO_CHALLENGES: string[] = [
  "Égalité : embrassez-vous pendant 15 secondes.",
  "Égalité : câlin serré, chacun murmure un compliment à l'autre.",
  "Égalité : chacun retire un vêtement.",
  "Égalité : massez-vous les mains en même temps pendant 30 secondes.",
  "Égalité : un slow de 30 secondes, collés l'un à l'autre.",
  "Égalité : chacun fait un bisou à l'autre, là où l'autre le demande.",
  "Égalité : regardez-vous dans les yeux 20 secondes. Le premier qui rit fait un bisou à l'autre.",
  "Égalité : chacun dit à l'autre ce qui lui fait le plus envie ce soir.",
];
