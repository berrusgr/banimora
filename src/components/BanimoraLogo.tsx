import React from 'react';

export interface BanimoraLogoProps {
  size?: number;
  className?: string;
  title?: string;
}

/**
 * Banimora Flat Brand Logo Mark (generated with Gemini):
 * - Deep indigo squircle (#362CC6)
 * - Geometric "B" monogram: white stem, warm coral upper loop (#E06D53) with play-triangle cutout,
 *   and vibrant violet lower loop (#8B3DFF)
 * - Four-pointed coral animation spark (#F26651)
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
      <rect width="120" height="120" rx="28" fill="#362CC6" />
      <path
        d="M35 26H38V94H35C29.4772 94 25 89.5228 25 84V36C25 30.4772 29.4772 26 35 26Z"
        fill="#FFFFFF"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M42 26H63.5C75.9264 26 86 35.402 86 47C86 58.598 75.9264 68 63.5 68H42V26ZM54 38.5L72 47.5L54 56.5V38.5Z"
        fill="#E06D53"
      />
      <path
        d="M42 71H61.5V82.5H68.5C73.7467 82.5 78 78.6944 78 74C78 70.1292 75.1088 66.8639 71.1508 65.8434C75.7924 64.119 80.0149 61.3446 83.4184 57.8266C87.4988 61.5999 90 66.8244 90 72.6C90 84.4189 79.7025 94 67 94H42V71Z"
        fill="#8B3DFF"
      />
      <path
        d="M92 18L94.6 25.4L102 28L94.6 30.6L92 38L89.4 30.6L82 28L89.4 25.4L92 18Z"
        fill="#F26651"
      />
    </svg>
  );
};
