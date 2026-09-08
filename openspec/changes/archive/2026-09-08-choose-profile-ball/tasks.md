## 1. The unlock table on the server

- [x] 1.1 Test: the earliest level for each colour matches the campaign curve — colour 1 at level 1, colour 4 at the first level using four colours, colour 13 at the last step — and every colour 1..13 has an entry
- [x] 1.2 Test: the walk terminates at its cap rather than spinning if the curve never reaches the top colour
- [x] 1.3 Add the unlock table to `LevelCatalogue`, computed once by walking level ids and recording where each colour first appears

## 2. The chosen ball on the account

- [x] 2.1 Test: a player document with no chosen ball round-trips with the field absent, not written as null
- [x] 2.2 Add `ProfileBall` to `PlayerDocument` and register it in the class map with the ignore-if-null treatment `Username` already uses
- [x] 2.3 Test: setting and clearing a player's ball through the store reads back what was written
- [x] 2.4 Add the store method that sets the field

## 3. The profile-ball endpoints

- [x] 3.1 Test: `GET /api/v1/profile/balls` returns thirteen entries with rising unlock levels, and needs no token
- [x] 3.2 Test: `PUT /api/v1/players/me/ball` with no token is refused as unauthorised
- [x] 3.3 Test: a colour outside 1..13 is refused as a bad request
- [x] 3.4 Test: a colour whose unlock level is above the player's highest completed level is refused, and the previously chosen ball is unchanged
- [x] 3.5 Test: a colour the player has earned is accepted and is returned by `GET /api/v1/players/me` afterwards
- [x] 3.6 Test: a null colour is accepted from any player and clears the choice
- [x] 3.7 Test: a player who has completed level 1 can take colours 1 to 3 and cannot take colour 4
- [x] 3.8 Add `ProfileBallSlice` mapping both routes, reading progress through the player registry actor and writing through the store
- [x] 3.9 Return `ball` from `GET /api/v1/players/me`
- [x] 3.10 Cache the balls table at the edge for a year, as `GET /api/v1/levels/{id}` is

## 4. The client knows its ball

- [x] 4.1 Test: availability is `unlocksAtLevel <= highestCompleted` — nothing available at zero completions, three at one, and a level code raising the ceiling without a completion changes nothing
- [x] 4.2 Add the pure availability function and the balls-table fetch, cached for the session
- [x] 4.3 Add `ball` to `Identity` and carry it through `/players/me`, sign-in and registration
- [x] 4.4 Test: the header ball uses the chosen colour when there is one and the name-derived colour when there is not
- [x] 4.5 Use the chosen colour for the header ball in `App.tsx`

## 5. The picker

- [x] 5.1 Add the colour names and the dimmed locked ball treatment to `client/src/skins/index.ts`, keeping the swirls on the pale colours when dimmed
- [x] 5.2 Test: every one of the thirteen balls is rendered, locked ones dimmed and labelled with the level that earns them
- [x] 5.3 Test: a locked ball cannot be selected and selecting one leaves the account's ball unchanged
- [x] 5.4 Test: choosing an available ball updates what the panel shows immediately
- [x] 5.5 Test: a player with an account and no completions sees what earns the first balls
- [x] 5.6 Test: an anonymous player is shown no picker at all
- [x] 5.7 Build the picker in `AccountPanel.tsx`, with each ball a labelled control and a way back to the name-derived colour
- [x] 5.8 Handle a failed save: say so, leave the previous ball in place, queue nothing

## 6. Nothing announces it

- [x] 6.1 Test: completing a level that earns a new colour shows nothing about profile balls
- [x] 6.2 Test: the account control in the header is identical whether or not unseen colours have been earned

## 7. Integration and visual verification

- [x] 7.1 Run the full server and client test suites
- [x] 7.2 Rebuild the Docker image and bring the stack up on port 8123
- [x] 7.3 Playtest: register, open the panel with no completions, confirm thirteen dimmed balls and the note about level 1
- [x] 7.4 Playtest: complete level 1, reopen the panel, confirm three balls are now takeable and the rest still say their level
- [x] 7.5 Playtest: choose a ball, confirm the header updates, reload the page and confirm it survives
- [x] 7.6 Playtest: log out and back in, confirm the ball returns; confirm the next anonymous session shows the dashed outline and no picker
- [x] 7.7 Check the dimmed treatment on a phone-sized viewport, and that the pale swirled colours are still distinguishable while locked
