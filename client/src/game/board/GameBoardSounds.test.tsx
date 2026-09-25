import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createBoard, type Board } from '../../engine';

const played = vi.hoisted(() => [] as [string, number | undefined][]);

vi.mock('../../sound/sounds', async () => {
  const actual = await vi.importActual<typeof import('../../sound/sounds')>('../../sound/sounds');
  return {
    ...actual,
    playSound: (name: string, level?: number) => {
      if (!actual.isMuted()) played.push([name, level]);
    },
  };
});

const { GameBoard, ALL_CONTROLS } = await import('./GameBoard');
const { useBoardPlay } = await import('./useBoardPlay');
const { setMuted } = await import('../../sound/sounds');

function Harness({ board }: { board: Board }) {
  const game = useBoardPlay({ board, resetKey: 1 });
  return <GameBoard game={game} controls={ALL_CONTROLS} onHome={() => {}} />;
}

function tubes(): HTMLElement[] {
  return screen.getAllByRole('button', { name: /tube/i });
}

function tap(index: number) {
  const el = tubes()[index];
  fireEvent.pointerDown(el, { clientX: 100, clientY: 100, pointerId: 1 });
  fireEvent.pointerUp(el, { clientX: 100, clientY: 100, pointerId: 1 });
}

function drag(from: number, to: number) {
  const source = tubes()[from];
  document.elementFromPoint = vi.fn().mockReturnValue(tubes()[to]);
  fireEvent.pointerDown(source, { clientX: 100, clientY: 100, pointerId: 1 });
  fireEvent.pointerMove(source, { clientX: 100, clientY: 140, pointerId: 1 });
  fireEvent.pointerUp(source, { clientX: 100, clientY: 140, pointerId: 1 });
}

function names() {
  return played.map(([name]) => name);
}

// Tube 0 is finished; 1 and 2 are mixed; 3 is the spare.
const mixed = createBoard([[1, 1, 1], [2, 3, 2], [3, 2, 3], []], 3, 3);
// Pour 1 -> 0 completes flask 0; pour 2 -> 1 then solves the level.
const nearlySolved = createBoard([[1, 1], [2, 2, 1], [2], []], 3, 2);

const originalEfp = document.elementFromPoint;

beforeEach(() => {
  played.length = 0;
  localStorage.clear();
  setMuted(false);
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  document.elementFromPoint = originalEfp;
});

describe('board sounds', () => {
  it('pops when balls are picked up', () => {
    render(<Harness board={mixed} />);

    tap(1);

    expect(names()).toEqual(['pickup']);
  });

  it('is silent when balls are put back down', () => {
    render(<Harness board={mixed} />);

    tap(1);
    tap(1);

    expect(names()).toEqual(['pickup']);
  });

  it('clacks once per pour, pitched by the balls in the receiving flask', () => {
    render(<Harness board={mixed} />);

    tap(1);
    tap(3);

    expect(played).toEqual([['pickup', undefined], ['drop', 1]]);
  });

  it('climbs as a flask fills', () => {
    render(<Harness board={nearlySolved} />);

    tap(1);
    tap(0);

    expect(played.at(-2)).toEqual(['drop', 3]);
  });

  it('blooms when a pour completes a flask', () => {
    render(<Harness board={nearlySolved} />);

    tap(1);
    tap(0);

    expect(names()).toEqual(['pickup', 'drop', 'full']);
  });

  it('runs up the scale instead when the pour solves the level', () => {
    render(<Harness board={nearlySolved} />);

    tap(1);
    tap(0);
    played.length = 0;
    tap(2);
    tap(1);

    expect(names()).toEqual(['pickup', 'drop', 'solved']);
  });

  it('buzzes on a finished flask while holding balls', () => {
    render(<Harness board={mixed} />);

    tap(1);
    tap(0);

    expect(names()).toEqual(['pickup', 'invalid']);
  });

  it('treats a mis-tap that picks up the other flask as a pick-up', () => {
    render(<Harness board={mixed} />);

    tap(1);
    tap(2);

    expect(names()).toEqual(['pickup', 'pickup']);
  });

  it('buzzes when a drag is dropped where it cannot go', () => {
    render(<Harness board={mixed} />);

    drag(1, 2);

    expect(names()).toEqual(['invalid']);
  });

  it('clacks when a drag pours', () => {
    render(<Harness board={mixed} />);

    drag(1, 3);

    expect(names()).toEqual(['drop']);
  });

  it('ticks down on undo, by button and by key', () => {
    render(<Harness board={mixed} />);

    tap(1);
    tap(3);
    tap(2);
    tap(1);
    played.length = 0;

    fireEvent.click(screen.getByRole('button', { name: /undo last move/i }));
    fireEvent.keyDown(document, { key: 'u' });

    expect(names()).toEqual(['undo', 'undo']);
  });

  it('is silent on restart', () => {
    render(<Harness board={mixed} />);

    tap(1);
    tap(3);
    played.length = 0;

    fireEvent.click(screen.getByRole('button', { name: /restart level/i }));
    fireEvent.click(screen.getByRole('button', { name: /^restart$/i }));

    expect(names()).toEqual([]);
  });

  it('plays nothing while muted', () => {
    render(<Harness board={nearlySolved} />);
    act(() => setMuted(true));

    tap(1);
    tap(0);

    expect(played).toEqual([]);
  });
});

describe('sound menu', () => {
  function openMenu() {
    fireEvent.click(screen.getByRole('button', { name: /^sound settings/i }));
    return screen.getByRole('dialog', { name: 'Sound' });
  }

  it('opens from the Sound button with a switch and a volume control', () => {
    render(<Harness board={mixed} />);

    const menu = openMenu();

    expect(within(menu).getByRole('switch', { name: 'Sound' })).toHaveAttribute('aria-checked', 'true');
    expect(within(menu).getByRole('slider', { name: 'Volume' })).toHaveValue('80');
    expect(within(menu).getByText('80%')).toBeInTheDocument();
  });

  it('turns sound off and says so on the button', () => {
    render(<Harness board={mixed} />);

    fireEvent.click(within(openMenu()).getByRole('switch', { name: 'Sound' }));

    expect(screen.getByRole('button', { name: 'Sound settings, sound off' })).toBeInTheDocument();
    expect(localStorage.getItem('gaudi-sound')).toBe('off');
  });

  it('sets and remembers the volume, and plays a sample on release', () => {
    render(<Harness board={mixed} />);
    const slider = within(openMenu()).getByRole('slider', { name: 'Volume' });

    fireEvent.change(slider, { target: { value: '40' } });
    expect(played).toEqual([]);
    fireEvent.pointerUp(slider);

    expect(screen.getByText('40%')).toBeInTheDocument();
    expect(localStorage.getItem('gaudi-sound-volume')).toBe('0.4');
    expect(names()).toEqual(['pickup']);
  });

  it('plays no sample while sound is off', () => {
    render(<Harness board={mixed} />);
    const menu = openMenu();
    fireEvent.click(within(menu).getByRole('switch', { name: 'Sound' }));

    const slider = within(menu).getByRole('slider', { name: 'Volume' });
    fireEvent.change(slider, { target: { value: '60' } });
    fireEvent.pointerUp(slider);

    expect(played).toEqual([]);
  });

  it('closes on Escape without leaving the level', async () => {
    const onHome = vi.fn();
    function WithHome() {
      const game = useBoardPlay({ board: mixed, resetKey: 1 });
      return <GameBoard game={game} controls={ALL_CONTROLS} onHome={onHome} />;
    }
    render(<WithHome />);
    openMenu();

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Sound' })).not.toBeInTheDocument());
    expect(onHome).not.toHaveBeenCalled();
  });

  it('closes on a tap outside it', async () => {
    render(<Harness board={mixed} />);
    openMenu();

    fireEvent.pointerDown(document.body);

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Sound' })).not.toBeInTheDocument());
  });

  it('still turns sound on and off with M', () => {
    render(<Harness board={mixed} />);

    fireEvent.keyDown(document, { key: 'm' });

    expect(screen.getByRole('button', { name: 'Sound settings, sound off' })).toBeInTheDocument();
  });
});
