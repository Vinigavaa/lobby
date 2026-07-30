## Context

O app tem três tipos de espera, e hoje nenhum deles tem desfecho garantido:

1. **Chamada HTTP** (`POST /api/rooms`, `POST /api/rooms/join`) — `fetch` sem `AbortSignal`, então uma rede travada nunca resolve nem rejeita.
2. **Navegação para rota dinâmica** (`/room/[code]` e telas de jogo, todas `force-dynamic` com queries Prisma) — o render acontece no servidor e, sem `loading.tsx`, não existe fronteira de Suspense para mostrar fallback.
3. **Primeiro estado via socket** — as seis telas de jogo renderizam "Carregando..." enquanto `state === null`. Não há listener de `connect_error` nem de `reconnect_failed` em nenhum lugar do projeto.

O bug do "1 segundo sem feedback" é a interação entre (1) e (2): o `finally` desfaz o estado de carregamento logo depois do `router.push()`, que é assíncrono e não aguardado. O carregamento morre exatamente quando a espera de verdade começa.

O projeto já usa `framer-motion` em 7 componentes, então animação não traz dependência nova. O `Button` é um shadcn padrão com `cva` + `Slot`, sem noção de carregamento. Não existe componente de spinner nem skeleton.

Ambiente relevante: o serviço roda no plano Free do Render, que hiberna após inatividade e leva de 30 a 50 segundos para acordar. Qualquer limite de espera precisa distinguir "está acordando" de "travou".

## Goals / Non-Goals

**Goals:**
- Todo clique que dispara espera dá retorno visual imediato e contínuo até a próxima tela assumir.
- Nenhum estado de carregamento pode ficar ativo para sempre: os três tipos de espera acima ganham prazo e saída.
- Quando a espera passar de 5 segundos, explicar ao usuário o que está acontecendo em vez de só girar um spinner.
- Falha de socket vira mensagem acionável, não "Carregando partida..." eterno.
- Reaproveitar `framer-motion` e o `Button` existentes, sem introduzir biblioteca de UI nova.

**Non-Goals:**
- Não mexe nas telas de `/local` (jogos offline, sem espera de rede) — decisão confirmada com o usuário.
- Não altera schema do banco, regras de jogo, nem os contratos de evento do socket já existentes.
- Não tenta otimizar a latência em si (índices, cache, warm-up do Render). O objetivo é comunicar a espera, não encurtá-la.
- Não implementa reconexão automática infinita disfarçada: o limite existe para ser atingido e reportado.

## Decisions

### 1. `useTransition` para o carregamento sobreviver à navegação
Trocar o par `setIsCreating(true/false)` por um estado de submissão combinado com `useTransition`:

```tsx
const [isSubmitting, setIsSubmitting] = useState(false);
const [isNavigating, startNavigation] = useTransition();
const isBusy = isSubmitting || isNavigating;
```

O `router.push()` passa a ser chamado dentro de `startNavigation(...)`, e `isNavigating` permanece `true` até a nova rota estar pronta. O `finally` só desfaz `isSubmitting`, nunca a navegação.

- **Alternativa considerada**: não desfazer `isCreating` no caminho de sucesso (deixar `true` até desmontar). Rejeitada — se a navegação falhar ou o usuário voltar, o botão fica travado, recriando o problema que a mudança quer eliminar.

### 2. Timeout explícito no `fetch`, com estágio de aviso
Extrair `lib/fetch-with-timeout.ts` usado pelos dois fluxos:

```ts
export const requestTimeoutMs = 15_000;
export const slowRequestWarningMs = 5_000;

export async function fetchWithTimeout(input: string, init?: RequestInit) {
  return fetch(input, { ...init, signal: AbortSignal.timeout(requestTimeoutMs) });
}
```

`AbortSignal.timeout` rejeita com `TimeoutError`, o que permite mensagem específica ("o servidor não respondeu") separada de falha genérica de rede. O aviso dos 5 segundos é um `setTimeout` local que liga uma flag `isSlow`, exibindo texto explicando que o servidor pode estar iniciando.

Extrai-se só o `fetch`; a fiação de estado fica em cada componente. São dois call sites — criar um hook genérico de ação assíncrona seria abstração além da necessidade.

- **Alternativa considerada**: 10 segundos fixos. Rejeitada por dar erro falso no cold start do Render, que passa de 30 segundos.

### 3. Escape hatch dentro do `loading.tsx`, cobrindo a fase de navegação
Este é o furo menos óbvio: o timeout do `fetch` **não** cobre a fase 2. Se o render no servidor travar, `isNavigating` fica `true` indefinidamente e o usuário volta a ficar preso.

A solução é o próprio fallback de carregamento carregar sua saída. `loading.tsx` renderiza um componente cliente `<RouteLoading />` que mostra skeleton animado e, após 15 segundos, revela uma ação de recarregar a página. Como o `loading.tsx` é a fronteira de Suspense do segmento dinâmico, ele aparece tanto na navegação suave quanto no acesso direto pela URL — cobrindo os dois casos com um único componente.

### 4. Falha de socket detectada por duas vias
As telas de jogo passam a tratar:

- **Sinal preciso**: `reconnectionAttempts` finito em `lib/socket/client.ts` (hoje o padrão é infinito, então `reconnect_failed` nunca dispara). Com limite, o evento passa a ser alcançável e indica falha definitiva.
- **Rede de segurança**: temporizador de 15 segundos a partir da montagem. Se `state` continuar `null`, mostra erro com ação de tentar novamente. Isso cobre também o caso em que o socket conecta mas o servidor nunca envia estado (partida inexistente, jogador fora da sala).

A ação de tentar novamente reconecta o socket; se falhar de novo, oferece voltar ao lobby. As duas vias juntas garantem que "Carregando partida..." tem prazo, independentemente da causa.

### 5. Animações com `framer-motion` respeitando preferência de acessibilidade
Um componente cliente `<PageTransition>` envolve o conteúdo das telas com fade e leve deslocamento na entrada. Usa `useReducedMotion` do `framer-motion` para desligar o movimento quando o sistema pede menos animação, mantendo só a opacidade.

O skeleton do `loading.tsx` usa `animate-pulse` do Tailwind — CSS puro, sem custo de JS numa tela que existe justamente porque algo está lento.

### 6. Estado de carregamento no `Button`
`components/ui/button.tsx` ganha `isLoading?: boolean`, que renderiza um `Loader2` girando antes do conteúdo e aplica `disabled`. Evita repetir a marcação do spinner em cada tela.

Restrição: `isLoading` não é combinável com `asChild`, porque o `Slot` do Radix exige um único filho. O componente ignora `isLoading` quando `asChild` é `true`, e isso fica documentado no próprio arquivo.

## Risks / Trade-offs

- [15s é curto se o Render demorar mais que o previsto para acordar] → O aviso dos 5 segundos já explica a situação, e o erro final oferece tentar novamente em um clique, sem recarregar. Se na prática o cold start estourar o limite com frequência, o valor está centralizado em uma constante e é ajustável em um lugar só.
- [`reconnectionAttempts` finito significa que uma queda longa de rede deixa de reconectar sozinha] → É o comportamento desejado: melhor informar e oferecer ação do que tentar em silêncio para sempre. A tela de erro reconecta ao ser acionada.
- [`AbortSignal.timeout` não existe em navegadores muito antigos] → O app é para celulares em uso atual e o alvo de homologação é Android Studio e Web modernos; ainda assim, uma falha de suporte cai no `catch` genérico e mostra erro tratado, nunca trava.
- [Animação de entrada em toda navegação pode parecer lenta em aparelho fraco] → Durações curtas (em torno de 200ms) e desligamento automático via `prefers-reduced-motion`.
- [`isLoading` silenciosamente ignorado com `asChild`] → Comportamento documentado no arquivo; nenhum uso atual do projeto combina os dois.

## Migration Plan

Mudança apenas de interface, sem migration de banco e sem alteração de contrato de socket existente. Deploy normal pelo `main` (Render). Reversível por revert do commit, já que nenhum estado persistido é afetado.

## Open Questions

Nenhuma pendente — escopo (criar/entrar + telas de jogo, sem `/local`) e limites de espera (15s com aviso em 5s) já confirmados com o usuário.
