## ADDED Requirements

### Requirement: Pergunta distinta por jogador na rodada

O Trivia local SHALL sortear uma pergunta diferente para cada jogador da rodada, todas do tema sorteado pela roleta naquela rodada.

#### Scenario: Cada jogador recebe sua própria pergunta

- **WHEN** a roleta revela o tema da rodada com N jogadores na partida
- **THEN** o sistema sorteia N perguntas distintas daquele tema
- **AND** associa uma pergunta a cada jogador
- **AND** o jogador da vez vê somente a pergunta associada a ele

#### Scenario: Nenhuma pergunta se repete na partida

- **WHEN** uma pergunta é atribuída a um jogador em qualquer rodada
- **THEN** o sistema marca essa pergunta como usada
- **AND** nenhuma rodada seguinte atribui a mesma pergunta a nenhum jogador

#### Scenario: Tema com perguntas insuficientes

- **WHEN** o tema sorteado não tem perguntas não usadas suficientes para todos os jogadores
- **THEN** o sistema completa o sorteio reaproveitando perguntas já usadas daquele tema
- **AND** garante que as perguntas da rodada atual continuam distintas entre si

### Requirement: Ausência de cronômetro no modo local

O Trivia local SHALL NOT exibir contagem de tempo nem descartar a resposta de um jogador por tempo esgotado.

#### Scenario: Tela da pergunta sem contador

- **WHEN** o jogador da vez revela sua pergunta
- **THEN** a tela mostra a pergunta e as alternativas
- **AND** não mostra nenhum contador ou barra de tempo

#### Scenario: Turno só avança pela resposta

- **WHEN** o jogador da vez permanece na tela da pergunta sem escolher alternativa
- **THEN** o sistema mantém a pergunta na tela indefinidamente
- **AND** o turno só passa ao próximo jogador quando uma alternativa é escolhida

### Requirement: Pontuação fixa por acerto no modo local

O Trivia local SHALL atribuir uma quantidade fixa de pontos por acerto, independente do tempo levado para responder.

#### Scenario: Acerto vale pontuação cheia

- **WHEN** o jogador escolhe a alternativa correta
- **THEN** o sistema soma a pontuação fixa de acerto ao total dele
- **AND** o valor somado é o mesmo qualquer que tenha sido o tempo de resposta

#### Scenario: Erro não pontua

- **WHEN** o jogador escolhe uma alternativa incorreta
- **THEN** o sistema soma zero ponto ao total dele
- **AND** zera a sequência de acertos do jogador

#### Scenario: Resumo final sem estatística de velocidade

- **WHEN** a partida local termina e o resumo final é exibido
- **THEN** o resumo não apresenta estatística de resposta mais rápida
- **AND** apresenta acertos, aproveitamento, sequência, melhor rodada e melhor tema

### Requirement: Resumo da rodada após o último jogador

O Trivia local SHALL revelar as respostas corretas somente depois que todos os jogadores da rodada responderam, em uma tela única que detalha o resultado de cada jogador.

#### Scenario: Nada é revelado durante os turnos

- **WHEN** um jogador escolhe sua alternativa e ainda há jogadores por jogar
- **THEN** o sistema avança direto para a passagem do celular ao próximo jogador
- **AND** não indica se a resposta foi certa ou errada

#### Scenario: Resumo detalhado por jogador

- **WHEN** o último jogador da rodada responde
- **THEN** o sistema exibe o resumo da rodada
- **AND** para cada jogador mostra o nome, a pergunta recebida, a alternativa escolhida, a alternativa correta e os pontos ganhos

#### Scenario: Resumo indica acerto e erro

- **WHEN** o resumo da rodada é exibido
- **THEN** a alternativa correta de cada jogador aparece destacada
- **AND** a alternativa escolhida aparece marcada como certa ou errada
- **AND** o total de acertos da rodada é apresentado

### Requirement: Passagem do celular entre turnos

O Trivia local SHALL exigir uma confirmação explícita antes de revelar a pergunta de cada jogador, para que ninguém veja a pergunta de outro.

#### Scenario: Confirmação antes de revelar

- **WHEN** chega a vez de um jogador
- **THEN** o sistema pede que o celular seja passado para ele
- **AND** só mostra a pergunta após o jogador confirmar que está pronto
