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

export const routes: RouteObject[] = [
  {
    element: <AppShell />,
    children: [
      { index: true, element: <MainMenu /> },
      { path: 'levels', element: <LevelSelect /> },
      { path: 'achievements', element: <AchievementsScreen /> },
      { path: 'impressum', element: <Impressum /> },
      { path: 'datenschutz', element: <Datenschutz /> },
    ],
  },
  {
    element: <ImmersiveLayout />,
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
