import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';

interface PageHeaderProps {
  readonly title: string;
  readonly trailing?: ReactNode;
}

export function PageHeader({ title, trailing }: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="flex items-center gap-3 px-5 pt-3">
      <motion.button
        type="button"
        aria-label="Back to menu"
        whileTap={{ scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 700, damping: 26 }}
        onClick={() => navigate('/')}
        className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/8 text-slate-200 ring-1 ring-white/10"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
          <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
        </svg>
      </motion.button>
      <h1 className="text-lg font-semibold tracking-tight text-white">{title}</h1>
      {trailing && <div className="ml-auto">{trailing}</div>}
    </header>
  );
}
