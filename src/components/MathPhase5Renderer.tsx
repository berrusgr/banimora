import React from 'react';
import { CompositePartState, VectorAssetId } from '../types/studio';
import { ComputedMathAssetState } from '../data/mathAssetsRegistry';

export interface MathPhaseRenderContext {
  assetId: VectorAssetId;
  color: string;
  secondaryColor: string;
  mathState?: ComputedMathAssetState;
  parts: Record<string, CompositePartState>;
  partInteractionProps: (partId: string) => React.SVGAttributes<SVGGElement>;
}

function pTransform(pt: CompositePartState | undefined, px: number, py: number): string {
  if (!pt) return '';
  const cx = pt.pivotX ?? px;
  const cy = pt.pivotY ?? py;
  return `translate(${pt.offsetX || 0}, ${pt.offsetY || 0}) translate(${cx}, ${cy}) rotate(${pt.rotation || 0}) scale(${pt.scale ?? 1}) translate(${-cx}, ${-cy})`;
}

export function renderPhase5MathAsset(ctx: MathPhaseRenderContext): React.ReactNode | null {
  const { assetId, color, secondaryColor, mathState, parts, partInteractionProps } = ctx;
  const cv = mathState?.customValues || {};

  switch (assetId) {
    // =========================================================================
    // A. SAYILAR VE TEMEL MATEMATİK NESNELERİ
    // =========================================================================
    case 'math-num-line':
      return (
        <svg viewBox="0 0 260 80" className="w-full h-full overflow-visible">
          <line x1="18" y1="40" x2="242" y2="40" stroke={color} strokeWidth="3.5" strokeLinecap="round" />
          <polygon points="10,40 22,33 22,47" fill={color} />
          <polygon points="250,40 238,33 238,47" fill={color} />
          {[-4, -3, -2, -1, 0, 1, 2, 3, 4].map((n, idx) => {
            const x = 36 + idx * 23.5;
            const isZero = n === 0;
            return (
              <g key={n}>
                <line x1={x} y1={isZero ? 26 : 33} x2={x} y2={isZero ? 54 : 47} stroke={isZero ? secondaryColor : color} strokeWidth={isZero ? 3 : 2} />
                <text x={x} y="66" textAnchor="middle" fontSize="11" fontWeight={isZero ? '800' : '600'} fill={isZero ? secondaryColor : color}>
                  {n}
                </text>
              </g>
            );
          })}
          <circle cx="177" cy="40" r="5" fill={secondaryColor} />
        </svg>
      );

    case 'math-num-cards':
      return (
        <svg viewBox="0 0 190 110" className="w-full h-full overflow-visible">
          {[1, 2, 3].map((n, i) => (
            <g key={n} transform={`translate(${14 + i * 56}, 14)`}>
              <rect x="0" y="0" width="48" height="82" rx="10" fill={secondaryColor} stroke={color} strokeWidth="3.5" />
              <text x="24" y="52" textAnchor="middle" fontSize="34" fontWeight="800" fill={color}>
                {n}
              </text>
            </g>
          ))}
        </svg>
      );

    case 'math-num-fraction-strips':
      return (
        <svg viewBox="0 0 220 130" className="w-full h-full overflow-visible">
          {/* 1 Whole */}
          <rect x="10" y="10" width="200" height="22" rx="4" fill={color} />
          <text x="110" y="25" textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">1 Bütün</text>
          {/* 1/2 */}
          {[0, 1].map((i) => (
            <g key={i}>
              <rect x={10 + i * 100} y="38" width="98" height="22" rx="4" fill={secondaryColor} stroke={color} strokeWidth="2" />
              <text x={59 + i * 100} y="53" textAnchor="middle" fontSize="11" fontWeight="700" fill={color}>1/2</text>
            </g>
          ))}
          {/* 1/3 */}
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect x={10 + i * 67} y="66" width="64" height="22" rx="4" fill={secondaryColor} stroke={color} strokeWidth="2" />
              <text x={42 + i * 67} y="81" textAnchor="middle" fontSize="11" fontWeight="700" fill={color}>1/3</text>
            </g>
          ))}
          {/* 1/4 */}
          {[0, 1, 2, 3].map((i) => (
            <g key={i}>
              <rect x={10 + i * 50.5} y="94" width="48" height="22" rx="4" fill={secondaryColor} stroke={color} strokeWidth="2" />
              <text x={34 + i * 50.5} y="109" textAnchor="middle" fontSize="11" fontWeight="700" fill={color}>1/4</text>
            </g>
          ))}
        </svg>
      );

    case 'math-num-fraction-circles':
      return (
        <svg viewBox="0 0 170 150" className="w-full h-full overflow-visible">
          {/* 1/2 circle */}
          <g transform="translate(46, 52)">
            <circle cx="0" cy="0" r="32" fill={secondaryColor} stroke={color} strokeWidth="2.5" />
            <path d="M 0,-32 A 32,32 0 0,1 0,32 Z" fill={color} />
            <text x="0" y="50" textAnchor="middle" fontSize="12" fontWeight="700" fill={color}>1/2</text>
          </g>
          {/* 1/4 circle */}
          <g transform="translate(124, 52)">
            <circle cx="0" cy="0" r="32" fill={secondaryColor} stroke={color} strokeWidth="2.5" />
            <path d="M 0,0 L 0,-32 A 32,32 0 0,1 32,0 Z" fill={color} />
            <line x1="-32" y1="0" x2="32" y2="0" stroke={color} strokeWidth="1.5" />
            <line x1="0" y1="-32" x2="0" y2="32" stroke={color} strokeWidth="1.5" />
            <text x="0" y="50" textAnchor="middle" fontSize="12" fontWeight="700" fill={color}>1/4</text>
          </g>
        </svg>
      );

    case 'math-num-hundred-table':
      return (
        <svg viewBox="0 0 180 140" className="w-full h-full overflow-visible">
          <rect x="10" y="10" width="160" height="120" rx="8" fill={secondaryColor} stroke={color} strokeWidth="2.5" />
          {Array.from({ length: 20 }).map((_, i) => {
            const col = i % 5;
            const row = Math.floor(i / 5);
            const x = 14 + col * 31;
            const y = 14 + row * 28.5;
            return (
              <g key={i}>
                <rect x={x} y={y} width="28" height="25" rx="4" fill="#ffffff" stroke={color} strokeWidth="1.2" opacity="0.9" />
                <text x={x + 14} y={y + 16.5} textAnchor="middle" fontSize="11" fontWeight="700" fill={color}>
                  {i + 1}
                </text>
              </g>
            );
          })}
        </svg>
      );

    case 'math-num-place-value':
      return (
        <svg viewBox="0 0 200 130" className="w-full h-full overflow-visible">
          <rect x="10" y="12" width="180" height="106" rx="8" fill="#ffffff" stroke={color} strokeWidth="2.5" />
          <rect x="10" y="12" width="180" height="32" rx="8" fill={color} />
          <line x1="70" y1="12" x2="70" y2="118" stroke={color} strokeWidth="2" />
          <line x1="130" y1="12" x2="130" y2="118" stroke={color} strokeWidth="2" />
          <text x="40" y="32" textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#fff">Yüzlük</text>
          <text x="100" y="32" textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#fff">Onluk</text>
          <text x="160" y="32" textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#fff">Birlik</text>
          <text x="40" y="88" textAnchor="middle" fontSize="30" fontWeight="800" fill={color}>3</text>
          <text x="100" y="88" textAnchor="middle" fontSize="30" fontWeight="800" fill={color}>4</text>
          <text x="160" y="88" textAnchor="middle" fontSize="30" fontWeight="800" fill={color}>7</text>
        </svg>
      );

    case 'math-num-unit-grid':
      return (
        <svg viewBox="0 0 170 170" className="w-full h-full overflow-visible">
          <rect x="15" y="15" width="140" height="140" fill={secondaryColor} stroke={color} strokeWidth="2.5" />
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <g key={i}>
              <line x1={15 + i * 20} y1="15" x2={15 + i * 20} y2="155" stroke={color} strokeWidth="1" opacity="0.5" />
              <line x1="15" y1={15 + i * 20} x2="155" y2={15 + i * 20} stroke={color} strokeWidth="1" opacity="0.5" />
            </g>
          ))}
        </svg>
      );

    case 'math-num-symbols':
      return (
        <svg viewBox="0 0 180 120" className="w-full h-full overflow-visible">
          {['=', '≠', '<', '>', '≤', '≥'].map((sym, i) => {
            const x = 22 + (i % 3) * 54;
            const y = 16 + Math.floor(i / 3) * 48;
            return (
              <g key={sym}>
                <rect x={x} y={y} width="42" height="38" rx="8" fill={secondaryColor} stroke={color} strokeWidth="2" />
                <text x={x + 21} y={y + 27} textAnchor="middle" fontSize="22" fontWeight="800" fill={color}>
                  {sym}
                </text>
              </g>
            );
          })}
        </svg>
      );

    case 'math-num-units':
      return (
        <svg viewBox="0 0 190 120" className="w-full h-full overflow-visible">
          {[
            { u: 'cm', s: 'Uzunluk' },
            { u: 'm', s: 'Uzunluk' },
            { u: 'kg', s: 'Kütle' },
            { u: 'L', s: 'Hacim' },
          ].map((item, i) => {
            const x = 14 + (i % 2) * 84;
            const y = 14 + Math.floor(i / 2) * 48;
            return (
              <g key={item.u}>
                <rect x={x} y={y} width="76" height="40" rx="8" fill={secondaryColor} stroke={color} strokeWidth="2" />
                <text x={x + 38} y={y + 22} textAnchor="middle" fontSize="16" fontWeight="800" fill={color}>{item.u}</text>
                <text x={x + 38} y={y + 34} textAnchor="middle" fontSize="8.5" fontWeight="600" fill={color} opacity="0.75">{item.s}</text>
              </g>
            );
          })}
        </svg>
      );

    case 'math-anim-abacus': {
      const off = cv.beadOffset ?? 0;
      return (
        <svg viewBox="0 0 190 150" className="w-full h-full overflow-visible">
          <rect x="16" y="16" width="158" height="118" rx="10" fill="none" stroke={color} strokeWidth="7" />
          {[42, 75, 108].map((y, row) => (
            <g key={row}>
              <line x1="20" y1={y} x2="170" y2={y} stroke="#64748b" strokeWidth="3" />
              {[0, 1, 2, 3].map((b) => {
                const bx = 36 + b * 17 + (b >= 2 ? off : 0);
                return <circle key={b} cx={bx} cy={y} r="7.5" fill={row % 2 === 0 ? secondaryColor : '#3b82f6'} stroke="#1e293b" strokeWidth="1.2" />;
              })}
            </g>
          ))}
        </svg>
      );
    }

    case 'math-anim-bead-string': {
      const off = cv.beadOffset ?? 0;
      return (
        <svg viewBox="0 0 220 80" className="w-full h-full overflow-visible">
          <line x1="12" y1="40" x2="208" y2="40" stroke="#475569" strokeWidth="3" />
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
            const x = 26 + i * 18 + (i >= 5 ? off : 0);
            return <circle key={i} cx={x} cy="40" r="8" fill={i < 5 ? color : secondaryColor} stroke="#1e293b" strokeWidth="1.4" />;
          })}
        </svg>
      );
    }

    case 'math-anim-domino': {
      const t = cv.dominoT ?? 0;
      const maxA = cv.dominoMaxAngle ?? 68;
      return (
        <svg viewBox="0 0 200 130" className="w-full h-full overflow-visible">
          <line x1="12" y1="114" x2="188" y2="114" stroke="#94a3b8" strokeWidth="3" />
          {[0, 1, 2, 3].map((i) => {
            const localT = Math.max(0, Math.min(1, t * 1.8 - i * 0.25));
            const rot = localT * maxA;
            const x = 34 + i * 38;
            return (
              <g key={i} transform={`rotate(${rot} ${x} 114)`}>
                <rect x={x - 10} y="44" width="20" height="70" rx="4" fill={color} stroke={secondaryColor} strokeWidth="2" />
                <line x1={x - 8} y1="79" x2={x + 8} y2="79" stroke={secondaryColor} strokeWidth="1.5" />
                <circle cx={x} cy="60" r="3" fill={secondaryColor} />
                <circle cx={x - 4} cy="96" r="2.5" fill={secondaryColor} />
                <circle cx={x + 4} cy="96" r="2.5" fill={secondaryColor} />
              </g>
            );
          })}
        </svg>
      );
    }

    case 'math-anim-marbles': {
      const sh = cv.marbleShift ?? 0;
      return (
        <svg viewBox="0 0 190 110" className="w-full h-full overflow-visible">
          <line x1="12" y1="84" x2="178" y2="84" stroke="#cbd5e1" strokeWidth="3" />
          <circle cx={42 + sh} cy="68" r="15" fill={color} />
          <circle cx={37 + sh} cy="63" r="4" fill="#ffffff" opacity="0.6" />
          <circle cx={148 - sh} cy="68" r="15" fill={secondaryColor} />
          <circle cx={143 - sh} cy="63" r="4" fill="#ffffff" opacity="0.6" />
        </svg>
      );
    }

    case 'math-anim-coins': {
      const jump = cv.coinJump ?? 0;
      const spin = cv.coinSpin ?? 0;
      return (
        <svg viewBox="0 0 160 130" className="w-full h-full overflow-visible">
          {[0, 1, 2].map((i) => {
            const x = 42 + i * 38;
            const y = 92 - jump * (i === 1 ? 1.15 : 0.8);
            return (
              <g key={i} transform={`translate(${x}, ${y}) rotate(${spin})`}>
                <circle cx="0" cy="0" r="17" fill={secondaryColor} stroke={color} strokeWidth="3" />
                <text x="0" y="5" textAnchor="middle" fontSize="13" fontWeight="800" fill={color}>₺</text>
              </g>
            );
          })}
        </svg>
      );
    }

    case 'math-anim-counting-rods': {
      const al = cv.rodAlign ?? 0;
      const heights = [40, 75, 55, 95, 65];
      const sorted = [40, 55, 65, 75, 95];
      return (
        <svg viewBox="0 0 190 140" className="w-full h-full overflow-visible">
          {heights.map((h, i) => {
            const curH = h + (sorted[i] - h) * al;
            return (
              <rect
                key={i}
                x={26 + i * 30}
                y={120 - curH}
                width="18"
                height={curH}
                rx="4"
                fill={i % 2 === 0 ? color : secondaryColor}
              />
            );
          })}
        </svg>
      );
    }

    case 'math-anim-unit-cubes': {
      const gap = cv.cubeGap ?? 0;
      return (
        <svg viewBox="0 0 180 140" className="w-full h-full overflow-visible">
          {[
            { dx: -gap, dy: -gap * 0.4 },
            { dx: gap, dy: -gap * 0.4 },
            { dx: -gap, dy: gap * 0.4 },
            { dx: gap, dy: gap * 0.4 },
          ].map((off, i) => (
            <g key={i} transform={`translate(${72 + (i % 2) * 24 + off.dx}, ${52 + Math.floor(i / 2) * 24 + off.dy})`}>
              <rect x="0" y="0" width="22" height="22" rx="3" fill={secondaryColor} stroke={color} strokeWidth="2.5" />
            </g>
          ))}
        </svg>
      );
    }

    case 'math-anim-weights': {
      const sh = cv.weightShift ?? 0;
      return (
        <svg viewBox="0 0 180 120" className="w-full h-full overflow-visible">
          <line x1="16" y1="102" x2="164" y2="102" stroke="#94a3b8" strokeWidth="3" />
          <g transform={`translate(${44 + sh}, 0)`}>
            <path d="M 0,48 L 36,48 L 42,98 L -6,98 Z" fill={color} />
            <circle cx="18" cy="40" r="8" fill="none" stroke={color} strokeWidth="3.5" />
            <text x="18" y="80" textAnchor="middle" fontSize="13" fontWeight="800" fill="#fff">2kg</text>
          </g>
          <g transform={`translate(${108 - sh}, 0)`}>
            <path d="M 0,60 L 28,60 L 32,98 L -4,98 Z" fill={secondaryColor} stroke={color} strokeWidth="2.5" />
            <text x="14" y="85" textAnchor="middle" fontSize="11" fontWeight="800" fill={color}>1kg</text>
          </g>
        </svg>
      );
    }

    // =========================================================================
    // B. CEBİR VE DENKLEM NESNELERİ
    // =========================================================================
    case 'math-alg-tiles':
      return (
        <svg viewBox="0 0 190 140" className="w-full h-full overflow-visible">
          <rect x="14" y="18" width="76" height="76" rx="6" fill={color} />
          <text x="52" y="64" textAnchor="middle" fontSize="22" fontWeight="800" fill="#fff">x²</text>
          <rect x="102" y="18" width="28" height="76" rx="5" fill={secondaryColor} />
          <text x="116" y="62" textAnchor="middle" fontSize="18" fontWeight="800" fill="#fff">x</text>
          <rect x="142" y="66" width="28" height="28" rx="5" fill="#f59e0b" />
          <text x="156" y="86" textAnchor="middle" fontSize="16" fontWeight="800" fill="#fff">1</text>
        </svg>
      );

    case 'math-alg-variables':
      return (
        <svg viewBox="0 0 180 110" className="w-full h-full overflow-visible">
          {['x', 'y', 'z'].map((v, i) => (
            <g key={v} transform={`translate(${14 + i * 54}, 20)`}>
              <rect x="0" y="0" width="46" height="68" rx="10" fill={secondaryColor} stroke={color} strokeWidth="3" />
              <text x="23" y="45" textAnchor="middle" fontSize="30" fontStyle="italic" fontWeight="800" fill={color}>{v}</text>
            </g>
          ))}
        </svg>
      );

    case 'math-alg-equation-card':
      return (
        <svg viewBox="0 0 220 90" className="w-full h-full overflow-visible">
          <rect x="10" y="12" width="200" height="66" rx="12" fill={secondaryColor} stroke={color} strokeWidth="3" />
          <text x="110" y="54" textAnchor="middle" fontSize="26" fontWeight="800" fill={color}>
            2x + 3 = 11
          </text>
        </svg>
      );

    case 'math-alg-op-blocks':
      return (
        <svg viewBox="0 0 200 110" className="w-full h-full overflow-visible">
          <rect x="12" y="25" width="52" height="58" rx="8" fill={secondaryColor} stroke={color} strokeWidth="2.5" />
          <text x="38" y="62" textAnchor="middle" fontSize="22" fontWeight="800" fill={color}>3a</text>
          <circle cx="84" cy="54" r="14" fill={color} />
          <text x="84" y="61" textAnchor="middle" fontSize="20" fontWeight="800" fill="#fff">+</text>
          <rect x="104" y="25" width="52" height="58" rx="8" fill={secondaryColor} stroke={color} strokeWidth="2.5" />
          <text x="130" y="62" textAnchor="middle" fontSize="22" fontWeight="800" fill={color}>5b</text>
        </svg>
      );

    case 'math-anim-gears': {
      const ang = cv.gearAngle ?? 0;
      const teeth = [0, 45, 90, 135, 180, 225, 270, 315];
      return (
        <svg viewBox="0 0 180 130" className="w-full h-full overflow-visible">
          <g transform={`translate(62, 65) rotate(${ang})`}>
            {teeth.map((a) => (
              <rect key={a} x="-6" y="-40" width="12" height="12" rx="2" fill={color} transform={`rotate(${a})`} />
            ))}
            <circle cx="0" cy="0" r="30" fill={secondaryColor} stroke={color} strokeWidth="5" />
            <circle cx="0" cy="0" r="9" fill={color} />
          </g>
          <g transform={`translate(126, 65) rotate(${-ang * 1.3 + 22})`}>
            {teeth.map((a) => (
              <rect key={a} x="-5" y="-31" width="10" height="10" rx="2" fill={color} transform={`rotate(${a})`} />
            ))}
            <circle cx="0" cy="0" r="22" fill={secondaryColor} stroke={color} strokeWidth="4.5" />
            <circle cx="0" cy="0" r="7" fill={color} />
          </g>
        </svg>
      );
    }

    case 'math-anim-piston': {
      const px = cv.pistonX ?? 0;
      return (
        <svg viewBox="0 0 200 120" className="w-full h-full overflow-visible">
          <rect x="20" y="30" width="110" height="60" rx="6" fill="none" stroke={color} strokeWidth="4" />
          <g transform={`translate(${px}, 0)`}>
            <rect x="64" y="34" width="24" height="52" rx="3" fill={secondaryColor} stroke={color} strokeWidth="2.5" />
            <rect x="88" y="54" width="76" height="12" rx="4" fill={color} />
            <circle cx="164" cy="60" r="9" fill={secondaryColor} stroke={color} strokeWidth="2.5" />
          </g>
        </svg>
      );
    }

    case 'math-anim-alg-blocks': {
      const t = cv.swapT ?? 0;
      const xShift = t * 92;
      const yArc = -Math.sin(t * Math.PI) * 28;
      return (
        <svg viewBox="0 0 220 110" className="w-full h-full overflow-visible">
          <rect x="16" y="42" width="44" height="44" rx="8" fill={color} />
          <text x="38" y="71" textAnchor="middle" fontSize="20" fontWeight="800" fill="#fff">x</text>
          <g transform={`translate(${xShift}, ${yArc})`}>
            <rect x="66" y="42" width="48" height="44" rx="8" fill={secondaryColor} />
            <text x="90" y="71" textAnchor="middle" fontSize="18" fontWeight="800" fill="#fff">
              {t > 0.5 ? '- 3' : '+ 3'}
            </text>
          </g>
          <text x="128" y="72" textAnchor="middle" fontSize="24" fontWeight="800" fill={color}>=</text>
          <rect x="144" y="42" width="38" height="44" rx="8" fill="#0f172a" />
          <text x="163" y="71" textAnchor="middle" fontSize="18" fontWeight="800" fill="#fff">9</text>
        </svg>
      );
    }

    case 'math-comp-balance-rig':
      return (
        <svg viewBox="0 0 210 160" className="w-full h-full overflow-visible">
          <g transform={pTransform(parts['body'], 105, 130)} {...partInteractionProps('body')}>
            <polygon points="105,56 84,142 126,142" fill={color} />
            <rect x="60" y="140" width="90" height="10" rx="4" fill={color} />
          </g>
          <g transform={pTransform(parts['beam'], 105, 56)} {...partInteractionProps('beam')}>
            <rect x="30" y="51" width="150" height="10" rx="5" fill={secondaryColor} stroke={color} strokeWidth="2" />
            <circle cx="105" cy="56" r="7" fill={color} />
          </g>
          <g transform={pTransform(parts['left-weight'], 46, 88)} {...partInteractionProps('left-weight')}>
            <line x1="46" y1="60" x2="46" y2="86" stroke={color} strokeWidth="2.5" />
            <rect x="30" y="86" width="32" height="26" rx="5" fill={color} />
            <text x="46" y="104" textAnchor="middle" fontSize="12" fontWeight="800" fill="#fff">2x</text>
          </g>
          <g transform={pTransform(parts['right-weight'], 164, 88)} {...partInteractionProps('right-weight')}>
            <line x1="164" y1="60" x2="164" y2="86" stroke={color} strokeWidth="2.5" />
            <rect x="148" y="86" width="32" height="26" rx="5" fill={secondaryColor} stroke={color} strokeWidth="2" />
            <text x="164" y="104" textAnchor="middle" fontSize="12" fontWeight="800" fill={color}>10</text>
          </g>
        </svg>
      );

    case 'math-comp-op-rig':
      return (
        <svg viewBox="0 0 210 110" className="w-full h-full overflow-visible">
          <g transform={pTransform(parts['left-term'], 45, 55)} {...partInteractionProps('left-term')}>
            <rect x="18" y="28" width="54" height="54" rx="10" fill={color} />
            <text x="45" y="63" textAnchor="middle" fontSize="22" fontWeight="800" fill="#fff">3x</text>
          </g>
          <g transform={pTransform(parts['operator'], 105, 55)} {...partInteractionProps('operator')}>
            <circle cx="105" cy="55" r="15" fill={secondaryColor} />
            <text x="105" y="62" textAnchor="middle" fontSize="22" fontWeight="800" fill="#fff">+</text>
          </g>
          <g transform={pTransform(parts['right-term'], 165, 55)} {...partInteractionProps('right-term')}>
            <rect x="138" y="28" width="54" height="54" rx="10" fill={color} />
            <text x="165" y="63" textAnchor="middle" fontSize="22" fontWeight="800" fill="#fff">2x</text>
          </g>
        </svg>
      );

    // =========================================================================
    // C & D. GEOMETRİ & ÇİZİM EKSİKLERİ
    // =========================================================================
    case 'math-geo-regular-octagon':
      return (
        <svg viewBox="0 0 140 140" className="w-full h-full overflow-visible">
          <polygon
            points="50,16 90,16 124,50 124,90 90,124 50,124 16,90 16,50"
            fill={secondaryColor}
            stroke={color}
            strokeWidth="4"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'math-geo-triangular-prism':
      return (
        <svg viewBox="0 0 160 140" className="w-full h-full overflow-visible">
          <polygon points="24,110 64,34 104,110" fill={secondaryColor} stroke={color} strokeWidth="3.5" strokeLinejoin="round" />
          <polygon points="64,34 126,24 144,98 104,110" fill={color} opacity="0.25" stroke={color} strokeWidth="3.5" strokeLinejoin="round" />
          <line x1="24" y1="110" x2="104" y2="110" stroke={color} strokeWidth="3.5" />
          <line x1="104" y1="110" x2="144" y2="98" stroke={color} strokeWidth="3.5" />
        </svg>
      );

    case 'math-geo-triangular-pyramid':
      return (
        <svg viewBox="0 0 150 150" className="w-full h-full overflow-visible">
          <polygon points="75,18 22,118 92,130" fill={secondaryColor} stroke={color} strokeWidth="3.5" strokeLinejoin="round" />
          <polygon points="75,18 92,130 132,102" fill={color} opacity="0.3" stroke={color} strokeWidth="3.5" strokeLinejoin="round" />
          <line x1="22" y1="118" x2="132" y2="102" stroke={color} strokeWidth="2" strokeDasharray="5 4" />
        </svg>
      );

    case 'math-geo-torus':
      return (
        <svg viewBox="0 0 160 120" className="w-full h-full overflow-visible">
          <ellipse cx="80" cy="60" rx="64" ry="38" fill={secondaryColor} stroke={color} strokeWidth="4" />
          <ellipse cx="80" cy="60" rx="24" ry="13" fill="#ffffff" stroke={color} strokeWidth="3.5" />
          <path d="M 46,48 Q 80,32 114,48" fill="none" stroke="#ffffff" strokeWidth="2.5" opacity="0.7" />
        </svg>
      );

    case 'math-geo-symmetry-axes':
      return (
        <svg viewBox="0 0 150 150" className="w-full h-full overflow-visible">
          <rect x="30" y="30" width="90" height="90" rx="6" fill="none" stroke={color} strokeWidth="3.5" />
          <line x1="75" y1="14" x2="75" y2="136" stroke={secondaryColor} strokeWidth="2.2" strokeDasharray="6 4" />
          <line x1="14" y1="75" x2="136" y2="75" stroke={secondaryColor} strokeWidth="2.2" strokeDasharray="6 4" />
          <line x1="18" y1="18" x2="132" y2="132" stroke={secondaryColor} strokeWidth="1.8" strokeDasharray="5 4" opacity="0.7" />
          <line x1="132" y1="18" x2="18" y2="132" stroke={secondaryColor} strokeWidth="1.8" strokeDasharray="5 4" opacity="0.7" />
        </svg>
      );

    case 'math-tool-geoboard':
      return (
        <svg viewBox="0 0 160 160" className="w-full h-full overflow-visible">
          <rect x="14" y="14" width="132" height="132" rx="12" fill={secondaryColor} stroke={color} strokeWidth="3.5" />
          <polygon points="38,122 80,38 122,122" fill="rgba(217,119,6,0.22)" stroke={color} strokeWidth="3" strokeLinejoin="round" />
          {[0, 1, 2, 3, 4].map((r) =>
            [0, 1, 2, 3, 4].map((c) => (
              <circle key={`${r}-${c}`} cx={38 + c * 21} cy={38 + r * 21} r="3" fill="#475569" />
            ))
          )}
        </svg>
      );

    case 'math-anim-moving-point': {
      const t = cv.pathT ?? 0.35;
      const x = 22 + t * 146;
      const y = 55 - Math.sin(t * Math.PI * 2) * 32;
      return (
        <svg viewBox="0 0 190 110" className="w-full h-full overflow-visible">
          <path d="M 22,55 C 58,10 95,10 95,55 C 95,100 132,100 168,55" fill="none" stroke={secondaryColor} strokeWidth="3" strokeDasharray="6 4" />
          <circle cx={x} cy={y} r="8" fill={color} stroke="#ffffff" strokeWidth="2.5" />
        </svg>
      );
    }

    case 'math-anim-transform-geo': {
      const tx = cv.transX ?? 0;
      const rot = cv.transRot ?? 0;
      return (
        <svg viewBox="0 0 200 130" className="w-full h-full overflow-visible">
          <polygon points="34,90 54,38 74,90" fill="none" stroke={color} strokeWidth="2" strokeDasharray="4 4" opacity="0.5" />
          <g transform={`translate(${tx}, 0) rotate(${rot} 54 70)`}>
            <polygon points="34,90 54,38 74,90" fill={secondaryColor} stroke={color} strokeWidth="3" strokeLinejoin="round" />
          </g>
        </svg>
      );
    }

    case 'math-comp-prism-net': {
      const f = cv.foldT ?? 0;
      return (
        <svg viewBox="0 0 190 150" className="w-full h-full overflow-visible">
          <g transform={pTransform(parts['center'], 95, 75)} {...partInteractionProps('center')}>
            <rect x="73" y="34" width="44" height="82" fill={secondaryColor} stroke={color} strokeWidth="2.5" />
          </g>
          <g transform={`translate(${f * 18}, 0) ${pTransform(parts['left-wing'], 73, 75)}`} {...partInteractionProps('left-wing')}>
            <rect x="29" y="34" width="44" height="82" fill={secondaryColor} stroke={color} strokeWidth="2.5" />
          </g>
          <g transform={`translate(${-f * 18}, 0) ${pTransform(parts['right-wing'], 117, 75)}`} {...partInteractionProps('right-wing')}>
            <rect x="117" y="34" width="44" height="82" fill={secondaryColor} stroke={color} strokeWidth="2.5" />
          </g>
        </svg>
      );
    }

    case 'math-comp-cone-net': {
      const f = cv.foldT ?? 0;
      return (
        <svg viewBox="0 0 180 150" className="w-full h-full overflow-visible">
          <g transform={`translate(0, ${f * 16}) ${pTransform(parts['sector'], 90, 56)}`} {...partInteractionProps('sector')}>
            <path d="M 90,18 L 36,88 A 74,74 0 0,0 144,88 Z" fill={secondaryColor} stroke={color} strokeWidth="3" strokeLinejoin="round" />
          </g>
          <g transform={`translate(0, ${-f * 14}) ${pTransform(parts['base-circle'], 90, 120)}`} {...partInteractionProps('base-circle')}>
            <circle cx="90" cy="120" r="22" fill={color} opacity="0.85" stroke={color} strokeWidth="2.5" />
          </g>
        </svg>
      );
    }

    // =========================================================================
    // H. OLASILIK VE İSTATİSTİK
    // =========================================================================
    case 'math-prob-tree':
      return (
        <svg viewBox="0 0 200 140" className="w-full h-full overflow-visible">
          <line x1="28" y1="70" x2="96" y2="34" stroke={color} strokeWidth="2.5" />
          <line x1="28" y1="70" x2="96" y2="106" stroke={color} strokeWidth="2.5" />
          <line x1="96" y1="34" x2="168" y2="18" stroke={color} strokeWidth="2" />
          <line x1="96" y1="34" x2="168" y2="50" stroke={color} strokeWidth="2" />
          <line x1="96" y1="106" x2="168" y2="90" stroke={color} strokeWidth="2" />
          <line x1="96" y1="106" x2="168" y2="122" stroke={color} strokeWidth="2" />
          {[
            [28, 70],
            [96, 34],
            [96, 106],
            [168, 18],
            [168, 50],
            [168, 90],
            [168, 122],
          ].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r="7" fill={i === 0 ? color : secondaryColor} stroke={color} strokeWidth="2.5" />
          ))}
        </svg>
      );

    case 'math-prob-freq-table':
      return (
        <svg viewBox="0 0 190 140" className="w-full h-full overflow-visible">
          <rect x="14" y="14" width="162" height="112" rx="8" fill="#ffffff" stroke={color} strokeWidth="2.5" />
          <rect x="14" y="14" width="162" height="28" rx="8" fill={color} />
          <line x1="95" y1="14" x2="95" y2="126" stroke={color} strokeWidth="2" />
          <line x1="14" y1="70" x2="176" y2="70" stroke={color} strokeWidth="1.5" />
          <line x1="14" y1="98" x2="176" y2="98" stroke={color} strokeWidth="1.5" />
          <text x="54" y="32" textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">Değer</text>
          <text x="136" y="32" textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">Frekans</text>
          <text x="54" y="60" textAnchor="middle" fontSize="12" fontWeight="700" fill={color}>A</text>
          <text x="136" y="60" textAnchor="middle" fontSize="12" fontWeight="700" fill={color}>|||| 4</text>
          <text x="54" y="88" textAnchor="middle" fontSize="12" fontWeight="700" fill={color}>B</text>
          <text x="136" y="88" textAnchor="middle" fontSize="12" fontWeight="700" fill={color}>||| 3</text>
          <text x="54" y="116" textAnchor="middle" fontSize="12" fontWeight="700" fill={color}>C</text>
          <text x="136" y="116" textAnchor="middle" fontSize="12" fontWeight="700" fill={color}>||||| 5</text>
        </svg>
      );

    case 'math-prob-scatter':
      return (
        <svg viewBox="0 0 180 150" className="w-full h-full overflow-visible">
          <polyline points="24,18 24,126 162,126" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />
          {[
            [40, 110],
            [56, 94],
            [68, 102],
            [86, 76],
            [102, 68],
            [118, 54],
            [134, 42],
            [148, 34],
          ].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r="5" fill={secondaryColor} />
          ))}
        </svg>
      );

    case 'math-prob-histogram':
      return (
        <svg viewBox="0 0 190 140" className="w-full h-full overflow-visible">
          <polyline points="20,16 20,120 172,120" fill="none" stroke={color} strokeWidth="3" />
          {[32, 68, 92, 54, 28].map((h, i) => (
            <rect key={i} x={28 + i * 26} y={120 - h} width="26" height={h} fill={secondaryColor} stroke={color} strokeWidth="2" />
          ))}
        </svg>
      );

    case 'math-anim-coin-flip': {
      const dy = cv.coinFlipY ?? 0;
      const sy = cv.coinScaleY ?? 1;
      return (
        <svg viewBox="0 0 130 150" className="w-full h-full overflow-visible">
          <g transform={`translate(65, ${96 - dy}) scale(1, ${Math.max(0.18, Math.abs(sy))})`}>
            <circle cx="0" cy="0" r="32" fill={secondaryColor} stroke={color} strokeWidth="4.5" />
            <text x="0" y="7" textAnchor="middle" fontSize="18" fontWeight="800" fill={color}>
              {sy >= 0 ? 'YAZI' : 'TURA'}
            </text>
          </g>
        </svg>
      );
    }

    case 'math-anim-card-deck': {
      const sp = cv.cardSpread ?? 0.5;
      return (
        <svg viewBox="0 0 170 130" className="w-full h-full overflow-visible">
          {[-1, 0, 1].map((idx) => (
            <g key={idx} transform={`rotate(${idx * sp * 22} 85 110)`}>
              <rect x="61" y="20" width="48" height="74" rx="7" fill={secondaryColor} stroke={color} strokeWidth="2.8" />
              <text x="85" y="64" textAnchor="middle" fontSize="22" fontWeight="800" fill={color}>
                {idx === -1 ? '♠' : idx === 0 ? '♥' : '♦'}
              </text>
            </g>
          ))}
        </svg>
      );
    }

    case 'math-anim-rng': {
      const val = cv.rngValue ?? 7;
      return (
        <svg viewBox="0 0 160 110" className="w-full h-full overflow-visible">
          <rect x="18" y="18" width="124" height="74" rx="12" fill={color} stroke={secondaryColor} strokeWidth="3.5" />
          <text x="80" y="68" textAnchor="middle" fontSize="38" fontWeight="800" fill={secondaryColor}>
            {val}
          </text>
        </svg>
      );
    }

    case 'math-comp-spinner':
      return (
        <svg viewBox="0 0 160 170" className="w-full h-full overflow-visible">
          <g transform={pTransform(parts['wheel'], 80, 96)} {...partInteractionProps('wheel')}>
            <path d="M 80,96 L 80,32 A 64,64 0 0,1 144,96 Z" fill="#ef4444" />
            <path d="M 80,96 L 144,96 A 64,64 0 0,1 80,160 Z" fill="#3b82f6" />
            <path d="M 80,96 L 80,160 A 64,64 0 0,1 16,96 Z" fill="#22c55e" />
            <path d="M 80,96 L 16,96 A 64,64 0 0,1 80,32 Z" fill="#f59e0b" />
            <circle cx="80" cy="96" r="64" fill="none" stroke={color} strokeWidth="4" />
            <circle cx="80" cy="96" r="10" fill="#ffffff" stroke={color} strokeWidth="3" />
          </g>
          <g transform={pTransform(parts['pointer'], 80, 22)} {...partInteractionProps('pointer')}>
            <polygon points="80,38 69,14 91,14" fill={color} stroke="#ffffff" strokeWidth="2" />
          </g>
        </svg>
      );

    case 'math-comp-marble-bag':
      return (
        <svg viewBox="0 0 160 160" className="w-full h-full overflow-visible">
          <g transform={pTransform(parts['drawn-marble'], 80, 74)} {...partInteractionProps('drawn-marble')}>
            <circle cx="80" cy="74" r="14" fill={secondaryColor} stroke="#ffffff" strokeWidth="2" />
          </g>
          <g transform={pTransform(parts['bag'], 80, 114)} {...partInteractionProps('bag')}>
            <path d="M 54,66 L 106,66 L 122,132 C 122,144 38,144 38,132 Z" fill={color} />
            <path d="M 54,66 L 44,44 L 116,44 L 106,66 Z" fill={color} opacity="0.85" />
            <line x1="52" y1="66" x2="108" y2="66" stroke="#fde68a" strokeWidth="3.5" strokeLinecap="round" />
          </g>
        </svg>
      );

    case 'math-comp-boxplot': {
      const bt = cv.boxT ?? 1;
      return (
        <svg viewBox="0 0 220 110" className="w-full h-full overflow-visible">
          <g transform={pTransform(parts['whiskers'], 110, 55)} {...partInteractionProps('whiskers')} opacity={0.3 + 0.7 * bt}>
            <line x1="26" y1="55" x2="194" y2="55" stroke={color} strokeWidth="3" />
            <line x1="26" y1="36" x2="26" y2="74" stroke={color} strokeWidth="3" />
            <line x1="194" y1="36" x2="194" y2="74" stroke={color} strokeWidth="3" />
          </g>
          <g transform={pTransform(parts['box'], 110, 55)} {...partInteractionProps('box')}>
            <rect x="66" y="30" width={92 * Math.max(0.25, bt)} height="50" rx="5" fill={secondaryColor} stroke={color} strokeWidth="3" />
          </g>
          <g transform={pTransform(parts['median'], 115, 55)} {...partInteractionProps('median')}>
            <line x1="115" y1="30" x2="115" y2="80" stroke={color} strokeWidth="4" />
          </g>
        </svg>
      );
    }

    // =========================================================================
    // I. ÜSTEL FONKSİYONLAR, LOGARİTMA VE DİZİLER
    // =========================================================================
    case 'math-seq-fibonacci-tpl':
      return (
        <svg viewBox="0 0 190 130" className="w-full h-full overflow-visible">
          <rect x="18" y="16" width="96" height="96" fill="none" stroke={color} strokeWidth="2.5" />
          <rect x="114" y="16" width="58" height="58" fill="none" stroke={color} strokeWidth="2.5" />
          <rect x="134" y="74" width="38" height="38" fill="none" stroke={color} strokeWidth="2.5" />
          <rect x="114" y="92" width="20" height="20" fill="none" stroke={color} strokeWidth="2" />
          <path d="M 114,112 A 96,96 0 0,1 18,16 M 114,16 A 58,58 0 0,1 172,74 M 172,74 A 38,38 0 0,1 134,112" fill="none" stroke="#dc2626" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );

    case 'math-seq-geo-blocks':
      return (
        <svg viewBox="0 0 200 140" className="w-full h-full overflow-visible">
          {[14, 28, 56, 112].map((h, i) => (
            <g key={i}>
              <rect x={22 + i * 42} y={124 - h} width="30" height={h} rx="5" fill={i % 2 === 0 ? color : secondaryColor} stroke={color} strokeWidth="2" />
              <text x={37 + i * 42} y={118 - h} textAnchor="middle" fontSize="11" fontWeight="800" fill={color}>
                {Math.pow(2, i)}
              </text>
            </g>
          ))}
        </svg>
      );

    case 'math-seq-cards':
      return (
        <svg viewBox="0 0 210 90" className="w-full h-full overflow-visible">
          {[2, 4, 8, 16].map((n, i) => (
            <g key={n} transform={`translate(${12 + i * 48}, 18)`}>
              <rect x="0" y="0" width="42" height="54" rx="8" fill={secondaryColor} stroke={color} strokeWidth="2.5" />
              <text x="21" y="34" textAnchor="middle" fontSize="18" fontWeight="800" fill={color}>{n}</text>
            </g>
          ))}
        </svg>
      );

    case 'math-seq-crystal':
      return (
        <svg viewBox="0 0 140 150" className="w-full h-full overflow-visible">
          <polygon points="70,12 114,48 96,134 44,134 26,48" fill={secondaryColor} stroke={color} strokeWidth="3.5" strokeLinejoin="round" />
          <polyline points="26,48 70,66 114,48" fill="none" stroke={color} strokeWidth="2.5" />
          <line x1="70" y1="12" x2="70" y2="134" stroke={color} strokeWidth="2" />
        </svg>
      );

    case 'math-anim-bacteria': {
      const t = cv.seqT ?? 0.5;
      const count = t < 0.25 ? 1 : t < 0.5 ? 2 : t < 0.75 ? 4 : 8;
      const pos = [
        [85, 75], [60, 75], [110, 75], [52, 50], [118, 50], [52, 102], [118, 102], [85, 42],
      ];
      return (
        <svg viewBox="0 0 170 150" className="w-full h-full overflow-visible">
          <circle cx="85" cy="75" r="64" fill={secondaryColor} opacity="0.35" stroke={color} strokeWidth="3" />
          {pos.slice(0, count).map(([cx, cy], i) => (
            <ellipse key={i} cx={cx} cy={cy} rx="12" ry="8" fill={color} />
          ))}
        </svg>
      );
    }

    case 'math-anim-cell-split': {
      const t = cv.seqT ?? 0.5;
      const sep = t * 38;
      return (
        <svg viewBox="0 0 190 120" className="w-full h-full overflow-visible">
          <g transform={`translate(${-sep}, 0)`}>
            <circle cx="95" cy="60" r="32" fill={secondaryColor} stroke={color} strokeWidth="3" />
            <circle cx="95" cy="60" r="10" fill={color} />
          </g>
          <g transform={`translate(${sep}, 0)`}>
            <circle cx="95" cy="60" r="32" fill={secondaryColor} stroke={color} strokeWidth="3" opacity={t > 0.08 ? 1 : 0} />
            <circle cx="95" cy="60" r="10" fill={color} opacity={t > 0.08 ? 1 : 0} />
          </g>
        </svg>
      );
    }

    case 'math-anim-paper-fold': {
      const t = cv.seqT ?? 0.3;
      const w = 130 * (1 - 0.5 * t);
      return (
        <svg viewBox="0 0 170 130" className="w-full h-full overflow-visible">
          <rect x="20" y="24" width={w} height="82" rx="4" fill={secondaryColor} stroke={color} strokeWidth="3" />
          <line x1={20 + w * 0.5} y1="24" x2={20 + w * 0.5} y2="106" stroke={color} strokeWidth="1.5" strokeDasharray="4 4" />
        </svg>
      );
    }

    case 'math-anim-coin-stack': {
      const t = cv.seqT ?? 0.7;
      const layers = Math.max(1, Math.round(1 + t * 6));
      return (
        <svg viewBox="0 0 160 150" className="w-full h-full overflow-visible">
          {Array.from({ length: layers }).map((_, i) => (
            <ellipse key={i} cx="80" cy={126 - i * 14} rx="38" ry="10" fill={secondaryColor} stroke={color} strokeWidth="2.5" />
          ))}
        </svg>
      );
    }

    case 'math-anim-sound-wave': {
      const phase = cv.wavePhase ?? 0;
      const amp = cv.waveAmp ?? 24;
      const freq = cv.waveFreq ?? 3;
      const pts = Array.from({ length: 40 }).map((_, i) => {
        const x = 14 + i * 4.7;
        const y = 55 + Math.sin((i / 39) * Math.PI * 2 * freq + phase) * amp;
        return `${x},${y.toFixed(1)}`;
      }).join(' ');
      return (
        <svg viewBox="0 0 210 110" className="w-full h-full overflow-visible">
          <line x1="12" y1="55" x2="198" y2="55" stroke="#cbd5e1" strokeWidth="1.5" />
          <polyline points={pts} fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }

    case 'math-anim-quake-wave': {
      const t = cv.seqT ?? 0.4;
      return (
        <svg viewBox="0 0 160 160" className="w-full h-full overflow-visible">
          <circle cx="80" cy="80" r="8" fill={color} />
          {[0, 1, 2].map((i) => {
            const r = ((t + i * 0.33) % 1) * 62 + 12;
            const op = Math.max(0.1, 1 - r / 74);
            return <circle key={i} cx="80" cy="80" r={r} fill="none" stroke={color} strokeWidth="3" opacity={op} />;
          })}
        </svg>
      );
    }

    case 'math-anim-fibonacci-draw': {
      const t = cv.seqT ?? 0.7;
      return (
        <svg viewBox="0 0 190 130" className="w-full h-full overflow-visible">
          <rect x="18" y="16" width="154" height="96" fill="none" stroke={secondaryColor} strokeWidth="2" />
          <path
            d="M 114,112 A 96,96 0 0,1 18,16 A 58,58 0 0,1 172,74 A 38,38 0 0,1 134,112"
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray="100"
            strokeDashoffset={100 * (1 - t)}
          />
        </svg>
      );
    }

    case 'math-comp-tree-grow': {
      const t = cv.seqT ?? 1;
      return (
        <svg viewBox="0 0 170 170" className="w-full h-full overflow-visible">
          <g transform={pTransform(parts['trunk'], 85, 155)} {...partInteractionProps('trunk')}>
            <rect x="77" y="95" width="16" height="60" rx="4" fill={color} />
          </g>
          <g transform={pTransform(parts['branches'], 85, 95)} {...partInteractionProps('branches')} opacity={Math.min(1, t * 1.5)}>
            <line x1="85" y1="100" x2="54" y2="66" stroke={color} strokeWidth="7" strokeLinecap="round" />
            <line x1="85" y1="100" x2="116" y2="66" stroke={color} strokeWidth="7" strokeLinecap="round" />
          </g>
          <g transform={pTransform(parts['canopy'], 85, 60)} {...partInteractionProps('canopy')} opacity={Math.min(1, t * 1.2)}>
            <circle cx="85" cy="50" r="28" fill={secondaryColor} />
            <circle cx="54" cy="64" r="22" fill={secondaryColor} />
            <circle cx="116" cy="64" r="22" fill={secondaryColor} />
          </g>
        </svg>
      );
    }

    default:
      return null;
  }
}

