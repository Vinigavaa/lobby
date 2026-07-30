import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import type { Prisma } from "../generated/prisma/client";
import { PrismaClient } from "../generated/prisma/client";
import { mimicaWordsData } from "../lib/mimica-words-data";
import { triviaQuestionsData } from "../lib/trivia-questions-data";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

const games = [
  {
    type: "impostor",
    name: "Impostor",
    description: "Descubra quem esta blefando antes que o impostor vença.",
    isActive: true,
  },
  {
    type: "quem-sou-eu",
    name: "Quem Sou Eu?",
    description: "Adivinhe o personagem, objeto ou pessoa usando pistas dos outros jogadores.",
    isActive: true,
  },
  {
    type: "quem-sou-eu-personalizado",
    name: "Quem Sou Eu? Personalizado",
    description: "Cada jogador escreve o personagem secreto do proximo jogador da roda.",
    isActive: true,
  },
  {
    type: "mimica",
    name: "Mimica",
    description: "Represente palavras ou desafios sem falar para o grupo adivinhar.",
    isActive: true,
  },
  {
    type: "stop",
    name: "Stop",
    description: "Complete categorias com palavras que começam com a letra sorteada.",
    isActive: true,
  },
  {
    type: "trivia",
    name: "Trivia",
    description: "Responda perguntas e dispute pontos com os outros jogadores.",
    isActive: true,
  },
  {
    type: "cidade-dorme",
    name: "Cidade Dorme",
    description: "Jogue por papeis secretos e descubra quem ameaça a cidade.",
    isActive: false,
  },
] satisfies Prisma.GameCreateInput[];

const impostorWords = {
  Comida: [
    "pizza",
    "hambúrguer",
    "sushi",
    "lasanha",
    "churrasco",
    "brigadeiro",
    "tapioca",
    "pastel",
    "feijoada",
    "coxinha",
    "pão de queijo",
    "risoto",
    "sorvete",
    "salada",
    "hot dog",
    "panqueca",
    "acarajé",
    "yakisoba",
    "tacos",
    "pudim",
  ],
  Filmes: [
    "Titanic",
    "Avatar",
    "Shrek",
    "Matrix",
    "Toy Story",
    "Jurassic Park",
    "O Rei Leão",
    "Homem-Aranha",
    "Vingadores",
    "Frozen",
    "Star Wars",
    "Harry Potter",
    "De Volta para o Futuro",
    "Pantera Negra",
    "Barbie",
    "Interestelar",
    "Coringa",
    "Procurando Nemo",
    "A Origem",
    "O Auto da Compadecida",
  ],
  Países: [
    "Brasil",
    "Japão",
    "Itália",
    "França",
    "Argentina",
    "Canadá",
    "México",
    "Portugal",
    "Alemanha",
    "Espanha",
    "China",
    "Índia",
    "Austrália",
    "Egito",
    "Grécia",
    "Coreia do Sul",
    "Chile",
    "Peru",
    "Estados Unidos",
    "África do Sul",
  ],
  Objetos: [
    "cadeira",
    "celular",
    "mochila",
    "caneta",
    "garrafa",
    "óculos",
    "relógio",
    "chave",
    "mesa",
    "computador",
    "teclado",
    "controle remoto",
    "travesseiro",
    "guarda-chuva",
    "bicicleta",
    "carteira",
    "fone de ouvido",
    "livro",
    "espelho",
    "lanterna",
  ],
  Animais: [
    "cachorro",
    "gato",
    "leão",
    "elefante",
    "girafa",
    "macaco",
    "tubarão",
    "golfinho",
    "pinguim",
    "cavalo",
    "coelho",
    "jacaré",
    "coruja",
    "papagaio",
    "urso",
    "tigre",
    "zebra",
    "ovelha",
    "raposa",
    "formiga",
  ],
  Memes: [
    "calabreso",
    "caneta azul",
    "bora bill",
    "luva de pedreiro",
    "Nazaré confusa",
    "é verdade esse bilete",
    "cringe",
    "sextou",
    "ata",
    "taca-le pau",
    "faustão errou",
    "morreu mas passa bem",
    "receba",
    "meteu essa",
    "o pai tá on",
    "melhor do mundo",
    "chama no probleminha",
    "ai dento",
    "fino señores",
    "agora pronto",
  ],
  Aleatório: [
    "praia",
    "escola",
    "futebol",
    "carnaval",
    "viagem",
    "shopping",
    "música",
    "internet",
    "aniversário",
    "chuva",
    "academia",
    "cinema",
    "montanha",
    "parque",
    "hospital",
    "fazenda",
    "ônibus",
    "aeroporto",
    "piscina",
    "videogame",
  ],
} satisfies Record<string, string[]>;

const guessWhoCards = {
  Famosos: [
    "Neymar",
    "Taylor Swift",
    "Anitta",
    "Silvio Santos",
    "Beyonce",
    "Cristiano Ronaldo",
    "Messi",
    "Madonna",
    "Elon Musk",
    "Ayrton Senna",
    "Xuxa",
    "Ivete Sangalo",
    "Rihanna",
    "Michael Jackson",
    "Lady Gaga",
    "Pelé",
    "Gisele Bündchen",
    "Faustão",
    "Ludmilla",
    "The Rock",
  ],
  Personagens: [
    "Batman",
    "Shrek",
    "Harry Potter",
    "Homem-Aranha",
    "Mulher-Maravilha",
    "Darth Vader",
    "Hulk",
    "Elsa",
    "Mickey Mouse",
    "Bob Esponja",
    "Naruto",
    "Goku",
    "Mario",
    "Sonic",
    "Wandinha",
    "Hermione",
    "Capitão América",
    "Barbie",
    "Minion",
    "Coringa",
  ],
  Animais: [
    "Cachorro",
    "Gato",
    "Leão",
    "Elefante",
    "Girafa",
    "Macaco",
    "Tubarão",
    "Golfinho",
    "Pinguim",
    "Cavalo",
    "Coelho",
    "Jacaré",
    "Coruja",
    "Papagaio",
    "Urso",
    "Tigre",
    "Zebra",
    "Ovelha",
    "Raposa",
    "Formiga",
  ],
  Objetos: [
    "Celular",
    "Cadeira",
    "Mochila",
    "Caneta",
    "Garrafa",
    "Óculos",
    "Relógio",
    "Chave",
    "Mesa",
    "Computador",
    "Teclado",
    "Controle remoto",
    "Travesseiro",
    "Guarda-chuva",
    "Bicicleta",
    "Carteira",
    "Fone de ouvido",
    "Livro",
    "Espelho",
    "Lanterna",
  ],
  Profissões: [
    "Médico",
    "Professor",
    "Bombeiro",
    "Policial",
    "Cozinheiro",
    "Engenheiro",
    "Dentista",
    "Advogado",
    "Motorista",
    "Cantor",
    "Ator",
    "Jornalista",
    "Programador",
    "Arquiteto",
    "Enfermeiro",
    "Piloto",
    "Veterinário",
    "Fotógrafo",
    "Padeiro",
    "Mecânico",
  ],
  Filmes: [
    "Titanic",
    "Avatar",
    "Shrek",
    "Matrix",
    "Toy Story",
    "Jurassic Park",
    "O Rei Leão",
    "Homem-Aranha",
    "Vingadores",
    "Frozen",
    "Star Wars",
    "Harry Potter",
    "De Volta para o Futuro",
    "Pantera Negra",
    "Barbie",
    "Interestelar",
    "Coringa",
    "Procurando Nemo",
    "A Origem",
    "O Auto da Compadecida",
  ],
  Aleatório: [
    "Praia",
    "Escola",
    "Futebol",
    "Carnaval",
    "Viagem",
    "Shopping",
    "Música",
    "Internet",
    "Aniversário",
    "Chuva",
    "Academia",
    "Cinema",
    "Montanha",
    "Parque",
    "Hospital",
    "Fazenda",
    "Ônibus",
    "Aeroporto",
    "Piscina",
    "Videogame",
  ],
} satisfies Record<string, string[]>;

function difficultyForIndex(index: number) {
  if (index < 8) {
    return "easy";
  }

  if (index < 15) {
    return "medium";
  }

  return "hard";
}

async function main() {
  for (const game of games) {
    await prisma.game.upsert({
      where: { type: game.type },
      create: game,
      update: {
        name: game.name,
        description: game.description,
        isActive: game.isActive,
      },
    });
  }

  for (const [category, words] of Object.entries(impostorWords)) {
    for (const value of words) {
      await prisma.impostorWord.upsert({
        where: {
          category_value: {
            category,
            value,
          },
        },
        create: {
          category,
          value,
          isActive: true,
        },
        update: {
          isActive: true,
        },
      });
    }
  }

  for (const [category, cards] of Object.entries(guessWhoCards)) {
    for (const [index, value] of cards.entries()) {
      await prisma.guessWhoCard.upsert({
        where: {
          category_value: {
            category,
            value,
          },
        },
        create: {
          category,
          value,
          difficulty: difficultyForIndex(index),
          isActive: true,
        },
        update: {
          difficulty: difficultyForIndex(index),
          isActive: true,
        },
      });
    }
  }

  for (const [category, words] of Object.entries(mimicaWordsData)) {
    for (const value of words) {
      await prisma.mimicaWord.upsert({
        where: {
          category_value: {
            category,
            value,
          },
        },
        create: {
          category,
          value,
          isActive: true,
        },
        update: {
          isActive: true,
        },
      });
    }
  }

  for (const [theme, questions] of Object.entries(triviaQuestionsData)) {
    for (const item of questions) {
      const existing = await prisma.triviaQuestion.findFirst({
        where: { theme, question: item.question },
        select: { id: true },
      });

      if (existing) {
        await prisma.triviaQuestion.update({
          where: { id: existing.id },
          data: {
            options: item.options,
            correctIndex: item.correctIndex,
            difficulty: item.difficulty,
            isActive: true,
          },
        });
        continue;
      }

      await prisma.triviaQuestion.create({
        data: {
          theme,
          question: item.question,
          options: item.options,
          correctIndex: item.correctIndex,
          difficulty: item.difficulty,
          isActive: true,
        },
      });
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
