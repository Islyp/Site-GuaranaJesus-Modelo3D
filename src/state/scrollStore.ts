/**
 * ============================================================================
 *  scrollStore — estado global do scroll
 * ============================================================================
 *
 * Por que não usar useState/Context?
 * O scroll muda ~60 vezes por segundo. Guardar isso em estado React
 * re-renderizaria componentes a cada frame e travaria a rolagem.
 *
 * Em vez disso, usamos um objeto mutável simples:
 *  - quem ESCREVE: smoothScroll.ts (a cada evento do Lenis)
 *  - quem LÊ a cada frame: o loop do Three.js (useFrame), sem re-render
 *  - quem precisa REAGIR: assina com subscribeScroll (ex.: barra de progresso,
 *    que atualiza o DOM diretamente, também sem re-render)
 *
 * É o mesmo padrão "store externo" usado por bibliotecas como Zustand,
 * só que reduzido ao essencial.
 */

export type ScrollDirection = 'up' | 'down';

export interface ScrollState {
  /** 0 no topo → 1 no final da página */
  progress: number;
  /** velocidade do scroll suavizado (px por frame, com sinal) */
  velocity: number;
  /** sentido do último movimento */
  direction: ScrollDirection;
  /** posição absoluta em px */
  scroll: number;
}

type Listener = (state: ScrollState) => void;

/** Instância única e mutável — sempre o valor mais recente. */
export const scrollState: ScrollState = {
  progress: 0,
  velocity: 0,
  direction: 'down',
  scroll: 0,
};

const listeners = new Set<Listener>();

/** Atualiza o estado e notifica os assinantes. */
export function setScrollState(next: Partial<ScrollState>) {
  Object.assign(scrollState, next);
  listeners.forEach((l) => l(scrollState));
}

/**
 * Assina as mudanças do scroll.
 * @returns função para cancelar a assinatura (use no cleanup do useEffect)
 */
export function subscribeScroll(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
