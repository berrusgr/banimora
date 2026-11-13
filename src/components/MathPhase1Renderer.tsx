import React from 'react';
import { CompositePartState, VectorAssetId } from '../types/studio';
import { ComputedMathAssetState } from '../data/mathAssetsRegistry';

export interface PhaseRendererCtx {
  assetId: VectorAssetId;
  color: string;
  secondaryColor: string;
  mathState?: ComputedMathAssetState;
  parts: Record<string, CompositePartState>;
  partInteractionProps: (partId: string) => Record<string, unknown>;
}

function partTx(
  pt: CompositePartState | undefined,
  defaultPx: number,
  defaultPy: number
): string {
  if (!pt) return '';
  const px = pt.pivotX && pt.pivotX > 1 ? pt.pivotX : defaultPx;
  const py = pt.pivotY && pt.pivotY > 1 ? pt.pivotY : defaultPy;
  const ox = pt.offsetX || 0;
  const oy = pt.offsetY || 0;
  const rot = pt.rotation || 0;
  const sc = pt.scale ?? 1;
  return `translate(${ox}, ${oy}) translate(${px}, ${py}) rotate(${rot}) scale(${sc}) translate(${-px}, ${-py})`;
}

function regularPolygonPoints(cx: number, cy: number, r: number, sides: number, offsetDeg = -90): string {
  const pts: string[] = [];
  for (let i = 0; i < sides; i++) {
    const a = ((offsetDeg + (360 / sides) * i) * Math.PI) / 180;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
}

export function renderPhase1MathAsset({
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
    // SABİT GEOMETRİ
    // =========================================================
    case 'math-geo-rectangle':
      return (
        <svg viewBox="0 0 220 140" className="w-full h-full overflow-visible">
          <rect x="20" y="22" width="180" height="96" rx="6" fill={color} stroke={secondaryColor} strokeWidth="5" />
          <path d="M20 38 H36 V22 M184 22 V38 H200 M20 102 H36 V118 M184 118 V102 H200" fill="none" stroke="#fff" strokeWidth="2.2" opacity="0.75" />
          <line x1="20" y1="70" x2="200" y2="70" stroke="#fff" strokeWidth="1.5" strokeDasharray="5 4" opacity="0.45" />
        </svg>
      );

    case 'math-geo-parallelogram':
      return (
        <svg viewBox="0 0 220 140" className="w-full h-full overflow-visible">
          <polygon points="52,24 200,24 168,116 20,116" fill={color} stroke={secondaryColor} strokeWidth="5" strokeLinejoin="round" />
          <line x1="52" y1="24" x2="52" y2="116" stroke="#fff" strokeWidth="2" strokeDasharray="5 4" opacity="0.7" />
          <path d="M52 104 H64 V116" fill="none" stroke="#fff" strokeWidth="2" opacity="0.8" />
        </svg>
      );

    case 'math-geo-trapezoid':
      return (
        <svg viewBox="0 0 220 140" className="w-full h-full overflow-visible">
          <polygon points="64,24 156,24 198,116 22,116" fill={color} stroke={secondaryColor} strokeWidth="5" strokeLinejoin="round" />
          <line x1="64" y1="24" x2="64" y2="116" stroke="#fff" strokeWidth="2" strokeDasharray="5 4" opacity="0.7" />
          <path d="M64 104 H76 V116" fill="none" stroke="#fff" strokeWidth="2" opacity="0.8" />
        </svg>
      );

    case 'math-geo-rhombus':
      return (
        <svg viewBox="0 0 180 180" className="w-full h-full overflow-visible">
          <polygon points="90,16 164,90 90,164 16,90" fill={color} stroke={secondaryColor} strokeWidth="5" strokeLinejoin="round" />
          <line x1="90" y1="16" x2="90" y2="164" stroke="#fff" strokeWidth="2" strokeDasharray="5 4" opacity="0.65" />
          <line x1="16" y1="90" x2="164" y2="90" stroke="#fff" strokeWidth="2" strokeDasharray="5 4" opacity="0.65" />
          <path d="M90 78 H102 V90" fill="none" stroke="#fff" strokeWidth="2" opacity="0.85" />
        </svg>
      );

    case 'math-geo-pentagon':
      return (
        <svg viewBox="0 0 180 180" className="w-full h-full overflow-visible">
          <polygon points={regularPolygonPoints(90, 94, 70, 5)} fill={color} stroke={secondaryColor} strokeWidth="5" strokeLinejoin="round" />
          <circle cx="90" cy="94" r="3.5" fill="#fff" opacity="0.85" />
        </svg>
      );

    case 'math-geo-hexagon':
      return (
        <svg viewBox="0 0 180 170" className="w-full h-full overflow-visible">
          <polygon points={regularPolygonPoints(90, 85, 68, 6, 0)} fill={color} stroke={secondaryColor} strokeWidth="5" strokeLinejoin="round" />
          <circle cx="90" cy="85" r="3.5" fill="#fff" opacity="0.85" />
        </svg>
      );

    case 'math-geo-ellipse':
      return (
        <svg viewBox="0 0 220 140" className="w-full h-full overflow-visible">
          <ellipse cx="110" cy="70" rx="92" ry="50" fill={color} stroke={secondaryColor} strokeWidth="5" />
          <line x1="18" y1="70" x2="202" y2="70" stroke="#fff" strokeWidth="1.8" strokeDasharray="5 4" opacity="0.6" />
          <line x1="110" y1="20" x2="110" y2="120" stroke="#fff" strokeWidth="1.8" strokeDasharray="5 4" opacity="0.6" />
          <circle cx="62" cy="70" r="4" fill="#fff" />
          <circle cx="158" cy="70" r="4" fill="#fff" />
        </svg>
      );

    case 'math-geo-sector':
      return (
        <svg viewBox="0 0 180 180" className="w-full h-full overflow-visible">
          <circle cx="90" cy="90" r="68" fill="none" stroke={secondaryColor} strokeWidth="2.5" strokeDasharray="5 5" opacity="0.45" />
          <path d="M90 90 L158 90 A68 68 0 0 0 124 31 Z" fill={color} stroke={secondaryColor} strokeWidth="4" strokeLinejoin="round" />
          <path d="M114 90 A24 24 0 0 0 102 69" fill="none" stroke="#fff" strokeWidth="2.5" />
          <text x="119" y="81" fontSize="12" fontWeight="700" fill="#fff">60°</text>
        </svg>
      );

    case 'math-geo-line-ray':
      return (
        <svg viewBox="0 0 240 120" className="w-full h-full overflow-visible">
          {/* Doğru */}
          <line x1="22" y1="26" x2="218" y2="26" stroke={color} strokeWidth="3.5" />
          <polygon points="14,26 26,20 26,32" fill={color} />
          <polygon points="226,26 214,20 214,32" fill={color} />
          <circle cx="75" cy="26" r="4.5" fill={secondaryColor} />
          <circle cx="165" cy="26" r="4.5" fill={secondaryColor} />
          {/* Işın */}
          <line x1="40" y1="62" x2="214" y2="62" stroke={secondaryColor} strokeWidth="3.5" />
          <circle cx="40" cy="62" r="5" fill={color} />
          <polygon points="224,62 212,56 212,68" fill={secondaryColor} />
          {/* Doğru Parçası */}
          <line x1="48" y1="96" x2="192" y2="96" stroke={color} strokeWidth="4" strokeLinecap="round" />
          <circle cx="48" cy="96" r="5.5" fill={secondaryColor} />
          <circle cx="192" cy="96" r="5.5" fill={secondaryColor} />
        </svg>
      );

    case 'math-geo-angle':
      return (
        <svg viewBox="0 0 180 150" className="w-full h-full overflow-visible">
          <path d="M36 118 L156 118" stroke={secondaryColor} strokeWidth="4.5" strokeLinecap="round" />
          <path d="M36 118 L128 32" stroke={secondaryColor} strokeWidth="4.5" strokeLinecap="round" />
          <path d="M36 118 L82 118 A46 46 0 0 0 69 85 Z" fill={color} opacity="0.28" />
          <path d="M82 118 A46 46 0 0 0 69 85" fill="none" stroke={color} strokeWidth="3.5" />
          <circle cx="36" cy="118" r="5.5" fill={color} />
          <text x="86" y="102" fontSize="15" fontWeight="800" fill={color}>43°</text>
        </svg>
      );

    case 'math-geo-cylinder':
      return (
        <svg viewBox="0 0 150 190" className="w-full h-full overflow-visible">
          <path d="M25 40 V148 A50 20 0 0 0 125 148 V40 Z" fill={color} stroke={secondaryColor} strokeWidth="4" />
          <ellipse cx="75" cy="40" rx="50" ry="20" fill={secondaryColor} opacity="0.35" stroke={secondaryColor} strokeWidth="4" />
          <ellipse cx="75" cy="40" rx="50" ry="20" fill={color} opacity="0.7" stroke={secondaryColor} strokeWidth="4" />
          <path d="M25 148 A50 20 0 0 1 125 148" fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="5 4" opacity="0.65" />
        </svg>
      );

    case 'math-geo-cone':
      return (
        <svg viewBox="0 0 160 190" className="w-full h-full overflow-visible">
          <path d="M80 20 L22 146 A58 22 0 0 0 138 146 Z" fill={color} stroke={secondaryColor} strokeWidth="4" strokeLinejoin="round" />
          <path d="M22 146 A58 22 0 0 1 138 146" fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="5 4" opacity="0.7" />
          <line x1="80" y1="20" x2="80" y2="146" stroke="#fff" strokeWidth="2" strokeDasharray="5 4" opacity="0.7" />
          <circle cx="80" cy="146" r="3.5" fill="#fff" />
        </svg>
      );

    case 'math-geo-rect-prism':
      return (
        <svg viewBox="0 0 200 170" className="w-full h-full overflow-visible">
          {/* Front */}
          <rect x="24" y="54" width="112" height="90" fill={color} stroke={secondaryColor} strokeWidth="3.5" />
          {/* Top */}
          <polygon points="24,54 66,22 178,22 136,54" fill={color} opacity="0.82" stroke={secondaryColor} strokeWidth="3.5" strokeLinejoin="round" />
          {/* Side */}
          <polygon points="136,54 178,22 178,112 136,144" fill={secondaryColor} opacity="0.75" stroke={secondaryColor} strokeWidth="3.5" strokeLinejoin="round" />
          {/* Hidden edges */}
          <path d="M66 22 V112 M24 144 L66 112 H178" fill="none" stroke="#fff" strokeWidth="1.8" strokeDasharray="5 4" opacity="0.55" />
        </svg>
      );

    case 'math-geo-tri-prism':
      return (
        <svg viewBox="0 0 200 160" className="w-full h-full overflow-visible">
          {/* Top/side face */}
          <polygon points="62,24 158,24 182,118 86,118" fill={secondaryColor} opacity="0.7" stroke={secondaryColor} strokeWidth="3.5" strokeLinejoin="round" />
          {/* Front triangle */}
          <polygon points="62,24 86,118 22,118" fill={color} stroke={secondaryColor} strokeWidth="3.5" strokeLinejoin="round" />
          {/* Bottom face hint */}
          <polygon points="22,118 86,118 182,118" fill="none" stroke={secondaryColor} strokeWidth="3.5" />
          <line x1="22" y1="118" x2="118" y2="118" stroke="#fff" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.5" />
        </svg>
      );

    case 'math-geo-square-pyramid':
      return (
        <svg viewBox="0 0 180 185" className="w-full h-full overflow-visible">
          <polygon points="90,18 24,132 104,158" fill={color} stroke={secondaryColor} strokeWidth="3.5" strokeLinejoin="round" />
          <polygon points="90,18 104,158 156,120" fill={secondaryColor} opacity="0.75" stroke={secondaryColor} strokeWidth="3.5" strokeLinejoin="round" />
          <path d="M24 132 L76 100 L156 120 M90 18 L76 100" fill="none" stroke="#fff" strokeWidth="1.8" strokeDasharray="5 4" opacity="0.65" />
        </svg>
      );

    case 'math-geo-tetrahedron':
      return (
        <svg viewBox="0 0 180 180" className="w-full h-full overflow-visible">
          <polygon points="90,20 24,142 110,152" fill={color} stroke={secondaryColor} strokeWidth="3.5" strokeLinejoin="round" />
          <polygon points="90,20 110,152 156,118" fill={secondaryColor} opacity="0.72" stroke={secondaryColor} strokeWidth="3.5" strokeLinejoin="round" />
          <line x1="24" y1="142" x2="156" y2="118" stroke="#fff" strokeWidth="1.8" strokeDasharray="5 4" opacity="0.7" />
        </svg>
      );

    case 'math-geo-grid-iso':
      return (
        <svg viewBox="0 0 240 175" className="w-full h-full overflow-visible">
          <rect x="8" y="8" width="224" height="159" rx="10" fill="#f8fafc" stroke={secondaryColor} strokeWidth="2.5" />
          {Array.from({ length: 7 }).map((_, r) =>
            Array.from({ length: 9 }).map((__, c) => {
              const offset = r % 2 === 1 ? 12 : 0;
              return (
                <circle
                  key={`${r}-${c}`}
                  cx={24 + c * 24 + offset}
                  cy={24 + r * 21}
                  r="2.6"
                  fill={color}
                />
              );
            })
          )}
        </svg>
      );

    // =========================================================
    // SABİT ÇİZİM & ÖLÇÜM ARAÇLARI
    // =========================================================
    case 'math-tool-ruler':
      return (
        <svg viewBox="0 0 260 72" className="w-full h-full overflow-visible">
          <rect x="8" y="10" width="244" height="52" rx="6" fill={color} stroke={secondaryColor} strokeWidth="3" />
          {Array.from({ length: 23 }).map((_, i) => {
            const x = 20 + i * 10;
            const isMajor = i % 5 === 0;
            return (
              <g key={i}>
                <line
                  x1={x}
                  y1={10}
                  x2={x}
                  y2={isMajor ? 32 : 22}
                  stroke={secondaryColor}
                  strokeWidth={isMajor ? 2.2 : 1.4}
                />
                {isMajor && (
                  <text x={x} y={48} textAnchor="middle" fontSize="11" fontWeight="700" fill={secondaryColor}>
                    {i / 5}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      );

    case 'math-tool-protractor':
      return (
        <svg viewBox="0 0 220 125" className="w-full h-full overflow-visible">
          <path d="M14 110 A96 96 0 0 1 206 110 Z" fill={color} fillOpacity="0.28" stroke={secondaryColor} strokeWidth="3.5" />
          <path d="M56 110 A54 54 0 0 1 164 110 Z" fill="#ffffff" fillOpacity="0.7" stroke={secondaryColor} strokeWidth="2" />
          <circle cx="110" cy="110" r="4" fill={secondaryColor} />
          {Array.from({ length: 13 }).map((_, i) => {
            const deg = i * 15;
            const rad = (deg * Math.PI) / 180;
            const x1 = 110 - 96 * Math.cos(rad);
            const y1 = 110 - 96 * Math.sin(rad);
            const len = i % 2 === 0 ? 14 : 8;
            const x2 = 110 - (96 - len) * Math.cos(rad);
            const y2 = 110 - (96 - len) * Math.sin(rad);
            return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke={secondaryColor} strokeWidth={i % 2 === 0 ? 2 : 1.3} />;
          })}
        </svg>
      );

    case 'math-tool-set-square':
      return (
        <svg viewBox="0 0 180 180" className="w-full h-full overflow-visible">
          <polygon points="20,160 20,20 160,160" fill={color} fillOpacity="0.32" stroke={secondaryColor} strokeWidth="4" strokeLinejoin="round" />
          <polygon points="44,138 44,74 108,138" fill="#ffffff" fillOpacity="0.75" stroke={secondaryColor} strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M20 144 H36 V160" fill="none" stroke={secondaryColor} strokeWidth="2.5" />
          {Array.from({ length: 11 }).map((_, i) => (
            <line key={i} x1={30 + i * 12} y1={160} x2={30 + i * 12} y2={152} stroke={secondaryColor} strokeWidth="1.6" />
          ))}
        </svg>
      );

    // =========================================================
    // HAREKETLİ GEOMETRİ & ÖLÇÜM
    // =========================================================
    case 'math-anim-polygon-spin': {
      const pulse = cv.vertexPulse ?? 0;
      const intensity = cv.vertexIntensity ?? 1;
      const pts = regularPolygonPoints(90, 90, 66, 6);
      const coords = pts.split(' ').map((p) => p.split(',').map(Number));
      return (
        <svg viewBox="0 0 180 180" className="w-full h-full overflow-visible">
          <polygon points={pts} fill={color} stroke={secondaryColor} strokeWidth="5" strokeLinejoin="round" />
          {coords.map(([vx, vy], idx) => (
            <circle
              key={idx}
              cx={vx}
              cy={vy}
              r={5 + pulse * 4 * intensity}
              fill="#fbbf24"
              stroke="#fff"
              strokeWidth="2"
            />
          ))}
        </svg>
      );
    }

    case 'math-anim-angle-sweep': {
      const deg = Math.max(0, Math.min(180, cv.angleDeg ?? 45));
      const rad = (deg * Math.PI) / 180;
      const rx = 50 + 108 * Math.cos(rad);
      const ry = 122 - 108 * Math.sin(rad);
      const ax = 50 + 44 * Math.cos(rad);
      const ay = 122 - 44 * Math.sin(rad);
      const largeArc = deg > 180 ? 1 : 0;
      return (
        <svg viewBox="0 0 190 155" className="w-full h-full overflow-visible">
          <path d={`M50 122 L94 122 A44 44 0 ${largeArc} 0 ${ax.toFixed(1)} ${ay.toFixed(1)} Z`} fill={color} opacity="0.25" />
          <path d={`M94 122 A44 44 0 ${largeArc} 0 ${ax.toFixed(1)} ${ay.toFixed(1)}`} fill="none" stroke={color} strokeWidth="3.5" />
          <line x1="50" y1="122" x2="168" y2="122" stroke={secondaryColor} strokeWidth="4.5" strokeLinecap="round" />
          <line x1="50" y1="122" x2={rx} y2={ry} stroke={color} strokeWidth="4.5" strokeLinecap="round" />
          <circle cx="50" cy="122" r="6" fill={secondaryColor} />
          <rect x="118" y="14" width="54" height="26" rx="8" fill={secondaryColor} />
          <text x="145" y="32" textAnchor="middle" fontSize="13" fontWeight="800" fill="#fff">
            {Math.round(deg)}°
          </text>
        </svg>
      );
    }

    case 'math-anim-3d-solid': {
      const phase = cv.orbitPhase ?? 0.5;
      const dx = Math.cos(phase) * 34;
      const dy = Math.sin(phase) * 10 - 16;
      return (
        <svg viewBox="0 0 180 180" className="w-full h-full overflow-visible">
          <rect x={44} y={62} width="74" height="74" fill={color} fillOpacity="0.85" stroke={secondaryColor} strokeWidth="3.5" />
          <polygon
            points={`44,62 ${44 + dx},${62 + dy} ${118 + dx},${62 + dy} 118,62`}
            fill={color}
            fillOpacity="0.6"
            stroke={secondaryColor}
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          <polygon
            points={`118,62 ${118 + dx},${62 + dy} ${118 + dx},${136 + dy} 118,136`}
            fill={secondaryColor}
            fillOpacity="0.7"
            stroke={secondaryColor}
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
        </svg>
      );
    }

    case 'math-anim-symmetry': {
      const rp = cv.reflectProgress ?? 0;
      const scaleReflect = 1 - 2 * Math.abs(rp);
      return (
        <svg viewBox="0 0 220 160" className="w-full h-full overflow-visible">
          {/* Simetri Ekseni */}
          <line x1="110" y1="14" x2="110" y2="146" stroke="#ef4444" strokeWidth="3" strokeDasharray="6 5" />
          {/* Sol Orijinal Şekil */}
          <polygon points="32,126 94,126 94,38" fill={secondaryColor} opacity="0.9" stroke="#1e293b" strokeWidth="2.5" strokeLinejoin="round" />
          {/* Sağ Yansıyan Şekil */}
          <g transform={`translate(110, 0) scale(${scaleReflect}, 1) translate(-110, 0)`}>
            <polygon points="126,126 188,126 126,38" fill={color} opacity="0.85" stroke="#1e293b" strokeWidth="2.5" strokeLinejoin="round" />
          </g>
        </svg>
      );
    }

    case 'math-anim-ruler-slide':
      return (
        <svg viewBox="0 0 260 90" className="w-full h-full overflow-visible">
          <line x1="12" y1="74" x2="248" y2="74" stroke="#94a3b8" strokeWidth="2.5" strokeDasharray="6 4" />
          <rect x="16" y="14" width="228" height="48" rx="6" fill={color} stroke={secondaryColor} strokeWidth="3" />
          {Array.from({ length: 21 }).map((_, i) => {
            const x = 28 + i * 10;
            const maj = i % 5 === 0;
            return <line key={i} x1={x} y1={14} x2={x} y2={maj ? 34 : 24} stroke={secondaryColor} strokeWidth={maj ? 2 : 1.2} />;
          })}
        </svg>
      );

    case 'math-anim-line-draw': {
      const dp = Math.max(0.05, Math.min(1, cv.drawProgress ?? 1));
      const xEnd = 24 + 192 * dp;
      return (
        <svg viewBox="0 0 240 80" className="w-full h-full overflow-visible">
          <line x1="24" y1="45" x2="216" y2="45" stroke="#cbd5e1" strokeWidth="3" strokeDasharray="5 5" />
          <line x1="24" y1="45" x2={xEnd} y2="45" stroke={color} strokeWidth="5" strokeLinecap="round" />
          <circle cx="24" cy="45" r="6" fill={secondaryColor} />
          <circle cx={xEnd} cy="45" r="7" fill={secondaryColor} stroke="#fff" strokeWidth="2" />
          <text x={(24 + xEnd) / 2} y="26" textAnchor="middle" fontSize="13" fontWeight="700" fill={color}>
            {Math.round(dp * 10)} cm
          </text>
        </svg>
      );
    }

    // =========================================================
    // PARÇALI GEOMETRİ & ÖLÇÜM
    // =========================================================
    case 'math-comp-cube-net': {
      const f = cv.foldProgress ?? 0;
      const pull = f * 24;
      const faceScale = 1 - f * 0.25;
      return (
        <svg viewBox="0 0 220 175" className="w-full h-full overflow-visible">
          {/* Base */}
          <g transform={partTx(parts['base'], 92, 87)} {...partInteractionProps('base')}>
            <rect x="72" y="67" width="40" height="40" fill={color} stroke={secondaryColor} strokeWidth="3" />
          </g>
          {/* Left */}
          <g transform={`translate(${pull}, 0) scale(${faceScale}, 1) ${partTx(parts['left'], 72, 87)}`} {...partInteractionProps('left')}>
            <rect x="32" y="67" width="40" height="40" fill={color} opacity="0.9" stroke={secondaryColor} strokeWidth="3" />
          </g>
          {/* Right */}
          <g transform={`translate(${-pull}, 0) ${partTx(parts['right'], 112, 87)}`} {...partInteractionProps('right')}>
            <rect x="112" y="67" width="40" height="40" fill={color} opacity="0.9" stroke={secondaryColor} strokeWidth="3" />
          </g>
          {/* Top */}
          <g transform={`translate(0, ${pull}) ${partTx(parts['top'], 92, 67)}`} {...partInteractionProps('top')}>
            <rect x="72" y="27" width="40" height="40" fill={color} opacity="0.85" stroke={secondaryColor} strokeWidth="3" />
          </g>
          {/* Front */}
          <g transform={`translate(0, ${-pull}) ${partTx(parts['front'], 92, 107)}`} {...partInteractionProps('front')}>
            <rect x="72" y="107" width="40" height="40" fill={color} opacity="0.85" stroke={secondaryColor} strokeWidth="3" />
          </g>
          {/* Back */}
          <g transform={`translate(${-pull * 1.6}, 0) ${partTx(parts['back'], 152, 87)}`} {...partInteractionProps('back')}>
            <rect x="152" y="67" width="40" height="40" fill={secondaryColor} opacity="0.7" stroke={secondaryColor} strokeWidth="3" />
          </g>
        </svg>
      );
    }

    case 'math-comp-pyramid-net': {
      const f = cv.foldProgress ?? 0;
      const tipShift = f * 44;
      return (
        <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
          <g transform={partTx(parts['base'], 100, 100)} {...partInteractionProps('base')}>
            <rect x="72" y="72" width="56" height="56" fill={color} stroke={secondaryColor} strokeWidth="3" />
          </g>
          <g transform={partTx(parts['face-top'], 100, 72)} {...partInteractionProps('face-top')}>
            <polygon points={`72,72 128,72 100,${18 + tipShift}`} fill={color} opacity="0.85" stroke={secondaryColor} strokeWidth="3" strokeLinejoin="round" />
          </g>
          <g transform={partTx(parts['face-right'], 128, 100)} {...partInteractionProps('face-right')}>
            <polygon points={`128,72 128,128 ${182 - tipShift},100`} fill={color} opacity="0.85" stroke={secondaryColor} strokeWidth="3" strokeLinejoin="round" />
          </g>
          <g transform={partTx(parts['face-bottom'], 100, 128)} {...partInteractionProps('face-bottom')}>
            <polygon points={`72,128 128,128 100,${182 - tipShift}`} fill={color} opacity="0.85" stroke={secondaryColor} strokeWidth="3" strokeLinejoin="round" />
          </g>
          <g transform={partTx(parts['face-left'], 72, 100)} {...partInteractionProps('face-left')}>
            <polygon points={`72,72 72,128 ${18 + tipShift},100`} fill={color} opacity="0.85" stroke={secondaryColor} strokeWidth="3" strokeLinejoin="round" />
          </g>
        </svg>
      );
    }

    case 'math-comp-cylinder-net': {
      const f = cv.foldProgress ?? 0;
      const bodyW = 148 - f * 52;
      const bodyX = 110 - bodyW / 2;
      const capRy = 22 - f * 10;
      return (
        <svg viewBox="0 0 220 185" className="w-full h-full overflow-visible">
          <g transform={partTx(parts['body'], 110, 92)} {...partInteractionProps('body')}>
            <rect x={bodyX} y="56" width={bodyW} height="74" rx="4" fill={color} stroke={secondaryColor} strokeWidth="3.5" />
          </g>
          <g transform={partTx(parts['top-cap'], 110, 34)} {...partInteractionProps('top-cap')}>
            <ellipse cx="110" cy={30 + f * 24} rx={24 + f * (bodyW / 2 - 24)} ry={capRy} fill={color} opacity="0.85" stroke={secondaryColor} strokeWidth="3.5" />
          </g>
          <g transform={partTx(parts['bottom-cap'], 110, 152)} {...partInteractionProps('bottom-cap')}>
            <ellipse cx="110" cy={156 - f * 24} rx={24 + f * (bodyW / 2 - 24)} ry={capRy} fill={color} opacity="0.85" stroke={secondaryColor} strokeWidth="3.5" />
          </g>
        </svg>
      );
    }

    case 'math-comp-scissors':
      return (
        <svg viewBox="0 0 190 130" className="w-full h-full overflow-visible">
          <g transform={partTx(parts['blade-top'], 86, 65)} {...partInteractionProps('blade-top')}>
            <path d="M84 65 L172 48 L166 65 Z" fill={color} stroke="#334155" strokeWidth="2.5" strokeLinejoin="round" />
            <line x1="50" y1="54" x2="88" y2="65" stroke="#334155" strokeWidth="5" strokeLinecap="round" />
            <circle cx="34" cy="46" r="16" fill="none" stroke={secondaryColor} strokeWidth="7" />
          </g>
          <g transform={partTx(parts['blade-bottom'], 86, 65)} {...partInteractionProps('blade-bottom')}>
            <path d="M84 65 L172 82 L166 65 Z" fill={color} stroke="#334155" strokeWidth="2.5" strokeLinejoin="round" />
            <line x1="50" y1="76" x2="88" y2="65" stroke="#334155" strokeWidth="5" strokeLinecap="round" />
            <circle cx="34" cy="84" r="16" fill="none" stroke={secondaryColor} strokeWidth="7" />
          </g>
          <g transform={partTx(parts['pivot'], 86, 65)} {...partInteractionProps('pivot')}>
            <circle cx="86" cy="65" r="5.5" fill="#e2e8f0" stroke="#1e293b" strokeWidth="2.5" />
          </g>
        </svg>
      );

    case 'math-comp-polygon-parts': {
      const hp = cv.highlightPhase ?? 0;
      const pts = regularPolygonPoints(90, 88, 64, 5);
      const coords = pts.split(' ').map((p) => p.split(',').map(Number));
      return (
        <svg viewBox="0 0 180 175" className="w-full h-full overflow-visible">
          <g transform={partTx(parts['interior'], 90, 88)} {...partInteractionProps('interior')}>
            <polygon points={pts} fill={color} opacity="0.35" />
          </g>
          <g transform={partTx(parts['edges'], 90, 88)} {...partInteractionProps('edges')}>
            <polygon points={pts} fill="none" stroke={color} strokeWidth={4 + Math.sin(hp * Math.PI) * 3} strokeLinejoin="round" />
          </g>
          <g transform={partTx(parts['vertices'], 90, 88)} {...partInteractionProps('vertices')}>
            {coords.map(([vx, vy], idx) => (
              <circle key={idx} cx={vx} cy={vy} r={6 + Math.cos(hp * Math.PI * 2) * 2} fill={secondaryColor} stroke="#fff" strokeWidth="2" />
            ))}
          </g>
        </svg>
      );
    }

    default:
      return null;
  }
}
