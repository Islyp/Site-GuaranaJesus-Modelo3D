/**
 * ============================================================================
 *  smoothScroll — scroll suave (Lenis) sincronizado com o GSAP
 * ============================================================================
 *
 * O Lenis interpola a posição do scroll para dar a sensação "cinematográfica"
 * de rolagem com peso. Mas ele traz um risco: se o Lenis, o ScrollTrigger e
 * o Three.js tiverem relógios diferentes, a lata "treme" em relação ao texto.
 *
 * Solução: um ÚNICO relógio. O gsap.ticker (requestAnimationFrame) avança o
 * Lenis; cada evento de scroll do Lenis atualiza o ScrollTrigger e publica o
 * estado no scrollStore, que o Three.js lê no mesmo frame.
 *
 *   gsap.ticker ──▶ lenis.raf() ──▶ evento 'scroll' ──┬─▶ ScrollTrigger.update()
 *                                                     └─▶ setScrollState()
 */
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { setScrollState } from '../state/scrollStore';

gsap.registerPlugin(ScrollTrigger);

// Instância única, compartilhada com scrollToTarget (links da navegação).
let lenis: Lenis | null = null;

/**
 * Inicia o scroll suave.
 * @param reducedMotion com "reduzir movimento" ativo, o scroll volta a ser
 *        imediato (lerp 1 = sem interpolação), respeitando a acessibilidade.
 * @returns função de limpeza
 */
export function initSmoothScroll(reducedMotion: boolean) {
  lenis = new Lenis({
    lerp: reducedMotion ? 1 : 0.09, // quanto menor, mais "pesado" o scroll
    smoothWheel: !reducedMotion,
    wheelMultiplier: 0.9,
    touchMultiplier: 1.2,
  });

  lenis.on('scroll', (l: Lenis) => {
    // Mantém todos os ScrollTriggers em dia com a posição interpolada
    ScrollTrigger.update();

    // Publica para quem roda fora do GSAP (loop do Three.js, barra de progresso)
    setScrollState({
      scroll: l.scroll,
      progress: l.limit > 0 ? l.scroll / l.limit : 0,
      velocity: l.velocity,
      direction: l.direction === -1 ? 'up' : 'down',
    });
  });

  // O GSAP passa o tempo em segundos; o Lenis espera milissegundos.
  const tick = (time: number) => lenis?.raf(time * 1000);
  gsap.ticker.add(tick);

  // Sem "lag smoothing": se um frame atrasar, o scroll não deve dar saltos
  // artificiais para compensar — a sincronia com o scroll real é prioridade.
  gsap.ticker.lagSmoothing(0);

  return () => {
    gsap.ticker.remove(tick);
    lenis?.destroy();
    lenis = null;
  };
}

/**
 * Rola suavemente até um destino (seletor, elemento ou posição em px).
 * Usado pela navegação e pelo CTA final. Se o Lenis não estiver ativo,
 * cai no scrollIntoView nativo.
 */
export function scrollToTarget(target: string | HTMLElement | number) {
  if (lenis) {
    // easeOutQuart: sai rápido e chega devagar, como um movimento de câmera
    lenis.scrollTo(target, { duration: 1.8, easing: (t) => 1 - Math.pow(1 - t, 4) });
  } else if (typeof target === 'string') {
    document.querySelector(target)?.scrollIntoView({ behavior: 'smooth' });
  }
}
