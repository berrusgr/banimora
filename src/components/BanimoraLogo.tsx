import React from 'react';

export interface BanimoraLogoProps {
  size?: number;
  className?: string;
  title?: string;
}

/**
 * Banimora Two-Color Flat Brand Logo Mark:
 * - Clean white squircle framed in Deep Indigo (#2D24A8)
 * - Interlocking two-color "B" monogram: Deep Indigo upper/stem form (#2D24A8)
 *   and Warm Coral lower bowl (#E06D53) with a negative-space play triangle cutout
 */
export const BanimoraLogo: React.FC<BanimoraLogoProps> = ({
  size = 32,
  className = '',
  title = 'Banimora',
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 120 120"
      width={size}
      height={size}
      fill="none"
      role="img"
      aria-label={title}
      className={`shrink-0 select-none ${className}`.trim()}
    >
      <title>{title}</title>
      <rect
        x="7"
        y="7"
        width="106"
        height="106"
        rx="24"
        fill="#FFFFFF"
        stroke="#2D24A8"
        strokeWidth="7"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M36 30H61C71.5 30 79 36.8 79 45.5C79 50.6 76.2 54.8 71.8 57.3L63.4 51.8C65.6 50.5 67 48.3 67 45.8C67 42.1 63.8 39.5 59.5 39.5H47.5V88H36V30Z"
        fill="#2D24A8"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M51 42.5L74.2 57.6C80.5 61.7 84 66.8 84 72.8C84 81.8 76.4 88 65.5 88H51V42.5ZM60.5 57.5V76.5L75.5 67L60.5 57.5Z"
        fill="#E06D53"
      />
    </svg>
  );
};
