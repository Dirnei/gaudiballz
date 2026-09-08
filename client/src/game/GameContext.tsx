import { createContext, useContext, type ReactNode } from 'react';
import { useGame } from './useGame';

export type GameContextValue = ReturnType<typeof useGame>;

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const game = useGame();
  return <GameContext value={game}>{children}</GameContext>;
}

export function useGameContext(): GameContextValue {
  const ctx = useContext(GameContext);
  if (ctx === null) {
    throw new Error('useGameContext must be used within a GameProvider');
  }
  return ctx;
}
