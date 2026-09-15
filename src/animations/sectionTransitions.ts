/**
 * ============================================================================
 *  sectionTransitions — a cor do ambiente muda com a narrativa
 * ============================================================================
 *
 * Problema de design: cada seção tem sua cor (rosa, creme, magenta, rosa
 * claro, vermelho, vinho). Se a cor ficasse no <section>, ela cobriria a lata,
 * porque o conteúdo HTML está ACIMA do canvas 3D.
 *
 * Solução: as cores moram na BackgroundLayer (atrás do canvas), em um "painel"
 * fixo por seção. Enquanto a seção sobe pela tela, o painel correspondente
 * sobe junto e cobre o anterior — com uma crista orgânica em SVG e uma faixa
 * de cor de acento correndo à frente. Resultado: o ambiente troca de cor,
 * a lata continua visível por cima e o texto por cima dela.
 *
 * Este módulo também:
 *  - aplica parallax nos grafismos de fundo (data-art-speed / data-art-drift);
 *  - avisa o App qual seção está ativa e se ela é clara ou escura
 *    (para a navegação e o cursor trocarem de cor).
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/** Tema da interface sobre a seção: "light" = texto claro, "dark" = texto escuro. */
export type Theme = 'light' | 'dark';

/**
 * @param onSectionChange chamado quando uma seção assume o centro da tela
 * @returns função de limpeza (gsap.context reverte tudo de uma vez)
 */
export function initSectionTransitions(onSectionChange: (id: string, theme: Theme) => void) {
  // gsap.context agrupa todos os tweens/ScrollTriggers criados aqui dentro,
  // permitindo desfazê-los com uma única chamada (essencial no React).
  const ctx = gsap.context(() => {
    const sections = gsap.utils.toArray<HTMLElement>('main > section[id]');

    sections.forEach((section, i) => {
      const id = section.id;
      const panel = document.querySelector<HTMLElement>(`[data-bg-panel="${id}"]`);

      // ---------------- troca de cor (a partir da 2ª seção) ----------------
      if (panel && i > 0) {
        const crest = panel.querySelector('[data-crest]');
        const ribbon = panel.querySelector('[data-ribbon]');

        // Janela da transição: do topo da seção entrando pela base da tela
        // até o topo da seção encostar no topo da tela. scrub: true amarra a
        // animação ao scroll, então ela é reversível e nunca "dessincroniza".
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: 'top bottom',
            end: 'top top',
            scrub: true,
            invalidateOnRefresh: true, // recalcula innerHeight após resize
          },
        });

        // O painel acompanha exatamente o topo da seção…
        tl.fromTo(panel, { y: () => window.innerHeight }, { y: 0, ease: 'none', duration: 1 }, 0);

        // …a crista orgânica nasce, cresce e se recolhe até virar uma borda reta…
        if (crest) {
          tl.fromTo(crest, { scaleY: 0 }, { scaleY: 1.8, ease: 'power2.out', duration: 0.3 }, 0).to(
            crest,
            { scaleY: 0.15, ease: 'power1.in', duration: 0.7 },
            0.3
          );
        }

        // …e a faixa de cor de acento corre à frente dela, como uma pincelada.
        if (ribbon) {
          tl.fromTo(ribbon, { scaleY: 0, yPercent: 0 }, { scaleY: 1, ease: 'power2.out', duration: 0.22 }, 0).to(
            ribbon,
            { scaleY: 0.05, yPercent: -40, ease: 'power2.in', duration: 0.78 },
            0.22
          );
        }
      }

      // ---------------- parallax vertical dos grafismos ----------------
      // data-art-speed="0.2" → o elemento percorre ±20% da altura da tela
      // enquanto a seção atravessa a viewport. Valores diferentes em elementos
      // vizinhos criam planos de profundidade (parallax em camadas).
      panel?.querySelectorAll<HTMLElement>('[data-art-speed]').forEach((art) => {
        const speed = Number(art.dataset.artSpeed);
        gsap.fromTo(
          art,
          { y: () => window.innerHeight * speed },
          {
            y: () => -window.innerHeight * speed,
            ease: 'none',
            scrollTrigger: {
              trigger: section,
              start: 'top bottom',
              end: 'bottom top',
              scrub: true,
              invalidateOnRefresh: true,
            },
          }
        );
      });

      // ---------------- deriva horizontal (ex.: "DIFERENTE." gigante) ----------------
      panel?.querySelectorAll<HTMLElement>('[data-art-drift]').forEach((art) => {
        const drift = Number(art.dataset.artDrift);
        gsap.fromTo(
          art,
          { xPercent: drift },
          {
            xPercent: -drift,
            ease: 'none',
            scrollTrigger: {
              trigger: section,
              start: 'top bottom',
              end: 'bottom top',
              scrub: true,
            },
          }
        );
      });

      // ---------------- seção ativa + tema da interface ----------------
      // A seção é considerada ativa quando cruza a linha de 55% da tela.
      // Cada <section> declara seu tema em data-theme.
      ScrollTrigger.create({
        trigger: section,
        start: 'top 55%',
        end: 'bottom 55%',
        onToggle: (self) => {
          if (self.isActive) onSectionChange(id, (section.dataset.theme as Theme) ?? 'light');
        },
      });
    });
  });

  return () => ctx.revert();
}
