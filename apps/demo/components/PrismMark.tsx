// Prism brand mark: a white ray enters from the left, refracts through a white prism, and
// exits as a VIBGYOR spectrum on the right.
export function PrismMark({ size = 40, animated = false }: { size?: number; animated?: boolean }) {
  const spectrum = ["#8b5cf6", "#6366f1", "#38bdf8", "#34d399", "#fbbf24", "#fb923c", "#f87171"];
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-label="Prism">
      {/* incoming white ray */}
      <line x1="2" y1="50" x2="40" y2="50" stroke="#fff" strokeWidth="2.5" className={animated ? "animate-ray-pan" : ""} />
      {/* prism */}
      <path d="M50 18 L82 74 L18 74 Z" stroke="#fff" strokeWidth="2.5" strokeLinejoin="round" fill="rgba(255,255,255,0.04)" />
      {/* refracted spectrum */}
      {spectrum.map((c, i) => {
        const y = 40 + i * 5.2;
        return <line key={c} x1="56" y1="56" x2="98" y2={y} stroke={c} strokeWidth="2.2" strokeLinecap="round" opacity={0.95} />;
      })}
    </svg>
  );
}
