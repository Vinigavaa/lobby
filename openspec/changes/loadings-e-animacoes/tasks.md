## 1. Blocos reutilizáveis

- [x] 1.1 Criar `lib/fetch-with-timeout.ts` com `fetchWithTimeout`, `requestTimeoutMs` (15000) e `slowRequestWarningMs` (5000)
- [x] 1.2 Adicionar `isLoading?: boolean` ao `components/ui/button.tsx`, renderizando `Loader2` girando e aplicando `disabled`; documentar no arquivo que é ignorado com `asChild`
- [x] 1.3 Criar `components/ui/page-transition.tsx` (client) com fade e deslocamento de entrada via `framer-motion`, usando `useReducedMotion` para desligar o deslocamento
- [x] 1.4 Criar `components/ui/route-loading.tsx` (client) com esqueleto `animate-pulse` que revela ação de recarregar após `requestTimeoutMs`

## 2. Fluxo de criar sala

- [x] 2.1 Em `components/home/home-content.tsx`, trocar `isCreating` por `isSubmitting` + `useTransition`, com `isBusy` combinado
- [x] 2.2 Chamar `router.push` dentro de `startNavigation` para o carregamento sobreviver à navegação
- [x] 2.3 Substituir o `fetch` por `fetchWithTimeout` e tratar `TimeoutError` com mensagem específica de servidor sem resposta
- [x] 2.4 Adicionar aviso de espera longa (flag ligada por `setTimeout` em `slowRequestWarningMs`), limpando o timer no `finally`
- [x] 2.5 Trocar o texto "Criando..." pelo `isLoading` do `Button`

## 3. Fluxo de entrar em sala

- [x] 3.1 Em `components/join/join-content.tsx`, aplicar o mesmo padrão de `isSubmitting` + `useTransition` e `isBusy`
- [x] 3.2 Chamar `router.push` dentro de `startNavigation`
- [x] 3.3 Substituir o `fetch` por `fetchWithTimeout` e tratar `TimeoutError`
- [x] 3.4 Adicionar aviso de espera longa e limpar o timer
- [x] 3.5 Trocar o texto "Entrando..." pelo `isLoading` do `Button`

## 4. Fallbacks de rota

- [x] 4.1 Criar `app/room/[code]/loading.tsx` usando `RouteLoading`
- [x] 4.2 Criar `loading.tsx` nas rotas de jogo (`guess-who`, `impostor`, `mimica`, `stop`, `trivia`, `quem-sou-eu-personalizado`)
- [x] 4.3 Criar `app/room/[code]/error.tsx` com mensagem tratada e ação de recarregar
- [x] 4.4 Criar `app/error.tsx` como rede de segurança para as demais rotas

## 5. Falha de socket nas telas de jogo

- [x] 5.1 Definir `reconnectionAttempts` finito em `lib/socket/client.ts` para tornar `reconnect_failed` alcançável
- [x] 5.2 Criar `components/ui/connection-error.tsx` com mensagem, ação de tentar novamente e opção de voltar ao lobby
- [x] 5.3 Em `components/quem-sou-eu-personalizado/custom-guess-who-game.tsx`, tratar `connect_error`/`reconnect_failed` e o temporizador de 15s sem estado
- [x] 5.4 Aplicar o mesmo tratamento em `components/trivia/trivia-game.tsx`
- [x] 5.5 Aplicar o mesmo tratamento em `components/stop/stop-game.tsx`
- [x] 5.6 Aplicar o mesmo tratamento em `components/mimica/mimica-game.tsx`
- [x] 5.7 Aplicar o mesmo tratamento em `components/impostor/impostor-game.tsx`
- [x] 5.8 Aplicar o mesmo tratamento em `components/guess-who/guess-who-game.tsx`
- [x] 5.9 Garantir que a ação de tentar novamente reconecta o socket e volta a exibir carregamento

## 6. Animações de entrada

- [x] 6.1 Tela inicial e entrar em sala já tinham animação de entrada própria; em vez de duplicar com `PageTransition`, fazer as animações existentes respeitarem `useReducedMotion`
- [x] 6.2 Aplicar `PageTransition` no lobby da sala e nas telas de jogo

## 7. Validação

- [x] 7.1 Rodar `tsc --noEmit`, `eslint` e `next build`
- [ ] 7.2 Verificar que criar e entrar em sala mostram carregamento contínuo, sem intervalo morto até o lobby aparecer
- [ ] 7.3 Simular rede lenta (throttling do navegador) e confirmar o aviso em 5s e o erro em 15s com botão liberado
- [ ] 7.4 Simular falha de socket (parar o servidor com a tela de jogo aberta) e confirmar que o carregamento vira erro acionável
- [ ] 7.5 Confirmar que nenhuma tela de carregamento do app fica sem saída após 15s
- [ ] 7.6 Validar com preferência de movimento reduzido ligada no sistema
- [ ] 7.7 Validar em Web e Android Studio, conforme o padrão do projeto
