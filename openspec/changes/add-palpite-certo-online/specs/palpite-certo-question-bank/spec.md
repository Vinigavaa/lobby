## ADDED Requirements

### Requirement: Banco de perguntas numericas
O sistema SHALL persistir um banco de perguntas cuja resposta e um unico valor
numerico, contendo enunciado, resposta correta, unidade opcional, emoji opcional
e sinalizador de ativa/inativa.

#### Scenario: Pergunta valida no banco
- **WHEN** uma pergunta e cadastrada no banco
- **THEN** ela possui enunciado, valor correto numerico e pode possuir unidade e emoji para exibicao na revelacao

#### Scenario: Pergunta inativa
- **WHEN** uma pergunta esta marcada como inativa
- **THEN** ela nunca e sorteada para nenhuma partida

#### Scenario: Carga inicial
- **WHEN** o seed do banco e executado
- **THEN** o catalogo de perguntas numericas e populado de forma idempotente, sem duplicar enunciados ja existentes

### Requirement: Sorteio aleatorio sem repeticao
O sistema SHALL sortear perguntas aleatoriamente e NAO SHALL repetir uma
pergunta ja usada na partida enquanto existir pergunta inedita disponivel.

#### Scenario: Perguntas ineditas
- **WHEN** uma nova rodada e iniciada e ainda existem perguntas ativas nao usadas na partida
- **THEN** o sorteio escolhe aleatoriamente entre as perguntas ineditas, excluindo todas as ja utilizadas

#### Scenario: Ciclo reiniciado apos esgotamento
- **WHEN** todas as perguntas ativas ja foram utilizadas na partida
- **THEN** o historico de usadas e reiniciado e o banco volta a ser sorteado do zero, garantindo continuidade da partida

#### Scenario: Banco vazio
- **WHEN** nao existe nenhuma pergunta ativa no banco
- **THEN** o sorteio retorna vazio, a partida nao inicia ou nao avanca, e o erro e registrado em log com contexto suficiente para diagnostico
