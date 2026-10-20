/** Decorative Bloom, adapted from React Bits Shape Magic's six-petal preset. See THIRD_PARTY_NOTICES.md. */
export function BloomShape({ className = '' }: { className?: string }) {
  return <svg viewBox="0 0 64 64" fill="currentColor" aria-hidden="true" className={className}>
    {Array.from({ length: 6 }, (_, index) => <ellipse key={index} cx="32" cy="19" rx="9" ry="15" transform={`rotate(${index * 60} 32 32)`} />)}
    <circle cx="32" cy="32" r="12" /><circle cx="32" cy="32" r="4" fill="var(--background)" />
  </svg>;
}
