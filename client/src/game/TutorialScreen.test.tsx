import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const { TutorialScreen } = await import('./TutorialScreen');

function setup() {
  render(
    <MemoryRouter>
      <TutorialScreen />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  mockNavigate.mockClear();
});

describe('tutorial prompts', () => {
  it('shows the pick-source prompt on entry', () => {
    setup();
    expect(screen.getByTestId('tutorial-prompt').textContent).toMatch(/tap a tube/i);
  });

  it('advances to pick-target after tapping a non-empty tube', () => {
    setup();
    const tubes = screen.getAllByRole('button', { name: /tube/i });
    fireEvent.click(tubes[0]);

    expect(screen.getByTestId('tutorial-prompt').textContent).toMatch(/another tube/i);
  });

  it('advances to free-play after completing first pour', () => {
    setup();
    const tubes = screen.getAllByRole('button', { name: /tube/i });
    fireEvent.click(tubes[0]);
    fireEvent.click(tubes[2]);

    expect(screen.getByTestId('tutorial-prompt').textContent).toMatch(/sort all/i);
  });
});

describe('skip button', () => {
  it('navigates to /play when skip is clicked', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /skip/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/play');
  });

  it('marks the tutorial as seen', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /skip/i }));

    expect(localStorage.getItem('puzzle.tutorialSeen')).toBe('1');
  });
});

describe('completion', () => {
  function solveTutorial() {
    setup();
    const tubes = () => screen.getAllByRole('button', { name: /tube/i });

    // The board is [[1,2,1],[2,1,2],[]]
    // Pour tube 0 -> tube 2 (move colour 1 to empty)
    fireEvent.click(tubes()[0]);
    fireEvent.click(tubes()[2]);
    // Board: [[1,2],[2,1,2],[1]]

    // Pour tube 1 -> tube 0 (move colour 2 onto 2)
    fireEvent.click(tubes()[1]);
    fireEvent.click(tubes()[0]);
    // Board: [[1,2,2],[1,2],[1]]

    // Pour tube 1 -> tube 2 (move colour 2 onto... wait, tube 2 has colour 1)
    // Let me trace more carefully:
    // Initial: tube0=[1,2,1] tube1=[2,1,2] tube2=[]
    // Move: tube0 top=1 -> tube2 (empty, accepts): tube0=[1,2] tube1=[2,1,2] tube2=[1]
    // Move: tube1 top=2 -> tube0 (top=2, matches): tube0=[1,2,2] tube1=[2,1] tube2=[1]
    // Move: tube1 top=1 -> tube2 (top=1, matches): tube0=[1,2,2] tube1=[2] tube2=[1,1]
    fireEvent.click(tubes()[1]);
    fireEvent.click(tubes()[2]);
    // Board: [[1,2,2],[2],[1,1]]

    // Move: tube0 top run=2,2 -> tube1 (top=2, matches, 2 fit): tube0=[1] tube1=[2,2,2] tube2=[1,1]
    fireEvent.click(tubes()[0]);
    fireEvent.click(tubes()[1]);
    // Board: [[1],[2,2,2],[1,1]] - tube1 done!

    // Move: tube0 top=1 -> tube2 (top=1, matches): tube0=[] tube1=[2,2,2] tube2=[1,1,1] - solved!
    fireEvent.click(tubes()[0]);
    fireEvent.click(tubes()[2]);
  }

  it('shows the success overlay when solved', () => {
    solveTutorial();
    expect(screen.getByText('You got it!')).toBeInTheDocument();
  });

  it('marks the tutorial as seen on completion', () => {
    solveTutorial();
    expect(localStorage.getItem('puzzle.tutorialSeen')).toBe('1');
  });

  it('navigates to /play when continue is clicked', () => {
    solveTutorial();
    fireEvent.click(screen.getByTestId('tutorial-continue'));
    expect(mockNavigate).toHaveBeenCalledWith('/play');
  });
});
