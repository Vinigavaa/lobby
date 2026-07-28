"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Drama,
  Eye,
  Home,
  LogOut,
  RotateCcw,
  TimerReset,
  Trophy,
  UsersRound,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { createSocketClient, type LobbySocketClient } from "@/lib/socket/client";
import { SOCKET_EVENTS } from "@/lib/socket/events";
import type { MimicaStatePayload } from "@/lib/socket/types";
import { cn } from "@/lib/utils";

const userIdKey = "partyroom:user-id";
const randomCategory = "Aleatória";
const durationOptions = [30, 60] as const;

type DurationOption = (typeof durationOptions)[number];
type PrivateWord = {
  category: string;
  word: string;
};

type MimicaGameProps = {
  code: string;
};

export function MimicaGame({ code }: MimicaGameProps) {
  const router = useRouter();
  const socketRef = useRef<LobbySocketClient | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [state, setState] = useState<MimicaStatePayload | null>(null);
  const [privateWord, setPrivateWord] = useState<PrivateWord | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState<string>(randomCategory);
  const [duration, setDuration] = useState<DurationOption>(60);
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState("");

  const phase = state?.phase ?? "setup";
  const isHost = Boolean(state?.isHost);
  const isCurrentMimer = Boolean(state?.isCurrentMimer);

  const remaining =
    phase === "playing" && state?.roundEndsAt
      ? Math.max(
          0,
          Math.ceil((new Date(state.roundEndsAt).getTime() - now) / 1000)
        )
      : (state?.durationSeconds ?? 0);

  useEffect(() => {
    let active = true;

    fetch("/api/mimica/categories", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { categories?: string[] } | null) => {
        if (active && data?.categories) {
          setCategories(data.categories);
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const storedUserId = localStorage.getItem(userIdKey);

    if (!storedUserId) {
      window.setTimeout(
        () => setError("Entre na sala pela tela inicial para jogar."),
        0
      );
      return;
    }

    window.setTimeout(() => setCurrentUserId(storedUserId), 0);

    const socket = createSocketClient();
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit(SOCKET_EVENTS.JOIN_ROOM, {
        roomCode: code,
        userId: storedUserId,
      });
    });

    socket.on(SOCKET_EVENTS.MIMICA_STARTED, (payload) => {
      if (payload.roomCode === code) {
        setPrivateWord(null);
        router.push(payload.path);
      }
    });

    socket.on(SOCKET_EVENTS.MIMICA_STATE_UPDATED, (payload) => {
      if (payload.roomCode !== code) {
        return;
      }

      setState(payload);
      setError("");

      if (payload.phase !== "reveal") {
        setPrivateWord(null);
      }
    });

    socket.on(SOCKET_EVENTS.MIMICA_PRIVATE_WORD, (payload) => {
      if (payload.roomCode === code) {
        setPrivateWord({ category: payload.category, word: payload.word });
      }
    });

    socket.on(SOCKET_EVENTS.MIMICA_BACK_TO_LOBBY_NAV, (payload) => {
      if (payload.roomCode === code) {
        router.push(payload.path);
      }
    });

    socket.on(SOCKET_EVENTS.ERROR, (payload) => {
      setError(payload.message);
    });

    socket.connect();

    return () => {
      socket.off();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [code, router]);

  useEffect(() => {
    if (phase !== "playing") {
      return;
    }

    const sync = window.setTimeout(() => setNow(Date.now()), 0);
    const interval = window.setInterval(() => setNow(Date.now()), 250);

    return () => {
      window.clearTimeout(sync);
      window.clearInterval(interval);
    };
  }, [phase, state?.roundEndsAt]);

  function beginRound() {
    if (!currentUserId || !isHost || phase !== "setup") {
      return;
    }

    socketRef.current?.emit(SOCKET_EVENTS.MIMICA_BEGIN, {
      roomCode: code,
      userId: currentUserId,
      category,
      durationSeconds: duration,
    });
  }

  function startMime() {
    if (!currentUserId || !isCurrentMimer || phase !== "reveal") {
      return;
    }

    socketRef.current?.emit(SOCKET_EVENTS.MIMICA_START_MIME, {
      roomCode: code,
      userId: currentUserId,
    });
  }

  function markCorrect() {
    if (!currentUserId || !isCurrentMimer || phase !== "playing") {
      return;
    }

    socketRef.current?.emit(SOCKET_EVENTS.MIMICA_CORRECT, {
      roomCode: code,
      userId: currentUserId,
    });
  }

  function nextRound() {
    if (!currentUserId || !isHost || phase !== "roundResult") {
      return;
    }

    socketRef.current?.emit(SOCKET_EVENTS.MIMICA_NEXT_ROUND, {
      roomCode: code,
      userId: currentUserId,
    });
  }

  function backToLobby() {
    if (!currentUserId || !isHost) {
      return;
    }

    socketRef.current?.emit(SOCKET_EVENTS.MIMICA_BACK_TO_LOBBY, {
      roomCode: code,
      userId: currentUserId,
    });
  }

  function leaveGame() {
    socketRef.current?.disconnect();
    router.push("/");
  }

  const mimerName = state?.currentMimerNickname ?? "jogador";

  return (
    <main className="min-h-screen bg-background px-5 py-6 text-foreground">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md flex-col justify-between gap-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Sala {code}
                {state && state.roundNumber > 0
                  ? ` · Rodada ${state.roundNumber}`
                  : ""}
              </p>
              <h1 className="text-3xl font-black">Mimica</h1>
            </div>
            <div className="flex size-12 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Drama className="size-6" />
            </div>
          </div>

          {error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          {!state ? (
            <div className="rounded-lg border border-border bg-card p-5 shadow-2xl shadow-black/20">
              <h2 className="font-semibold">Carregando partida...</h2>
              <p className="text-sm text-muted-foreground">
                Aguardando estado da sala.
              </p>
            </div>
          ) : null}

          {state && phase === "setup" ? (
            <SetupPhase
              isHost={isHost}
              category={category}
              categories={categories}
              duration={duration}
              onCategoryChange={setCategory}
              onDurationChange={setDuration}
              onBegin={beginRound}
            />
          ) : null}

          {state && phase === "reveal" ? (
            <RevealPhase
              isCurrentMimer={isCurrentMimer}
              mimerName={mimerName}
              privateWord={privateWord}
              onStart={startMime}
            />
          ) : null}

          {state && phase === "playing" ? (
            <PlayingPhase
              isCurrentMimer={isCurrentMimer}
              mimerName={mimerName}
              remaining={remaining}
              duration={state.durationSeconds}
              onCorrect={markCorrect}
            />
          ) : null}

          {state && phase === "roundResult" && state.lastRound ? (
            <ResultPhase
              isHost={isHost}
              lastRound={state.lastRound}
              onNext={nextRound}
              onBackToLobby={backToLobby}
            />
          ) : null}

          {state && phase !== "playing" ? (
            <Scoreboard players={state.players} />
          ) : null}
        </div>

        <Button
          type="button"
          size="lg"
          variant="secondary"
          className="h-12 gap-2"
          onClick={leaveGame}
        >
          <LogOut className="size-4" />
          Sair
        </Button>
      </section>
    </main>
  );
}

type SetupPhaseProps = {
  isHost: boolean;
  category: string;
  categories: string[];
  duration: DurationOption;
  onCategoryChange: (value: string) => void;
  onDurationChange: (value: DurationOption) => void;
  onBegin: () => void;
};

function SetupPhase({
  isHost,
  category,
  categories,
  duration,
  onCategoryChange,
  onDurationChange,
  onBegin,
}: SetupPhaseProps) {
  if (!isHost) {
    return (
      <div className="rounded-lg border border-border bg-card p-5 shadow-2xl shadow-black/20">
        <h2 className="font-semibold">Aguardando o host</h2>
        <p className="text-sm text-muted-foreground">
          O host esta escolhendo a categoria e o tempo da rodada.
        </p>
      </div>
    );
  }

  const categoryOptions = [randomCategory, ...categories];

  return (
    <div className="space-y-5 rounded-lg border border-border bg-card p-5 shadow-2xl shadow-black/20">
      <div>
        <h2 className="font-semibold">Configure a rodada</h2>
        <p className="text-sm text-muted-foreground">
          Escolha a categoria e quanto tempo cada mimica dura.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="mimica-category">Categoria</Label>
        <select
          id="mimica-category"
          value={category}
          onChange={(event) => onCategoryChange(event.target.value)}
          className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
        >
          {categoryOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label>Tempo da rodada</Label>
        <div className="grid grid-cols-2 gap-2">
          {durationOptions.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={duration === option}
              onClick={() => onDurationChange(option)}
              className={cn(
                "flex h-11 items-center justify-center gap-2 rounded-md border text-sm font-semibold transition",
                "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none",
                duration === option
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-background text-muted-foreground hover:border-primary/60"
              )}
            >
              <Clock3 className="size-4" />
              {option === 60 ? "1 minuto" : "30 segundos"}
            </button>
          ))}
        </div>
      </div>

      <Button size="lg" className="h-12 w-full gap-2" onClick={onBegin}>
        <Drama className="size-4" />
        Iniciar rodada
      </Button>
    </div>
  );
}

type RevealPhaseProps = {
  isCurrentMimer: boolean;
  mimerName: string;
  privateWord: PrivateWord | null;
  onStart: () => void;
};

function RevealPhase({
  isCurrentMimer,
  mimerName,
  privateWord,
  onStart,
}: RevealPhaseProps) {
  if (!isCurrentMimer) {
    return (
      <div className="rounded-lg border border-border bg-card p-5 text-center shadow-2xl shadow-black/20">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-md bg-accent text-accent-foreground">
          <Eye className="size-6" />
        </div>
        <h2 className="font-semibold">{mimerName} vai fazer a mimica</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Prepare-se para adivinhar. A palavra esta escondida de voce.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 rounded-lg border border-border bg-card p-5 text-center shadow-2xl shadow-black/20">
      <div>
        <p className="text-sm font-medium text-muted-foreground">
          Apenas voce ve esta palavra
        </p>
        {privateWord ? (
          <>
            <p className="mt-3 break-words text-4xl font-black leading-tight">
              {privateWord.word}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Categoria: {privateWord.category}
            </p>
          </>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            Recebendo sua palavra...
          </p>
        )}
      </div>

      <Button
        size="lg"
        className="h-12 w-full gap-2"
        disabled={!privateWord}
        onClick={onStart}
      >
        <Eye className="size-4" />
        Entendi, começar
      </Button>
    </div>
  );
}

type PlayingPhaseProps = {
  isCurrentMimer: boolean;
  mimerName: string;
  remaining: number;
  duration: number;
  onCorrect: () => void;
};

function PlayingPhase({
  isCurrentMimer,
  mimerName,
  remaining,
  duration,
  onCorrect,
}: PlayingPhaseProps) {
  const isUrgent = remaining <= 10;
  const percent = duration > 0 ? (remaining / duration) * 100 : 0;

  return (
    <div className="flex flex-col items-center gap-10 rounded-lg border border-border bg-card px-5 py-12 shadow-2xl shadow-black/20">
      <div className="flex flex-col items-center gap-3">
        <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Tempo restante
        </span>
        <p
          className={cn(
            "font-mono text-7xl font-black tabular-nums",
            isUrgent ? "text-destructive" : "text-foreground"
          )}
        >
          {formatTime(remaining)}
        </p>
        <div className="h-2 w-48 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300 ease-linear"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {isCurrentMimer ? (
        <Button
          size="lg"
          className="h-16 w-full max-w-xs gap-2 text-lg"
          onClick={onCorrect}
        >
          <CheckCircle2 className="size-6" />
          Acertou
        </Button>
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          {mimerName} esta fazendo a mimica. Adivinhe em voz alta!
        </p>
      )}
    </div>
  );
}

type ResultPhaseProps = {
  isHost: boolean;
  lastRound: NonNullable<MimicaStatePayload["lastRound"]>;
  onNext: () => void;
  onBackToLobby: () => void;
};

function ResultPhase({
  isHost,
  lastRound,
  onNext,
  onBackToLobby,
}: ResultPhaseProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-2xl shadow-black/20">
      <div className="mb-5 flex items-center gap-3">
        <div
          className={cn(
            "flex size-10 items-center justify-center rounded-md",
            lastRound.success
              ? "bg-primary text-primary-foreground"
              : "bg-destructive text-destructive-foreground"
          )}
        >
          {lastRound.success ? (
            <Trophy className="size-5" />
          ) : (
            <TimerReset className="size-5" />
          )}
        </div>
        <div>
          <h2 className="font-semibold">
            {lastRound.success ? "Acertou!" : "Tempo esgotado!"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {lastRound.success
              ? `${lastRound.mimerNickname} marcou ponto.`
              : "Ninguem acertou a tempo."}
          </p>
        </div>
      </div>

      <div className="rounded-md border border-border bg-background px-4 py-3">
        <p className="text-xs font-medium uppercase text-muted-foreground">
          A palavra era
        </p>
        <p className="mt-1 break-words text-2xl font-black">{lastRound.word}</p>
      </div>

      <div className="mt-5 grid gap-2">
        {isHost ? (
          <>
            <Button type="button" className="h-11 gap-2" onClick={onNext}>
              <RotateCcw className="size-4" />
              Proxima rodada
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-11 gap-2"
              onClick={onBackToLobby}
            >
              <Home className="size-4" />
              Voltar ao lobby
            </Button>
          </>
        ) : (
          <p className="rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accent-foreground">
            Aguardando o host iniciar a proxima rodada...
          </p>
        )}
      </div>
    </div>
  );
}

type ScoreboardProps = {
  players: MimicaStatePayload["players"];
};

function Scoreboard({ players }: ScoreboardProps) {
  const ordered = useMemo(
    () => [...players].sort((first, second) => second.score - first.score),
    [players]
  );

  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-2xl shadow-black/20">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
          <UsersRound className="size-5" />
        </div>
        <h2 className="font-semibold">Placar</h2>
      </div>

      <div className="space-y-2">
        {ordered.map((player) => (
          <div
            key={player.userId}
            className={cn(
              "flex items-center justify-between rounded-md border px-3 py-3",
              player.isCurrentMimer
                ? "border-primary bg-primary/10"
                : "border-border bg-background"
            )}
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-lg">
                {player.avatar ?? "🎭"}
              </span>
              <div className="min-w-0">
                <p className="truncate font-medium">{player.nickname}</p>
                {player.isCurrentMimer ? (
                  <p className="text-xs text-muted-foreground">Fazendo mimica</p>
                ) : null}
              </div>
            </div>
            <span className="rounded-md bg-secondary px-2 py-1 text-sm font-bold tabular-nums">
              {player.score}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
