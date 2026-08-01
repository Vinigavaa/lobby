"use client";

import Link from "next/link";
import { ArrowLeft, EyeOff, RotateCcw, Shuffle, Smartphone } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const minimumPlayers = 3;
const maximumPlayers = 12;
const randomCategory = "Aleatória";

const wordBank = {
  Comida: [
    "pizza",
    "hambúrguer",
    "sushi",
    "lasanha",
    "taco",
    "pastel",
    "churrasco",
    "brigadeiro",
  ],
  Filmes: [
    "Titanic",
    "Avatar",
    "Shrek",
    "Matrix",
    "Toy Story",
    "Vingadores",
    "Barbie",
    "Interestelar",
  ],
  Países: [
    "Brasil",
    "Japão",
    "Itália",
    "Canadá",
    "México",
    "França",
    "Egito",
    "Argentina",
  ],
  Objetos: [
    "cadeira",
    "celular",
    "mochila",
    "garrafa",
    "controle",
    "chave",
    "relógio",
    "óculos",
  ],
  Animais: [
    "cachorro",
    "gato",
    "leão",
    "pinguim",
    "tartaruga",
    "macaco",
    "girafa",
    "tubarão",
  ],
  Memes: [
    "calabreso",
    "caneta azul",
    "bora bill",
    "luva de pedreiro",
    "eita giovana",
    "nazaré confusa",
    "tenso",
    "ata",
  ],
  Aleatório: [
    "praia",
    "escola",
    "futebol",
    "carnaval",
    "internet",
    "viagem",
    "chuva",
    "música",
  ],
};

type Category = keyof typeof wordBank;
type CategoryOption = Category | typeof randomCategory;
type Phase = "setup" | "pass" | "reveal" | "discussion" | "result";

type LocalPlayer = {
  id: number;
  name: string;
  isImpostor: boolean;
  hasSeenRole: boolean;
};

type LocalRound = {
  category: Category;
  word: string;
  players: LocalPlayer[];
};

const categoryOptions: CategoryOption[] = [
  randomCategory,
  "Comida",
  "Filmes",
  "Países",
  "Objetos",
  "Animais",
  "Memes",
];

export function LocalImpostorGame() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [playerCount, setPlayerCount] = useState(4);
  const [playerNames, setPlayerNames] = useState(() =>
    Array.from({ length: 4 }, (_, index) => `Jogador ${index + 1}`)
  );
  const [category, setCategory] = useState<CategoryOption>(randomCategory);
  const [round, setRound] = useState<LocalRound | null>(null);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [error, setError] = useState("");

  const currentPlayer = round?.players[currentPlayerIndex] ?? null;
  const impostor = useMemo(
    () => round?.players.find((player) => player.isImpostor) ?? null,
    [round]
  );

  function updatePlayerCount(value: number) {
    const nextCount = Math.min(
      maximumPlayers,
      Math.max(minimumPlayers, Number.isFinite(value) ? value : minimumPlayers)
    );

    setPlayerCount(nextCount);
    setPlayerNames((currentNames) =>
      Array.from(
        { length: nextCount },
        (_, index) => currentNames[index] ?? `Jogador ${index + 1}`
      )
    );
    setError("");
  }

  function updatePlayerName(index: number, value: string) {
    setPlayerNames((currentNames) =>
      currentNames.map((name, currentIndex) =>
        currentIndex === index ? value : name
      )
    );
    setError("");
  }

  function startRound() {
    const names = playerNames
      .slice(0, playerCount)
      .map((name) => name.trim());

    if (playerCount < minimumPlayers || playerCount > maximumPlayers) {
      setError("Escolha entre 3 e 12 jogadores.");
      return;
    }

    if (names.some((name) => name.length === 0)) {
      setError("Preencha o nome de todos os jogadores.");
      return;
    }

    const selectedCategory = pickCategory(category);
    const selectedWord = pickWord(selectedCategory);
    const impostorIndex = Math.floor(Math.random() * names.length);

    setRound({
      category: selectedCategory,
      word: selectedWord,
      players: names.map((name, index) => ({
        id: index,
        name,
        isImpostor: index === impostorIndex,
        hasSeenRole: false,
      })),
    });
    setCurrentPlayerIndex(0);
    setError("");
    setPhase("pass");
  }

  function revealCurrentPlayer() {
    if (!currentPlayer) {
      return;
    }

    setPhase("reveal");
  }

  function hideAndPass() {
    if (!round || !currentPlayer) {
      return;
    }

    const nextPlayers = round.players.map((player) =>
      player.id === currentPlayer.id ? { ...player, hasSeenRole: true } : player
    );
    const nextIndex = currentPlayerIndex + 1;

    setRound({
      ...round,
      players: nextPlayers,
    });

    if (nextIndex >= nextPlayers.length) {
      setCurrentPlayerIndex(0);
      setPhase("discussion");
      return;
    }

    setCurrentPlayerIndex(nextIndex);
    setPhase("pass");
  }

  function revealResult() {
    setCurrentPlayerIndex(0);
    setPhase("result");
  }

  function resetToSetup() {
    setRound(null);
    setCurrentPlayerIndex(0);
    setError("");
    setPhase("setup");
  }

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <section className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-6 sm:max-w-2xl sm:px-8">
        <header className="flex items-center justify-between">
          <Button asChild variant="ghost" size="icon" aria-label="Voltar">
            <Link href="/local">
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <div className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <Smartphone className="size-3.5" />
            Um celular
          </div>
        </header>

        <div className="flex flex-1 flex-col justify-center py-8">
          {phase === "setup" ? (
            <SetupView
              playerCount={playerCount}
              playerNames={playerNames}
              category={category}
              error={error}
              onPlayerCountChange={updatePlayerCount}
              onPlayerNameChange={updatePlayerName}
              onCategoryChange={setCategory}
              onStart={startRound}
            />
          ) : null}

          {phase === "pass" && currentPlayer ? (
            <PassView
              playerName={currentPlayer.name}
              currentIndex={currentPlayerIndex}
              totalPlayers={round?.players.length ?? 0}
              onReveal={revealCurrentPlayer}
            />
          ) : null}

          {phase === "reveal" && round && currentPlayer ? (
            <RevealView
              category={round.category}
              word={round.word}
              player={currentPlayer}
              currentIndex={currentPlayerIndex}
              totalPlayers={round.players.length}
              onHideAndPass={hideAndPass}
            />
          ) : null}

          {phase === "discussion" ? (
            <DiscussionView onRevealResult={revealResult} />
          ) : null}

          {phase === "result" && round && impostor ? (
            <ResultView
              category={round.category}
              word={round.word}
              impostorName={impostor.name}
              onPlayAgain={startRound}
              onReset={resetToSetup}
            />
          ) : null}
        </div>
      </section>
    </main>
  );
}

type SetupViewProps = {
  playerCount: number;
  playerNames: string[];
  category: CategoryOption;
  error: string;
  onPlayerCountChange: (value: number) => void;
  onPlayerNameChange: (index: number, value: string) => void;
  onCategoryChange: (value: CategoryOption) => void;
  onStart: () => void;
};

function SetupView({
  playerCount,
  playerNames,
  category,
  error,
  onPlayerCountChange,
  onPlayerNameChange,
  onCategoryChange,
  onStart,
}: SetupViewProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex size-12 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-lg shadow-primary/20">
          <Shuffle className="size-6" />
        </div>
        <div className="space-y-3">
          <h1 className="font-heading text-4xl font-black leading-none tracking-normal">
            Impostor local
          </h1>
          <p className="max-w-sm text-base leading-7 text-muted-foreground">
            Configure os jogadores e passe o celular para revelar cada papel.
          </p>
        </div>
      </div>

      <section className="space-y-5 rounded-lg border border-border bg-card p-5 shadow-2xl shadow-black/25">
        <div className="grid grid-cols-[1fr_7rem] gap-3">
          <div className="space-y-2">
            <Label htmlFor="local-category">Categoria</Label>
            <select
              id="local-category"
              value={category}
              onChange={(event) =>
                onCategoryChange(event.target.value as CategoryOption)
              }
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
            <Label htmlFor="local-player-count">Jogadores</Label>
            <Input
              id="local-player-count"
              type="number"
              min={minimumPlayers}
              max={maximumPlayers}
              value={playerCount}
              onChange={(event) =>
                onPlayerCountChange(Number(event.target.value))
              }
              className="h-11 bg-background text-base"
            />
          </div>
        </div>

        <div className="space-y-3">
          <Label>Nomes dos jogadores</Label>
          <div className="grid gap-2">
            {playerNames.slice(0, playerCount).map((name, index) => (
              <Input
                key={index}
                value={name}
                onChange={(event) =>
                  onPlayerNameChange(index, event.target.value)
                }
                maxLength={24}
                autoComplete="off"
                aria-label={`Nome do jogador ${index + 1}`}
                className="h-11 bg-background text-base"
              />
            ))}
          </div>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Button size="lg" className="h-12 w-full gap-2" onClick={onStart}>
          <Shuffle className="size-4" />
          Iniciar
        </Button>
      </section>
    </div>
  );
}

type PassViewProps = {
  playerName: string;
  currentIndex: number;
  totalPlayers: number;
  onReveal: () => void;
};

function PassView({
  playerName,
  currentIndex,
  totalPlayers,
  onReveal,
}: PassViewProps) {
  return (
    <PrivateStepShell
      eyebrow={`${currentIndex + 1} de ${totalPlayers}`}
      title={`Passe o celular para ${playerName}`}
      description="A proxima tela mostra uma informacao privada."
    >
      <Button size="lg" className="h-12 w-full gap-2" onClick={onReveal}>
        <Shuffle className="size-4" />
        Revelar
      </Button>
    </PrivateStepShell>
  );
}

type RevealViewProps = {
  category: Category;
  word: string;
  player: LocalPlayer;
  currentIndex: number;
  totalPlayers: number;
  onHideAndPass: () => void;
};

function RevealView({
  category,
  word,
  player,
  currentIndex,
  totalPlayers,
  onHideAndPass,
}: RevealViewProps) {
  return (
    <PrivateStepShell
      eyebrow={`${currentIndex + 1} de ${totalPlayers}`}
      title={player.name}
      description={`Categoria: ${category}`}
    >
      <div
        className={cn(
          "rounded-lg border p-5 text-center",
          player.isImpostor
            ? "border-destructive/40 bg-destructive/10"
            : "border-accent/40 bg-accent/10"
        )}
      >
        {player.isImpostor ? (
          <div className="space-y-3">
            <p className="text-2xl font-black">Você é o impostor</p>
            <p className="text-sm leading-6 text-muted-foreground">
              Tente descobrir a palavra sem ser descoberto.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">
              Palavra secreta
            </p>
            <p className="break-words text-4xl font-black leading-tight">
              {word}
            </p>
          </div>
        )}
      </div>

      <Button
        size="lg"
        variant="secondary"
        className="h-12 w-full gap-2"
        onClick={onHideAndPass}
      >
        <EyeOff className="size-4" />
        Ocultar e passar
      </Button>
    </PrivateStepShell>
  );
}

type DiscussionViewProps = {
  onRevealResult: () => void;
};

function DiscussionView({ onRevealResult }: DiscussionViewProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex size-12 items-center justify-center rounded-md bg-accent text-accent-foreground shadow-lg shadow-accent/15">
          <Shuffle className="size-6" />
        </div>
        <div className="space-y-3">
          <h1 className="font-heading text-4xl font-black leading-none tracking-normal">
            Dicas em voz alta
          </h1>
          <p className="max-w-sm text-base leading-7 text-muted-foreground">
            Agora cada jogador deve falar uma dica em voz alta.
          </p>
        </div>
      </div>

      <section className="space-y-4 rounded-lg border border-border bg-card p-5 shadow-2xl shadow-black/25">
        <p className="text-sm leading-6 text-muted-foreground">
          Quando todos terminarem, revele quem era o impostor.
        </p>
        <Button size="lg" className="h-12 w-full" onClick={onRevealResult}>
          Revelar resultado
        </Button>
      </section>
    </div>
  );
}

type ResultViewProps = {
  category: Category;
  word: string;
  impostorName: string;
  onPlayAgain: () => void;
  onReset: () => void;
};

function ResultView({
  category,
  word,
  impostorName,
  onPlayAgain,
  onReset,
}: ResultViewProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex size-12 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-lg shadow-primary/20">
          <Shuffle className="size-6" />
        </div>
        <div className="space-y-3">
          <h1 className="font-heading text-4xl font-black leading-none tracking-normal">
            Resultado
          </h1>
          <p className="max-w-sm text-base leading-7 text-muted-foreground">
            A rodada terminou.
          </p>
        </div>
      </div>

      <section className="space-y-4 rounded-lg border border-border bg-card p-5 shadow-2xl shadow-black/25">
        <ResultRow label="Impostor" value={impostorName} />
        <ResultRow label="Categoria" value={category} />
        <ResultRow label="Palavra" value={word} />

        <div className="grid gap-2 pt-2">
          <Button size="lg" className="h-12 w-full gap-2" onClick={onPlayAgain}>
            <RotateCcw className="size-4" />
            Jogar novamente
          </Button>
          <Button
            size="lg"
            variant="secondary"
            className="h-12 w-full"
            onClick={onReset}
          >
            Alterar jogadores
          </Button>
        </div>
      </section>
    </div>
  );
}

type PrivateStepShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

function PrivateStepShell({
  eyebrow,
  title,
  description,
  children,
}: PrivateStepShellProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-md border border-border bg-card px-3 py-2 text-center text-xs font-medium text-muted-foreground">
        {eyebrow}
      </div>
      <section className="space-y-6 rounded-lg border border-border bg-card p-5 text-center shadow-2xl shadow-black/25">
        <div className="space-y-3">
          <h1 className="font-heading text-3xl font-black leading-tight tracking-normal">
            {title}
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
        {children}
      </section>
    </div>
  );
}

type ResultRowProps = {
  label: string;
  value: string;
};

function ResultRow({ label, value }: ResultRowProps) {
  return (
    <div className="rounded-md border border-border bg-background px-4 py-3">
      <p className="text-xs font-medium uppercase text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 break-words text-xl font-bold">{value}</p>
    </div>
  );
}

function pickCategory(option: CategoryOption): Category {
  if (option !== randomCategory) {
    return option;
  }

  const categories = Object.keys(wordBank) as Category[];

  return categories[Math.floor(Math.random() * categories.length)];
}

function pickWord(category: Category) {
  const words = wordBank[category];

  return words[Math.floor(Math.random() * words.length)];
}
