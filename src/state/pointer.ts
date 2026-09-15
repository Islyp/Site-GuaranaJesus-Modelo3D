/**
 * ============================================================================
 *  pointer — posição do mouse para o parallax sutil
 * ============================================================================
 *
 * Guarda a posição do mouse normalizada no intervalo -1 → 1
 * (0,0 = centro da tela; y positivo = para cima, como no Three.js).
 *
 * Lida a cada frame pela câmera, pela lata e pelas partículas para criar
 * um parallax quase imperceptível. A suavização (damping) acontece no loop
 * 3D, não aqui — este módulo só registra o valor bruto.
 *
 * Toques são ignorados de propósito: no celular não existe "hover", e o dedo
 * na tela durante o scroll faria a cena balançar sem motivo.
 */

export const pointer = { x: 0, y: 0 };

// Evita registrar o listener duas vezes (StrictMode monta efeitos em dobro).
let bound = false;

/**
 * Começa a ouvir o movimento do mouse.
 * @returns função de limpeza para remover o listener
 */
export function bindPointer() {
  if (bound || typeof window === 'undefined') return () => {};
  bound = true;

  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
  };

  // passive: true → o navegador não precisa esperar este handler para rolar
  window.addEventListener('pointermove', onMove, { passive: true });

  return () => {
    window.removeEventListener('pointermove', onMove);
    bound = false;
  };
}
