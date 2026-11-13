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

function trigWavePath(
  fn: 'sin' | 'cos',
  x0: number,
  x1: number,
  cy: number,
  amp: number,
  cycles: number,
  progress: number
): string {
  const maxX = x0 + (x1 - x0) * Math.max(0.02, Math.min(1, progress));
  const pts: string[] = [];
  for (let x = x0; x <= maxX; x += 3) {
    const t = ((x - x0) / (x1 - x0)) * Math.PI * 2 * cycles;
    const val = fn === 'sin' ? Math.sin(t) : Math.cos(t);
    const y = cy - val * amp;
    pts.push(`${pts.length === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return pts.join(' ');
}

export function renderPhase3MathAsset({
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
    // SABİT TRİGONOMETRİ
    // =========================================================
    case 'math-trig-unit-circle': {
      const r = 68;
      const deg = 45;
      const rad = (deg * Math.PI) / 180;
      const px = 100 + r * Math.cos(rad);
      const py = 100 - r * Math.sin(rad);
      return (
        <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
          <line x1="16" y1="100" x2="184" y2="100" stroke="#94a3b8" strokeWidth="2" />
          <line x1="100" y1="16" x2="100" y2="184" stroke="#94a3b8" strokeWidth="2" />
          <circle cx="100" cy="100" r={r} fill="none" stroke={color} strokeWidth="3.5" />
          <line x1="100" y1="100" x2={px} y2={py} stroke={secondaryColor} strokeWidth="3.5" />
          <line x1={px} y1={py} x2={px} y2="100" stroke="#10b981" strokeWidth="2.5" strokeDasharray="4 3" />
          <line x1={px} y1={py} x2="100" y2={py} stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="4 3" />
          <circle cx={px} cy={py} r="5.5" fill={secondaryColor} />
          <text x="174" y="94" fontSize="11" fontWeight="700" fill="#475569">1</text>
          <text x="106" y="28" fontSize="11" fontWeight="700" fill="#475569">1</text>
        </svg>
      );
    }

    case 'math-trig-axes':
      return (
        <svg viewBox="0 0 210 195" className="w-full h-full overflow-visible">
          <line x1="18" y1="100" x2="192" y2="100" stroke="#334155" strokeWidth="2.5" />
          <line x1="95" y1="18" x2="95" y2="182" stroke="#334155" strokeWidth="2.5" />
          <circle cx="95" cy="100" r="56" fill="none" stroke={color} strokeWidth="3" />
          {/* tan axis x=1 */}
          <line x1="151" y1="22" x2="151" y2="178" stroke={secondaryColor} strokeWidth="2.5" strokeDasharray="5 4" />
          <text x="156" y="34" fontSize="11" fontWeight="700" fill={secondaryColor}>tan</text>
          <text x="176" y="94" fontSize="11" fontWeight="700" fill="#334155">cos</text>
          <text x="100" y="26" fontSize="11" fontWeight="700" fill="#334155">sin</text>
        </svg>
      );

    case 'math-trig-sin-graph':
      return (
        <svg viewBox="0 0 240 150" className="w-full h-full overflow-visible">
          <line x1="20" y1="75" x2="225" y2="75" stroke={secondaryColor} strokeWidth="2" />
          <line x1="28" y1="18" x2="28" y2="132" stroke={secondaryColor} strokeWidth="2" />
          <path d={trigWavePath('sin', 28, 218, 75, 45, 1, 1)} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" />
          <text x="200" y="66" fontSize="11" fontWeight="700" fill={secondaryColor}>2π</text>
          <text x="118" y="66" fontSize="11" fontWeight="700" fill={secondaryColor}>π</text>
        </svg>
      );

    case 'math-trig-cos-graph':
      return (
        <svg viewBox="0 0 240 150" className="w-full h-full overflow-visible">
          <line x1="20" y1="75" x2="225" y2="75" stroke={secondaryColor} strokeWidth="2" />
          <line x1="28" y1="18" x2="28" y2="132" stroke={secondaryColor} strokeWidth="2" />
          <path d={trigWavePath('cos', 28, 218, 75, 45, 1, 1)} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" />
          <text x="200" y="66" fontSize="11" fontWeight="700" fill={secondaryColor}>2π</text>
          <text x="118" y="66" fontSize="11" fontWeight="700" fill={secondaryColor}>π</text>
        </svg>
      );

    case 'math-trig-tan-graph':
      return (
        <svg viewBox="0 0 240 160" className="w-full h-full overflow-visible">
          <line x1="18" y1="80" x2="222" y2="80" stroke="#334155" strokeWidth="2" />
          <line x1="120" y1="16" x2="120" y2="144" stroke="#334155" strokeWidth="2" />
          {/* Asymptotes */}
          <line x1="65" y1="18" x2="65" y2="142" stroke={secondaryColor} strokeWidth="2" strokeDasharray="5 4" />
          <line x1="175" y1="18" x2="175" y2="142" stroke={secondaryColor} strokeWidth="2" strokeDasharray="5 4" />
          {/* Center tan branch */}
          <path d="M80 138 Q112 86 120 80 Q128 74 160 22" fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round" />
          <path d="M22 138 Q48 88 55 80" fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round" />
          <path d="M185 80 Q192 72 218 22" fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round" />
        </svg>
      );

    case 'math-trig-table':
      return (
        <svg viewBox="0 0 240 150" className="w-full h-full overflow-visible">
          <rect x="12" y="14" width="216" height="122" rx="8" fill="#ffffff" stroke={color} strokeWidth="3" />
          <rect x="12" y="14" width="216" height="32" rx="6" fill={color} />
          <line x1="60" y1="14" x2="60" y2="136" stroke="#cbd5e1" strokeWidth="1.5" />
          <line x1="115" y1="14" x2="115" y2="136" stroke="#cbd5e1" strokeWidth="1.5" />
          <line x1="170" y1="14" x2="170" y2="136" stroke="#cbd5e1" strokeWidth="1.5" />
          <line x1="12" y1="76" x2="228" y2="76" stroke="#cbd5e1" strokeWidth="1.5" />
          <line x1="12" y1="106" x2="228" y2="106" stroke="#cbd5e1" strokeWidth="1.5" />
          <text x="36" y="34" textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">α</text>
          <text x="87" y="34" textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">30°</text>
          <text x="142" y="34" textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">45°</text>
          <text x="199" y="34" textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">60°</text>
          <text x="36" y="64" textAnchor="middle" fontSize="11" fontWeight="700" fill={secondaryColor}>sin</text>
          <text x="87" y="64" textAnchor="middle" fontSize="11" fill={secondaryColor}>1/2</text>
          <text x="142" y="64" textAnchor="middle" fontSize="11" fill={secondaryColor}>√2/2</text>
          <text x="199" y="64" textAnchor="middle" fontSize="11" fill={secondaryColor}>√3/2</text>
          <text x="36" y="95" textAnchor="middle" fontSize="11" fontWeight="700" fill={secondaryColor}>cos</text>
          <text x="87" y="95" textAnchor="middle" fontSize="11" fill={secondaryColor}>√3/2</text>
          <text x="142" y="95" textAnchor="middle" fontSize="11" fill={secondaryColor}>√2/2</text>
          <text x="199" y="95" textAnchor="middle" fontSize="11" fill={secondaryColor}>1/2</text>
          <text x="36" y="125" textAnchor="middle" fontSize="11" fontWeight="700" fill={secondaryColor}>tan</text>
          <text x="87" y="125" textAnchor="middle" fontSize="11" fill={secondaryColor}>√3/3</text>
          <text x="142" y="125" textAnchor="middle" fontSize="11" fill={secondaryColor}>1</text>
          <text x="199" y="125" textAnchor="middle" fontSize="11" fill={secondaryColor}>√3</text>
        </svg>
      );

    // =========================================================
    // HAREKETLİ TRİGONOMETRİ
    // =========================================================
    case 'math-anim-rotating-radius': {
      const deg = cv.trigDeg ?? 45;
      const rad = (deg * Math.PI) / 180;
      const r = 68;
      const px = 100 + r * Math.cos(rad);
      const py = 100 - r * Math.sin(rad);
      return (
        <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
          <line x1="16" y1="100" x2="184" y2="100" stroke="#94a3b8" strokeWidth="2" />
          <line x1="100" y1="16" x2="100" y2="184" stroke="#94a3b8" strokeWidth="2" />
          <circle cx="100" cy="100" r={r} fill="none" stroke={secondaryColor} strokeWidth="3" />
          <line x1="100" y1="100" x2={px} y2={py} stroke={color} strokeWidth="4" />
          <circle cx={px} cy={py} r="6" fill={color} stroke="#fff" strokeWidth="2" />
          <rect x="136" y="14" width="54" height="24" rx="7" fill={secondaryColor} />
          <text x="163" y="30" textAnchor="middle" fontSize="12" fontWeight="800" fill="#fff">{Math.round(deg)}°</text>
        </svg>
      );
    }

    case 'math-anim-sin-wave': {
      const prog = cv.waveProgress ?? 1;
      const cyc = cv.waveCycles ?? 1;
      return (
        <svg viewBox="0 0 240 150" className="w-full h-full overflow-visible">
          <line x1="20" y1="75" x2="225" y2="75" stroke={secondaryColor} strokeWidth="2" />
          <line x1="28" y1="18" x2="28" y2="132" stroke={secondaryColor} strokeWidth="2" />
          <path d={trigWavePath('sin', 28, 218, 75, 45, cyc, prog)} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" />
        </svg>
      );
    }

    case 'math-anim-cos-wave': {
      const prog = cv.waveProgress ?? 1;
      const cyc = cv.waveCycles ?? 1;
      return (
        <svg viewBox="0 0 240 150" className="w-full h-full overflow-visible">
          <line x1="20" y1="75" x2="225" y2="75" stroke={secondaryColor} strokeWidth="2" />
          <line x1="28" y1="18" x2="28" y2="132" stroke={secondaryColor} strokeWidth="2" />
          <path d={trigWavePath('cos', 28, 218, 75, 45, cyc, prog)} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" />
        </svg>
      );
    }

    case 'math-anim-tan-curve': {
      const prog = cv.waveProgress ?? 1;
      return (
        <svg viewBox="0 0 240 160" className="w-full h-full overflow-visible">
          <line x1="18" y1="80" x2="222" y2="80" stroke="#334155" strokeWidth="2" />
          <line x1="65" y1="18" x2="65" y2="142" stroke={secondaryColor} strokeWidth="2" strokeDasharray="5 4" />
          <line x1="175" y1="18" x2="175" y2="142" stroke={secondaryColor} strokeWidth="2" strokeDasharray="5 4" />
          <path d="M80 138 Q112 86 120 80 Q128 74 160 22" fill="none" stroke={color} strokeWidth="4" strokeDasharray="200" strokeDashoffset={200 * (1 - prog)} />
        </svg>
      );
    }

    case 'math-anim-sun-shadow': {
      const elev = Math.max(15, Math.min(80, cv.sunElevDeg ?? 35));
      const rad = (elev * Math.PI) / 180;
      const poleH = 85;
      const shadowLen = Math.min(130, poleH / Math.tan(rad));
      const sunX = 85 - 70 * Math.cos(rad);
      const sunY = 140 - poleH - 70 * Math.sin(rad);
      return (
        <svg viewBox="0 0 235 170" className="w-full h-full overflow-visible">
          <line x1="15" y1="142" x2="225" y2="142" stroke="#94a3b8" strokeWidth="3" />
          <circle cx={sunX} cy={sunY} r="16" fill={color} />
          <line x1={sunX} y1={sunY} x2={85 + shadowLen} y2="142" stroke={color} strokeWidth="2" strokeDasharray="5 4" />
          <rect x="81" y={142 - poleH} width="8" height={poleH} fill={secondaryColor} rx="2" />
          <line x1="85" y1="142" x2={85 + shadowLen} y2="142" stroke="#1e293b" strokeWidth="7" strokeLinecap="round" opacity="0.65" />
        </svg>
      );
    }

    // =========================================================
    // PARÇALI TRİGONOMETRİ
    // =========================================================
    case 'math-comp-unit-circle': {
      const deg = cv.trigDeg ?? 45;
      const rad = (deg * Math.PI) / 180;
      const r = 68;
      const px = 100 + r * Math.cos(rad);
      const py = 100 - r * Math.sin(rad);
      return (
        <svg viewBox="0 0 205 205" className="w-full h-full overflow-visible">
          <g transform={partTx(parts['axes'], 100, 100)} {...partInteractionProps('axes')}>
            <line x1="16" y1="100" x2="184" y2="100" stroke="#94a3b8" strokeWidth="2" />
            <line x1="100" y1="16" x2="100" y2="184" stroke="#94a3b8" strokeWidth="2" />
            <circle cx="100" cy="100" r={r} fill="none" stroke={color} strokeWidth="3.5" />
          </g>
          <g transform={partTx(parts['projections'], 100, 100)} {...partInteractionProps('projections')}>
            <line x1={px} y1={py} x2={px} y2="100" stroke="#10b981" strokeWidth="2.8" strokeDasharray="4 3" />
            <line x1={px} y1={py} x2="100" y2={py} stroke="#f59e0b" strokeWidth="2.8" strokeDasharray="4 3" />
          </g>
          <g transform={partTx(parts['radius'], 100, 100)} {...partInteractionProps('radius')}>
            <line x1="100" y1="100" x2={px} y2={py} stroke={secondaryColor} strokeWidth="4" />
            <circle cx={px} cy={py} r="6" fill={secondaryColor} stroke="#fff" strokeWidth="2" />
          </g>
        </svg>
      );
    }

    case 'math-comp-trig-graph': {
      const t = cv.trigTraceT ?? 0.25;
      const mx = 28 + t * 190;
      const my = 75 - Math.sin(t * Math.PI * 2) * 45;
      return (
        <svg viewBox="0 0 245 155" className="w-full h-full overflow-visible">
          <g transform={partTx(parts['axes'], 120, 75)} {...partInteractionProps('axes')}>
            <line x1="20" y1="75" x2="225" y2="75" stroke={secondaryColor} strokeWidth="2" />
            <line x1="28" y1="18" x2="28" y2="132" stroke={secondaryColor} strokeWidth="2" />
          </g>
          <g transform={partTx(parts['curve'], 120, 75)} {...partInteractionProps('curve')}>
            <path d={trigWavePath('sin', 28, 218, 75, 45, 1, 1)} fill="none" stroke={color} strokeWidth="4" />
          </g>
          <g transform={partTx(parts['marker'], mx, my)} {...partInteractionProps('marker')}>
            <circle cx={mx} cy={my} r="7" fill="#fbbf24" stroke="#1e293b" strokeWidth="2.5" />
          </g>
        </svg>
      );
    }

    case 'math-comp-shadow-rig': {
      const elev = Math.max(15, Math.min(80, cv.sunElevDeg ?? 35));
      const rad = (elev * Math.PI) / 180;
      const poleH = 85;
      const shadowLen = Math.min(125, poleH / Math.tan(rad));
      const sunX = 95 - 65 * Math.cos(rad);
      const sunY = 140 - poleH - 65 * Math.sin(rad);
      return (
        <svg viewBox="0 0 235 170" className="w-full h-full overflow-visible">
          <line x1="15" y1="142" x2="225" y2="142" stroke="#94a3b8" strokeWidth="3" />
          <g transform={partTx(parts['sun'], sunX, sunY)} {...partInteractionProps('sun')}>
            <circle cx={sunX} cy={sunY} r="15" fill={color} />
            <line x1={sunX} y1={sunY} x2={95 + shadowLen} y2="142" stroke={color} strokeWidth="2" strokeDasharray="5 4" />
          </g>
          <g transform={partTx(parts['pole'], 95, 110)} {...partInteractionProps('pole')}>
            <rect x="91" y={142 - poleH} width="8" height={poleH} fill={secondaryColor} rx="2" />
          </g>
          <g transform={partTx(parts['shadow'], 95, 142)} {...partInteractionProps('shadow')}>
            <line x1="95" y1="142" x2={95 + shadowLen} y2="142" stroke="#1e293b" strokeWidth="7" strokeLinecap="round" opacity="0.65" />
          </g>
        </svg>
      );
    }

    default:
      return null;
  }
}

