import { useTranslation } from 'react-i18next';

const LOCALES = ['en', 'de'] as const;

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  return (
    <span className="inline-flex gap-0.5 rounded-full bg-white/6 p-0.5 text-[0.65rem] font-semibold ring-1 ring-white/8">
      {LOCALES.map((lng) => (
        <button
          key={lng}
          type="button"
          onClick={() => void i18n.changeLanguage(lng)}
          className={
            'rounded-full px-2 py-0.5 uppercase transition-colors ' +
            (i18n.language === lng
              ? 'bg-violet-500/20 text-violet-300'
              : 'text-slate-500 hover:text-slate-300')
          }
        >
          {lng}
        </button>
      ))}
    </span>
  );
}
