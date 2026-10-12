/**
 * Variant C, "Summit": the greatest, standing on the number-one step. A sun
 * halo, three ridges and a three-step podium, with the goat in silhouette and
 * a gold rim light. The most literal of the three: it says what the app is for.
 */

const GOAT =
  'M36 120C56 100 106 94 158 96C190 96 208 88 222 68C230 56 232 46 240 38C250 30 262 36 272 52C280 62 292 66 294 74C294 82 284 88 274 88C270 100 272 112 266 126C258 114 252 106 244 102C238 124 234 142 230 160C228 190 226 220 228 250L206 250C208 220 206 196 200 172C180 168 150 166 128 170C124 200 124 226 128 250L104 250C102 220 98 196 86 178C70 166 52 150 44 138C36 132 32 126 36 120Z';
const HORN = 'M244 40C238 10 214 -10 184 -16C205 -2 222 18 232 44Z';
const HORN_2 = 'M250 36C250 6 232 -14 206 -26C224 -8 236 14 240 40Z';
const EAR = 'M246 46L220 54L244 60Z';
const TAIL = 'M40 118L22 100L36 118Z';

export function GoatSummit({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 1200 800" fill="none" preserveAspectRatio="xMaxYMax slice" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="gs-sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffe3a1" stopOpacity="0.9" />
          <stop offset="0.35" stopColor="#e9c46a" stopOpacity="0.45" />
          <stop offset="1" stopColor="#e9c46a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="gs-ridge-1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a2f55" />
          <stop offset="1" stopColor="#0c0e17" />
        </linearGradient>
        <linearGradient id="gs-ridge-2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1a1d38" />
          <stop offset="1" stopColor="#0c0e17" />
        </linearGradient>
        <linearGradient id="gs-step" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2b2f4d" />
          <stop offset="1" stopColor="#10121f" />
        </linearGradient>
      </defs>

      {/* Sun and halo behind the summit */}
      <circle cx="800" cy="330" r="360" fill="url(#gs-sun)" />
      <circle cx="800" cy="330" r="190" stroke="#e9c46a" strokeOpacity="0.5" strokeWidth="1.5" />
      <circle cx="800" cy="330" r="250" stroke="#e9c46a" strokeOpacity="0.22" strokeWidth="1" strokeDasharray="3 9" className="gb-spin" />

      {/* Ridges */}
      <path d="M0 640L150 520L260 590L420 450L560 560L700 480L860 580L1010 500L1200 600V800H0Z" fill="url(#gs-ridge-2)" />
      <path d="M0 700L180 600L320 660L520 540L680 640L820 570L1000 650L1200 580V800H0Z" fill="url(#gs-ridge-1)" />

      {/* Podium: 2, 1, 3 */}
      <g>
        <path d="M470 640H690V800H470Z" fill="url(#gs-step)" stroke="#ffe3a1" strokeOpacity="0.25" />
        <path d="M690 560H940V800H690Z" fill="url(#gs-step)" stroke="#ffe3a1" strokeOpacity="0.5" />
        <path d="M940 680H1130V800H940Z" fill="url(#gs-step)" stroke="#ffe3a1" strokeOpacity="0.25" />
        <path d="M690 560H940" stroke="#ffe3a1" strokeWidth="3" />
        <text x="815" y="700" textAnchor="middle" fontSize="110" fontWeight="900" fill="#e9c46a" fillOpacity="0.9" fontFamily="var(--display)">
          1
        </text>
        <text x="580" y="740" textAnchor="middle" fontSize="70" fontWeight="900" fill="#9198b0" fillOpacity="0.7" fontFamily="var(--display)">
          2
        </text>
        <text x="1035" y="760" textAnchor="middle" fontSize="60" fontWeight="900" fill="#9198b0" fillOpacity="0.6" fontFamily="var(--display)">
          3
        </text>
      </g>

      {/* The goat, standing on the number-one step (a 300 by 250 drawing, scaled to the step) */}
      <g transform="translate(666 335) scale(0.9)">
        <g fill="#06070c" stroke="#ffe3a1" strokeWidth="1.4" strokeLinejoin="round" strokeOpacity="0.85">
          <path d={TAIL} />
          <path d={GOAT} />
          <path d={HORN} />
          <path d={HORN_2} />
          <path d={EAR} />
        </g>
        <path d="M244 40C238 10 214 -10 184 -16" stroke="#ffe3a1" strokeWidth="1.2" strokeOpacity="0.7" />
        <circle cx="262" cy="52" r="2.6" fill="#ffe3a1" />
      </g>
    </svg>
  );
}
