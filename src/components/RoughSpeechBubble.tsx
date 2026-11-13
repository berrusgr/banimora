import React, { useEffect, useRef } from 'react';
import rough from 'roughjs';

export type RoughBubbleVariant =
  | 'speech'
  | 'speech-oval'
  | 'speech-side'
  | 'speech-cloud'
  | 'thought'
  | 'thought-double'
  | 'burst'
  | 'zigzag'
  | 'note'
  | 'note-fold'
  | 'board-chalk'
  | 'board-wavy';

interface RoughSpeechBubbleProps {
  variant: RoughBubbleVariant;
  text?: string;
  color: string;
  secondaryColor?: string;
  strokeWidth?: number;
  fontSize?: number;
  fontFamily?: string;
  textRevealRatio?: number;
  seed?: number;
}

const DEFAULT_TEXT: Record<RoughBubbleVariant, string> = {
  speech: 'Merhaba! Bugün birlikte keşfedelim.',
  'speech-oval': 'Harika bir fikir! Hemen deneyelim.',
  'speech-side': 'Buraya dikkatlice bakalım!',
  'speech-cloud': 'Yumuşacık bir anlatımla başlayalım.',
  thought: 'Acaba bunun arkasındaki sebep ne olabilir?',
  'thought-double': 'Bunu farklı bir açıdan düşünsek?',
  burst: 'SÜPER!\nÖnemli Nokta!',
  zigzag: 'DİKKAT!\nBu kuralı unutma!',
  note: 'Önemli Not:\nAdımları sırayla takip et!',
  'note-fold': 'Hatırlatma:\nFormülü kontrol et.',
  'board-chalk': 'GÜNÜN KONUSU:\nTemel Kavramlar',
  'board-wavy': 'BÖLÜM ÖZETİ\nAna Başlık',
};

const DEFAULT_FILL: Record<RoughBubbleVariant, string> = {
  speech: '#ffffff',
  'speech-oval': '#ffffff',
  'speech-side': '#ffffff',
  'speech-cloud': '#f0f9ff',
  thought: '#f8fafc',
  'thought-double': '#ffffff',
  burst: '#fef08a',
  zigzag: '#fee2e2',
  note: '#fef9c3',
  'note-fold': '#e0f2fe',
  'board-chalk': '#14532d',
  'board-wavy': '#ffffff',
};

function buildStarburstPath(
  cx: number,
  cy: number,
  rxOuter: number,
  ryOuter: number,
  rxInner: number,
  ryInner: number,
  points: number
): string {
  const coords: string[] = [];
  const total = points * 2;
  for (let i = 0; i < total; i++) {
    const angle = (Math.PI * 2 * i) / total - Math.PI / 2;
    const isOuter = i % 2 === 0;
    const rx = isOuter ? rxOuter : rxInner;
    const ry = isOuter ? ryOuter : ryInner;
    const x = (cx + Math.cos(angle) * rx).toFixed(1);
    const y = (cy + Math.sin(angle) * ry).toFixed(1);
    coords.push(`${i === 0 ? 'M' : 'L'} ${x},${y}`);
  }
  return `${coords.join(' ')} Z`;
}

function buildZigzagBoxPath(
  x: number,
  y: number,
  w: number,
  h: number,
  amp = 7,
  stepsX = 11,
  stepsY = 5
): string {
  const pts: string[] = [];
  const dx = w / stepsX;
  const dy = h / stepsY;

  // Top edge (left -> right)
  pts.push(`M ${x},${y}`);
  for (let i = 0; i < stepsX; i++) {
    const midX = x + (i + 0.5) * dx;
    const endX = x + (i + 1) * dx;
    pts.push(`L ${midX.toFixed(1)},${(y - amp).toFixed(1)}`);
    pts.push(`L ${endX.toFixed(1)},${y.toFixed(1)}`);
  }
  // Right edge (top -> bottom)
  for (let i = 0; i < stepsY; i++) {
    const midY = y + (i + 0.5) * dy;
    const endY = y + (i + 1) * dy;
    pts.push(`L ${(x + w + amp).toFixed(1)},${midY.toFixed(1)}`);
    pts.push(`L ${(x + w).toFixed(1)},${endY.toFixed(1)}`);
  }
  // Bottom edge (right -> left)
  for (let i = stepsX - 1; i >= 0; i--) {
    const midX = x + (i + 0.5) * dx;
    const endX = x + i * dx;
    pts.push(`L ${midX.toFixed(1)},${(y + h + amp).toFixed(1)}`);
    pts.push(`L ${endX.toFixed(1)},${(y + h).toFixed(1)}`);
  }
  // Left edge (bottom -> top)
  for (let i = stepsY - 1; i >= 0; i--) {
    const midY = y + (i + 0.5) * dy;
    const endY = y + i * dy;
    pts.push(`L ${(x - amp).toFixed(1)},${midY.toFixed(1)}`);
    pts.push(`L ${x.toFixed(1)},${endY.toFixed(1)}`);
  }
  return `${pts.join(' ')} Z`;
}

export const RoughSpeechBubble: React.FC<RoughSpeechBubbleProps> = ({
  variant,
  text,
  color,
  secondaryColor,
  strokeWidth = 2.3,
  fontSize,
  fontFamily,
  textRevealRatio,
  seed = 42,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const strokeColor = color || '#1e293b';
  const fillColor = secondaryColor || DEFAULT_FILL[variant];
  const baseStroke = Math.max(1, strokeWidth);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    svg.innerHTML = '';
    const rc = rough.svg(svg);

    switch (variant) {
      case 'speech': {
        const path =
          'M 28,10 L 232,10 Q 250,10 250,28 L 250,82 Q 250,100 232,100 L 106,100 L 72,126 L 80,100 L 28,100 Q 10,100 10,82 L 10,28 Q 10,10 28,10 Z';
        svg.appendChild(
          rc.path(path, {
            roughness: 1.5,
            bowing: 1.4,
            stroke: strokeColor,
            strokeWidth: baseStroke,
            fill: fillColor,
            fillStyle: 'solid',
            seed,
          })
        );
        break;
      }

      case 'speech-oval': {
        const ovalTailPath =
          'M 130,8 C 202,8 250,28 250,55 C 250,82 202,102 130,102 C 118,102 108,101 98,100 L 70,126 L 78,97 C 36,90 10,74 10,55 C 10,28 58,8 130,8 Z';
        svg.appendChild(
          rc.path(ovalTailPath, {
            roughness: 1.45,
            bowing: 1.3,
            stroke: strokeColor,
            strokeWidth: baseStroke,
            fill: fillColor,
            fillStyle: 'solid',
            seed,
          })
        );
        break;
      }

      case 'speech-side': {
        const sidePath =
          'M 42,10 L 234,10 Q 250,10 250,26 L 250,106 Q 250,122 234,122 L 42,122 Q 26,122 26,106 L 26,76 L 6,64 L 26,52 L 26,26 Q 26,10 42,10 Z';
        svg.appendChild(
          rc.path(sidePath, {
            roughness: 1.5,
            bowing: 1.35,
            stroke: strokeColor,
            strokeWidth: baseStroke,
            fill: fillColor,
            fillStyle: 'solid',
            seed,
          })
        );
        break;
      }

      case 'speech-cloud': {
        const cloudSpeechPath =
          'M 54,94 C 24,94 12,76 18,56 C 10,36 28,16 54,20 C 68,6 102,4 124,16 C 148,4 186,8 198,24 C 228,20 248,40 240,62 C 248,84 226,98 196,94 C 178,106 144,104 124,96 C 110,103 94,104 82,102 L 54,126 L 64,98 C 60,96 57,95 54,94 Z';
        svg.appendChild(
          rc.path(cloudSpeechPath, {
            roughness: 1.4,
            bowing: 1.3,
            stroke: strokeColor,
            strokeWidth: baseStroke,
            fill: fillColor,
            fillStyle: 'solid',
            seed,
          })
        );
        break;
      }

      case 'thought': {
        const cloudPath =
          'M 54,94 C 24,94 12,76 18,56 C 10,36 28,16 54,20 C 68,6 102,4 124,16 C 148,4 186,8 198,24 C 228,20 248,40 240,62 C 248,84 226,98 196,94 C 178,106 144,104 124,96 C 102,106 68,104 54,94 Z';
        svg.appendChild(
          rc.path(cloudPath, {
            roughness: 1.45,
            bowing: 1.35,
            stroke: strokeColor,
            strokeWidth: baseStroke,
            fill: fillColor,
            fillStyle: 'solid',
            seed,
          })
        );
        const trailCircles: Array<[number, number, number]> = [
          [82, 108, 15],
          [62, 118, 10],
          [46, 125, 6],
        ];
        trailCircles.forEach(([cx, cy, diameter], idx) => {
          svg.appendChild(
            rc.circle(cx, cy, diameter, {
              roughness: 1.35,
              bowing: 1.2,
              stroke: strokeColor,
              strokeWidth: Math.max(1, baseStroke * 0.85),
              fill: fillColor,
              fillStyle: 'solid',
              seed: seed + idx + 1,
            })
          );
        });
        break;
      }

      case 'thought-double': {
        svg.appendChild(
          rc.ellipse(132, 54, 232, 86, {
            roughness: 1.7,
            bowing: 1.5,
            stroke: strokeColor,
            strokeWidth: baseStroke,
            fill: fillColor,
            fillStyle: 'solid',
            seed,
          })
        );
        svg.appendChild(
          rc.ellipse(132, 54, 218, 74, {
            roughness: 1.2,
            bowing: 1.1,
            stroke: strokeColor,
            strokeWidth: Math.max(0.8, baseStroke * 0.45),
            seed: seed + 5,
          })
        );
        const trail: Array<[number, number, number]> = [
          [74, 106, 16],
          [52, 117, 11],
          [34, 125, 7],
        ];
        trail.forEach(([cx, cy, d], idx) => {
          svg.appendChild(
            rc.circle(cx, cy, d, {
              roughness: 1.3,
              bowing: 1.1,
              stroke: strokeColor,
              strokeWidth: Math.max(1, baseStroke * 0.8),
              fill: fillColor,
              fillStyle: 'solid',
              seed: seed + 10 + idx,
            })
          );
        });
        break;
      }

      case 'burst': {
        const starPath = buildStarburstPath(130, 66, 122, 60, 96, 44, 14);
        svg.appendChild(
          rc.path(starPath, {
            roughness: 1.35,
            bowing: 1.15,
            stroke: strokeColor,
            strokeWidth: baseStroke,
            fill: fillColor,
            fillStyle: 'solid',
            seed,
          })
        );
        break;
      }

      case 'zigzag': {
        const zigPath = buildZigzagBoxPath(16, 14, 228, 104, 7, 12, 5);
        svg.appendChild(
          rc.path(zigPath, {
            roughness: 1.25,
            bowing: 1.1,
            stroke: strokeColor,
            strokeWidth: baseStroke,
            fill: fillColor,
            fillStyle: 'solid',
            seed,
          })
        );
        break;
      }

      case 'note': {
        svg.appendChild(
          rc.rectangle(14, 16, 232, 104, {
            roughness: 1.65,
            bowing: 1.5,
            stroke: strokeColor,
            strokeWidth: baseStroke,
            fill: fillColor,
            fillStyle: 'solid',
            seed,
          })
        );
        [50, 72, 94].forEach((y, idx) => {
          const line = rc.line(26, y, 234, y, {
            roughness: 0.9,
            bowing: 0.8,
            stroke: strokeColor,
            strokeWidth: 0.75,
            seed: seed + 10 + idx,
          });
          line.setAttribute('opacity', '0.18');
          svg.appendChild(line);
        });
        const tape = rc.rectangle(104, 5, 52, 16, {
          roughness: 1.3,
          bowing: 1.1,
          stroke: strokeColor,
          strokeWidth: Math.max(1, baseStroke * 0.65),
          fill: '#fde68a',
          fillStyle: 'hachure',
          hachureAngle: -35,
          hachureGap: 4,
          seed: seed + 20,
        });
        tape.setAttribute('opacity', '0.9');
        svg.appendChild(tape);
        break;
      }

      case 'note-fold': {
        const foldedPaper =
          'M 14,16 L 246,16 L 246,96 L 222,122 L 14,122 Z';
        svg.appendChild(
          rc.path(foldedPaper, {
            roughness: 1.55,
            bowing: 1.4,
            stroke: strokeColor,
            strokeWidth: baseStroke,
            fill: fillColor,
            fillStyle: 'solid',
            seed,
          })
        );
        const foldCorner = 'M 222,122 L 222,96 L 246,96 Z';
        svg.appendChild(
          rc.path(foldCorner, {
            roughness: 1.1,
            bowing: 1.0,
            stroke: strokeColor,
            strokeWidth: Math.max(1, baseStroke * 0.8),
            fill: '#cbd5e1',
            fillStyle: 'solid',
            seed: seed + 3,
          })
        );
        // Pin at top center
        svg.appendChild(
          rc.circle(130, 14, 13, {
            roughness: 1.2,
            bowing: 1.0,
            stroke: strokeColor,
            strokeWidth: Math.max(1, baseStroke * 0.75),
            fill: '#ef4444',
            fillStyle: 'solid',
            seed: seed + 8,
          })
        );
        break;
      }

      case 'board-chalk': {
        // Outer wood-style frame
        svg.appendChild(
          rc.rectangle(8, 8, 244, 116, {
            roughness: 1.4,
            bowing: 1.2,
            stroke: '#92400e',
            strokeWidth: Math.max(2, baseStroke * 1.1),
            fill: '#b45309',
            fillStyle: 'hachure',
            hachureGap: 6,
            seed: seed + 2,
          })
        );
        // Inner chalkboard surface
        svg.appendChild(
          rc.rectangle(16, 16, 228, 100, {
            roughness: 1.35,
            bowing: 1.15,
            stroke: strokeColor,
            strokeWidth: baseStroke,
            fill: fillColor,
            fillStyle: 'solid',
            seed,
          })
        );
        break;
      }

      case 'board-wavy': {
        const wavyOuter =
          'M 16,14 Q 72,6 130,14 Q 188,22 244,14 Q 252,66 244,118 Q 188,126 130,118 Q 72,110 16,118 Q 8,66 16,14 Z';
        svg.appendChild(
          rc.path(wavyOuter, {
            roughness: 1.6,
            bowing: 1.5,
            stroke: strokeColor,
            strokeWidth: baseStroke,
            fill: fillColor,
            fillStyle: 'solid',
            seed,
          })
        );
        const wavyInner =
          'M 23,21 Q 75,14 130,21 Q 185,28 237,21 Q 243,66 237,111 Q 185,118 130,111 Q 75,104 23,111 Q 17,66 23,21 Z';
        svg.appendChild(
          rc.path(wavyInner, {
            roughness: 1.2,
            bowing: 1.1,
            stroke: strokeColor,
            strokeWidth: Math.max(0.8, baseStroke * 0.45),
            seed: seed + 6,
          })
        );
        break;
      }
    }
  }, [variant, strokeColor, fillColor, baseStroke, seed]);

  const rawText = text ?? DEFAULT_TEXT[variant];
  const displayText =
    textRevealRatio !== undefined && textRevealRatio < 1
      ? rawText.slice(0, Math.ceil(rawText.length * Math.max(0, textRevealRatio)))
      : rawText;

  const paddingClass =
    variant === 'speech' || variant === 'speech-oval' || variant === 'speech-cloud'
      ? 'px-6 pt-3 pb-7'
      : variant === 'speech-side'
        ? 'pl-9 pr-4 py-3'
        : variant === 'thought' || variant === 'thought-double'
          ? 'px-7 pt-4 pb-8'
          : variant === 'burst'
            ? 'px-10 py-6'
            : variant === 'zigzag'
              ? 'px-7 py-5'
              : variant === 'note'
                ? 'px-5 pt-6 pb-3'
                : variant === 'note-fold'
                  ? 'px-5 pt-6 pb-4'
                  : 'px-6 py-4';

  return (
    <div
      className="relative w-full h-full select-none"
      style={{
        transform: variant === 'note' ? 'rotate(-1.8deg)' : undefined,
      }}
    >
      <svg
        ref={svgRef}
        viewBox="0 0 260 132"
        preserveAspectRatio="none"
        className="w-full h-full overflow-visible pointer-events-none"
        style={{ filter: 'drop-shadow(0 3px 6px rgba(15, 23, 42, 0.08))' }}
      />
      <div
        className={`absolute inset-0 flex items-center justify-center text-center pointer-events-none ${paddingClass}`}
      >
        <span
          className="font-semibold leading-snug break-words whitespace-pre-wrap w-full"
          style={{
            color: strokeColor,
            fontSize: fontSize ? `${fontSize}px` : '14px',
            fontFamily: fontFamily || 'Poppins, sans-serif',
          }}
        >
          {displayText}
        </span>
      </div>
    </div>
  );
};
