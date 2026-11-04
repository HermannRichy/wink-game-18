"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Gender, Level } from "@/data/cards";
import { getBackend, type RoomData } from "@/lib/online/backend";

export interface InitOpts {
  maxLevel: Level;
  starter: 0 | 1;
}

/** Un jeu à deux = un état sérialisable + un réducteur pur. Le même code sert hors ligne et en ligne. */
export interface GameModule<S, A> {
  init(opts: InitOpts): S;
  reduce(state: S, action: A, actor: 0 | 1): S;
}

export interface Session<S, A> {
  /** null = les deux joueurs sur le même téléphone */
  me: 0 | 1 | null;
  names: [string, string];
  genders: [Gender, Gender];
  state: S;
  /** Joue une action au nom d'un joueur (en ligne : toujours « moi ») */
  act: (action: A, actor: 0 | 1) => void;
  /** Peut-on jouer pour ce joueur depuis ce téléphone ? */
  canAct: (player: 0 | 1) => boolean;
  online: boolean;
  partnerOnline: boolean;
  live: string | undefined;
  setLive: (live: string) => void;
}

export function useLocalSession<S, A>(module: GameModule<S, A>, opts: InitOpts, names: [string, string], genders: [Gender, Gender]): Session<S, A> {
  const [state, setState] = useState<S>(() => module.init(opts));
  const [live, setLiveState] = useState<string | undefined>(undefined);
  const act = useCallback((action: A, actor: 0 | 1) => setState((s) => module.reduce(s, action, actor)), [module]);
  return {
    me: null,
    names,
    genders,
    state,
    act,
    canAct: () => true,
    online: false,
    partnerOnline: true,
    live,
    setLive: setLiveState,
  };
}

export function useOnlineSession<S, A>(module: GameModule<S, A>, room: RoomData, me: 0 | 1): Session<S, A> {
  const code = room.code;
  const p0 = room.players.p0;
  const p1 = room.players.p1;
  const state = JSON.parse(room.stateJson) as S;
  const meRef = useRef(me);
  meRef.current = me;

  const act = useCallback(
    (action: A) => {
      void getBackend().then((b) => b.transact(code, (json) => JSON.stringify(module.reduce(JSON.parse(json) as S, action, meRef.current))));
    },
    [code, module],
  );
  const setLive = useCallback((live: string) => void getBackend().then((b) => b.setLive(code, live)), [code]);
  const partner = me === 0 ? p1 : p0;

  return {
    me,
    names: [p0?.name ?? "Joueur 1", p1?.name ?? "Joueur 2"],
    genders: [p0?.gender ?? "", p1?.gender ?? ""],
    state,
    act,
    canAct: (player) => player === me,
    online: true,
    partnerOnline: !!partner?.online,
    live: room.live,
    setLive,
  };
}

/** Abonnement à un salon */
export function useRoom(code: string | null) {
  const [room, setRoom] = useState<RoomData | null | undefined>(undefined);
  useEffect(() => {
    if (!code) return;
    let off = () => {};
    let cancelled = false;
    void getBackend().then((b) => {
      if (cancelled) return;
      off = b.subscribe(code, setRoom);
    });
    return () => {
      cancelled = true;
      off();
    };
  }, [code]);
  return room;
}
