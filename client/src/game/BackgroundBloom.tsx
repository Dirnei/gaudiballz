export function BackgroundBloom() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-45 blur-3xl"
      style={{
        background:
          'radial-gradient(40% 60% at 25% 50%, rgba(56,189,248,0.35), transparent 70%),' +
          'radial-gradient(40% 60% at 75% 50%, rgba(168,85,247,0.30), transparent 70%)',
        animation: 'bloom-drift 20s ease-in-out infinite',
        willChange: 'transform',
        contain: 'strict',
      }}
    />
  );
}
