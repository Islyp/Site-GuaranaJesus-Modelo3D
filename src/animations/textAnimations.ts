/**
 * ============================================================================
 *  textAnimations — revelações de texto e parallax do HTML
 * ============================================================================
 *
 * Em vez de escrever GSAP dentro de cada componente, as seções apenas
 * DECLARAM a intenção com data-attributes, e este módulo aplica as animações.
 * Isso mantém os componentes limpos e o vocabulário de movimento consistente:
 *
 *  data-reveal="words"  → cada palavra sobe de dentro de uma máscara
 *                         (usar com <RevealText/>, que cria as máscaras)
 *  data-reveal="fade"   → sobe alguns px enquanto aparece
 *  data-reveal="clip"   → abre da esquerda para a direita via clip-path
 *  data-reveal="line"   → traço que se desenha na horizontal
 *  data-parallax="0.3"  → deslocamento contínuo, amarrado ao scroll
 *
 * Ajustes opcionais no mesmo elemento:
 *  data-delay="0.15"          atraso em segundos
 *  data-start="top 70%"       quando disparar (sintaxe do ScrollTrigger)
 *
 * Todas as revelações usam toggleActions "play none none reverse":
 * entram ao descer e se desfazem ao voltar, para a página poder ser
 * "rebobinada" como o resto da experiência.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Aplica as animações declarativas dentro de `root`.
 * @returns função de limpeza
 */
export function initTextAnimations(root: HTMLElement) {
  const ctx = gsap.context(() => {
    // ---- palavra a palavra (mask reveal) ----
    // A máscara (.reveal-mask, overflow hidden) fica parada; o conteúdo
    // (.reveal-inner) começa abaixo dela, levemente girado, e sobe.
    gsap.utils.toArray<HTMLElement>('[data-reveal="words"]').forEach((el) => {
      const words = el.querySelectorAll('.reveal-inner');
      gsap.fromTo(
        words,
        { yPercent: 118, rotate: 4 },
        {
          yPercent: 0,
          rotate: 0,
          duration: 1.15,
          ease: 'expo.out', // arranque rápido, pouso suave — sensação editorial
          stagger: 0.06, // efeito "onda" entre as palavras
          delay: Number(el.dataset.delay ?? 0),
          scrollTrigger: {
            trigger: el,
            start: el.dataset.start ?? 'top 88%',
            toggleActions: 'play none none reverse',
          },
        }
      );
    });

    // ---- fade + subida ----
    // autoAlpha = opacity + visibility (elementos invisíveis não recebem clique)
    gsap.utils.toArray<HTMLElement>('[data-reveal="fade"]').forEach((el) => {
      gsap.fromTo(
        el,
        { y: 40, autoAlpha: 0 },
        {
          y: 0,
          autoAlpha: 1,
          duration: 1.1,
          ease: 'power3.out',
          delay: Number(el.dataset.delay ?? 0),
          scrollTrigger: {
            trigger: el,
            start: el.dataset.start ?? 'top 90%',
            toggleActions: 'play none none reverse',
          },
        }
      );
    });

    // ---- abertura por clip-path ----
    gsap.utils.toArray<HTMLElement>('[data-reveal="clip"]').forEach((el) => {
      gsap.fromTo(
        el,
        { clipPath: 'inset(0 100% 0 0)' },
        {
          clipPath: 'inset(0 0% 0 0)',
          duration: 1.4,
          ease: 'expo.inOut',
          delay: Number(el.dataset.delay ?? 0),
          scrollTrigger: {
            trigger: el,
            start: el.dataset.start ?? 'top 85%',
            toggleActions: 'play none none reverse',
          },
        }
      );
    });

    // ---- traço horizontal ----
    gsap.utils.toArray<HTMLElement>('[data-reveal="line"]').forEach((el) => {
      gsap.fromTo(
        el,
        { scaleX: 0, transformOrigin: 'left center' },
        {
          scaleX: 1,
          duration: 1.3,
          ease: 'expo.inOut',
          scrollTrigger: {
            trigger: el,
            start: 'top 92%',
            toggleActions: 'play none none reverse',
          },
        }
      );
    });

    // ---- parallax contínuo ----
    // Diferente das revelações, aqui usamos scrub: a posição é função direta
    // do scroll durante toda a travessia da seção pela tela.
    gsap.utils.toArray<HTMLElement>('[data-parallax]').forEach((el) => {
      const speed = Number(el.dataset.parallax);
      gsap.fromTo(
        el,
        { y: () => window.innerHeight * speed * 0.5 },
        {
          y: () => -window.innerHeight * speed * 0.5,
          ease: 'none',
          scrollTrigger: {
            trigger: el.closest('section') ?? el,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
            invalidateOnRefresh: true,
          },
        }
      );
    });
  }, root);

  return () => ctx.revert();
}

/**
 * Abertura do Hero, tocada uma vez ao carregar (não depende de scroll).
 * Sequência: título gigante sobe da máscara → linha azul se desenha →
 * textos de apoio e navegação aparecem em cascata.
 */
export function playIntro(root: HTMLElement) {
  const ctx = gsap.context(() => {
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.fromTo(
      '[data-intro="title"] .reveal-inner',
      { yPercent: 120 },
      { yPercent: 0, duration: 1.6, stagger: 0.08 },
      0.15
    )
      .fromTo('[data-intro="fade"]', { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.2, stagger: 0.1 }, 0.7)
      .fromTo('[data-intro="line"]', { scaleX: 0 }, { scaleX: 1, duration: 1.4, transformOrigin: 'left' }, 0.6);
  }, root);
  return () => ctx.revert();
}
