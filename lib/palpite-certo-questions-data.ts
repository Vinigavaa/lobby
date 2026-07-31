/**
 * Banco de perguntas do Palpite Certo, separado da logica do jogo.
 *
 * Toda pergunta tem como resposta um unico numero. `unit` e `emoji` existem
 * para a tela de revelacao montar "🍦 Resposta correta / 17 litros" sem
 * hardcode na interface. Para adicionar perguntas, basta editar esta lista;
 * o seed faz a carga de forma idempotente pelo enunciado.
 *
 * Valores aproximados por natureza (populacao, recordes, medias) usam a
 * estimativa mais divulgada. Como o jogo premia proximidade e nao exatidao,
 * pequenas defasagens nao prejudicam a partida.
 */
export type PalpiteCertoQuestionData = {
  question: string;
  correctValue: number;
  unit: string | null;
  emoji: string | null;
};

export const palpiteCertoQuestionsData: PalpiteCertoQuestionData[] = [
  // Corpo humano
  {
    question: "Quantos ossos possui um bebê ao nascer?",
    correctValue: 300,
    unit: "ossos",
    emoji: "👶",
  },
  {
    question: "Quantos ossos possui o corpo de um adulto?",
    correctValue: 206,
    unit: "ossos",
    emoji: "🦴",
  },
  {
    question: "Quantos dentes tem um adulto com a dentição completa?",
    correctValue: 32,
    unit: "dentes",
    emoji: "🦷",
  },
  {
    question: "Quantas vezes o coração humano bate por minuto, em média, em repouso?",
    correctValue: 72,
    unit: "batimentos por minuto",
    emoji: "❤️",
  },
  {
    question: "Quantos litros de sangue circulam no corpo de um adulto?",
    correctValue: 5,
    unit: "litros",
    emoji: "🩸",
  },
  {
    question: "Quantos músculos existem no corpo humano?",
    correctValue: 639,
    unit: "músculos",
    emoji: "💪",
  },
  {
    question: "Quantos fios de cabelo tem uma cabeça humana, em média?",
    correctValue: 100000,
    unit: "fios",
    emoji: "💇",
  },
  {
    question: "Quantos quilômetros de vasos sanguíneos existem no corpo humano?",
    correctValue: 100000,
    unit: "quilômetros",
    emoji: "🫀",
  },
  {
    question: "Quantas vezes uma pessoa pisca por minuto, em média?",
    correctValue: 17,
    unit: "vezes por minuto",
    emoji: "👁️",
  },
  {
    question: "Quantos dias dura, em média, uma gestação humana?",
    correctValue: 280,
    unit: "dias",
    emoji: "🤰",
  },
  {
    question: "Qual é a temperatura média do corpo humano em graus Celsius?",
    correctValue: 36.5,
    unit: "graus Celsius",
    emoji: "🌡️",
  },
  {
    question: "Quantos litros de saliva uma pessoa produz por dia, em média?",
    correctValue: 1.5,
    unit: "litros",
    emoji: "💧",
  },

  // Geografia e mundo
  {
    question: "Quantos quilômetros tem a Muralha da China?",
    correctValue: 21196,
    unit: "quilômetros",
    emoji: "🧱",
  },
  {
    question: "Quantos habitantes possui o Japão?",
    correctValue: 123000000,
    unit: "habitantes",
    emoji: "🇯🇵",
  },
  {
    question: "Quantos habitantes possui o Brasil?",
    correctValue: 213000000,
    unit: "habitantes",
    emoji: "🇧🇷",
  },
  {
    question: "Quantos países existem no mundo reconhecidos pela ONU?",
    correctValue: 193,
    unit: "países",
    emoji: "🌍",
  },
  {
    question: "Quantos metros de altura tem o Monte Everest?",
    correctValue: 8849,
    unit: "metros",
    emoji: "🏔️",
  },
  {
    question: "Quantos quilômetros tem o Rio Amazonas?",
    correctValue: 6992,
    unit: "quilômetros",
    emoji: "🌊",
  },
  {
    question: "Quantos estados tem o Brasil, sem contar o Distrito Federal?",
    correctValue: 26,
    unit: "estados",
    emoji: "🗺️",
  },
  {
    question: "Quantos metros de altura tem o Cristo Redentor, sem o pedestal?",
    correctValue: 30,
    unit: "metros",
    emoji: "🙌",
  },
  {
    question: "Quantos metros de altura tem a Torre Eiffel?",
    correctValue: 330,
    unit: "metros",
    emoji: "🗼",
  },
  {
    question: "Quantos metros de altura tem o Burj Khalifa, o prédio mais alto do mundo?",
    correctValue: 828,
    unit: "metros",
    emoji: "🏙️",
  },
  {
    question: "Quantos quilômetros de extensão tem o litoral brasileiro?",
    correctValue: 7491,
    unit: "quilômetros",
    emoji: "🏖️",
  },
  {
    question: "Quantos fusos horários existem no mundo?",
    correctValue: 24,
    unit: "fusos",
    emoji: "🕐",
  },
  {
    question: "Quantos metros de queda tem a maior cachoeira do mundo, o Salto Ángel?",
    correctValue: 979,
    unit: "metros",
    emoji: "💦",
  },
  {
    question: "Quantos habitantes tem a cidade de São Paulo?",
    correctValue: 11450000,
    unit: "habitantes",
    emoji: "🌆",
  },
  {
    question: "Quantos municípios existem no Brasil?",
    correctValue: 5570,
    unit: "municípios",
    emoji: "📍",
  },
  {
    question: "Quantos quilômetros quadrados tem o território brasileiro?",
    correctValue: 8510000,
    unit: "km²",
    emoji: "🇧🇷",
  },
  {
    question: "Quantos degraus tem a escadaria Selarón, no Rio de Janeiro?",
    correctValue: 215,
    unit: "degraus",
    emoji: "🪜",
  },

  // Espaço e ciência
  {
    question: "Quantos quilômetros a luz percorre em um segundo?",
    correctValue: 299792,
    unit: "quilômetros",
    emoji: "💡",
  },
  {
    question: "Quantos milhões de quilômetros separam a Terra do Sol?",
    correctValue: 150,
    unit: "milhões de quilômetros",
    emoji: "☀️",
  },
  {
    question: "Quantos minutos a luz do Sol leva para chegar à Terra?",
    correctValue: 8,
    unit: "minutos",
    emoji: "🌞",
  },
  {
    question: "Quantas luas tem o planeta Júpiter?",
    correctValue: 95,
    unit: "luas",
    emoji: "🪐",
  },
  {
    question: "Quantos dias a Lua leva para dar uma volta completa ao redor da Terra?",
    correctValue: 27,
    unit: "dias",
    emoji: "🌙",
  },
  {
    question: "Quantos graus Celsius tem a temperatura na superfície do Sol?",
    correctValue: 5500,
    unit: "graus Celsius",
    emoji: "🔥",
  },
  {
    question: "Quantos elementos químicos existem na tabela periódica?",
    correctValue: 118,
    unit: "elementos",
    emoji: "🧪",
  },
  {
    question: "Em quantos dias a Terra completa uma volta ao redor do Sol?",
    correctValue: 365,
    unit: "dias",
    emoji: "🌍",
  },
  {
    question: "Quantos quilômetros por hora a Terra gira no equador?",
    correctValue: 1670,
    unit: "km/h",
    emoji: "🌐",
  },
  {
    question: "Quantos anos tem o planeta Terra, em bilhões?",
    correctValue: 4.5,
    unit: "bilhões de anos",
    emoji: "🪨",
  },
  {
    question: "Quantos quilômetros de altitude tem a Estação Espacial Internacional?",
    correctValue: 400,
    unit: "quilômetros",
    emoji: "🛰️",
  },
  {
    question: "Quantas pessoas já pisaram na Lua?",
    correctValue: 12,
    unit: "pessoas",
    emoji: "👨‍🚀",
  },
  {
    question: "Quantos por cento da superfície da Terra é coberta por água?",
    correctValue: 71,
    unit: "por cento",
    emoji: "🌊",
  },
  {
    question: "Quantos metros de profundidade tem a Fossa das Marianas?",
    correctValue: 10994,
    unit: "metros",
    emoji: "🌑",
  },
  {
    question: "Quantos graus Celsius abaixo de zero é o zero absoluto?",
    correctValue: 273,
    unit: "graus Celsius negativos",
    emoji: "🧊",
  },

  // Animais
  {
    question: "Quantos corações tem um polvo?",
    correctValue: 3,
    unit: "corações",
    emoji: "🐙",
  },
  {
    question: "Quantos anos vive uma tartaruga-gigante, em média?",
    correctValue: 100,
    unit: "anos",
    emoji: "🐢",
  },
  {
    question: "Quantos quilômetros por hora corre um guepardo em velocidade máxima?",
    correctValue: 110,
    unit: "km/h",
    emoji: "🐆",
  },
  {
    question: "Quantos ovos uma galinha bota por ano, em média?",
    correctValue: 300,
    unit: "ovos",
    emoji: "🥚",
  },
  {
    question: "Quantas patas tem uma aranha?",
    correctValue: 8,
    unit: "patas",
    emoji: "🕷️",
  },
  {
    question: "Quantos quilos pesa a língua de uma baleia-azul?",
    correctValue: 2700,
    unit: "quilos",
    emoji: "🐋",
  },
  {
    question: "Quantas vezes por segundo um beija-flor bate as asas?",
    correctValue: 70,
    unit: "vezes por segundo",
    emoji: "🐦",
  },
  {
    question: "Quantos dentes tem um tubarão-branco na boca ao mesmo tempo?",
    correctValue: 300,
    unit: "dentes",
    emoji: "🦈",
  },
  {
    question: "Quantos meses dura a gestação de uma elefanta?",
    correctValue: 22,
    unit: "meses",
    emoji: "🐘",
  },
  {
    question: "Quantas horas por dia um coala dorme?",
    correctValue: 20,
    unit: "horas",
    emoji: "🐨",
  },
  {
    question: "Quantos quilos pode pesar um urso-polar macho adulto?",
    correctValue: 600,
    unit: "quilos",
    emoji: "🐻‍❄️",
  },
  {
    question: "Quantas espécies de aves existem no Brasil?",
    correctValue: 1971,
    unit: "espécies",
    emoji: "🦜",
  },

  // Comida e bebida
  {
    question: "Quantos litros de sorvete são consumidos por pessoa, em média, por ano no Brasil?",
    correctValue: 6,
    unit: "litros",
    emoji: "🍦",
  },
  {
    question: "Quantas xícaras de café um brasileiro toma por dia, em média?",
    correctValue: 3,
    unit: "xícaras",
    emoji: "☕",
  },
  {
    question: "Quantas calorias tem uma banana média?",
    correctValue: 105,
    unit: "calorias",
    emoji: "🍌",
  },
  {
    question: "Quantos grãos de café são necessários para uma xícara de espresso?",
    correctValue: 50,
    unit: "grãos",
    emoji: "☕",
  },
  {
    question: "Quantos litros de água são necessários para produzir um quilo de carne bovina?",
    correctValue: 15000,
    unit: "litros",
    emoji: "🥩",
  },
  {
    question: "Quantas variedades de queijo existem na França?",
    correctValue: 1200,
    unit: "variedades",
    emoji: "🧀",
  },
  {
    question: "Quantos quilos de açúcar um brasileiro consome por ano, em média?",
    correctValue: 50,
    unit: "quilos",
    emoji: "🍬",
  },
  {
    question: "Quantas pizzas são vendidas por dia na cidade de São Paulo?",
    correctValue: 1000000,
    unit: "pizzas",
    emoji: "🍕",
  },
  {
    question: "Quantos anos leva para uma garrafa de vinho tinto atingir o auge, em média?",
    correctValue: 10,
    unit: "anos",
    emoji: "🍷",
  },
  {
    question: "Quantas sementes tem um morango, em média, na parte de fora?",
    correctValue: 200,
    unit: "sementes",
    emoji: "🍓",
  },

  // Esportes
  {
    question: "Quantos jogadores entram em campo em uma partida de futebol, somando os dois times?",
    correctValue: 22,
    unit: "jogadores",
    emoji: "⚽",
  },
  {
    question: "Quantas Copas do Mundo o Brasil venceu?",
    correctValue: 5,
    unit: "títulos",
    emoji: "🏆",
  },
  {
    question: "Quantos gols Pelé marcou na carreira, segundo a contagem oficial do Santos?",
    correctValue: 1283,
    unit: "gols",
    emoji: "👑",
  },
  {
    question: "Quantos metros tem uma piscina olímpica de comprimento?",
    correctValue: 50,
    unit: "metros",
    emoji: "🏊",
  },
  {
    question: "Quantos quilômetros tem uma maratona oficial?",
    correctValue: 42,
    unit: "quilômetros",
    emoji: "🏃",
  },
  {
    question: "Quantas medalhas olímpicas de ouro Michael Phelps conquistou?",
    correctValue: 23,
    unit: "medalhas de ouro",
    emoji: "🥇",
  },
  {
    question: "Quantos centímetros de altura tem a cesta em uma quadra oficial de basquete?",
    correctValue: 305,
    unit: "centímetros",
    emoji: "🏀",
  },
  {
    question: "Quantas voltas tem o Grande Prêmio do Brasil de Fórmula 1 em Interlagos?",
    correctValue: 71,
    unit: "voltas",
    emoji: "🏎️",
  },
  {
    question: "Quantos anos tinha Pelé quando venceu sua primeira Copa do Mundo?",
    correctValue: 17,
    unit: "anos",
    emoji: "🌟",
  },
  {
    question: "Quantos buracos tem um campo de golfe oficial?",
    correctValue: 18,
    unit: "buracos",
    emoji: "⛳",
  },

  // Cultura e entretenimento
  {
    question: "Quantos episódios tem a série Friends no total?",
    correctValue: 236,
    unit: "episódios",
    emoji: "📺",
  },
  {
    question: "Quantas teclas tem um piano completo?",
    correctValue: 88,
    unit: "teclas",
    emoji: "🎹",
  },
  {
    question: "Quantos minutos dura o filme Titanic?",
    correctValue: 194,
    unit: "minutos",
    emoji: "🚢",
  },
  {
    question: "Quantas cordas tem um violão comum?",
    correctValue: 6,
    unit: "cordas",
    emoji: "🎸",
  },
  {
    question: "Quantos Oscars o filme Titanic ganhou?",
    correctValue: 11,
    unit: "estatuetas",
    emoji: "🏅",
  },
  {
    question: "Quantos livros tem a série Harry Potter?",
    correctValue: 7,
    unit: "livros",
    emoji: "⚡",
  },
  {
    question: "Quantas peças tem um tabuleiro de xadrez no início da partida?",
    correctValue: 32,
    unit: "peças",
    emoji: "♟️",
  },
  {
    question: "Quantos países participam do Festival Eurovision, em média, por edição?",
    correctValue: 40,
    unit: "países",
    emoji: "🎤",
  },
  {
    question: "Quantas cartas tem um baralho completo, incluindo os coringas?",
    correctValue: 54,
    unit: "cartas",
    emoji: "🃏",
  },
  {
    question: "Em que ano começou a construção da Sagrada Família, em Barcelona?",
    correctValue: 1882,
    unit: null,
    emoji: "⛪",
  },

  // Tecnologia
  {
    question: "Quantos usuários ativos por mês o WhatsApp tem, em bilhões?",
    correctValue: 2.8,
    unit: "bilhões de usuários",
    emoji: "💬",
  },
  {
    question: "Em que ano foi lançado o primeiro iPhone?",
    correctValue: 2007,
    unit: null,
    emoji: "📱",
  },
  {
    question: "Quantos e-mails são enviados no mundo por dia, em bilhões?",
    correctValue: 350,
    unit: "bilhões de e-mails",
    emoji: "📧",
  },
  {
    question: "Quantas horas de vídeo são enviadas ao YouTube por minuto?",
    correctValue: 500,
    unit: "horas",
    emoji: "▶️",
  },
  {
    question: "Quantos bytes tem um megabyte?",
    correctValue: 1048576,
    unit: "bytes",
    emoji: "💾",
  },
  {
    question: "Em que ano a internet comercial chegou ao Brasil?",
    correctValue: 1995,
    unit: null,
    emoji: "🌐",
  },
  {
    question: "Quantas buscas o Google processa por segundo, em milhares?",
    correctValue: 99,
    unit: "milhares de buscas",
    emoji: "🔍",
  },
  {
    question: "Quantos satélites artificiais estão em órbita da Terra?",
    correctValue: 10000,
    unit: "satélites",
    emoji: "🛰️",
  },

  // Curiosidades e cotidiano
  {
    question: "Quantos litros de água uma pessoa gasta em um banho de 10 minutos?",
    correctValue: 100,
    unit: "litros",
    emoji: "🚿",
  },
  {
    question: "Quantos passos uma pessoa dá por dia, em média?",
    correctValue: 5000,
    unit: "passos",
    emoji: "🚶",
  },
  {
    question: "Quantos anos uma pessoa passa dormindo, em média, ao longo da vida?",
    correctValue: 26,
    unit: "anos",
    emoji: "😴",
  },
  {
    question: "Quantos idiomas são falados no mundo?",
    correctValue: 7000,
    unit: "idiomas",
    emoji: "🗣️",
  },
  {
    question: "Quantas pessoas nascem no mundo por minuto?",
    correctValue: 250,
    unit: "nascimentos",
    emoji: "🍼",
  },
  {
    question: "Quantos dias uma pessoa passa esperando em filas ao longo da vida?",
    correctValue: 200,
    unit: "dias",
    emoji: "⏳",
  },
  {
    question: "Quantos quilos de lixo um brasileiro produz por dia, em média?",
    correctValue: 1,
    unit: "quilo",
    emoji: "🗑️",
  },
  {
    question: "Quantos anos leva para uma garrafa PET se decompor na natureza?",
    correctValue: 400,
    unit: "anos",
    emoji: "♻️",
  },
  {
    question: "Quantas vezes uma folha de papel pode ser dobrada ao meio, na prática?",
    correctValue: 7,
    unit: "vezes",
    emoji: "📄",
  },
  {
    question: "Quantos segundos tem um dia?",
    correctValue: 86400,
    unit: "segundos",
    emoji: "⏱️",
  },
  {
    question: "Quantas notas musicais diferentes existem na escala cromática?",
    correctValue: 12,
    unit: "notas",
    emoji: "🎵",
  },
  {
    question: "Quantos quilômetros uma pessoa caminha, em média, ao longo da vida?",
    correctValue: 120000,
    unit: "quilômetros",
    emoji: "👟",
  },
];
