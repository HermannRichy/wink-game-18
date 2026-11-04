/**
 * Textes de Ludo Hot. Toujours au niveau hot.
 * Convention : {moi} = joueur concerné (« tu »), {toi} = son ou sa partenaire.
 */
export interface LudoText {
  id: string;
  text: string;
  seconds?: number;
}

const t = (id: string, text: string, seconds?: number): LudoText => ({ id, text, seconds });

/** Case Brûlante : {toi} choisit l'un de deux défis pour {moi}. */
export const LUDO_HOT_CELL: LudoText[] = [
  t("h01", "Embrasse {toi} dans le cou jusqu'à ce qu'il ou elle frissonne.", 20),
  t("h02", "Retire un vêtement, au choix de {toi}."),
  t("h03", "Masse les épaules de {toi} en l'embrassant dans la nuque.", 45),
  t("h04", "Murmure à {toi} ce que tu veux lui faire ce soir."),
  t("h05", "Embrasse {toi} pendant 20 secondes, sans les mains.", 20),
  t("h06", "Fais une danse sensuelle pour {toi}.", 30),
  t("h07", "Laisse {toi} t'embrasser où il ou elle veut.", 20),
  t("h08", "Caresse le dos de {toi} sous son haut.", 30),
  t("h09", "Assieds-toi sur les genoux de {toi} jusqu'à ton prochain tour."),
  t("h10", "Mordille la lèvre de {toi}, tout doucement."),
  t("h11", "Bande les yeux de {toi} et embrasse-le ou la à deux endroits surprises.", 30),
  t("h12", "Dis à {toi} ton fantasme du moment, en une phrase."),
  t("h13", "Embrasse le ventre de {toi}."),
  t("h14", "Fais frissonner {toi} sans utiliser tes mains.", 20),
  t("h15", "Enlève une chaussette de {toi} avec les dents."),
  t("h16", "Souffle dans le cou de {toi}, puis embrasse-le.", 15),
  t("h17", "Défais un bouton ou une fermeture de {toi}."),
  t("h18", "Masse les cuisses de {toi}, par-dessus les vêtements.", 30),
  t("h19", "Fais un compliment très osé à {toi}, droit dans les yeux."),
  t("h20", "Embrasse {toi} en lui tenant les poignets.", 15),
  t("h21", "Caresse les cheveux de {toi} en l'embrassant.", 30),
  t("h22", "Enlace {toi} par derrière et embrasse ses épaules.", 20),
  t("h23", "Promets un moment coquin à {toi} pour demain. Il ou elle choisit le moment."),
  t("h24", "Embrasse l'intérieur du poignet de {toi}, puis remonte.", 20),
  t("h25", "Laisse {toi} retirer un de tes vêtements."),
  t("h26", "Raconte à {toi} ton meilleur souvenir intime avec lui ou elle, à l'oreille."),
  t("h27", "Embrasse {toi} comme dans un film, en le ou la renversant un peu.", 15),
  t("h28", "Allonge-toi : {toi} t'embrasse du cou jusqu'au nombril.", 30),
  t("h29", "Fais un câlin peau contre peau à {toi}.", 30),
  t("h30", "Mets les mains de {toi} où tu veux, par-dessus les vêtements.", 15),
];

/** Capture : {moi} vient de se faire capturer par {toi}, qui lui impose ce gage. */
export const LUDO_CAPTURE: LudoText[] = [
  t("x01", "Capturé·e ! Tu fais un massage des pieds à {toi}.", 45),
  t("x02", "Capturé·e ! Tu retires un vêtement."),
  t("x03", "Capturé·e ! Tu embrasses {toi} là où il ou elle te le demande."),
  t("x04", "Capturé·e ! Tu fais 10 bisous à {toi}, un par seconde.", 10),
  t("x05", "Capturé·e ! Tu restes assis·e sur les genoux de {toi} jusqu'à ton prochain tour."),
  t("x06", "Capturé·e ! Tu dis à {toi} ce que tu préfères chez lui ou elle, version coquine."),
  t("x07", "Capturé·e ! Tu masses le dos de {toi}.", 45),
  t("x08", "Capturé·e ! Tu fais une danse ridicule mais sexy pour {toi}.", 20),
  t("x09", "Capturé·e ! {toi} te bande les yeux jusqu'à ton prochain tour."),
  t("x10", "Capturé·e ! Tu dois embrasser {toi} dans le cou.", 15),
  t("x11", "Capturé·e ! Tu chantes une chanson d'amour à {toi}, à genoux."),
  t("x12", "Capturé·e ! Tu enlèves tes chaussettes de la façon la plus sexy possible."),
  t("x13", "Capturé·e ! {toi} choisit un endroit où t'embrasser. Tu ne bouges pas."),
  t("x14", "Capturé·e ! Tu fais une promesse coquine à {toi}."),
];

/** Faire un 6 : petite action bonus pour {moi}, avant de rejouer. */
export const LUDO_SIX: LudoText[] = [
  t("s01", "Un 6 ! Vole un bisou à {toi} avant de rejouer."),
  t("s02", "Un 6 ! Fais un clin d'œil coquin à {toi} et rejoue."),
  t("s03", "Un 6 ! Caresse la main de {toi} pendant ton prochain lancer."),
  t("s04", "Un 6 ! Chuchote un mot doux à {toi}."),
  t("s05", "Un 6 ! Embrasse l'épaule de {toi}."),
  t("s06", "Un 6 ! Pose ta main sur la cuisse de {toi} jusqu'à la fin de ton tour."),
  t("s07", "Un 6 ! Mordille l'oreille de {toi}."),
  t("s08", "Un 6 ! Fais un compliment à {toi} sur son corps."),
  t("s09", "Un 6 ! Embrasse {toi} sur le front, puis sur les lèvres."),
  t("s10", "Un 6 ! Souffle doucement dans le cou de {toi}."),
  t("s11", "Un 6 ! Passe ta main dans les cheveux de {toi}."),
  t("s12", "Un 6 ! {toi} te doit un bisou où tu veux."),
];

/** Pion rentré : {toi} offre une récompense à {moi}. */
export const LUDO_HOME: LudoText[] = [
  t("r01", "Pion rentré ! {toi} t'offre un massage des épaules.", 60),
  t("r02", "Pion rentré ! {toi} t'embrasse où tu veux."),
  t("r03", "Pion rentré ! {toi} retire un vêtement de ton choix."),
  t("r04", "Pion rentré ! {toi} te fait un câlin de 30 secondes.", 30),
  t("r05", "Pion rentré ! {toi} te murmure ce qu'il ou elle aime le plus chez toi."),
  t("r06", "Pion rentré ! {toi} te prépare une boisson, servie avec un bisou."),
  t("r07", "Pion rentré ! {toi} danse pour toi.", 30),
  t("r08", "Pion rentré ! {toi} t'embrasse dans le cou.", 20),
  t("r09", "Pion rentré ! {toi} masse tes pieds.", 45),
  t("r10", "Pion rentré ! {toi} te doit une faveur coquine, à réclamer quand tu veux."),
  t("r11", "Pion rentré ! {toi} te fait un compliment osé, les yeux dans les yeux."),
  t("r12", "Pion rentré ! {toi} enlève ses chaussettes avec les dents. Rien que pour toi."),
];

/** Victoire : {moi} a gagné et choisit l'une de 3 récompenses que {toi} lui doit. */
export const LUDO_FINAL: LudoText[] = [
  t("f01", "{toi} te fait un massage complet de 5 minutes."),
  t("f02", "{toi} exauce un de tes souhaits coquins ce soir."),
  t("f03", "{toi} te fait un strip-tease de trois vêtements."),
  t("f04", "{toi} est à tes ordres pendant 10 minutes. Rien que des ordres câlins ou coquins."),
  t("f05", "{toi} t'embrasse à 10 endroits que tu choisis."),
  t("f06", "{toi} prépare un bain ou une douche pour deux."),
  t("f07", "{toi} organise un rendez-vous surprise pour toi cette semaine."),
  t("f08", "{toi} te laisse lui bander les yeux pendant 3 minutes."),
  t("f09", "{toi} te réveille demain matin de la façon de ton choix."),
  t("f10", "{toi} te fait le petit déjeuner au lit, avec un bisou par bouchée."),
  t("f11", "{toi} danse pour toi sur la chanson de ton choix."),
  t("f12", "{toi} te doit trois faveurs coquines, à utiliser quand tu veux."),
];
