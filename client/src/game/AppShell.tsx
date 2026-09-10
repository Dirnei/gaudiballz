import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { FlaskLogo } from './FlaskLogo';
import { AccountBall } from './AccountBall';
import { AccountPanel } from './AccountPanel';
import { BackgroundBloom } from './BackgroundBloom';
import { useGameContext } from './GameContext';
import { useHeartbeat } from './useHeartbeat';

export function AppShell() {
  const game = useGameContext();
  useHeartbeat();
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
            className="hidden text-lg font-bold tracking-tight text-white sm:inline"
            style={{ fontFamily: "'Fredoka', system-ui, sans-serif" }}
          >
            Gaudi Ballz
          </span>
        </Link>

        <nav className="ml-4 flex gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {[
            { to: '/', label: 'Home' },
            { to: '/leaderboard', label: 'Leaderboard' },
            { to: '/stats', label: 'Your Stats' },
          ].map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                'whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors ' +
                (isActive
                  ? 'bg-violet-500/15 text-violet-300'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200')
              }
              style={{ fontFamily: "'Fredoka', system-ui, sans-serif" }}
            >
              {label}
            </NavLink>
          ))}
        </nav>

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
        <span aria-hidden>·</span>
        <a
          href="https://ko-fi.com/dirnei"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 transition-colors hover:text-slate-300"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
            <path d="M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.723c-.604 0-.679.798-.679.798s-.082 7.324-.022 11.822c.164 2.424 2.586 2.672 2.586 2.672s8.267-.023 11.966-.049c2.438-.426 2.683-2.566 2.658-3.734 4.352.24 7.422-2.831 6.649-6.916zm-11.062 3.511c-1.246 1.453-4.011 3.976-4.011 3.976s-.121.119-.31.023c-.076-.057-.108-.09-.108-.09-.443-.441-3.368-3.049-4.034-3.954-.709-.965-1.041-2.7-.091-3.71.951-1.01 3.005-1.086 4.363.407 0 0 1.565-1.782 3.468-.963 1.904.82 1.832 3.011.723 4.311zm6.173.478c-.928.116-1.682.028-1.682.028V7.284h1.77s1.971.551 1.971 2.638c0 1.913-.985 2.667-2.059 3.015z" />
          </svg>
          Ko-fi
        </a>
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
