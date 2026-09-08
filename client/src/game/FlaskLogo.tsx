import { useId } from 'react';

interface FlaskLogoProps {
  readonly className?: string;
}

export function FlaskLogo({ className = 'h-12 w-auto' }: FlaskLogoProps) {
  const id = useId();
  const liq = `${id}-liq`;
  const clip = `${id}-clip`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 84 116"
      fill="none"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id={liq} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9333EA" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#6D28D9" stopOpacity="0.9" />
        </linearGradient>
        <clipPath id={clip}>
          <path d="M32,36 L8,100 Q6,110 16,110 L68,110 Q78,110 76,100 L52,36 Z" />
        </clipPath>
      </defs>
      <g transform="translate(0, 2)">
        {/* Flask outline */}
        <path
          d="M35,2 L35,32 L32,36 L8,100 Q6,110 16,110 L68,110 Q78,110 76,100 L52,36 L49,32 L49,2"
          stroke="currentColor"
          strokeOpacity="0.38"
          strokeWidth="2.2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Neck rim */}
        <line
          x1="33" y1="2" x2="51" y2="2"
          stroke="currentColor"
          strokeOpacity="0.45"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {/* Liquid (clipped to flask body) */}
        <g clipPath={`url(#${clip})`}>
          <path d="M8,58 Q22,52 42,58 Q62,64 76,58 L76,110 L8,110 Z" fill={`url(#${liq})`} />
          <circle cx="30" cy="90" r="16" fill="#3B82F6" opacity="0.6" />
          <circle cx="54" cy="90" r="16" fill="#2563EB" opacity="0.55" />
          <ellipse cx="24" cy="84" rx="5" ry="3" fill="rgba(255,255,255,0.15)" transform="rotate(-20 24 84)" />
          <ellipse cx="48" cy="84" rx="5" ry="3" fill="rgba(255,255,255,0.15)" transform="rotate(-20 48 84)" />
        </g>
        {/* Bubbles */}
        <circle cx="38" cy="68" r="2.5" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
        <circle cx="44" cy="55" r="1.8" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8" />
        <circle cx="34" cy="48" r="1.2" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.7" />
        {/* Glass highlight */}
        <line x1="20" y1="60" x2="14" y2="95" stroke="rgba(255,255,255,0.08)" strokeWidth="3" strokeLinecap="round" />
      </g>
    </svg>
  );
}
