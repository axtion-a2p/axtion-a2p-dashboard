export function CommandCenterMark({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* left peak (blue) */}
      <path d="M100 15 L18 185 L100 185 L100 90 Z" fill="#7FB8DC" />
      <path d="M100 15 L100 90 L100 185 L128 185 Z" fill="#4E86B8" />
      {/* right peak (taupe/brown) */}
      <path d="M100 15 L182 185 L100 185 L100 90 Z" fill="#8C7A68" />
      <path d="M100 15 L100 90 L100 185 L72 185 Z" fill="#6B5B4C" />
      {/* lightning bolt (green) */}
      <path d="M118 0 L78 108 L100 108 L88 175 L146 90 L116 90 Z" fill="#5CC65F" />
      <path d="M118 0 L100 90 L88 175 L146 90 L116 90 Z" fill="#3B8C3E" />
    </svg>
  );
}
