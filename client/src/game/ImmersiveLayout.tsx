import { Outlet } from 'react-router-dom';

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
      {/* Soft colour bloom behind the board */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/4 h-64 opacity-45 blur-3xl"
        style={{
          background:
            'radial-gradient(40% 60% at 25% 50%, rgba(56,189,248,0.35), transparent 70%),' +
            'radial-gradient(40% 60% at 75% 50%, rgba(168,85,247,0.30), transparent 70%)',
        }}
      />
      <Outlet />
    </div>
  );
}
