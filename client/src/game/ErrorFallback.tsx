import { useTranslation } from 'react-i18next';
import { useRouteError, isRouteErrorResponse } from 'react-router-dom';

function errorMessage(error: unknown): string {
  if (isRouteErrorResponse(error)) return `${error.status} ${error.statusText}`;
  if (error instanceof Error) return error.message;
  return String(error);
}

export function ErrorFallback() {
  const { t } = useTranslation();
  const error = useRouteError();

  return (
    <div
      className="flex min-h-screen w-full items-center justify-center px-6"
      style={{
        background:
          'radial-gradient(120% 80% at 50% -10%, #1e2b52 0%, #101833 42%, #070b16 100%)',
      }}
    >
      <div className="max-w-sm text-center">
        <p className="text-5xl" aria-hidden>💥</p>

        <h1
          className="mt-4 text-2xl font-bold text-white"
          style={{ fontFamily: "'Fredoka', system-ui, sans-serif" }}
        >
          {t('error.title')}
        </h1>

        <p className="mt-2 text-slate-400">
          {t('error.body')}
        </p>

        <a
          href="/"
          className="mt-6 inline-block rounded-2xl bg-violet-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-400"
          style={{ fontFamily: "'Fredoka', system-ui, sans-serif" }}
        >
          {t('error.backToMenu')}
        </a>

        {import.meta.env.DEV && (
          <details className="mt-8 rounded-xl bg-white/5 p-4 text-left text-xs text-slate-500">
            <summary className="cursor-pointer select-none text-slate-400">
              {t('error.details')}
            </summary>
            <pre className="mt-2 whitespace-pre-wrap break-words">
              {errorMessage(error)}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
