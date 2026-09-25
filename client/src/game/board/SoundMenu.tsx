import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { playSound } from '../../sound/sounds';

interface SoundMenuProps {
  readonly muted: boolean;
  readonly volume: number;
  readonly onToggle: () => void;
  readonly onVolume: (volume: number) => void;
}

/**
 * The sound switch and volume, in a small panel above the Sound button so a player can change
 * them mid-level without leaving the board. Opening, closing and Escape are the board's job;
 * this only draws the two controls.
 */
export function SoundMenu({ muted, volume, onToggle, onVolume }: SoundMenuProps) {
  const { t } = useTranslation();
  const percent = Math.round(volume * 100);

  // On release rather than on every step, so dragging the thumb doesn't fire a stream of pops.
  const sample = () => playSound('pickup');

  return (
    <motion.div
      role="dialog"
      aria-label={t('game.sound')}
      initial={{ opacity: 0, y: 6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 520, damping: 34 }}
      className="absolute bottom-full right-0 z-30 mb-3 w-60 rounded-2xl bg-slate-800/95 p-4 text-left shadow-2xl ring-1 ring-white/10 backdrop-blur"
    >
      <div className="flex items-center justify-between gap-3">
        <span id="sound-switch-label" className="text-sm font-semibold text-slate-100">{t('game.sound')}</span>
        <button
          type="button"
          role="switch"
          aria-checked={!muted}
          aria-labelledby="sound-switch-label"
          onClick={onToggle}
          className={`relative h-6 w-11 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
            muted ? 'bg-slate-600' : 'bg-violet-500'
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left] ${muted ? 'left-0.5' : 'left-[1.375rem]'}`}
          />
        </button>
      </div>

      <label htmlFor="sound-volume" className="mt-4 flex items-center justify-between text-xs font-medium uppercase tracking-wider text-slate-400">
        {t('game.volume')}
        <span className="tabular-nums text-slate-200">{percent}%</span>
      </label>
      <input
        id="sound-volume"
        type="range"
        min={0}
        max={100}
        step={5}
        value={percent}
        aria-label={t('game.volume')}
        onChange={(e) => onVolume(Number(e.target.value) / 100)}
        onPointerUp={sample}
        onKeyUp={sample}
        className={`mt-2 w-full accent-violet-500 ${muted ? 'opacity-50' : ''}`}
      />
    </motion.div>
  );
}
