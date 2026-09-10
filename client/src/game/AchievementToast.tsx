import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface AchievementToastProps {
  readonly achievements: readonly { readonly id: string; readonly name: string }[];
  readonly onDone: () => void;
}

export function AchievementToast({ achievements, onDone }: AchievementToastProps) {
  const { t } = useTranslation();
  const items = achievements ?? [];
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(items.length > 0);

  useEffect(() => {
    if (items.length === 0) {
      return undefined;
    }

    setCurrent(0);
    setVisible(true);
  }, [items]);

  useEffect(() => {
    if (!visible) {
      return undefined;
    }

    const timer = setTimeout(() => {
      if (current + 1 < items.length) {
        setCurrent((c) => c + 1);
      } else {
        setVisible(false);
        onDone();
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [visible, current, items, onDone]);

  const achievement = items[current];

  return (
    <AnimatePresence>
      {visible && achievement && (
        <motion.div
          key={achievement.id}
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 420, damping: 30 }}
          className="pointer-events-none absolute inset-x-0 top-16 z-40 flex justify-center px-6"
        >
          <div className="flex items-center gap-2.5 rounded-2xl bg-amber-500/15 px-4 py-3 shadow-xl ring-1 ring-amber-400/30 backdrop-blur">
            <span className="text-lg">🏆</span>
            <div>
              <p className="text-sm font-semibold text-amber-200">{achievement.name}</p>
              <p className="text-xs text-amber-300/70">{t('achievements.unlocked')}</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
