/**
 * GoatMascot - Branded SVG illustration of a goat character
 * Used on the offline page and other branded moments.
 * Flat geometric style with rounded shapes, dark palette with yellow/amber accents.
 */

import { type SVGProps } from "react";

interface GoatMascotProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

export function GoatMascot({ size = 200, className, ...props }: GoatMascotProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      className={className}
      {...props}
    >
      {/* Background landscape - mountains */}
      <path d="M0 160 L40 110 L70 140 L110 90 L150 130 L200 100 L200 200 L0 200Z" fill="#1a1a2e" />
      <path d="M0 170 L50 130 L90 155 L140 115 L200 145 L200 200 L0 200Z" fill="#16162a" />

      {/* Ground */}
      <rect x="0" y="175" width="200" height="25" fill="#111127" rx="4" />

      {/* Clouds */}
      <g opacity="0.15">
        <ellipse cx="35" cy="75" rx="20" ry="8" fill="#94a3b8" />
        <ellipse cx="50" cy="72" rx="15" ry="6" fill="#94a3b8" />
        <ellipse cx="155" cy="65" rx="18" ry="7" fill="#94a3b8" />
        <ellipse cx="170" cy="62" rx="12" ry="5" fill="#94a3b8" />
      </g>

      {/* Stars */}
      <circle cx="25" cy="30" r="1.5" fill="#fbbf24" opacity="0.6" />
      <circle cx="175" cy="25" r="1" fill="#fbbf24" opacity="0.4" />
      <circle cx="85" cy="20" r="1.2" fill="#fbbf24" opacity="0.5" />
      <circle cx="145" cy="40" r="0.8" fill="#fbbf24" opacity="0.3" />

      {/* Goat body - sitting position */}
      <ellipse cx="100" cy="155" rx="30" ry="22" fill="#e2e8f0" />

      {/* Goat body shadow */}
      <ellipse cx="100" cy="162" rx="26" ry="12" fill="#cbd5e1" opacity="0.4" />

      {/* Goat legs (tucked, sitting) */}
      <ellipse cx="80" cy="170" rx="8" ry="5" fill="#cbd5e1" />
      <ellipse cx="120" cy="170" rx="8" ry="5" fill="#cbd5e1" />

      {/* Hooves */}
      <rect x="73" y="173" width="6" height="3" rx="1.5" fill="#64748b" />
      <rect x="121" y="173" width="6" height="3" rx="1.5" fill="#64748b" />

      {/* Goat head */}
      <circle cx="100" cy="115" r="22" fill="#f1f5f9" />

      {/* Face inner */}
      <ellipse cx="100" cy="120" rx="14" ry="10" fill="#e2e8f0" />

      {/* Eyes */}
      <ellipse cx="92" cy="112" rx="3.5" ry="4" fill="#1e293b" />
      <ellipse cx="108" cy="112" rx="3.5" ry="4" fill="#1e293b" />
      {/* Eye shine */}
      <circle cx="93.5" cy="110.5" r="1.2" fill="white" />
      <circle cx="109.5" cy="110.5" r="1.2" fill="white" />

      {/* Nose */}
      <ellipse cx="100" cy="122" rx="4" ry="2.5" fill="#94a3b8" />
      {/* Nostrils */}
      <circle cx="98" cy="122.5" r="0.8" fill="#64748b" />
      <circle cx="102" cy="122.5" r="0.8" fill="#64748b" />

      {/* Mouth - calm smile */}
      <path d="M95 126 Q100 129 105 126" stroke="#64748b" strokeWidth="1.5" fill="none" strokeLinecap="round" />

      {/* Ears */}
      <ellipse cx="78" cy="105" rx="8" ry="5" fill="#f1f5f9" transform="rotate(-20 78 105)" />
      <ellipse cx="78" cy="105" rx="5" ry="3" fill="#fda4af" opacity="0.4" transform="rotate(-20 78 105)" />
      <ellipse cx="122" cy="105" rx="8" ry="5" fill="#f1f5f9" transform="rotate(20 122 105)" />
      <ellipse cx="122" cy="105" rx="5" ry="3" fill="#fda4af" opacity="0.4" transform="rotate(20 122 105)" />

      {/* Horns */}
      <path d="M86 98 Q82 82 78 78" stroke="#d4a574" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M114 98 Q118 82 122 78" stroke="#d4a574" strokeWidth="3.5" fill="none" strokeLinecap="round" />

      {/* Goatee beard */}
      <path d="M96 128 Q100 138 104 128" stroke="#cbd5e1" strokeWidth="2" fill="#e2e8f0" />

      {/* Headphones - band */}
      <path d="M78 105 Q78 85 100 82 Q122 85 122 105" stroke="#fbbf24" strokeWidth="3.5" fill="none" strokeLinecap="round" />

      {/* Headphone left ear cup */}
      <rect x="70" y="100" width="12" height="14" rx="4" fill="#f59e0b" />
      <rect x="72" y="102" width="8" height="10" rx="3" fill="#d97706" />
      {/* Headphone cushion */}
      <rect x="73" y="103" width="6" height="8" rx="2" fill="#451a03" opacity="0.5" />

      {/* Headphone right ear cup */}
      <rect x="118" y="100" width="12" height="14" rx="4" fill="#f59e0b" />
      <rect x="120" y="102" width="8" height="10" rx="3" fill="#d97706" />
      {/* Headphone cushion */}
      <rect x="121" y="103" width="6" height="8" rx="2" fill="#451a03" opacity="0.5" />

      {/* Wifi signal lines (disconnected) */}
      <g opacity="0.3">
        <path d="M160 145 Q165 140 170 145" stroke="#64748b" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <path d="M157 140 Q165 133 173 140" stroke="#64748b" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <path d="M154 135 Q165 126 176 135" stroke="#64748b" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        {/* X through wifi */}
        <line x1="159" y1="132" x2="171" y2="148" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="171" y1="132" x2="159" y2="148" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
      </g>

      {/* Ground shadow under goat */}
      <ellipse cx="100" cy="177" rx="35" ry="4" fill="#0f0f23" opacity="0.5" />
    </svg>
  );
}
