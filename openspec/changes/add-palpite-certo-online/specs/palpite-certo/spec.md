## ADDED Requirements

### Requirement: Selecao e inicio da partida
O sistema SHALL disponibilizar o jogo `palpite-certo` no catalogo de jogos da
sala, permitindo que apenas o host inicie a partida com no minimo 2 jogadores
conectados.

#### Scenario: Host inicia a partida
- **WHEN** o host da sala seleciona `palpite-certo` e aciona iniciar com pelo menos 2 jogadores conectados
- **THEN** o servidor cria a partida, sorteia a primeira pergunta e navega todos os jogadores da sala para a tela do jogo simultaneamente

#### Scenario: Jogador comum tenta iniciar
- **WHEN** um jogador que nao e host emite o evento de inicio da partida
- **THEN** o servidor rejeita a acao, nao cria partida e responde com erro ao emissor

#### Scenario: Jogadores insuficientes
- **WHEN** o host aciona iniciar com menos de 2 jogadores conectados
- **THEN** o servidor rejeita a acao e responde com mensagem informando o minimo de jogadores

### Requirement: Exibicao sincronizada da pergunta
O sistema SHALL entregar a mesma pergunta, ao mesmo tempo, para todos os
jogadores da partida, e a resposta correta NAO SHALL ser enviada ao cliente
antes da fase de revelacao.

#### Scenario: Todos recebem a mesma pergunta
- **WHEN** uma rodada entra na fase `question`
- **THEN** todos os jogadores conectados recebem o mesmo enunciado e o mesmo numero de rodada no estado da partida

#### Scenario: Resposta correta protegida
- **WHEN** o estado da partida e enviado durante a fase `question` ou `waiting`
- **THEN** o payload nao contem o valor correto da pergunta nem os palpites dos jogadores

#### Scenario: Jogador entra no meio da rodada
- **WHEN** um jogador reconecta durante a fase `question`
- **THEN** ele recebe o estado atual da rodada e pode enviar seu palpite se ainda nao tiver confirmado

### Requirement: Envio do palpite numerico
O sistema SHALL aceitar exatamente um palpite numerico inteiro por jogador por
rodada, e SHALL bloquear qualquer alteracao apos a confirmacao.

#### Scenario: Palpite valido confirmado
- **WHEN** o jogador digita um numero valido e aciona "Confirmar Palpite"
- **THEN** o servidor registra o palpite com o instante de recebimento, bloqueia o campo do jogador e passa a exibir a tela de espera

#### Scenario: Entrada nao numerica
- **WHEN** o jogador tenta digitar letras, espacos ou caracteres especiais no campo de resposta
- **THEN** a interface descarta os caracteres invalidos e mantem apenas digitos

#### Scenario: Palpite vazio
- **WHEN** o jogador aciona "Confirmar Palpite" com o campo vazio
- **THEN** o botao permanece desabilitado e nenhum palpite e enviado ao servidor

#### Scenario: Tentativa de reenvio
- **WHEN** o jogador ja confirmou e emite um novo palpite para a mesma rodada
- **THEN** o servidor ignora o novo valor e mantem o palpite original

#### Scenario: Validacao no servidor
- **WHEN** o servidor recebe um palpite que nao e um numero inteiro finito
- **THEN** o palpite e rejeitado, nao e registrado e o emissor recebe erro

#### Scenario: Teclado numerico no celular
- **WHEN** o jogador foca o campo de resposta em um dispositivo movel
- **THEN** o teclado numerico e aberto automaticamente

### Requirement: Sigilo dos palpites e progresso da rodada
O sistema SHALL manter os palpites totalmente ocultos entre os jogadores ate a
revelacao, expondo apenas a contagem de quantos ja responderam.

#### Scenario: Tela de espera
- **WHEN** o jogador confirma seu palpite e ainda ha jogadores pendentes
- **THEN** ele visualiza "Aguardando os outros jogadores..." e o indicador "X de N jogadores responderam"

#### Scenario: Contador atualizado
- **WHEN** qualquer jogador confirma seu palpite
- **THEN** o contador de respostas e atualizado para todos os jogadores da partida

#### Scenario: Palpites nao vazam
- **WHEN** um jogador inspeciona o estado recebido durante a espera
- **THEN** nenhum palpite de outro jogador esta presente no payload

### Requirement: Revelacao automatica ao ultimo palpite
O sistema SHALL revelar a rodada automaticamente assim que nao houver mais
nenhum jogador conectado pendente, sem depender de acao do host; a revelacao
SHALL ocorrer simultaneamente para todos.

#### Scenario: Revelacao simultanea
- **WHEN** o ultimo jogador conectado confirma seu palpite
- **THEN** a partida passa para a fase `reveal` e todos os jogadores recebem, ao mesmo tempo, a resposta correta, os palpites e a pontuacao da rodada

#### Scenario: Nenhum controle de revelacao na interface
- **WHEN** ha jogadores conectados ainda pendentes
- **THEN** nenhum jogador, host ou nao, dispoe de controle para forcar a revelacao

#### Scenario: Jogador desconectado nao trava a rodada
- **WHEN** um jogador se desconecta sem ter confirmado o palpite
- **THEN** ele deixa de ser contabilizado como pendente e, se era o ultimo, a rodada revela automaticamente

### Requirement: Pontuacao por colocacao na rodada
O sistema SHALL ordenar os jogadores pela menor diferenca absoluta entre o
palpite e a resposta correta e SHALL atribuir 100 pontos ao 1o lugar, 70 ao 2o,
50 ao 3o e 20 pontos do 4o em diante.

#### Scenario: Pontuacao das tres primeiras colocacoes
- **WHEN** a rodada e revelada com quatro ou mais palpites de diferencas distintas
- **THEN** o mais proximo recebe 100 pontos, o segundo 70, o terceiro 50 e os demais 20 pontos cada

#### Scenario: Desempate por ordem de envio
- **WHEN** dois jogadores tem exatamente a mesma diferenca absoluta e instantes de envio distintos
- **THEN** o que enviou primeiro fica na posicao superior e recebe a pontuacao correspondente

#### Scenario: Empate integral
- **WHEN** dois jogadores tem a mesma diferenca e o mesmo instante de envio
- **THEN** ambos recebem a mesma posicao e a mesma pontuacao, e a posicao seguinte e ajustada pulando as posicoes ocupadas

#### Scenario: Jogador sem palpite
- **WHEN** a rodada e revelada e um jogador nao confirmou palpite
- **THEN** ele aparece no final do ranking da rodada, sem diferenca calculada e com 0 pontos

### Requirement: Tela de resultados da rodada
O sistema SHALL exibir a revelacao com contador animado, a resposta correta em
destaque central e, em seguida, o ranking da rodada com nome, palpite,
diferenca e pontos de cada jogador, ordenado do mais proximo para o mais
distante.

#### Scenario: Resposta correta em destaque
- **WHEN** a fase `reveal` inicia
- **THEN** um contador animado e exibido e, ao final, a resposta correta aparece em tamanho grande no centro da tela com sua unidade

#### Scenario: Ranking da rodada
- **WHEN** a revelacao conclui a animacao
- **THEN** o ranking da rodada e exibido com nome, palpite enviado, diferenca para a resposta correta e pontos recebidos por jogador, do mais proximo ao mais distante

#### Scenario: Podio dos tres primeiros
- **WHEN** o ranking da rodada e exibido com pelo menos tres jogadores pontuados
- **THEN** os tres primeiros colocados sao destacados em podio com animacao de entrada

### Requirement: Ranking geral acumulado
O sistema SHALL manter um ranking geral acumulado durante toda a partida,
visivel em todas as fases e atualizado ao final de cada rodada.

#### Scenario: Ranking sempre visivel
- **WHEN** a partida esta em qualquer fase
- **THEN** o estado enviado aos jogadores inclui a pontuacao total acumulada de cada jogador

#### Scenario: Atualizacao apos a rodada
- **WHEN** a pontuacao de uma rodada e apurada
- **THEN** os pontos sao somados ao total de cada jogador e o ranking geral e reordenado para todos

### Requirement: Avanco e encerramento da partida
O sistema SHALL permitir apenas ao host avancar para a proxima pergunta ou
encerrar a partida, sem limite de rodadas.

#### Scenario: Proxima pergunta
- **WHEN** o host aciona "Proxima Pergunta" na fase de ranking
- **THEN** uma nova pergunta inedita e sorteada e todos os jogadores entram simultaneamente na nova rodada com o campo de resposta liberado

#### Scenario: Jogador comum tenta avancar
- **WHEN** um jogador que nao e host emite o evento de proxima pergunta
- **THEN** o servidor rejeita a acao e o estado da partida nao muda

#### Scenario: Host encerra a partida
- **WHEN** o host aciona encerrar a partida
- **THEN** a partida e finalizada, o ranking geral final e exibido e todos os jogadores sao levados de volta ao lobby da sala

#### Scenario: Banco de perguntas esgotado no ciclo
- **WHEN** o host aciona "Proxima Pergunta" e nao ha nenhuma pergunta disponivel
- **THEN** a partida e encerrada automaticamente com o ranking geral final

### Requirement: Tratamento de erros e reconexao
O sistema SHALL tratar falhas de acao e reconexao sem corromper o estado da
partida.

#### Scenario: Acao em partida inexistente
- **WHEN** um evento do jogo chega para uma sala sem partida ativa de `palpite-certo`
- **THEN** o servidor ignora o evento e responde erro ao emissor, registrando log com a sala e a acao

#### Scenario: Reconexao restaura o estado
- **WHEN** um jogador reconecta a sala durante uma partida em andamento
- **THEN** ele recebe o estado atual da fase, seu proprio palpite (se ja confirmado) e o ranking geral acumulado
