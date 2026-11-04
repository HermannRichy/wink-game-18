"use client";

import type { Gender, Level } from "@/data/cards";
import type { GameId } from "@/data/games";
import { aovModule, morpionModule, ppcModule, verreModule } from "@/lib/games/modules";
import { useLocalSession, useOnlineSession, type GameModule, type Session } from "@/lib/online/session";
import type { RoomData } from "@/lib/online/backend";
import { AovGame } from "@/components/games/AovGame";
import { MorpionGame } from "@/components/games/MorpionGame";
import { PpcGame } from "@/components/games/PpcGame";
import { VerreGame } from "@/components/games/verre/VerreGame";

type GameProps = { session: Session<never, never>; soundOn: boolean; onExit: () => void };

interface Entry {
  module: GameModule<unknown, unknown>;
  Component: (p: GameProps) => React.ReactNode;
}

/** Jeux à deux jouables hors ligne et en ligne */
export const DUO_GAMES: Partial<Record<GameId, Entry>> = {
  aov: { module: aovModule as GameModule<unknown, unknown>, Component: AovGame as unknown as Entry["Component"] },
  morpion: { module: morpionModule as GameModule<unknown, unknown>, Component: MorpionGame as unknown as Entry["Component"] },
  ppc: { module: ppcModule as GameModule<unknown, unknown>, Component: PpcGame as unknown as Entry["Component"] },
  verre: { module: verreModule as GameModule<unknown, unknown>, Component: VerreGame as unknown as Entry["Component"] },
};

export function LocalDuoGame({
  game,
  names,
  genders,
  maxLevel,
  soundOn,
  onExit,
}: {
  game: GameId;
  names: [string, string];
  genders: [Gender, Gender];
  maxLevel: Level;
  soundOn: boolean;
  onExit: () => void;
}) {
  const entry = DUO_GAMES[game]!;
  const session = useLocalSession(entry.module, { maxLevel, starter: Math.random() < 0.5 ? 0 : 1 }, names, genders);
  const C = entry.Component;
  return <C session={session as unknown as Session<never, never>} soundOn={soundOn} onExit={onExit} />;
}

export function OnlineDuoGame({ room, me, soundOn, onExit }: { room: RoomData; me: 0 | 1; soundOn: boolean; onExit: () => void }) {
  const entry = DUO_GAMES[room.game]!;
  const session = useOnlineSession(entry.module, room, me);
  const C = entry.Component;
  return <C session={session as unknown as Session<never, never>} soundOn={soundOn} onExit={onExit} />;
}
