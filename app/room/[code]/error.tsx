"use client";

import { RouteError } from "@/components/ui/route-error";

export default function RoomError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      error={error}
      reset={reset}
      title="Nao foi possivel carregar a sala"
    />
  );
}
