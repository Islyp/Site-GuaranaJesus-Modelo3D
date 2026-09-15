/**
 * ============================================================================
 *  labelTexture — o rótulo da lata, desenhado por código
 * ============================================================================
 *
 * Em vez de uma imagem pronta, o rótulo é pintado em um <canvas> 2D e
 * enviado à GPU como textura (CanvasTexture). Vantagens:
 *  - zero arquivos de imagem para baixar;
 *  - resolução escolhida por dispositivo (4096 px desktop / 2048 px celular);
 *  - texto sempre nítido e editável no código.
 *
 * Layout da embalagem atual (a volta inteira da lata, planificada):
 *
 *   u = 0        0.25 (frente)                    0.75 (verso)          1
 *   ├── azul ──┤ faixa branca ├────── rosa ──────┤ faixa ├─── azul ────┤
 *   │ nutrição │  arabescos    │ reciclagem       │ estreita│ cód. barras│
 *   │          │  LOGO OVAL    │ ingredientes     │         │            │
 *   │          │  arabescos    │ 350 ml           │         │            │
 *
 * Como o mapa UV do cilindro funciona:
 *  - u (horizontal) dá a volta na lata; u = 0.25 fica voltado para a câmera
 *    graças à rotação de -90° aplicada em GuaranaCan;
 *  - v (vertical) vai da base ao topo do corpo reto.
 * O espaço de desenho é 2048 × 896, a mesma proporção entre a circunferência
 * (2π × 0.33 ≈ 2.07) e a altura do corpo (0.9): assim nada fica esticado.
 *
 * Prioridade: se existir a arte oficial em /public/textures/, ela é usada no
 * lugar deste desenho (ver loadExternalLabel).
 */
import * as THREE from 'three';
import { ornamentMotif, type OrnamentShape } from './ornament';
import { LABEL_TEXTURE_URL } from './canDimensions';

/** Paleta extraída da embalagem real. */
export const LABEL_COLORS = {
  azul: '#2a4a9f',
  azulEscuro: '#1e3a86',
  rosa: '#e84b85',
  rosaEscuro: '#d93d77',
  branco: '#f8f8f6',
};

// ---------------------------------------------------------------------------
// Grade do rótulo (espaço lógico em px; multiplicado por `resolution`)
// ---------------------------------------------------------------------------
const W = 2048;
const H = 896;
/** centro da frente (u = 0.25) */
const FRONT = W * 0.25;
/** faixa branca da frente: ~19% da circunferência, medida na foto da lata */
const BAND = { l: FRONT - 196, r: FRONT + 196 };
/** centro do verso (u = 0.75) */
const BACK = W * 0.75;
/** faixa branca estreita do verso */
const BACK_STRIP = { l: BACK - 62, r: BACK + 62 };

// ---------------------------------------------------------------------------
// Tipografia (carregada via Google Fonts no index.html)
// ---------------------------------------------------------------------------
/** "Jesus" do logo — script com peso, próxima da marca original */
const FONT_SCRIPT = 'Damion, "Brush Script MT", cursive';
/** "Guaraná" do logo e slogan — sans humanista */
const FONT_LOGO = '"Alegreya Sans", "Gill Sans", sans-serif';
/** textos legais pequenos (nutrição, ingredientes) */
const FONT_SMALL = '"Bricolage Grotesque", "Arial Narrow", sans-serif';
/** "350 ml" */
const FONT_SERIF = '"Instrument Serif", Georgia, serif';

/**
 * Garante que as fontes estejam prontas ANTES de desenhar.
 * O canvas não espera fontes web: se desenhássemos antes do download, o
 * rótulo sairia com a fonte padrão do sistema e ficaria assim na textura.
 */
export async function loadFonts() {
  await Promise.all([
    document.fonts.load(`160px ${FONT_SCRIPT}`),
    document.fonts.load(`800 60px ${FONT_LOGO}`),
    document.fonts.load(`700 20px ${FONT_SMALL}`),
    document.fonts.load(`60px ${FONT_SERIF}`),
  ]).catch(() => undefined);
}

/**
 * Desenha o rótulo completo e devolve o canvas.
 * Exportado separadamente para permitir depuração (anexar o canvas à página
 * e conferir o rótulo planificado).
 *
 * @param resolution 2 = 4096 × 1792 px · 1 = 2048 × 896 px
 */
export function drawLabelCanvas(resolution = 2) {
  const canvas = document.createElement('canvas');
  canvas.width = W * resolution;
  canvas.height = H * resolution;
  const ctx = canvas.getContext('2d')!;
  // Todas as coordenadas abaixo são lógicas; a escala cuida da resolução
  ctx.scale(resolution, resolution);

  // Ordem de pintura = ordem das camadas (fundo primeiro)
  drawPanels(ctx);
  // A tabela nutricional cruza a emenda da textura (u = 0 ↔ 1). Desenhá-la
  // em x e em x + W faz as duas metades se encontrarem sem corte visível.
  for (const offset of [0, W]) {
    ctx.save();
    ctx.translate(offset, 0);
    drawNutrition(ctx);
    ctx.restore();
  }
  drawSlogan(ctx);
  drawBand(ctx);
  drawBackStrip(ctx);
  drawPinkInfo(ctx);
  drawBackInfo(ctx);

  // filete branco no topo e na base (onde a impressão termina)
  ctx.fillStyle = LABEL_COLORS.branco;
  ctx.fillRect(0, 0, W, 10);
  ctx.fillRect(0, H - 6, W, 6);
  return canvas;
}

/**
 * Cria a textura do rótulo para o material da lata.
 * @param maxAnisotropy máximo suportado pela GPU (nitidez em ângulos rasantes)
 */
export async function createLabelTexture(maxAnisotropy: number, resolution = 2): Promise<THREE.Texture> {
  // 1º: arte oficial, se o arquivo existir
  const external = await loadExternalLabel(maxAnisotropy);
  if (external) return external;

  // 2º: rótulo procedural
  await loadFonts();
  const texture = new THREE.CanvasTexture(drawLabelCanvas(resolution));
  texture.colorSpace = THREE.SRGBColorSpace; // cores do canvas estão em sRGB
  texture.anisotropy = maxAnisotropy;
  texture.wrapS = THREE.RepeatWrapping; // a textura dá a volta completa na lata
  texture.needsUpdate = true;
  return texture;
}

/**
 * Se existir a arte oficial planificada em /public/textures, ela tem prioridade.
 * HEAD + checagem de content-type: servidores de SPA respondem HTML (status
 * 200) para arquivos inexistentes, então só aceitamos respostas image/*.
 */
async function loadExternalLabel(maxAnisotropy: number): Promise<THREE.Texture | null> {
  try {
    const res = await fetch(LABEL_TEXTURE_URL, { method: 'HEAD' });
    const type = res.headers.get('content-type') ?? '';
    if (!res.ok || !type.startsWith('image/')) return null;
    const texture = await new THREE.TextureLoader().loadAsync(LABEL_TEXTURE_URL);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = maxAnisotropy;
    texture.wrapS = THREE.RepeatWrapping;
    return texture;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Camadas do rótulo
// ---------------------------------------------------------------------------

/**
 * Fundo: painéis azul e rosa com um leve degradê vertical (a tinta sobre
 * alumínio nunca é chapada) e as duas faixas brancas.
 */
function drawPanels(ctx: CanvasRenderingContext2D) {
  const blue = ctx.createLinearGradient(0, 0, 0, H);
  blue.addColorStop(0, '#3052a8');
  blue.addColorStop(0.55, LABEL_COLORS.azul);
  blue.addColorStop(1, LABEL_COLORS.azulEscuro);
  const pink = ctx.createLinearGradient(0, 0, 0, H);
  pink.addColorStop(0, '#ec5890');
  pink.addColorStop(0.55, LABEL_COLORS.rosa);
  pink.addColorStop(1, LABEL_COLORS.rosaEscuro);

  ctx.fillStyle = blue;
  ctx.fillRect(0, 0, BAND.l, H);
  ctx.fillRect(BACK_STRIP.r, 0, W - BACK_STRIP.r, H);
  ctx.fillStyle = pink;
  ctx.fillRect(BAND.r, 0, BACK_STRIP.l - BAND.r, H);

  ctx.fillStyle = LABEL_COLORS.branco;
  ctx.fillRect(BAND.l, 0, BAND.r - BAND.l, H);
  ctx.fillRect(BACK_STRIP.l, 0, BACK_STRIP.r - BACK_STRIP.l, H);
}

/**
 * Pinta um conjunto de arabescos (caminhos SVG de ornament.ts) no canvas.
 * Path2D aceita a mesma sintaxe "d" do SVG — por isso os arabescos da lata
 * e os da página são literalmente os mesmos desenhos.
 *
 * @param x,y   ponto de ancoragem (centro superior do motivo)
 * @param scale 1 unidade do motivo = `scale` px
 * @param flipY espelha na vertical (arabesco inferior da faixa)
 */
function paintOrnament(
  ctx: CanvasRenderingContext2D,
  shapes: OrnamentShape[],
  x: number,
  y: number,
  scale: number,
  flipY = false
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, flipY ? -scale : scale);
  for (const s of shapes) {
    ctx.fillStyle = s.color === 'azul' ? LABEL_COLORS.azul : LABEL_COLORS.rosa;
    ctx.fill(new Path2D(s.d));
  }
  ctx.restore();
}

/**
 * Frente da lata: arabescos em cima e embaixo e o logo oval no meio.
 * Proporções medidas na foto da embalagem (logo centrado a ~44% da altura).
 */
function drawBand(ctx: CanvasRenderingContext2D) {
  // arabescos: superior (menor) e inferior (maior, espelhado na vertical)
  paintOrnament(ctx, ornamentMotif(0), FRONT, 14, 3.05);
  paintOrnament(ctx, ornamentMotif(1), FRONT, H - 12, 3.55, true);

  // Logo oval: mais largo que a faixa branca, invade os dois painéis.
  // A leve rotação (-2.5°) reproduz a inclinação do selo original.
  const cy = 396;
  ctx.save();
  ctx.translate(FRONT + 6, cy);
  ctx.rotate(-0.045);
  ctx.beginPath();
  ctx.ellipse(0, 0, 300, 112, 0, 0, Math.PI * 2);
  ctx.fillStyle = LABEL_COLORS.branco;
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = LABEL_COLORS.azul;
  ctx.stroke();

  ctx.fillStyle = LABEL_COLORS.azul;
  ctx.textBaseline = 'alphabetic';

  ctx.font = `800 62px ${FONT_LOGO}`;
  ctx.textAlign = 'left';
  ctx.fillText('Guaraná', -12, -34);

  // "Jesus" em script: medimos a largura real da fonte e aplicamos uma escala
  // horizontal para ocupar exatamente 500 px, como na embalagem. O traço
  // (stroke) fino engrossa levemente as letras, aproximando o peso do logo.
  ctx.font = `188px ${FONT_SCRIPT}`;
  ctx.textAlign = 'center';
  const target = 500;
  const measured = ctx.measureText('Jesus').width || target;
  ctx.save();
  ctx.translate(-8, 64);
  ctx.scale(target / measured, 1);
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3;
  ctx.strokeStyle = LABEL_COLORS.azul;
  ctx.strokeText('Jesus', 0, 0);
  ctx.fillText('Jesus', 0, 0);
  ctx.restore();

  // cauda da letra final, saindo pela borda direita do oval
  ctx.beginPath();
  ctx.moveTo(210, 52);
  ctx.bezierCurveTo(250, 40, 290, 10, 312, -18);
  ctx.bezierCurveTo(296, 14, 262, 50, 212, 62);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * Verso: faixa estreita com arabescos repetidos. A foto de referência só
 * mostra a frente — esta composição do verso é uma interpretação.
 */
function drawBackStrip(ctx: CanvasRenderingContext2D) {
  const motif = ornamentMotif(0);
  paintOrnament(ctx, motif, BACK, 60, 1.05);
  paintOrnament(ctx, ornamentMotif(1), BACK, 320, 1.05, true);
  paintOrnament(ctx, motif, BACK, 440, 1.05);
  paintOrnament(ctx, ornamentMotif(1), BACK, 780, 1.05, true);
}

/**
 * Slogan oficial "O sabor de viver o Maranhão", no topo: começa no painel
 * rosa (à direita da faixa) e termina no painel azul (à esquerda), dando a
 * volta pelo verso — exatamente como aparece cortado na foto da lata.
 */
function drawSlogan(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 34px ${FONT_LOGO}`;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillText('O sabor de viver', BAND.r + 22, 58);
  ctx.textAlign = 'right';
  ctx.fillText('o Maranhão', BAND.l - 22, 58);
  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/**
 * Painel azul: selos de nutrição frontais, tabela nutricional e bloco de
 * lote. Coordenadas começam em x negativo porque o bloco cruza a emenda da
 * textura (por isso é desenhado duas vezes em drawLabelCanvas).
 *
 * Valores: apenas os legíveis na foto de referência (0 g / 0%, 24 mg / 1%,
 * %VD 8 · 14 · 1). O restante é ilustrativo.
 */
function drawNutrition(ctx: CanvasRenderingContext2D) {
  const ink = '#ffffff';
  ctx.save();
  ctx.fillStyle = ink;
  ctx.strokeStyle = ink;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // selo frontal "ESTA PORÇÃO CONTÉM"
  const x0 = -150;
  ctx.font = `700 17px ${FONT_SMALL}`;
  ctx.fillText('ESTA PORÇÃO (1 LATA) CONTÉM', x0, 100);
  const boxes = [
    ['VALOR', 'ENERGÉTICO', '—', ''],
    ['AÇÚCARES', '', '—', ''],
    ['GORDURAS', 'SATURADAS', '0 g', '0%'],
    ['SÓDIO', '', '24 mg', '1%'],
  ];
  boxes.forEach(([l1, l2, v, pct], i) => {
    const bx = x0 + i * 112;
    ctx.lineWidth = 2;
    roundRect(ctx, bx, 112, 100, 120, 14);
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.font = `700 14px ${FONT_SMALL}`;
    ctx.fillText(l1, bx + 50, 136);
    if (l2) ctx.fillText(l2, bx + 50, 152);
    ctx.font = `700 24px ${FONT_SMALL}`;
    ctx.fillText(v, bx + 50, 188);
    ctx.fillRect(bx + 14, 198, 72, 1.5);
    ctx.font = `700 18px ${FONT_SMALL}`;
    ctx.fillText(pct, bx + 50, 220);
  });
  ctx.textAlign = 'left';
  ctx.font = `600 13px ${FONT_SMALL}`;
  ctx.fillText('*% DOS VALORES DIÁRIOS COM BASE EM UMA DIETA DE 2000 kcal.', x0, 258);
  ctx.fillText('VD NÃO ESTABELECIDO.', x0, 276);

  // tabela nutricional
  const tx = -120;
  const ty = 520;
  ctx.lineWidth = 2;
  ctx.strokeRect(tx, ty, 300, 196);
  ctx.font = `800 17px ${FONT_SMALL}`;
  ctx.fillText('INFORMAÇÃO NUTRICIONAL', tx + 12, ty + 26);
  ctx.font = `600 13px ${FONT_SMALL}`;
  ctx.fillText('PORÇÃO DE 350 ml (1 LATA)', tx + 12, ty + 46);
  ctx.fillRect(tx, ty + 56, 300, 4);
  const rows = [
    ['Valor energético', '8'],
    ['Carboidratos', '14'],
    ['Sódio', '1'],
  ];
  ctx.font = `700 13px ${FONT_SMALL}`;
  ctx.fillText('%VD(*)', tx + 232, ty + 78);
  rows.forEach(([label, vd], i) => {
    const ry = ty + 104 + i * 28;
    ctx.font = `600 15px ${FONT_SMALL}`;
    ctx.fillText(label, tx + 12, ry);
    ctx.textAlign = 'right';
    ctx.fillText(vd, tx + 286, ry);
    ctx.textAlign = 'left';
    ctx.fillRect(tx, ry + 9, 300, 1);
  });
  ctx.font = `600 11px ${FONT_SMALL}`;
  ctx.fillText('Não contém quantidade significativa de gorduras totais,', tx + 12, ty + 212);
  ctx.fillText('gorduras saturadas, gorduras trans e fibra alimentar.', tx + 12, ty + 226);
  ctx.restore();

  // bloco de lote junto à faixa branca
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = `700 13px ${FONT_SMALL}`;
  ctx.textAlign = 'right';
  ['NÃO CONTÉM GLÚTEN', 'LOTE E VALIDADE:', 'VIDE TAMPA', 'INDÚSTRIA', 'BRASILEIRA'].forEach((l, i) =>
    ctx.fillText(l, BAND.l - 16, 470 + i * 18)
  );
  ctx.restore();
}

/**
 * Painel rosa, colado à faixa branca: ícones de reciclagem, fabricante na
 * vertical, ingredientes em colunas giradas e o volume "350 ml".
 * Os ícones são desenhados com formas simples (sem imagens).
 */
function drawPinkInfo(ctx: CanvasRenderingContext2D) {
  const x = BAND.r; // tudo posicionado a partir da borda direita da faixa
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#ffffff';

  // símbolo de reciclagem do alumínio
  ctx.save();
  ctx.translate(x + 92, 150);
  ctx.lineWidth = 5;
  for (let i = 0; i < 3; i++) {
    ctx.rotate((Math.PI * 2) / 3);
    ctx.beginPath();
    ctx.arc(0, 0, 30, -0.2, 1.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(Math.cos(1.5) * 30 + 8, Math.sin(1.5) * 30 - 2);
    ctx.lineTo(Math.cos(1.5) * 30 - 6, Math.sin(1.5) * 30 - 10);
    ctx.lineTo(Math.cos(1.5) * 30 - 4, Math.sin(1.5) * 30 + 8);
    ctx.closePath();
    ctx.fill();
  }
  ctx.font = `800 22px ${FONT_SMALL}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('al', 0, 1);
  ctx.restore();

  // pessoa descartando na lixeira
  ctx.save();
  ctx.translate(x + 92, 232);
  ctx.beginPath();
  ctx.arc(-14, -26, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-20, -16, 12, 34);
  ctx.fillRect(-20, 18, 5, 22);
  ctx.fillRect(-13, 18, 5, 22);
  ctx.fillRect(-8, -12, 16, 4);
  ctx.fillRect(6, 4, 22, 36);
  ctx.fillRect(3, 0, 28, 4);
  ctx.restore();

  // "Coca-Cola Brasil" na vertical — escrito com fonte comum, sem reproduzir
  // o logotipo registrado da Coca-Cola
  ctx.save();
  ctx.translate(x + 44, 760);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = `46px ${FONT_SCRIPT}`;
  ctx.fillText('Coca-Cola', 0, 0);
  const w = ctx.measureText('Coca-Cola').width;
  ctx.font = `600 22px ${FONT_LOGO}`;
  ctx.fillText('Brasil', w + 10, 4);
  ctx.restore();

  // ingredientes e conservação em colunas verticais
  const lines = [
    'CONSERVAR AO ABRIGO DO SOL E CALOR, EM LOCAL LIMPO, SECO,',
    'AREJADO E SEM ODOR. NÃO CONGELAR. INGR.: ÁGUA GASEIFICADA,',
    'AÇÚCAR, EXTRATO DE GUARANÁ, AROMATIZANTE, ACIDULANTE ÁCIDO',
    'CÍTRICO, CONSERVADOR BENZOATO DE SÓDIO E CORANTES.',
    'NÃO CONTÉM GLÚTEN. CONTÉM AROMATIZANTE SINTÉTICO IDÊNTICO AO NATURAL.',
  ];
  ctx.save();
  ctx.translate(x + 150, 770);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `700 15px ${FONT_SMALL}`;
  lines.forEach((l, i) => ctx.fillText(l, 0, i * 22));
  ctx.restore();

  // volume
  ctx.font = `64px ${FONT_SERIF}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('350 ml', x + 24, H - 34);
  ctx.restore();
}

/** Verso: código de barras ilustrativo e textos de apoio. */
function drawBackInfo(ctx: CanvasRenderingContext2D) {
  // código de barras no painel azul, verso
  const bx = BACK_STRIP.r + 60;
  const by = 600;
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(bx, by, 170, 120);
  ctx.fillStyle = '#111111';
  // Gerador pseudoaleatório com semente fixa (Park–Miller): as barras saem
  // iguais em todo carregamento, sem "piscar" entre recarregamentos.
  let seed = 11;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let x = bx + 14; x < bx + 156; ) {
    const w = 1 + Math.floor(rand() * 3);
    if (rand() > 0.35) ctx.fillRect(x, by + 12, w, 84);
    x += w + 1;
  }
  ctx.restore();

  // repetição discreta do slogan no verso rosa
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 34px ${FONT_LOGO}`;
  ctx.textAlign = 'right';
  ctx.fillText('Guaraná Jesus', BACK_STRIP.l - 26, 58);
  ctx.textAlign = 'left';
  ctx.fillText('Refrigerante de guaraná', BACK_STRIP.r + 26, 58);
  ctx.restore();
}
