export interface TowerAction {
  id: string;
  /** {moi} = celui qui a retiré le bloc, {toi} = partenaire */
  text: string;
  seconds?: number;
}

const a = (id: string, text: string, seconds?: number): TowerAction => ({ id, text, seconds });

/** Stock d'actions « hot » : 54 sont tirées au hasard à chaque partie. */
export const TOWER_ACTIONS: TowerAction[] = [
  a("t01", "Embrasse {toi} dans le cou, puis remonte jusqu'à l'oreille.", 20),
  a("t02", "Murmure à {toi} ce que tu lui ferais si vous étiez seuls dans un ascenseur."),
  a("t03", "Embrasse {toi} sans t'arrêter pendant 30 secondes.", 30),
  a("t04", "Retire un vêtement de {toi}, au choix de {toi}."),
  a("t05", "Retire un de tes vêtements, choisi par {toi}."),
  a("t06", "Bande les yeux de {toi} et embrasse-le ou la à trois endroits surprises.", 45),
  a("t07", "Masse le bas du dos de {toi}, très lentement.", 60),
  a("t08", "Mordille l'oreille de {toi}, tout doucement."),
  a("t09", "Assieds-toi à califourchon sur {toi} jusqu'à ton prochain bloc."),
  a("t10", "Fais un suçon discret à {toi}, à l'endroit de son choix."),
  a("t11", "Effleure les lèvres de {toi} avec les tiennes, sans jamais l'embrasser vraiment.", 20),
  a("t12", "Dis à {toi}, les yeux dans les yeux, ce qui t'excite le plus chez lui ou elle."),
  a("t13", "Fais une danse lascive pour {toi}.", 45),
  a("t14", "Caresse l'intérieur du poignet de {toi} avec tes lèvres.", 15),
  a("t15", "Embrasse {toi} comme si c'était votre dernière nuit.", 20),
  a("t16", "Laisse {toi} t'embrasser où il ou elle veut. Tu n'as pas le droit de bouger.", 30),
  a("t17", "Souffle doucement le long de la colonne de {toi}, de la nuque jusqu'aux reins.", 20),
  a("t18", "Glisse tes mains sous le haut de {toi} et caresse son dos.", 30),
  a("t19", "Décris à {toi}, en trois phrases, la nuit idéale que tu imagines avec lui ou elle."),
  a("t20", "Embrasse le ventre de {toi}, juste au-dessus du nombril."),
  a("t21", "Fais frissonner {toi} sans utiliser tes mains.", 30),
  a("t22", "Mets les mains de {toi} là où tu aimes être caressé·e, par-dessus les vêtements.", 20),
  a("t23", "Enlève ton haut, lentement, en fixant {toi}."),
  a("t24", "Embrasse chaque doigt de la main de {toi}."),
  a("t25", "{toi} ferme les yeux : embrasse-le ou la quelque part, il ou elle doit deviner où."),
  a("t26", "Promets quelque chose de coquin à {toi} pour la fin de la soirée. Promesse tenue obligatoire."),
  a("t27", "Fais un massage des cuisses à {toi}, par-dessus les vêtements.", 45),
  a("t28", "Plaque doucement {toi} contre un mur et embrasse-le ou la.", 20),
  a("t29", "Allonge-toi : {toi} t'embrasse de la cheville jusqu'au genou.", 30),
  a("t30", "Prends la main de {toi} et guide-la où tu veux.", 15),
  a("t31", "Chuchote un mot très coquin à l'oreille de {toi}. Un seul."),
  a("t32", "Joue avec les cheveux de {toi} en l'embrassant dans le cou.", 30),
  a("t33", "Fais goûter quelque chose de sucré à {toi} directement sur tes lèvres."),
  a("t34", "Embrasse les épaules de {toi}, une par une.", 20),
  a("t35", "Dis à {toi} quelle partie de son corps tu préfères, puis embrasse-la."),
  a("t36", "Enlève une chaussette de {toi} avec les dents."),
  a("t37", "Assieds {toi} sur une chaise et tourne autour de lui ou d'elle, sans le ou la toucher.", 30),
  a("t38", "Caresse le visage de {toi} du bout des doigts, les yeux fermés.", 30),
  a("t39", "Raconte à {toi} ton fantasme le plus sage, puis le moins sage."),
  a("t40", "Pose ta tête sur le torse de {toi} et embrasse-le doucement.", 20),
  a("t41", "Fais remonter un glaçon (ou ton doigt) le long du bras de {toi}.", 20),
  a("t42", "Mime à {toi}, sans un mot, ce que tu aimerais faire plus tard.", 30),
  a("t43", "Embrasse {toi} en le ou la tenant par la nuque.", 15),
  a("t44", "{toi} choisit un endroit à embrasser sur toi. Tu obéis."),
  a("t45", "Défais un bouton, une fermeture ou un lacet de {toi}."),
  a("t46", "Regarde {toi} droit dans les yeux sans parler. Le premier qui détourne le regard retire un vêtement.", 30),
  a("t47", "Masse les pieds de {toi}, puis embrasse ses chevilles.", 45),
  a("t48", "Fais un compliment très osé à {toi}, à voix haute."),
  a("t49", "Enlace {toi} par derrière et embrasse son cou.", 20),
  a("t50", "Fais un câlin à {toi}, peau contre peau, pendant 30 secondes.", 30),
  a("t51", "Mets ta main sur le cœur de {toi} et rapproche-toi jusqu'à sentir son souffle.", 15),
  a("t52", "Embrasse {toi} en mordillant sa lèvre inférieure."),
  a("t53", "{toi} t'embrasse les yeux fermés. Toi, tu gardes les mains dans le dos.", 30),
  a("t54", "Fais un strip-tease d'une seule pièce pour {toi}."),
  a("t55", "Dessine un cœur du bout du doigt sur le dos de {toi}, sous son haut."),
  a("t56", "Dis à {toi} trois choses que tu veux lui faire, en commençant par la plus douce."),
  a("t57", "Assieds-toi sur les genoux de {toi} et embrasse-le ou la.", 20),
  a("t58", "Fais un massage du cuir chevelu à {toi} en lui murmurant des mots doux.", 45),
  a("t59", "Allonge {toi} et embrasse-le ou la du front jusqu'au menton, très lentement.", 30),
  a("t60", "Caresse la jambe de {toi}, de la cheville jusqu'au genou.", 20),
  a("t61", "Mets une musique sensuelle et danse collé·e à {toi}.", 45),
  a("t62", "Embrasse {toi} à l'endroit qu'il ou elle préfère. Demande-lui d'abord."),
  a("t63", "Laisse {toi} retirer le vêtement de son choix sur toi."),
  a("t64", "Raconte à {toi} ton souvenir le plus chaud avec lui ou elle, en chuchotant."),
  a("t65", "Embrasse {toi} sur la clavicule, puis descends un peu.", 15),
  a("t66", "Prends {toi} dans tes bras et embrasse-le ou la comme au cinéma.", 15),
  a("t67", "Souffle sur la nuque de {toi}, puis embrasse-la.", 15),
  a("t68", "Joue au miroir : {toi} fait trois gestes sensuels, tu les reproduis.", 45),
  a("t69", "Fais une proposition indécente à {toi}. Il ou elle peut accepter ou refuser."),
  a("t70", "Embrasse le creux du genou de {toi}."),
  a("t71", "Caresse le dos de {toi} en dessinant des lettres. Il ou elle doit deviner le mot.", 45),
  a("t72", "Glisse un mot doux et coquin dans la poche de {toi}, à lire demain."),
  a("t73", "Embrasse {toi} sans les mains, sans les lèvres pendant 10 secondes, puis avec.", 20),
  a("t74", "Assieds-toi dos à {toi} : il ou elle t'embrasse les épaules.", 30),
  a("t75", "Retire tes chaussettes de la façon la plus sexy possible."),
  a("t76", "Tiens les poignets de {toi} au-dessus de sa tête et embrasse-le ou la.", 15),
  a("t77", "Fais deviner à {toi}, rien qu'en l'embrassant, à quoi tu penses."),
  a("t78", "Embrasse {toi} en caressant sa joue.", 15),
  a("t79", "Allonge-toi sur {toi}, front contre front, sans bouger.", 30),
  a("t80", "Dis à {toi} ce que tu porterais pour le ou la surprendre ce soir."),
  a("t81", "Fais un bisou partout sur le visage de {toi}, sauf sur la bouche.", 20),
  a("t82", "{toi} choisit : un vêtement en moins pour toi, ou un massage de 2 minutes pour lui ou elle."),
  a("t83", "Embrasse {toi} en lui caressant le bas du dos.", 20),
  a("t84", "Lèche ton doigt et passe-le doucement sur les lèvres de {toi}."),
  a("t85", "Réveille l'envie de {toi} en une seule phrase, chuchotée."),
  a("t86", "Laisse {toi} te bander les yeux pour le reste de ton tour."),
  a("t87", "Fais un câlin serré à {toi} en lui caressant les cheveux.", 30),
  a("t88", "Embrasse l'intérieur du bras de {toi}, du poignet jusqu'au coude.", 20),
  a("t89", "Chante quelques mots d'une chanson sensuelle à l'oreille de {toi}."),
  a("t90", "Échange un vêtement avec {toi} jusqu'à la fin de la partie."),
];

/** Gage final pour celui ou celle qui fait tomber la tour. */
export const TOWER_FINAL_GAGES: string[] = [
  "{moi} offre à {toi} un massage complet de 5 minutes, sans rien demander en retour.",
  "{moi} réalise un strip-tease de trois vêtements pour {toi}.",
  "{moi} exauce un souhait coquin de {toi} ce soir.",
  "{moi} devient l'esclave des bisous de {toi} pendant 5 minutes.",
  "{moi} prépare un bain ou une douche pour deux, et c'est {toi} qui décide de la suite.",
  "{moi} laisse {toi} lui bander les yeux pendant 3 minutes et se laisse faire.",
  "{moi} doit embrasser {toi} à 10 endroits différents, choisis par {toi}.",
  "{moi} organise un rendez-vous surprise pour {toi} dans la semaine. Thème : torride.",
];

export function shuffle<T>(list: T[]): T[] {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
