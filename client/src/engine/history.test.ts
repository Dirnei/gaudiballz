import { describe, expect, it } from 'vitest';
import { createBoard } from './board';
import { play, playGroup, restart, startGame, undo } from './history';

// Two full tubes with red (1) on top, one full tube of mixed colours, two spares.
const board = createBoard([[2, 3, 1], [3, 2, 1], [2, 3, 1], [], []], 3, 3);

describe('grouped history', () => {
  it('still undoes a single move on its own', () => {
    const state = play(play(startGame(board), { from: 0, to: 3 }), { from: 1, to: 3 });

    const back = undo(state);

    expect(back.moves).toEqual([{ from: 0, to: 3 }]);
    expect(back.board).toEqual(play(startGame(board), { from: 0, to: 3 }).board);
  });

  it('records a group move by move but undoes it as one step', () => {
    const moves = [{ from: 0, to: 3 }, { from: 1, to: 3 }, { from: 2, to: 3 }];
    const state = playGroup(startGame(board), moves);

    expect(state.moves).toEqual(moves);
    expect(state.board.tubes[3]).toEqual([1, 1, 1]);

    const back = undo(state);

    expect(back.moves).toEqual([]);
    expect(back.board).toEqual(board);
    expect(back.history).toEqual([]);
  });

  it('undoes only the last step when a single move follows a group', () => {
    const grouped = playGroup(startGame(board), [{ from: 0, to: 3 }, { from: 1, to: 3 }]);
    const state = play(grouped, { from: 2, to: 3 });

    expect(undo(state)).toEqual(grouped);
    expect(undo(undo(state)).board).toEqual(board);
  });

  it('plays nothing when any move in the group is illegal', () => {
    const start = startGame(board);
    // The second move pours red onto an empty tube that the first just filled: fine. The
    // third pours from an empty tube: illegal.
    const state = playGroup(start, [{ from: 0, to: 3 }, { from: 1, to: 3 }, { from: 4, to: 3 }]);

    expect(state).toBe(start);
  });

  it('restart still returns to the very first board', () => {
    const state = playGroup(startGame(board), [{ from: 0, to: 3 }, { from: 1, to: 3 }]);

    expect(restart(state).board).toEqual(board);
  });
});
