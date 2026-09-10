import { createBrowserRouter, Navigate, RouterProvider, type RouteObject } from 'react-router-dom';
import { GameProvider } from './GameContext';
import { AppShell } from './AppShell';
import { ImmersiveLayout } from './ImmersiveLayout';
import { MainMenu } from './MainMenu';
import { LevelSelect } from './LevelSelect';
import { AchievementsScreen } from './AchievementsScreen';
import { GameScreen } from './GameScreen';
import { Impressum } from './Impressum';
import { Datenschutz } from './Datenschutz';
import { LeaderboardPage } from './LeaderboardPage';
import { StatsPage } from './StatsPage';
import { ErrorFallback } from './ErrorFallback';

export const routes: RouteObject[] = [
  {
    element: <AppShell />,
    errorElement: <ErrorFallback />,
    children: [
      { index: true, element: <MainMenu /> },
      { path: 'levels', element: <LevelSelect /> },
      { path: 'achievements', element: <AchievementsScreen /> },
      { path: 'leaderboard', element: <LeaderboardPage /> },
      { path: 'stats', element: <StatsPage /> },
      { path: 'impressum', element: <Impressum /> },
      { path: 'datenschutz', element: <Datenschutz /> },
    ],
  },
  {
    element: <ImmersiveLayout />,
    errorElement: <ErrorFallback />,
    children: [
      { path: 'play', element: <GameScreen /> },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
];

const router = createBrowserRouter(routes);

export function App() {
  return (
    <GameProvider>
      <RouterProvider router={router} />
    </GameProvider>
  );
}
