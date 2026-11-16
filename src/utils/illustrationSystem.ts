/**
 * Banimora Shared 2D Vector Illustration Design System
 *
 * Defines consistent stroke weights, rounded corner/cap rules,
 * directional top-left lighting, and material-aware tonal derivation
 * across characters, profession outfits/accessories, and scene objects.
 */

export const ILLUSTRATION_TOKENS = {
  /** Primary ink color for dark/neutral outlines (deep slate, softer than pure black) */
  inkSlate: '#1e293b',
  /** Muted secondary ink for internal seams, folds, and subtle details */
  inkMuted: '#475569',
  /** Standard stroke widths in SVG viewBox units */
  stroke: {
    hairline: 0.9,
    detail: 1.25,
    regular: 1.75,
    emphasis: 2.1,
  },
  /** Consistent rounded join/cap styles */
  lineCap: 'round' as const,
  lineJoin: 'round' as const,
  /** Top-left directional key light highlight & bottom-right ambient shadow opacities */
  highlightOpacity: 0.28,
  specularOpacity: 0.48,
  shadowOpacity: 0.16,
  deepShadowOpacity: 0.28,
};

export interface MaterialTones {
  base: string;
  highlight: string;
  specular: string;
  shadow: string;
  deepShadow: string;
  stroke: string;
  seam: string;
}

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

export function normalizeHex(hex: string, fallback = '#3b82f6'): string {
  const cleaned = (hex || '').trim();
  if (/^#[0-9a-fA-F]{6}$/.test(cleaned)) return cleaned;
  if (/^#[0-9a-fA-F]{3}$/.test(cleaned)) {
    const r = cleaned[1];
    const g = cleaned[2];
    const b = cleaned[3];
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return fallback;
}

export function hexToRgb(hex: string): [number, number, number] {
  const norm = normalizeHex(hex);
  const num = parseInt(norm.slice(1), 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [clampByte(r), clampByte(g), clampByte(b)]
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')
  );
}

/**
 * Mixes two hex colors by ratio t in [0, 1].
 */
export function mixHex(hexA: string, hexB: string, t: number): string {
  const ratio = Math.max(0, Math.min(1, t));
  const [r1, g1, b1] = hexToRgb(hexA);
  const [r2, g2, b2] = hexToRgb(hexB);
  return rgbToHex(
    r1 + (r2 - r1) * ratio,
    g1 + (g2 - g1) * ratio,
    b1 + (b2 - b1) * ratio
  );
}

/**
 * Adjusts hex brightness while shifting highlights slightly warmer
 * and shadows slightly cooler for a rich 2D animation feel.
 */
export function toneHex(hex: string, percent: number): string {
  const norm = normalizeHex(hex);
  if (percent >= 0) {
    return mixHex(norm, '#fffdf7', Math.min(1, percent / 100));
  }
  return mixHex(norm, '#0f172a', Math.min(1, Math.abs(percent) / 100));
}

/**
 * Derives a complete 7-tone material palette from a single base color
 * so characters and scene objects share harmonious shading and colored ink.
 */
export function deriveMaterialTones(baseHex: string): MaterialTones {
  const base = normalizeHex(baseHex);
  return {
    base,
    highlight: mixHex(base, '#ffffff', 0.24),
    specular: mixHex(base, '#ffffff', 0.52),
    shadow: mixHex(base, '#1e293b', 0.18),
    deepShadow: mixHex(base, '#0f172a', 0.36),
    stroke: mixHex(base, '#0f172a', 0.56),
    seam: mixHex(base, '#0f172a', 0.30),
  };
}
