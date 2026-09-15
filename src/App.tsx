/**
 * ============================================================================
 *  App — orquestrador da experiência
 * ============================================================================
 *
 * O App não desenha quase nada sozinho: ele empilha as CAMADAS da experiência
 * e liga os sistemas de animação na ordem certa.
 *
 *  Camadas (de trás para frente, controladas por z-index):
 *
 *    0  BackgroundLayer   cor de cada seção + grafismos (azulejos, arabescos…)
 *    1  GuaranaScene      canvas Three.js fixo com a lata persistente
 *    2  <main>            conteúdo HTML (textos, títulos, legendas)
 *   40+ Navbar, ScrollProgress, faixas de cinema, Cursor, grão de filme
 *
 *  Sistemas de animação (todos em /animations):
 *
 *    smoothScroll        Lenis → scroll suave + publica progress/velocity
 *    scrollTimeline      timeline GSAP global: lata, câmera e luz ← scroll
 *    sectionTransitions  troca de cor entre seções + tema claro/escuro da UI
 *    textAnimations      revelações de texto e parallax do HTML
 *
 * Decisão importante: a lata NÃO pertence a nenhuma seção. Ela vive em um
 * único canvas montado aqui, e cada seção apenas "dirige" sua pose através
 * da timeline. Assim a lata atravessa a página inteira sem ser recriada.
 */
import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initSmoothScroll } from './animations/smoothScroll';
import { createSceneTimeline } from './animations/scrollTimeline';
import { initSectionTransitions, type Theme } from './animations/sectionTransitions';
import { initTextAnimations, playIntro } from './animations/textAnimations';
import { bindPointer } from './state/pointer';
import { useCanInteraction } from './hooks/useCanInteraction';
import { MOBILE_QUERY, REDUCED_MOTION_QUERY, useMediaQuery } from './hooks/useMediaQuery';
import { BackgroundLayer } from './components/BackgroundLayer';
import { Navbar } from './components/Navbar';
import { ScrollProgress } from './components/ScrollProgress';
import { Cursor } from './components/Cursor';
import { PageContent } from './components/PageContent';
import type { SectionId } from './components/sections';

// Code splitting: Three.js + React Three Fiber + drei somam ~280 KB (gzip).
// Com lazy(), esse pacote vira um chunk separado — o HTML e a tipografia
// aparecem primeiro e a cena 3D entra assim que termina de baixar.
const GuaranaScene = lazy(() => import('./three/GuaranaScene'));

export default function App() {
  // Breakpoint e preferência de acessibilidade (reagem a mudanças em tempo real)
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);

  const mainRef = useRef<HTMLElement>(null);

  // Seção ativa: usada pela navegação (link destacado) e pelo contador lateral.
  // É o ÚNICO estado React ligado ao scroll — e só muda ao trocar de seção,
  // nunca a cada frame, para não re-renderizar a árvore durante a rolagem.
  const [active, setActive] = useState<SectionId>('hero');

  // Interação direta com a lata: arrastar para girar, clicar/tocar para 360°.
  useCanInteraction();

  // Chamado por sectionTransitions quando uma seção assume o centro da tela.
  // O atributo data-theme no <html> troca as variáveis CSS de cor da interface
  // (texto claro sobre fundos escuros, texto escuro sobre creme/rosa claro).
  const onSectionChange = useCallback((id: string, theme: Theme) => {
    setActive(id as SectionId);
    document.documentElement.dataset.theme = theme;
  }, []);

  // 1) Scroll suave e posição do mouse.
  //    useLayoutEffect garante que tudo esteja pronto antes do primeiro paint.
  useLayoutEffect(() => {
    const stopScroll = initSmoothScroll(reducedMotion);
    const stopPointer = bindPointer();
    return () => {
      stopScroll();
      stopPointer();
    };
  }, [reducedMotion]);

  // 2) Transições de cor entre seções, revelação de textos e abertura do Hero.
  //    Com "reduzir movimento" ativo, os textos já nascem visíveis.
  useLayoutEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    const stopTransitions = initSectionTransitions(onSectionChange);
    const stopText = reducedMotion ? () => {} : initTextAnimations(main);
    const stopIntro = reducedMotion ? () => {} : playIntro(document.body);
    return () => {
      stopTransitions();
      stopText();
      stopIntro();
    };
  }, [onSectionChange, reducedMotion]);

  // 3) Timeline global da cena 3D. Desktop e mobile têm roteiros diferentes
  //    (no celular a lata fica na metade inferior, longe do texto), então a
  //    timeline é reconstruída ao cruzar o breakpoint.
  useLayoutEffect(() => createSceneTimeline(isMobile), [isMobile]);

  // 4) Recalcular gatilhos quando a altura da página muda.
  //    As fontes web chegam depois do primeiro render e mudam a altura dos
  //    blocos de texto; sem refresh, os keyframes ficariam desalinhados.
  //    O debounce evita dezenas de refresh seguidos durante um resize.
  useEffect(() => {
    document.fonts.ready.then(() => ScrollTrigger.refresh());
    let timer = 0;
    const ro = new ResizeObserver(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => ScrollTrigger.refresh(), 200);
    });
    ro.observe(document.body);
    return () => {
      window.clearTimeout(timer);
      ro.disconnect();
    };
  }, []);

  return (
    <>
      {/* z 0 — cores e grafismos de fundo */}
      <BackgroundLayer />

      {/* z 1 — cena 3D persistente (fallback nulo: o fundo já está visível) */}
      <Suspense fallback={null}>
        <GuaranaScene isMobile={isMobile} reducedMotion={reducedMotion} />
      </Suspense>

      {/* z 50 — interface fixa */}
      <Navbar active={active} />
      <ScrollProgress active={active} />

      {/* z 2 — conteúdo editorial, acima da lata */}
      <main ref={mainRef}>
        <PageContent />
      </main>

      {/* z 60–80 — acabamento: cursor customizado e grão de filme */}
      <Cursor />
      <div className="grain" aria-hidden="true" />
    </>
  );
}
