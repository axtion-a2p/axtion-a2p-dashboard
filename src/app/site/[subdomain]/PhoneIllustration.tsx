/** Decorative hero graphic: an abstract phone/chat mockup, no client-specific content. */
export function PhoneIllustration() {
  return (
    <svg viewBox="0 0 320 420" className="w-full" aria-hidden="true">
      <rect x="40" y="10" width="240" height="400" rx="36" className="fill-slate-900" />
      <rect x="56" y="38" width="208" height="344" rx="20" className="fill-slate-50" />
      <rect x="140" y="22" width="40" height="8" rx="4" className="fill-slate-700" />

      <circle cx="82" cy="66" r="12" className="fill-blue-600" />
      <rect x="102" y="60" width="70" height="6" rx="3" className="fill-slate-300" />
      <rect x="102" y="72" width="46" height="5" rx="2.5" className="fill-slate-200" />
      <line x1="56" y1="92" x2="264" y2="92" className="stroke-slate-200" strokeWidth="1" />

      <rect x="70" y="112" width="150" height="66" rx="14" className="fill-blue-50" />
      <rect x="84" y="126" width="120" height="7" rx="3.5" className="fill-blue-200" />
      <rect x="84" y="140" width="100" height="7" rx="3.5" className="fill-blue-200" />
      <rect x="84" y="154" width="70" height="7" rx="3.5" className="fill-blue-200" />

      <rect x="70" y="190" width="182" height="30" rx="10" className="fill-slate-100" />
      <rect x="82" y="200" width="150" height="6" rx="3" className="fill-slate-300" />

      <rect x="140" y="234" width="80" height="34" rx="14" className="fill-slate-900" />
      <rect x="152" y="246" width="56" height="7" rx="3.5" className="fill-slate-500" />

      <rect x="70" y="344" width="150" height="24" rx="12" className="fill-white stroke-slate-200" strokeWidth="1" />
      <circle cx="238" cy="356" r="14" className="fill-blue-600" />
      <path
        d="M233 356 L243 356 M239 351 L244 356 L239 361"
        className="stroke-white"
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <circle cx="256" cy="46" r="20" className="fill-emerald-500" />
      <path
        d="M247 46 L253 52 L265 40"
        className="stroke-white"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
