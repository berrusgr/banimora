import React from 'react';
import { CompositePartState, VectorAssetId } from '../types/studio';
import { ComputedMathAssetState } from '../data/mathAssetsRegistry';
import { renderPhase1MathAsset } from './MathPhase1Renderer';
import { renderPhase2MathAsset } from './MathPhase2Renderer';
import { renderPhase3MathAsset } from './MathPhase3Renderer';
import { renderPhase4MathAsset } from './MathPhase4Renderer';
import { renderPhase5MathAsset } from './MathPhase5Renderer';

interface MathAssetRendererProps {
  assetId: VectorAssetId;
  color: string;
  secondaryColor?: string;
  mathState?: ComputedMathAssetState;
  selectedPartId?: string | null;
  partEditMode?: boolean;
  onSelectPart?: (partId: string) => void;
}

function getPartTransformStr(
  pt: CompositePartState | undefined,
  defaultPivotX: number,
  defaultPivotY: number
): string {
  if (!pt) return '';
  const px = pt.pivotX ?? defaultPivotX;
  const py = pt.pivotY ?? defaultPivotY;
  const ox = pt.offsetX || 0;
  const oy = pt.offsetY || 0;
  const rot = pt.rotation || 0;
  const sc = pt.scale ?? 1;
  return `translate(${ox}, ${oy}) translate(${px}, ${py}) rotate(${rot}) scale(${sc}) translate(${-px}, ${-py})`;
}

export const MathAssetRenderer: React.FC<MathAssetRendererProps> = ({
  assetId,
  color,
  secondaryColor = '#c7d2fe',
  mathState,
  selectedPartId,
  partEditMode = false,
  onSelectPart,
}) => {
  const parts = mathState?.partTransforms || {};

  const partInteractionProps = (partId: string) => {
    const isSel = selectedPartId === partId;
    const pt = parts[partId];
    const opacity = pt ? Math.max(0, Math.min(1, pt.opacity / 100)) : 1;
    return {
      'data-part-id': partId,
      opacity,
      style: {
        cursor: partEditMode ? 'pointer' : undefined,
        filter: isSel ? 'drop-shadow(0 0 6px rgba(236, 72, 153, 0.95))' : undefined,
      } as React.CSSProperties,
      onClick:
        partEditMode && onSelectPart
          ? (e: React.MouseEvent) => {
              e.stopPropagation();
              onSelectPart(partId);
            }
          : undefined,
    };
  };

  switch (assetId) {
    // =========================================================================
    // A. SABİT VARLIKLAR (STATIC ASSETS)
    // =========================================================================
    case 'math-static-square':
      return (
        <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
          <rect
            x="28"
            y="28"
            width="144"
            height="144"
            rx="10"
            fill={color}
            stroke={secondaryColor}
            strokeWidth="6"
          />
          {/* Right angle corner markers */}
          <path d="M28 50 L50 50 L50 28" fill="none" stroke="#ffffff" strokeWidth="2.5" opacity="0.7" />
          <path d="M150 28 L150 50 L172 50" fill="none" stroke="#ffffff" strokeWidth="2.5" opacity="0.7" />
          <path d="M28 150 L50 150 L50 172" fill="none" stroke="#ffffff" strokeWidth="2.5" opacity="0.7" />
          <path d="M150 172 L150 150 L172 150" fill="none" stroke="#ffffff" strokeWidth="2.5" opacity="0.7" />
        </svg>
      );

    case 'math-static-triangle':
      return (
        <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
          <polygon
            points="100,22 180,168 20,168"
            fill={color}
            stroke={secondaryColor}
            strokeWidth="6"
            strokeLinejoin="round"
          />
          {/* Altitude dashed line */}
          <line
            x1="100"
            y1="26"
            x2="100"
            y2="168"
            stroke="#ffffff"
            strokeWidth="2.5"
            strokeDasharray="6 5"
            opacity="0.75"
          />
          <rect x="100" y="154" width="14" height="14" fill="none" stroke="#ffffff" strokeWidth="2" opacity="0.8" />
        </svg>
      );

    case 'math-static-circle':
      return (
        <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
          <circle
            cx="100"
            cy="100"
            r="74"
            fill={color}
            stroke={secondaryColor}
            strokeWidth="6"
          />
          {/* Center & radius r */}
          <line x1="100" y1="100" x2="172" y2="100" stroke="#ffffff" strokeWidth="3" strokeDasharray="6 4" />
          <circle cx="100" cy="100" r="5" fill="#ffffff" />
          <text x="132" y="92" fill="#ffffff" fontSize="16" fontWeight="bold" fontFamily="sans-serif">
            r
          </text>
        </svg>
      );

    case 'math-static-cube':
      return (
        <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
          {/* Top face */}
          <polygon
            points="100,22 170,58 100,94 30,58"
            fill={secondaryColor}
            stroke="#ffffff"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {/* Left face */}
          <polygon
            points="30,58 100,94 100,174 30,138"
            fill={color}
            stroke="#ffffff"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {/* Right face */}
          <polygon
            points="170,58 100,94 100,174 170,138"
            fill={color}
            opacity="0.82"
            stroke="#ffffff"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {/* Hidden inner edges */}
          <line x1="100" y1="22" x2="100" y2="102" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="5 5" opacity="0.45" />
          <line x1="30" y1="138" x2="100" y2="102" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="5 5" opacity="0.45" />
          <line x1="170" y1="138" x2="100" y2="102" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="5 5" opacity="0.45" />
        </svg>
      );

    case 'math-static-sphere':
      return (
        <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
          <defs>
            <radialGradient id={`sphere-${color}`} cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
              <stop offset="35%" stopColor={secondaryColor} />
              <stop offset="100%" stopColor={color} />
            </radialGradient>
          </defs>
          <circle cx="100" cy="100" r="74" fill={`url(#sphere-${color})`} />
          <ellipse
            cx="100"
            cy="100"
            rx="74"
            ry="22"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2.5"
            strokeDasharray="6 5"
            opacity="0.7"
          />
          <ellipse
            cx="100"
            cy="100"
            rx="24"
            ry="74"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2"
            strokeDasharray="6 5"
            opacity="0.5"
          />
        </svg>
      );

    case 'math-static-book':
      return (
        <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
          {/* Back cover */}
          <rect x="40" y="34" width="124" height="142" rx="10" fill={color} opacity="0.8" />
          {/* Pages block */}
          <rect x="46" y="38" width="114" height="130" rx="6" fill={secondaryColor} />
          {/* Front cover */}
          <rect x="34" y="28" width="118" height="138" rx="8" fill={color} />
          {/* Spine */}
          <rect x="34" y="28" width="18" height="138" rx="4" fill="#0f172a" opacity="0.25" />
          {/* Cover badge */}
          <rect x="64" y="54" width="72" height="44" rx="6" fill="#ffffff" opacity="0.92" />
          <text
            x="100"
            y="82"
            textAnchor="middle"
            fill={color}
            fontSize="20"
            fontWeight="bold"
            fontFamily="sans-serif"
          >
            π · ∑
          </text>
          <line x1="66" y1="118" x2="134" y2="118" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" opacity="0.7" />
          <line x1="76" y1="132" x2="124" y2="132" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
        </svg>
      );

    // =========================================================================
    // B. HAREKETLİ VARLIKLAR (ANIMATED ASSETS)
    // =========================================================================
    case 'math-animated-ball':
      return (
        <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
          <defs>
            <radialGradient id={`ball-${color}`} cx="36%" cy="32%" r="68%">
              <stop offset="0%" stopColor="#fff7ed" />
              <stop offset="30%" stopColor={color} />
              <stop offset="100%" stopColor="#9a3412" />
            </radialGradient>
          </defs>
          <circle cx="100" cy="100" r="72" fill={`url(#ball-${color})`} />
          {/* Crisp basketball / math ball seams so rotation is immediately visible */}
          <path d="M28 100 Q100 120 172 100" fill="none" stroke={secondaryColor} strokeWidth="5" />
          <path d="M100 28 Q120 100 100 172" fill="none" stroke={secondaryColor} strokeWidth="5" />
          <path d="M50 48 Q84 100 50 152" fill="none" stroke={secondaryColor} strokeWidth="4.5" />
          <path d="M150 48 Q116 100 150 152" fill="none" stroke={secondaryColor} strokeWidth="4.5" />
          <circle cx="100" cy="100" r="72" fill="none" stroke={secondaryColor} strokeWidth="5" />
        </svg>
      );

    case 'math-animated-dice': {
      const face = mathState?.diceFace ?? 6;
      const pipCoords: Record<number, [number, number][]> = {
        1: [[100, 100]],
        2: [[66, 66], [134, 134]],
        3: [[66, 66], [100, 100], [134, 134]],
        4: [[66, 66], [134, 66], [66, 134], [134, 134]],
        5: [[66, 66], [134, 66], [100, 100], [66, 134], [134, 134]],
        6: [[66, 60], [134, 60], [66, 100], [134, 100], [66, 140], [134, 140]],
      };
      const pips = pipCoords[face] || pipCoords[6];
      return (
        <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
          {/* 3D bevel shadow */}
          <rect x="34" y="34" width="140" height="140" rx="24" fill="#cbd5e1" />
          <rect
            x="28"
            y="26"
            width="140"
            height="140"
            rx="24"
            fill={color}
            stroke="#94a3b8"
            strokeWidth="5"
          />
          {pips.map(([px, py], i) => (
            <circle
              key={i}
              cx={px - 2}
              cy={py - 4}
              r="12"
              fill={face === 1 || face === 4 ? secondaryColor : '#0f172a'}
            />
          ))}
        </svg>
      );
    }

    case 'math-animated-car': {
      const wRot = mathState?.wheelAngle ?? 0;
      return (
        <svg viewBox="0 0 240 140" className="w-full h-full overflow-visible">
          {/* Car Cabin */}
          <path
            d="M48 68 L74 28 C78 22 86 20 96 20 L152 20 C162 20 170 24 176 34 L196 68 Z"
            fill={color}
          />
          {/* Windows */}
          <path d="M78 32 L114 32 L114 62 L58 62 Z" fill={secondaryColor} opacity="0.85" />
          <path d="M122 32 L156 32 L176 62 L122 62 Z" fill={secondaryColor} opacity="0.85" />
          {/* Car Body */}
          <rect x="18" y="64" width="204" height="40" rx="14" fill={color} />
          {/* Headlight & Taillight */}
          <rect x="208" y="72" width="12" height="12" rx="4" fill="#fef08a" />
          <rect x="18" y="72" width="10" height="12" rx="3" fill="#ef4444" />
          {/* Front & Rear Spinning Wheels */}
          {[66, 174].map((wx) => (
            <g key={wx} transform={`translate(${wx}, 104) rotate(${wRot})`}>
              <circle cx="0" cy="0" r="24" fill="#1e293b" />
              <circle cx="0" cy="0" r="14" fill="#e2e8f0" />
              <line x1="-12" y1="0" x2="12" y2="0" stroke="#475569" strokeWidth="3.5" />
              <line x1="0" y1="-12" x2="0" y2="12" stroke="#475569" strokeWidth="3.5" />
              <circle cx="0" cy="0" r="4" fill="#0f172a" />
            </g>
          ))}
        </svg>
      );
    }

    case 'math-animated-pendulum': {
      const pAngle = mathState?.pendulumAngle ?? 0;
      return (
        <svg viewBox="0 0 200 240" className="w-full h-full overflow-visible">
          {/* Top Support Beam */}
          <rect x="30" y="18" width="140" height="14" rx="7" fill={color} />
          <circle cx="100" cy="32" r="7" fill={secondaryColor} />
          {/* Rotating Pendulum Rod & Bob */}
          <g transform={`rotate(${pAngle} 100 32)`}>
            <line x1="100" y1="32" x2="100" y2="178" stroke={color} strokeWidth="5" strokeLinecap="round" />
            <circle cx="100" cy="190" r="24" fill={secondaryColor} stroke={color} strokeWidth="4" />
            <circle cx="92" cy="182" r="6" fill="#ffffff" opacity="0.65" />
          </g>
        </svg>
      );
    }

    // =========================================================================
    // C. PARÇALI VARLIKLAR (COMPOSITE ASSETS - PARENT-CHILD HIERARCHY)
    // =========================================================================
    case 'math-composite-compass': {
      const hingeT = getPartTransformStr(parts['hinge'], 100, 36);
      const leftT = getPartTransformStr(parts['left-leg'], 100, 38);
      const rightT = getPartTransformStr(parts['right-leg'], 100, 38);
      const tipT = getPartTransformStr(parts['pencil-tip'], 100, 148);
      return (
        <svg viewBox="0 0 200 220" className="w-full h-full overflow-visible">
          {/* PARENT: HINGE (Mafsal) */}
          <g transform={hingeT}>
            {/* Left Leg (Child of Hinge) */}
            <g transform={leftT} {...partInteractionProps('left-leg')}>
              <path d="M94 38 L104 38 L98 164 L90 164 Z" fill={color} />
              {/* Sharp steel needle point */}
              <polygon points="91,164 97,164 94,192" fill="#94a3b8" />
            </g>

            {/* Right Leg (Child of Hinge) */}
            <g transform={rightT} {...partInteractionProps('right-leg')}>
              <path d="M96 38 L106 38 L110 160 L102 160 Z" fill={color} />
              {/* Pencil Clamp */}
              <rect x="96" y="138" width="18" height="14" rx="3" fill="#64748b" />

              {/* Pencil Tip (Child of Right Leg!) */}
              <g transform={tipT} {...partInteractionProps('pencil-tip')}>
                <rect x="102" y="114" width="9" height="58" rx="2" fill={secondaryColor} />
                <polygon points="102,172 111,172 106.5,192" fill="#fde68a" />
                <polygon points="105,185 108,185 106.5,192" fill="#0f172a" />
              </g>
            </g>

            {/* Top Hinge Cap & Handle */}
            <g {...partInteractionProps('hinge')}>
              <rect x="95" y="10" width="10" height="22" rx="4" fill="#64748b" />
              <circle cx="100" cy="36" r="14" fill={color} stroke="#cbd5e1" strokeWidth="3" />
              <circle cx="100" cy="36" r="5" fill="#e2e8f0" />
            </g>
          </g>
        </svg>
      );
    }

    case 'math-composite-scale': {
      const bodyT = getPartTransformStr(parts['body'], 100, 175);
      const beamPt = parts['beam'];
      const beamRot = beamPt?.rotation ?? 0;
      const beamT = getPartTransformStr(beamPt, 100, 64);
      const leftPanT = getPartTransformStr(parts['left-pan'], 34, 64);
      const rightPanT = getPartTransformStr(parts['right-pan'], 166, 64);
      const weightsT = getPartTransformStr(parts['weights'], 100, 112);

      return (
        <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
          {/* 1. Main Body / Stand */}
          <g transform={bodyT} {...partInteractionProps('body')}>
            <path d="M52 176 L148 176 L138 158 L62 158 Z" fill={color} />
            <rect x="93" y="64" width="14" height="96" rx="4" fill={color} />
            <polygon points="100,50 110,66 90,66" fill={secondaryColor} />
          </g>

          {/* 2. Beam (Denge Kolu) */}
          <g transform={beamT}>
            <g {...partInteractionProps('beam')}>
              <rect x="24" y="59" width="152" height="10" rx="5" fill={secondaryColor} stroke={color} strokeWidth="2.5" />
              <circle cx="100" cy="64" r="7" fill={color} />
            </g>

            {/* 3. Left Pan (Child of Beam - counter-rotated so it hangs vertically!) */}
            <g transform={leftPanT} {...partInteractionProps('left-pan')}>
              <g transform={`rotate(${-beamRot} 34 64)`}>
                <line x1="34" y1="64" x2="14" y2="112" stroke="#64748b" strokeWidth="2.2" />
                <line x1="34" y1="64" x2="54" y2="112" stroke="#64748b" strokeWidth="2.2" />
                <path d="M10 112 Q34 128 58 112 Z" fill={secondaryColor} stroke={color} strokeWidth="2" />
                {/* Left Weight */}
                <g transform={weightsT} {...partInteractionProps('weights')}>
                  <rect x="23" y="96" width="22" height="16" rx="3" fill="#334155" />
                  <text x="34" y="108" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">
                    X
                  </text>
                </g>
              </g>
            </g>

            {/* 4. Right Pan (Child of Beam - counter-rotated) */}
            <g transform={rightPanT} {...partInteractionProps('right-pan')}>
              <g transform={`rotate(${-beamRot} 166 64)`}>
                <line x1="166" y1="64" x2="146" y2="112" stroke="#64748b" strokeWidth="2.2" />
                <line x1="166" y1="64" x2="186" y2="112" stroke="#64748b" strokeWidth="2.2" />
                <path d="M142 112 Q166 128 190 112 Z" fill={secondaryColor} stroke={color} strokeWidth="2" />
                {/* Right Weight */}
                <g transform={weightsT} {...partInteractionProps('weights')}>
                  <rect x="155" y="96" width="22" height="16" rx="3" fill="#0284c7" />
                  <text x="166" y="108" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">
                    5g
                  </text>
                </g>
              </g>
            </g>
          </g>
        </svg>
      );
    }

    case 'math-composite-clock': {
      const bodyT = getPartTransformStr(parts['clock-body'], 100, 100);
      const hourT = getPartTransformStr(parts['hour-hand'], 100, 100);
      const minT = getPartTransformStr(parts['minute-hand'], 100, 100);
      const secT = getPartTransformStr(parts['second-hand'], 100, 100);

      return (
        <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
          <g transform={bodyT}>
            {/* Clock Body & Dial */}
            <g {...partInteractionProps('clock-body')}>
              <circle cx="100" cy="100" r="82" fill={color} />
              <circle cx="100" cy="100" r="70" fill="#ffffff" stroke={secondaryColor} strokeWidth="4" />
              {/* Hour ticks */}
              {Array.from({ length: 12 }).map((_, i) => {
                const ang = i * 30;
                return (
                  <line
                    key={i}
                    x1="100"
                    y1="36"
                    x2="100"
                    y2={i % 3 === 0 ? '46' : '42'}
                    stroke="#1e293b"
                    strokeWidth={i % 3 === 0 ? '4' : '2'}
                    strokeLinecap="round"
                    transform={`rotate(${ang} 100 100)`}
                  />
                );
              })}
            </g>

            {/* Hour Hand (Akrep) */}
            <g transform={hourT} {...partInteractionProps('hour-hand')}>
              <line x1="100" y1="104" x2="100" y2="58" stroke="#0f172a" strokeWidth="7" strokeLinecap="round" />
            </g>

            {/* Minute Hand (Yelkovan) */}
            <g transform={minT} {...partInteractionProps('minute-hand')}>
              <line x1="100" y1="106" x2="100" y2="40" stroke={secondaryColor} strokeWidth="5" strokeLinecap="round" />
            </g>

            {/* Second Hand (Saniye Kolu) */}
            <g transform={secT} {...partInteractionProps('second-hand')}>
              <line x1="100" y1="112" x2="100" y2="34" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
            </g>

            <circle cx="100" cy="100" r="6" fill="#ef4444" stroke="#ffffff" strokeWidth="2" />
          </g>
        </svg>
      );
    }

    case 'math-composite-mystery-box': {
      const bodyT = getPartTransformStr(parts['box-body'], 100, 135);
      const lidT = getPartTransformStr(parts['lid'], 44, 88);
      const hingesT = getPartTransformStr(parts['hinges'], 44, 88);
      const innerT = getPartTransformStr(parts['inner-items'], 100, 96);
      const shatterP = mathState?.shatterProgress ?? 0;

      return (
        <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
          <g transform={bodyT}>
            {/* Inner Surprise Items (Star & Math Symbol) */}
            <g transform={innerT} {...partInteractionProps('inner-items')}>
              <polygon
                points="100,66 108,84 128,86 113,98 117,118 100,108 83,118 87,98 72,86 92,84"
                fill={secondaryColor}
                stroke="#ffffff"
                strokeWidth="2"
              />
              <text x="100" y="99" textAnchor="middle" fill="#1e293b" fontSize="14" fontWeight="bold">
                π
              </text>
            </g>

            {/* Main Box Body */}
            <g
              {...partInteractionProps('box-body')}
              opacity={shatterP > 0.1 ? Math.max(0.15, 1 - shatterP) : 1}
            >
              <rect x="44" y="88" width="112" height="84" rx="10" fill={color} />
              <rect x="44" y="88" width="112" height="14" fill="#000000" opacity="0.18" />
              <text
                x="100"
                y="148"
                textAnchor="middle"
                fill={secondaryColor}
                fontSize="44"
                fontWeight="900"
                fontFamily="sans-serif"
              >
                ?
              </text>
            </g>

            {/* Lid (Kapak - hinged on left!) */}
            <g
              transform={lidT}
              {...partInteractionProps('lid')}
              opacity={shatterP > 0.1 ? Math.max(0.15, 1 - shatterP) : 1}
            >
              <rect x="38" y="68" width="124" height="22" rx="7" fill={color} stroke={secondaryColor} strokeWidth="2.5" />
              <rect x="86" y="68" width="28" height="22" fill={secondaryColor} />
            </g>

            {/* Hinges */}
            <g transform={hingesT} {...partInteractionProps('hinges')}>
              <rect x="39" y="82" width="10" height="14" rx="3" fill="#94a3b8" />
              <circle cx="44" cy="89" r="2.5" fill="#1e293b" />
            </g>

            {/* Shatter Pieces (Dağılabilen Parçalar) */}
            <g {...partInteractionProps('shatter-pieces')}>
              {[
                { x: 52, y: 100, dx: -55, dy: -45, rot: -40 },
                { x: 126, y: 98, dx: 55, dy: -40, rot: 45 },
                { x: 50, y: 144, dx: -60, dy: 40, rot: -55 },
                { x: 126, y: 146, dx: 60, dy: 45, rot: 60 },
              ].map((frag, idx) => (
                <polygon
                  key={idx}
                  points="0,0 24,6 18,26 -4,20"
                  fill={idx % 2 === 0 ? color : secondaryColor}
                  opacity={shatterP > 0.02 ? 1 : 0}
                  transform={`translate(${frag.x + frag.dx * shatterP}, ${
                    frag.y + frag.dy * shatterP
                  }) rotate(${frag.rot * shatterP})`}
                />
              ))}
            </g>
          </g>
        </svg>
      );
    }

    default: {
      const ctx = {
        assetId,
        color,
        secondaryColor,
        mathState,
        parts,
        partInteractionProps,
      };
      return (
        renderPhase1MathAsset(ctx) ??
        renderPhase2MathAsset(ctx) ??
        renderPhase3MathAsset(ctx) ??
        renderPhase4MathAsset(ctx) ??
        renderPhase5MathAsset(ctx) ??
        null
      );
    }
  }
};

