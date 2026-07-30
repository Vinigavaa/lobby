"use client";

import { FormEvent, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { LogIn, Plus, Smartphone } from "lucide-react";
import Image from "next/image";
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
            <div className="relative size-[30px] overflow-hidden rounded-[9px]">
              <Image src="/logo.png" alt="PartyRoom" fill className="object-cover" priority />
            </div>
            <span className="font-heading text-lg font-bold">PartyRoom</span>
          </div>
          <div className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground">
            Sem login
          </div>
        </motion.div>

        <div className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
          <motion.div
            className="space-y-4 text-center sm:text-left"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.05 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-accent/12 px-3 py-1.5 text-xs font-bold text-accent">
              <span aria-hidden>💬</span>
              Jogos rapidos para grupo
            </div>
            <h1 className="font-heading text-4xl font-black leading-[1.05] tracking-normal text-foreground sm:text-5xl lg:text-6xl">
              Chame a galera
              <br />
              pra jogar
            </h1>
            <p className="mx-auto max-w-sm text-base leading-7 text-muted-foreground sm:mx-0 sm:text-lg">
              Crie uma sala e comece a brincadeira com seus amigos em segundos.
            </p>
          </motion.div>

          <motion.form
            onSubmit={handleSubmit}
            className="space-y-4"
            initial={{ opacity: 0, scale: 0.97, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.12 }}
          >
            <div className="space-y-3.5 rounded-[20px] border border-border bg-card p-[18px]">
              <div className="space-y-1.5">
                <Label htmlFor="nickname" className="text-[13px] font-bold">
                  Nickname
                </Label>
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
                  className="h-12 rounded-xl border-border bg-muted text-base"
                />
                {error ? (
                  <p id="nickname-error" className="text-sm text-destructive">
                    {error}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label className="text-[13px] font-bold">Avatar</Label>
                <div className="flex gap-2">
                  {avatarOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => selectAvatar(option)}
                      aria-label={`Usar avatar ${option}`}
                      aria-pressed={avatar === option}
                      className={cn(
                        "flex aspect-square flex-1 items-center justify-center rounded-xl border text-xl transition focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none",
                        avatar === option
                          ? "border-accent bg-accent"
                          : "border-border bg-muted hover:border-accent/60"
                      )}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2.5 pt-1">
              <Button
                type="submit"
                size="lg"
                className="h-14 w-full gap-2 rounded-[14px] text-base"
                disabled={isCreating}
              >
                <Plus className="size-4" />
                {isCreating ? "Criando..." : "Criar sala"}
              </Button>
              <Button
                type="button"
                size="lg"
                variant="secondary"
                className="h-14 w-full gap-2 rounded-[14px] border border-border text-base"
                onClick={() => navigateTo("/join")}
              >
                <LogIn className="size-4" />
                Entrar em sala
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="h-11 w-full gap-2 text-accent hover:text-accent"
                onClick={() => navigateTo("/local")}
              >
                <Smartphone className="size-4" />
                Jogar no mesmo celular
              </Button>
            </div>
          </motion.form>
        </div>
      </section>
    </main>
  );
}
