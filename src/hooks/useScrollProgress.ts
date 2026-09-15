/**
 * ============================================================================
 *  useScrollProgress — acesso ao estado do scroll a partir do React
 * ============================================================================
 *
 * Fornece progress (0 → 1), velocity e direction ("up" | "down").
 *
 * Dois modos, porque existem dois tipos de consumidor:
 *
 *  - Loops de animação (useFrame, gsap.ticker) → modo padrão.
 *    Recebem o objeto mutável e leem o valor atual quando precisarem,
 *    sem nenhuma re-renderização.
 *
 *      const scroll = useScrollProgress();
 *      useFrame(() => mesh.rotation.y = scroll.progress * Math.PI);
 *
 *  - Componentes que exibem o valor → { live: true }.
 *    Re-renderizam a cada atualização; use só em UI pequena e leve.
 *
 *      const { direction } = useScrollProgress({ live: true });
 */
import { useEffect, useState } from 'react';
import { scrollState, subscribeScroll, type ScrollState } from '../state/scrollStore';

export function useScrollProgress(options: { live?: boolean } = {}): ScrollState {
  const { live = false } = options;

  // Cópia imutável usada apenas no modo "live" (o React precisa de uma nova
  // referência para perceber a mudança).
  const [snapshot, setSnapshot] = useState<ScrollState>(() => ({ ...scrollState }));

  useEffect(() => {
    if (!live) return;
    return subscribeScroll((s) => setSnapshot({ ...s }));
  }, [live]);

  return live ? snapshot : scrollState;
}
