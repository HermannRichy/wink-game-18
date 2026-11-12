"use client";

import { useState } from "react";
import { Mascot, POSES } from "@/components/Mascot";
import { Icon } from "@/components/ui";
import { sfx } from "@/lib/sound";
import { vibrate } from "@/lib/deck";

interface Slide {
  bg: string;
  kicker: string;
  title: React.ReactNode;
  body: React.ReactNode;
}

function Pill({ children, cls }: { children: React.ReactNode; cls: string }) {
  return <span className={`rounded-full border-[2.5px] border-ink px-3 py-1 text-sm font-extrabold ${cls}`}>{children}</span>;
}

function Row({ title, desc, cls }: { title: string; desc: string; cls: string }) {
  return (
    <div className={`flex flex-col rounded-2xl border-[3px] border-ink p-3 text-left ${cls}`}>
      <span className="text-base font-extrabold">{title}</span>
      <span className="text-sm font-medium">{desc}</span>
    </div>
  );
}

const SLIDES: Slide[] = [
  {
    bg: "bg-passion",
    kicker: "BIENVENUE",
    title: (
      <>
        Wink, les jeux à deux qui font <span className="highlight">monter la température</span>.
      </>
    ),
    body: <p className="text-[17px] font-medium leading-snug">Cartes, quiz, défis, Ludo, tour en 3D… Des jeux drôles et coquins pour les couples. On vous fait le tour en 30 secondes.</p>,
  },
  {
    bg: "bg-pop",
    kicker: "L'INTENSITÉ",
    title: (
      <>
        Vous choisissez <span className="bg-cream px-1.5">jusqu'où</span> aller.
      </>
    ),
    body: (
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap justify-center gap-2">
          <Pill cls="bg-cream">Flirt</Pill>
          <Pill cls="bg-candy">Doux</Pill>
          <Pill cls="bg-passion">Coquin</Pill>
          <Pill cls="bg-flame">Brûlant</Pill>
        </div>
        <p className="text-base font-medium leading-snug">
          Les défis montent petit à petit, sans jamais dépasser le niveau choisi. Ludo Hot et La Tour sont toujours au maximum.
        </p>
      </div>
    ),
  },
  {
    bg: "bg-candy",
    kicker: "TROIS FAÇONS DE JOUER",
    title: (
      <>
        Ensemble <span className="highlight">ou</span> à distance.
      </>
    ),
    body: (
      <div className="flex flex-col gap-2.5">
        <Row cls="bg-cream" title="Un seul téléphone" desc="Vous vous le passez à tour de rôle. Sans internet." />
        <Row cls="bg-ink text-cream" title="Mode Duo" desc="Chacun son téléphone, côte à côte. Les gages se font en vrai." />
        <Row cls="bg-pop" title="Mode Distance" desc="Chacun chez soi : défis par vocal, message ou appel vidéo." />
      </div>
    ),
  },
  {
    bg: "bg-flame",
    kicker: "LES RÈGLES D'OR",
    title: (
      <>
        Un défi refusé = <span className="highlight">un gage</span>.
      </>
    ),
    body: (
      <ul className="flex flex-col gap-2 text-left text-base font-semibold leading-snug">
        <li className="flex gap-2">
          <Icon name="timer" size={20} /> Les défis chronométrés démarrent après 10 secondes de préparation.
        </li>
        <li className="flex gap-2">
          <Icon name="cards" size={20} /> Les jokers permettent de rejouer, de jouer à deux ou de passer sans gage.
        </li>
        <li className="flex gap-2">
          <Icon name="heart" size={20} /> Un défi déjà joué ne revient pas avant que vous ayez tout découvert.
        </li>
      </ul>
    ),
  },
  {
    bg: "bg-cream",
    kicker: "DERNIÈRE CHOSE",
    title: (
      <>
        Vos jeux préférés en <span className="highlight">tête de liste</span>.
      </>
    ),
    body: (
      <div className="flex flex-col items-center gap-3">
        <span className="brutal-sm flex items-center gap-2 rounded-2xl bg-pop px-4 py-2 text-base font-extrabold">
          <Icon name="starFill" size={22} /> Touche l'étoile d'un jeu
        </span>
        <p className="text-base font-medium leading-snug">Tout reste sur votre téléphone : prénoms, réglages, parties. Seuls les modes Duo et Distance passent par internet.</p>
      </div>
    ),
  },
];

export function Tour({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const slide = SLIDES[i];
  const last = i === SLIDES.length - 1;

  function next() {
    if (last) {
      sfx.success();
      onDone();
      return;
    }
    sfx.swoosh();
    vibrate(10);
    setI(i + 1);
  }

  return (
    <main
      className={`mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1.75rem,env(safe-area-inset-top))] transition-colors duration-300 ${slide.bg}`}
      aria-roledescription="visite guidée"
    >
      <div className="flex items-center justify-between">
        <span className="text-[30px] font-black tracking-[-1.5px]">wink</span>
        {!last && (
          <button
            type="button"
            onClick={() => {
              sfx.click();
              onDone();
            }}
            className="rounded-full border-[2.5px] border-ink bg-cream px-4 py-1.5 text-sm font-extrabold"
          >
            Passer
          </button>
        )}
      </div>

      <div key={i} className="pop-in flex flex-1 flex-col items-center justify-center gap-5 text-center" aria-live="polite">
        <Mascot size={i === 0 ? 190 : 150} pose={[POSES.brasOuverts, POSES.v, POSES.joyeuse, POSES.salut, POSES.clin][i % 5]} interactive className="float" />
        <span className="font-mono text-xs font-bold tracking-wider">
          {slide.kicker} · {i + 1}/{SLIDES.length}
        </span>
        <h1 className="text-[36px] font-black leading-[0.98] tracking-[-1.5px]">{slide.title}</h1>
        <div className="w-full">{slide.body}</div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex justify-center gap-2" aria-hidden="true">
          {SLIDES.map((_, k) => (
            <span key={k} className={`h-2.5 rounded-full border-2 border-ink transition-all ${k === i ? "w-7 bg-ink" : "w-2.5 bg-cream"}`} />
          ))}
        </div>
        <div className="flex gap-3">
          {i > 0 && (
            <button
              type="button"
              onClick={() => {
                sfx.click();
                setI(i - 1);
              }}
              className="h-[60px] rounded-[18px] border-[3px] border-ink bg-cream px-5 text-base font-bold"
              aria-label="Écran précédent"
            >
              <Icon name="back" />
            </button>
          )}
          <button type="button" onClick={next} className="press flex-1 h-[60px] rounded-[18px] border-[3px] border-ink bg-ink text-lg font-extrabold text-cream shadow-[5px_5px_0_#FFD93D]">
            {last ? "C'EST PARTI" : "SUIVANT"}
          </button>
        </div>
      </div>
    </main>
  );
}
