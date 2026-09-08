import { useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { FlaskLogo } from './FlaskLogo';
import { AccountBall } from './AccountBall';
import { AccountPanel } from './AccountPanel';
import { BackgroundBloom } from './BackgroundBloom';
import { useGameContext } from './GameContext';

export function AppShell() {
  const game = useGameContext();
  const [accountOpen, setAccountOpen] = useState(false);

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

      <header className="relative z-10 flex items-center gap-3 px-5 pt-3 pb-2">
        <Link to="/" className="flex items-center gap-2" aria-label="Gaudi Ballz home">
          <FlaskLogo className="h-8 w-auto text-slate-200" />
          <span
            className="text-lg font-bold tracking-tight text-white"
            style={{ fontFamily: "'Fredoka', system-ui, sans-serif" }}
          >
            Gaudi Ballz
          </span>
        </Link>

        <div className="ml-auto">
          <button
            type="button"
            aria-label={
              game.identity !== null && !game.identity.isAnonymous
                ? `Logged in as ${game.identity.username ?? 'your account'}`
                : 'Not logged in — log in or register'
            }
            onClick={() => {
              setAccountOpen(true);
              void game.ensureBallUnlocks();
              void game.ensureAchievements();
            }}
            className="flex items-center gap-1.5 rounded-full bg-white/8 py-1.5 pl-2.5 pr-3 text-sm text-slate-300 ring-1 ring-white/10"
          >
            <AccountBall identity={game.identity} />
            <span className="max-w-[7rem] truncate">
              {game.identity !== null && !game.identity.isAnonymous
                ? (game.identity.username ?? 'Account')
                : 'Log in'}
            </span>
          </button>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col">
        <Outlet />
      </div>

      <footer className="relative z-10 flex items-center justify-center gap-4 px-5 pb-3 pt-2 text-xs text-slate-500">
        <Link to="/impressum" className="transition-colors hover:text-slate-300">
          Impressum
        </Link>
        <span aria-hidden>·</span>
        <Link to="/datenschutz" className="transition-colors hover:text-slate-300">
          Datenschutz
        </Link>
      </footer>

      <AccountPanel
        open={accountOpen}
        identity={game.identity}
        onClose={() => setAccountOpen(false)}
        onLoggedIn={(who) => {
          setAccountOpen(false);
          void game.loggedIn(who);
        }}
        onRegistered={(username) => {
          setAccountOpen(false);
          game.registered(username);
        }}
        onLogOut={() => {
          setAccountOpen(false);
          void game.logOut();
        }}
        ballUnlocks={game.ballUnlocks}
        highestCompleted={game.progress?.highestCompleted ?? 0}
        onChooseBall={game.chooseBall}
      />
    </div>
  );
}
