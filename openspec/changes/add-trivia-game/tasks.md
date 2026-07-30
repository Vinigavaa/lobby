## 1. Data model & seed content

- [x] 1.1 Add `TriviaQuestion` model to `prisma/schema.prisma` (`theme`, `question`, `options` Json, `correctIndex`, `isActive`, indexes on `theme`/`isActive`) and generate the migration
- [x] 1.2 Define the fixed six-theme constant in `lib/trivia-themes.ts` (id, emoji, label) shared by server and client — flat file, matching the existing `lib/stop-categories.ts` convention instead of a `lib/trivia/` subfolder
- [x] 1.3 Seed 10 multiple-choice questions per theme (60 total) in `lib/trivia-questions-data.ts` + `prisma/seed.ts`, matching the `mimica-words-data.ts` shared-source pattern
- [x] 1.4 Flip the seeded `Game` row `type: "trivia"` to `isActive: true`

## 2. Shared game logic (`lib/trivia-*.ts`)

- [x] 2.1 Implement theme-bag shuffle/draw-without-repeat helper (`lib/trivia-engine.ts`), reshuffling all six themes once the bag is exhausted
- [x] 2.2 Implement answer-latency scoring (`lib/trivia-engine.ts`): 1000/800/600/400/0 point brackets, 0 for incorrect/no-answer
- [x] 2.3 Implement match stats aggregation (`lib/trivia-engine.ts`): total correct, accuracy %, fastest correct answer, longest streak, best single-round score, best-performing theme, and the final ranking sort (`totalScore desc, correctCount desc`, tied players sharing a position)
- [ ] 2.4 Implement `lib/trivia-sound.ts`: Web Audio API tick/spin and stop/win chime helpers, wrapped defensively (no-op if audio is blocked)

## 3. Multiplayer socket layer

- [x] 3.1 Add `TRIVIA_START`, `TRIVIA_STARTED`, `TRIVIA_SUBMIT_ANSWER`, `TRIVIA_STATE_UPDATED`, `TRIVIA_NEXT_MATCH`, `TRIVIA_BACK_TO_LOBBY`, `TRIVIA_BACK_TO_LOBBY_NAV` to `lib/socket/events.ts`
- [x] 3.2 Define `TriviaMatchState` type and `isTriviaMatchState` type guard in `lib/socket/server.ts`, following the `StopMatchState`/`MimicaMatchState` pattern
- [x] 3.3 Implement `startTriviaMatch`: validate host/room (minimum 2 connected players, not 3), draw first theme+question, create the `Match` row with initial state, broadcast `TRIVIA_STARTED`
- [x] 3.4 Implement round-start transition (single `"wheel"` phase carrying the resolved theme; the ~2s "Tema da Rodada" reveal is a client-only sub-animation timed to the shared `triviaWheelPhaseMs` constant) → `"question"`, stamping `phaseEndsAt` and broadcasting `TRIVIA_STATE_UPDATED`
- [x] 3.5 Implement `TRIVIA_SUBMIT_ANSWER` handler: stamp `answeredAt` from server clock, reject duplicate/late submissions, end round early once every player has answered
- [x] 3.6 Implement server-side phase timer (`setTimeout` keyed by matchId, mirroring `stopTimers`) that force-advances the round at `phaseEndsAt` if not all players answered
- [x] 3.7 Implement round-end scoring + ranking recompute (store `previousRanking` before overwriting) and broadcast the `"reveal-answer"` → `"ranking"` state, both auto-advancing after a fixed delay (no host click needed, matching the spec's "todos veem a mesma animação" framing)
- [x] 3.8 Implement round advancement: draw next theme from the bag (reshuffling if empty) for rounds 2–12, looping back to `"wheel"` phase
- [x] 3.9 Implement match completion after round 12: compute final stats via `lib/trivia-engine.ts`, set `phase: "finished"`
- [x] 3.10 Implement `TRIVIA_NEXT_MATCH` (play again), `TRIVIA_BACK_TO_LOBBY` handlers, matching existing Stop/Mimica lobby-return behavior

## 4. Multiplayer UI

- [x] 4.1 Create `app/room/[code]/trivia/page.tsx` route, mirroring `app/room/[code]/stop/page.tsx`
- [x] 4.2 Create `components/trivia/trivia-game.tsx` top-level client component wiring the socket client to `TriviaStatePayload`, switching rendered phase
- [x] 4.3 Build the wheel component (`components/trivia/trivia-wheel.tsx`): near-fullscreen wheel, fast-spin-then-decelerate animation landing on the server-provided theme, spin sound via `lib/trivia-sound.ts`, bounce-on-stop, glow highlight, confetti burst (`trivia-confetti.tsx`, respecting `prefers-reduced-motion`)
- [x] 4.4 Build the "Tema da Rodada" full-screen reveal transition (~2s) with theme icon/name before the question renders (sub-phase inside `TriviaWheel`)
- [x] 4.5 Build the question screen: options grid, 20s countdown driven by `phaseEndsAt`, answer lock/waiting state after submission
- [x] 4.6 Build the answer-reveal screen: correct alternative highlighted, correct-answer count, per-player points earned
- [x] 4.7 Build the live ranking screen: medals for top 3, animated position-change (up/down) using `framer-motion` layout animation from `previousRanking`
- [x] 4.8 Build the final results screen: podium (🏆🥈🥉) + per-player stats table, with "jogar novamente" / "voltar ao lobby" wired to socket events; "sair da sala" (equivalent to "criar nova sala" from this screen) already available via the persistent leave button

## 5. Same-device ("Um Celular") mode

- [x] 5.1 Create `app/local/trivia/page.tsx` route, mirroring `app/local/mimica/page.tsx`
- [x] 5.2 Create `components/local/local-trivia-game.tsx`: local 12-round state machine reusing `lib/trivia-engine.ts` (theme-bag, scoring, stats) and `lib/trivia-questions-data.ts` (client-side question bank, no DB dependency, matching the `mimica-words-data.ts` local-mode precedent)
- [x] 5.3 Implement per-turn hand-off gating: "Vez de `<nome>`" → "Passe o celular para `<nome>`" → question only after explicit confirmation, hiding the question/answer from anyone but the active player
- [x] 5.4 Reuse `TriviaWheel` and `TriviaConfetti` from `components/trivia/*` for the wheel and final-podium confetti; the question/reveal/ranking screens are re-implemented locally since local mode has no `TriviaStatePayload` to drive them (same split already used by Impostor/Mimica between `components/<game>` and `components/local/local-<game>-game.tsx`)

## 6. Catalog integration

- [x] 6.1 Flip the Trivia catalog entry in `app/local/page.tsx` to `available: true` with its `/local/trivia` route; the online catalog (`components/room/room-lobby.tsx`) already derives its "Disponivel"/"Em breve" badge from the seeded `Game.isActive` flag, which is now `true`

## 7. Verification

- [x] 7.1 Typecheck and lint the full project (`tsc --noEmit`, `eslint`) — both clean
- [x] 7.2 End-to-end tested multiplayer mode via two real Socket.IO clients against the running dev server (room create → join → select Trivia → start → full 12-round match): theme bag covered all 6 themes exactly once per 6-round cycle (twice total across 12 rounds) with zero repeats within a cycle, scoring/streak/fastest/best-round/best-theme stats computed correctly, live ranking updated every round, match completed and returned `finalStats` for both players. (Browser-based click-through wasn't usable in this environment — the browser pane never composited frames — so verification used a scripted two-client Socket.IO run instead of manual clicking; this exercises the exact same server code path as the UI.)
- [ ] 7.3 Manually test same-device mode in a real browser: turn hand-off hides question/answer from non-active players, scoring/ranking/stats match the multiplayer logic, full 12-round match completes — not run (no working browser interaction in this session); verified by code review and shared-logic reuse (`lib/trivia-engine.ts`) with the already-tested multiplayer path instead
- [ ] 7.4 Verify `prefers-reduced-motion` disables/reduces the wheel and confetti animation, and that blocked audio fails silently — not run in a real browser for the same reason; `trivia-confetti.tsx` checks `matchMedia("(prefers-reduced-motion: reduce)")` and renders nothing when true, and `lib/trivia-sound.ts` wraps all Web Audio calls in try/catch with no-op fallback, verified by code review
