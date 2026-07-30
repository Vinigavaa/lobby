/**
 * Configuracao estatica do Trivia: os seis temas fixos da roleta e os tempos
 * (em ms) de cada fase da rodada. Centralizados aqui para serem reutilizados
 * pelo servidor (sorteio/temporizadores) e pela interface (roleta, cronometro).
 */
export const triviaThemes = [
  { id: "artes-entretenimento", emoji: "🎨", label: "Artes e Entretenimento" },
  { id: "mundo", emoji: "🌍", label: "Mundo" },
  { id: "ciencia-tecnologia", emoji: "🔬", label: "Ciência e Tecnologia" },
  { id: "esportes", emoji: "🏆", label: "Esportes" },
  { id: "sociedade", emoji: "👥", label: "Sociedade" },
  { id: "variedades", emoji: "🎲", label: "Variedades" },
] as const;

export type TriviaThemeId = (typeof triviaThemes)[number]["id"];

export const triviaThemeIds: TriviaThemeId[] = triviaThemes.map(
  (theme) => theme.id
);

const themeById = new Map(triviaThemes.map((theme) => [theme.id, theme]));

export function getTriviaTheme(id: string) {
  return themeById.get(id as TriviaThemeId) ?? null;
}

export const triviaTotalRounds = 12;
export const triviaMinimumPlayers = 2;
export const triviaQuestionSeconds = 40;

export const triviaWheelSpinMs = 3200;
export const triviaThemeRevealMs = 2000;
/** Tempo total da fase "wheel" (giro + revelacao do tema) antes da pergunta aparecer. */
export const triviaWheelPhaseMs = triviaWheelSpinMs + triviaThemeRevealMs;
export const triviaRevealAnswerMs = 4500;
export const triviaRankingMs = 4000;
