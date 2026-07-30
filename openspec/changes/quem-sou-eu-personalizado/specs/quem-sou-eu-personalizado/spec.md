## ADDED Requirements

### Requirement: Seleção e requisitos mínimos para iniciar
O sistema SHALL disponibilizar "Quem Sou Eu — Modo Personalizado" como um jogo selecionável na sala (`Game.type = "quem-sou-eu-personalizado"`), iniciável apenas pelo host, apenas com a sala em `status: "waiting"` e com pelo menos 2 jogadores conectados.

#### Scenario: Host tenta iniciar com menos de 2 jogadores
- **WHEN** o host aciona iniciar partida com apenas 1 jogador conectado na sala
- **THEN** o servidor rejeita com erro e a partida não é criada

#### Scenario: Host inicia com jogadores suficientes
- **WHEN** o host aciona iniciar partida com 2 ou mais jogadores conectados e o jogo selecionado é o Modo Personalizado
- **THEN** o servidor cria a partida, calcula a distribuição circular e todos os jogadores são redirecionados para a tela do jogo

### Requirement: Distribuição circular automática
O sistema SHALL gerar automaticamente, ao iniciar a partida, uma sequência circular embaralhada de jogadores conectados, onde cada jogador escreve o personagem exclusivamente do próximo da sequência, sem que nenhum jogador escolha seu destinatário.

#### Scenario: Distribuição com 6 jogadores
- **WHEN** a partida inicia com 6 jogadores conectados
- **THEN** cada jogador recebe exatamente um destinatário diferente para escrever, formando um ciclo fechado onde todos escrevem e são escritos exatamente uma vez

### Requirement: Escrita obrigatória do personagem
O sistema SHALL exigir de cada jogador o envio de exatamente um nome de personagem, não vazio e dentro do limite de caracteres definido pelo servidor, e SHALL impedir alteração após a confirmação do envio.

#### Scenario: Envio vazio é rejeitado
- **WHEN** um jogador tenta confirmar o personagem com o campo vazio ou apenas espaços
- **THEN** o servidor rejeita o envio com uma mensagem de erro e a fase de escrita continua aguardando aquele jogador

#### Scenario: Envio acima do limite de caracteres é rejeitado
- **WHEN** um jogador envia um texto maior que o limite de caracteres configurado
- **THEN** o servidor rejeita o envio com uma mensagem de erro

#### Scenario: Jogador tenta editar após confirmar
- **WHEN** um jogador que já confirmou o envio do personagem tenta enviar novamente
- **THEN** o servidor rejeita a segunda tentativa e mantém o personagem originalmente enviado

### Requirement: Espera até todos confirmarem
O sistema SHALL manter a partida na fase de escrita até que todos os jogadores da sequência circular tenham confirmado seus respectivos personagens, exibindo a cada jogador que já enviou uma indicação de que está aguardando os demais.

#### Scenario: Nem todos enviaram ainda
- **WHEN** um jogador confirma seu personagem mas ainda há outro jogador que não enviou
- **THEN** a partida permanece na fase de escrita e o jogador que já enviou vê a tela de espera

#### Scenario: Todos enviaram
- **WHEN** o último jogador pendente confirma seu personagem
- **THEN** o servidor avança a partida para a fase de jogo e notifica todos os jogadores em tempo real

### Requirement: Visibilidade do próprio personagem oculta
O sistema SHALL ocultar de cada jogador o personagem atribuído a ele mesmo durante toda a fase de jogo, exibindo apenas os personagens dos demais jogadores, até que seu próprio acerto seja confirmado pela votação da sala.

#### Scenario: Jogador visualiza o painel da partida
- **WHEN** um jogador visualiza a tela de jogo antes de descobrir seu personagem
- **THEN** ele vê o personagem de todos os outros jogadores e o próprio card exibido como oculto

### Requirement: Tentativa de acerto
O sistema SHALL permitir que um jogador que ainda não descobriu seu personagem registre uma tentativa de resposta ("Já sei quem eu sou!"), submetendo o nome que acredita ser o seu personagem.

#### Scenario: Jogador que já acertou tenta registrar nova tentativa
- **WHEN** um jogador que já teve seu acerto confirmado tenta registrar uma nova tentativa de resposta
- **THEN** o servidor rejeita a ação, pois ele não participa mais das tentativas

#### Scenario: Jogador registra tentativa válida
- **WHEN** um jogador que ainda não descobriu seu personagem envia uma tentativa de resposta
- **THEN** o servidor abre uma votação de confirmação para essa tentativa e notifica os demais jogadores em tempo real

### Requirement: Votação de confirmação de acerto
O sistema SHALL, para cada tentativa de acerto registrada, coletar o voto de todos os jogadores da partida exceto o autor da tentativa — incluindo jogadores que já tiveram seu próprio acerto confirmado anteriormente — e SHALL considerar a tentativa confirmada apenas quando a maioria simples dos votos elegíveis for favorável.

#### Scenario: Maioria vota a favor
- **WHEN** a maioria simples dos jogadores elegíveis vota que a tentativa está correta
- **THEN** o servidor confirma o acerto, revela o personagem para o próprio jogador, registra sua posição na ordem de descoberta e o horário do acerto

#### Scenario: Maioria vota contra ou há empate
- **WHEN** a maioria dos jogadores elegíveis vota que a tentativa está incorreta, ou os votos terminam empatados
- **THEN** o servidor não confirma o acerto, o personagem do jogador permanece oculto e ele pode registrar nova tentativa posteriormente

#### Scenario: Jogador vota duas vezes na mesma tentativa
- **WHEN** um jogador que já votou em uma tentativa em aberto tenta votar novamente na mesma tentativa
- **THEN** o servidor rejeita o segundo voto

### Requirement: Transição para espectador após acerto confirmado
O sistema SHALL, a partir da confirmação de um acerto, impedir que aquele jogador registre novas tentativas de resposta, mantendo-o apenas como participante das votações de confirmação dos demais jogadores até o fim da partida.

#### Scenario: Jogador confirmado tenta registrar nova tentativa
- **WHEN** um jogador com acerto confirmado tenta acionar "Já sei quem eu sou!" novamente
- **THEN** o servidor rejeita a ação

#### Scenario: Jogador confirmado ainda participa da votação
- **WHEN** outro jogador ainda ativo registra uma nova tentativa de acerto
- **THEN** o jogador com acerto já confirmado recebe a votação e pode votar normalmente

### Requirement: Encerramento automático da partida
O sistema SHALL encerrar automaticamente a partida quando restar exatamente um jogador sem acerto confirmado, revelando o personagem desse último jogador no resumo final sem exigir uma tentativa de resposta dele.

#### Scenario: Penúltimo jogador acerta
- **WHEN** a confirmação de acerto de um jogador faz com que reste apenas um jogador sem descobrir seu personagem
- **THEN** o servidor encerra a partida, revela o personagem do jogador restante e todos são notificados em tempo real com o resumo final

### Requirement: Resumo final da partida
O sistema SHALL exibir, ao final da partida, a ordem em que cada jogador descobriu seu personagem, o tempo decorrido entre o início da partida e a confirmação do acerto de cada jogador, o personagem atribuído a cada jogador e uma opção para jogar novamente com os mesmos participantes.

#### Scenario: Visualização do resumo final
- **WHEN** a partida é encerrada (automaticamente ou pelo host)
- **THEN** cada jogador visualiza a ordem de descoberta, o tempo de cada jogador até acertar e o personagem de todos, incluindo o próprio

### Requirement: Jogar novamente com os mesmos participantes
O sistema SHALL permitir, a partir do resumo final, iniciar uma nova partida com os mesmos jogadores ainda conectados, gerando uma nova distribuição circular independente da anterior.

#### Scenario: Host aciona jogar novamente
- **WHEN** o host aciona "Jogar novamente" na tela de resumo final
- **THEN** o servidor cria uma nova partida do Modo Personalizado com nova ordem circular e a sala retorna à fase de escrita de personagens

### Requirement: Cancelamento da partida pelo host
O sistema SHALL permitir que o host cancele a partida em andamento a qualquer momento antes do encerramento, retornando todos os jogadores ao lobby da sala.

#### Scenario: Host cancela durante a fase de escrita
- **WHEN** o host aciona cancelar partida enquanto algum jogador ainda não enviou seu personagem
- **THEN** o servidor encerra a partida como cancelada, retorna a sala para o status de espera e todos os jogadores são redirecionados ao lobby

#### Scenario: Jogador não-host tenta cancelar
- **WHEN** um jogador que não é o host tenta acionar o cancelamento da partida
- **THEN** o servidor rejeita a ação
