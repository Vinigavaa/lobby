"use client";

import { useEffect, useState } from "react";

/**
 * Altura que o teclado virtual cobre da parte de baixo da tela.
 *
 * No Android o teclado costuma encolher a viewport de layout, entao uma barra
 * fixa na base sobe sozinha. No iOS nao: a viewport de layout continua do mesmo
 * tamanho e a barra fica atras do teclado. `visualViewport` e o unico jeito de
 * descobrir quanto da tela sobrou visivel.
 *
 * Devolve `0` quando nao ha teclado aberto ou quando a API nao existe — nesse
 * caso o layout se comporta como antes.
 */
export function useKeyboardInset() {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const viewport = window.visualViewport;

    if (!viewport) {
      return;
    }

    function update() {
      if (!viewport) {
        return;
      }

      const covered = window.innerHeight - viewport.height - viewport.offsetTop;

      setInset(covered > 0 ? Math.round(covered) : 0);
    }

    // `scroll` importa porque no iOS a viewport visual desliza sobre a de
    // layout quando o campo focado esta perto do rodape.
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);

    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, []);

  return inset;
}
