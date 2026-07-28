"use client";

import { FormEvent, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Gamepad2, Hash, LogIn, Smartphone, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const avatarOptions = ["🎲", "🎮", "🪩", "🚀", "🧠", "🎭"];
const nicknameKey = "partyroom:nickname";
const avatarKey = "partyroom:avatar";
const userIdKey = "partyroom:user-id";

export function HomeContent() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [avatar, setAvatar] = useState(avatarOptions[0]);
  const [error, setError] = useState("");
  const [isCreating, setIsCreating] = useState(false);

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

  function saveProfile() {
    const trimmedNickname = nickname.trim();

    if (!trimmedNickname) {
      setError("Informe um nickname para continuar.");
      return false;
    }

    try {
      localStorage.setItem(nicknameKey, trimmedNickname);
      localStorage.setItem(avatarKey, avatar);
    } catch {
      return false;
    }

    setError("");
    return true;
  }

  function persistNickname(value: string) {
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

  function navigateTo(path: string) {
    if (saveProfile()) {
      router.push(path);
    }
  }

  async function createRoom() {
    if (!saveProfile()) {
      return;
    }

    setIsCreating(true);

    try {
      const storedUserId = localStorage.getItem(userIdKey);
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: nickname.trim(),
          avatar,
          userId: storedUserId,
        }),
      });

      const data = (await response.json()) as {
        code?: string;
        userId?: string;
        error?: string;
      };

      if (!response.ok || !data.code || !data.userId) {
        setError(data.error ?? "Nao foi possivel criar a sala.");
        return;
      }

      localStorage.setItem(userIdKey, data.userId);
      router.push(`/room/${data.code}`);
    } catch {
      setError("Nao foi possivel criar a sala.");
    } finally {
      setIsCreating(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void createRoom();
  }

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <section className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-between px-5 py-6 sm:max-w-2xl sm:px-8 lg:max-w-5xl lg:py-10">
        <motion.div
          className="flex items-center justify-between"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className="flex items-center gap-2">
            <div className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <Sparkles className="size-5" />
            </div>
            <span className="text-lg font-semibold">PartyRoom</span>
          </div>
          <div className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
            Sem login
          </div>
        </motion.div>

        <div className="grid flex-1 items-center gap-8 py-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-12">
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.05 }}
          >
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-sm font-medium text-accent">
                <Gamepad2 className="size-4" />
                Jogos rapidos para grupo
              </div>
              <h1 className="text-5xl font-black leading-[0.98] tracking-normal text-foreground sm:text-6xl">
                PartyRoom
              </h1>
              <p className="max-w-sm text-base leading-7 text-muted-foreground sm:text-lg">
                Crie uma sala e jogue com seus amigos em segundos.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs font-medium text-muted-foreground">
              <div className="rounded-md border border-border bg-card px-2 py-3">
                Codigos curtos
              </div>
              <div className="rounded-md border border-border bg-card px-2 py-3">
                Avatares emoji
              </div>
              <div className="rounded-md border border-border bg-card px-2 py-3">
                Party games
              </div>
            </div>
          </motion.div>

          <motion.form
            onSubmit={handleSubmit}
            className="rounded-lg border border-border bg-card p-4 shadow-2xl shadow-black/25 sm:p-5"
            initial={{ opacity: 0, scale: 0.97, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.12 }}
          >
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="nickname">Nickname</Label>
                <Input
                  id="nickname"
                  value={nickname}
                  onChange={(event) => {
                    const nextNickname = event.target.value;

                    setNickname(nextNickname);
                    persistNickname(nextNickname);

                    if (error) {
                      setError("");
                    }
                  }}
                  placeholder="Como seus amigos te chamam?"
                  autoComplete="nickname"
                  maxLength={24}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "nickname-error" : undefined}
                  className="h-12 bg-background text-base"
                />
                {error ? (
                  <p id="nickname-error" className="text-sm text-destructive">
                    {error}
                  </p>
                ) : null}
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

              <div className="space-y-3 pt-1">
                <Button
                  type="submit"
                  size="lg"
                  className="h-12 w-full gap-2"
                  disabled={isCreating}
                >
                  <Hash className="size-4" />
                  {isCreating ? "Criando..." : "Criar sala"}
                </Button>
                <Button
                  type="button"
                  size="lg"
                  variant="secondary"
                  className="h-12 w-full gap-2"
                  onClick={() => navigateTo("/join")}
                >
                  <LogIn className="size-4" />
                  Entrar em sala
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 w-full gap-2 text-muted-foreground hover:text-foreground"
                  onClick={() => navigateTo("/local")}
                >
                  <Smartphone className="size-4" />
                  Jogar no mesmo celular
                </Button>
              </div>
            </div>
          </motion.form>
        </div>
      </section>
    </main>
  );
}
