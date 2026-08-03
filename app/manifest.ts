import type { MetadataRoute } from "next";

/**
 * Manifest do app instalado na tela inicial do celular.
 *
 * `display: standalone` tira a barra de endereco, e as cores acompanham o
 * fundo do tema escuro — o app so roda em dark, entao nao ha variacao.
 *
 * O icone `maskable` e separado porque o Android recorta a borda para encaixar
 * o icone no formato do sistema; o outro entra inteiro onde nao ha recorte.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PartyRoom",
    short_name: "PartyRoom",
    description: "Party games multiplayer para jogar entre amigos.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0e0e10",
    theme_color: "#0e0e10",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
