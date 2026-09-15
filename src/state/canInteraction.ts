/**
 * ============================================================================
 *  canInteraction — estado da interação direta com a lata
 * ============================================================================
 *
 * Ponte entre dois mundos que não se conhecem:
 *
 *   DOM (eventos de mouse/toque)  ──escreve──▶  canInteraction  ──lê──▶  Three.js
 *   hooks/useCanInteraction.ts                                        three/GuaranaCan.tsx
 *
 * E também no sentido inverso: a cada frame o GuaranaCan grava aqui a
 * SILHUETA da lata projetada na tela (campo `hit`), para que os eventos do
 * DOM saibam se o ponteiro está sobre a lata.
 *
 * Por que calcular o acerto manualmente em vez de usar o raycasting do R3F?
 * O canvas fica ATRÁS do conteúdo HTML e tem pointer-events: none — só assim
 * textos e links continuam clicáveis por cima da cena. Sem eventos no canvas,
 * não há raycasting; então testamos o ponteiro contra a lata projetada em 2D.
 */

export const canInteraction = {
  /**
   * Silhueta da lata em pixels de tela, atualizada a cada frame.
   * A lata é aproximada por uma "cápsula": o segmento do eixo central
   * (de a até b) mais um raio. Funciona mesmo com a lata inclinada.
   */
  hit: { ax: 0, ay: 0, bx: 0, by: 0, r: 0, visible: false },

  /** ponteiro está sobre a lata (controla o cursor "girar") */
  hovering: false,
  /** usuário está arrastando neste momento */
  dragging: false,
  /** giro (rad) aplicado pelo usuário e ainda não consumido pelo loop 3D */
  pendingSpin: 0,
  /** velocidade de inércia após soltar (rad/s) — decai com o tempo */
  inertia: 0,
  /** inclinação extra enquanto arrasta na vertical (rad) — volta como mola */
  tilt: 0,
  /** giro de 360° disparado por clique/toque (rad que ainda faltam girar) */
  flourish: 0,
  /**
   * Momento (ms) da última interação. Nas cenas de destaque a lata "assenta"
   * com o logo de frente, mas só depois de um tempo sem interação — para não
   * disputar o controle com a mão do usuário.
   */
  lastInteraction: 0,
};

/** Dispara um giro completo (clique ou toque simples sobre a lata). */
export function spinFlourish() {
  canInteraction.flourish += Math.PI * 2;
  canInteraction.lastInteraction = performance.now();
}

/**
 * O ponto (x, y) em px está sobre a lata?
 *
 * Geometria: projeta o ponto no segmento do eixo (a → b), limita a projeção
 * às extremidades e compara a distância resultante com o raio. É o teste
 * clássico "ponto dentro de cápsula".
 *
 * @param pad margem de tolerância (1.08 = 8% maior; no toque usamos mais,
 *            porque o dedo é menos preciso que o mouse)
 */
export function isOverCan(x: number, y: number, pad = 1.08) {
  const { ax, ay, bx, by, r, visible } = canInteraction.hit;
  if (!visible || r <= 0) return false;

  // vetor do eixo e posição relativa do ponto ao longo dele (0 → 1)
  const vx = bx - ax;
  const vy = by - ay;
  const len2 = vx * vx + vy * vy || 1;
  const t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / len2));

  // distância do ponto ao ponto mais próximo do eixo (comparada ao quadrado,
  // evitando a raiz quadrada)
  const px = ax + vx * t - x;
  const py = ay + vy * t - y;
  return px * px + py * py < r * r * pad * pad;
}
