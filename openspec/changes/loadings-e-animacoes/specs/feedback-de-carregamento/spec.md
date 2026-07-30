## ADDED Requirements

### Requirement: Retorno visual imediato ao acionar criar ou entrar em sala
O sistema SHALL exibir indicador de carregamento animado no botão acionado assim que o usuário confirmar criar sala ou entrar em sala, e SHALL impedir novo acionamento enquanto a operação estiver em andamento.

#### Scenario: Usuário aciona criar sala
- **WHEN** o usuário aciona "Criar sala" com os campos válidos
- **THEN** o botão exibe indicador de progresso animado e fica indisponível para novo clique

#### Scenario: Usuário tenta acionar duas vezes
- **WHEN** o usuário aciona o botão novamente enquanto a operação anterior está em andamento
- **THEN** o segundo acionamento é ignorado e nenhuma requisição adicional é enviada

### Requirement: Carregamento permanece ativo até a próxima tela assumir
O sistema SHALL manter o estado de carregamento ativo durante toda a transição, incluindo o período de renderização da rota de destino, e SHALL encerrá-lo somente quando a nova tela estiver pronta ou quando ocorrer erro.

#### Scenario: Sala criada com sucesso
- **WHEN** a criação da sala é concluída e a navegação para o lobby começa
- **THEN** o indicador de carregamento continua visível durante a renderização do lobby, sem intervalo em que o botão volte ao estado normal

#### Scenario: Erro ao criar a sala
- **WHEN** a criação da sala retorna erro
- **THEN** o carregamento é encerrado, a mensagem de erro é exibida e o botão volta a ficar disponível

### Requirement: Aviso de espera longa
O sistema SHALL informar ao usuário, quando uma espera de rede passar de 5 segundos, que o servidor pode estar iniciando, mantendo o carregamento ativo.

#### Scenario: Espera passa de cinco segundos
- **WHEN** uma requisição de criar ou entrar em sala ultrapassa 5 segundos sem resposta
- **THEN** o sistema exibe mensagem explicando que o servidor pode estar iniciando e mantém o indicador de carregamento

### Requirement: Limite de espera em requisição de rede
O sistema SHALL encerrar toda requisição de criar ou entrar em sala que não responder dentro de 15 segundos, exibindo mensagem de erro específica de tempo esgotado e devolvendo o botão ao estado disponível.

#### Scenario: Requisição não responde dentro do limite
- **WHEN** uma requisição de criar sala não recebe resposta em 15 segundos
- **THEN** a requisição é abortada, o sistema exibe erro informando que o servidor não respondeu, e o botão volta a ficar disponível para nova tentativa

#### Scenario: Nova tentativa depois do tempo esgotado
- **WHEN** o usuário aciona o botão novamente após um erro de tempo esgotado
- **THEN** uma nova requisição é enviada normalmente, com o ciclo de carregamento reiniciado

### Requirement: Fallback animado durante renderização de rota
O sistema SHALL exibir um esqueleto de carregamento animado enquanto uma rota dinâmica estiver sendo renderizada, tanto em navegação dentro do app quanto em acesso direto pela URL.

#### Scenario: Navegação para o lobby da sala
- **WHEN** o usuário navega para o lobby de uma sala e a renderização no servidor ainda não terminou
- **THEN** o sistema exibe o esqueleto de carregamento animado, e não a tela anterior congelada

#### Scenario: Acesso direto à URL de uma tela de jogo
- **WHEN** o usuário abre diretamente a URL de uma tela de jogo
- **THEN** o sistema exibe o esqueleto de carregamento animado até a tela estar pronta

### Requirement: Saída disponível em carregamento demorado de rota
O sistema SHALL oferecer ao usuário uma ação de recarregar a página quando o carregamento de uma rota passar de 15 segundos, garantindo que nenhuma tela de carregamento fique sem saída.

#### Scenario: Renderização de rota excede o limite
- **WHEN** o esqueleto de carregamento de uma rota permanece visível por mais de 15 segundos
- **THEN** o sistema revela uma ação de recarregar a página junto ao esqueleto

### Requirement: Falha de conexão do socket é informada com ação
O sistema SHALL substituir o carregamento das telas de jogo por mensagem de erro acionável quando a conexão de tempo real falhar definitivamente ou quando o estado da partida não chegar dentro de 15 segundos.

#### Scenario: Conexão de tempo real falha definitivamente
- **WHEN** as tentativas de conexão do socket se esgotam sem sucesso
- **THEN** a tela de jogo exibe mensagem de falha de conexão com ação de tentar novamente e opção de voltar ao lobby

#### Scenario: Estado da partida não chega no prazo
- **WHEN** uma tela de jogo permanece 15 segundos sem receber o estado da partida
- **THEN** a tela exibe mensagem de erro com ação de tentar novamente, em vez de manter o texto de carregamento

#### Scenario: Nova tentativa após falha de conexão
- **WHEN** o usuário aciona tentar novamente na tela de falha de conexão
- **THEN** o sistema tenta reconectar e volta a exibir o carregamento durante a nova tentativa

### Requirement: Erro de renderização no servidor é tratado
O sistema SHALL exibir uma tela de erro tratada, com ação de recarregar, quando a renderização de uma rota falhar no servidor.

#### Scenario: Falha ao carregar dados da sala
- **WHEN** a renderização do lobby falha por indisponibilidade do banco de dados
- **THEN** o sistema exibe tela de erro tratada com ação de recarregar, e não a tela de erro padrão do framework

### Requirement: Animação de entrada nas telas
O sistema SHALL aplicar animação de entrada ao conteúdo das telas do fluxo de sala, e SHALL reduzir a animação a apenas variação de opacidade quando o usuário tiver preferência de movimento reduzido no sistema.

#### Scenario: Tela é aberta normalmente
- **WHEN** uma tela do fluxo de sala é montada
- **THEN** o conteúdo entra com animação suave de opacidade e deslocamento

#### Scenario: Usuário prefere movimento reduzido
- **WHEN** o sistema do usuário indica preferência por movimento reduzido
- **THEN** a animação de entrada ocorre apenas com variação de opacidade, sem deslocamento
