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

export function renderPhase2MathAsset({
  assetId,
  color,
  secondaryColor,
  mathState,
  parts,
  partInteractionProps,
}: PhaseRendererCtx): React.ReactNode | null {
  const cv = mathState?.customValues || {};
  const wheelAngle = mathState?.wheelAngle ?? 0;

  switch (assetId) {
    // =========================================================
    // SABİT GÜNLÜK YAŞAM
    // =========================================================
    case 'math-daily-pizza':
      return (
        <svg viewBox="0 0 180 180" className="w-full h-full overflow-visible">
          <circle cx="90" cy="90" r="72" fill="#d97706" stroke="#92400e" strokeWidth="4" />
          <circle cx="90" cy="90" r="61" fill={color} />
          {Array.from({ length: 8 }).map((_, i) => {
            const a = (i * 45 * Math.PI) / 180;
            return (
              <line
                key={i}
                x1="90"
                y1="90"
                x2={90 + 72 * Math.cos(a)}
                y2={90 + 72 * Math.sin(a)}
                stroke="#78350f"
                strokeWidth="2.5"
              />
            );
          })}
          {[
            [68, 62],
            [114, 65],
            [118, 108],
            [70, 118],
            [90, 50],
            [56, 92],
          ].map(([cx, cy], idx) => (
            <circle key={idx} cx={cx} cy={cy} r="7.5" fill={secondaryColor} />
          ))}
        </svg>
      );

    case 'math-daily-cake':
      return (
        <svg viewBox="0 0 180 165" className="w-full h-full overflow-visible">
          <rect x="26" y="88" width="128" height="52" rx="10" fill={color} stroke="#be185d" strokeWidth="3.5" />
          <rect x="44" y="48" width="92" height="42" rx="8" fill={secondaryColor} stroke="#be185d" strokeWidth="3" />
          <path d="M26 98 Q48 112 70 98 T114 98 T154 98" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
          <rect x="86" y="22" width="8" height="26" rx="3" fill="#38bdf8" />
          <ellipse cx="90" cy="16" rx="5" ry="8" fill="#fbbf24" />
        </svg>
      );

    case 'math-daily-bookshelf':
      return (
        <svg viewBox="0 0 175 200" className="w-full h-full overflow-visible">
          <rect x="20" y="14" width="135" height="172" rx="6" fill={color} stroke="#451a03" strokeWidth="4" />
          <rect x="28" y="24" width="119" height="46" fill="#fef3c7" opacity="0.25" />
          <rect x="28" y="78" width="119" height="46" fill="#fef3c7" opacity="0.25" />
          <rect x="28" y="132" width="119" height="46" fill="#fef3c7" opacity="0.25" />
          {/* Books */}
          <rect x="34" y="34" width="16" height="36" rx="2" fill={secondaryColor} />
          <rect x="52" y="38" width="14" height="32" rx="2" fill="#ef4444" />
          <rect x="68" y="32" width="18" height="38" rx="2" fill="#10b981" />
          <rect x="96" y="86" width="16" height="38" rx="2" fill="#f59e0b" />
          <rect x="114" y="90" width="16" height="34" rx="2" fill="#8b5cf6" />
          <rect x="40" y="140" width="20" height="38" rx="2" fill={secondaryColor} />
          <rect x="62" y="144" width="15" height="34" rx="2" fill="#ec4899" />
        </svg>
      );

    case 'math-daily-table':
      return (
        <svg viewBox="0 0 220 150" className="w-full h-full overflow-visible">
          <rect x="16" y="32" width="188" height="20" rx="6" fill={color} stroke={secondaryColor} strokeWidth="3.5" />
          <rect x="30" y="52" width="14" height="82" rx="3" fill={secondaryColor} />
          <rect x="176" y="52" width="14" height="82" rx="3" fill={secondaryColor} />
          <rect x="50" y="52" width="10" height="62" rx="2" fill={secondaryColor} opacity="0.7" />
          <rect x="160" y="52" width="10" height="62" rx="2" fill={secondaryColor} opacity="0.7" />
        </svg>
      );

    case 'math-daily-chair':
      return (
        <svg viewBox="0 0 150 190" className="w-full h-full overflow-visible">
          <rect x="38" y="22" width="74" height="66" rx="8" fill={color} stroke={secondaryColor} strokeWidth="3.5" />
          <rect x="32" y="92" width="86" height="16" rx="6" fill={color} stroke={secondaryColor} strokeWidth="3.5" />
          <rect x="40" y="108" width="10" height="64" rx="3" fill={secondaryColor} />
          <rect x="100" y="108" width="10" height="64" rx="3" fill={secondaryColor} />
        </svg>
      );

    case 'math-daily-building':
      return (
        <svg viewBox="0 0 170 220" className="w-full h-full overflow-visible">
          <rect x="30" y="22" width="110" height="184" rx="6" fill={color} stroke="#1e293b" strokeWidth="3.5" />
          {Array.from({ length: 5 }).map((_, r) =>
            Array.from({ length: 3 }).map((__, c) => (
              <rect
                key={`${r}-${c}`}
                x={44 + c * 30}
                y={36 + r * 28}
                width="20"
                height="18"
                rx="3"
                fill={secondaryColor}
              />
            ))
          )}
          <rect x="72" y="176" width="26" height="30" rx="3" fill="#1e293b" />
        </svg>
      );

    case 'math-daily-bridge':
      return (
        <svg viewBox="0 0 260 150" className="w-full h-full overflow-visible">
          <rect x="12" y="88" width="236" height="14" rx="4" fill={secondaryColor} />
          <path d="M24 88 Q75 26 130 88 Q185 26 236 88" fill="none" stroke={color} strokeWidth="6" />
          <line x1="65" y1="54" x2="65" y2="88" stroke={color} strokeWidth="3" />
          <line x1="90" y1="54" x2="90" y2="88" stroke={color} strokeWidth="3" />
          <line x1="170" y1="54" x2="170" y2="88" stroke={color} strokeWidth="3" />
          <line x1="195" y1="54" x2="195" y2="88" stroke={color} strokeWidth="3" />
          <rect x="30" y="102" width="16" height="36" fill={secondaryColor} />
          <rect x="214" y="102" width="16" height="36" fill={secondaryColor} />
        </svg>
      );

    case 'math-daily-traffic-cone':
      return (
        <svg viewBox="0 0 140 180" className="w-full h-full overflow-visible">
          <rect x="18" y="152" width="104" height="14" rx="5" fill={color} stroke="#9a3412" strokeWidth="3" />
          <polygon points="56,22 84,22 106,152 34,152" fill={color} stroke="#9a3412" strokeWidth="3" strokeLinejoin="round" />
          <polygon points="49,64 91,64 95,86 45,86" fill={secondaryColor} />
          <polygon points="41,108 99,108 103,130 37,130" fill={secondaryColor} />
        </svg>
      );

    case 'math-daily-bottle':
      return (
        <svg viewBox="0 0 120 200" className="w-full h-full overflow-visible">
          <rect x="46" y="16" width="28" height="14" rx="4" fill={secondaryColor} />
          <path d="M46 30 L30 62 V176 A10 10 0 0 0 40 186 H80 A10 10 0 0 0 90 176 V62 L74 30 Z" fill="#e0f2fe" stroke={secondaryColor} strokeWidth="3.5" />
          <rect x="32" y="98" width="56" height="84" rx="6" fill={color} opacity="0.7" />
        </svg>
      );

    case 'math-daily-can':
      return (
        <svg viewBox="0 0 130 180" className="w-full h-full overflow-visible">
          <rect x="28" y="34" width="74" height="118" rx="8" fill={color} stroke="#475569" strokeWidth="3.5" />
          <ellipse cx="65" cy="34" rx="37" ry="12" fill={secondaryColor} stroke="#475569" strokeWidth="3" />
          <ellipse cx="65" cy="152" rx="37" ry="10" fill={color} stroke="#475569" strokeWidth="3" />
          <rect x="28" y="68" width="74" height="34" fill="#ffffff" opacity="0.25" />
        </svg>
      );

    case 'math-daily-flagpole':
      return (
        <svg viewBox="0 0 160 220" className="w-full h-full overflow-visible">
          <rect x="28" y="20" width="8" height="184" rx="4" fill={secondaryColor} />
          <circle cx="32" cy="18" r="7" fill="#fbbf24" />
          <path d="M36 28 Q78 18 134 32 V86 Q78 72 36 84 Z" fill={color} stroke="#991b1b" strokeWidth="2.5" />
          <rect x="14" y="198" width="36" height="12" rx="4" fill="#334155" />
        </svg>
      );

    case 'math-daily-tree':
      return (
        <svg viewBox="0 0 165 210" className="w-full h-full overflow-visible">
          <rect x="70" y="112" width="24" height="84" rx="5" fill={secondaryColor} />
          <circle cx="82" cy="76" r="46" fill={color} />
          <circle cx="52" cy="94" r="32" fill={color} />
          <circle cx="112" cy="94" r="32" fill={color} />
          <circle cx="82" cy="50" r="30" fill="#4ade80" opacity="0.45" />
        </svg>
      );

    case 'math-daily-sun-moon':
      return (
        <svg viewBox="0 0 200 150" className="w-full h-full overflow-visible">
          <circle cx="72" cy="60" r="32" fill={color} stroke="#f59e0b" strokeWidth="3" />
          {Array.from({ length: 8 }).map((_, i) => {
            const a = (i * 45 * Math.PI) / 180;
            return (
              <line
                key={i}
                x1={72 + 38 * Math.cos(a)}
                y1={60 + 38 * Math.sin(a)}
                x2={72 + 48 * Math.cos(a)}
                y2={60 + 48 * Math.sin(a)}
                stroke="#f59e0b"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
            );
          })}
          <path d="M84 114 H168 A20 20 0 0 0 166 74 A26 26 0 0 0 118 66 A22 22 0 0 0 84 114 Z" fill={secondaryColor} stroke="#94a3b8" strokeWidth="2.5" />
        </svg>
      );

    case 'math-daily-mountain':
      return (
        <svg viewBox="0 0 240 160" className="w-full h-full overflow-visible">
          <polygon points="18,122 86,28 154,122" fill={color} stroke="#312e81" strokeWidth="3" strokeLinejoin="round" />
          <polygon points="96,122 160,44 224,122" fill={color} opacity="0.82" stroke="#312e81" strokeWidth="3" strokeLinejoin="round" />
          <polygon points="71,49 86,28 101,49 91,45 86,52 80,45" fill="#fff" />
          <rect x="10" y="120" width="220" height="28" rx="6" fill={secondaryColor} />
        </svg>
      );

    case 'math-daily-map':
      return (
        <svg viewBox="0 0 210 160" className="w-full h-full overflow-visible">
          <polygon points="18,28 76,18 76,132 18,142" fill={color} stroke="#b45309" strokeWidth="2.5" />
          <polygon points="76,18 134,30 134,144 76,132" fill="#fef3c7" stroke="#b45309" strokeWidth="2.5" />
          <polygon points="134,30 192,20 192,134 134,144" fill={color} stroke="#b45309" strokeWidth="2.5" />
          <path d="M40 112 Q82 54 112 90 T168 50" fill="none" stroke={secondaryColor} strokeWidth="3.5" strokeDasharray="6 4" />
          <circle cx="40" cy="112" r="6" fill="#22c55e" />
          <circle cx="168" cy="50" r="7" fill={secondaryColor} />
        </svg>
      );

    // =========================================================
    // HAREKETLİ GÜNLÜK YAŞAM
    // =========================================================
    case 'math-anim-wheel':
      return (
        <svg viewBox="0 0 180 180" className="w-full h-full overflow-visible">
          <g transform={`rotate(${wheelAngle}, 90, 90)`}>
            <circle cx="90" cy="90" r="68" fill="none" stroke={color} strokeWidth="12" />
            <circle cx="90" cy="90" r="56" fill="none" stroke={secondaryColor} strokeWidth="3" />
            {Array.from({ length: 8 }).map((_, i) => {
              const a = (i * 45 * Math.PI) / 180;
              return <line key={i} x1="90" y1="90" x2={90 + 56 * Math.cos(a)} y2={90 + 56 * Math.sin(a)} stroke="#94a3b8" strokeWidth="2.5" />;
            })}
            <circle cx="90" cy="90" r="10" fill={secondaryColor} />
            <circle cx="90" cy="34" r="5" fill="#ef4444" />
          </g>
        </svg>
      );

    case 'math-anim-sports-ball':
      return (
        <svg viewBox="0 0 150 150" className="w-full h-full overflow-visible">
          <circle cx="75" cy="75" r="58" fill={color} stroke={secondaryColor} strokeWidth="4" />
          <path d="M17 75 H133 M75 17 V133" stroke={secondaryColor} strokeWidth="3" />
          <path d="M34 34 Q75 75 34 116 M116 34 Q75 75 116 116" fill="none" stroke={secondaryColor} strokeWidth="3" />
        </svg>
      );

    case 'math-anim-elevator': {
      const lvl = Math.max(0, Math.min(100, cv.elevatorLevel ?? 20));
      const cabinY = 148 - (lvl / 100) * 110;
      return (
        <svg viewBox="0 0 150 215" className="w-full h-full overflow-visible">
          <rect x="28" y="14" width="94" height="186" rx="8" fill="#f1f5f9" stroke={secondaryColor} strokeWidth="4" />
          <line x1="75" y1="14" x2="75" y2={cabinY} stroke="#94a3b8" strokeWidth="3" />
          <rect x="42" y={cabinY} width="66" height="44" rx="6" fill={color} stroke={secondaryColor} strokeWidth="3" />
          <rect x="52" y={cabinY + 8} width="46" height="22" rx="3" fill="#e0f2fe" />
        </svg>
      );
    }

    case 'math-anim-propeller':
      return (
        <svg viewBox="0 0 180 180" className="w-full h-full overflow-visible">
          <g transform={`rotate(${wheelAngle}, 90, 90)`}>
            {[0, 120, 240].map((deg) => (
              <ellipse
                key={deg}
                cx="90"
                cy="44"
                rx="16"
                ry="40"
                fill={color}
                stroke={secondaryColor}
                strokeWidth="3"
                transform={`rotate(${deg}, 90, 90)`}
              />
            ))}
            <circle cx="90" cy="90" r="14" fill={secondaryColor} />
          </g>
        </svg>
      );

    case 'math-anim-water-wave': {
      const wp = cv.wavePhase ?? 0;
      const pts: string[] = ['M 12 85'];
      for (let x = 12; x <= 208; x += 8) {
        const y = 52 + Math.sin((x - 12) * 0.055 + wp) * 18;
        pts.push(`L ${x} ${y.toFixed(1)}`);
      }
      pts.push('L 208 104 L 12 104 Z');
      return (
        <svg viewBox="0 0 220 120" className="w-full h-full overflow-visible">
          <path d={pts.join(' ')} fill={color} fillOpacity="0.78" stroke={secondaryColor} strokeWidth="3" />
        </svg>
      );
    }

    case 'math-anim-ferris-wheel':
      return (
        <svg viewBox="0 0 200 215" className="w-full h-full overflow-visible">
          {/* Base A-frame */}
          <line x1="100" y1="95" x2="54" y2="195" stroke={secondaryColor} strokeWidth="6" strokeLinecap="round" />
          <line x1="100" y1="95" x2="146" y2="195" stroke={secondaryColor} strokeWidth="6" strokeLinecap="round" />
          <line x1="44" y1="195" x2="156" y2="195" stroke={secondaryColor} strokeWidth="6" strokeLinecap="round" />
          {/* Rotating Rim + Upright Cabins */}
          <g transform={`rotate(${wheelAngle}, 100, 95)`}>
            <circle cx="100" cy="95" r="70" fill="none" stroke={color} strokeWidth="5" />
            {Array.from({ length: 6 }).map((_, i) => {
              const a = (i * 60 * Math.PI) / 180;
              const cx = 100 + 70 * Math.cos(a);
              const cy = 95 + 70 * Math.sin(a);
              return (
                <g key={i}>
                  <line x1="100" y1="95" x2={cx} y2={cy} stroke="#94a3b8" strokeWidth="2.5" />
                  <g transform={`translate(${cx}, ${cy}) rotate(${-wheelAngle})`}>
                    <rect x="-10" y="2" width="20" height="18" rx="4" fill={color} stroke={secondaryColor} strokeWidth="2" />
                  </g>
                </g>
              );
            })}
            <circle cx="100" cy="95" r="9" fill={secondaryColor} />
          </g>
        </svg>
      );

    // =========================================================
    // PARÇALI GÜNLÜK YAŞAM
    // =========================================================
    case 'math-comp-bicycle':
      return (
        <svg viewBox="0 0 240 150" className="w-full h-full overflow-visible">
          <g transform={partTx(parts['rear-wheel'], 52, 102)} {...partInteractionProps('rear-wheel')}>
            <circle cx="52" cy="102" r="34" fill="none" stroke={secondaryColor} strokeWidth="6" />
            <line x1="52" y1="68" x2="52" y2="136" stroke="#94a3b8" strokeWidth="2" />
            <line x1="18" y1="102" x2="86" y2="102" stroke="#94a3b8" strokeWidth="2" />
          </g>
          <g transform={partTx(parts['front-wheel'], 184, 102)} {...partInteractionProps('front-wheel')}>
            <circle cx="184" cy="102" r="34" fill="none" stroke={secondaryColor} strokeWidth="6" />
            <line x1="184" y1="68" x2="184" y2="136" stroke="#94a3b8" strokeWidth="2" />
            <line x1="150" y1="102" x2="218" y2="102" stroke="#94a3b8" strokeWidth="2" />
          </g>
          <g transform={partTx(parts['frame'], 115, 75)} {...partInteractionProps('frame')}>
            <polygon points="52,102 106,102 158,52 90,52" fill="none" stroke={color} strokeWidth="5.5" strokeLinejoin="round" />
            <line x1="152" y1="36" x2="184" y2="102" stroke={color} strokeWidth="5.5" strokeLinecap="round" />
            <line x1="142" y1="34" x2="164" y2="34" stroke={secondaryColor} strokeWidth="5" strokeLinecap="round" />
            <line x1="82" y1="42" x2="102" y2="42" stroke={secondaryColor} strokeWidth="6" strokeLinecap="round" />
          </g>
          <g transform={partTx(parts['pedal'], 106, 102)} {...partInteractionProps('pedal')}>
            <circle cx="106" cy="102" r="10" fill={secondaryColor} />
            <line x1="106" y1="102" x2="106" y2="120" stroke="#475569" strokeWidth="4" />
          </g>
        </svg>
      );

    case 'math-comp-seesaw':
      return (
        <svg viewBox="0 0 240 135" className="w-full h-full overflow-visible">
          <g transform={partTx(parts['support'], 120, 96)} {...partInteractionProps('support')}>
            <polygon points="120,74 96,118 144,118" fill={secondaryColor} stroke="#1e293b" strokeWidth="3" strokeLinejoin="round" />
          </g>
          <g transform={partTx(parts['plank'], 120, 74)} {...partInteractionProps('plank')}>
            <rect x="22" y="66" width="196" height="14" rx="6" fill={color} stroke="#b45309" strokeWidth="3" />
          </g>
          <g transform={partTx(parts['left-load'], 42, 54)} {...partInteractionProps('left-load')}>
            <rect x="28" y="42" width="28" height="24" rx="4" fill="#3b82f6" />
          </g>
          <g transform={partTx(parts['right-load'], 198, 54)} {...partInteractionProps('right-load')}>
            <rect x="184" y="42" width="28" height="24" rx="4" fill="#ef4444" />
          </g>
        </svg>
      );

    case 'math-comp-crane':
      return (
        <svg viewBox="0 0 220 215" className="w-full h-full overflow-visible">
          <g transform={partTx(parts['tower'], 52, 110)} {...partInteractionProps('tower')}>
            <rect x="38" y="34" width="26" height="164" fill={color} stroke={secondaryColor} strokeWidth="3" />
            <rect x="24" y="194" width="54" height="12" rx="3" fill={secondaryColor} />
          </g>
          <g transform={partTx(parts['boom'], 52, 42)} {...partInteractionProps('boom')}>
            <rect x="22" y="34" width="176" height="18" rx="4" fill={color} stroke={secondaryColor} strokeWidth="3" />
          </g>
          <g transform={partTx(parts['hook'], 162, 110)} {...partInteractionProps('hook')}>
            <line x1="162" y1="52" x2="162" y2="122" stroke="#475569" strokeWidth="3" />
            <rect x="142" y="122" width="40" height="32" rx="5" fill="#ef4444" stroke={secondaryColor} strokeWidth="3" />
          </g>
        </svg>
      );

    case 'math-comp-pulley':
      return (
        <svg viewBox="0 0 170 205" className="w-full h-full overflow-visible">
          <rect x="52" y="12" width="66" height="10" rx="4" fill={secondaryColor} />
          <line x1="56" y1="46" x2="56" y2="165" stroke="#64748b" strokeWidth="3.5" />
          <line x1="114" y1="46" x2="114" y2="132" stroke="#64748b" strokeWidth="3.5" />
          <g transform={partTx(parts['pulley-wheel'], 85, 46)} {...partInteractionProps('pulley-wheel')}>
            <circle cx="85" cy="46" r="28" fill={color} stroke={secondaryColor} strokeWidth="4" />
            <circle cx="85" cy="46" r="8" fill="#fff" />
          </g>
          <g transform={partTx(parts['load'], 114, 150)} {...partInteractionProps('load')}>
            <rect x="94" y="132" width="40" height="36" rx="5" fill="#f59e0b" stroke={secondaryColor} strokeWidth="3" />
          </g>
        </svg>
      );

    case 'math-comp-belt-pulley':
      return (
        <svg viewBox="0 0 230 140" className="w-full h-full overflow-visible">
          <g transform={partTx(parts['belt'], 115, 70)} {...partInteractionProps('belt')}>
            <path d="M58 26 L172 42 A28 28 0 0 1 172 98 L58 114 A44 44 0 0 1 58 26 Z" fill="none" stroke={secondaryColor} strokeWidth="6" />
          </g>
          <g transform={partTx(parts['left-pulley'], 58, 70)} {...partInteractionProps('left-pulley')}>
            <circle cx="58" cy="70" r="38" fill={color} stroke="#1e293b" strokeWidth="3.5" />
            <line x1="58" y1="32" x2="58" y2="108" stroke="#fff" strokeWidth="3" />
          </g>
          <g transform={partTx(parts['right-pulley'], 172, 70)} {...partInteractionProps('right-pulley')}>
            <circle cx="172" cy="70" r="24" fill={color} stroke="#1e293b" strokeWidth="3.5" />
            <line x1="172" y1="46" x2="172" y2="94" stroke="#fff" strokeWidth="3" />
          </g>
        </svg>
      );

    case 'math-comp-water-tank': {
      const wpct = Math.max(0, Math.min(100, cv.waterPct ?? 55));
      const wh = (wpct / 100) * 116;
      return (
        <svg viewBox="0 0 180 195" className="w-full h-full overflow-visible">
          <g transform={partTx(parts['pipes'], 90, 95)} {...partInteractionProps('pipes')}>
            <path d="M12 46 H42 V72" fill="none" stroke={secondaryColor} strokeWidth="8" />
            <path d="M138 148 H168" fill="none" stroke={secondaryColor} strokeWidth="8" />
          </g>
          <g transform={partTx(parts['water-level'], 90, 140)} {...partInteractionProps('water-level')}>
            <rect x="44" y={162 - wh} width="92" height={wh} rx="4" fill={color} opacity="0.78" />
          </g>
          <g transform={partTx(parts['tank'], 90, 95)} {...partInteractionProps('tank')}>
            <rect x="40" y="40" width="100" height="126" rx="10" fill="none" stroke={secondaryColor} strokeWidth="4.5" />
          </g>
        </svg>
      );
    }

    case 'math-comp-stairs': {
      const sh = cv.stepHighlight ?? -1;
      return (
        <svg viewBox="0 0 200 175" className="w-full h-full overflow-visible">
          <g transform={partTx(parts['rails'], 100, 88)} {...partInteractionProps('rails')}>
            <line x1="28" y1="150" x2="172" y2="30" stroke={secondaryColor} strokeWidth="8" strokeLinecap="round" />
          </g>
          <g transform={partTx(parts['steps'], 100, 88)} {...partInteractionProps('steps')}>
            {Array.from({ length: 5 }).map((_, i) => (
              <rect
                key={i}
                x={28 + i * 28}
                y={132 - i * 24}
                width="34"
                height="12"
                rx="3"
                fill={sh === i ? '#f59e0b' : color}
                stroke={secondaryColor}
                strokeWidth="2"
              />
            ))}
          </g>
        </svg>
      );
    }

    case 'math-comp-roller-coaster': {
      const ct = cv.coasterT ?? 0.15;
      const cx = 24 + ct * 192;
      const cy = 90 - Math.sin(ct * Math.PI * 2) * 34;
      return (
        <svg viewBox="0 0 240 160" className="w-full h-full overflow-visible">
          <g transform={partTx(parts['track'], 120, 85)} {...partInteractionProps('track')}>
            <path d="M20 90 Q68 26 120 90 T220 90" fill="none" stroke={secondaryColor} strokeWidth="6" strokeLinecap="round" />
            <line x1="68" y1="58" x2="68" y2="142" stroke="#94a3b8" strokeWidth="3.5" />
            <line x1="170" y1="122" x2="170" y2="142" stroke="#94a3b8" strokeWidth="3.5" />
          </g>
          <g transform={partTx(parts['cart'], cx, cy)} {...partInteractionProps('cart')}>
            <rect x={cx - 16} y={cy - 18} width="32" height="16" rx="5" fill={color} stroke="#1e293b" strokeWidth="2.5" />
            <circle cx={cx - 10} cy={cy} r="4.5" fill="#1e293b" />
            <circle cx={cx + 10} cy={cy} r="4.5" fill="#1e293b" />
          </g>
        </svg>
      );
    }

    default:
      return null;
  }
}

