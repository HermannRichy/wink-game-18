import { LEVEL_ORDER, type Level } from "@/data/cards";

export interface QuizQuestion {
  id: string;
  level: Level;
  /** {moi} = celui qui demande, {toi} = celui qui répond */
  text: string;
}

const qz = (id: string, level: Level, text: string): QuizQuestion => ({ id, level, text });

export const QUIZ: QuizQuestion[] = [
  // ——— FLIRT ———
  qz("qf01", "flirt", "{toi}, quel est le premier truc que tu as pensé en voyant {moi} ?"),
  qz("qf02", "flirt", "{toi}, quel est ton type, physiquement ? {moi} est dedans ?"),
  qz("qf03", "flirt", "{toi}, quel plat choisirais-tu pour impressionner {moi} ?"),
  qz("qf04", "flirt", "{toi}, quelle est ta meilleure technique de drague ? Fais une démo."),
  qz("qf05", "flirt", "{toi}, qu'est-ce qui te fait craquer chez quelqu'un en premier ?"),
  qz("qf06", "flirt", "{toi}, quel film regarderais-tu avec {moi} pour une première soirée ?"),
  qz("qf07", "flirt", "{toi}, plutôt message tous les jours ou appel tous les soirs ?"),
  qz("qf08", "flirt", "{toi}, quel trait de caractère de {moi} t'intrigue le plus ?"),
  qz("qf09", "flirt", "{toi}, si tu devais écrire la bio Instagram de {moi}, que mettrais-tu ?"),
  qz("qf10", "flirt", "{toi}, à quel moment as-tu rougi devant {moi} ?"),
  qz("qf11", "flirt", "{toi}, quel compliment de {moi} t'a le plus marqué·e ?"),
  qz("qf12", "flirt", "{toi}, quelle activité aimerais-tu essayer avec {moi} pour la première fois ?"),
  qz("qf13", "flirt", "{toi}, quelle est la chose la plus romantique qu'on ait faite pour toi ?"),
  qz("qf14", "flirt", "{toi}, quel accessoire ou vêtement va le mieux à {moi} ?"),
  qz("qf15", "flirt", "{toi}, que ferais-tu si {moi} t'invitait à danser là, maintenant ?"),
  qz("qf16", "flirt", "{toi}, quelle question as-tu toujours voulu poser à {moi} ?"),
  qz("qf17", "flirt", "{toi}, qu'est-ce qui te fait sourire quand tu reçois un message de {moi} ?"),
  qz("qf18", "flirt", "{toi}, si {moi} était un parfum, ce serait quoi ?"),
  qz("qf19", "flirt", "{toi}, quel est ton petit défaut que {moi} ne connaît pas encore ?"),
  qz("qf20", "flirt", "{toi}, décris le rendez-vous parfait avec {moi} en trois mots."),

  // ——— DOUX ———
  qz("qd01", "doux", "{toi}, à quel moment as-tu su que tu tenais vraiment à {moi} ?"),
  qz("qd02", "doux", "{toi}, quelle est la chose la plus mignonne que {moi} fait sans s'en rendre compte ?"),
  qz("qd03", "doux", "{toi}, si notre couple était un plat, ce serait lequel ?"),
  qz("qd04", "doux", "{toi}, quel est le meilleur cadeau que {moi} t'ait fait ?"),
  qz("qd05", "doux", "{toi}, quelle habitude de {moi} as-tu fini par adopter ?"),
  qz("qd06", "doux", "{toi}, quel est ton souvenir de notre premier fou rire ensemble ?"),
  qz("qd07", "doux", "{toi}, qu'est-ce qui t'a fait sourire chez {moi} cette semaine ?"),
  qz("qd08", "doux", "{toi}, où nous vois-tu dans cinq ans ?"),
  qz("qd09", "doux", "{toi}, quelle chanson devrait être « notre chanson » ?"),
  qz("qd10", "doux", "{toi}, quel trait de caractère de {moi} t'impressionne le plus ?"),
  qz("qd11", "doux", "{toi}, quelle est la date parfaite selon toi, du matin au soir ?"),
  qz("qd12", "doux", "{toi}, qu'aimerais-tu que {moi} t'apprenne ?"),
  qz("qd13", "doux", "{toi}, quel petit geste de {moi} te rassure quand ça ne va pas ?"),
  qz("qd14", "doux", "{toi}, si tu devais décrire {moi} en trois mots, lesquels ?"),
  qz("qd15", "doux", "{toi}, quel voyage rêves-tu de faire avec {moi} ?"),
  qz("qd16", "doux", "{toi}, quelle est la première chose que tu as remarquée chez {moi} ?"),
  qz("qd17", "doux", "{toi}, quel moment avec {moi} aimerais-tu revivre exactement pareil ?"),
  qz("qd18", "doux", "{toi}, qu'est-ce que {moi} fait mieux que n'importe qui ?"),
  qz("qd19", "doux", "{toi}, quel surnom de {moi} préfères-tu, et pourquoi ?"),
  qz("qd20", "doux", "{toi}, de quoi es-tu le plus fier ou la plus fière dans notre couple ?"),

  // ——— COQUIN ———
  qz("qc01", "coquin", "{toi}, quel est le moment où tu m'as trouvé·e le plus irrésistible ? Décris-le en trois mots."),
  qz("qc02", "coquin", "{toi}, quelle tenue de {moi} te fait perdre tes moyens ?"),
  qz("qc03", "coquin", "{toi}, quel est ton endroit préféré pour recevoir un bisou ?"),
  qz("qc04", "coquin", "{toi}, quel message de {moi} t'a déjà fait rougir en public ?"),
  qz("qc05", "coquin", "{toi}, qu'est-ce qui te donne envie d'embrasser {moi} sur-le-champ ?"),
  qz("qc06", "coquin", "{toi}, raconte notre baiser le plus inoubliable."),
  qz("qc07", "coquin", "{toi}, quelle partie du corps de {moi} préfères-tu regarder ?"),
  qz("qc08", "coquin", "{toi}, câlin du matin ou câlin du soir ? Justifie."),
  qz("qc09", "coquin", "{toi}, quel parfum aimerais-tu que {moi} porte plus souvent ?"),
  qz("qc10", "coquin", "{toi}, quel est le geste de {moi} qui te donne des frissons ?"),
  qz("qc11", "coquin", "{toi}, as-tu déjà pensé à {moi} à un moment vraiment inapproprié ? Raconte."),
  qz("qc12", "coquin", "{toi}, quelle est ta façon préférée d'être réveillé·e par {moi} ?"),
  qz("qc13", "coquin", "{toi}, quel compliment de {moi} t'a fait le plus d'effet ?"),
  qz("qc14", "coquin", "{toi}, quel rendez-vous coquin aimerais-tu que {moi} organise ?"),
  qz("qc15", "coquin", "{toi}, qu'est-ce que tu aimerais que {moi} ose plus souvent ?"),
  qz("qc16", "coquin", "{toi}, quel détail physique de {moi} est ton petit secret ?"),
  qz("qc17", "coquin", "{toi}, quel film t'a déjà donné des idées pour nous deux ?"),
  qz("qc18", "coquin", "{toi}, tu préfères quand {moi} prend les devants ou quand c'est toi ?"),
  qz("qc19", "coquin", "{toi}, quel est le lieu le plus surprenant où tu as eu envie d'embrasser {moi} ?"),
  qz("qc20", "coquin", "{toi}, quelle phrase de {moi} te fait toujours craquer ?"),

  // ——— BRÛLANT ———
  qz("qb01", "brulant", "{toi}, quel fantasme n'as-tu jamais osé avouer à {moi} ?"),
  qz("qb02", "brulant", "{toi}, quelle est la nuit avec {moi} que tu rejouerais sans hésiter ?"),
  qz("qb03", "brulant", "{toi}, qu'est-ce que {moi} fait qui te rend complètement fou ou folle ?"),
  qz("qb04", "brulant", "{toi}, lent et tendre, ou intense et passionné : que préfères-tu ?"),
  qz("qb05", "brulant", "{toi}, quelle tenue aimerais-tu voir porter à {moi}, rien que pour toi ?"),
  qz("qb06", "brulant", "{toi}, quel mot doux ou coquin aimerais-tu que {moi} te murmure ?"),
  qz("qb07", "brulant", "{toi}, quel endroit insolite rêves-tu de partager avec {moi} ?"),
  qz("qb08", "brulant", "{toi}, quel est le détail de {moi} auquel tu penses quand tu es seul·e ?"),
  qz("qb09", "brulant", "{toi}, si tu avais une nuit pour surprendre {moi}, que ferais-tu ?"),
  qz("qb10", "brulant", "{toi}, qu'est-ce qui t'allume le plus chez {moi} : la voix, le regard ou les mains ?"),
  qz("qb11", "brulant", "{toi}, qu'aimerais-tu essayer avec {moi} que vous n'avez jamais fait ?"),
  qz("qb12", "brulant", "{toi}, quel est ton meilleur souvenir intime avec {moi} ? Un seul détail suffit."),
  qz("qb13", "brulant", "{toi}, à quel endroit {moi} devrait-il ou elle t'embrasser ce soir ?"),
  qz("qb14", "brulant", "{toi}, quelle est ta définition d'une soirée parfaite à deux, version non censurée ?"),
  qz("qb15", "brulant", "{toi}, as-tu déjà rêvé de {moi} d'une façon très coquine ? Raconte le début."),
  qz("qb16", "brulant", "{toi}, quel geste de {moi} t'a déjà fait perdre la tête ?"),
  qz("qb17", "brulant", "{toi}, plutôt les yeux bandés ou les yeux dans les yeux ?"),
  qz("qb18", "brulant", "{toi}, quelle promesse coquine voudrais-tu que {moi} te fasse pour demain ?"),
  qz("qb19", "brulant", "{toi}, qu'est-ce qui te fait le plus d'effet : qu'on te dise ou qu'on te montre ?"),
  qz("qb20", "brulant", "{toi}, décris à {moi}, sans rougir, ce que tu as en tête là, tout de suite."),
  // ——— DOUX (suite) ———
  qz("qd21", "doux", "{toi}, quelle est la chose que {moi} dit souvent et que tu adores ?"),
  qz("qd22", "doux", "{toi}, quel est le meilleur conseil que {moi} t'ait donné ?"),
  qz("qd23", "doux", "{toi}, si tu devais offrir une journée parfaite à {moi}, à quoi ressemblerait-elle ?"),
  qz("qd24", "doux", "{toi}, quelle est ta photo préférée de vous deux ? Pourquoi ?"),
  qz("qd25", "doux", "{toi}, qu'est-ce que tu as appris grâce à {moi} ?"),
  qz("qd26", "doux", "{toi}, quel est le petit rituel de couple que tu préfères ?"),
  qz("qd27", "doux", "{toi}, quelle chanson danserais-tu avec {moi} à votre mariage ?"),
  qz("qd28", "doux", "{toi}, quand as-tu été le plus fier ou la plus fière de {moi} ?"),
  qz("qd29", "doux", "{toi}, qu'est-ce qui te manque le plus quand {moi} n'est pas là ?"),
  qz("qd30", "doux", "{toi}, quel est le moment où tu t'es senti·e le plus aimé·e par {moi} ?"),
  qz("qd31", "doux", "{toi}, qu'aimerais-tu que vous fassiez plus souvent ensemble ?"),
  qz("qd32", "doux", "{toi}, quel mot résume le mieux votre couple ?"),

  // ——— COQUIN (suite) ———
  qz("qc21", "coquin", "{toi}, quelle est la tenue de {moi} que tu préférerais voir ce soir ?"),
  qz("qc22", "coquin", "{toi}, quelle est la chose la plus osée que tu aies pensée en regardant {moi} ?"),
  qz("qc23", "coquin", "{toi}, quel est le meilleur endroit pour un câlin surprise ?"),
  qz("qc24", "coquin", "{toi}, si tu pouvais avoir {moi} rien que pour toi pendant une heure, que ferais-tu ?"),
  qz("qc25", "coquin", "{toi}, quel bisou de {moi} préfères-tu : doux, fougueux ou surprise ?"),
  qz("qc26", "coquin", "{toi}, à quel moment trouves-tu {moi} le plus sexy ?"),
  qz("qc27", "coquin", "{toi}, quelle chanson mettrais-tu pour une soirée coquine avec {moi} ?"),
  qz("qc28", "coquin", "{toi}, qu'est-ce que {moi} porte qui te rend fou ou folle ?"),
  qz("qc29", "coquin", "{toi}, quel est le message le plus coquin que tu aies eu envie d'envoyer à {moi} ?"),
  qz("qc30", "coquin", "{toi}, tu préfères les préliminaires longs ou les surprises spontanées ?"),
  qz("qc31", "coquin", "{toi}, quelle partie de toi aimerais-tu que {moi} embrasse plus souvent ?"),
  qz("qc32", "coquin", "{toi}, quel est ton petit fantasme romantique le plus sage ?"),

  // ——— BRÛLANT (suite) ———
  qz("qb21", "brulant", "{toi}, quel est le geste de {moi} qui t'excite instantanément ?"),
  qz("qb22", "brulant", "{toi}, quel est l'endroit le plus fou où tu rêverais d'être seul·e avec {moi} ?"),
  qz("qb23", "brulant", "{toi}, que voudrais-tu que {moi} te murmure pendant un moment intime ?"),
  qz("qb24", "brulant", "{toi}, quelle est la chose que tu n'as jamais osé demander à {moi} ?"),
  qz("qb25", "brulant", "{toi}, plutôt lumière tamisée ou noir complet ?"),
  qz("qb26", "brulant", "{toi}, quelle est ta plus grosse envie avec {moi} pour ce soir ?"),
  qz("qb27", "brulant", "{toi}, quel accessoire aimerais-tu tester avec {moi} ?"),
  qz("qb28", "brulant", "{toi}, quel moment intime avec {moi} t'a le plus surpris·e ?"),
  qz("qb29", "brulant", "{toi}, quelle partie du corps de {moi} pourrais-tu embrasser pendant des heures ?"),
  qz("qb30", "brulant", "{toi}, si {moi} te laissait tout décider ce soir, que choisirais-tu ?"),
  qz("qb31", "brulant", "{toi}, quel est ton meilleur souvenir de réveil avec {moi} ?"),
  qz("qb32", "brulant", "{toi}, quelle règle aimerais-tu imposer à {moi} pour une nuit ?"),
];

/** Mélange déterministe : la numérotation reste la même d'une partie à l'autre. */
function seededShuffle<T>(list: T[], seed = 1729): T[] {
  const a = [...list];
  let s = seed;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const ORDERED = seededShuffle(QUIZ);

/** Questions disponibles pour un niveau max, dans l'ordre de la grille (numéro = index + 1). */
export function quizFor(maxLevel: Level): QuizQuestion[] {
  const maxIdx = LEVEL_ORDER.indexOf(maxLevel);
  return ORDERED.filter((q) => LEVEL_ORDER.indexOf(q.level) <= maxIdx);
}
