"use client";

import { useState } from "react";
import { Check, Copy, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

type RoomActionsProps = {
  code: string;
};

export function RoomActions({ code }: RoomActionsProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="grid gap-3">
      <Button type="button" size="lg" className="h-12 gap-2" onClick={copyCode}>
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        {copied ? "Codigo copiado" : "Copiar codigo"}
      </Button>
      <Button
        type="button"
        size="lg"
        variant="secondary"
        className="h-12 gap-2"
        onClick={() => router.push("/")}
      >
        <LogOut className="size-4" />
        Sair da sala
      </Button>
    </div>
  );
}
