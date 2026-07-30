import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Clock3,
  Drama,
  Gamepad2,
  HelpCircle,
  Moon,
  PencilLine,
  Smartphone,
  UserRoundSearch,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type LocalGame = {
  name: string;
  description: string;
  icon: typeof UserRoundSearch;
} & (
  | {
      available: true;
      href: string;
    }
  | {
      available: false;
      badge: string;
      blockedMessage?: string;
    }
);

const games: LocalGame[] = [
  {
    name: "Impostor",
    description: "Descubra quem esta tentando se misturar ao grupo.",
    href: "/local/impostor",
    available: true,
    icon: UserRoundSearch,
  },
  {
    name: "Quem Sou Eu",
    description: "Adivinhe o personagem antes do tempo acabar.",
    available: false,
    badge: "Somente online",
    blockedMessage:
      "Quem Sou Eu nao esta disponivel no modo local. Crie ou entre em uma sala online para jogar.",
    icon: HelpCircle,
  },
  {
    name: "Mímica",
    description: "Atue sem falar e faca o grupo acertar.",
    href: "/local/mimica",
    available: true,
    icon: Drama,
  },
  {
    name: "Stop",
    description: "Complete categorias rapido usando a letra sorteada.",
    available: false,
    badge: "Somente online",
    blockedMessage:
      "Stop nao esta disponivel no modo local. Crie ou entre em uma sala online para jogar.",
    icon: PencilLine,
  },
  {
    name: "Trivia",
    description: "Gire a roleta e responda perguntas contra o tempo.",
    href: "/local/trivia",
    available: true,
    icon: Gamepad2,
  },
  {
    name: "Cidade Dorme",
    description: "Investigue blefes durante a noite da cidade.",
    available: false,
    badge: "Em breve",
    icon: Moon,
  },
];

export default function LocalPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 py-6 sm:max-w-2xl sm:px-8">
        <header className="flex items-center justify-between">
          <Button asChild variant="ghost" size="icon" aria-label="Voltar">
            <Link href="/">
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <div className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <Smartphone className="size-3.5" />
            Modo local
          </div>
        </header>

        <div className="flex flex-1 flex-col justify-center gap-7 py-8">
          <div className="space-y-4">
            <div className="flex size-12 items-center justify-center rounded-md bg-accent text-accent-foreground shadow-lg shadow-accent/15">
              <Smartphone className="size-6" />
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl font-black leading-none tracking-normal">
                Jogos locais
              </h1>
              <p className="max-w-sm text-base leading-7 text-muted-foreground">
                Jogue passando o celular entre os amigos.
              </p>
            </div>
          </div>

          <div className="grid gap-3">
            {games.map((game) => (
              <GameCard key={game.name} game={game} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

type GameCardProps = {
  game: LocalGame;
};

function GameCard({ game }: GameCardProps) {
  const Icon = game.icon;
  const content = (
    <>
      <div
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-md",
          game.available
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        )}
      >
        <Icon className="size-5" />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <h2 className="truncate text-base font-semibold">{game.name}</h2>
          {!game.available ? (
            <span className="rounded-md border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {game.badge}
            </span>
          ) : null}
        </div>
        <p className="line-clamp-2 text-sm leading-5 text-muted-foreground">
          {game.description}
        </p>
        {!game.available && game.blockedMessage ? (
          <p className="text-xs font-medium leading-5 text-destructive">
            {game.blockedMessage}
          </p>
        ) : null}
      </div>
      {game.available ? (
        <ArrowRight className="size-5 shrink-0 text-muted-foreground" />
      ) : (
        <Clock3 className="size-5 shrink-0 text-muted-foreground" />
      )}
    </>
  );

  if (!game.available) {
    return (
      <article className="flex min-h-24 items-center gap-3 rounded-lg border border-border bg-card/70 p-4 opacity-70">
        {content}
      </article>
    );
  }

  return (
    <Link
      href={game.href}
      className="flex min-h-24 items-center gap-3 rounded-lg border border-primary/40 bg-card p-4 shadow-lg shadow-black/20 transition hover:border-primary hover:bg-primary/5 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
    >
      {content}
    </Link>
  );
}
