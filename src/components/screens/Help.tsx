"use client";

import { useState } from "react";
import { Icon, Screen, TopBar } from "@/components/ui";
import { sfx } from "@/lib/sound";

interface Section {
  id: string;
  title: string;
  bg: string;
  items: string[];
}

const SECTIONS: Section[] = [
  {
    id: "start",
    title: "Jouer à deux, en ligne",
    bg: "bg-pop",
    items: [
      "Duo : vous avez chacun votre téléphone. L'un crée la partie et reçoit un code de 5 caractères, l'autre choisit « Rejoindre avec un code ».",
      "Distance : même principe, pensé pour deux personnes qui ne sont pas au même endroit.",
      "On partage uniquement le code (pas de lien). Envoie-le par message à ton ou ta partenaire.",
      "Pour installer Wink sur iPhone : ⋯ à côté de la barre d'adresse de Safari, puis Partager › Sur l'écran d'accueil.",
    ],
  },
  {
    id: "resume",
    title: "Reprendre une partie",
    bg: "bg-candy",
    items: [
      "Si tu quittes l'app ou si la connexion saute, ta partie reste ouverte : un bouton « Reprendre » apparaît sur l'accueil.",
      "Tu peux aussi saisir le même code pour revenir dans la partie.",
      "Une partie sans activité est supprimée automatiquement au bout de 24 h.",
    ],
  },
  {
    id: "leave",
    title: "Quitter une partie",
    bg: "bg-cream",
    items: [
      "Un écran de confirmation s'affiche avant de sortir, pour éviter les clics par erreur.",
      "Tu peux quitter en gardant la partie ouverte (tu pourras revenir), ou la terminer pour tout le monde.",
    ],
  },
  {
    id: "chat",
    title: "Le chat chiffré",
    bg: "bg-passion",
    items: [
      "Chat texte, emojis et réactions, avec chiffrement de bout en bout : seuls vous deux pouvez lire les messages, pas nous.",
      "Réponds à un message précis, réagis sur une bulle, vois quand ton ou ta partenaire écrit (« écrit… ») et quand il ou elle a lu (« Vu »).",
      "Des défis rapides se proposent d'un appui, et tu peux envoyer des messages vocaux (20 secondes max).",
      "Pas d'images ni de vidéos dans le chat.",
    ],
  },
  {
    id: "distance",
    title: "Mode Distance : « je fais le défi »",
    bg: "bg-flame",
    items: [
      "Le bouton téléphone (avant le chat) n'apparaît qu'en mode Distance.",
      "Appuie dessus quand tu pars faire un défi en dehors de l'app, par exemple lors d'un appel vocal ou vidéo : ton ou ta partenaire voit « fait le défi » avec un chrono.",
      "Pas d'alerte de déconnexion pendant ce temps. Un second appui te remet en jeu.",
      "Les appels vocaux et vidéo se font hors de Wink (WhatsApp, FaceTime…).",
    ],
  },
  {
    id: "net",
    title: "Connexion et coupures",
    bg: "bg-cream",
    items: [
      "Si le réseau coupe (par exemple en répondant à un message WhatsApp), un bandeau « se reconnecte… » apparaît et l'app réessaie seule.",
      "Si le message d'erreur reste, utilise le bouton RÉESSAYER.",
      "Les mises à jour de l'app se font automatiquement.",
    ],
  },
];

export function Help({ onBack }: { onBack: () => void }) {
  const [open, setOpen] = useState<string | null>("start");

  return (
    <Screen>
      <TopBar onBack={onBack} title="Aide" />
      <p className="text-base font-medium">Tout ce qu'il faut savoir pour jouer et discuter avec ton ou ta partenaire.</p>
      <div className="flex flex-col gap-3">
        {SECTIONS.map((s) => {
          const isOpen = open === s.id;
          return (
            <section key={s.id} className={`brutal-sm rounded-2xl border-[3px] border-ink ${s.bg}`}>
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => {
                  sfx.click();
                  setOpen(isOpen ? null : s.id);
                }}
                className="flex w-full items-center justify-between gap-3 p-4 text-left"
              >
                <span className="text-[17px] font-extrabold leading-tight">{s.title}</span>
                <Icon name={isOpen ? "pause" : "plus"} size={20} className={isOpen ? "rotate-90" : ""} />
              </button>
              {isOpen && (
                <ul className="flex flex-col gap-2 px-4 pb-4 text-[15px] font-medium leading-snug">
                  {s.items.map((t) => (
                    <li key={t} className="flex gap-2">
                      <span aria-hidden="true">•</span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </Screen>
  );
}
