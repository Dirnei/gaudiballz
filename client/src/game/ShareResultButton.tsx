import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { copyText } from './clipboard';

interface ShareResultButtonProps {
  /** Builds the text when pressed, so the time read is the final one. */
  readonly text: () => string;
}

/** Copies the result text to paste anywhere; never a share sheet that picks the app for you. */
export function ShareResultButton({ text }: ShareResultButtonProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <button
      type="button"
      onClick={() => void copyText(text()).then(() => setCopied(true))}
      className="mt-2 w-full rounded-2xl bg-white/8 px-4 py-2.5 text-sm font-semibold text-amber-300 ring-1 ring-white/10"
    >
      {copied ? t('game.copied') : t('game.share')}
    </button>
  );
}
