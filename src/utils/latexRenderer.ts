import katex from 'katex';

/**
 * Strips outer math delimiters ($...$, $$...$$, \(...\), \[...\]) if the user
 * pasted wrapped LaTeX expressions into the formula box.
 */
export function stripLatexDelimiters(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('$$') && trimmed.endsWith('$$') && trimmed.length >= 4) {
    return trimmed.slice(2, -2).trim();
  }
  if (trimmed.startsWith('$') && trimmed.endsWith('$') && trimmed.length >= 2) {
    return trimmed.slice(1, -1).trim();
  }
  if (trimmed.startsWith('\\[') && trimmed.endsWith('\\]') && trimmed.length >= 4) {
    return trimmed.slice(2, -2).trim();
  }
  if (trimmed.startsWith('\\(') && trimmed.endsWith('\\)') && trimmed.length >= 4) {
    return trimmed.slice(2, -2).trim();
  }
  return trimmed;
}

/**
 * Renders any LaTeX math string to KaTeX HTML for live canvas display.
 */
export function renderLatexToHtml(raw: string): string {
  const cleaned = stripLatexDelimiters(raw);
  if (!cleaned) return '';
  try {
    return katex.renderToString(cleaned, {
      displayMode: true,
      throwOnError: false,
      strict: false,
      output: 'htmlAndMathml',
    });
  } catch {
    return cleaned;
  }
}

// ============================================================================
// LIGHTWEIGHT LATEX AST PARSER & 2D CANVAS RENDERER (FOR VIDEO EXPORT)
// ============================================================================

const LATEX_SYMBOLS: Record<string, string> = {
  pm: '±',
  mp: '∓',
  times: '×',
  cdot: '·',
  div: '÷',
  le: '≤',
  leq: '≤',
  ge: '≥',
  geq: '≥',
  ne: '≠',
  neq: '≠',
  approx: '≈',
  equiv: '≡',
  sim: '∼',
  propto: '∝',
  infty: '∞',
  partial: '∂',
  nabla: '∇',
  sum: '∑',
  prod: '∏',
  int: '∫',
  oint: '∮',
  to: '→',
  rightarrow: '→',
  leftarrow: '←',
  leftrightarrow: '↔',
  Rightarrow: '⇒',
  Leftarrow: '⇐',
  Leftrightarrow: '⇔',
  forall: '∀',
  exists: '∃',
  in: '∈',
  notin: '∉',
  subset: '⊂',
  subseteq: '⊆',
  cup: '∪',
  cap: '∩',
  emptyset: '∅',
  angle: '∠',
  perp: '⊥',
  parallel: '∥',
  triangle: '△',
  circ: '°',
  degree: '°',
  alpha: 'α',
  beta: 'β',
  gamma: 'γ',
  delta: 'δ',
  epsilon: 'ε',
  varepsilon: 'ε',
  zeta: 'ζ',
  eta: 'η',
  theta: 'θ',
  vartheta: 'ϑ',
  iota: 'ι',
  kappa: 'κ',
  lambda: 'λ',
  mu: 'μ',
  nu: 'ν',
  xi: 'ξ',
  pi: 'π',
  rho: 'ρ',
  sigma: 'σ',
  tau: 'τ',
  upsilon: 'υ',
  phi: 'φ',
  varphi: 'φ',
  chi: 'χ',
  psi: 'ψ',
  omega: 'ω',
  Gamma: 'Γ',
  Delta: 'Δ',
  Theta: 'Θ',
  Lambda: 'Λ',
  Xi: 'Ξ',
  Pi: 'Π',
  Sigma: 'Σ',
  Phi: 'Φ',
  Psi: 'Ψ',
  Omega: 'Ω',
  sin: 'sin',
  cos: 'cos',
  tan: 'tan',
  cot: 'cot',
  sec: 'sec',
  csc: 'csc',
  log: 'log',
  ln: 'ln',
  lim: 'lim',
  max: 'max',
  min: 'min',
  exp: 'exp',
  quad: '  ',
  qquad: '    ',
  ',': ' ',
  ';': ' ',
  ' ': ' ',
};

type MathNode =
  | { kind: 'text'; value: string }
  | { kind: 'seq'; items: MathNode[] }
  | { kind: 'frac'; num: MathNode; den: MathNode }
  | { kind: 'sqrt'; body: MathNode }
  | { kind: 'script'; base: MathNode; sup?: MathNode; sub?: MathNode };

function parseLatexGroup(src: string, pos: number): [MathNode, number] {
  while (pos < src.length && /\s/.test(src[pos])) pos++;
  if (pos >= src.length) return [{ kind: 'text', value: '' }, pos];
  if (src[pos] === '{') {
    const [node, nextPos] = parseLatexSeq(src, pos + 1, '}');
    return [node, nextPos];
  }
  return parseLatexAtom(src, pos);
}

function parseLatexAtom(src: string, pos: number): [MathNode, number] {
  if (pos >= src.length) return [{ kind: 'text', value: '' }, pos];
  const ch = src[pos];

  if (ch === '{') {
    return parseLatexSeq(src, pos + 1, '}');
  }

  if (ch === '\\') {
    let end = pos + 1;
    if (end < src.length && !/[a-zA-Z]/.test(src[end])) {
      const sym = src[end];
      return [{ kind: 'text', value: LATEX_SYMBOLS[sym] ?? sym }, end + 1];
    }
    while (end < src.length && /[a-zA-Z]/.test(src[end])) end++;
    const cmd = src.slice(pos + 1, end);

    if (cmd === 'frac' || cmd === 'dfrac' || cmd === 'tfrac') {
      const [num, p1] = parseLatexGroup(src, end);
      const [den, p2] = parseLatexGroup(src, p1);
      return [{ kind: 'frac', num, den }, p2];
    }
    if (cmd === 'sqrt') {
      // Skip optional [n] root index if present
      let p = end;
      while (p < src.length && /\s/.test(src[p])) p++;
      if (src[p] === '[') {
        const closeBracket = src.indexOf(']', p);
        if (closeBracket !== -1) p = closeBracket + 1;
      }
      const [body, p1] = parseLatexGroup(src, p);
      return [{ kind: 'sqrt', body }, p1];
    }
    if (cmd === 'text' || cmd === 'mathrm' || cmd === 'mathbf' || cmd === 'textbf') {
      const [body, p1] = parseLatexGroup(src, end);
      return [body, p1];
    }
    if (cmd === 'left' || cmd === 'right') {
      let p = end;
      while (p < src.length && /\s/.test(src[p])) p++;
      if (p < src.length) {
        const delim = src[p] === '.' ? '' : src[p];
        return [{ kind: 'text', value: delim }, p + 1];
      }
      return [{ kind: 'text', value: '' }, p];
    }

    const mapped = LATEX_SYMBOLS[cmd];
    if (mapped !== undefined) {
      return [{ kind: 'text', value: mapped }, end];
    }
    return [{ kind: 'text', value: cmd }, end];
  }

  return [{ kind: 'text', value: ch }, pos + 1];
}

function parseLatexSeq(
  src: string,
  start: number,
  stopChar?: string
): [MathNode, number] {
  const items: MathNode[] = [];
  let pos = start;

  while (pos < src.length) {
    if (stopChar && src[pos] === stopChar) {
      return [{ kind: 'seq', items }, pos + 1];
    }
    if (src[pos] === '^' || src[pos] === '_') {
      const isSup = src[pos] === '^';
      const [scriptNode, nextPos] = parseLatexGroup(src, pos + 1);
      const prev = items.pop() || { kind: 'text', value: '' };
      if (prev.kind === 'script') {
        if (isSup) prev.sup = scriptNode;
        else prev.sub = scriptNode;
        items.push(prev);
      } else {
        items.push({
          kind: 'script',
          base: prev,
          ...(isSup ? { sup: scriptNode } : { sub: scriptNode }),
        });
      }
      pos = nextPos;
      continue;
    }

    const [atom, nextPos] = parseLatexAtom(src, pos);
    items.push(atom);
    pos = nextPos;
  }

  return [{ kind: 'seq', items }, pos];
}

interface BoxMetrics {
  width: number;
  ascent: number;
  descent: number;
}

function measureMathNode(
  ctx: CanvasRenderingContext2D,
  node: MathNode,
  fontSize: number
): BoxMetrics {
  switch (node.kind) {
    case 'text': {
      ctx.font = `600 ${fontSize}px "Cambria Math", "Times New Roman", Georgia, serif`;
      const w = ctx.measureText(node.value).width;
      return { width: w, ascent: fontSize * 0.72, descent: fontSize * 0.22 };
    }
    case 'seq': {
      let width = 0;
      let ascent = fontSize * 0.5;
      let descent = fontSize * 0.15;
      for (const item of node.items) {
        const m = measureMathNode(ctx, item, fontSize);
        width += m.width;
        ascent = Math.max(ascent, m.ascent);
        descent = Math.max(descent, m.descent);
      }
      return { width, ascent, descent };
    }
    case 'frac': {
      const subSize = Math.max(10, fontSize * 0.78);
      const numM = measureMathNode(ctx, node.num, subSize);
      const denM = measureMathNode(ctx, node.den, subSize);
      const width = Math.max(numM.width, denM.width) + fontSize * 0.45;
      const numTotal = numM.ascent + numM.descent;
      const denTotal = denM.ascent + denM.descent;
      const barOffset = fontSize * 0.25;
      return {
        width,
        ascent: barOffset + numTotal + fontSize * 0.18,
        descent: denTotal + fontSize * 0.18 - barOffset,
      };
    }
    case 'sqrt': {
      const bodyM = measureMathNode(ctx, node.body, fontSize);
      const radicalW = fontSize * 0.55;
      return {
        width: radicalW + bodyM.width + fontSize * 0.2,
        ascent: bodyM.ascent + fontSize * 0.22,
        descent: bodyM.descent + fontSize * 0.08,
      };
    }
    case 'script': {
      const baseM = measureMathNode(ctx, node.base, fontSize);
      const sSize = Math.max(9, fontSize * 0.65);
      const supM = node.sup ? measureMathNode(ctx, node.sup, sSize) : null;
      const subM = node.sub ? measureMathNode(ctx, node.sub, sSize) : null;
      const scriptW = Math.max(supM?.width || 0, subM?.width || 0);
      return {
        width: baseM.width + scriptW + 1,
        ascent: Math.max(
          baseM.ascent,
          supM ? baseM.ascent * 0.65 + supM.ascent : 0
        ),
        descent: Math.max(
          baseM.descent,
          subM ? baseM.descent + subM.descent + sSize * 0.25 : 0
        ),
      };
    }
  }
}

function drawMathNode(
  ctx: CanvasRenderingContext2D,
  node: MathNode,
  x: number,
  baselineY: number,
  fontSize: number,
  color: string
): number {
  switch (node.kind) {
    case 'text': {
      ctx.fillStyle = color;
      ctx.font = `600 ${fontSize}px "Cambria Math", "Times New Roman", Georgia, serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(node.value, x, baselineY);
      return ctx.measureText(node.value).width;
    }
    case 'seq': {
      let curX = x;
      for (const item of node.items) {
        curX += drawMathNode(ctx, item, curX, baselineY, fontSize, color);
      }
      return curX - x;
    }
    case 'frac': {
      const subSize = Math.max(10, fontSize * 0.78);
      const numM = measureMathNode(ctx, node.num, subSize);
      const denM = measureMathNode(ctx, node.den, subSize);
      const totalW = Math.max(numM.width, denM.width) + fontSize * 0.45;
      const barY = baselineY - fontSize * 0.28;

      // Fraction bar
      ctx.fillStyle = color;
      ctx.fillRect(x + 2, barY, totalW - 4, Math.max(1.2, fontSize * 0.06));

      // Numerator centered above bar
      const numX = x + (totalW - numM.width) / 2;
      const numBaseY = barY - fontSize * 0.16 - numM.descent;
      drawMathNode(ctx, node.num, numX, numBaseY, subSize, color);

      // Denominator centered below bar
      const denX = x + (totalW - denM.width) / 2;
      const denBaseY = barY + fontSize * 0.16 + denM.ascent;
      drawMathNode(ctx, node.den, denX, denBaseY, subSize, color);

      return totalW;
    }
    case 'sqrt': {
      const bodyM = measureMathNode(ctx, node.body, fontSize);
      const radicalW = fontSize * 0.55;
      const topY = baselineY - bodyM.ascent - fontSize * 0.14;
      const botY = baselineY + bodyM.descent * 0.45;

      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1.2, fontSize * 0.065);
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(x + 1, baselineY - bodyM.ascent * 0.35);
      ctx.lineTo(x + radicalW * 0.32, baselineY - bodyM.ascent * 0.2);
      ctx.lineTo(x + radicalW * 0.58, botY);
      ctx.lineTo(x + radicalW * 0.92, topY);
      ctx.lineTo(x + radicalW + bodyM.width + fontSize * 0.14, topY);
      ctx.stroke();

      drawMathNode(ctx, node.body, x + radicalW + 2, baselineY, fontSize, color);
      return radicalW + bodyM.width + fontSize * 0.2;
    }
    case 'script': {
      const baseM = measureMathNode(ctx, node.base, fontSize);
      const baseW = drawMathNode(ctx, node.base, x, baselineY, fontSize, color);
      const sSize = Math.max(9, fontSize * 0.65);
      let maxScriptW = 0;

      if (node.sup) {
        const supM = measureMathNode(ctx, node.sup, sSize);
        drawMathNode(
          ctx,
          node.sup,
          x + baseW + 1,
          baselineY - baseM.ascent * 0.55,
          sSize,
          color
        );
        maxScriptW = Math.max(maxScriptW, supM.width);
      }
      if (node.sub) {
        const subM = measureMathNode(ctx, node.sub, sSize);
        drawMathNode(
          ctx,
          node.sub,
          x + baseW + 1,
          baselineY + sSize * 0.38,
          sSize,
          color
        );
        maxScriptW = Math.max(maxScriptW, subM.width);
      }

      return baseW + maxScriptW + 1;
    }
  }
}

/**
 * Draws parsed LaTeX math directly onto a 2D Canvas for video export.
 */
export function drawLatexOnCanvas(
  ctx: CanvasRenderingContext2D,
  raw: string,
  centerX: number,
  centerY: number,
  maxWidth: number,
  fontSize: number,
  color: string
): void {
  const cleaned = stripLatexDelimiters(raw);
  if (!cleaned) return;
  const [ast] = parseLatexSeq(cleaned, 0);

  let effectiveSize = fontSize;
  let metrics = measureMathNode(ctx, ast, effectiveSize);
  if (metrics.width > maxWidth && metrics.width > 0) {
    const ratio = Math.max(0.45, maxWidth / metrics.width);
    effectiveSize = Math.max(10, Math.round(fontSize * ratio));
    metrics = measureMathNode(ctx, ast, effectiveSize);
  }

  const startX = centerX - metrics.width / 2;
  const baselineY = centerY + (metrics.ascent - metrics.descent) / 2;
  ctx.save();
  drawMathNode(ctx, ast, startX, baselineY, effectiveSize, color);
  ctx.restore();
}

