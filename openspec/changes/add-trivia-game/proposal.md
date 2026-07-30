## Why

The game catalog already advertises a "Trivia" entry (`components/local/*` catalog, `prisma/seed.ts` game type `trivia`) but it is marked "EM BREVE" (`isActive: false`) with no implementation behind it. Players asking for a quiz-style party game currently have nothing to play. This change builds the full Trivia game — a themed-wheel quiz with speed-based scoring, live ranking, and a final podium — for both the multiplayer (each player on their own device) and same-device pass-and-play modes already supported by the other games (Impostor, Mimica, Stop, Quem Sou Eu).

## What Changes

- New `trivia` game type is fully implemented and flipped to `isActive: true` in the seed data.
- A 12-round match structure: theme wheel spin → theme reveal → question → 20s answer timer → answer reveal + scoring → live ranking → next round.
- Six fixed themes only (Artes e Entretenimento, Mundo, Ciência e Tecnologia, Esportes, Sociedade, Variedades), server-authoritative random draw with no-repeat-until-exhausted (draw bag) semantics, synchronized identically to every connected player.
- An animated wheel component: fast spin → gradual deceleration → realistic easing (non-deterministic-looking) → bounce on stop → winning-theme highlight/glow → confetti burst, followed by a ~2s full-screen "Tema da Rodada" reveal before the question appears.
- Speed-based scoring: 1000/800/600/400/0 points depending on the 5-second bracket the correct answer lands in; 0 for wrong or no answer; round ends early once every connected player has answered.
- Live ranking updated after every round with medal styling (🥇🥈🥉) and animated position-change indicators (up/down movement vs. previous ranking).
- Same-device ("Um Celular") pass-and-play mode: sequential turn-taking per round with an explicit "Vez de X" / "Passe o celular para X" hand-off screen before each player's question is shown, so no one but the active player sees the question/answer.
- Final results screen after round 12: podium (🏆🥈🥉) plus match stats per player — total correct, accuracy %, fastest correct answer, longest correct streak, best single-round score, best-performing theme — and options to play again, return to lobby, or create a new room.
- **New Capabilities**:
  - `trivia-game`: the full quiz game — wheel/theme draw, question flow, scoring, ranking, match stats, multiplayer and pass-and-play modes.

### New Capabilities
- `trivia-game`: theme wheel selection, 12-round quiz loop with speed-based scoring, live ranking, same-device pass-and-play flow, and end-of-match podium/stats.

### Modified Capabilities
(none — no existing spec-level behavior changes; this only adds a new game alongside the existing ones using the established room/game-selection contract)

## Impact

- **Database**: new `TriviaQuestion` model (question bank per theme, similar to `ImpostorWord`/`MimicaWord`/`GuessWhoCard`) via a new Prisma migration; `Game` row for `type: "trivia"` flipped to `isActive: true`.
- **Socket layer** (`lib/socket/events.ts`, `lib/socket/server.ts`): new `trivia:*` events following the existing per-game convention (`start`, `started`, `submit-answer`, `state-updated`, `next-round`, `back-to-lobby`) plus a server-driven wheel-spin broadcast so all clients render the identical spin/result.
- **Routes**: `app/room/[code]/trivia/page.tsx` (multiplayer) and `app/local/trivia/page.tsx` (pass-and-play), mirroring the existing per-game route pattern.
- **Components**: new `components/trivia/*` (wheel, question, answer reveal, ranking, podium/stats) and `components/local/local-trivia-game.tsx` for the same-device flow.
- **Seed data**: new theme-tagged question bank seeded via `prisma/seed.ts`.
- No changes to authentication, room creation, or the other existing games.
