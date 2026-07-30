## ADDED Requirements

### Requirement: Fixed theme set
The system SHALL offer exactly six themes for the wheel: Artes e Entretenimento, Mundo, Ciência e Tecnologia, Esportes, Sociedade, and Variedades. No other theme SHALL appear on the wheel.

#### Scenario: Wheel always shows the six fixed themes
- **WHEN** the wheel is rendered for any round of any match
- **THEN** it displays exactly the six themes Artes e Entretenimento, Mundo, Ciência e Tecnologia, Esportes, Sociedade, and Variedades, in a fixed order, with no duplicates and no other themes

### Requirement: Server-authoritative theme draw
The host/server SHALL be solely responsible for selecting the round's theme. The theme SHALL be drawn from a shuffled bag of the six themes that have not yet been used in the current cycle; once a theme is drawn it SHALL be removed from the bag until all six have been used, at which point the bag SHALL be reshuffled with all six themes again.

#### Scenario: No theme repeats until all six are used
- **WHEN** a match plays through 6 consecutive rounds without the bag being exhausted early
- **THEN** each of the 6 rounds shows a different one of the six themes, with no theme repeated

#### Scenario: Bag resets after exhaustion
- **WHEN** all six themes have been drawn in the current cycle and a 7th round begins
- **THEN** the server reshuffles a new bag containing all six themes and draws the round's theme from it, allowing repeats across cycles but not within a cycle

#### Scenario: Draw is genuinely random
- **WHEN** the server selects a theme from the current bag
- **THEN** the selection uses a uniform random draw so no theme is more likely than any other remaining theme in the bag

### Requirement: Synchronized wheel animation across clients
Every connected player SHALL see the identical wheel spin animation and the identical resulting theme at the same time for a given round.

#### Scenario: All players see the same result
- **WHEN** the server determines the round's theme and broadcasts it to the room
- **THEN** every connected client renders the wheel spinning to land on that same theme, without any client computing or showing a different result

#### Scenario: Player reconnecting mid-spin sees the resolved theme
- **WHEN** a player's client reconnects after the server has already resolved the round's theme
- **THEN** the client shows the current round's confirmed theme (skipping or fast-forwarding the spin animation) rather than re-spinning to a different result

### Requirement: Wheel spin presentation
The wheel SHALL occupy nearly the full screen before each round, spin fast at first and decelerate gradually with realistic easing (not an obviously pre-determined stop), play sound effects while spinning, bounce slightly when it stops, visually highlight the winning theme with a glow/animation, and emit a particle/confetti burst when the theme is set. After stopping, the app SHALL show a full-screen "Tema da Rodada" transition with the theme's icon and name for approximately 2 seconds before the question appears.

#### Scenario: Wheel decelerates and settles on the drawn theme
- **WHEN** a round starts and the server has drawn the theme
- **THEN** the wheel spins quickly, gradually slows down, comes to rest with a small bounce on the drawn theme, and highlights that theme with a glow/animation while emitting confetti/particles

#### Scenario: Theme reveal precedes the question
- **WHEN** the wheel finishes settling on a theme
- **THEN** a full-screen "Tema da Rodada" screen shows the theme's icon and name for about 2 seconds, after which the question for that round appears

### Requirement: Round scoring by answer speed
Each round SHALL be worth a maximum of 1000 points. A correct answer SHALL score 1000 points if submitted within 5 seconds of the question appearing, 800 points between 6 and 10 seconds, 600 points between 11 and 15 seconds, 400 points between 16 and 20 seconds, and 0 points if incorrect or unanswered within the 20-second window.

#### Scenario: Fast correct answer scores maximum points
- **WHEN** a player submits the correct answer 3 seconds after the question appears
- **THEN** the player is awarded 1000 points for that round

#### Scenario: Slower correct answer scores fewer points
- **WHEN** a player submits the correct answer 18 seconds after the question appears
- **THEN** the player is awarded 400 points for that round

#### Scenario: Incorrect answer scores zero
- **WHEN** a player submits an incorrect answer at any point within the 20-second window
- **THEN** the player is awarded 0 points for that round

#### Scenario: No answer scores zero
- **WHEN** the 20-second timer expires without the player submitting an answer
- **THEN** the player is awarded 0 points for that round

### Requirement: Minimum players to start
The host SHALL be able to start a multiplayer Trivia match once at least 2 players are connected in the room; the game SHALL NOT require 3 or more connected players like the other games do.

#### Scenario: Two connected players can start
- **WHEN** the host attempts to start Trivia with exactly 2 connected players in the room
- **THEN** the match starts normally

#### Scenario: Fewer than two connected players cannot start
- **WHEN** the host attempts to start Trivia with fewer than 2 connected players
- **THEN** the match does not start and the host sees why (not enough players)

### Requirement: Multiplayer round flow
In multiplayer mode, once the theme is revealed the question SHALL appear simultaneously to all players and a 20-second countdown SHALL start. Each player SHALL answer independently on their own device. Once a player submits an answer, their chosen option SHALL lock and they SHALL wait for the round to end. If every connected player answers before the timer expires, the round SHALL end immediately instead of waiting out the full 20 seconds.

#### Scenario: Answer locks after submission
- **WHEN** a player selects and submits an answer
- **THEN** that player's selected option becomes locked (no further changes) and the player sees a waiting state until the round ends

#### Scenario: Round ends early when everyone has answered
- **WHEN** all connected players submit an answer before the 20-second timer expires
- **THEN** the round ends immediately and moves to the reveal step without waiting for the remaining time

#### Scenario: Round ends when the timer expires
- **WHEN** the 20-second timer reaches zero and at least one connected player has not answered
- **THEN** the round ends, and any player who did not answer is scored 0 for that round

### Requirement: Reconnection during an active question
A player who reconnects while a round's 20-second answer window is still open (i.e. before `roundEndsAt`) SHALL see the current question and SHALL be able to submit an answer for the time remaining, scored the same as any other answer by elapsed time since the question appeared.

#### Scenario: Reconnecting in time allows answering
- **WHEN** a player disconnects and reconnects before the round's 20-second window has elapsed
- **THEN** the player sees the active question and remaining time, and can submit an answer that is scored normally based on when it was submitted

#### Scenario: Reconnecting after the window closed scores zero
- **WHEN** a player reconnects after `roundEndsAt` has already passed for the current round
- **THEN** the player did not answer in time and is scored 0 for that round, consistent with any other player who did not answer

### Requirement: Round reveal and live ranking
After each round ends, the system SHALL reveal the correct alternative, the number of players who answered correctly, the points each player earned that round, and SHALL immediately update the overall ranking.

#### Scenario: Reveal shows outcome and points
- **WHEN** a round ends (early or by timeout)
- **THEN** all players see the correct alternative highlighted, the count of players who answered correctly, and the points awarded to each player for that round

#### Scenario: Ranking updates immediately after reveal
- **WHEN** round scoring is finalized
- **THEN** the overall ranking (cumulative score per player) is recalculated and shown before the next round's wheel appears

### Requirement: Animated ranking with position changes
The ranking display SHALL show medal styling for the top 3 positions (🥇🥈🥉) and remaining players ordered by score, and SHALL visually distinguish each player's previous position versus current position, animating players who moved up or down.

#### Scenario: Top 3 show medals
- **WHEN** the ranking is displayed after any round
- **THEN** the 1st, 2nd, and 3rd place players are marked with 🥇, 🥈, and 🥉 respectively, and the rest are listed in descending score order

#### Scenario: Position changes are animated
- **WHEN** a player's rank position differs from their position after the previous round
- **THEN** the ranking view animates that player moving from their previous position to their current position, visually indicating whether they moved up or down

### Requirement: Same-device pass-and-play turn flow
In same-device ("Um Celular") mode, the app SHALL sequentially assign each round's question to one player at a time, SHALL show a "Vez de <nome>" indicator followed by a "Passe o celular para <nome>" hand-off screen, and SHALL only reveal the question after the hand-off is acknowledged, so that no other player sees the question or any answer before their own turn.

#### Scenario: Turn indicator precedes the question
- **WHEN** it becomes a player's turn to answer in same-device mode
- **THEN** the app first shows "Vez de <nome>", then "Passe o celular para <nome>", and only afterward reveals that round's question to the active player

#### Scenario: Other players cannot see the question or answer early
- **WHEN** the device is being passed between players
- **THEN** the question and its answer options remain hidden until the receiving player confirms the hand-off screen

#### Scenario: Reveal happens after all players in the round have answered
- **WHEN** every player has taken their turn for the current round in same-device mode
- **THEN** the correct answer is revealed, each player's points for the round are shown, and the ranking is updated

### Requirement: Match length
A Trivia match SHALL consist of exactly 12 rounds, each following the same sequence: wheel spin, theme reveal, question, answer window, answer reveal, scoring, ranking update, next round.

#### Scenario: Match ends after the 12th round
- **WHEN** the 12th round's ranking update completes
- **THEN** the match transitions to the final results screen instead of starting a 13th round

### Requirement: Final results and match statistics
After the 12th round, the system SHALL present a podium showing the 1st (🏆), 2nd (🥈), and 3rd (🥉) place players, plus per-player match statistics: total correct answers, accuracy percentage, fastest correct answer, longest streak of correct answers, highest single-round score, and the theme in which the player performed best.

#### Scenario: Podium shows top 3 finishers
- **WHEN** the final results screen is shown
- **THEN** the players finishing 1st, 2nd, and 3rd by total score are displayed with 🏆, 🥈, and 🥉 respectively

### Requirement: Tie-breaking on final ranking
When two or more players finish with the same total score, the player with more total correct answers over the match SHALL rank higher. If total correct answers are also equal, the players SHALL be considered tied and share the same podium/ranking position.

#### Scenario: Equal score broken by total correct answers
- **WHEN** two players finish the match with the same total score but one answered more questions correctly overall
- **THEN** the player with more total correct answers is ranked higher

#### Scenario: Fully tied players share a position
- **WHEN** two players finish with the same total score and the same total number of correct answers
- **THEN** both players are shown at the same ranking position (e.g. both as 2nd place)

#### Scenario: Match statistics are shown per player
- **WHEN** the final results screen is shown
- **THEN** each player's total correct answers, accuracy percentage, fastest correct answer time, longest correct-answer streak, highest single-round score, and best-performing theme are displayed

### Requirement: Post-match actions
From the final results screen, players SHALL be able to choose to play again, return to the room lobby, or create a new room.

#### Scenario: Play again starts a fresh match
- **WHEN** a player selects "Jogar novamente" on the final results screen
- **THEN** a new 12-round Trivia match starts in the same room with scores reset to zero

#### Scenario: Back to lobby returns without starting a new match
- **WHEN** a player selects the option to return to the lobby
- **THEN** the room returns to the game-selection/waiting lobby state without starting a new Trivia match

#### Scenario: Create new room starts fresh
- **WHEN** a player selects the option to create a new room
- **THEN** the player is taken to the flow for creating a brand new room, leaving the current one
