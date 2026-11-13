import React from 'react';
import { PhaseRendererCtx } from './MathPhase1Renderer';
import { CompositePartState } from '../types/studio';

function partTx(pt: CompositePartState | undefined, defaultPx: number, defaultPy: number): string {
  if (!pt) return '';
  const px = pt.pivotX && pt.pivotX > 1 ? pt.pivotX : defaultPx;
  const py = pt.pivotY && pt.pivotY > 1 ? pt.pivotY : defaultPy;
  const ox = pt.offsetX || 0;
  const oy = pt.offsetY || 0;
  const rot = pt.rotation || 0;
  const sc = pt.scale ?? 1;
  return `translate(${ox}, ${oy}) translate(${px}, ${py}) rotate(${rot}) scale(${sc}) translate(${-px}, ${-py})`;
}

function parabolaPath(cx: number, cy: number, a: number, halfSpan: number): string {
  const pts: string[] = [];
  for (let dx = -halfSpan; dx <= halfSpan; dx += 4) {
    const xNorm = dx / 40;
    const y = cy - a * xNorm * xNorm * 35;
    if (y >= 16 && y <= 170) {
      pts.push(`${pts.length === 0 ? 'M' : 'L'} ${(cx + dx).toFixed(1)} ${y.toFixed(1)}`);
    }
  }
  return pts.join(' ');
}

export function renderPhase4MathAsset({
  assetId,
  color,
  secondaryColor,
  mathState,
  parts,
  partInteractionProps,
}: PhaseRendererCtx): React.ReactNode | null {
  const cv = mathState?.customValues || {};

  switch (assetId) {
    // =========================================================
    // SABİT FONKSİYONLAR & ANALİTİK GEOMETRİ
    // =========================================================
    case 'math-func-coord-plane':
      return (
        <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
          {Array.from({ length: 9 }).map((_, i) => {
            const p = 20 + i * 20;
            return (
              <g key={i} opacity="0.35">
                <line x1={p} y1="16" x2={p} y2="184" stroke={secondaryColor} strokeWidth="1.2" />
                <line x1="16" y1={p} x2="184" y2={p} stroke={secondaryColor} strokeWidth="1.2" />
              </g>
            );
          })}
          <line x1="16" y1="100" x2="184" y2="100" stroke={color} strokeWidth="3" />
          <line x1="100" y1="16" x2="100" y2="184" stroke={color} strokeWidth="3" />
          <polygon points="188,100 178,95 178,105" fill={color} />
          <polygon points="100,12 95,22 105,22" fill={color} />
          <text x="178" y="90" fontSize="12" fontWeight="800" fill={color}>x</text>
          <text x="108" y="24" fontSize="12" fontWeight="800" fill={color}>y</text>
        </svg>
      );

    case 'math-func-line':
      return (
        <svg viewBox="0 0 200 180" className="w-full h-full overflow-visible">
          <line x1="18" y1="105" x2="182" y2="105" stroke={secondaryColor} strokeWidth="2" />
          <line x1="85" y1="16" x2="85" y2="164" stroke={secondaryColor} strokeWidth="2" />
          <line x1="28" y1="148" x2="168" y2="30" stroke={color} strokeWidth="4.5" strokeLinecap="round" />
          <circle cx="85" cy="100" r="4.5" fill={color} />
          <text x="128" y="42" fontSize="12" fontWeight="700" fill={color}>y = mx + n</text>
        </svg>
      );

    case 'math-func-parabola':
      return (
        <svg viewBox="0 0 200 180" className="w-full h-full overflow-visible">
          <line x1="18" y1="140" x2="182" y2="140" stroke={secondaryColor} strokeWidth="2" />
          <line x1="100" y1="16" x2="100" y2="164" stroke={secondaryColor} strokeWidth="2" />
          <path d={parabolaPath(100, 140, 1, 70)} fill="none" stroke={color} strokeWidth="4.5" strokeLinecap="round" />
          <circle cx="100" cy="140" r="4.5" fill={color} />
        </svg>
      );

    case 'math-func-hyperbola':
      return (
        <svg viewBox="0 0 200 180" className="w-full h-full overflow-visible">
          <line x1="18" y1="90" x2="182" y2="90" stroke={secondaryColor} strokeWidth="2" />
          <line x1="100" y1="16" x2="100" y2="164" stroke={secondaryColor} strokeWidth="2" />
          <path d="M110 22 Q115 78 178 82" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" />
          <path d="M90 158 Q85 102 22 98" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" />
        </svg>
      );

    case 'math-func-exponential':
      return (
        <svg viewBox="0 0 200 180" className="w-full h-full overflow-visible">
          <line x1="18" y1="138" x2="182" y2="138" stroke={secondaryColor} strokeWidth="2" />
          <line x1="80" y1="16" x2="80" y2="164" stroke={secondaryColor} strokeWidth="2" />
          <path d="M22 134 Q90 130 120 96 T166 22" fill="none" stroke={color} strokeWidth="4.5" strokeLinecap="round" />
          <circle cx="80" cy="122" r="4.5" fill={color} />
        </svg>
      );

    case 'math-func-logarithm':
      return (
        <svg viewBox="0 0 200 180" className="w-full h-full overflow-visible">
          <line x1="18" y1="110" x2="182" y2="110" stroke={secondaryColor} strokeWidth="2" />
          <line x1="48" y1="16" x2="48" y2="164" stroke={secondaryColor} strokeWidth="2" />
          <path d="M54 160 Q64 90 112 68 T178 46" fill="none" stroke={color} strokeWidth="4.5" strokeLinecap="round" />
          <circle cx="76" cy="110" r="4.5" fill={color} />
        </svg>
      );

    case 'math-func-vector':
      return (
        <svg viewBox="0 0 200 155" className="w-full h-full overflow-visible">
          <line x1="20" y1="125" x2="180" y2="125" stroke="#cbd5e1" strokeWidth="2" />
          <line x1="40" y1="18" x2="40" y2="140" stroke="#cbd5e1" strokeWidth="2" />
          <line x1="40" y1="125" x2="152" y2="42" stroke={color} strokeWidth="5" strokeLinecap="round" />
          <polygon points="164,33 142,38 152,52" fill={color} />
          <circle cx="40" cy="125" r="5" fill={secondaryColor} />
          <text x="108" y="64" fontSize="14" fontWeight="800" fill={color}>v⃗</text>
        </svg>
      );

    // =========================================================
    // HAREKETLİ FONKSİYONLAR & ANALİTİK
    // =========================================================
    case 'math-anim-curve-draw': {
      const p = cv.curveDraw ?? 1;
      return (
        <svg viewBox="0 0 215 180" className="w-full h-full overflow-visible">
          <line x1="18" y1="140" x2="196" y2="140" stroke={secondaryColor} strokeWidth="2" />
          <line x1="107" y1="16" x2="107" y2="164" stroke={secondaryColor} strokeWidth="2" />
          <path
            d={parabolaPath(107, 140, 1, 72)}
            fill="none"
            stroke={color}
            strokeWidth="4.5"
            strokeDasharray="280"
            strokeDashoffset={280 * (1 - p)}
          />
        </svg>
      );
    }

    case 'math-anim-point-on-curve': {
      const t = cv.curveT ?? 0.7;
      const dx = -68 + t * 136;
      const xNorm = dx / 40;
      const px = 100 + dx;
      const py = 140 - xNorm * xNorm * 35;
      return (
        <svg viewBox="0 0 205 180" className="w-full h-full overflow-visible">
          <line x1="18" y1="140" x2="186" y2="140" stroke="#475569" strokeWidth="2" />
          <line x1="100" y1="16" x2="100" y2="164" stroke="#475569" strokeWidth="2" />
          <path d={parabolaPath(100, 140, 1, 70)} fill="none" stroke={color} strokeWidth="4" />
          <circle cx={px} cy={py} r="7" fill={secondaryColor} stroke="#fff" strokeWidth="2" />
        </svg>
      );
    }

    case 'math-anim-slope-line': {
      const deg = cv.slopeDeg ?? 30;
      const rad = (deg * Math.PI) / 180;
      const dx = 72 * Math.cos(rad);
      const dy = 72 * Math.sin(rad);
      return (
        <svg viewBox="0 0 200 180" className="w-full h-full overflow-visible">
          <line x1="18" y1="90" x2="182" y2="90" stroke={secondaryColor} strokeWidth="2" />
          <line x1="100" y1="16" x2="100" y2="164" stroke={secondaryColor} strokeWidth="2" />
          <line x1={100 - dx} y1={90 + dy} x2={100 + dx} y2={90 - dy} stroke={color} strokeWidth="4.5" strokeLinecap="round" />
          <circle cx="100" cy="90" r="4.5" fill={secondaryColor} />
          <text x="142" y="30" fontSize="12" fontWeight="800" fill={color}>m = {Math.tan(rad).toFixed(1)}</text>
        </svg>
      );
    }

    case 'math-anim-parabola-morph': {
      const a = cv.parabolaA ?? 1;
      return (
        <svg viewBox="0 0 200 180" className="w-full h-full overflow-visible">
          <line x1="18" y1="140" x2="182" y2="140" stroke={secondaryColor} strokeWidth="2" />
          <line x1="100" y1="16" x2="100" y2="164" stroke={secondaryColor} strokeWidth="2" />
          <path d={parabolaPath(100, 140, a, 72)} fill="none" stroke={color} strokeWidth="4.5" strokeLinecap="round" />
          <text x="140" y="30" fontSize="12" fontWeight="800" fill={color}>a = {a.toFixed(1)}</text>
        </svg>
      );
    }

    case 'math-anim-vector-scale': {
      const deg = cv.vecDeg ?? 35;
      const sc = cv.vecScale ?? 1;
      const rad = (deg * Math.PI) / 180;
      const len = 78 * sc;
      const ex = 40 + len * Math.cos(rad);
      const ey = 132 - len * Math.sin(rad);
      return (
        <svg viewBox="0 0 205 170" className="w-full h-full overflow-visible">
          <line x1="16" y1="132" x2="190" y2="132" stroke="#cbd5e1" strokeWidth="2" />
          <line x1="40" y1="14" x2="40" y2="152" stroke="#cbd5e1" strokeWidth="2" />
          <line x1="40" y1="132" x2={ex} y2={ey} stroke={color} strokeWidth="5" strokeLinecap="round" />
          <circle cx={ex} cy={ey} r="6.5" fill={color} />
          <circle cx="40" cy="132" r="5" fill={secondaryColor} />
        </svg>
      );
    }

    // =========================================================
    // PARÇALI FONKSİYONLAR & ANALİTİK
    // =========================================================
    case 'math-comp-vector-components': {
      const dp = cv.decompProgress ?? 1;
      return (
        <svg viewBox="0 0 210 180" className="w-full h-full overflow-visible">
          <g transform={partTx(parts['vx'], 36, 135)} {...partInteractionProps('vx')} opacity={0.35 + dp * 0.65}>
            <line x1="36" y1="135" x2="160" y2="135" stroke={secondaryColor} strokeWidth="4" strokeDasharray="6 4" />
            <text x="98" y="154" textAnchor="middle" fontSize="12" fontWeight="800" fill={secondaryColor}>Vx</text>
          </g>
          <g transform={partTx(parts['vy'], 160, 135)} {...partInteractionProps('vy')} opacity={0.35 + dp * 0.65}>
            <line x1="160" y1="135" x2="160" y2="42" stroke="#10b981" strokeWidth="4" strokeDasharray="6 4" />
            <text x="176" y="92" fontSize="12" fontWeight="800" fill="#10b981">Vy</text>
          </g>
          <g transform={partTx(parts['vector'], 36, 135)} {...partInteractionProps('vector')}>
            <line x1="36" y1="135" x2="154" y2="46" stroke={color} strokeWidth="5" strokeLinecap="round" />
            <polygon points="164,38 143,43 153,57" fill={color} />
            <circle cx="36" cy="135" r="5" fill="#1e293b" />
          </g>
        </svg>
      );
    }

    case 'math-comp-func-graph': {
      const tt = cv.tangentT ?? 0.7;
      const dx = -54 + tt * 108;
      const xNorm = dx / 40;
      const px = 105 + dx;
      const py = 140 - xNorm * xNorm * 35;
      const slope = -2 * xNorm * (35 / 40);
      const tdx = 44;
      const tdy = slope * tdx;
      return (
        <svg viewBox="0 0 215 185" className="w-full h-full overflow-visible">
          <g transform={partTx(parts['axes'], 105, 90)} {...partInteractionProps('axes')}>
            <line x1="18" y1="140" x2="192" y2="140" stroke="#475569" strokeWidth="2" />
            <line x1="105" y1="16" x2="105" y2="164" stroke="#475569" strokeWidth="2" />
          </g>
          <g transform={partTx(parts['curve'], 105, 90)} {...partInteractionProps('curve')}>
            <path d={parabolaPath(105, 140, 1, 70)} fill="none" stroke={color} strokeWidth="4" />
          </g>
          <g transform={partTx(parts['tangent'], px, py)} {...partInteractionProps('tangent')}>
            <line x1={px - tdx} y1={py - tdy} x2={px + tdx} y2={py + tdy} stroke={secondaryColor} strokeWidth="3" />
            <circle cx={px} cy={py} r="6" fill={secondaryColor} stroke="#fff" strokeWidth="2" />
          </g>
        </svg>
      );
    }

    case 'math-comp-func-machine': {
      const pulse = cv.machinePulse ?? 0;
      return (
        <svg viewBox="0 0 245 170" className="w-full h-full overflow-visible">
          <g transform={partTx(parts['input'], 40, 82)} {...partInteractionProps('input')}>
            <rect x="14" y="64" width="38" height="34" rx="8" fill="#fbbf24" stroke={secondaryColor} strokeWidth="2.5" />
            <text x="33" y="86" textAnchor="middle" fontSize="14" fontWeight="800" fill={secondaryColor}>x</text>
          </g>
          <g transform={partTx(parts['output'], 196, 82)} {...partInteractionProps('output')}>
            <rect x="172" y="64" width="44" height="34" rx="8" fill="#22c55e" stroke={secondaryColor} strokeWidth="2.5" />
            <text x="194" y="86" textAnchor="middle" fontSize="13" fontWeight="800" fill="#fff">f(x)</text>
          </g>
          <g transform={partTx(parts['machine'], 122, 82)} {...partInteractionProps('machine')}>
            <rect
              x="76"
              y="38"
              width="92"
              height="88"
              rx="14"
              fill={color}
              stroke={secondaryColor}
              strokeWidth={3.5 + pulse * 2}
            />
            <text x="122" y="88" textAnchor="middle" fontSize="18" fontWeight="800" fill="#fff">f(x)</text>
          </g>
        </svg>
      );
    }

    case 'math-comp-ellipse-foci': {
      const ft = cv.fociT ?? 0.2;
      const a = Math.PI * 2 * ft;
      const px = 112 + 82 * Math.cos(a);
      const py = 78 - 44 * Math.sin(a);
      const f1x = 112 - 68;
      const f2x = 112 + 68;
      return (
        <svg viewBox="0 0 225 155" className="w-full h-full overflow-visible">
          <g transform={partTx(parts['axes'], 112, 78)} {...partInteractionProps('axes')}>
            <line x1="16" y1="78" x2="208" y2="78" stroke="#94a3b8" strokeWidth="1.8" strokeDasharray="4 4" />
            <line x1="112" y1="18" x2="112" y2="138" stroke="#94a3b8" strokeWidth="1.8" strokeDasharray="4 4" />
          </g>
          <g transform={partTx(parts['ellipse'], 112, 78)} {...partInteractionProps('ellipse')}>
            <ellipse cx="112" cy="78" rx="82" ry="44" fill={color} fillOpacity="0.16" stroke={color} strokeWidth="4" />
          </g>
          <g transform={partTx(parts['foci'], 112, 78)} {...partInteractionProps('foci')}>
            <line x1={f1x} y1="78" x2={px} y2={py} stroke={secondaryColor} strokeWidth="2.5" strokeDasharray="4 3" />
            <line x1={f2x} y1="78" x2={px} y2={py} stroke={secondaryColor} strokeWidth="2.5" strokeDasharray="4 3" />
            <circle cx={f1x} cy="78" r="5" fill={secondaryColor} />
            <circle cx={f2x} cy="78" r="5" fill={secondaryColor} />
            <circle cx={px} cy={py} r="6" fill="#fbbf24" stroke="#1e293b" strokeWidth="2" />
          </g>
        </svg>
      );
    }

    default:
      return null;
  }
}

