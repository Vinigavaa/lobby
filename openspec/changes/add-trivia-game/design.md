## Context

The project already implements four real-time party games (Impostor, Quem Sou Eu, Mímica, Stop) that all share the same architecture:

- One `lib/socket/server.ts` Socket.IO server holds all game logic; each game defines its own `<Game>MatchState` TypeScript type persisted as the JSON `Match.state` column (see `StopMatchState`, `MimicaMatchState`, `ImpostorMatchState`).
- Each game has its own namespaced socket events in `lib/socket/events.ts` (`<game>:start`, `<game>:started`, `<game>:state-updated`, `<game>:back-to-lobby`, etc.), with the host's client emitting the `start` event and the server broadcasting `started`/`state-updated` to the room.
- Server-side timers (`setTimeout`, e.g. `stopTimers`/pattern around line 3565 of `server.ts`) drive round deadlines; the server is the source of truth and pushes state, not the clients.
- Question/word banks live in dedicated Prisma models (`ImpostorWord`, `MimicaWord`, `GuessWhoCard`), each tagged with a `category` and seeded via `prisma/seed.ts`.
- Same-device play already exists for Impostor and Mímica as separate client-only components (`components/local/local-impostor-game.tsx`, `components/local/local-mimica-game.tsx`) under `app/local/<game>/page.tsx`, with no socket involved — pure local React state, sequential turn-taking, and a "pass the phone" hand-off screen.
- The `Game` table already has a `trivia` row seeded with `isActive: false`; the catalog UI already lists it as "EM BREVE".

Trivia is a new kind of game for this codebase: it needs a question bank with multiple-choice answers (not just a single word/phrase), a fixed 12-round match length, per-answer speed-based scoring, a shared random "wheel" moment that must render identically on every client, and a live ranking view with position-change animation. None of the existing games have all of these at once, so some new shared pieces are needed, but the overall shape follows the established per-game pattern closely.

## Goals / Non-Goals

**Goals:**
- Implement Trivia end-to-end for both multiplayer (each player on their own device) and same-device pass-and-play modes, matching the behavior in `specs/trivia-game/spec.md`.
- Keep the server authoritative for theme draw, question selection, timing, and scoring, consistent with how Stop/Mimica/Impostor already work, so no client can see the answer or influence the theme before it is broadcast.
- Reuse existing architectural patterns (Match.state JSON, per-game socket events, seed-driven question bank, local pass-and-play component style) rather than introducing a new state-management approach.
- Make the wheel spin, confetti, and sound effects feel polished without adding heavy new dependencies.

**Non-Goals:**
- No spectator mode, no persisted historical leaderboards across matches/rooms (match stats live only for the duration of the results screen, like the other games).
- No custom/user-submitted questions in this change — the question bank is seeded content only.
- No animation engine change — continue using `framer-motion`, already a dependency.
- No new audio-file asset pipeline — sound effects are generated synthetically (see Decisions).

## Decisions

### 1. Data model: `TriviaQuestion`
Add a Prisma model mirroring the existing word-bank pattern:
```prisma
model TriviaQuestion {
  id        String   @id @default(cuid())
  theme     String   // one of the 6 fixed theme ids, e.g. "artes-entretenimento"
  question  String
  options   Json      // string[4]
  correctIndex Int
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([theme])
  @@index([isActive])
}
```
Rationale: consistent with `ImpostorWord`/`MimicaWord`/`GuessWhoCard`; `theme` as a plain string (not a relation/enum) matches how `category` is already modeled elsewhere and keeps the six fixed themes as an application-level constant (`lib/trivia/themes.ts`) rather than a DB-enforced enum, avoiding a migration if theme copy ever needs a tweak.
Alternative considered: a separate `TriviaTheme` table — rejected as over-engineering for a fixed, hardcoded set of 6 themes with emoji + label, which is simpler as a shared constant used by both server and client.

### 2. Match state shape and theme "bag"
```ts
type TriviaMatchState = {
  phase: "wheel" | "reveal-theme" | "question" | "reveal-answer" | "ranking" | "finished";
  roundNumber: number;      // 1..12
  totalRounds: 12;
  themeBag: TriviaThemeId[];       // remaining shuffled themes for the current cycle
  currentTheme: TriviaThemeId | null;
  currentQuestion: { id: string; question: string; options: string[] } | null; // no correctIndex sent to clients until reveal
  roundStartedAt: string | null;   // ISO timestamp, server clock — question shown at this instant
  roundEndsAt: string | null;      // roundStartedAt + 20s
  answers: Record<string, { optionIndex: number; answeredAt: string } | null>; // per userId
  players: Array<{ userId: string; nickname: string; avatar: string | null; totalScore: number; correctCount: number; bestStreak: number; currentStreak: number; fastestCorrectMs: number | null; bestRoundScore: number; bestTheme: Record<TriviaThemeId, number> }>;
  previousRanking: string[] | null; // userIds ordered by score after the previous round, for position-delta animation
  usedQuestionIds: string[];       // avoid repeating a question within the same match
};
```
The theme bag lives inside `Match.state`, scoped to a single match — this naturally resets whenever a new match starts ("play again"), satisfying the no-repeat-until-exhausted rule without any extra table. When `themeBag` is empty at the start of a round, the server refills it with a freshly shuffled copy of all 6 themes before drawing.

Rationale: keeps randomness and repeat-avoidance entirely server-side and match-scoped, matching how `StopMatchState.categories`/`letter` already work; no new global tables needed.

### 3. Server-driven, client-rendered wheel
The server draws the theme (via `crypto.randomInt`, same primitive already used for room codes) and question, then broadcasts `trivia:state-updated` with `phase: "wheel"` and the resolved `currentTheme`. All clients receive the same final answer up front and play a **purely cosmetic** spin animation (deterministic easing curve, several full rotations + offset to land on the given theme's wedge) so nobody perceives the result as pre-determined, even though technically the server already resolved it before the animation starts. This mirrors how the existing games avoid split-brain state (server decides, clients render).

Alternative considered: have all clients compute the same result from a shared seed (e.g. round number + room id) — rejected because it's more fragile (any client-side RNG or theme-order mismatch causes visible desync) and gives no real security benefit over the server just deciding and broadcasting.

For a reconnecting client mid-spin (per spec scenario), the client simply skips straight to rendering the already-resolved `currentTheme` without re-running the spin, since `Match.state` already holds the final value.

### 4. Timing and scoring — server clock is authoritative
`roundStartedAt`/`roundEndsAt` are set once by the server when `phase` becomes `"question"`, and included in every `state-updated` broadcast. Clients render the 20s countdown from `roundEndsAt` (matching the existing pattern where Stop/Mimica broadcast a deadline rather than trusting client-reported elapsed time). When a player submits an answer, the server stamps `answeredAt` using its own clock and computes the score bracket from `answeredAt - roundStartedAt`, never from a client-supplied elapsed time — this prevents a modified client from claiming a faster answer than it actually made.

Round ends early (`phase` moves to `"reveal-answer"`) as soon as `answers` has a non-null entry for every currently-connected player, mirroring the "everyone answered" early-exit already implemented for Stop's submission phase. A server `setTimeout` scheduled for `roundEndsAt` force-ends the round otherwise (same `stopTimers`-style `Map<matchId, Timeout>` pattern).

### 5. Same-device pass-and-play as a separate local component
Following the existing `local-impostor-game.tsx`/`local-mimica-game.tsx` precedent, `components/local/local-trivia-game.tsx` implements the full 12-round loop as local component state with no socket involved (single physical device, so there's nothing to synchronize over the network). Turn order cycles through the configured local players; before each player's question, the component shows "Vez de `<nome>`" then "Passe o celular para `<nome>`" and only renders the question after an explicit tap-to-continue, exactly like Mímica's existing pass-and-play gating. The wheel, scoring rules, ranking, and final stats logic are implemented as shared pure functions (`lib/trivia/scoring.ts`, `lib/trivia/theme-bag.ts`) imported by both the socket server (multiplayer) and the local component (same-device), so the scoring/ranking rules are defined once and can't drift between modes.

### 6. Confetti and sound without new asset/library dependencies
- **Confetti**: a small custom canvas-free component using absolutely-positioned `framer-motion` divs (capped at ~40 particles), consistent with the project's existing "no extra animation library beyond framer-motion" pattern. Respects `prefers-reduced-motion` by skipping the burst entirely.
- **Sound**: short procedural tones generated at runtime via the Web Audio API (`OscillatorNode`, a few lines in `lib/trivia/sound.ts`) for the spin tick and the stop/win chime, instead of shipping `.mp3`/`.wav` files. Avoids adding binary assets and licensing concerns, and keeps bundle size unaffected. A user-facing mute is not required by the spec, but the sound is best-effort (wrapped in try/catch — browsers that block autoplay/audio without a prior gesture simply play no sound, which is acceptable since the room-join flow already involves user interaction).

### 7. Ranking position-delta animation
`previousRanking` (an ordered array of `userId`) is stored in `Match.state` and updated after every round's ranking recompute. The ranking component receives both the new order and `previousRanking`, computes each player's index delta, and uses `framer-motion`'s `layout` animation (already used elsewhere in the app for list reordering-style transitions) to animate the move — no new animation primitive needed.

### 8. Minimum players, reconnection window, and tie-breaking
- **Minimum players**: unlike Impostor/Mímica/Stop (`connectedCount >= 3`), Trivia's start validation only requires `connectedCount >= 2`, since a 1v1 quiz duel is a valid session. This is a one-line difference in the `validateTriviaStartRoom`-equivalent check versus the other games' validators.
- **Reconnection mid-question**: because scoring is always computed server-side from `answeredAt - roundStartedAt` (Decision 4), a reconnecting player simply resumes normal submission — if `roundEndsAt` hasn't passed yet, `TRIVIA_SUBMIT_ANSWER` is accepted and scored like any other answer; if it has passed, the existing "unanswered → 0" path already handles it. No special-cased reconnection logic is needed beyond what "everyone connected must answer or the deadline fires" already implies — a reconnecting player is just a connected player who hasn't answered yet.
- **Tie-breaking**: the ranking/podium sort key is `(totalScore desc, correctCount desc)`. Players equal on both are rendered at the same position (e.g. two players both shown as "2º lugar"), rather than an arbitrary insertion-order tiebreak. This keeps the sort deterministic and fair without inventing a third tiebreak criterion (e.g. fastest average time) that wasn't requested.

### 9. Route and socket-event naming
New routes: `app/room/[code]/trivia/page.tsx` (multiplayer, mirrors `app/room/[code]/stop/page.tsx`) and `app/local/trivia/page.tsx` (same-device, mirrors `app/local/mimica/page.tsx`). New events in `SOCKET_EVENTS` follow the exact existing naming convention: `TRIVIA_START`, `TRIVIA_STARTED`, `TRIVIA_SUBMIT_ANSWER`, `TRIVIA_STATE_UPDATED`, `TRIVIA_NEXT_MATCH` (play again), `TRIVIA_BACK_TO_LOBBY`, `TRIVIA_BACK_TO_LOBBY_NAV`.

## Risks / Trade-offs

- **[Risk]** Network latency skews when a client actually sees `roundEndsAt` vs. when the server started the timer → **Mitigation**: countdown is computed from the absolute `roundEndsAt` timestamp (clock-relative, not a client-started interval), same approach already proven in Stop/Mimica; a few hundred ms of jitter does not affect the 5-second scoring brackets in practice.
- **[Risk]** Question bank per theme could run out within a single 12-round match if too few questions are seeded for a theme → **Mitigation**: seed at least ~15–20 questions per theme (well above the worst-case need of up to 12 draws of one theme in a single match) and track `usedQuestionIds` per match to avoid repeats; if a theme's pool is ever exhausted mid-match, fall back to allowing a repeat from that theme rather than erroring, since specs don't require question-level no-repeat guarantees, only theme-level.
- **[Risk]** Synthetic Web Audio sounds may be blocked by browser autoplay policies on the very first interaction → **Mitigation**: acceptable degradation to silence; sound is enhancement, not required functionality per spec.
- **[Risk]** Confetti/particle animation could hurt performance on low-end phones if overused across 12 rounds → **Mitigation**: cap particle count, use CSS transforms (GPU-accelerated) via `framer-motion`, and respect `prefers-reduced-motion`.
- **[Trade-off]** Same-device mode duplicates the round-flow *presentation* logic from the multiplayer socket flow (no shared React component tree, since one is server-driven and the other is local-only) — mitigated by sharing the pure scoring/theme-bag/stats logic in `lib/trivia/*`, matching how Mímica/Impostor already split local vs. multiplayer presentation while any genuinely shared logic stays in `lib/`.

## Migration Plan

1. Add Prisma migration for `TriviaQuestion` (additive only, no changes to existing tables besides the seed flipping `Game.trivia.isActive` to `true`).
2. Seed a question bank (~15–20 questions per theme) in `prisma/seed.ts`.
3. Implement shared `lib/trivia/*` (themes constant, theme-bag draw, scoring, stats aggregation) with unit-testable pure functions.
4. Implement server-side socket handlers in `lib/socket/server.ts` following the Stop/Mimica pattern.
5. Implement multiplayer UI (`components/trivia/*`) and route.
6. Implement same-device UI (`components/local/local-trivia-game.tsx`) and route, reusing `lib/trivia/*`.
7. Flip the seeded `trivia` `Game.isActive` to `true` and remove the "EM BREVE" badge/lock styling for it in the catalog component.
8. Manual smoke test of both modes (multiplayer with 2+ browser tabs, same-device with simulated multiple local players), matching the existing `*-smoke` scripts pattern used elsewhere in the repo where applicable.

Rollback: since this only adds a new game type additively (new table, new seed rows, new routes/components, new socket events) and flips one `isActive` flag, rollback is simply reverting the `isActive` flag to `false` (hides it from the catalog again) and, if needed, reverting the migration/commits — no existing game or shared table is modified.

## Open Questions

- Exact copy/count of seeded trivia questions per theme (~15–20 suggested) — to be finalized during implementation/content-writing, not a blocking architectural decision.
- Whether "play again" should reshuffle player order/host, or keep the same host — default to keeping the same host and player list, consistent with how Stop/Mimica's "play again" already behaves (`*_BACK_TO_LOBBY`/restart flows in `server.ts`), unless testing reveals a reason to diverge.

**Resolved during review:**
- Sound effects: synthetic Web Audio tones (Decision 6), not real audio assets — confirmed, can be swapped for real `.mp3` assets later without changing the architecture.
- Minimum players: 2, not 3 like the other games (Decision 8).
- Tie-breaking: total correct answers as the secondary sort key, fully-tied players share a podium position (Decision 8).
- Reconnection mid-question: allowed to answer for the remaining time, scored normally (Decision 8).
