## Why

Anonymous players store their progress in localStorage and on the server under a disposable anonymous identity. If they clear browser data or switch devices, both are lost and they start from level 1 with no way back. Authenticated players recover via passkey sign-in, but that requires having enrolled — which is optional by design. A level code gives anonymous players a low-friction way to resume where they left off, and level gating makes the code meaningful by preventing players from simply tapping "next" to any level.

## What Changes

- **Level gating**: Players can only access levels up to their highest completed level + 1. The prev/next navigation buttons enforce this ceiling. The gate is derived from the maximum of server-side progress, locally stored progress, and any code-based unlock.
- **Level codes**: Each level has a short, deterministic alphanumeric code. The code for the player's current level is displayed in the UI. Entering a valid code unlocks all levels up to and including that level's number.
- **Code entry UI**: A text input (accessible from the level header or account area) where a player can type a level code to unlock levels.
- **Migration**: Existing players whose server-side `highestCompleted` already reflects their progress are unaffected — gating uses their existing progress as the ceiling. No progress is lost.

## Capabilities

### New Capabilities

- `level-codes`: Covers the level code scheme (generation, validation, format), the code entry flow, and how a code-based unlock interacts with the level gate.

### Modified Capabilities

- `level-progression`: Adds the level-gating requirement — players can no longer freely navigate beyond their highest completed level + 1. The gate considers server progress, local progress, and code-based unlocks.

## Impact

- **Client engine**: No changes to rules, solver, or board logic.
- **Client UI** (`App.tsx`): Prev/next buttons enforce the gate ceiling. Level code is displayed near the level indicator. A code-entry input is added.
- **Client hook** (`useGame.ts`): `goToLevel` enforces the gate. A new `unlockedLevel` value is computed from `max(highestCompleted, localUnlock)`. Level code generation/validation logic added.
- **Server**: Level code generation runs on the server (same deterministic seed-based approach as level generation) so that codes cannot be reverse-engineered from client-side source. A new endpoint validates a code and returns the level it unlocks.
- **No changes** to the rules engine, conformance fixtures, or the completion/progress API.
