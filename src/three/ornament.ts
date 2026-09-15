/**
 * ============================================================================
 *  ornament — gerador dos arabescos da embalagem
 * ============================================================================
 *
 * Os arabescos azuis e rosa da lata do Guaraná Jesus (inspirados nos azulejos
 * coloniais de São Luís) são GERADOS matematicamente aqui, como caminhos SVG.
 *
 * Uma única fonte de verdade, dois destinos:
 *   - rótulo da lata  → labelTexture.ts pinta com Path2D no canvas
 *   - página          → components/Arabesque.tsx renderiza <path d="…"/>
 *
 * Vocabulário de formas (todas combinadas em ornamentMotif):
 *   spiral    espiral logarítmica (o "caracol" das volutas)
 *   scrollS   voluta em S: espiral → curva → espiral no sentido oposto
 *   curl      cacho: espiral com uma cauda que se afina
 *   teardrop  gota/folha
 *   dot/dotArc pontos isolados e cordões de pontos em arco
 *
 * Os traços têm espessura variável (função `tapered`), imitando pinceladas:
 * finos nas pontas, cheios no meio.
 *
 * Sistema de coordenadas do motivo: x ∈ [-50, 50], y ∈ [0, 100] (y para baixo,
 * como no SVG). O motivo é simétrico: desenhamos a metade esquerda e espelhamos.
 */

export type OrnamentColor = 'azul' | 'rosa';

/** Uma forma pronta para desenhar: caminho SVG + cor lógica. */
export interface OrnamentShape {
  d: string;
  color: OrnamentColor;
}

/** Ponto 2D */
type P = [number, number];

/** 2 casas decimais: caminhos SVG compactos sem perda visível */
const f = (n: number) => n.toFixed(2);

// ---------------------------------------------------------------------------
// Primitivas geométricas (retornam listas de pontos)
// ---------------------------------------------------------------------------

/**
 * Espiral logarítmica, do centro para fora.
 * O raio cresce exponencialmente (rInner → rOuter), o que dá o aspecto
 * natural de concha/voluta, diferente de uma espiral de passo constante.
 *
 * @param aOuter ângulo (rad) onde a espiral termina, na borda externa
 * @param turns  número de voltas
 * @param dir    sentido do giro (1 horário, -1 anti-horário)
 */
function spiral(cx: number, cy: number, rInner: number, rOuter: number, aOuter: number, turns: number, dir: 1 | -1): P[] {
  const pts: P[] = [];
  const steps = 60;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const r = rInner * Math.pow(rOuter / rInner, t);
    const a = aOuter - dir * (1 - t) * turns * Math.PI * 2;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}

/** Curva de Bézier cúbica amostrada em `n` pontos (sem o ponto inicial). */
function bezier(p0: P, p1: P, p2: P, p3: P, n = 40): P[] {
  const pts: P[] = [];
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    pts.push([
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ]);
  }
  return pts;
}

/**
 * Direção (vetor unitário) na ponta de uma polilinha.
 * Usada para emendar espirais e curvas sem "quinas": a Bézier sai na mesma
 * direção em que a espiral termina (continuidade de tangente).
 */
function tangent(pts: P[], atEnd: boolean): P {
  const [a, b] = atEnd ? [pts[pts.length - 2], pts[pts.length - 1]] : [pts[1], pts[0]];
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l = Math.hypot(dx, dy) || 1;
  return [dx / l, dy / l];
}

/** Suavização clássica (smoothstep) para a transição de espessura. */
const smooth = (t: number) => t * t * (3 - 2 * t);

// ---------------------------------------------------------------------------
// Construtores de formas (retornam caminhos SVG)
// ---------------------------------------------------------------------------

/**
 * Transforma uma linha central em um traço PREENCHIDO de espessura variável.
 * Para cada ponto, desloca-se meia espessura para cada lado ao longo da
 * normal; depois as duas bordas são unidas em um contorno fechado.
 *
 * @param w0 espessura no início · w1 no meio · w2 no fim
 */
function tapered(pts: P[], w0: number, w1: number, w2: number): string {
  const left: P[] = [];
  const right: P[] = [];
  for (let i = 0; i < pts.length; i++) {
    const t = i / (pts.length - 1);
    const w = t < 0.5 ? w0 + (w1 - w0) * smooth(t * 2) : w1 + (w2 - w1) * smooth((t - 0.5) * 2);
    // normal = tangente girada 90°
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    let nx = -(b[1] - a[1]);
    let ny = b[0] - a[0];
    const l = Math.hypot(nx, ny) || 1;
    nx /= l;
    ny /= l;
    left.push([pts[i][0] + nx * w * 0.5, pts[i][1] + ny * w * 0.5]);
    right.push([pts[i][0] - nx * w * 0.5, pts[i][1] - ny * w * 0.5]);
  }
  // borda esquerda (ida) + borda direita (volta) = contorno fechado
  const all = [...left, ...right.reverse()];
  return `M${all.map((p) => `${f(p[0])},${f(p[1])}`).join('L')}Z`;
}

/** Voluta em "S": espiral → curva → espiral no sentido oposto. */
function scrollS(
  a: { cx: number; cy: number; r: number; ang: number; dir: 1 | -1 },
  b: { cx: number; cy: number; r: number; ang: number; dir: 1 | -1 },
  width: number,
  /** quanto a curva do meio "estufa" (0 = reta) */
  bend = 0.9
): string {
  const sa = spiral(a.cx, a.cy, a.r * 0.12, a.r, a.ang, 1.15, a.dir);
  const sb = spiral(b.cx, b.cy, b.r * 0.14, b.r, b.ang, 1.0, b.dir).reverse();
  const p0 = sa[sa.length - 1];
  const p3 = sb[0];
  // pontos de controle alinhados às tangentes das espirais → emenda suave
  const ta = tangent(sa, true);
  const tb = tangent(sb, false);
  const len = Math.hypot(p3[0] - p0[0], p3[1] - p0[1]) * bend * 0.5;
  const mid = bezier(p0, [p0[0] + ta[0] * len, p0[1] + ta[1] * len], [p3[0] + tb[0] * len, p3[1] + tb[1] * len], p3);
  return tapered([...sa, ...mid, ...sb.slice(1)], width * 0.15, width, width * 0.2);
}

/** Cacho: uma espiral que termina em uma cauda afinada até `tail`. */
function curl(cx: number, cy: number, r: number, ang: number, dir: 1 | -1, width: number, tail: P): string {
  const s = spiral(cx, cy, r * 0.15, r, ang, 1.1, dir);
  const p0 = s[s.length - 1];
  const t = tangent(s, true);
  const len = Math.hypot(tail[0] - p0[0], tail[1] - p0[1]) * 0.5;
  const mid = bezier(p0, [p0[0] + t[0] * len, p0[1] + t[1] * len], [tail[0], tail[1] - len * 0.3], tail, 24);
  return tapered([...s, ...mid], width * 0.2, width, 0.2);
}

/**
 * Gota/folha com a ponta em (cx, cy) e o bulbo na direção de `angle`.
 * Desenhada em coordenadas locais e rotacionada ponto a ponto.
 */
function teardrop(cx: number, cy: number, len: number, w: number, angle: number): string {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const tr = (x: number, y: number): string => `${f(cx + x * c - y * s)},${f(cy + x * s + y * c)}`;
  return `M${tr(0, 0)}C${tr(len * 0.35, -w * 0.15)} ${tr(len * 0.55, -w)} ${tr(len * 0.85, -w * 0.9)}C${tr(len * 1.15, -w * 0.8)} ${tr(
    len * 1.15,
    w * 0.8
  )} ${tr(len * 0.85, w * 0.9)}C${tr(len * 0.55, w)} ${tr(len * 0.35, w * 0.15)} ${tr(0, 0)}Z`;
}

/** Círculo em sintaxe de caminho (dois arcos de 180°). */
function dot(cx: number, cy: number, r: number): string {
  return `M${f(cx - r)},${f(cy)}a${f(r)},${f(r)} 0 1,0 ${f(r * 2)},0a${f(r)},${f(r)} 0 1,0 ${f(-r * 2)},0Z`;
}

/** Cordão de `n` pontos ao longo de um arco, com tamanho variando de r0 a r1. */
function dotArc(cx: number, cy: number, radius: number, a0: number, a1: number, n: number, r0: number, r1: number) {
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1);
    const a = a0 + (a1 - a0) * t;
    out.push(dot(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius, r0 + (r1 - r0) * t));
  }
  return out.join('');
}

// ---------------------------------------------------------------------------
// Composição do motivo
// ---------------------------------------------------------------------------

/**
 * Metade do motivo. `sx = 1` desenha o lado esquerdo; `sx = -1` espelha
 * para o direito (x invertido, sentidos de giro e ângulos ajustados).
 * `variant` desloca levemente alguns elementos para os arabescos de cima e de
 * baixo da faixa não ficarem idênticos.
 */
function half(sx: 1 | -1, variant: 0 | 1): OrnamentShape[] {
  const X = (x: number) => x * sx;
  const d1: 1 | -1 = sx === 1 ? 1 : -1;
  const d2: 1 | -1 = sx === 1 ? -1 : 1;
  const shapes: OrnamentShape[] = [];

  // grande voluta azul que forma a "lira" (estrutura principal)
  shapes.push({
    color: 'azul',
    d: scrollS(
      { cx: X(-22), cy: 20 + variant * 4, r: 13, ang: sx === 1 ? Math.PI * 0.35 : Math.PI * 0.65, dir: d2 },
      { cx: X(-9), cy: 78, r: 8, ang: sx === 1 ? Math.PI * 1.1 : -Math.PI * 0.1, dir: d1 },
      5.2
    ),
  });

  // voluta externa menor (azul)
  shapes.push({
    color: 'azul',
    d: curl(X(-38), 52, 7, sx === 1 ? Math.PI * 0.2 : Math.PI * 0.8, d1, 3.4, [X(-30), 92]),
  });

  // cachos rosa internos
  shapes.push({
    color: 'rosa',
    d: curl(X(-12), 38, 6.5, sx === 1 ? Math.PI * 1.2 : -Math.PI * 0.2, d2, 3.2, [X(-3), 58]),
  });
  shapes.push({
    color: 'rosa',
    d: curl(X(-30), 4 + variant * 3, 4.5, sx === 1 ? Math.PI * 0.9 : Math.PI * 0.1, d1, 2.6, [X(-44), 22]),
  });

  // folhas (gotas)
  shapes.push({ color: 'rosa', d: teardrop(X(-26), 64, 14, 4.2, sx === 1 ? Math.PI * 0.85 : Math.PI * 0.15) });
  shapes.push({ color: 'azul', d: teardrop(X(-44), 36, 10, 3, sx === 1 ? -Math.PI * 0.55 : -Math.PI * 0.45) });

  // cordões de pontos
  shapes.push({ color: 'rosa', d: dotArc(X(-22), 20 + variant * 4, 19, sx === 1 ? Math.PI * 1.05 : -Math.PI * 0.05, sx === 1 ? Math.PI * 1.55 : -Math.PI * 0.55, 5, 1.1, 2.3) });
  shapes.push({ color: 'azul', d: dotArc(X(-9), 78, 14, sx === 1 ? Math.PI * 0.2 : Math.PI * 0.8, sx === 1 ? -Math.PI * 0.3 : Math.PI * 1.3, 4, 2, 1) });
  shapes.push({ color: 'rosa', d: dot(X(-47), 70, 2.2) + dot(X(-42), 78, 1.6) + dot(X(-17), 94, 1.8) });

  return shapes;
}

/**
 * Motivo completo e simétrico: metade esquerda + metade espelhada + eixo
 * central (gotas e pontos alinhados).
 * @param variant 0 = arabesco superior · 1 = inferior (levemente diferente)
 */
export function ornamentMotif(variant: 0 | 1 = 0): OrnamentShape[] {
  const center: OrnamentShape[] = [
    { color: 'rosa', d: teardrop(0, 52, 20, 5.5, -Math.PI / 2) },
    { color: 'azul', d: teardrop(0, 60, 16, 4.2, Math.PI / 2) },
    { color: 'azul', d: dot(0, 22, 3) + dot(0, 12, 2) + dot(0, 4, 1.3) },
  ];
  return [...half(1, variant), ...half(-1, variant), ...center];
}

/** viewBox SVG que enquadra o motivo com uma pequena margem. */
export const ORNAMENT_VIEWBOX = '-52 -2 104 104';
