## Why

Ao clicar em "Criar sala" ou "Entrar na sala" o app fica cerca de 1 segundo sem nenhum sinal de que algo está acontecendo, dando a impressão de que o clique não funcionou. A causa está no código: em ambos os fluxos o `finally { setIsCreating(false) }` executa imediatamente após `router.push()`, que não espera a navegação terminar. O botão volta ao estado normal enquanto o Next ainda renderiza `/room/[code]` no servidor (rota `force-dynamic` com duas queries Prisma), e como não existe nenhum `loading.tsx` no projeto, a tela anterior fica congelada nesse intervalo.

Além do desconforto visual, existem dois caminhos hoje em que o usuário fica preso sem saída:

- As chamadas `fetch` de criar/entrar não têm timeout. Se a rede travar — ou no cold start do Render, que leva de 30 a 50 segundos — o estado de carregamento nunca é desfeito, o botão permanece desabilitado em "Criando..." e não há como tentar novamente sem recarregar a página.
- As seis telas de jogo exibem "Carregando partida..." enquanto aguardam o primeiro `state-updated` do socket. Não existe nenhum tratamento de `connect_error` ou `reconnect_failed` no projeto, então uma falha de conexão deixa esse texto na tela indefinidamente, sem mensagem nem ação. Foi exatamente o que aconteceu quando o CORS do Socket.IO estava mal configurado em produção.

## What Changes

- **Loading que sobrevive à navegação**: o estado de carregamento de "Criar sala" e "Entrar na sala" passa a permanecer ativo até a nova rota assumir, em vez de ser desfeito logo após o `router.push()`.
- **Feedback visual animado**: os botões de ação ganham indicador de progresso animado (spinner) em vez de apenas trocar o texto e desabilitar.
- **`loading.tsx` nas rotas dinâmicas**: `/room/[code]` e as rotas de jogo passam a exibir um esqueleto animado durante o render no servidor, eliminando a tela congelada.
- **Transições de entrada nas páginas**: animação suave de entrada no conteúdo das telas, reaproveitando o `framer-motion` já usado no projeto.
- **Timeout em toda espera de rede**: as chamadas de criar/entrar ganham limite de 15 segundos, com aviso ao usuário a partir de 5 segundos informando que o servidor pode estar iniciando. Ao estourar o limite, o carregamento é encerrado, o erro é exibido e o botão volta a ficar disponível para nova tentativa.
- **Falha de socket deixa de ser silenciosa**: as telas de jogo passam a tratar falha e perda de conexão, substituindo o "Carregando partida..." infinito por mensagem de erro com ação de tentar novamente e opção de voltar ao lobby.
- **`error.tsx` nas rotas**: erro em componente de servidor (ex: banco indisponível) passa a exibir tela tratada com ação de recarregar, em vez da tela de erro crua do Next.
- **Garantia geral**: nenhum estado de carregamento do app pode permanecer ativo indefinidamente — todo carregamento tem prazo e desfecho (sucesso, erro tratado ou nova tentativa).

## Capabilities

### New Capabilities
- `feedback-de-carregamento`: Estados de carregamento, animações de transição e limites de espera em todas as telas do app, garantindo que o usuário sempre veja progresso e nunca fique preso em um carregamento sem fim.

### Modified Capabilities
(nenhuma — `openspec/specs/` ainda não possui specs consolidadas)

## Impact

- **Telas iniciais**: `components/home/home-content.tsx` e `components/join/join-content.tsx` — estado de carregamento, timeout, aviso de espera longa e spinner.
- **Componente de botão**: `components/ui/button.tsx` — passa a aceitar estado de carregamento, para não repetir a marcação do spinner em cada tela.
- **Rotas**: novos `loading.tsx` e `error.tsx` em `app/room/[code]/` e nas rotas de jogo; possivelmente um `error.tsx` na raiz de `app/`.
- **Telas de jogo** (6): `guess-who`, `impostor`, `mimica`, `stop`, `trivia` e `quem-sou-eu-personalizado` — tratamento de falha de conexão do socket no lugar do carregamento infinito.
- **Cliente de socket**: `lib/socket/client.ts` — pode precisar expor limite de tentativas de reconexão para que a falha seja detectável.
- **Sem impacto** em: schema do banco, regras dos jogos, contratos de evento do socket já existentes e lógica de servidor em `lib/socket/server.ts`.
