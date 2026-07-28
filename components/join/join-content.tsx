"use client";

import { FormEvent, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Hash, LogIn, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const avatarOptions = ["🎲", "🎮", "🪩", "🚀", "🧠", "🎭"];
const nicknameKey = "partyroom:nickname";
const avatarKey = "partyroom:avatar";
const userIdKey = "partyroom:user-id";

export function JoinContent() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [avatar, setAvatar] = useState(avatarOptions[0]);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const storedNickname = localStorage.getItem(nicknameKey);
        const storedAvatar = localStorage.getItem(avatarKey);

        if (storedNickname) {
          setNickname(storedNickname);
        }

        if (storedAvatar && avatarOptions.includes(storedAvatar)) {
          setAvatar(storedAvatar);
        }
      } catch {
        return;
      }
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  function updateNickname(value: string) {
    setNickname(value);
    setError("");

    const trimmedValue = value.trim();

    if (!trimmedValue) {
      return;
    }

    try {
      localStorage.setItem(nicknameKey, trimmedValue);
    } catch {
      return;
    }
  }

  function selectAvatar(value: string) {
    setAvatar(value);

    try {
      localStorage.setItem(avatarKey, value);
    } catch {
      return;
    }
  }

  function updateCode(value: string) {
    setCode(value.replace(/\D/g, "").slice(0, 6));
    setError("");
  }

  function validateFields() {
    if (!nickname.trim()) {
      return "Informe um nickname para continuar.";
    }

    if (!/^\d{6}$/.test(code)) {
      return "Informe um codigo de 6 digitos.";
    }

    return null;
  }

  async function joinRoom() {
    const validationError = validateFields();

    if (validationError) {
      setError(validationError);
      return;
    }

    setIsJoining(true);

    try {
      const storedUserId = localStorage.getItem(userIdKey);
      const response = await fetch("/api/rooms/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: nickname.trim(),
          avatar,
          code,
          userId: storedUserId,
        }),
      });

      const data = (await response.json()) as {
        code?: string;
        userId?: string;
        error?: string;
      };

      if (!response.ok || !data.code || !data.userId) {
        setError(data.error ?? "Nao foi possivel entrar na sala.");
        return;
      }

      localStorage.setItem(nicknameKey, nickname.trim());
      localStorage.setItem(avatarKey, avatar);
      localStorage.setItem(userIdKey, data.userId);
      router.push(`/room/${data.code}`);
    } catch {
      setError("Nao foi possivel entrar na sala.");
    } finally {
      setIsJoining(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void joinRoom();
  }

  return (
    <main className="min-h-screen bg-background px-5 py-6 text-foreground">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md flex-col justify-center">
        <motion.form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-lg border border-border bg-card p-5 shadow-2xl shadow-black/25"
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center justify-between">
            <Button asChild variant="ghost" size="icon">
              <Link href="/" aria-label="Voltar para inicio">
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            <div className="flex items-center gap-2 rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-sm font-medium text-accent">
              <Sparkles className="size-4" />
              PartyRoom
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex size-12 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
              <Hash className="size-6" />
            </div>
            <h1 className="text-3xl font-black">Entrar em sala</h1>
            <p className="text-sm leading-6 text-muted-foreground">
              Digite seu apelido e o codigo enviado pelo host.
            </p>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="join-nickname">Nickname</Label>
              <Input
                id="join-nickname"
                value={nickname}
                onChange={(event) => updateNickname(event.target.value)}
                placeholder="Seu nome no jogo"
                autoComplete="nickname"
                maxLength={24}
                aria-invalid={Boolean(error && !nickname.trim())}
                className="h-12 bg-background text-base"
              />
            </div>

            <div className="space-y-3">
              <Label>Avatar</Label>
              <div className="grid grid-cols-6 gap-2">
                {avatarOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => selectAvatar(option)}
                    aria-label={`Usar avatar ${option}`}
                    aria-pressed={avatar === option}
                    className={cn(
                      "flex aspect-square items-center justify-center rounded-md border bg-background text-2xl transition hover:border-accent hover:bg-accent/10 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none",
                      avatar === option
                        ? "border-accent bg-accent text-accent-foreground shadow-lg shadow-accent/15"
                        : "border-border"
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="room-code">Codigo da sala</Label>
              <Input
                id="room-code"
                value={code}
                onChange={(event) => updateCode(event.target.value)}
                placeholder="000000"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                aria-invalid={Boolean(error && code.length !== 6)}
                className="h-14 bg-background text-center font-mono text-2xl tracking-[0.25em]"
              />
            </div>
          </div>

          {error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            size="lg"
            className="h-12 w-full gap-2"
            disabled={isJoining}
          >
            <LogIn className="size-4" />
            {isJoining ? "Entrando..." : "Entrar"}
          </Button>
        </motion.form>
      </section>
    </main>
  );
}
