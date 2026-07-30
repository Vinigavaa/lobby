export type JoinRoomPayload = {
  roomCode: string;
  userId: string;
};

export type LeaveRoomPayload = {
  roomCode: string;
  userId: string;
};

export type KickPlayerPayload = {
  roomCode: string;
  hostUserId: string;
  targetUserId: string;
};

export type SelectGamePayload = {
  roomCode: string;
  userId: string;
  gameId: string;
};

export type StartGamePayload = {
  roomCode: string;
  userId: string;
};

export type ImpostorReadyPayload = {
  roomCode: string;
  userId: string;
};

export type ImpostorSubmitHintPayload = {
  roomCode: string;
  userId: string;
  text: string;
};

export type ImpostorVotePayload = {
  roomCode: string;
  userId: string;
  targetUserId: string;
};

export type ImpostorHostActionPayload = {
  roomCode: string;
  userId: string;
};

export type GuessWhoHostActionPayload = {
  roomCode: string;
  userId: string;
};

export type GamePayload = {
  id: string;
  type: string;
  name: string;
  description: string;
  isActive: boolean;
};

export type RoomPlayerPayload = {
  id: string;
  userId: string;
  nickname: string;
  avatar: string | null;
  isHost: boolean;
  isConnected: boolean;
  joinedAt: string;
};

export type PlayersUpdatedPayload = {
  roomCode: string;
  players: RoomPlayerPayload[];
};

export type HostUpdatedPayload = {
  roomCode: string;
  hostId: string | null;
};

export type GameUpdatedPayload = {
  roomCode: string;
  selectedGame: GamePayload | null;
  status: string;
  activeMatchId: string | null;
};

export type ImpostorStartedPayload = {
  roomCode: string;
  matchId: string;
  path: string;
};

export type ImpostorPrivateRolePayload = {
  roomCode: string;
  matchId: string;
  role: "impostor" | "player";
  category: string;
  word: string | null;
  isHost: boolean;
};

export type ImpostorReadyPlayerPayload = {
  userId: string;
  nickname: string;
  avatar: string | null;
  isReady: boolean;
  isAlive: boolean;
};

export type ImpostorHintPayload = {
  userId: string;
  nickname: string;
  text: string;
  createdAt: string;
};

export type ImpostorReadyUpdatedPayload = {
  roomCode: string;
  matchId: string;
  phase: "reveal" | "hints" | "voting" | "result";
  readyCount: number;
  totalCount: number;
  votesCount: number;
  players: ImpostorReadyPlayerPayload[];
  hints: ImpostorHintPayload[];
  currentTurnUserId: string | null;
  result: ImpostorResultPayload | null;
};

export type ImpostorPhaseChangedPayload = {
  roomCode: string;
  matchId: string;
  phase: "hints" | "voting" | "result";
};

export type ImpostorHintsUpdatedPayload = {
  roomCode: string;
  matchId: string;
  hints: ImpostorHintPayload[];
};

export type ImpostorTurnChangedPayload = {
  roomCode: string;
  matchId: string;
  currentTurnUserId: string | null;
};

export type ImpostorVotesUpdatedPayload = {
  roomCode: string;
  matchId: string;
  votesCount: number;
  totalCount: number;
};

export type ImpostorVoteRevealPayload = {
  voterUserId: string;
  voterNickname: string;
  targetUserId: string;
  targetNickname: string;
  createdAt: string;
};

export type ImpostorResultPayload = {
  roomCode: string;
  matchId: string;
  word: string;
  selectedUserId: string;
  selectedNickname: string;
  impostorUserId: string;
  impostorNickname: string;
  groupWon: boolean;
  tied: boolean;
  votes: ImpostorVoteRevealPayload[];
};

export type ImpostorBackToLobbyPayload = {
  roomCode: string;
  path: string;
};

export type GuessWhoStartedPayload = {
  roomCode: string;
  matchId: string;
  path: string;
};

export type GuessWhoCardPayload = {
  category: string;
  value: string;
  difficulty: string;
};

export type GuessWhoPlayerPayload = {
  userId: string;
  nickname: string;
  avatar: string | null;
  isCurrentUser: boolean;
  card: GuessWhoCardPayload | null;
};

export type GuessWhoStatePayload = {
  roomCode: string;
  matchId: string;
  phase: "playing" | "result";
  isHost: boolean;
  players: GuessWhoPlayerPayload[];
};

export type CustomGuessWhoSubmitCharacterPayload = {
  roomCode: string;
  userId: string;
  character: string;
};

export type CustomGuessWhoGuessPayload = {
  roomCode: string;
  userId: string;
  guess: string;
};

export type CustomGuessWhoVotePayload = {
  roomCode: string;
  userId: string;
  targetUserId: string;
  correct: boolean;
};

export type CustomGuessWhoHostActionPayload = {
  roomCode: string;
  userId: string;
};

export type CustomGuessWhoStartedPayload = {
  roomCode: string;
  matchId: string;
  path: string;
};

export type CustomGuessWhoBackToLobbyPayload = {
  roomCode: string;
  path: string;
};

export type CustomGuessWhoPendingGuessPayload = {
  guess: string;
  yesCount: number;
  noCount: number;
  totalVoters: number;
  myVote: boolean | null;
};

export type CustomGuessWhoPlayerPayload = {
  userId: string;
  nickname: string;
  avatar: string | null;
  isCurrentUser: boolean;
  character: string | null;
  hasSubmittedCharacter: boolean;
  hasSolved: boolean;
  solvedOrder: number | null;
  solvedSeconds: number | null;
  pendingGuess: CustomGuessWhoPendingGuessPayload | null;
};

export type CustomGuessWhoStatePayload = {
  roomCode: string;
  matchId: string;
  phase: "writing" | "playing" | "finished";
  isHost: boolean;
  characterMaxLength: number;
  writesForNickname: string | null;
  hasSubmittedCharacter: boolean;
  submittedCount: number;
  totalCount: number;
  players: CustomGuessWhoPlayerPayload[];
};

export type MimicaStartedPayload = {
  roomCode: string;
  matchId: string;
  path: string;
};

export type MimicaBeginPayload = {
  roomCode: string;
  userId: string;
  category: string;
  durationSeconds: number;
};

export type MimicaHostActionPayload = {
  roomCode: string;
  userId: string;
};

export type MimicaPlayerActionPayload = {
  roomCode: string;
  userId: string;
};

export type MimicaPrivateWordPayload = {
  roomCode: string;
  matchId: string;
  category: string;
  word: string;
};

export type MimicaStatePlayerPayload = {
  userId: string;
  nickname: string;
  avatar: string | null;
  score: number;
  isCurrentMimer: boolean;
};

export type MimicaLastRoundPayload = {
  word: string;
  success: boolean;
  mimerUserId: string;
  mimerNickname: string;
};

export type MimicaStatePayload = {
  roomCode: string;
  matchId: string;
  phase: "setup" | "reveal" | "playing" | "roundResult";
  category: string | null;
  durationSeconds: number;
  roundNumber: number;
  roundEndsAt: string | null;
  currentMimerUserId: string | null;
  currentMimerNickname: string | null;
  isHost: boolean;
  isCurrentMimer: boolean;
  players: MimicaStatePlayerPayload[];
  lastRound: MimicaLastRoundPayload | null;
};

export type MimicaBackToLobbyNavPayload = {
  roomCode: string;
  path: string;
};

export type StopStartedPayload = {
  roomCode: string;
  matchId: string;
  path: string;
};

export type StopBeginPayload = {
  roomCode: string;
  userId: string;
  durationSeconds: number;
  totalRounds: number;
  categories: string[];
};

export type StopSubmitPayload = {
  roomCode: string;
  userId: string;
  answers: Record<string, string>;
};

export type StopVotePayload = {
  roomCode: string;
  userId: string;
  targetUserId: string;
  category: string;
  reject: boolean;
};

export type StopHostActionPayload = {
  roomCode: string;
  userId: string;
};

export type StopCategoryPayload = {
  key: string;
  label: string;
};

export type StopPlayerPayload = {
  userId: string;
  nickname: string;
  avatar: string | null;
  totalScore: number;
  submitted: boolean;
};

export type StopAnswerStatus =
  | "unique"
  | "duplicate"
  | "invalid"
  | "blank"
  | "rejected";

export type StopReviewAnswerPayload = {
  userId: string;
  nickname: string;
  answer: string;
  points: number;
  status: StopAnswerStatus;
  rejectCount: number;
  rejectedByMe: boolean;
};

export type StopReviewCategoryPayload = {
  key: string;
  label: string;
  answers: StopReviewAnswerPayload[];
};

export type StopRankingEntryPayload = {
  position: number;
  userId: string;
  nickname: string;
  avatar: string | null;
  roundScore: number;
  totalScore: number;
};

export type StopStatePayload = {
  roomCode: string;
  matchId: string;
  phase: "setup" | "playing" | "review" | "roundResult" | "finished";
  durationSeconds: number;
  totalRounds: number;
  roundNumber: number;
  categories: StopCategoryPayload[];
  letter: string | null;
  roundEndsAt: string | null;
  isHost: boolean;
  hasSubmitted: boolean;
  players: StopPlayerPayload[];
  review: StopReviewCategoryPayload[] | null;
  ranking: StopRankingEntryPayload[] | null;
  isFinal: boolean;
};

export type StopBackToLobbyNavPayload = {
  roomCode: string;
  path: string;
};

export type TriviaStartedPayload = {
  roomCode: string;
  matchId: string;
  path: string;
};

export type TriviaSubmitAnswerPayload = {
  roomCode: string;
  userId: string;
  optionIndex: number;
};

export type TriviaHostActionPayload = {
  roomCode: string;
  userId: string;
};

export type TriviaThemePayload = {
  id: string;
  emoji: string;
  label: string;
};

export type TriviaQuestionPayload = {
  id: string;
  question: string;
  options: string[];
};

export type TriviaPlayerPayload = {
  userId: string;
  nickname: string;
  avatar: string | null;
  totalScore: number;
  hasAnswered: boolean;
};

export type TriviaRevealPayload = {
  correctIndex: number;
  correctCount: number;
  pointsByUserId: Record<string, number>;
};

export type TriviaRankingEntryPayload = {
  position: number;
  previousPosition: number | null;
  userId: string;
  nickname: string;
  avatar: string | null;
  totalScore: number;
  correctCount: number;
};

export type TriviaFinalStatsPayload = {
  userId: string;
  nickname: string;
  avatar: string | null;
  totalScore: number;
  correctCount: number;
  accuracyPercent: number;
  fastestCorrectMs: number | null;
  bestStreak: number;
  bestRoundScore: number;
  bestTheme: TriviaThemePayload | null;
};

export type TriviaPhase =
  | "wheel"
  | "question"
  | "reveal-answer"
  | "ranking"
  | "finished";

export type TriviaStatePayload = {
  roomCode: string;
  matchId: string;
  phase: TriviaPhase;
  roundNumber: number;
  totalRounds: number;
  theme: TriviaThemePayload | null;
  question: TriviaQuestionPayload | null;
  phaseEndsAt: string | null;
  isHost: boolean;
  hasAnswered: boolean;
  selectedOptionIndex: number | null;
  players: TriviaPlayerPayload[];
  reveal: TriviaRevealPayload | null;
  ranking: TriviaRankingEntryPayload[] | null;
  finalStats: TriviaFinalStatsPayload[] | null;
};

export type TriviaBackToLobbyNavPayload = {
  roomCode: string;
  path: string;
};

export type RoomErrorPayload = {
  message: string;
};

export interface ClientToServerEvents {
  "room:join": (payload: JoinRoomPayload) => void;
  "room:leave": (payload: LeaveRoomPayload) => void;
  "room:kick-player": (payload: KickPlayerPayload) => void;
  "room:game-selected": (payload: SelectGamePayload) => void;
  "room:start-game": (payload: StartGamePayload) => void;
  "impostor:start": (payload: StartGamePayload) => void;
  "impostor:ready": (payload: ImpostorReadyPayload) => void;
  "impostor:submit-hint": (payload: ImpostorSubmitHintPayload) => void;
  "impostor:vote": (payload: ImpostorVotePayload) => void;
  "impostor:play-again": (payload: ImpostorHostActionPayload) => void;
  "impostor:back-to-lobby": (payload: ImpostorHostActionPayload) => void;
  "guess-who:end-round": (payload: GuessWhoHostActionPayload) => void;
  "quem-sou-eu-personalizado:start": (payload: StartGamePayload) => void;
  "quem-sou-eu-personalizado:submit-character": (
    payload: CustomGuessWhoSubmitCharacterPayload
  ) => void;
  "quem-sou-eu-personalizado:guess": (
    payload: CustomGuessWhoGuessPayload
  ) => void;
  "quem-sou-eu-personalizado:vote": (
    payload: CustomGuessWhoVotePayload
  ) => void;
  "quem-sou-eu-personalizado:cancel": (
    payload: CustomGuessWhoHostActionPayload
  ) => void;
  "quem-sou-eu-personalizado:play-again": (
    payload: CustomGuessWhoHostActionPayload
  ) => void;
  "mimica:start": (payload: StartGamePayload) => void;
  "mimica:begin": (payload: MimicaBeginPayload) => void;
  "mimica:start-mime": (payload: MimicaPlayerActionPayload) => void;
  "mimica:correct": (payload: MimicaPlayerActionPayload) => void;
  "mimica:next-round": (payload: MimicaHostActionPayload) => void;
  "mimica:back-to-lobby": (payload: MimicaHostActionPayload) => void;
  "stop:start": (payload: StartGamePayload) => void;
  "stop:begin": (payload: StopBeginPayload) => void;
  "stop:submit": (payload: StopSubmitPayload) => void;
  "stop:vote": (payload: StopVotePayload) => void;
  "stop:reveal-result": (payload: StopHostActionPayload) => void;
  "stop:next-round": (payload: StopHostActionPayload) => void;
  "stop:back-to-lobby": (payload: StopHostActionPayload) => void;
  "trivia:start": (payload: StartGamePayload) => void;
  "trivia:submit-answer": (payload: TriviaSubmitAnswerPayload) => void;
  "trivia:next-match": (payload: TriviaHostActionPayload) => void;
  "trivia:back-to-lobby": (payload: TriviaHostActionPayload) => void;
}

export interface ServerToClientEvents {
  "room:players-updated": (payload: PlayersUpdatedPayload) => void;
  "room:host-updated": (payload: HostUpdatedPayload) => void;
  "room:game-updated": (payload: GameUpdatedPayload) => void;
  "impostor:started": (payload: ImpostorStartedPayload) => void;
  "impostor:private-role": (payload: ImpostorPrivateRolePayload) => void;
  "impostor:ready-updated": (payload: ImpostorReadyUpdatedPayload) => void;
  "impostor:hints-updated": (payload: ImpostorHintsUpdatedPayload) => void;
  "impostor:turn-changed": (payload: ImpostorTurnChangedPayload) => void;
  "impostor:phase-changed": (payload: ImpostorPhaseChangedPayload) => void;
  "impostor:votes-updated": (payload: ImpostorVotesUpdatedPayload) => void;
  "impostor:result": (payload: ImpostorResultPayload) => void;
  "impostor:back-to-lobby": (payload: ImpostorBackToLobbyPayload) => void;
  "guess-who:started": (payload: GuessWhoStartedPayload) => void;
  "guess-who:state-updated": (payload: GuessWhoStatePayload) => void;
  "quem-sou-eu-personalizado:started": (
    payload: CustomGuessWhoStartedPayload
  ) => void;
  "quem-sou-eu-personalizado:state-updated": (
    payload: CustomGuessWhoStatePayload
  ) => void;
  "quem-sou-eu-personalizado:back-to-lobby-nav": (
    payload: CustomGuessWhoBackToLobbyPayload
  ) => void;
  "mimica:started": (payload: MimicaStartedPayload) => void;
  "mimica:state-updated": (payload: MimicaStatePayload) => void;
  "mimica:private-word": (payload: MimicaPrivateWordPayload) => void;
  "mimica:back-to-lobby-nav": (payload: MimicaBackToLobbyNavPayload) => void;
  "stop:started": (payload: StopStartedPayload) => void;
  "stop:state-updated": (payload: StopStatePayload) => void;
  "stop:back-to-lobby-nav": (payload: StopBackToLobbyNavPayload) => void;
  "trivia:started": (payload: TriviaStartedPayload) => void;
  "trivia:state-updated": (payload: TriviaStatePayload) => void;
  "trivia:back-to-lobby-nav": (payload: TriviaBackToLobbyNavPayload) => void;
  "room:error": (payload: RoomErrorPayload) => void;
}

export interface SocketData {
  roomCode?: string;
  userId?: string;
}
