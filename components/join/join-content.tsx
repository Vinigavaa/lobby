"use client";

import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, LogIn } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  fetchWithTimeout,
  isTimeoutError,
  slowRequestWarningMs,
} from "@/lib/fetch-with-timeout";
import { cn } from "@/lib/utils";

const avatarOptions = ["🎲", "🎮", "🪩", "🚀", "🧠", "🎭"];
const nicknameKey = "partyroom:nickname";
const avatarKey = "partyroom:avatar";
const userIdKey = "partyroom:user-id";
const codeLength = 6;

export function JoinContent() {
  const router = useRouter();
  // Sem deslocamento quando o sistema pede menos movimento.
  const prefersReducedMotion = useReducedMotion();
  const [nickname, setNickname] = useState("");
  const [avatar, setAvatar] = useState(avatarOptions[0]);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSlow, setIsSlow] = useState(false);
  // isNavigating segura o carregamento durante a renderizacao do lobby, que e
  // onde estava o intervalo sem feedback.
  const [isNavigating, startNavigation] = useTransition();
  const digitRefs = useRef<Array<HTMLInputElement | null>>([]);
  const slowTimerRef = useRef<number | null>(null);
  const isBusy = isSubmitting || isNavigating;

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

  useEffect(() => {
    return () => {
      if (slowTimerRef.current !== null) {
        window.clearTimeout(slowTimerRef.current);
      }
    };
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

  function updateCode(value: string) {
    setCode(value.replace(/\D/g, "").slice(0, codeLength));
    setError("");
  }

  function handleDigitChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const nextDigits = Array.from({ length: codeLength }, (_, i) => code[i] ?? "");
    nextDigits[index] = digit;
    updateCode(nextDigits.join(""));

    if (digit && index < codeLength - 1) {
      digitRefs.current[index + 1]?.focus();
    }
  }

  function handleDigitKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !code[index] && index > 0) {
      digitRefs.current[index - 1]?.focus();
    }
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

    setIsSubmitting(true);
    setIsSlow(false);
    slowTimerRef.current = window.setTimeout(
      () => setIsSlow(true),
      slowRequestWarningMs
    );

    try {
      const storedUserId = localStorage.getItem(userIdKey);
      const response = await fetchWithTimeout("/api/rooms/join", {
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
      // Dentro da transicao o carregamento continua ativo ate o lobby assumir.
      startNavigation(() => router.push(`/room/${data.code}`));
    } catch (requestError) {
      setError(
        isTimeoutError(requestError)
          ? "O servidor nao respondeu. Tente novamente."
          : "Nao foi possivel entrar na sala."
      );
    } finally {
      clearSlowTimer();
      setIsSubmitting(false);
    }
  }

  function clearSlowTimer() {
    if (slowTimerRef.current !== null) {
      window.clearTimeout(slowTimerRef.current);
      slowTimerRef.current = null;
    }

    setIsSlow(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void joinRoom();
  }

  return (
    <main className="min-h-screen bg-background px-5 py-6 text-foreground">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md flex-col">
        <Button
          asChild
          variant="secondary"
          size="icon"
          className="mt-2 rounded-full border border-border"
        >
          <Link href="/" aria-label="Voltar para inicio">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>

        <motion.div
          className="flex flex-1 flex-col items-center justify-center gap-7 py-8"
          initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex flex-col items-center gap-1.5 text-center">
            <div className="relative mb-1 size-[52px] overflow-hidden rounded-2xl">
              <Image src="/logo.png" alt="PartyRoom" fill className="object-cover" priority />
            </div>
            <h1 className="font-heading text-2xl font-black">Entrar em sala</h1>
            <p className="text-[13.5px] leading-6 text-muted-foreground">
              Peca o codigo de {codeLength} digitos
              <br />
              pra quem criou a sala
            </p>
          </div>

          <form onSubmit={handleSubmit} className="w-full space-y-5">
            <div className="space-y-3.5 rounded-[20px] border border-border bg-card p-5">
              <div className="grid grid-cols-6 gap-2.5">
                {Array.from({ length: codeLength }, (_, index) => code[index] ?? "").map(
                  (digit, index) => (
                    <div key={index} className="relative aspect-[13/16] w-full">
                      <input
                        ref={(element) => {
                          digitRefs.current[index] = element;
                        }}
                        value={digit}
                        onChange={(event) => handleDigitChange(index, event.target.value)}
                        onKeyDown={(event) => handleDigitKeyDown(index, event)}
                        inputMode="numeric"
                        maxLength={1}
                        aria-label={`Digito ${index + 1} do codigo`}
                        aria-invalid={Boolean(error && code.length !== codeLength)}
                        className={cn(
                          "size-full rounded-xl border bg-muted text-center text-2xl font-black text-foreground transition focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none",
                          digit ? "border-2 border-primary" : "border-border"
                        )}
                      />
                      {!digit ? (
                        <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-muted-foreground/60">
                          •
                        </span>
                      ) : null}
                    </div>
                  )
                )}
              </div>

              <Input
                id="join-nickname"
                value={nickname}
                onChange={(event) => updateNickname(event.target.value)}
                placeholder="Como seus amigos te chamam?"
                autoComplete="nickname"
                maxLength={24}
                aria-invalid={Boolean(error && !nickname.trim())}
                className="h-12 rounded-xl border-border bg-muted text-base"
              />
            </div>

            {error ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">
                {error}
              </p>
            ) : null}

            {isSlow ? (
              <p
                className="rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-center text-sm text-accent-foreground"
                aria-live="polite"
              >
                O servidor pode estar iniciando. Aguarde alguns segundos...
              </p>
            ) : null}

            <Button
              type="submit"
              size="lg"
              className="h-14 w-full gap-2 rounded-[14px] text-base"
              isLoading={isBusy}
            >
              {isBusy ? null : <LogIn className="size-4" />}
              {isBusy ? "Entrando na sala..." : "Entrar"}
            </Button>

            <p className="text-center text-[12.5px] text-muted-foreground/70">
              Nao tem um codigo?{" "}
              <Link href="/" className="font-bold text-accent">
                Criar sala
              </Link>
            </p>
          </form>
        </motion.div>
      </section>
    </main>
  );
}
