import { Outlet } from 'react-router-dom';
import { BackgroundBloom } from './BackgroundBloom';

export function ImmersiveLayout() {
  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        background:
          'radial-gradient(120% 80% at 50% -10%, #1e2b52 0%, #101833 42%, #070b16 100%)',
      }}
    >
      <BackgroundBloom />
      <Outlet />
    </div>
  );
}
