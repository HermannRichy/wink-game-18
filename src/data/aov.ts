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
  // ——— Flirt : vérités ———
  v("vf01", "flirt", "Qu'est-ce qui t'a attiré·e chez {toi} au tout début ?"),
  v("vf02", "flirt", "Quelle est la qualité de {toi} que tu envies un peu ?"),
  v("vf03", "flirt", "Tu as déjà espionné le profil de {toi} sur les réseaux ? Jusqu'où ?"),
  v("vf04", "flirt", "Quel est le message de {toi} que tu as relu plusieurs fois ?"),
  v("vf05n", "flirt", "Quel petit détail chez {toi} te fait sourire sans qu'il ou elle le sache ?"),
  v("vf06", "flirt", "As-tu déjà fait semblant d'être occupé·e pour ne pas répondre trop vite à {toi} ?"),
  v("vf07", "flirt", "Que penses-tu que {toi} pense de toi en secret ?"),
  v("vf08", "flirt", "Quel est le meilleur moment passé avec {toi} jusqu'ici ?"),
  v("vf09", "flirt", "Qu'est-ce qui te rend timide devant {toi} ?"),
  v("vf10", "flirt", "Si tu devais résumer {toi} en un émoji, ce serait lequel ?"),
  v("vf11n", "flirt", "Si tu devais décrire {toi} en trois mots à ta famille, lesquels choisirais-tu ?"),
  v("vf12", "flirt", "As-tu déjà parlé de {toi} à tes amis ? Qu'as-tu dit ?"),
  // ——— Flirt : actions ———
  a("af01", "flirt", "Fais ton plus beau clin d'œil à {toi}."),
  a("af02", "flirt", "Complimente {toi} sur trois choses qui ne sont pas physiques."),
  a("af03", "flirt", "Fais une pose de mannequin et laisse {toi} te noter.", 15),
  a("af04n", "flirt", "Fais à {toi} un compliment sur sa voix, en le ou la regardant dans les yeux."),
  a("af05n", "flirt", "Dessine un cœur dans la paume de la main de {toi} avec ton doigt."),
  a("af06", "flirt", "Drague {toi} avec ta meilleure phrase d'accroche.", 20),
  a("af07", "flirt", "Fais deviner à {toi} une chanson d'amour en la fredonnant.", 30),
  a("af08n", "flirt", "Souris à {toi} comme au premier rendez-vous, sans parler, pendant 15 secondes.", 15),
  a("af09", "flirt", "Invente un surnom pour {toi} et utilise-le jusqu'à la fin de la partie."),
  a("af10", "flirt", "Fais une petite danse de séduction ridicule pour {toi}.", 15),
  a("af11", "flirt", "Écris un compliment à {toi} sur un papier et donne-le-lui."),
  a("af12", "flirt", "Fais un câlin rapide à {toi}, puis fais comme si de rien n'était."),

  // ——— Doux : vérités ———
  v("vd01n", "doux", "Quel moment avec {toi} aimerais-tu revivre exactement pareil ?"),
  v("vd02", "doux", "Quel moment avec {toi} t'a fait le plus rire ?"),
  v("vd03", "doux", "As-tu déjà été jaloux ou jalouse à cause de {toi} ? Raconte."),
  v("vd04", "doux", "Quelle habitude de {toi} trouves-tu la plus adorable ?"),
  v("vd05n", "doux", "Quelle petite attention de {toi} t'a touché·e plus que tu ne l'as montré ?"),
  v("vd06", "doux", "Quel est ton plus beau souvenir à deux ?"),
  v("vd07", "doux", "Si tu pouvais changer une seule chose à votre premier rendez-vous, ce serait quoi ?"),
  v("vd08", "doux", "Quel surnom aimerais-tu que {toi} te donne ?"),
  v("vd09", "doux", "Quand as-tu pensé à {toi} pour la dernière fois sans raison ?"),
  v("vd10", "doux", "Qu'est-ce qui te fait te sentir en sécurité avec {toi} ?"),
  v("vd11", "doux", "Quel est le cadeau que tu rêverais de recevoir de {toi} ?"),
  v("vd12n", "doux", "Quel film ou quelle série aimerais-tu absolument regarder avec {toi} ?"),
  // ——— Doux : actions ———
  a("ad01", "doux", "Fais un câlin à {toi} pendant 20 secondes, sans parler.", 20),
  a("ad02", "doux", "Imite {toi} quand il ou elle est de mauvaise humeur.", 20),
  a("ad03", "doux", "Fais trois compliments à {toi}, sans hésiter."),
  a("ad04n", "doux", "Pose ta tête sur l'épaule de {toi} et dis-lui une chose qui te rassure chez lui ou chez elle."),
  a("ad05n", "doux", "Fredonne à l'oreille de {toi} la chanson qui vous ressemble.", 20),
  a("ad06", "doux", "Regarde {toi} dans les yeux sans rire pendant 20 secondes.", 20),
  a("ad07", "doux", "Masse les mains de {toi}.", 30),
  a("ad08", "doux", "Écris « je t'aime » dans le dos de {toi} avec ton doigt."),
  a("ad09", "doux", "Fais une déclaration d'amour à {toi} avec un accent étranger.", 20),
  a("ad10", "doux", "Donne un bisou esquimau à {toi}."),
  a("ad11", "doux", "Prends {toi} en photo dans sa pose la plus mignonne."),
  a("ad12", "doux", "Chante le refrain de votre chanson à {toi}."),

  // ——— Coquin : vérités ———
  v("vc01n", "coquin", "Quelle partie de toi aimerais-tu que {toi} découvre plus lentement ?"),
  v("vc02n", "coquin", "Dans quelle situation banale as-tu déjà eu une envie soudaine de {toi} ?"),
  v("vc03n", "coquin", "Quel est le dernier rêve un peu coquin que tu as fait avec {toi} ?"),
  v("vc04n", "coquin", "Qu'est-ce que {toi} pourrait te murmurer pour que tu perdes tous tes moyens ?"),
  v("vc05", "coquin", "As-tu déjà eu envie de {toi} en public ? Où ?"),
  v("vc06", "coquin", "Quel geste de {toi} te donne des frissons ?"),
  v("vc07", "coquin", "Quel message coquin aimerais-tu recevoir de {toi} ?"),
  v("vc08", "coquin", "Câlin du matin ou du soir ? Pourquoi ?"),
  v("vc09n", "coquin", "Quelle est la chose la plus audacieuse que tu aies déjà faite pour séduire {toi} ?"),
  v("vc10n", "coquin", "Lèvres, cou ou oreilles : où {toi} embrasse-t-il ou elle le mieux ?"),
  v("vc11n", "coquin", "Si {toi} te faisait un massage ce soir, par où voudrais-tu qu'il ou elle commence ?"),
  v("vc12", "coquin", "Quel parfum de {toi} te rend fou ou folle ?"),
  // ——— Coquin : actions ———
  a("ac01n", "coquin", "Embrasse le poignet de {toi}, puis remonte doucement jusqu'au coude.", 15),
  a("ac02", "coquin", "Masse les épaules de {toi}.", 45),
  a("ac03", "coquin", "Murmure à {toi} ce que tu veux lui faire plus tard."),
  a("ac04n", "coquin", "Fais un défilé de mannequin pour {toi}, version la plus sexy possible.", 30),
  a("ac05n", "coquin", "Garde une main sur la cuisse de {toi} jusqu'à ton prochain tour."),
  a("ac06", "coquin", "Mordille l'oreille de {toi}."),
  a("ac07n", "coquin", "Donne à {toi} un baiser qui commence tout doux et finit passionné.", 15),
  a("ac08n", "coquin", "Écris à {toi} un message qui commence par « Ce soir, j'aimerais… » et envoie-le."),
  a("ac09n", "coquin", "Masse les tempes de {toi} en lui murmurant des mots doux.", 30),
  a("ac10", "coquin", "Retire une chaussette de {toi} avec les dents."),
  a("ac11", "coquin", "Fais un bisou à {toi} à trois endroits surprises."),
  a("ac12n", "coquin", "Embrasse {toi} derrière l'oreille et murmure-lui son prénom.", 15),

  // ——— Brûlant : vérités ———
  v("vb01n", "brulant", "Quel scénario aimerais-tu tester avec {toi}, en une seule phrase ?"),
  v("vb02n", "brulant", "D'après toi, quel est le moment le plus chaud que vous avez partagé ?"),
  v("vb03n", "brulant", "Qu'est-ce que {toi} porte (ou ne porte pas) qui te fait craquer à coup sûr ?"),
  v("vb04n", "brulant", "Plutôt lumière allumée ou éteinte avec {toi} ? Pourquoi ?"),
  v("vb05", "brulant", "Quel endroit insolite rêves-tu de partager avec {toi} ?"),
  v("vb06", "brulant", "Qu'aimerais-tu essayer avec {toi} que vous n'avez jamais fait ?"),
  v("vb07n", "brulant", "Quel compliment coquin rêverais-tu d'entendre de la bouche de {toi} ?"),
  v("vb08", "brulant", "As-tu déjà rêvé de {toi} d'une façon très coquine ? Raconte le début."),
  v("vb09", "brulant", "Plutôt les yeux bandés ou les yeux dans les yeux ?"),
  v("vb10n", "brulant", "Quel endroit de la maison te tente pour un moment à deux pas comme les autres ?"),
  v("vb11", "brulant", "Qu'est-ce qui t'excite le plus : qu'on te le dise ou qu'on te le montre ?"),
  v("vb12", "brulant", "Décris à {toi}, sans rougir, ce que tu as en tête là, tout de suite."),
  // ——— Brûlant : actions ———
  a("ab01n", "brulant", "Fais glisser lentement tes mains sous le haut de {toi}, dans son dos.", 20),
  a("ab02n", "brulant", "Embrasse {toi} en le ou la plaquant doucement contre un mur.", 30),
  a("ab03n", "brulant", "Trace un chemin de bisous de l'épaule de {toi} jusqu'au creux de son dos.", 45),
  a("ab04", "brulant", "Masse le bas du dos de {toi}, très lentement.", 60),
  a("ab05", "brulant", "Laisse {toi} t'embrasser où il ou elle veut.", 30),
  a("ab06", "brulant", "Fais frissonner {toi} sans utiliser tes mains.", 30),
  a("ab07n", "brulant", "Mets-toi à califourchon sur {toi} et regarde-le ou la dans les yeux sans bouger.", 20),
  a("ab08", "brulant", "Fais un strip-tease d'une seule pièce pour {toi}."),
  a("ab09", "brulant", "Embrasse le ventre de {toi}."),
  a("ab10n", "brulant", "Caresse l'intérieur des cuisses de {toi}, par-dessus les vêtements.", 20),
  a("ab11n", "brulant", "Mordille doucement la lèvre inférieure de {toi}."),
  a("ab12", "brulant", "Fais une promesse très coquine à {toi} pour la fin de la soirée."),
  // ——— Suites ———
  v("vd13", "doux", "Quelle habitude de {toi} as-tu fini par adopter ?"),
  v("vd14", "doux", "Quel est ton meilleur fou rire avec {toi} ?"),
  v("vd15", "doux", "Qu'est-ce qui t'a fait craquer pour de bon chez {toi} ?"),
  v("vd16", "doux", "Quel rêve aimerais-tu réaliser avec {toi} ?"),
  a("ad13", "doux", "Fais une déclaration d'amour à {toi} en trois mots seulement."),
  a("ad14", "doux", "Fais un câlin à {toi} en le ou la soulevant (ou en essayant)."),
  a("ad15", "doux", "Fais un dessin de {toi} en 20 secondes.", 20),
  a("ad16", "doux", "Raconte votre rencontre comme un commentateur de foot.", 30),
  v("vc13", "coquin", "Quelle est la chose la plus sexy chez {toi}, selon toi ?"),
  v("vc14", "coquin", "Tu as déjà rêvé de {toi} ? Raconte le passage le plus coquin."),
  v("vc15", "coquin", "Qu'aimerais-tu que {toi} porte pour votre prochain rendez-vous ?"),
  v("vc16", "coquin", "Quel est ton meilleur souvenir de baiser avec {toi} ?"),
  a("ac13", "coquin", "Embrasse {toi} à un endroit qu'il ou elle n'attend pas."),
  a("ac14", "coquin", "Fais un massage du cou à {toi}, en l'embrassant à la fin.", 30),
  a("ac15", "coquin", "Danse collé·e à {toi} sur une chanson lente.", 30),
  a("ac16", "coquin", "Chuchote à {toi} ce qui te plaît le plus chez lui ou elle physiquement."),
  v("vb13n", "brulant", "Quelle caresse de {toi} pourrais-tu recevoir des heures sans t'en lasser ?"),
  v("vb14", "brulant", "Quel est ton plus grand fantasme avec {toi} ?"),
  v("vb15", "brulant", "Où {toi} t'a-t-il ou elle le plus excité·e ?"),
  v("vb16", "brulant", "Quelle partie de ton corps aimerais-tu que {toi} explore ce soir ?"),
  a("ab13", "brulant", "Enlève un vêtement de {toi} en l'embrassant à chaque geste."),
  a("ab14", "brulant", "Laisse {toi} t'attacher les mains (avec un foulard) jusqu'à ton prochain tour."),
  a("ab15", "brulant", "Embrasse {toi} de la nuque jusqu'aux reins.", 30),
  a("ab16", "brulant", "Murmure à {toi} trois choses que tu as envie de lui faire, de la plus douce à la plus osée."),
  // ——— Nouveautés Flirt et Doux ———
  v("vf21", "flirt", "Quelle est la chose la plus drôle que {toi} ait faite pour te séduire ?"),
  v("vf22", "flirt", "Si {toi} était une saison, laquelle serait-ce, et pourquoi ?"),
  v("vf23", "flirt", "À quel moment as-tu compris que {toi} te plaisait vraiment ?"),
  v("vf24", "flirt", "Quel surnom de {toi} t'agace en secret, et lequel tu adores ?"),
  v("vf25", "flirt", "Quel talent caché de {toi} mériterait d'être connu de tout le monde ?"),
  v("vf26", "flirt", "Quelle est ta photo préférée de {toi} ?"),
  v("vf27", "flirt", "Si tu devais faire une surprise à {toi} demain, ce serait quoi ?"),
  v("vf28", "flirt", "Quelle tête fait {toi} quand il ou elle se concentre, et pourquoi elle te fait craquer ?"),
  a("af21", "flirt", "Fais deviner à {toi} ton plat préféré en le mimant.", 30),
  a("af22", "flirt", "Donne une note sur 10 à la tenue du jour de {toi}, avec trois arguments."),
  a("af23", "flirt", "Imite la façon dont {toi} rit, jusqu'à ce qu'il ou elle rie pour de vrai."),
  a("af24", "flirt", "Raconte votre rencontre en 30 secondes, version film d'action.", 30),
  a("af25", "flirt", "Fais un compliment à {toi} uniquement en émojis, puis traduis-le."),
  a("af26", "flirt", "Choisis une chanson et fais danser {toi} sur le refrain.", 30),
  a("af27", "flirt", "Arrange les cheveux de {toi} comme tu les préfères."),
  a("af28", "flirt", "Prends une photo de vous deux avec la grimace la plus ridicule possible."),
  v("vd21", "doux", "Qu'est-ce que {toi} fait mieux que personne pour te remonter le moral ?"),
  v("vd22", "doux", "Quel projet aimerais-tu réaliser avec {toi} cette année ?"),
  v("vd23", "doux", "Quelle chanson aimerais-tu entendre à votre mariage, même pour rire ?"),
  v("vd24", "doux", "Quel est le petit rituel que tu adores partager avec {toi} ?"),
  v("vd25", "doux", "Quand t'es-tu senti·e le plus fier ou la plus fière de {toi} ?"),
  v("vd26", "doux", "Quelle dispute avec {toi} te fait rire aujourd'hui ?"),
  v("vd27", "doux", "Qu'est-ce que tu as appris grâce à {toi} ?"),
  v("vd28", "doux", "Quel endroit de votre ville aimerais-tu redécouvrir avec {toi} ?"),
  a("ad21", "doux", "Fais un câlin à {toi} par derrière et reste comme ça jusqu'à ton prochain tour."),
  a("ad22", "doux", "Masse le cuir chevelu de {toi}.", 30),
  a("ad23", "doux", "Dis trois choses que tu aimes chez {toi} et qui n'ont rien à voir avec le physique."),
  a("ad24", "doux", "Prépare un verre ou un petit en-cas pour {toi}, servi avec style."),
  a("ad25", "doux", "Lis à {toi}, de ta voix la plus douce, le dernier message qu'il ou elle t'a envoyé."),
  a("ad26", "doux", "Écris un mot doux avec ton doigt sur la main de {toi} : il ou elle doit le deviner."),
  a("ad27", "doux", "Promets à {toi} une sortie en tête-à-tête, avec la date et le lieu."),
  a("ad28", "doux", "Regarde une photo souvenir avec {toi} et raconte ce que tu ressentais ce jour-là."),
];

/** Actions faisables à distance (Mode Distance), par niveau */
const d = (id: string, level: Level, text: string, seconds?: number): AovCard => ({ id, level, kind: "action", text, seconds });

export const AOV_DISTANCE: AovCard[] = [
  // Flirt
  d("xf01", "flirt", "Envoie à {toi} un vocal où tu lui fais ta meilleure phrase de drague."),
  d("xf02", "flirt", "Envoie à {toi} ton selfie le plus charmeur."),
  d("xf03", "flirt", "Envoie à {toi} trois émojis qui le ou la décrivent, puis explique-les."),
  d("xf04", "flirt", "Change le nom de {toi} dans tes contacts pour un surnom mignon, et montre-le en capture."),
  d("xf05", "flirt", "Envoie à {toi} une chanson qui te fait penser à lui ou à elle."),
  d("xf06", "flirt", "Fais un clin d'œil à {toi} en appel vidéo.", 10),
  d("xf07", "flirt", "Écris à {toi} un compliment de trois lignes, sans parler de son physique."),
  d("xf08", "flirt", "Envoie à {toi} une photo de ce que tu vois par ta fenêtre, avec une légende romantique."),
  // Doux
  d("xd01", "doux", "Envoie un vocal de 20 secondes où tu racontes à {toi} ton souvenir préféré avec lui ou elle."),
  d("xd02", "doux", "Appelle {toi} en vidéo et souris-lui sans parler pendant 15 secondes.", 15),
  d("xd03", "doux", "Écris à {toi} ce que vous ferez la prochaine fois que vous vous verrez."),
  d("xd04", "doux", "Envoie à {toi} une photo de toi quand tu étais enfant."),
  d("xd05", "doux", "Chante le refrain de votre chanson en vocal pour {toi}."),
  d("xd06", "doux", "Mets une photo de vous deux en fond d'écran et envoie la capture à {toi}."),
  d("xd07", "doux", "Écris un mini-poème de 4 vers pour {toi}."),
  d("xd08", "doux", "Envoie à {toi} un « bonne nuit » en vocal, version la plus tendre possible."),
  // Coquin
  d("xc01", "coquin", "Envoie à {toi} un vocal où tu murmures ce que tu aimerais lui faire en le ou la revoyant."),
  d("xc02", "coquin", "Décris par message la tenue que tu aimerais voir porter à {toi} au prochain rendez-vous."),
  d("xc03", "coquin", "Envoie à {toi} un selfie avec ton regard le plus séducteur."),
  d("xc04", "coquin", "Écris à {toi} où tu l'embrasserais en premier s'il ou elle était là."),
  d("xc05", "coquin", "En appel vidéo, fais une danse sensuelle de 15 secondes pour {toi}.", 15),
  d("xc06", "coquin", "Envoie à {toi} un message coquin qu'il ou elle devra relire avant de dormir."),
  d("xc07", "coquin", "Promets par écrit un massage à {toi} pour votre prochain rendez-vous. Il ou elle choisit la durée."),
  d("xc08", "coquin", "Raconte à {toi} en vocal votre baiser le plus mémorable."),
  // Brûlant
  d("xb01", "brulant", "Envoie un vocal de 20 secondes où tu décris à {toi} votre prochaine nuit ensemble."),
  d("xb02", "brulant", "Écris à {toi} ton fantasme du moment, en une phrase."),
  d("xb03", "brulant", "Murmure en vocal à {toi} ce qui te manque le plus chez lui ou elle, physiquement."),
  d("xb04", "brulant", "Fais une promesse très coquine à {toi} pour votre prochain rendez-vous. Elle est due."),
  d("xb05", "brulant", "Décris par message à {toi}, étape par étape, comment tu le ou la déshabillerais."),
  d("xb06", "brulant", "En appel vidéo, regarde {toi} dans les yeux et dis-lui ce que tu as envie de faire, sans rougir.", 20),
  d("xb07", "brulant", "Envoie à {toi} une liste de trois choses que vous n'avez jamais faites et que tu aimerais essayer."),
  d("xb08", "brulant", "Laisse {toi} choisir un défi coquin que tu devras faire au prochain rendez-vous."),
];

/** Défi à deux à distance (égalité au morpion, etc.) */
export const DISTANCE_DUO: string[] = [
  "Égalité : appel vidéo, et chacun fait un compliment à l'autre.",
  "Égalité : chacun envoie à l'autre un vocal d'une phrase coquine.",
  "Égalité : chacun envoie à l'autre son selfie le plus drôle.",
  "Égalité : chacun écrit à l'autre ce qui lui manque le plus ce soir.",
  "Égalité : chacun envoie à l'autre une chanson qui résume votre couple.",
  "Égalité : chacun promet à l'autre un câlin de 5 minutes au prochain rendez-vous.",
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
