import { MotionConfig } from 'motion/react';
import { createBrowserRouter, Navigate, Outlet, RouterProvider, type RouteObject } from 'react-router-dom';
import { GameProvider } from './GameContext';
import { AppShell } from './AppShell';
import { ImmersiveLayout } from './ImmersiveLayout';
import { MainMenu } from './MainMenu';
import { LevelSelect } from './LevelSelect';
import { AchievementsScreen } from './AchievementsScreen';
import { GameScreen } from './GameScreen';
import { TutorialScreen } from './TutorialScreen';
import { DailyScreen } from './DailyScreen';
import { Impressum } from './Impressum';
import { Datenschutz } from './Datenschutz';
import { LeaderboardPage } from './LeaderboardPage';
import { StatsPage } from './StatsPage';
import { ChangelogPage } from './ChangelogPage';
import { SharedResultPage } from './SharedResultPage';
import { ErrorFallback } from './ErrorFallback';

/**
 * Every screen follows the system's reduced-motion setting: Motion skips slides, springs, lifts
 * and pops (fades stay) while it is on, and picks the change up live. One root route rather than
 * a flag in each animated component, so an animation added later can't forget it.
 */
function MotionRoot() {
  return (
    <MotionConfig reducedMotion="user">
      <Outlet />
    </MotionConfig>
  );
}

export const routes: RouteObject[] = [
  {
    element: <MotionRoot />,
    children: [
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
          { path: 'changelog', element: <ChangelogPage /> },
          { path: 'r/:id', element: <SharedResultPage /> },
        ],
      },
      {
        element: <ImmersiveLayout />,
        errorElement: <ErrorFallback />,
        children: [
          { path: 'play', element: <GameScreen /> },
          { path: 'tutorial', element: <TutorialScreen /> },
          { path: 'daily', element: <DailyScreen /> },
        ],
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
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
